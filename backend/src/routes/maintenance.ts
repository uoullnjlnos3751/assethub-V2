import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { prisma } from '../lib/prisma';

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'maintenance');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req: any, _file: any, cb: any) => cb(null, UPLOAD_DIR),
    filename: (_req: any, file: any, cb: any) => {
      const ext = path.extname(file.originalname);
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// Create Maintenance Record
router.post('/', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { assetId, reportedProblem, repairType, vendorName } = req.body;
    
    // Check if asset exists
    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) throw new AppError('ไม่พบทรัพย์สิน', 404);
    
    // Generate Ticket No
    const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
    const count = await prisma.maintenanceRecord.count({
      where: { ticketNo: { startsWith: `REP-${dateStr}` } }
    });
    const ticketNo = `REP-${dateStr}-${String(count + 1).padStart(3, '0')}`;
    
    const record = await prisma.maintenanceRecord.create({
      data: {
        ticketNo,
        assetId,
        reportedProblem,
        repairType,
        vendorName,
        technicianId: req.user!.userId,
        status: 'IN_PROGRESS',
      },
    });

    // Update Asset Status to Maintenance
    await prisma.asset.update({
      where: { id: assetId },
      data: { status: 'Maintenance' }
    });

    res.status(201).json(record);
  } catch (err) { next(err); }
});

// Update Maintenance Record
router.put('/:id', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const { reportedProblem, repairType, vendorName, resolutionNote, totalCost, status, parts } = req.body;
    
    const existing = await prisma.maintenanceRecord.findUnique({ where: { id } });
    if (!existing) throw new AppError('ไม่พบรายการซ่อม', 404);

    let completedAt = null;
    if (status === 'COMPLETED' && existing.status !== 'COMPLETED') {
      completedAt = new Date();
    }

    const updateData: any = {};
    if (reportedProblem !== undefined) updateData.reportedProblem = reportedProblem;
    if (repairType !== undefined) updateData.repairType = repairType;
    if (vendorName !== undefined) updateData.vendorName = vendorName;
    if (resolutionNote !== undefined) updateData.resolutionNote = resolutionNote;
    if (totalCost !== undefined) updateData.totalCost = totalCost;
    if (status !== undefined) updateData.status = status;

    if (completedAt) updateData.completedAt = completedAt;

    const record = await prisma.maintenanceRecord.update({
      where: { id },
      data: updateData,
    });

    // Handle parts if provided
    if (parts && Array.isArray(parts)) {
      await prisma.maintenancePart.deleteMany({ where: { recordId: id } });
      if (parts.length > 0) {
        await prisma.maintenancePart.createMany({
          data: parts.map((p: any) => ({
            recordId: id,
            partName: p.partName,
            quantity: p.quantity,
            price: p.price,
          }))
        });
      }
    }

    // If completed, update Asset Status back to Available
    if (status === 'COMPLETED') {
      await prisma.asset.update({
        where: { id: existing.assetId },
        data: { status: 'Available' }
      });
    }

    res.json(record);
  } catch (err) { next(err); }
});

// Upload Image
router.post('/:id/images', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), upload.single('image'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const { imageType, description } = req.body;
    
    if (!req.file) throw new AppError('ไม่พบไฟล์รูปภาพ', 400);

    const record = await prisma.maintenanceRecord.findUnique({ where: { id } });
    if (!record) throw new AppError('ไม่พบรายการซ่อม', 404);

    const image = await prisma.maintenanceImage.create({
      data: {
        recordId: id,
        imageType: imageType || 'BEFORE',
        imageUrl: `/uploads/maintenance/${req.file.filename}`,
        description,
      }
    });
    
    res.status(201).json(image);
  } catch (err) { next(err); }
});

// Get Records for Asset
router.get('/asset/:assetId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assetId = parseInt(req.params.assetId);
    const records = await prisma.maintenanceRecord.findMany({
      where: { assetId },
      include: {
        replacedParts: true,
        images: true,
        technician: { select: { displayName: true } }
      },
      orderBy: { startedAt: 'desc' }
    });
    res.json(records);
  } catch (err) { next(err); }
});

// Get Single Record
router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const record = await prisma.maintenanceRecord.findUnique({
      where: { id },
      include: {
        replacedParts: true,
        images: true,
        technician: { select: { displayName: true } },
        asset: { select: { assetCode: true, assetName: true, serialNo: true, brand: true, model: true } }
      }
    });
    if (!record) throw new AppError('ไม่พบรายการซ่อม', 404);
    res.json(record);
  } catch (err) { next(err); }
});

// Maintenance Report
router.get('/report/all', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate, status, search } = req.query;
    
    const where: any = {};
    if (status) where.status = status;
    if (startDate && endDate) {
      where.startedAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }
    if (search) {
      where.OR = [
        { ticketNo: { contains: search as string } },
        { reportedProblem: { contains: search as string } },
        { asset: { assetCode: { contains: search as string } } },
        { asset: { assetName: { contains: search as string } } },
        { asset: { serialNo: { contains: search as string } } }
      ];
    }

    const records = await prisma.maintenanceRecord.findMany({
      where,
      include: {
        asset: { select: { id: true, assetCode: true, assetName: true, serialNo: true, brand: true, model: true } },
        technician: { select: { displayName: true } }
      },
      orderBy: { startedAt: 'desc' },
      take: 2000
    });

    res.json(records);
  } catch (err) { next(err); }
});

// Delete Image
router.delete('/images/:imageId', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const imageId = parseInt(req.params.imageId);
    const image = await prisma.maintenanceImage.findUnique({ where: { id: imageId } });
    if (!image) throw new AppError('ไม่พบรูปภาพ', 404);

    // Delete from DB
    await prisma.maintenanceImage.delete({ where: { id: imageId } });

    // Try to delete physical file
    try {
      const filePath = path.join(__dirname, '..', '..', image.imageUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (e) {
      console.error('Failed to delete physical file', e);
    }

    res.json({ message: 'ลบรูปภาพสำเร็จ' });
  } catch (err) { next(err); }
});

export default router;
