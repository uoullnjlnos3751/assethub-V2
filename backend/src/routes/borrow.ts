import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { createNotification } from '../services/notification';

const router = Router();

// ── User: Create borrow request (multi-item) ──
router.post('/requests', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { assetIds, purpose } = req.body;
    if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
      throw new AppError('กรุณาเลือกทรัพย์สินอย่างน้อย 1 รายการ');
    }

    const assets = await prisma.asset.findMany({
      where: { id: { in: assetIds }, status: 'Available' },
    });
    if (assets.length !== assetIds.length) {
      throw new AppError('ทรัพย์สินบางรายการไม่พร้อมให้ยืม');
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + parseInt(process.env.BORROW_DUE_DAYS || '3'));

    const user = await prisma.appUser.findUnique({ where: { id: req.user!.userId } });

    const request = await prisma.borrowRequest.create({
      data: {
        requestNo: `BR-${Date.now()}`,
        requesterUserId: req.user!.userId,
        departmentId: user?.department || '',
        purpose,
        status: 'Pending',
        items: {
          create: assets.map(a => ({
            assetId: a.id,
            borrowDate: new Date(),
            dueDate,
            itemStatus: 'Pending',
          })),
        },
      },
      include: { items: { include: { asset: true } } },
    });

    // Notify IT Admins
    const admins = await prisma.appUser.findMany({ where: { role: { in: ['IT_ADMIN', 'SUPERADMIN'] } } });
    for (const admin of admins) {
      if (admin.email) {
        await createNotification('borrow_request_pending', 'EMAIL', admin.email, {
          requestNo: request.requestNo,
          requester: user?.displayName || req.user!.adUsername,
          purpose,
        });
      }
    }

    res.status(201).json(request);
  } catch (err) { next(err); }
});

// ── User: My requests ──
router.get('/requests', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    const where: any = { requesterUserId: req.user!.userId };
    if (status) where.status = status as string;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const [data, total] = await Promise.all([
      prisma.borrowRequest.findMany({
        where,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: { items: { include: { asset: true } }, approvals: { orderBy: { actedAt: 'desc' } } },
      }),
      prisma.borrowRequest.count({ where }),
    ]);
    res.json({ data, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) { next(err); }
});

// ── User: My borrowed items ──
router.get('/my-items', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await prisma.borrowRequestItem.findMany({
      where: {
        request: { requesterUserId: req.user!.userId },
        itemStatus: { in: ['CheckedOut', 'PartiallyReturned'] },
      },
      include: { asset: true, request: true },
      orderBy: { dueDate: 'asc' },
    });
    res.json(items);
  } catch (err) { next(err); }
});

// ── User: My history ──
router.get('/my-history', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await prisma.borrowRequestItem.findMany({
      where: { request: { requesterUserId: req.user!.userId }, itemStatus: 'Returned' },
      include: { asset: true, request: true, returns: true },
      orderBy: { request: { createdAt: 'desc' } },
      take: 100,
    });
    res.json(items);
  } catch (err) { next(err); }
});

// ── IT Admin: Get all requests (approval queue) ──
router.get('/all-requests', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    const where: any = {};
    if (status) where.status = status as string;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const [data, total] = await Promise.all([
      prisma.borrowRequest.findMany({
        where,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: { items: { include: { asset: true } }, approvals: true, requester: { select: { id: true, displayName: true, adUsername: true, department: true } } },
      }),
      prisma.borrowRequest.count({ where }),
    ]);
    res.json({ data, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) { next(err); }
});

