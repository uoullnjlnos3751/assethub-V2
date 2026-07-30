import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  const status = err.status || 500;
  const requestId = (req as any).id || 'unknown';
  const timestamp = new Date().toISOString();

  console.error(JSON.stringify({
    type: 'ERROR',
    requestId,
    timestamp,
    status,
    message: err.message,
    path: req.path,
    method: req.method,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  }));

  res.status(status).json({
    error: err.message || 'เกิดข้อผิดพลาดภายในระบบ',
    requestId,
    timestamp,
    ...(process.env.NODE_ENV === 'development' && { details: err.stack }),
  });
}

export class AppError extends Error {
  status: number;
  constructor(message: string, status: number = 400) {
    super(message);
    this.status = status;
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'ไม่พบทรัพยากร') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'ไม่ได้รับอนุญาต') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'ไม่มีสิทธิ์เข้าถึง') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}
