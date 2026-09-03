import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';

const router = Router();

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'catalog');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// เอกสารอ้างอิงการจัดซื้อ (ใบเสนอราคา/ใบสั่งซื้อ) — โครงเดียวกับ docUpload ใน
// assets.ts เพื่อให้พฤติกรรมไฟล์แนบสอดคล้องกันทั้งระบบ
const docUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('ประเภทไฟล์ไม่รองรับ (รองรับ: PDF, รูปภาพ, Word, Excel)'));
  },
});

// รูปสินค้า — memoryStorage + เก็บเป็น base64 data URL ตรงในคอลัมน์ imageUrl
// เหมือน Asset.image ทุกประการ ไม่ใช้ disk storage เพราะรูปสินค้าเล็กและมีทีละรูป
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('รองรับเฉพาะไฟล์รูปภาพ'));
  },
});

const assigneeSelect = {
  select: {
    id: true, assetCode: true, assetName: true, type: true, brand: true, model: true,
    ownerName: true, departmentId: true, status: true,
  },
};

// ── GET /api/catalog — ทุก role ที่ login แล้วดูได้ (USER แค่ดู, IT_ADMIN จัดการ) ──
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { jobRole, q, activeOnly } = req.query;
    const where: any = {};
    if (jobRole) where.jobRole = String(jobRole);
    if (activeOnly === 'true') where.isActive = true;
    if (q) {
      const term = String(q).trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { brand: { contains: term, mode: 'insensitive' } },
        { model: { contains: term, mode: 'insensitive' } },
        { jobRole: { contains: term, mode: 'insensitive' } },
      ];
    }
    const items = await prisma.catalogItem.findMany({
      where,
      include: { _count: { select: { assets: true, documents: true } } },
      orderBy: [{ jobRole: 'asc' }, { name: 'asc' }],
    });
    res.json(items);
  } catch (err) { next(err); }
});

/** ตำแหน่งงานที่มีอยู่แล้วในแคตตาล็อก — ไว้ทำตัวกรองแบบ dropdown แทนพิมพ์เอง */
router.get('/job-roles', authenticate, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await prisma.catalogItem.findMany({
      where: { jobRole: { not: null } },
      select: { jobRole: true },
      distinct: ['jobRole'],
      orderBy: { jobRole: 'asc' },
    });
    res.json(rows.map(r => r.jobRole).filter(Boolean));
  } catch (err) { next(err); }
});

router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const item = await prisma.catalogItem.findUnique({
      where: { id },
      include: {
        documents: { orderBy: { createdAt: 'desc' } },
        _count: { select: { assets: true } },
      },
    });
    if (!item) throw new AppError('ไม่พบรายการในแคตตาล็อก', 404);
    res.json(item);
  } catch (err) { next(err); }
});

/** ทรัพย์สินที่ผูกไว้กับสเปคนี้อยู่ตอนนี้ — "รายชื่อ User ปัจจุบันที่กำลังใช้งาน" */
router.get('/:id/assets', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const assets = await prisma.asset.findMany({
      where: { catalogItemId: id },
      ...assigneeSelect,
      orderBy: { ownerName: 'asc' },
    });
    res.json(assets);
  } catch (err) { next(err); }
});

router.post('/', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, jobRole, brand, model, specs, recommendedPrice, vendorName, isActive } = req.body;
    if (!String(name ?? '').trim()) throw new AppError('ต้องระบุชื่อสเปค', 400);
    const item = await prisma.catalogItem.create({
      data: {
        name: String(name).trim(),
        jobRole: jobRole ? String(jobRole).trim() : null,
        brand: brand ? String(brand).trim() : null,
        model: model ? String(model).trim() : null,
        specs: specs ? String(specs).trim() : null,
        recommendedPrice: recommendedPrice != null && recommendedPrice !== '' ? Number(recommendedPrice) : null,
        vendorName: vendorName ? String(vendorName).trim() : null,
        isActive: isActive !== undefined ? !!isActive : true,
      },
    });
    res.status(201).json(item);
  } catch (err) { next(err); }
});

