import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { loginLimiter } from '../middleware/rateLimiter';
import { validate, loginSchema } from '../middleware/validation';
import { prisma } from '../lib/prisma';

const router = Router();

const MIN_LOCAL_PASSWORD_LENGTH = 8;

// ── Check Password Expiry ──
router.post('/check-expiry', loginLimiter, validate(loginSchema), AuthController.checkExpiry);

// ── Login ──
router.post('/login', loginLimiter, validate(loginSchema), AuthController.login);

// ── Get Current User Details ──
router.get('/me', authenticate, AuthController.me);

// ── Logout ── (clears the httpOnly session cookie; see AuthController.logout)
router.post('/logout', AuthController.logout);

// ── Change Password (Local users only) ──
router.post('/change-password', authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.userId;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'กรุณากรอกรหัสผ่านให้ครบ' });
    }
    if (newPassword.length < MIN_LOCAL_PASSWORD_LENGTH) {
      return res.status(400).json({
        error: `รหัสผ่านใหม่ต้องมีอย่างน้อย ${MIN_LOCAL_PASSWORD_LENGTH} ตัวอักษร`,
      });
    }
    if (newPassword === currentPassword) {
      return res.status(400).json({ error: 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม' });
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

