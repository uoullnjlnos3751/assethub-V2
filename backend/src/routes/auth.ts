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

// ── Public Settings ──
router.get('/settings', AuthController.settings);

export default router;
