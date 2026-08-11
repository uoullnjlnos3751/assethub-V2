import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { getAllADDepartments } from '../services/ldap';

const router = Router();

// Get all departments
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const searchTerm = req.query.search ? String(req.query.search).toLowerCase() : '';
    
    const departments = await prisma.department.findMany({
      where: searchTerm ? {
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { code: { contains: searchTerm, mode: 'insensitive' } },
        ]
      } : undefined,
      orderBy: { name: 'asc' },
    });

    res.json(departments);
  } catch (err) { next(err); }
});

// Get single department
router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const department = await prisma.department.findUnique({ where: { id } });
    if (!department) throw new AppError('ไม่พบแผนก', 404);
    res.json(department);
  } catch (err) { next(err); }
});

// Create department
router.post('/', authenticate, authorize('SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, code, description } = req.body;
    
    if (!name || !name.trim()) {
      throw new AppError('ชื่อแผนก ต้องไม่ว่างเปล่า', 400);
    }

    // Check if department already exists
    const existing = await prisma.department.findFirst({
      where: {
        OR: [
          { name: { equals: name.trim(), mode: 'insensitive' } },
          code ? { code: { equals: code.trim(), mode: 'insensitive' } } : { code: '' },
        ]
      }
    });
    if (existing) {
      throw new AppError('แผนกนี้มีอยู่ในระบบแล้ว', 400);
    }

    const department = await prisma.department.create({
      data: {
        name: name.trim(),
        code: code ? code.trim() : name.trim().substring(0, 3).toUpperCase(),
        description: description || null,
      }
    });

    res.status(201).json(department);
  } catch (err) { next(err); }
});

// Update department
router.put('/:id', authenticate, authorize('SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const { name, code, description } = req.body;

    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing) throw new AppError('ไม่พบแผนก', 404);

    if (name && name.trim() && name.trim() !== existing.name) {
      const dup = await prisma.department.findFirst({
        where: {
          name: { equals: name.trim(), mode: 'insensitive' },
          NOT: { id }
        }
      });
      if (dup) throw new AppError('ชื่อแผนกนี้มีอยู่แล้ว', 400);
    }

    const updated = await prisma.department.update({
      where: { id },
      data: {
        name: name ? name.trim() : existing.name,
        code: code ? code.trim() : existing.code,
        description: description !== undefined ? description : existing.description,
      }
    });

    res.json(updated);
  } catch (err) { next(err); }
});

// Delete department
router.delete('/:id', authenticate, authorize('SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    
    // Check if any assets use this department
    const assetCount = await prisma.asset.count({
      where: { departmentId: String(id) }
    });
    if (assetCount > 0) {
      throw new AppError(`ไม่สามารถลบได้ มีทรัพย์สิน ${assetCount} รายการใช้แผนกนี้`, 400);
    }

    await prisma.department.delete({ where: { id } });
    res.json({ message: 'ลบแผนกเรียบร้อย' });
  } catch (err) { next(err); }
});

import { syncMasterDataFromIntraTools } from '../services/intraSync';

// Sync from AD
router.post('/sync-ad', authenticate, authorize('SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result: any = await syncMasterDataFromIntraTools();
    res.json({ message: `นำเข้าสำเร็จ: บริษัท ${result.company.added} รายการ, แผนก ${result.department.added} รายการ`, addedCount: result.department.added });
  } catch (err) { next(err); }
});

export default router;
