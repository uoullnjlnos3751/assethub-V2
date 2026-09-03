import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const assetSummary = { select: { id: true, assetCode: true, assetName: true, serialNo: true, type: true } };

// ── GET /api/asset-links/by-asset/:assetId — links where this asset is parent or child ──
router.get('/by-asset/:assetId', authenticate, async (req, res, next) => {
  try {
    const assetId = parseInt(req.params.assetId);
    const [asParent, asChild] = await Promise.all([
      prisma.assetLink.findMany({ where: { parentId: assetId }, include: { child: assetSummary } }),
      prisma.assetLink.findMany({ where: { childId: assetId }, include: { parent: assetSummary } }),
    ]);
    res.json({ children: asParent, parents: asChild });
  } catch (err) { next(err); }
});

// ── POST /api/asset-links ───────────────────────────────────────────────────
router.post('/', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req, res, next) => {
  try {
    const { parentId, childId, linkType, note } = req.body;
    if (!parentId || !childId) throw new AppError('parentId, childId จำเป็น', 400);
    if (parentId === childId) throw new AppError('ไม่สามารถเชื่อมโยงทรัพย์สินกับตัวเองได้', 400);

    const resolvedLinkType = linkType || 'COMPONENT';
    const link = await prisma.assetLink.create({
      data: { parentId, childId, linkType: resolvedLinkType, note },
      include: { parent: assetSummary, child: assetSummary },
    });
    // create() above already fails on a duplicate pair (P2002, caught below),
    // so reaching here always means this is a genuinely new connection span.
    await prisma.assetLinkHistory.create({
      data: { parentId, childId, linkType: resolvedLinkType, note },
    });
    res.status(201).json(link);
  } catch (err: any) {
    if (err?.code === 'P2002') return next(new AppError('เชื่อมโยงทรัพย์สินคู่นี้ไว้แล้ว', 400));
    next(err);
  }
});

// ── DELETE /api/asset-links/:id ─────────────────────────────────────────────
router.delete('/:id', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const link = await prisma.assetLink.findUnique({ where: { id } });
    if (!link) throw new AppError('ไม่พบการเชื่อมโยงนี้', 404);
    // ปิดประวัติที่ยังเปิดอยู่ก่อนลบ asset_links ทิ้ง เหมือนกับตอนถอดสายจาก PM
    await prisma.assetLinkHistory.updateMany({
      where: { parentId: link.parentId, childId: link.childId, disconnectedAt: null },
      data: { disconnectedAt: new Date() },
    });
    await prisma.assetLink.delete({ where: { id } });
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
