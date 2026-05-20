import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { createNotification } from '../services/notification';
import { validate, borrowRequestSchema, approveSchema, checkoutSchema, returnSchema, extensionSchema } from '../middleware/validation';

const router = Router();

async function getBorrowDays(): Promise<number> {
  const settings = await prisma.notificationSetting.findFirst();
  return settings?.borrowDays ?? parseInt(process.env.BORROW_DUE_DAYS || '3');
}

async function getMaxItems(): Promise<number> {
  const settings = await prisma.notificationSetting.findFirst();
  return settings?.maxItemsPerRequest ?? 5;
}

async function getAllowExtension(): Promise<boolean> {
  const settings = await prisma.notificationSetting.findFirst();
  return settings?.allowExtension ?? true;
}

// ── User: Create borrow request (multi-item) ──
router.post('/requests', authenticate, validate(borrowRequestSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { assetIds, inventoryItems, purpose, notes, location } = req.body;

    const maxItems = await getMaxItems();
    const totalItems = (assetIds?.length || 0) + (inventoryItems?.length || 0);
    if (totalItems > maxItems) {
      throw new AppError(`จำนวนรายการเกินกำหนด (สูงสุด ${maxItems} รายการ)`);
    }

    // Validate asset availability
    const assets: any[] = [];
    if (assetIds?.length > 0) {
      const found = await prisma.asset.findMany({
        where: { id: { in: assetIds }, status: 'Available' },
      });
      if (found.length !== assetIds.length) {
        throw new AppError('ทรัพย์สินบางรายการไม่พร้อมให้ยืม');
      }
      assets.push(...found);
    }

    // Validate inventory items
    const inventoryItemRecords: any[] = [];
    if (inventoryItems?.length > 0) {
      const invIds = inventoryItems.map((i: any) => i.inventoryItemId);
      const found = await prisma.inventoryItem.findMany({
        where: { id: { in: invIds }, isActive: true },
      });
      if (found.length !== invIds.length) {
        throw new AppError('ไม่พบวัสดุสิ้นเปลืองบางรายการ');
      }
      for (const inv of inventoryItems) {
        const item = found.find((f: any) => f.id === inv.inventoryItemId);
        if (!item || item.availableQuantity < inv.quantity) {
          throw new AppError(`วัสดุ "${item?.name || inv.inventoryItemId}" คงเหลือไม่พอ`);
        }
      }
      inventoryItemRecords.push(...found);
    }

    if (totalItems === 0) {
      throw new AppError('กรุณาเลือกทรัพย์สินหรือวัสดุอย่างน้อย 1 รายการ');
    }

    const borrowDays = await getBorrowDays();
    const borrowDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + borrowDays);

    const user = await prisma.appUser.findUnique({ where: { id: req.user!.userId } });

    const request = await prisma.borrowRequest.create({
      data: {
        requestNo: `BR-${Date.now()}`,
        requesterUserId: req.user!.userId,
        departmentId: user?.department || '',
        purpose,
        note: notes || null,
        status: 'Pending',
        items: {
          create: [
            ...assets.map((a: any) => ({
              assetId: a.id,
              isQuantityBased: false,
              quantity: 1,
              borrowDate,
              dueDate,
              itemStatus: 'Pending',
            })),
            ...inventoryItems.map((inv: any) => ({
              inventoryItemId: inv.inventoryItemId,
              isQuantityBased: true,
              quantity: inv.quantity,
              borrowDate,
              dueDate,
              itemStatus: 'Pending',
            })),
          ],
        },
      },
      include: { items: { include: { asset: true, inventoryItem: true } } },
    });

    const itemsPayload = request.items.map(item => {
      if (item.inventoryItem) {
        return {
          name: item.inventoryItem.name,
          quantity: item.quantity,
          unit: item.inventoryItem.unit,
          status: 'รอการอนุมัติ',
        };
      }
      return {
        assetCode: item.asset!.assetCode,
        serialNo: item.asset!.serialNo,
        brand: item.asset!.brand,
        model: item.asset!.model,
        status: 'รอการอนุมัติ',
      };
    });

    const borrowDateStr = borrowDate.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
    const dueDateStr = dueDate.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });

    // Notify IT Admins
    const admins = await prisma.appUser.findMany({ where: { role: { in: ['IT_ADMIN', 'SUPERADMIN'] } } });
    for (const admin of admins) {
      if (admin.email) {
        await createNotification('borrow_request_pending', 'EMAIL', admin.email, {
          requestNo: request.requestNo,
          requester: user?.displayName || req.user!.adUsername,
          department: user?.department || '-',
          email: user?.email || '-',
          purpose: purpose || '-',
          location: location || '-',
          notes: notes || '-',
          borrowDate: borrowDateStr,
          dueDate: dueDateStr,
          borrowDays: String(borrowDays),
          itemsCount: String(request.items.length),
          itemsTable: '',
          items: itemsPayload,
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
        include: { items: { include: { asset: true, inventoryItem: true } }, approvals: { orderBy: { actedAt: 'desc' } } },
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
      include: { asset: true, inventoryItem: true, request: true },
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
      include: { asset: true, inventoryItem: true, request: true, returns: true },
      orderBy: { request: { createdAt: 'desc' } },
      take: 100,
    });
    res.json(items);
  } catch (err) { next(err); }
});

