import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// GET /api/settings - Fetch all settings
router.get('/', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await prisma.systemSetting.findMany({
      orderBy: { group: 'asc' }
    });
    res.json(settings);
  } catch (err) { next(err); }
});

// GET /api/settings/:key - Fetch specific setting
// Same role as the list endpoint above. This was authenticate-only, so any
// signed-in USER could read any SystemSetting by key while the list required
// IT_ADMIN — an inconsistent gap. The only caller (PMDeviceArrayInput, which
// reads PM_DISPLAY_FORMAT) lives on IT_ADMIN-gated PM pages, so tightening it
// does not affect the USER role.
router.get('/:key', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { key } = req.params;
    const setting = await prisma.systemSetting.findUnique({ where: { key } });
    if (!setting) {
      return res.json({ value: null });
    }
    res.json(setting);
  } catch (err) { next(err); }
});

// PUT /api/settings - Update multiple settings
router.put('/', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { settings } = req.body; // Array of { key, value, group, description }
    
    if (!Array.isArray(settings)) {
      throw new AppError('รูปแบบข้อมูลไม่ถูกต้อง (ต้องเป็น Array)', 400);
    }

    const updated = [];
    for (const item of settings) {
      const { key, value, group, description } = item;
      
      const record = await prisma.systemSetting.upsert({
        where: { key },
        update: {
          value: typeof value === 'string' ? value : JSON.stringify(value),
          updatedBy: req.user!.userId
        },
        create: {
          key,
          group: group || 'GENERAL',
          value: typeof value === 'string' ? value : JSON.stringify(value),
          description: description || '',
          updatedBy: req.user!.userId
        }
      });
      updated.push(record);
    }

    res.json({ message: 'บันทึกการตั้งค่าสำเร็จ', updated });
  } catch (err) { next(err); }
});

export default router;
