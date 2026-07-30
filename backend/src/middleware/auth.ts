import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';
import { getJwtSecret } from '../config/env';

export interface AuthUser {
  userId: number;
  adUsername: string;
  role: string;
  displayName: string | null;
  email: string | null;
  department: string | null;
  company?: string | null;
  companyThai?: string | null;
  avatarUrl?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function generateToken(user: AuthUser): string {
  // JWT_EXPIRES_IN was documented in .env.example but never read here — every
  // token was hardcoded to 24h regardless of the env value. Wired it up;
  // 24h remains the default so existing deployments see no change unless
  // they set the variable.
  const expiresIn = (process.env.JWT_EXPIRES_IN || '24h') as jwt.SignOptions['expiresIn'];
  return jwt.sign(user, getJwtSecret(), { expiresIn });
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('ไม่พบ Token การยืนยันตัวตน', 401));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as AuthUser;
    req.user = decoded;
    next();
  } catch {
    return next(new AppError('Token ไม่ถูกต้องหรือหมดอายุ', 401));
  }
}

export function authorize(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError('ไม่ได้ล็อกอิน', 401));
    if (!roles.includes(req.user.role)) return next(new AppError('ไม่มีสิทธิ์เข้าถึง', 403));
    next();
  };
}
