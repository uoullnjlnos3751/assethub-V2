import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { CUSTODY_HOLDERS, enabledHolders, isValidHolder, ROLE_TO_HOLDER, isCustodyRole } from '../config/custodyHolders';

const router = Router();

// Everything here is reachable by HR (who may only see their own pile) and by
// IT (who may see all of them). Deliberately a separate router rather than new
// query params on GET /assets: that endpoint returns 60+ columns of the whole
// registry, and the company-scoping in assets.ts is the only thing keeping
// non-admins out of it. Widening it for HR would have punched a hole straight
// through that. These endpoints hand back the four or five fields the HR
// screen actually renders and nothing else.
const custodyRoles = ['HR_CUSTODY', 'IT_ADMIN', 'SUPERADMIN'] as const;
const guard = [authenticate, authorize(...custodyRoles)];

/** Fields the HR screen renders. Anything beyond this is registry data HR has no business seeing. */
const CUSTODY_ASSET_SELECT = {
  id: true,
  assetCode: true,
  assetName: true,
  serialNo: true,
  type: true,
  brand: true,
  model: true,
  company: true,
  ownerName: true,
  departmentId: true,
  custodyHolder: true,
  custodyNote: true,
  custodyUpdatedAt: true,
} as const;

/**
 * The holder a request is allowed to write to.
 * HR roles are pinned to their own holder no matter what the body says; IT may
 * name any enabled holder (they fix mistakes on HR's behalf).
 */
function resolveTargetHolder(req: Request, requested: unknown): string {
  const role = req.user?.role;
  if (isCustodyRole(role)) return ROLE_TO_HOLDER[role!];
  if (!isValidHolder(requested)) {
    const known = CUSTODY_HOLDERS.find(h => h.code === requested);
    throw new AppError(known ? `จุดรับฝาก "${known.label}" ยังไม่เปิดใช้งาน` : 'จุดรับฝากไม่ถูกต้อง', 400);
  }
  return requested;
}

/** Holder whose pile a read request may see — null means "all of them" (IT). */
function resolveReadHolder(req: Request, requested: unknown): string | null {
  const role = req.user?.role;
  if (isCustodyRole(role)) return ROLE_TO_HOLDER[role!];
  if (typeof requested === 'string' && requested.trim()) return requested.trim();
  return null;
}

// GET /api/custody/holders — drop-off points this user may file things under
router.get('/holders', ...guard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const role = req.user?.role;
    const all = enabledHolders();
    const mine = isCustodyRole(role) ? all.filter(h => h.code === ROLE_TO_HOLDER[role!]) : all;
    res.json({ data: mine });
  } catch (err) { next(err); }
});

// GET /api/custody/search?q=  — look up one machine to check in
//
// The 3-character minimum and the hard take:25 are the security boundary, not
// a performance tweak. HR needs to find the laptop in their hand by its
// sticker; they must not be able to page through the whole fleet. Searching
// spans every company on purpose — PS and TRRCORP staff also return their
// devices to HR-TRR.
router.get('/search', ...guard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = String(req.query.q || '').trim();
    if (q.length < 3) return res.json({ data: [], message: 'พิมพ์อย่างน้อย 3 ตัวอักษร' });

    const assets = await prisma.asset.findMany({
      where: {
        OR: [
          { assetCode: { contains: q, mode: 'insensitive' } },
          { serialNo: { contains: q, mode: 'insensitive' } },
          { assetName: { contains: q, mode: 'insensitive' } },
          { snComputer: { contains: q, mode: 'insensitive' } },
          { ownerName: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: CUSTODY_ASSET_SELECT,
      orderBy: { assetCode: 'asc' },
      take: 25,
    });
    res.json({ data: assets });
  } catch (err) { next(err); }
});

// POST /api/custody/assets/:id — tick / untick "this one is with us"
//
// Never touches status, location or ownerName. Whether a machine sitting at HR
// counts as Available, In Use or anything else is IT's call, and overwriting
// ownerName is how the free-text "อยู่ที่ HR-TRR" notes got into the registry
// in the first place.
router.post('/assets/:id', ...guard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) throw new AppError('รหัสทรัพย์สินไม่ถูกต้อง', 400);

    const { holder, note } = req.body as { holder?: unknown; note?: unknown };

    const asset = await prisma.asset.findUnique({
      where: { id },
      select: { id: true, assetCode: true, custodyHolder: true },
    });
    if (!asset) throw new AppError('ไม่พบทรัพย์สิน', 404);

    // holder === null (or '') means "remove from the pile"
    const clearing = holder === null || holder === '';
    if (clearing && isCustodyRole(req.user?.role) && asset.custodyHolder !== ROLE_TO_HOLDER[req.user!.role]) {
      throw new AppError('เครื่องนี้ไม่ได้อยู่ในความดูแลของคุณ', 403);
    }
    const target = clearing ? null : resolveTargetHolder(req, holder);

    const updated = await prisma.asset.update({
      where: { id },
      data: {
        custodyHolder: target,
        custodyNote: target ? (typeof note === 'string' ? note.trim() || null : null) : null,
        custodyUpdatedAt: new Date(),
        custodyUpdatedById: req.user!.userId,
      },
      select: CUSTODY_ASSET_SELECT,
    });

    // fromLoc/toLoc rather than new columns so the three existing timeline
    // renderers show the before/after without needing to know about custody.
    await prisma.assetHistory.create({
      data: {
        assetId: id,
        actionType: 'CUSTODY_CHANGE',
        fromLoc: asset.custodyHolder,
        toLoc: target,
        note: typeof note === 'string' && note.trim() ? note.trim() : null,
        actorUserId: req.user!.userId,
      },
    });

    res.json({ data: updated });
  } catch (err) { next(err); }
});

// GET /api/custody/held?holder= — what is sitting at a drop-off point right now
router.get('/held', ...guard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const holder = resolveReadHolder(req, req.query.holder);
    const assets = await prisma.asset.findMany({
      where: holder ? { custodyHolder: holder } : { custodyHolder: { not: null } },
      select: CUSTODY_ASSET_SELECT,
      orderBy: { custodyUpdatedAt: 'desc' },
    });
    res.json({ data: assets, total: assets.length });
  } catch (err) { next(err); }
});

// GET /api/custody/summary — counts per drop-off point (dashboard tile)
router.get('/summary', ...guard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const grouped = await prisma.asset.groupBy({
      by: ['custodyHolder'],
      where: { custodyHolder: { not: null } },
      _count: { _all: true },
    });
    const counts = new Map(grouped.map(g => [g.custodyHolder, g._count._all]));

    const role = req.user?.role;
    const visible = isCustodyRole(role)
      ? enabledHolders().filter(h => h.code === ROLE_TO_HOLDER[role!])
      : enabledHolders();

    res.json({
      data: visible.map(h => ({ code: h.code, label: h.label, company: h.company, count: counts.get(h.code) || 0 })),
      total: grouped.reduce((sum, g) => sum + g._count._all, 0),
    });
  } catch (err) { next(err); }
});

export default router;
