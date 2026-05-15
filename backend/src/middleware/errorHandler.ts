import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  console.error('Error:', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'เกิดข้อผิดพลาดภายในระบบ',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
}

export class AppError extends Error {
  status: number;
  constructor(message: string, status: number = 400) {
    super(message);
    this.status = status;
  }
}