// ── IT Admin: Approve / Reject ──
router.post('/requests/:id/approve', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const { action, note } = req.body; // action = Approved | Rejected
    if (!['Approved', 'Rejected'].includes(action)) throw new AppError('การกระทำไม่ถูกต้อง');

    const request = await prisma.borrowRequest.findUnique({
      where: { id },
      include: { items: { include: { asset: true } }, requester: true },
    });
    if (!request) throw new AppError('ไม่พบคำขอ', 404);
    if (request.status !== 'Pending') throw new AppError('คำขอนี้ได้รับการดำเนินการแล้ว');

    // Check assets still available for approval
    if (action === 'Approved') {
      const unavailable = request.items.filter(i => i.asset.status !== 'Available');
      if (unavailable.length > 0) {
        throw new AppError(`ทรัพย์สินบางรายการไม่พร้อมให้ยืมแล้ว: ${unavailable.map(i => i.asset.assetCode).join(', ')}`);
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.borrowApproval.create({
        data: { requestId: id, approverUserId: req.user!.userId, action, note },
      });

      await tx.borrowRequest.update({
        where: { id },
        data: { status: action as any },
      });

      if (action === 'Approved') {
        await tx.borrowRequestItem.updateMany({
          where: { requestId: id },
          data: { itemStatus: 'Approved' },
        });
      } else {
        await tx.borrowRequestItem.updateMany({
          where: { requestId: id },
          data: { itemStatus: 'Rejected' },
        });
      }
    });

    if (request.requester.email) {
      await createNotification(
        action === 'Approved' ? 'borrow_approved' : 'borrow_rejected',
        'EMAIL',
        request.requester.email,
        { requestNo: request.requestNo, note }
      );
    }

    const updated = await prisma.borrowRequest.findUnique({
      where: { id },
      include: { items: { include: { asset: true } }, approvals: true, requester: true },
    });
    res.json(updated);
  } catch (err) { next(err); }
});

// ── IT Admin: Check-out ──
router.post('/requests/:id/checkout', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const { receivedBy, handoverNote } = req.body;

    const request = await prisma.borrowRequest.findUnique({
      where: { id },
      include: { 
        items: { include: { asset: true } },
        requester: true
      },
    });
    if (!request) throw new AppError('ไม่พบคำขอ', 404);
    if (request.status !== 'Approved') throw new AppError('คำขอยังไม่ได้รับการอนุมัติ');

    await prisma.$transaction(async (tx) => {
      await tx.checkout.create({
        data: { requestId: id, checkoutBy: req.user!.userId, receivedBy, handoverNote },
      });

      await tx.borrowRequest.update({
        where: { id },
        data: { status: 'CheckedOut' },
      });

      for (const item of request.items) {
        await tx.borrowRequestItem.update({
          where: { id: item.id },
          data: { itemStatus: 'CheckedOut', borrowDate: new Date() },
        });
        await tx.asset.update({
          where: { id: item.assetId },
          data: { status: 'Borrowed' },
        });
        await tx.assetHistory.create({
          data: {
            assetId: item.assetId,
            actionType: 'CHECKOUT',
            fromStatus: 'Available',
            toStatus: 'Borrowed',
            actorUserId: req.user!.userId,
            ownerUserId: request.requesterUserId,
            note: `Check-out to request ${request.requestNo}`,
          },
        });
      }
    });

    if (request.requester?.email) {
      await createNotification('checkout_completed', 'EMAIL', request.requester.email, {
        requestNo: request.requestNo,
        handoverNote,
      });
    }

    res.json({ message: 'Check-out สำเร็จ' });
  } catch (err) { next(err); }
});

// ── IT Admin: Return item ──
router.post('/items/:itemId/return', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const itemId = parseInt(req.params.itemId);
    const { condition, damageNote, accessoriesNote } = req.body;
    if (!condition) throw new AppError('กรุณาเลือกสภาพเครื่อง');

    const item = await prisma.borrowRequestItem.findUnique({
      where: { id: itemId },
      include: { request: { include: { requester: true } } },
    });
    if (!item) throw new AppError('ไม่พบรายการยืม', 404);
    if (!['CheckedOut', 'PartiallyReturned'].includes(item.itemStatus)) {
      throw new AppError('รายการนี้ไม่สามารถคืนได้');
    }

    await prisma.$transaction(async (tx) => {
      await tx.return.create({
        data: {
          requestItemId: itemId,
          returnBy: req.user!.userId,
          condition,
          damageNote: damageNote || null,
          accessoriesNote: accessoriesNote || null,
        },
      });

      await tx.borrowRequestItem.update({
        where: { id: itemId },
        data: { itemStatus: 'Returned' },
      });

      await tx.asset.update({
        where: { id: item.assetId },
        data: { status: 'Available' },
      });

      await tx.assetHistory.create({
        data: {
          assetId: item.assetId,
          actionType: 'RETURN',
          fromStatus: 'Borrowed',
          toStatus: 'Available',
          actorUserId: req.user!.userId,
          note: `Return - ${condition}${damageNote ? ': ' + damageNote : ''}`,
        },
      });

      // Update request status
      const remaining = await tx.borrowRequestItem.count({
        where: { requestId: item.requestId, itemStatus: { not: 'Returned' } },
      });
      if (remaining === 0) {
        await tx.borrowRequest.update({
          where: { id: item.requestId },
          data: { status: 'Returned' },
        });
      } else {
        await tx.borrowRequest.update({
          where: { id: item.requestId },
          data: { status: 'PartiallyReturned' },
        });
      }
    });

    if (item.request.requester?.email) {
      await createNotification('return_recorded', 'EMAIL', item.request.requester.email, {
        requestNo: item.request.requestNo,
        condition,
      });
    }

    res.json({ message: 'คืนทรัพย์สินเรียบร้อย' });
  } catch (err) { next(err); }
});

