import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';
import { validate, loginSchema } from '../middleware/validation';

const router = Router();

// ── Check Password Expiry ──
router.post('/check-expiry', authLimiter, validate(loginSchema), AuthController.checkExpiry);

// ── Login ──
router.post('/login', authLimiter, validate(loginSchema), AuthController.login);

// ── Get Current User Details ──
router.get('/me', authenticate, AuthController.me);

// ── Change Password (Local users only) ──
router.post('/change-password', authenticate, async (req, res, next) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const bcrypt = require('bcryptjs');
    const { prisma } = require('../lib/prisma');
    const { currentPassword, newPassword } = req.body;
    const userId = (req as any).user?.userId;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'กรุณากรอกรหัสผ่านให้ครบ' });
    }
    if (newPassword.length < 4) {
      return res.status(400).json({ error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร' });
    }
    const user = await prisma.appUser.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) {
      return res.status(400).json({ error: 'ผู้ใช้นี้ไม่ได้ใช้รหัสผ่านแบบ Local ไม่สามารถเปลี่ยนได้ในระบบนี้' });
    }
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });
    }
    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.appUser.update({ where: { id: userId }, data: { passwordHash: hash } });
    res.json({ message: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว' });
  } catch (err) { next(err); }
});

// ── Public Settings ──
router.get('/settings', AuthController.settings);

export default router;

