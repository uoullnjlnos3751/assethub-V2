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

    const link = await prisma.assetLink.create({
      data: { parentId, childId, linkType: linkType || 'COMPONENT', note },
      include: { parent: assetSummary, child: assetSummary },
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
    await prisma.assetLink.delete({ where: { id } });
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
