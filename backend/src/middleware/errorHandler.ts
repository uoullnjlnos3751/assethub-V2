import { Request, Response, NextFunction } from 'express';

// Thai labels for fields that commonly trip a unique-constraint violation,
// so Prisma's raw "Unique constraint failed on the fields: (`x`)" never
// reaches the user — see translatePrismaError().
const DUPLICATE_FIELD_LABELS_TH: Record<string, string> = {
  assetCode: 'รหัสทรัพย์สิน',
  serialNo: 'Serial Number',
  assetName: 'ชื่อทรัพย์สิน',
  adUsername: 'ชื่อผู้ใช้งาน',
  requestNo: 'เลขที่คำขอ',
  email: 'อีเมล',
  name: 'ชื่อ',
  code: 'รหัส',
};

function translatePrismaError(err: any): { message: string; status: number } | null {
  // Prisma known-request errors carry a `code` like 'P2002' regardless of
  // whether the `@prisma/client` error class import matches this bundle's
  // instance, so check duck-typed fields instead of `instanceof`.
  if (err?.code === 'P2002') {
    const fields: string[] = Array.isArray(err.meta?.target) ? err.meta.target : [];
    const labels = fields.map((f) => DUPLICATE_FIELD_LABELS_TH[f] || f).join(', ');
    return {
      status: 409,
      message: labels
        ? `${labels}นี้มีอยู่ในระบบแล้ว กรุณาตรวจสอบและลองใหม่อีกครั้ง`
        : 'ข้อมูลนี้ซ้ำกับที่มีอยู่ในระบบแล้ว กรุณาตรวจสอบและลองใหม่อีกครั้ง',
    };
  }
  if (err?.code === 'P2025') {
    return { status: 404, message: 'ไม่พบข้อมูลที่ต้องการ อาจถูกลบหรือแก้ไขไปแล้ว กรุณารีเฟรชหน้าจอ' };
  }
  return null;
}

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  const prismaTranslation = translatePrismaError(err);
  const status = prismaTranslation?.status || err.status || 500;
  const message = prismaTranslation?.message || err.message || 'เกิดข้อผิดพลาดภายในระบบ';
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
    error: message,
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