router.put('/:id', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.catalogItem.findUnique({ where: { id } });
    if (!existing) throw new AppError('ไม่พบรายการในแคตตาล็อก', 404);

    const { name, jobRole, brand, model, specs, recommendedPrice, vendorName, isActive } = req.body;
    const data: any = {};
    if (name !== undefined) {
      if (!String(name).trim()) throw new AppError('ต้องระบุชื่อสเปค', 400);
      data.name = String(name).trim();
    }
    if (jobRole !== undefined) data.jobRole = jobRole ? String(jobRole).trim() : null;
    if (brand !== undefined) data.brand = brand ? String(brand).trim() : null;
    if (model !== undefined) data.model = model ? String(model).trim() : null;
    if (specs !== undefined) data.specs = specs ? String(specs).trim() : null;
    if (recommendedPrice !== undefined) data.recommendedPrice = recommendedPrice != null && recommendedPrice !== '' ? Number(recommendedPrice) : null;
    if (vendorName !== undefined) data.vendorName = vendorName ? String(vendorName).trim() : null;
    if (isActive !== undefined) data.isActive = !!isActive;

    const item = await prisma.catalogItem.update({ where: { id }, data });
    res.json(item);
  } catch (err) { next(err); }
});

// ลบเข้มกว่ารายการอื่นในโมดูลนี้ (SUPERADMIN เท่านั้น) — เหมือน DELETE /assets/:id
// เพราะลบแล้วทรัพย์สินที่เคยผูกไว้จะหลุด (SET NULL) ไม่ใช่แค่แก้ข้อมูลอ้างอิง
router.delete('/:id', authenticate, authorize('SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const docs = await prisma.catalogItemDocument.findMany({ where: { catalogItemId: id } });
    for (const doc of docs) {
      const filePath = path.join(UPLOAD_DIR, doc.storedName);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await prisma.catalogItem.delete({ where: { id } });
    res.json({ message: 'ลบรายการแคตตาล็อกเรียบร้อย' });
  } catch (err) { next(err); }
});

router.post('/:id/image', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), imageUpload.single('image'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const item = await prisma.catalogItem.findUnique({ where: { id } });
    if (!item) throw new AppError('ไม่พบรายการในแคตตาล็อก', 404);
    if (!req.file) throw new AppError('ไม่พบไฟล์รูปภาพ', 400);

    const dataUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const updated = await prisma.catalogItem.update({ where: { id }, data: { imageUrl: dataUrl } });
    res.json({ message: 'อัปโหลดรูปภาพเรียบร้อย', imageUrl: updated.imageUrl });
  } catch (err) { next(err); }
});

router.delete('/:id/image', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const item = await prisma.catalogItem.findUnique({ where: { id } });
    if (!item) throw new AppError('ไม่พบรายการในแคตตาล็อก', 404);
    await prisma.catalogItem.update({ where: { id }, data: { imageUrl: null } });
    res.json({ message: 'ลบรูปภาพเรียบร้อย' });
  } catch (err) { next(err); }
});

router.post('/:id/documents', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), docUpload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const item = await prisma.catalogItem.findUnique({ where: { id } });
    if (!item) throw new AppError('ไม่พบรายการในแคตตาล็อก', 404);
    if (!req.file) throw new AppError('ไม่พบไฟล์', 400);

    const doc = await prisma.catalogItemDocument.create({
      data: {
        catalogItemId: id,
        fileName: req.file.originalname,
        storedName: req.file.filename,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        note: (req.body.note as string) || null,
        uploadedBy: req.user?.userId ? String(req.user.userId) : null,
      },
    });
    res.status(201).json(doc);
  } catch (err) { next(err); }
});

router.get('/:id/documents/:docId/download', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const docId = parseInt(req.params.docId);
    const doc = await prisma.catalogItemDocument.findUnique({ where: { id: docId } });
    if (!doc) throw new AppError('ไม่พบเอกสาร', 404);
    const filePath = path.join(UPLOAD_DIR, doc.storedName);
    if (!fs.existsSync(filePath)) throw new AppError('ไม่พบไฟล์ในระบบ', 404);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.fileName)}"`);
    res.setHeader('Content-Type', doc.mimeType);
    fs.createReadStream(filePath).pipe(res);
  } catch (err) { next(err); }
});

router.delete('/:id/documents/:docId', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const docId = parseInt(req.params.docId);
    const doc = await prisma.catalogItemDocument.findUnique({ where: { id: docId } });
    if (!doc) throw new AppError('ไม่พบเอกสาร', 404);
    const filePath = path.join(UPLOAD_DIR, doc.storedName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await prisma.catalogItemDocument.delete({ where: { id: docId } });
    res.json({ message: 'ลบเอกสารเรียบร้อย' });
  } catch (err) { next(err); }
});

export default router;
