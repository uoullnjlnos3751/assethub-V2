import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// ── GET /api/contracts ──────────────────────────────────────────────────────
router.get('/', authenticate, authorize('IT_ADMIN', 'SUPERADMIN', 'VIEWER'), async (req, res, next) => {
  try {
    const { type, active, expiringSoon } = req.query;
    const where: any = {};
    if (type) where.contractType = type;
    if (active !== undefined) where.isActive = active === 'true';
    if (expiringSoon === 'true') {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + 90);
      where.endDate = { lte: cutoff };
      where.isActive = true;
    }
    const contracts = await prisma.contract.findMany({
      where,
      include: {
        assets: { include: { asset: { select: { id: true, assetCode: true, assetName: true, type: true } } } },
      },
      orderBy: { endDate: 'asc' },
    });
    res.json(contracts);
  } catch (err) { next(err); }
});

// ── GET /api/contracts/:id ──────────────────────────────────────────────────
router.get('/:id', authenticate, authorize('IT_ADMIN', 'SUPERADMIN', 'VIEWER'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        assets: { include: { asset: true } },
      },
    });
    if (!contract) throw new AppError('ไม่พบสัญญา', 404);
    res.json(contract);
  } catch (err) { next(err); }
});

// ── POST /api/contracts ─────────────────────────────────────────────────────
router.post('/', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req, res, next) => {
  try {
    const { assetIds, ...data } = req.body;
    const contract = await prisma.contract.create({
      data: {
        ...data,
        startDate: new Date(data.startDate),
        endDate:   new Date(data.endDate),
        assets: assetIds?.length
          ? { create: (assetIds as number[]).map((assetId: number) => ({ assetId })) }
          : undefined,
      },
      include: { assets: true },
    });
    res.status(201).json(contract);
  } catch (err) { next(err); }
});

// ── PUT /api/contracts/:id ──────────────────────────────────────────────────
router.put('/:id', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { assetIds, ...data } = req.body;
    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.endDate)   data.endDate   = new Date(data.endDate);

    if (assetIds !== undefined) {
      await prisma.contractAsset.deleteMany({ where: { contractId: id } });
    }
    const contract = await prisma.contract.update({
      where: { id },
      data: {
        ...data,
        assets: assetIds?.length
          ? { create: (assetIds as number[]).map((assetId: number) => ({ assetId })) }
          : undefined,
      },
      include: { assets: true },
    });
    res.json(contract);
  } catch (err) { next(err); }
});

// ── DELETE /api/contracts/:id ───────────────────────────────────────────────
router.delete('/:id', authenticate, authorize('SUPERADMIN'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.contract.delete({ where: { id } });
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
