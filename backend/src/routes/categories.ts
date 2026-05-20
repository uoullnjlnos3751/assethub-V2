import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { AppError } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// ── Get all categories with types ──
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      include: { types: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    });
    res.json(categories);
  } catch (err) { next(err); }
});

// ── Get all categories (admin, including inactive) ──
router.get('/all', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.category.findMany({
      include: { types: { orderBy: { sortOrder: 'asc' } }, _count: { select: { assets: true } } },
      orderBy: { sortOrder: 'asc' },
    });
    res.json(categories);
  } catch (err) { next(err); }
});

// ── Create category ──
router.post('/', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, icon, description, sortOrder } = req.body;
    if (!name || !icon) throw new AppError('กรุณากรอกชื่อและไอคอนหมวดหมู่', 400);

    const category = await prisma.category.create({
      data: { name, icon, description, sortOrder: sortOrder || 0 },
      include: { types: true },
    });
    res.status(201).json(category);
  } catch (err) { next(err); }
});

// ── Update category ──
router.put('/:id', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const { name, icon, description, sortOrder, isActive } = req.body;

    const category = await prisma.category.update({
      where: { id },
      data: { name, icon, description, sortOrder, isActive },
      include: { types: true },
    });
    res.json(category);
  } catch (err) { next(err); }
});

// ── Delete category ──
router.delete('/:id', authenticate, authorize('SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.category.delete({ where: { id } });
    res.json({ message: 'ลบหมวดหมู่เรียบร้อย' });
  } catch (err) { next(err); }
});

// ── Create type under category ──
router.post('/:id/types', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categoryId = parseInt(req.params.id);
    const { name, description, detailTable, isBorrowable, isAssignable, sortOrder } = req.body;
    if (!name) throw new AppError('กรุณากรอกชื่อประเภท', 400);

    const type = await prisma.categoryType.create({
      data: {
        categoryId,
        name,
        description,
        detailTable,
        isBorrowable: isBorrowable !== undefined ? isBorrowable : true,
        isAssignable: isAssignable !== undefined ? isAssignable : true,
        sortOrder: sortOrder || 0,
      },
    });
    res.status(201).json(type);
  } catch (err) { next(err); }
});

// ── Update type ──
router.put('/types/:typeId', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const typeId = parseInt(req.params.typeId);
    const { name, description, detailTable, isBorrowable, isAssignable, sortOrder, isActive } = req.body;

    const type = await prisma.categoryType.update({
      where: { id: typeId },
      data: { name, description, detailTable, isBorrowable, isAssignable, sortOrder, isActive },
    });
    res.json(type);
  } catch (err) { next(err); }
});

// ── Delete type ──
router.delete('/types/:typeId', authenticate, authorize('SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const typeId = parseInt(req.params.typeId);
    await prisma.categoryType.delete({ where: { id: typeId } });
    res.json({ message: 'ลบประเภทเรียบร้อย' });
  } catch (err) { next(err); }
});

// ── Reorder types within category ──
router.post('/:id/types/reorder', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { typeIds } = req.body;
    if (!Array.isArray(typeIds)) throw new AppError('กรุณาส่ง array ของ typeIds', 400);

    await prisma.$transaction(
      typeIds.map((id: number, index: number) =>
        prisma.categoryType.update({ where: { id }, data: { sortOrder: index } })
      )
    );
    res.json({ message: 'เรียงลำดับเรียบร้อย' });
  } catch (err) { next(err); }
});

export default router;
