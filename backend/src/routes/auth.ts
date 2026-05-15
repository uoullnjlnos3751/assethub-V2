import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { authenticateLDAP, checkPasswordExpiry } from '../services/ldap';
import { generateToken, authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { authLimiter } from '../middleware/rateLimiter';
import { validate, loginSchema } from '../middleware/validation';

const router = Router();

router.post('/check-expiry', authLimiter, validate(loginSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body;

    const result = await checkPasswordExpiry(username, password);
    res.json(result);
  } catch (err: any) {
    console.error('Password expiry check failed:', err.message);
    next(new AppError(err.message || 'Authentication failed for expiry check', 401));
  }
});

router.post('/login', authLimiter, validate(loginSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body;

    const ldapInfo = await authenticateLDAP(username, password);
    if (!ldapInfo) throw new AppError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', 401);

    let user = await prisma.appUser.findUnique({ where: { adUsername: username } });
    if (!user) {
      user = await prisma.appUser.create({
        data: {
          adUsername: username,
          displayName: ldapInfo.displayName,
          email: ldapInfo.email,
          department: ldapInfo.department,
          role: 'USER',
        },
      });
    } else {
      await prisma.appUser.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          displayName: ldapInfo.displayName || user.displayName,
          email: ldapInfo.email || user.email,
          department: ldapInfo.department || user.department,
        },
      });
    }

    if (!user.isActive) throw new AppError('บัญชีผู้ใช้ถูกปิดใช้งาน', 403);

    const token = generateToken({
      userId: user.id,
      adUsername: user.adUsername,
      role: user.role,
      displayName: user.displayName,
      email: user.email,
      department: user.department,
    });

    res.json({
      token,
      user: {
        id: user.id,
        adUsername: user.adUsername,
        displayName: user.displayName,
        email: user.email,
        department: user.department,
        role: user.role,
      },
    });
  } catch (err) { next(err); }
});

router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.appUser.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, adUsername: true, displayName: true, email: true, department: true, role: true, isActive: true, lastLoginAt: true, createdAt: true },
    });
    if (!user) throw new AppError('ไม่พบผู้ใช้', 404);
    res.json(user);
  } catch (err) { next(err); }
});

export default router;
