import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { searchADUsers } from '../services/ldap';

const router = Router();

// ── Users list / management ──
router.get('/users/search-ad', authenticate, authorize('SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q } = req.query;
    if (!q) throw new AppError('กรุณาระบุคำค้นหา');
    const results = await searchADUsers(q as string);
    res.json(results);
  } catch (err) { next(err); }
});

router.post('/users/from-ad', authenticate, authorize('SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { adUsername, displayName, email, department, role } = req.body;
    if (!adUsername || !role) throw new AppError('ข้อมูลไม่ครบถ้วน');

    const existing = await prisma.appUser.findUnique({ where: { adUsername } });
    if (existing) throw new AppError('ผู้ใช้นี้มีอยู่ในระบบแล้ว');

    const newUser = await prisma.appUser.create({
      data: {
        adUsername,
        displayName,
        email,
        department,
        role,
        isActive: true,
      },
    });

    res.status(201).json(newUser);
  } catch (err) { next(err); }
});

router.get('/users', authenticate, authorize('SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, role, page = '1', limit = '50' } = req.query;
    const where: any = {};
    if (role) where.role = role as string;
    if (search) {
      where.OR = [
        { adUsername: { contains: search as string, mode: 'insensitive' } },
        { displayName: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const [users, total] = await Promise.all([
      prisma.appUser.findMany({
        where,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        select: { id: true, adUsername: true, displayName: true, email: true, department: true, role: true, isActive: true, lastLoginAt: true, createdAt: true },
      }),
      prisma.appUser.count({ where }),
    ]);
    res.json({ data: users, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) { next(err); }
});

router.put('/users/:id/role', authenticate, authorize('SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const { role } = req.body;
    if (!['SUPERADMIN', 'IT_ADMIN', 'USER'].includes(role)) throw new AppError('บทบาทไม่ถูกต้อง');

    const user = await prisma.appUser.findUnique({ where: { id } });
    if (!user) throw new AppError('ไม่พบผู้ใช้', 404);

    const oldRole = user.role;
    await prisma.appUser.update({ where: { id }, data: { role } });

    // Audit log
    await prisma.assetHistory.create({
      data: {
        assetId: 1, // placeholder - system-wide audit
        actionType: 'ROLE_CHANGE',
        note: `Changed role of ${user.adUsername} from ${oldRole} to ${role}`,
        actorUserId: req.user!.userId,
      },
    });

    res.json({ message: 'อัปเดตบทบาทเรียบร้อย' });
  } catch (err) { next(err); }
});

router.put('/users/:id/toggle-active', authenticate, authorize('SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const user = await prisma.appUser.findUnique({ where: { id } });
    if (!user) throw new AppError('ไม่พบผู้ใช้', 404);

    const updated = await prisma.appUser.update({
      where: { id },
      data: { isActive: !user.isActive },
    });
    res.json({ message: `ผู้ใช้${updated.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}เรียบร้อย`, isActive: updated.isActive });
  } catch (err) { next(err); }
});

router.delete('/users/:id', authenticate, authorize('SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const user = await prisma.appUser.findUnique({ where: { id } });
    if (!user) throw new AppError('ไม่พบผู้ใช้', 404);

    if (user.id === req.user!.userId) {
      throw new AppError('ไม่สามารถลบผู้ใช้งานที่กำลังล็อกอินอยู่ได้');
    }

    await prisma.appUser.delete({ where: { id } });
    res.json({ message: 'ลบผู้ใช้งานเรียบร้อย' });
  } catch (err: any) {
    if (err.code === 'P2003') {
      next(new AppError('ไม่สามารถลบผู้ใช้นี้ได้ เนื่องจากมีข้อมูลที่เกี่ยวข้องในระบบ (เช่น ประวัติการยืม หรือการดำเนินการอื่นๆ)', 400));
    } else {
      next(err);
    }
  }
});

// ── Settings ──
router.get('/settings', authenticate, authorize('SUPERADMIN'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    let settings = await prisma.notificationSetting.findFirst();
    if (!settings) {
      settings = await prisma.notificationSetting.create({ data: {} });
    }
    res.json(settings);
  } catch (err) { next(err); }
});

router.put('/settings', authenticate, authorize('SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { enableEmail, enableTeams, teamsWebhookUrl, enabledEventKeys } = req.body;
    let settings = await prisma.notificationSetting.findFirst();
    if (!settings) {
      settings = await prisma.notificationSetting.create({ data: req.body });
    } else {
      settings = await prisma.notificationSetting.update({
        where: { id: settings.id },
        data: { enableEmail, enableTeams, teamsWebhookUrl, enabledEventKeys },
      });
    }
    res.json(settings);
  } catch (err) { next(err); }
});

// ── Notification Templates ──
router.get('/notification-templates', authenticate, authorize('SUPERADMIN'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const templates = await prisma.notificationTemplate.findMany();
    res.json(templates);
  } catch (err) { next(err); }
});

router.post('/notification-templates', authenticate, authorize('SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const template = await prisma.notificationTemplate.create({ data: req.body });
    res.status(201).json(template);
  } catch (err) { next(err); }
});

router.put('/notification-templates/:id', authenticate, authorize('SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const template = await prisma.notificationTemplate.update({ where: { id }, data: req.body });
    res.json(template);
  } catch (err) { next(err); }
});

// ── Notification Logs ──
router.get('/notification-logs', authenticate, authorize('SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const [data, total] = await Promise.all([
      prisma.notificationOutbox.findMany({
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notificationOutbox.count(),
    ]);
    res.json({ data, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) { next(err); }
});

export default router;
