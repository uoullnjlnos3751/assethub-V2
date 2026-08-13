import crypto from 'crypto';
import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { createNotification } from '../services/notification';

const router = Router();

const REQUEST_INCLUDE = {
  asset: { select: { id: true, assetCode: true, assetName: true, brand: true, model: true, serialNo: true } },
  requester: { select: { id: true, displayName: true, adUsername: true } },
  installer: { select: { id: true, displayName: true, adUsername: true } },
  deliveredBy: { select: { id: true, displayName: true, adUsername: true } },
  peripherals: true,
} as const;

// ── List / detail ────────────────────────────────────────────────────────
router.get('/requests', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, deliveryType, search } = req.query as Record<string, string | undefined>;
    const where: any = {};
    if (status) where.status = status;
    if (deliveryType) where.deliveryType = deliveryType;
    if (search) {
      where.OR = [
        { recipientName: { contains: search, mode: 'insensitive' } },
        { recipientEmail: { contains: search, mode: 'insensitive' } },
        { asset: { assetCode: { contains: search, mode: 'insensitive' } } },
        { asset: { serialNo: { contains: search, mode: 'insensitive' } } },
      ];
    }
    const requests = await prisma.deliveryRequest.findMany({
      where, include: REQUEST_INCLUDE, orderBy: { createdAt: 'desc' },
    });
    res.json(requests);
  } catch (err) { next(err); }
});

router.get('/requests/summary', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const grouped = await prisma.deliveryRequest.groupBy({ by: ['status'], _count: true });
    const byStatus: Record<string, number> = {};
    grouped.forEach(g => { byStatus[g.status] = g._count; });
    const total = grouped.reduce((sum, g) => sum + g._count, 0);
    res.json({
      total,
      pendingDelivery: byStatus['PENDING_DELIVERY'] || 0,
      delivered: byStatus['DELIVERED'] || 0,
      confirmed: byStatus['CONFIRMED'] || 0,
      draft: byStatus['DRAFT'] || 0,
    });
  } catch (err) { next(err); }
});

router.get('/requests/:id', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const request = await prisma.deliveryRequest.findUnique({ where: { id: Number(req.params.id) }, include: REQUEST_INCLUDE });
    if (!request) throw new AppError('ไม่พบรายการส่งมอบ', 404);
    res.json(request);
  } catch (err) { next(err); }
});

// ── Create / update (tab 1: ทะเบียนเครื่อง + อุปกรณ์ต่อพ่วง) ────────────────
router.post('/requests', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      deliveryType, assetId, recipientName, recipientEmail, recipientDept, recipientCompany,
      source, notes, peripherals,
    } = req.body;

    if (!recipientName?.trim()) throw new AppError('กรุณาระบุชื่อผู้รับเครื่อง', 400);

    const created = await prisma.deliveryRequest.create({
      data: {
        deliveryType: deliveryType || 'NEW_PURCHASE',
        assetId: assetId ? Number(assetId) : undefined,
        recipientName: recipientName.trim(),
        recipientEmail: recipientEmail?.trim() || undefined,
        recipientDept: recipientDept?.trim() || undefined,
        recipientCompany: recipientCompany?.trim() || undefined,
        source: source?.trim() || undefined,
        notes: notes?.trim() || undefined,
        requestedBy: req.user!.userId,
        status: 'SETUP_IN_PROGRESS',
        peripherals: {
          create: (Array.isArray(peripherals) ? peripherals : []).map((p: any) => ({
            category: p.category || '',
            itemName: p.itemName || '',
            serialNo: p.serialNo?.trim() || undefined,
            qty: Number(p.qty) || 1,
            remark: p.remark?.trim() || undefined,
            prepared: Boolean(p.prepared),
          })),
        },
      },
      include: REQUEST_INCLUDE,
    });
    res.status(201).json(created);
  } catch (err) { next(err); }
});

