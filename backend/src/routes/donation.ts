import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/assets/retired', async (_req: Request, res: Response) => {
  try {
    const assets = await prisma.asset.findMany({
      where: {
        status: 'Retired',
        donationItem: null,
      },
      orderBy: { assetCode: 'asc' },
    });
    res.json({ data: assets });
  } catch (err: any) {
    console.error('[RETIRED ASSETS ERROR]', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลทรัพย์สินที่พร้อมบริจาค' });
  }
});

router.get('/', async (_req: Request, res: Response) => {
  try {
    const donations = await prisma.donation.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { items: true } } },
    });
    res.json({ data: donations });
  } catch (err: any) {
    console.error('[DONATION LIST ERROR]', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลการบริจาค' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { donationDate, recipientName, recipientAddress, recipientContact, recipientPhone, approvalRef, notes, assetIds, conditions } = req.body;
    const user = (req as any).user;

    if (!donationDate || !recipientName) {
      res.status(400).json({ error: 'กรุณาระบุวันที่และชื่อผู้รับบริจาค' });
      return;
    }

    if (!user || !user.userId) {
      res.status(401).json({ error: 'ไม่พบข้อมูลผู้ใช้งาน' });
      return;
    }

    const count = await prisma.donation.count();
    const batchRef = `DON-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

    const donation = await prisma.donation.create({
      data: {
        batchRef,
        donationDate: new Date(donationDate),
        recipientName,
        recipientAddress,
        recipientContact,
        recipientPhone,
        approvalRef,
        notes,
        createdById: user.userId,
        items: {
          create: (assetIds as number[] || []).map((assetId: number, i: number) => ({
            assetId,
            condition: conditions?.[i] || null,
          })),
        },
      },
      include: {
        items: {
          include: { asset: true },
        },
      },
    });

    res.status(201).json({ data: donation });
  } catch (err: any) {
    console.error('[DONATION CREATE ERROR]', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสร้างข้อมูลการบริจาค' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID ไม่ถูกต้อง' });
      return;
    }
    const donation = await prisma.donation.findUnique({
      where: { id },
      include: {
        createdBy: { select: { displayName: true, adUsername: true } },
        items: {
          include: { asset: true },
        },
      },
    });
    if (!donation) {
      res.status(404).json({ error: 'ไม่พบข้อมูล' });
      return;
    }
    res.json({ data: donation });
  } catch (err: any) {
    console.error('[DONATION DETAIL ERROR]', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID ไม่ถูกต้อง' });
      return;
    }
    const { donationDate, recipientName, recipientAddress, recipientContact, recipientPhone, approvalRef, notes, status } = req.body;

    const donation = await prisma.donation.update({
      where: { id },
      data: {
        ...(donationDate && { donationDate: new Date(donationDate) }),
        ...(recipientName && { recipientName }),
        recipientAddress,
        recipientContact,
        recipientPhone,
        approvalRef,
        notes,
        ...(status && { status }),
      },
    });

    res.json({ data: donation });
  } catch (err: any) {
    console.error('[DONATION UPDATE ERROR]', err);
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'ไม่พบข้อมูลที่ต้องการแก้ไข' });
      return;
    }
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการแก้ไขข้อมูล' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID ไม่ถูกต้อง' });
      return;
    }
    await prisma.donation.delete({ where: { id } });
    res.json({ success: true });
  } catch (err: any) {
    console.error('[DONATION DELETE ERROR]', err);
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'ไม่พบข้อมูลที่ต้องการลบ' });
      return;
    }
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการลบข้อมูล' });
  }
});

export default router;
