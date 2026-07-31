import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// ── GET /api/disposals ──────────────────────────────────────────────────────
router.get('/', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req, res, next) => {
  try {
    const { method } = req.query;
    const where: any = {};
    if (method) where.method = method;
    const disposals = await prisma.assetDisposal.findMany({
      where,
      include: {
        asset: { select: { id: true, assetCode: true, assetName: true, serialNo: true, type: true } },
        createdBy: { select: { id: true, displayName: true, adUsername: true } },
      },
      orderBy: { disposalDate: 'desc' },
    });
    res.json(disposals);
  } catch (err) { next(err); }
});

// ── POST /api/disposals ─────────────────────────────────────────────────────
router.post('/', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req, res, next) => {
  try {
    const { assetId, method, disposalDate, approvedBy, approvalRef, saleValue, recipientName, notes } = req.body;
    if (!assetId || !method || !disposalDate) throw new AppError('assetId, method, disposalDate จำเป็น', 400);

    const disposal = await prisma.$transaction(async (tx) => {
      const d = await tx.assetDisposal.create({
        data: {
          assetId,
          method,
          disposalDate: new Date(disposalDate),
          approvedBy,
          approvalRef,
          saleValue: saleValue ? parseFloat(saleValue) : undefined,
          recipientName,
          notes,
          createdById: req.user!.userId,
        },
        include: {
          asset: true,
          createdBy: { select: { id: true, displayName: true } },
        },
      });
      // Mark asset as Retired
      await tx.asset.update({ where: { id: assetId }, data: { status: 'Retired' } });
      return d;
    });
    res.status(201).json(disposal);
  } catch (err) { next(err); }
});

// ── DELETE /api/disposals/:id (cancel/undo — SUPERADMIN only) ───────────────
router.delete('/:id', authenticate, authorize('SUPERADMIN'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const disposal = await prisma.assetDisposal.findUnique({ where: { id } });
    if (!disposal) throw new AppError('ไม่พบรายการจำหน่าย', 404);
    await prisma.$transaction([
      prisma.assetDisposal.delete({ where: { id } }),
      prisma.asset.update({ where: { id: disposal.assetId }, data: { status: 'Available' } }),
    ]);
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