router.put('/requests/:id', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.deliveryRequest.findUnique({ where: { id } });
    if (!existing) throw new AppError('ไม่พบรายการส่งมอบ', 404);
    if (!['DRAFT', 'SETUP_IN_PROGRESS', 'SETUP_DONE'].includes(existing.status)) {
      throw new AppError('รายการนี้ส่งมอบไปแล้ว ไม่สามารถแก้ไขได้', 400);
    }

    const {
      deliveryType, assetId, recipientName, recipientEmail, recipientDept, recipientCompany,
      source, notes, peripherals,
    } = req.body;

    const updated = await prisma.$transaction(async (tx) => {
      if (Array.isArray(peripherals)) {
        await tx.deliveryPeripheralItem.deleteMany({ where: { requestId: id } });
      }
      return tx.deliveryRequest.update({
        where: { id },
        data: {
          deliveryType: deliveryType || undefined,
          assetId: assetId ? Number(assetId) : undefined,
          recipientName: recipientName?.trim() || undefined,
          recipientEmail: recipientEmail?.trim() || undefined,
          recipientDept: recipientDept?.trim() || undefined,
          recipientCompany: recipientCompany?.trim() || undefined,
          source: source?.trim() || undefined,
          notes: notes?.trim() || undefined,
          ...(Array.isArray(peripherals) ? {
            peripherals: {
              create: peripherals.map((p: any) => ({
                category: p.category || '',
                itemName: p.itemName || '',
                serialNo: p.serialNo?.trim() || undefined,
                qty: Number(p.qty) || 1,
                remark: p.remark?.trim() || undefined,
                prepared: Boolean(p.prepared),
                delivered: Boolean(p.delivered),
              })),
            },
          } : {}),
        },
        include: REQUEST_INCLUDE,
      });
    });
    res.json(updated);
  } catch (err) { next(err); }
});

// Manual bridge to PENDING_DELIVERY — until Phase B's setup checklist lands,
// this is how a request becomes ready to hand over. Phase B will replace
// this with an automatic transition once the checklist is completed.
router.patch('/requests/:id/ready', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.deliveryRequest.findUnique({ where: { id } });
    if (!existing) throw new AppError('ไม่พบรายการส่งมอบ', 404);
    if (!['DRAFT', 'SETUP_IN_PROGRESS', 'SETUP_DONE'].includes(existing.status)) {
      throw new AppError('รายการนี้อยู่ในสถานะที่ไม่สามารถทำเครื่องหมายพร้อมส่งมอบได้', 400);
    }
    const updated = await prisma.deliveryRequest.update({
      where: { id },
      data: { status: 'PENDING_DELIVERY' },
      include: REQUEST_INCLUDE,
    });
    res.json(updated);
  } catch (err) { next(err); }
});

router.patch('/requests/:id/peripherals/:itemId', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prepared, delivered } = req.body;
    const item = await prisma.deliveryPeripheralItem.update({
      where: { id: Number(req.params.itemId) },
      data: {
        ...(typeof prepared === 'boolean' ? { prepared } : {}),
        ...(typeof delivered === 'boolean' ? { delivered } : {}),
      },
    });
    res.json(item);
  } catch (err) { next(err); }
});

// ── Deliver + email confirmation link (tab 3) ───────────────────────────
// Replaces the mockup's Power Automate + Microsoft Forms flow with a
// self-contained token link: this route mints the token and queues the
// email; GET/POST /confirm/:token below (no auth) resolve it.
router.post('/requests/:id/deliver', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const request = await prisma.deliveryRequest.findUnique({ where: { id }, include: { asset: true } });
    if (!request) throw new AppError('ไม่พบรายการส่งมอบ', 404);
    if (request.status === 'DELIVERED' || request.status === 'CONFIRMED') {
      throw new AppError('รายการนี้ส่งมอบไปแล้ว', 400);
    }
    if (!request.recipientEmail) throw new AppError('ไม่มีอีเมลผู้รับ กรุณาระบุอีเมลก่อนส่งมอบ', 400);

    const confirmToken = crypto.randomBytes(24).toString('hex');
    const updated = await prisma.deliveryRequest.update({
      where: { id },
      data: {
        status: 'DELIVERED',
        deliveredById: req.user!.userId,
        deliveredAt: new Date(),
        confirmToken,
      },
      include: REQUEST_INCLUDE,
    });

    const assetName = request.asset
      ? `${request.asset.assetName || request.asset.assetCode || ''} ${request.asset.brand || ''} ${request.asset.model || ''}`.trim()
      : 'อุปกรณ์ที่ส่งมอบ';
    const confirmUrl = `${process.env.FRONTEND_URL || ''}/delivery-confirm/${confirmToken}`;
    await createNotification('delivery_confirm_request', 'EMAIL', request.recipientEmail, {
      recipientName: request.recipientName,
      assetName,
      confirmUrl,
    });

    res.json(updated);
  } catch (err) { next(err); }
});

// ── Public confirmation (tab 3 recipient-facing link — no login) ────────
router.get('/confirm/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const request = await prisma.deliveryRequest.findUnique({
      where: { confirmToken: req.params.token },
      include: { asset: { select: { assetName: true, assetCode: true, brand: true, model: true } }, peripherals: true },
    });
    if (!request) throw new AppError('ลิงก์ยืนยันไม่ถูกต้องหรือหมดอายุ', 404);
    res.json({
      recipientName: request.recipientName,
      asset: request.asset,
      peripherals: request.peripherals,
      status: request.status,
      confirmedAt: request.confirmedAt,
    });
  } catch (err) { next(err); }
});

