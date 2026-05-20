import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { AppError } from '../middleware/errorHandler';

export class AuthController {
  static async checkExpiry(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        throw new AppError('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน', 400);
      }
      const result = await AuthService.checkExpiry(username, password);
      res.json(result);
    } catch (err: any) {
      console.error('Password expiry check failed:', err.message);
      next(new AppError(err.message || 'Authentication failed for expiry check', 401));
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        throw new AppError('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน', 400);
      }
      const result = await AuthService.login(username, password);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async me(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user || !req.user.userId) {
        throw new AppError('ไม่พบข้อมูลการยืนยันตัวตน', 401);
      }
      const user = await AuthService.getUserById(req.user.userId);
      res.json(user);
    } catch (err) {
      next(err);
    }
  }
}