// ── User: My extension requests ──
router.get('/my-extensions', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const extensions = await prisma.borrowExtension.findMany({
      where: { requestedBy: req.user!.userId },
      include: {
        request: true,
        items: { include: { requestItem: { include: { asset: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(extensions);
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
        include: { items: { include: { asset: true, inventoryItem: true, returns: true } }, approvals: true, requester: { select: { id: true, displayName: true, adUsername: true, department: true } } },
      }),
      prisma.borrowRequest.count({ where }),
    ]);
    res.json({ data, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) { next(err); }
});

// ── IT Admin: Approve / Reject ──
router.post('/requests/:id/approve', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), validate(approveSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const { action, note } = req.body;

    const request = await prisma.borrowRequest.findUnique({
      where: { id },
      include: { items: { include: { asset: true, inventoryItem: true } }, requester: true },
    });
    if (!request) throw new AppError('ไม่พบคำขอ', 404);
    if (request.status !== 'Pending') throw new AppError('คำขอนี้ได้รับการดำเนินการแล้ว');

    // Check assets still available for approval
    if (action === 'Approved') {
      const serializedItems = request.items.filter(i => !i.isQuantityBased && i.asset);
      const unavailable = serializedItems.filter(i => i.asset!.status !== 'Available');
      if (unavailable.length > 0) {
        throw new AppError(`ทรัพย์สินบางรายการไม่พร้อมให้ยืมแล้ว: ${unavailable.map(i => i.asset!.assetCode).join(', ')}`);
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
      const itemsPayload = request.items.map(item => ({
        assetCode: item.asset!.assetCode,
        serialNo: item.asset!.serialNo,
        brand: item.asset!.brand,
        model: item.asset!.model,
        status: action === 'Approved' ? 'อนุมัติ' : 'ไม่อนุมัติ',
      }));

      const borrowDateStr = request.items[0]?.borrowDate
        ? new Date(request.items[0].borrowDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
        : '-';
      const dueDateStr = request.items[0]?.dueDate
        ? new Date(request.items[0].dueDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
        : '-';

      await createNotification(
        action === 'Approved' ? 'borrow_approved' : 'borrow_rejected',
        'EMAIL',
        request.requester.email,
        {
          requestNo: request.requestNo,
          requester: request.requester.displayName || request.requester.adUsername,
          department: request.requester.department || '-',
          purpose: request.purpose || '-',
          location: '-',
          notes: request.note || '-',
          borrowDate: borrowDateStr,
          dueDate: dueDateStr,
          note: note || (action === 'Rejected' ? 'ไม่ระบุเหตุผล' : ''),
          itemsCount: String(request.items.length),
          items: itemsPayload,
        }
      );
    }

    const updated = await prisma.borrowRequest.findUnique({
      where: { id },
      include: { items: { include: { asset: true, inventoryItem: true } }, approvals: true, requester: true },
    });
    res.json(updated);
  } catch (err) { next(err); }
});

// ── IT Admin: Check-out ──
router.post('/requests/:id/checkout', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), validate(checkoutSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const { receivedBy, handoverNote } = req.body;

    const request = await prisma.borrowRequest.findUnique({
      where: { id },
      include: { 
        items: { include: { asset: true, inventoryItem: true } },
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

        if (item.isQuantityBased && item.inventoryItem) {
          // Inventory item: decrement stock
          await tx.inventoryItem.update({
            where: { id: item.inventoryItemId! },
            data: { availableQuantity: { decrement: item.quantity } },
          });
        } else if (item.asset) {
          // Serialized asset: update status
          await tx.asset.update({
            where: { id: item.assetId! },
            data: { status: 'Borrowed' },
          });
          await tx.assetHistory.create({
            data: {
              assetId: item.assetId!,
              actionType: 'CHECKOUT',
              fromStatus: 'Available',
              toStatus: 'Borrowed',
              actorUserId: req.user!.userId,
              ownerUserId: request.requesterUserId,
              note: `Check-out to request ${request.requestNo}`,
            },
          });
        }
      }
    });

    if (request.requester?.email) {
      const itemsPayload = request.items.map(item => {
        if (item.inventoryItem) {
          return { name: item.inventoryItem.name, quantity: item.quantity, unit: item.inventoryItem.unit, status: 'ส่งมอบแล้ว' };
        }
        return {
          assetCode: item.asset!.assetCode,
          serialNo: item.asset!.serialNo,
          brand: item.asset!.brand,
          model: item.asset!.model,
          status: 'ส่งมอบแล้ว',
        };
      });
      const borrowDateStr = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
      const dueDateStr = request.items[0]?.dueDate ? new Date(request.items[0].dueDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : '-';
      await createNotification('checkout_completed', 'EMAIL', request.requester.email, {
        requestNo: request.requestNo,
        requester: request.requester.displayName || request.requester.adUsername,
        department: request.requester.department || '-',
        purpose: request.purpose || '-',
        location: '-',
        notes: request.note || '-',
        borrowDate: borrowDateStr,
        dueDate: dueDateStr,
        handoverNote: handoverNote || '-',
        itemsCount: String(request.items.length),
        items: itemsPayload,
      });
    }

    res.json({ message: 'Check-out สำเร็จ' });
  } catch (err) { next(err); }
});

// ── IT Admin: Return item ──
router.post('/items/:itemId/return', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), validate(returnSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const itemId = parseInt(req.params.itemId);
    const { condition, damageNote, accessoriesNote, receiverName } = req.body;

    const item = await prisma.borrowRequestItem.findUnique({
      where: { id: itemId },
      include: { request: { include: { requester: true } }, asset: true, inventoryItem: true },
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
          receiverName: receiverName || null,
        },
      });

      await tx.borrowRequestItem.update({
        where: { id: itemId },
        data: { itemStatus: 'Returned' },
      });

      if (item.isQuantityBased && item.inventoryItem) {
        // Inventory item: increment stock
        await tx.inventoryItem.update({
          where: { id: item.inventoryItemId! },
          data: { availableQuantity: { increment: item.quantity } },
        });
      } else if (item.asset) {
        // Serialized asset: update status
        await tx.asset.update({
          where: { id: item.assetId! },
          data: { status: 'Available' },
        });
        await tx.assetHistory.create({
          data: {
            assetId: item.assetId!,
            actionType: 'RETURN',
            fromStatus: 'Borrowed',
            toStatus: 'Available',
            actorUserId: req.user!.userId,
            note: `Return - ${condition}${damageNote ? ': ' + damageNote : ''}`,
          },
        });
      }

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
      const conditionLabel = condition === 'Normal' ? 'ปกติ' : condition === 'Damaged' ? 'ชำรุด' : condition === 'Repairing' ? 'ต้องซ่อม' : 'อุปกรณ์ไม่ครบ';
      const returnDateStr = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
      await createNotification('return_recorded', 'EMAIL', item.request.requester.email, {
        requestNo: item.request.requestNo,
        requester: item.request.requester.displayName || item.request.requester.adUsername,
        department: item.request.requester.department || '-',
        purpose: item.request.purpose || '-',
        assetCode: item.asset?.assetCode || '-',
        serialNo: item.asset?.serialNo || '-',
        brand: item.asset?.brand || '',
        model: item.asset?.model || '',
        condition: conditionLabel,
        damageNote: damageNote || '-',
        accessoriesNote: accessoriesNote || '-',
        returnDate: returnDateStr,
      });
    }

    res.json({ message: 'คืนทรัพย์สินเรียบร้อย' });
  } catch (err) { next(err); }
});