router.post('/confirm/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const request = await prisma.deliveryRequest.findUnique({ where: { confirmToken: req.params.token } });
    if (!request) throw new AppError('ลิงก์ยืนยันไม่ถูกต้องหรือหมดอายุ', 404);
    if (request.status === 'CONFIRMED') {
      return res.json({ message: 'ยืนยันไปแล้ว', confirmedAt: request.confirmedAt });
    }
    const updated = await prisma.deliveryRequest.update({
      where: { id: request.id },
      data: { status: 'CONFIRMED', confirmedAt: new Date(), confirmMethod: 'email_link' },
    });
    res.json({ message: 'ยืนยันรับเครื่องเรียบร้อย', confirmedAt: updated.confirmedAt });
  } catch (err) { next(err); }
});

// ── Setup Checklist (Phase B) ───────────────────────────────────────────────
const CHECKLIST_RUN_INCLUDE = {
  checklistSet: {
    include: { items: { orderBy: { sortOrder: 'asc' as const } } },
  },
  performer: { select: { id: true, displayName: true, adUsername: true } },
  answers: true,
} as const;

// Fetch the in-progress run for a request, auto-creating a DRAFT run
// against IT-WI-001 (the only checklist set with real items today) on
// first access — mirrors pm.ts's plan->template->items->run shape.
router.get('/requests/:id/checklist-run', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requestId = Number(req.params.id);
    const request = await prisma.deliveryRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new AppError('ไม่พบรายการส่งมอบ', 404);

    let run = await prisma.deliveryChecklistRun.findFirst({
      where: { requestId },
      orderBy: { id: 'desc' },
      include: CHECKLIST_RUN_INCLUDE,
    });

    if (!run) {
      const defaultSet = await prisma.checklistSet.findUnique({ where: { docCode: 'IT-WI-001' } });
      if (!defaultSet) throw new AppError('ยังไม่มีชุด Checklist ในระบบ', 404);
      run = await prisma.deliveryChecklistRun.create({
        data: { requestId, checklistSetId: defaultSet.id, status: 'DRAFT' },
        include: CHECKLIST_RUN_INCLUDE,
      });
    }

    res.json(run);
  } catch (err) { next(err); }
});

// Save answers (delete-all-then-recreate, matching pm.ts's POST /runs/:id/perform
// pattern) and, when status:'DONE' is requested, auto-transition the parent
// DeliveryRequest — this is the automatic handoff the PATCH /:id/ready
// comment above calls out as Phase B's replacement for the manual bridge.
router.post('/requests/:id/checklist-run/perform', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requestId = Number(req.params.id);
    const { answers, status } = req.body as { answers: { itemId: number; value: string; note?: string }[]; status?: 'DRAFT' | 'DONE' };

    const run = await prisma.deliveryChecklistRun.findFirst({ where: { requestId }, orderBy: { id: 'desc' } });
    if (!run) throw new AppError('ไม่พบ Checklist run', 404);

    const validItemIds = new Set(
      (await prisma.checklistItem.findMany({ where: { setId: run.checklistSetId }, select: { id: true } })).map((i) => i.id)
    );
    const cleanAnswers = (answers || []).filter((a) => validItemIds.has(a.itemId));

    const updated = await prisma.$transaction(async (tx) => {
      await tx.deliveryChecklistAnswer.deleteMany({ where: { runId: run.id } });
      if (cleanAnswers.length > 0) {
        await tx.deliveryChecklistAnswer.createMany({
          data: cleanAnswers.map((a) => ({ runId: run.id, itemId: a.itemId, value: a.value, note: a.note || null })),
        });
      }

      const isDone = status === 'DONE';
      const savedRun = await tx.deliveryChecklistRun.update({
        where: { id: run.id },
        data: {
          status: isDone ? 'DONE' : 'DRAFT',
          performedBy: req.user!.userId,
          performedAt: new Date(),
          completedAt: isDone ? new Date() : null,
        },
        include: CHECKLIST_RUN_INCLUDE,
      });

      if (isDone) {
        const deliveryRequest = await tx.deliveryRequest.findUnique({ where: { id: requestId } });
        if (deliveryRequest && ['DRAFT', 'SETUP_IN_PROGRESS'].includes(deliveryRequest.status)) {
          await tx.deliveryRequest.update({
            where: { id: requestId },
            data: { status: 'SETUP_DONE', installerId: req.user!.userId, installedAt: new Date() },
          });
        }
      }

      return savedRun;
    });

    res.json(updated);
  } catch (err) { next(err); }
});

export default router;
