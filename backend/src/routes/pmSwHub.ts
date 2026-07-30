import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

router.use(authenticate);
router.use(authorize('IT_ADMIN', 'SUPERADMIN'));

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'pmswhub');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req: any, _file: any, cb: any) => cb(null, UPLOAD_DIR),
    filename: (_req: any, file: any, cb: any) => {
      const ext = path.extname(file.originalname);
      cb(null, `pmswhub-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    }
  })
});

// Get all PM SW Hub records
router.get('/', async (req, res) => {
  try {
    const records = await prisma.pMSwHub.findMany({
      include: {
        items: true
      },
      orderBy: {
        date: 'desc'
      }
    });
    res.json(records);
  } catch (error) {
    console.error('Error fetching PM SW Hub records:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Create a new PM SW Hub record
router.post('/', async (req, res) => {
  try {
    const { planId, formId, floor, date, technician, period, remark, signTech, signMgr, status, items, photoBeforeUrl, photoAfterUrl } = req.body;

    let finalPlanId = planId ? Number(planId) : null;
    
    // Auto-link to a pending plan if not explicitly provided
    if (!finalPlanId && floor && period) {
      const activePlan = await prisma.pMSwHubPlan.findFirst({
        where: { floor, period, status: 'Pending' },
        orderBy: { startDate: 'asc' }
      });
      if (activePlan) {
        finalPlanId = activePlan.id;
      }
    }

    const newRecord = await prisma.pMSwHub.create({
      data: {
        planId: finalPlanId,
        formId,
        floor,
        date: new Date(date),
        technician,
        period,
        remark,
        signTech,
        signMgr,
        status,
        photoBeforeUrl,
        photoAfterUrl,
        items: {
          create: items.map((item: any) => ({
            category: item.category,
            checkItem: item.checkItem,
            status: item.status,
            note: item.note,
            photoUrl: item.photoUrl,
            resolveStatus: item.resolveStatus
          }))
        }
      },
      include: {
        items: true
      }
    });

    if (finalPlanId) {
      await prisma.pMSwHubPlan.update({
        where: { id: finalPlanId },
        data: { status: 'Completed' }
      });
    }

    res.status(201).json(newRecord);
  } catch (error) {
    console.error('Error creating PM SW Hub record:', error);
    res.status(500).json({ error: 'Failed to create record' });
  }
});

// Update resolve status of an item
router.patch('/item/:id/resolve', async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    const { resolveStatus } = req.body;

    const updatedItem = await prisma.pMSwHubItem.update({
      where: { id: itemId },
      data: { 
        resolveStatus,
        resolvedAt: resolveStatus === 'resolved' ? new Date() : null
      }
    });

    res.json(updatedItem);
  } catch (error) {
    console.error('Error updating resolve status:', error);
    res.status(500).json({ error: 'Failed to update resolve status' });
  }
});

// Get PM SW Hub record by planId
router.get('/by-plan/:planId', async (req, res) => {
  try {
    const planId = parseInt(req.params.planId);
    const record = await prisma.pMSwHub.findFirst({
      where: { planId },
      include: {
        items: true,
        plan: {
          include: {
            template: {
              include: {
                items: true
              }
            }
          }
        }
      },
      orderBy: { date: 'desc' }
    });
    if (!record) {
      return res.json(null);
    }
    res.json(record);
  } catch (error) {
    console.error('Error fetching record by planId:', error);
    res.status(500).json({ error: 'Failed to fetch record' });
  }
});

// Get PM SW Hub record by ID
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const record = await prisma.pMSwHub.findUnique({
      where: { id },
      include: {
        items: true,
        plan: {
          include: {
            template: {
              include: {
                items: true
              }
            }
          }
        }
      }
    });
    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }
    res.json(record);
  } catch (error) {
    console.error('Error fetching PM SW Hub record:', error);
    res.status(500).json({ error: 'Failed to fetch record' });
  }
});

// Update a PM SW Hub record
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { floor, date, technician, period, remark, status, items, photoBeforeUrl, photoAfterUrl } = req.body;

    // Delete existing items
    await prisma.pMSwHubItem.deleteMany({
      where: { pmSwHubId: id }
    });

    // Update main record and recreate items
    const updatedRecord = await prisma.pMSwHub.update({
      where: { id },
      data: {
        floor,
        date: new Date(date),
        technician,
        period,
        remark,
        status,
        photoBeforeUrl,
        photoAfterUrl,
        items: {
          create: items.map((item: any) => ({
            category: item.category,
            checkItem: item.checkItem,
            status: item.status,
            note: item.note,
            photoUrl: item.photoUrl,
            resolveStatus: item.resolveStatus
          }))
        }
      },
      include: { items: true }
    });

    res.json(updatedRecord);
  } catch (error) {
    console.error('Error updating PM SW Hub record:', error);
    res.status(500).json({ error: 'Failed to update record' });
  }
});

// Upload Image
router.post('/:id/images', upload.single('image'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { type } = req.body; // 'BEFORE' or 'AFTER'
    
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const imageUrl = `/uploads/pmswhub/${req.file.filename}`;

    const updateData: any = {};
    if (type === 'BEFORE') updateData.photoBeforeUrl = imageUrl;
    if (type === 'AFTER') updateData.photoAfterUrl = imageUrl;

    const updatedRecord = await prisma.pMSwHub.update({
      where: { id },
      data: updateData
    });

    res.json(updatedRecord);
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Generic Temp Upload
router.post('/upload-temp', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    const imageUrl = `/uploads/pmswhub/${req.file.filename}`;
    res.json({ imageUrl });
  } catch (error) {
    console.error('Error uploading temp image:', error);
    res.status(500).json({ error: 'Failed to upload temp image' });
  }
});

export default router;