// ── Extension: Request extension ──
router.post('/extensions', authenticate, validate(extensionSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const allowExtension = await getAllowExtension();
    if (!allowExtension) {
      throw new AppError('ระบบไม่อนุญาตให้ขยายวันยืม');
    }

    const { requestId, itemIds, extraDays, reason } = req.body;

    const user = await prisma.appUser.findUnique({ where: { id: req.user!.userId } });

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
          requester: user?.displayName || req.user!.adUsername,
          department: user?.department || '-',
          extraDays: String(extraDays),
          reason: reason || '-',
          oldDueDate: extension.items[0]?.oldDueDate
            ? new Date(extension.items[0].oldDueDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
            : '-',
          newDueDate: extension.items[0]?.requestedDueDate
            ? new Date(extension.items[0].requestedDueDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
            : '-',
        });
      }
    }

    res.status(201).json(extension);
  } catch (err) { next(err); }
});

// ── Extension: Approve/Reject ──
router.put('/extensions/:id', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), validate(approveSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const { action, note } = req.body;

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
      const newDueDate = action === 'Approved' && extension.items.length > 0
        ? new Date(extension.items[0].requestedDueDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
        : '-';
      const oldDueDate = extension.items.length > 0
        ? new Date(extension.items[0].oldDueDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
        : '-';
      await createNotification(
        action === 'Approved' ? 'extension_approved' : 'extension_rejected',
        'EMAIL',
        extension.request.requester.email,
        {
          requestNo: extension.request.requestNo,
          requester: extension.request.requester.displayName || extension.request.requester.adUsername,
          department: extension.request.requester.department || '-',
          purpose: extension.request.purpose || '-',
          note: note || (action === 'Rejected' ? 'ไม่ระบุเหตุผล' : ''),
          reason: extension.reason,
          extraDays: String(extension.items[0]?.extraDays || '-'),
          oldDueDate,
          newDueDate,
        }
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
        include: {
          items: {
            include: {
              asset: true,
              inventoryItem: true,
              returns: { include: { returner: { select: { displayName: true, adUsername: true } } } },
            },
          },
          requester: true,
          approvals: true,
        },
      }),
      prisma.borrowRequest.count(),
    ]);
    res.json({ data, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) { next(err); }
});

export default router;
