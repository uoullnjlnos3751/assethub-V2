import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, category, page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 100);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { isActive: true };
    if (category) where.category = category as string;
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { brand: { contains: search as string, mode: 'insensitive' } },
        { model: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.inventoryItem.findMany({ where, skip, take: limitNum, orderBy: { name: 'asc' } }),
      prisma.inventoryItem.count({ where }),
    ]);

    res.json({ data: items, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) { next(err); }
});

router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await prisma.inventoryItem.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        transactions: { orderBy: { createdAt: 'desc' }, take: 100 },
      },
    });
    if (!item) throw new AppError('ไม่พบรายการ', 404);
    res.json(item);
  } catch (err) { next(err); }
});

router.post('/', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, category, brand, model, totalQuantity, minStockLevel, unit, location, remark } = req.body;
    if (!name || !category || !unit) throw new AppError('กรุณากรอกชื่อ ประเภท และหน่วยนับ');

    const item = await prisma.inventoryItem.create({
      data: {
        name, category, brand, model, unit, location, remark,
        totalQuantity: totalQuantity || 0,
        availableQuantity: totalQuantity || 0,
        minStockLevel: minStockLevel || 0,
      },
    });
    res.status(201).json(item);
  } catch (err) { next(err); }
});

router.put('/:id', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!existing) throw new AppError('ไม่พบรายการ', 404);

    const { name, category, brand, model, totalQuantity, minStockLevel, unit, location, remark } = req.body;
    const item = await prisma.inventoryItem.update({
      where: { id },
      data: {
        name, category, brand, model, unit, location, remark,
        totalQuantity: totalQuantity ?? existing.totalQuantity,
        minStockLevel: minStockLevel ?? existing.minStockLevel,
      },
    });
    res.json(item);
  } catch (err) { next(err); }
});

router.delete('/:id', authenticate, authorize('SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.inventoryItem.update({ where: { id }, data: { isActive: false } });
    res.json({ message: 'ลบรายการเรียบร้อย' });
  } catch (err) { next(err); }
});

router.post('/:id/checkin', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const { quantity, note } = req.body;
    if (!quantity || quantity < 1) throw new AppError('จำนวนต้องมากกว่า 0');

    const item = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!item) throw new AppError('ไม่พบรายการ', 404);

    const [updated] = await prisma.$transaction([
      prisma.inventoryItem.update({
        where: { id },
        data: {
          totalQuantity: { increment: quantity },
          availableQuantity: { increment: quantity },
        },
      }),
      prisma.inventoryTransaction.create({
        data: {
          itemId: id,
          action: 'checkin',
          quantity,
          userId: req.user!.userId,
          userName: req.user!.displayName || req.user!.adUsername,
          note: note || null,
        },
      }),
    ]);

    res.json(updated);
  } catch (err) { next(err); }
});

router.post('/:id/checkout', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const { quantity, note, refNo } = req.body;
    if (!quantity || quantity < 1) throw new AppError('จำนวนต้องมากกว่า 0');

    const item = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!item) throw new AppError('ไม่พบรายการ', 404);
    if (item.availableQuantity < quantity) throw new AppError(`คงเหลือไม่พอ (มี ${item.availableQuantity} ${item.unit})`);

    const [updated] = await prisma.$transaction([
      prisma.inventoryItem.update({
        where: { id },
        data: {
          availableQuantity: { decrement: quantity },
        },
      }),
      prisma.inventoryTransaction.create({
        data: {
          itemId: id,
          action: 'checkout',
          quantity,
          userId: req.user!.userId,
          userName: req.user!.displayName || req.user!.adUsername,
          note: note || null,
          refNo: refNo || null,
        },
      }),
    ]);

    res.json(updated);
  } catch (err) { next(err); }
});

router.get('/categories/list', authenticate, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await prisma.inventoryItem.findMany({
      where: { isActive: true },
      distinct: ['category'],
      select: { category: true },
      orderBy: { category: 'asc' },
    });
    const categorySet = new Set(rows.map((r) => r.category).filter((v): v is string => v !== null));
    ['Cable', 'Cartridge', 'Consumable', 'Other'].forEach((d) => categorySet.add(d));
    res.json(Array.from(categorySet).sort((a, b) => a.localeCompare(b)));
  } catch (err) { next(err); }
});

export default router;
