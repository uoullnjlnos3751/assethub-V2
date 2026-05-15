import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';

export const loginSchema = z.object({
  username: z.string().min(1, 'กรุณากรอกชื่อผู้ใช้').max(100),
  password: z.string().min(1, 'กรุณากรอกรหัสผ่าน').max(200),
});

export const borrowRequestSchema = z.object({
  assetIds: z.array(z.number()).min(1, 'กรุณาเลือกทรัพย์สินอย่างน้อย 1 รายการ'),
  purpose: z.string().optional(),
  notes: z.string().optional(),
  location: z.string().optional(),
  dueDate: z.string().optional(),
});

export const approveSchema = z.object({
  action: z.enum(['Approved', 'Rejected'], { errorMap: () => ({ message: 'การกระทำไม่ถูกต้อง' }) }),
  note: z.string().optional(),
});

export const checkoutSchema = z.object({
  receivedBy: z.string().optional(),
  handoverNote: z.string().optional(),
});

export const returnSchema = z.object({
  condition: z.enum(['Normal', 'Damaged', 'Repairing', 'AccessoryIncomplete'], {
    errorMap: () => ({ message: 'กรุณาเลือกสภาพเครื่อง' }),
  }),
  damageNote: z.string().optional(),
  accessoriesNote: z.string().optional(),
});

export const extensionSchema = z.object({
  requestId: z.number(),
  itemIds: z.array(z.number()).min(1),
  extraDays: z.number().min(1).max(365),
  reason: z.string().optional(),
});

export function validate(schema: z.ZodObject<any, any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        const message = err.errors[0]?.message || 'ข้อมูลไม่ถูกต้อง';
        next(new AppError(message, 400));
      } else {
        next(err);
      }
    }
  };
}
