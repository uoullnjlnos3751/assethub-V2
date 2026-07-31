import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// ── GET /api/licenses ───────────────────────────────────────────────────────
router.get('/', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req, res, next) => {
  try {
    const { active, expiringSoon } = req.query;
    const where: any = {};
    if (active !== undefined) where.isActive = active === 'true';
    if (expiringSoon === 'true') {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + 90);
      where.expiryDate = { lte: cutoff, not: null };
      where.isActive = true;
    }
    const licenses = await prisma.softwareLicense.findMany({
      where,
      include: {
        assignments: {
          include: { },
        },
      },
      orderBy: [{ expiryDate: 'asc' }, { name: 'asc' }],
    });
    // Augment with usage count
    const result = licenses.map(l => ({
      ...l,
      usedSeats: l.assignments.length,
      availableSeats: l.totalSeats - l.assignments.length,
    }));
    res.json(result);
  } catch (err) { next(err); }
});

// ── GET /api/licenses/:id ───────────────────────────────────────────────────
router.get('/:id', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const license = await prisma.softwareLicense.findUnique({
      where: { id },
      include: { assignments: true },
    });
    if (!license) throw new AppError('ไม่พบ License', 404);
    res.json({ ...license, usedSeats: license.assignments.length, availableSeats: license.totalSeats - license.assignments.length });
  } catch (err) { next(err); }
});

// ── POST /api/licenses ──────────────────────────────────────────────────────
router.post('/', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req, res, next) => {
  try {
    const data = req.body;
    if (data.purchaseDate) data.purchaseDate = new Date(data.purchaseDate);
    if (data.expiryDate)   data.expiryDate   = new Date(data.expiryDate);
    const license = await prisma.softwareLicense.create({ data });
    res.status(201).json(license);
  } catch (err) { next(err); }
});

// ── PUT /api/licenses/:id ───────────────────────────────────────────────────
router.put('/:id', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;
    if (data.purchaseDate) data.purchaseDate = new Date(data.purchaseDate);
    if (data.expiryDate)   data.expiryDate   = new Date(data.expiryDate);
    const license = await prisma.softwareLicense.update({ where: { id }, data });
    res.json(license);
  } catch (err) { next(err); }
});

// ── POST /api/licenses/:id/assign ──────────────────────────────────────────
router.post('/:id/assign', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req, res, next) => {
  try {
    const licenseId = parseInt(req.params.id);
    const { assetId, userId, note } = req.body;
    const license = await prisma.softwareLicense.findUnique({ where: { id: licenseId }, include: { assignments: true } });
    if (!license) throw new AppError('ไม่พบ License', 404);
    if (license.assignments.length >= license.totalSeats) throw new AppError('License เต็มแล้ว (seats หมด)', 400);
    const assignment = await prisma.licenseAssignment.create({ data: { licenseId, assetId, userId, note } });
    res.status(201).json(assignment);
  } catch (err) { next(err); }
});

// ── DELETE /api/licenses/assignments/:assignmentId ──────────────────────────
router.delete('/assignments/:assignmentId', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.assignmentId);
    await prisma.licenseAssignment.delete({ where: { id } });
    res.status(204).send();
  } catch (err) { next(err); }
});

// ── DELETE /api/licenses/:id ────────────────────────────────────────────────
router.delete('/:id', authenticate, authorize('SUPERADMIN'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.softwareLicense.delete({ where: { id } });
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