// ── Extension: Request extension ──
router.post('/extensions', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { requestId, itemIds, extraDays, reason } = req.body;
    if (!requestId || !itemIds || !extraDays) throw new AppError('ข้อมูลไม่ครบถ้วน');

    const borrowRequest = await prisma.borrowRequest.findUnique({
      where: { id: requestId },
      include: { items: true },
    });
    if (!borrowRequest) throw new AppError('ไม่พบคำขอยืม', 404);
    if (borrowRequest.requesterUserId !== req.user!.userId && !['IT_ADMIN', 'SUPERADMIN'].includes(req.user!.role)) {
      throw new AppError('ไม่มีสิทธิ์ขยายวันยืมนี้');
    }
    if (!['CheckedOut', 'PartiallyReturned'].includes(borrowRequest.status)) {
      throw new AppError('ไม่สามารถขยายวันได้ในสถานะนี้');
    }

    const extension = await prisma.borrowExtension.create({
      data: {
        requestId,
        requestedBy: req.user!.userId,
        reason,
        status: 'Pending',
        items: {
          create: itemIds.map((itemId: number) => {
            const item = borrowRequest.items.find(i => i.id === itemId);
            if (!item) throw new AppError('ไม่พบรายการยืม');
            return {
              requestItemId: itemId,
              oldDueDate: item.dueDate!,
              requestedDueDate: new Date(item.dueDate!.getTime() + extraDays * 86400000),
              extraDays,
            };
          }),
        },
      },
      include: { items: true },
    });

    // Notify IT admins
    const admins = await prisma.appUser.findMany({ where: { role: { in: ['IT_ADMIN', 'SUPERADMIN'] } } });
    for (const admin of admins) {
      if (admin.email) {
        await createNotification('extension_pending', 'EMAIL', admin.email, {
          requestNo: borrowRequest.requestNo,
          extraDays,
          reason,
        });
      }
    }

    res.status(201).json(extension);
  } catch (err) { next(err); }
});

// ── Extension: Approve/Reject ──
router.put('/extensions/:id', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const { action, note } = req.body; // Approved | Rejected
    if (!['Approved', 'Rejected'].includes(action)) throw new AppError('การกระทำไม่ถูกต้อง');

    const extension = await prisma.borrowExtension.findUnique({
      where: { id },
      include: { items: true, request: { include: { requester: true } } },
    });
    if (!extension) throw new AppError('ไม่พบคำขอขยายวัน', 404);
    if (extension.status !== 'Pending') throw new AppError('คำขอนี้ได้รับการดำเนินการแล้ว');

    await prisma.$transaction(async (tx) => {
      await tx.borrowExtension.update({
        where: { id },
        data: { status: action, decidedBy: req.user!.userId, decidedAt: new Date(), decisionNote: note },
      });

      if (action === 'Approved') {
        for (const item of extension.items) {
          await tx.borrowRequestItem.update({
            where: { id: item.requestItemId },
            data: { dueDate: item.requestedDueDate },
          });
        }
      }
    });

    if (extension.request.requester.email) {
      await createNotification(
        action === 'Approved' ? 'extension_approved' : 'extension_rejected',
        'EMAIL',
        extension.request.requester.email,
        { requestNo: extension.request.requestNo, note }
      );
    }

    res.json({ message: `Extension ${action}` });
  } catch (err) { next(err); }
});

// ── Extension: List ──
router.get('/extensions', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const extensions = await prisma.borrowExtension.findMany({
      where: { status: 'Pending' },
      include: { request: { include: { requester: true } }, items: { include: { requestItem: { include: { asset: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(extensions);
  } catch (err) { next(err); }
});

// ── Borrow History (IT Admin) ──
router.get('/history', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const [data, total] = await Promise.all([
      prisma.borrowRequest.findMany({
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { updatedAt: 'desc' },
        include: { items: { include: { asset: true } }, requester: true, approvals: true },
      }),
      prisma.borrowRequest.count(),
    ]);
    res.json({ data, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) { next(err); }
});

export default router;
