import express from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';

const router = express.Router();

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'floorplans');
// Ensure directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('ประเภทไฟล์ไม่รองรับ (รองรับเฉพาะไฟล์รูปภาพ)'));
  },
});

router.use(authenticate);

// Get all floor plans
router.get('/', async (req, res) => {
  try {
    const plans = await prisma.floorPlan.findMany({
      where: { isActive: true },
      orderBy: { floor: 'asc' },
      include: {
        _count: { select: { pins: true } }
      }
    });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch floor plans' });
  }
});

// Get floor plan by ID (with pins and asset basic info)
router.get('/:id', async (req, res) => {
  try {
    const plan = await prisma.floorPlan.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        pins: {
          include: {
            asset: {
              select: {
                id: true,
                assetCode: true,
                assetName: true,
                type: true,
                ownerName: true,
                departmentId: true,
              }
            }
          }
        }
      }
    });
    if (!plan) return res.status(404).json({ error: 'Floor plan not found' });
    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch floor plan' });
  }
});

// Create new floor plan
router.post('/', authorize('IT_ADMIN', 'SUPERADMIN'), upload.single('image'), async (req, res) => {
  try {
    const { name, floor, building, company } = req.body;
    if (!req.file) return res.status(400).json({ error: 'Image is required' });

    const imageUrl = `/uploads/floorplans/${req.file.filename}`;

    const plan = await prisma.floorPlan.create({
      data: {
        name,
        floor,
        building: building || null,
        company: company || null,
        imageUrl,
      }
    });
    res.status(201).json(plan);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create floor plan' });
  }
});

// Update floor plan
router.put('/:id', authorize('IT_ADMIN', 'SUPERADMIN'), upload.single('image'), async (req, res) => {
  try {
    const { name, floor, building, company, isActive } = req.body;
    const updateData: any = {};
    
    if (name !== undefined) updateData.name = name;
    if (floor !== undefined) updateData.floor = floor;
    if (building !== undefined) updateData.building = building;
    if (company !== undefined) updateData.company = company;
    if (isActive !== undefined) updateData.isActive = isActive === 'true' || isActive === true;

    if (req.file) {
      updateData.imageUrl = `/uploads/floorplans/${req.file.filename}`;
    }

    const plan = await prisma.floorPlan.update({
      where: { id: Number(req.params.id) },
      data: updateData
    });
    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update floor plan' });
  }
});

// Delete floor plan
router.delete('/:id', authorize('IT_ADMIN', 'SUPERADMIN'), async (req, res) => {
  try {
    await prisma.floorPlan.delete({
      where: { id: Number(req.params.id) }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete floor plan' });
  }
});

// Upsert pins for a floor plan
router.put('/:id/pins', authorize('IT_ADMIN', 'SUPERADMIN'), async (req, res) => {
  try {
    const planId = Number(req.params.id);
    const { pins } = req.body; // Array of { assetId, x, y, label }

    await prisma.$transaction(async (tx) => {
      // 1. Delete all existing pins
      await tx.floorPlanPin.deleteMany({
        where: { floorPlanId: planId }
      });

      // 2. Insert new pins
      if (pins && pins.length > 0) {
        await tx.floorPlanPin.createMany({
          data: pins.map((p: any) => ({
            floorPlanId: planId,
            assetId: p.assetId,
            x: p.x,
            y: p.y,
            label: p.label || null
          }))
        });
      }
    });

    const updatedPlan = await prisma.floorPlan.findUnique({
      where: { id: planId },
      include: {
        pins: {
          include: {
            asset: {
              select: {
                id: true,
                assetCode: true,
                assetName: true,
                type: true,
                ownerName: true,
                departmentId: true,
              }
            }
          }
        }
      }
    });

    res.json(updatedPlan);
  } catch (error) {
    console.error('Update pins error:', error);
    res.status(500).json({ error: 'Failed to update pins' });
  }
});

export default router;
