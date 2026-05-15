import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';
import { AppError } from './errorHandler';

const JWT_SECRET = process.env.JWT_SECRET || 'assethub-jwt-secret-change-in-production';

export interface AuthUser {
  userId: number;
  adUsername: string;
  role: string;
  displayName: string | null;
  email: string | null;
  department: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('ไม่พบ Token การยืนยันตัวตน', 401);
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = decoded;
    next();
  } catch {
    throw new AppError('Token ไม่ถูกต้องหรือหมดอายุ', 401);
  }
}

export function authorize(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw new AppError('ไม่ได้ล็อกอิน', 401);
    if (!roles.includes(req.user.role)) throw new AppError('ไม่มีสิทธิ์เข้าถึง', 403);
    next();
  };
}
