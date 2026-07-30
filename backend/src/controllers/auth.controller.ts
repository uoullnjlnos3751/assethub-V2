import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { AppError } from '../middleware/errorHandler';
import type { LoginInput } from '../types';

export class AuthController {
  static async checkExpiry(req: Request<{}, {}, LoginInput>, res: Response, next: NextFunction) {
    try {
      const { username, password } = req.body;
      const result = await AuthService.checkExpiry(username, password);
      res.json(result);
    } catch (err) {
      next(err instanceof AppError ? err : new AppError(err instanceof Error ? err.message : 'Authentication failed for expiry check', 401));
    }
  }

  static async login(req: Request<{}, {}, LoginInput>, res: Response, next: NextFunction) {
    try {
      const { username, password } = req.body;
      const result = await AuthService.login(username, password);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async me(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.userId) {
        throw new AppError('ไม่พบข้อมูลการยืนยันตัวตน', 401);
      }
      const user = await AuthService.getUserById(req.user.userId);
      res.json(user);
    } catch (err) {
      next(err);
    }
  }

  static async settings(_req: Request, res: Response, next: NextFunction) {
    try {
      const { prisma } = await import('../lib/prisma');
      let settings = await prisma.notificationSetting.findFirst();
      if (!settings) {
        settings = await prisma.notificationSetting.create({ data: {} });
      }
      res.json({
        systemName: settings.systemName || 'IT Asset Management (ITAM)',
        organizationName: settings.organizationName || 'TRR Group',
        logoUrl: settings.logoUrl || null,
        timezone: settings.timezone || 'Asia/Bangkok',
        showWelcomeBanner: settings.showWelcomeBanner ?? true,
        allowExtension: settings.allowExtension ?? true,
        maxExtensionsPerRequest: settings.maxExtensionsPerRequest ?? 2,
        maxBorrowDays: settings.maxBorrowDays ?? 30,
        borrowDays: settings.borrowDays ?? 3,
        maxItemsPerRequest: settings.maxItemsPerRequest ?? 5,
        overdueWarningDays: settings.overdueWarningDays ?? 3,
      });
    } catch (err) {
      next(err);
    }
  }
}
