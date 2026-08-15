import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { createNotification } from '../services/notification';
import { validate, borrowRequestSchema, approveSchema, checkoutSchema, returnSchema, extensionSchema, reminderSchema } from '../middleware/validation';

const router = Router();

async function getBorrowDays(): Promise<number> {
  const settings = await prisma.notificationSetting.findFirst();
  return settings?.borrowDays ?? parseInt(process.env.BORROW_DUE_DAYS || '3');
}

async function getMaxItems(): Promise<number> {
  const settings = await prisma.notificationSetting.findFirst();
  return settings?.maxItemsPerRequest ?? 5;
}

async function getActiveBorrowTypesByUser(userId: number): Promise<Set<string>> {
  const activeItems = await prisma.borrowRequestItem.findMany({
    where: {
      request: { requesterUserId: userId },
      itemStatus: { in: ['Pending', 'Approved', 'CheckedOut'] },
      asset: { type: { not: null } },
    },
    include: { asset: { select: { type: true } } },
  });
  return new Set(
    activeItems.map(i => i.asset?.type).filter((t): t is string => t != null)
  );
}

async function getAllowExtension(): Promise<boolean> {
  const settings = await prisma.notificationSetting.findFirst();
  return settings?.allowExtension ?? true;
}

function parseRequestedDueDate(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date < today) return null;
  return date;
}

function formatDateTh(value?: Date | string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
}

function buildBorrowItemPayload(item: any, status: string) {
  if (item.inventoryItem) {
    return {
      assetCode: item.inventoryItem.name,
      serialNo: '',
      brand: `จำนวน ${item.quantity}`,
      model: item.inventoryItem.unit,
      category: '',
      name: item.inventoryItem.name,
      quantity: item.quantity,
      unit: item.inventoryItem.unit,
      status,
    };
  }
  return {
    assetCode: item.asset?.assetCode || item.asset?.assetName || '-',
    serialNo: item.asset?.serialNo || '',
    brand: item.asset?.brand || '',
    model: item.asset?.model || '',
    category: item.asset?.category?.name || '',
    status,
  };
}

// ── User: Create borrow request (multi-item) ──
router.post('/requests', authenticate, validate(borrowRequestSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { assetIds, inventoryItems, purpose, notes, location, dueDate: requestedDueDate } = req.body;

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

      // One person can borrow only 1 item per type
      const activeTypes = await getActiveBorrowTypesByUser(req.user!.userId);
      for (const asset of assets) {
        if (asset.type && activeTypes.has(asset.type)) {
          throw new AppError(
            `คุณยืม "${asset.type}" อยู่แล้ว กรุณาคืน "${asset.type}" ก่อนจึงจะยืมเพิ่มได้`
          );
        }
      }
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
    const parsedDueDate = parseRequestedDueDate(requestedDueDate);
    const dueDate = parsedDueDate || new Date();
    if (!parsedDueDate) {
      dueDate.setDate(dueDate.getDate() + borrowDays);
    }

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
      include: { items: { include: { asset: { include: { category: true } }, inventoryItem: true } } },
    });

    const itemsPayload = request.items.map(item => {
      if (item.inventoryItem) {
        return {
          name: item.inventoryItem.name,
          category: '',
          quantity: item.quantity,
          unit: item.inventoryItem.unit,
          status: 'รอการอนุมัติ',
        };
      }
      return {
        assetCode: item.asset!.assetCode || item.asset!.assetName || '-',
        serialNo: item.asset!.serialNo,
        category: item.asset!.category?.name || '',
        brand: item.asset!.brand,
        model: item.asset!.model,
        status: 'รอการอนุมัติ',
      };
    });

    const borrowDateStr = borrowDate.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
    const dueDateStr = dueDate.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });

    // Notify IT Admins
    const admins = await prisma.appUser.findMany({ where: { role: { in: ['IT_ADMIN', 'SUPERADMIN'] } } });
    
    await prisma.appNotification.createMany({
      data: admins.map(admin => ({
        userId: admin.id,
        title: 'คำขอยืมใหม่',
        message: `คุณ ${user?.displayName || req.user!.adUsername} ได้ส่งคำขอยืมเลขที่ ${request.requestNo}`,
        type: 'BORROW',
        link: '/borrow/approval-queue',
      })),
    });
    const payload = {
      requestNo: request.requestNo,
      requester: user?.displayName || req.user!.adUsername,
      department: user?.department || '-',
      email: user?.email || '-',
      purpose: purpose || '-',
      location: location || '-',
      note: notes || '-',
      notes: notes || '-',
      borrowDate: borrowDateStr,
      dueDate: dueDateStr,
      borrowDays: String(borrowDays),
      itemsCount: String(request.items.length),
      itemsTable: '',
      items: itemsPayload,
    };
    await Promise.all(admins.map(async (admin) => {
      if (admin.email) {
        await createNotification('borrow_request_pending', 'EMAIL', admin.email, payload);
      }
    }));
    
    // Notify via LINE Broadcast/Multicast (only once)
    await createNotification('borrow_request_pending', 'LINE', 'broadcast', payload);

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
        include: {
          items: { include: { asset: { include: { category: true } }, inventoryItem: true } },
          approvals: {
            include: { approver: { select: { displayName: true, adUsername: true } } },
            orderBy: { actedAt: 'desc' }
          },
          extensions: {
            include: { items: true },
            orderBy: { createdAt: 'desc' }
          }
        },
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
      include: { asset: { include: { category: true } }, inventoryItem: true, request: true },
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
      include: { asset: { include: { category: true } }, inventoryItem: true, request: true, returns: true },
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
        items: { include: { requestItem: { include: { asset: { include: { category: true } } } } } },
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
        include: { items: { include: { asset: { include: { category: true } }, inventoryItem: true, returns: true } }, approvals: true, requester: { select: { id: true, displayName: true, adUsername: true, department: true, company: true } } },
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
      include: { items: { include: { asset: { include: { category: true } }, inventoryItem: true } }, requester: true },
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

    await prisma.appNotification.create({
      data: {
        userId: request.requesterUserId,
        title: action === 'Approved' ? 'คำขอยืมได้รับการอนุมัติ' : 'คำขอยืมถูกปฏิเสธ',
        message: `คำขอยืมเลขที่ ${request.requestNo} ได้รับการ${action === 'Approved' ? 'อนุมัติ' : 'ปฏิเสธ'}แล้วโดยฝ่าย IT${note ? `\nหมายเหตุ: ${note}` : ''}`,
        type: 'BORROW',
        link: '/borrow/my-requests',
      }
    });

    if (request.requester.email) {
      const itemsPayload = request.items.map(item => buildBorrowItemPayload(
        item,
        action === 'Approved' ? 'อนุมัติ' : 'ไม่อนุมัติ'
      ));

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
      include: { items: { include: { asset: { include: { category: true } }, inventoryItem: true } }, approvals: true, requester: true },
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
        items: { include: { asset: { include: { category: true } }, inventoryItem: true } },
        requester: true
      },
    });
    if (!request) throw new AppError('ไม่พบคำขอ', 404);
    if (request.status !== 'Approved') throw new AppError('คำขอยังไม่ได้รับการอนุมัติ');

    await prisma.$transaction(async (tx) => {
      for (const item of request.items) {
        if (item.isQuantityBased && item.inventoryItem) {
          const latest = await tx.inventoryItem.findUnique({
            where: { id: item.inventoryItemId! },
            select: { name: true, availableQuantity: true, unit: true },
          });
          if (!latest || latest.availableQuantity < item.quantity) {
            throw new AppError(`วัสดุ "${latest?.name || item.inventoryItem.name}" คงเหลือไม่พอ (มี ${latest?.availableQuantity ?? 0} ${latest?.unit || item.inventoryItem.unit})`);
          }
        } else if (item.asset) {
          const latest = await tx.asset.findUnique({
            where: { id: item.assetId! },
            select: { status: true, assetCode: true },
          });
          if (!latest || latest.status !== 'Available') {
            throw new AppError(`ทรัพย์สิน ${latest?.assetCode || item.asset.assetCode} ไม่พร้อมให้ยืมแล้ว`);
          }
        }
      }

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

    if (request.requester) {
      const itemsPayload = request.items.map(item => buildBorrowItemPayload(item, 'ส่งมอบแล้ว'));
      const borrowDateStr = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
      const dueDateStr = request.items[0]?.dueDate ? new Date(request.items[0].dueDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : '-';
      const payload = {
        requestNo: request.requestNo,
        requester: request.requester.displayName || request.requester.adUsername,
        department: request.requester.department || '-',
        purpose: request.purpose || '-',
        location: '-',
        note: request.note || '-',
        notes: request.note || '-',
        borrowDate: borrowDateStr,
        dueDate: dueDateStr,
        handoverNote: handoverNote || '-',
        itemsCount: String(request.items.length),
        items: itemsPayload,
      };

      if (request.requester.email) {
        await createNotification('checkout_completed', 'EMAIL', request.requester.email, payload);
      }
      // Line notification
      await createNotification('checkout_completed', 'LINE', 'broadcast', payload);
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
      include: { request: { include: { requester: true } }, asset: { include: { category: true } }, inventoryItem: true },
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

    if (item.request.requester) {
      const conditionLabel = condition === 'Normal' ? 'ปกติ' : condition === 'Damaged' ? 'ชำรุด' : condition === 'Repairing' ? 'ต้องซ่อม' : 'อุปกรณ์ไม่ครบ';
      const returnDateStr = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
      const payload = {
        requestNo: item.request.requestNo,
        requester: item.request.requester.displayName || item.request.requester.adUsername,
        department: item.request.requester.department || '-',
        purpose: item.request.purpose || '-',
        assetCode: item.asset?.assetCode || item.asset?.assetName || '-',
        serialNo: item.asset?.serialNo || '-',
        brand: item.asset?.brand || '',
        model: item.asset?.model || '',
        condition: conditionLabel,
        damageNote: damageNote || '-',
        accessoriesNote: accessoriesNote || '-',
        returnDate: returnDateStr,
      };

      if (item.request.requester.email) {
        await createNotification('return_recorded', 'EMAIL', item.request.requester.email, payload);
      }
      
      // Line notification
      await createNotification('return_recorded', 'LINE', 'broadcast', payload);
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
    
    await prisma.appNotification.createMany({
      data: admins.map(admin => ({
        userId: admin.id,
        title: 'คำขอขยายเวลาใหม่',
        message: `คุณ ${user?.displayName || req.user!.adUsername} ขอขยายเวลายืม ${borrowRequest.requestNo}`,
        type: 'BORROW',
        link: '/borrow/extension-queue',
      })),
    });
    await Promise.all(admins.map(async (admin) => {
      if (admin.email) {
        await createNotification('extension_pending', 'EMAIL', admin.email, {
          requestNo: borrowRequest.requestNo,
          requester: user?.displayName || req.user!.adUsername,
          department: user?.department || '-',
          purpose: borrowRequest.purpose || '-',
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
    }));

    await createNotification('extension_pending', 'LINE', 'broadcast', {
      requestNo: borrowRequest.requestNo,
      requester: user?.displayName || req.user!.adUsername,
      department: user?.department || '-',
      purpose: borrowRequest.purpose || '-',
      extraDays: String(extraDays),
      reason: reason || '-',
      oldDueDate: extension.items[0]?.oldDueDate
        ? new Date(extension.items[0].oldDueDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
        : '-',
      newDueDate: extension.items[0]?.requestedDueDate
        ? new Date(extension.items[0].requestedDueDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
        : '-',
    });

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

    await prisma.appNotification.create({
      data: {
        userId: extension.request.requesterUserId,
        title: action === 'Approved' ? 'อนุมัติการขยายเวลายืม' : 'ไม่อนุมัติการขยายเวลายืม',
        message: `คำขอขยายเวลายืมสำหรับ ${extension.request.requestNo} ได้รับการ${action === 'Approved' ? 'อนุมัติ' : 'ปฏิเสธ'}${note ? `\nหมายเหตุ: ${note}` : ''}`,
        type: 'BORROW',
        link: '/borrow/my-extensions',
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
      include: { request: { include: { requester: true } }, items: { include: { requestItem: { include: { asset: { include: { category: true } } } } } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(extensions);
  } catch (err) { next(err); }
});

router.get('/overdue', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const items = await prisma.borrowRequestItem.findMany({
      where: {
        itemStatus: { in: ['CheckedOut', 'PartiallyReturned'] },
        dueDate: { lt: now },
      },
      include: {
        asset: { include: { category: true } },
        inventoryItem: true,
        request: { include: { requester: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    res.json(items.map((item) => ({
      id: item.id,
      requestId: item.requestId,
      requestNo: item.request.requestNo,
      borrowerName: item.request.requester.displayName || item.request.requester.adUsername,
      borrowerEmail: item.request.requester.email || '',
      department: item.request.requester.department || '',
      purpose: item.request.purpose || '',
      borrowDate: item.borrowDate,
      dueDate: item.dueDate,
      itemStatus: item.itemStatus,
      isQuantityBased: item.isQuantityBased,
      quantity: item.quantity,
      daysOverdue: item.dueDate ? Math.floor((now.getTime() - item.dueDate.getTime()) / 86400000) : 0,
      asset: item.asset ? {
        id: item.asset.id,
        assetCode: item.asset.assetCode,
        serialNo: item.asset.serialNo,
        brand: item.asset.brand,
        model: item.asset.model,
      } : null,
      inventoryItem: item.inventoryItem ? {
        id: item.inventoryItem.id,
        name: item.inventoryItem.name,
        unit: item.inventoryItem.unit,
      } : null,
    })));
  } catch (err) { next(err); }
});

router.post('/items/:itemId/reminder', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), validate(reminderSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const itemId = parseInt(req.params.itemId);
    const item = await prisma.borrowRequestItem.findUnique({
      where: { id: itemId },
      include: { request: { include: { requester: true } }, asset: { include: { category: true } }, inventoryItem: true },
    });
    if (!item) throw new AppError('ไม่พบรายการยืม', 404);
    if (!item.dueDate || new Date(item.dueDate) >= new Date()) throw new AppError('รายการนี้ยังไม่เกินกำหนด');
    if (!item.request.requester.email) throw new AppError('ผู้ยืมไม่มีอีเมลสำหรับส่งแจ้งเตือน');

    const daysOverdue = Math.floor((Date.now() - item.dueDate.getTime()) / 86400000);
    await createNotification('overdue_borrow', 'EMAIL', item.request.requester.email, {
      requestNo: item.request.requestNo,
      requester: item.request.requester.displayName || item.request.requester.adUsername,
      department: item.request.requester.department || '-',
      purpose: item.request.purpose || '-',
      assetCode: item.asset?.assetCode || item.asset?.assetName || item.inventoryItem?.name || '-',
      serialNo: item.asset?.serialNo || '',
      brand: item.asset?.brand || '',
      model: item.asset?.model || (item.inventoryItem ? `จำนวน ${item.quantity} ${item.inventoryItem.unit}` : ''),
      dueDate: formatDateTh(item.dueDate),
      daysOverdue: String(daysOverdue),
      note: req.body.note || '-',
      items: [buildBorrowItemPayload(item, `เกินกำหนด ${daysOverdue} วัน`)],
    });

    res.json({ message: 'ส่งแจ้งเตือนรายการเกินกำหนดเรียบร้อย' });
  } catch (err) { next(err); }
});

// ── User: Cancel own pending request ──
router.delete('/requests/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const request = await prisma.borrowRequest.findUnique({
      where: { id },
      include: { requester: true, items: { include: { asset: true, inventoryItem: true } } },
    });
    if (!request) throw new AppError('ไม่พบคำขอยืม', 404);
    if (request.requesterUserId !== req.user!.userId && !['IT_ADMIN', 'SUPERADMIN'].includes(req.user!.role)) {
      throw new AppError('ไม่มีสิทธิ์ยกเลิกคำขอนี้');
    }
    if (request.status !== 'Pending') throw new AppError('ไม่สามารถยกเลิกคำขอที่ดำเนินการแล้ว');

    await prisma.$transaction(async (tx) => {
      await tx.borrowRequestItem.updateMany({
        where: { requestId: id },
        data: { itemStatus: 'Cancelled' },
      });
      await tx.borrowRequest.update({
        where: { id },
        data: { status: 'Cancelled' },
      });
    });

    // Notify IT admins about cancellation
    const admins = await prisma.appUser.findMany({ where: { role: { in: ['IT_ADMIN', 'SUPERADMIN'] } } });
    await prisma.appNotification.createMany({
      data: admins.map(admin => ({
        userId: admin.id,
        title: 'คำขอยืมถูกยกเลิก',
        message: `คำขอยืมเลขที่ ${request.requestNo} ถูกยกเลิกโดย ${request.requester.displayName || req.user!.adUsername}`,
        type: 'BORROW',
        link: '/borrow/approval-queue',
      })),
    });

    res.json({ message: 'ยกเลิกคำขอยืมเรียบร้อย' });
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
              asset: { include: { category: true } },
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

// ── IT Admin: Operational stat tiles for the all-requests / approval-queue
// screens. One shared endpoint rather than duplicating the same counts in two
// places — the approval queue's extra cards (pending-over-1-day, approved
// today, etc.) are just a subset of what the all-requests dashboard needs.
router.get('/stats', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday.getTime() + 86400000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    // "1 วันทำการ" per BUSINESS-RULES.md is approximated as 24h — the system
    // has no holiday/weekend calendar to compute true business days against.
    const oneDayAgo = new Date(now.getTime() - 86400000);

    const [
      pending, pendingOverDay, approvedToday, rejectedThisMonth,
      recentApprovals, activeItems, activeRequesterRows,
      overdueItems, dueTodayItems, returnsThisMonth,
    ] = await Promise.all([
      prisma.borrowRequest.count({ where: { status: 'Pending' } }),
      prisma.borrowRequest.count({ where: { status: 'Pending', createdAt: { lt: oneDayAgo } } }),
      prisma.borrowApproval.count({ where: { action: 'Approved', actedAt: { gte: startOfToday, lt: endOfToday } } }),
      prisma.borrowApproval.count({ where: { action: 'Rejected', actedAt: { gte: startOfMonth } } }),
      prisma.borrowApproval.findMany({
        where: { actedAt: { gte: startOfMonth } },
        select: { actedAt: true, request: { select: { createdAt: true } } },
      }),
      prisma.borrowRequestItem.count({ where: { itemStatus: 'CheckedOut' } }),
      prisma.borrowRequestItem.findMany({
        where: { itemStatus: 'CheckedOut' },
        select: { request: { select: { requesterUserId: true } } },
      }),
      prisma.borrowRequestItem.findMany({
        where: { itemStatus: { in: ['CheckedOut', 'PartiallyReturned'] }, dueDate: { lt: now } },
        select: { dueDate: true },
      }),
      prisma.borrowRequestItem.count({
        where: { itemStatus: { in: ['CheckedOut', 'PartiallyReturned'] }, dueDate: { gte: startOfToday, lt: endOfToday } },
      }),
      prisma.return.findMany({
        where: { returnedAt: { gte: startOfMonth } },
        select: { returnedAt: true, requestItem: { select: { dueDate: true } } },
      }),
    ]);

    const avgApprovalHours = recentApprovals.length > 0
      ? recentApprovals.reduce((sum, a) => sum + (a.actedAt.getTime() - a.request.createdAt.getTime()), 0)
        / recentApprovals.length / 3600000
      : null;

    const activeBorrowers = new Set(activeRequesterRows.map(r => r.request.requesterUserId)).size;

    const overdueAvgDays = overdueItems.length > 0
      ? overdueItems.reduce((sum, i) => sum + (now.getTime() - i.dueDate!.getTime()), 0) / overdueItems.length / 86400000
      : 0;

    const onTimeThisMonth = returnsThisMonth.filter(r => !r.requestItem.dueDate || r.returnedAt <= r.requestItem.dueDate).length;

    res.json({
      pending, pendingOverDay, approvedToday, rejectedThisMonth,
      avgApprovalHours: avgApprovalHours != null ? Math.round(avgApprovalHours * 10) / 10 : null,
      activeItems, activeBorrowers,
      overdueItems: overdueItems.length,
      overdueAvgDays: Math.round(overdueAvgDays * 10) / 10,
      dueTodayItems,
      returnedThisMonth: returnsThisMonth.length,
      returnedOnTimePct: returnsThisMonth.length > 0 ? Math.round((onTimeThisMonth / returnsThisMonth.length) * 100) : null,
    });
  } catch (err) { next(err); }
});

// ── IT Admin: All-time analytics for the history screen (on-time rate,
// damage rate, most-borrowed assets) — kept separate from /stats above since
// it scans the full returns table rather than a recent/current window, and
// the history page loads far less often than the operational dashboards.
router.get('/history-stats', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [returns, topAssetRows] = await Promise.all([
      prisma.return.findMany({ select: { returnedAt: true, condition: true, requestItem: { select: { dueDate: true } } } }),
      prisma.borrowRequestItem.groupBy({
        by: ['assetId'],
        where: { assetId: { not: null } },
        _count: { assetId: true },
        orderBy: { _count: { assetId: 'desc' } },
        take: 5,
      }),
    ]);

    const assets = await prisma.asset.findMany({
      where: { id: { in: topAssetRows.map(r => r.assetId!) } },
      select: { id: true, assetCode: true, assetName: true, brand: true, model: true },
    });
    const assetById = new Map(assets.map(a => [a.id, a]));

    const onTime = returns.filter(r => !r.requestItem.dueDate || r.returnedAt <= r.requestItem.dueDate).length;
    const damaged = returns.filter(r => r.condition !== 'Normal').length;

    res.json({
      totalReturns: returns.length,
      onTimePct: returns.length > 0 ? Math.round((onTime / returns.length) * 100) : null,
      damagedPct: returns.length > 0 ? Math.round((damaged / returns.length) * 100) : null,
      topAssets: topAssetRows.map(r => {
        const a = assetById.get(r.assetId!);
        return {
          assetId: r.assetId,
          assetCode: a?.assetCode || '',
          label: a ? [a.brand, a.model].filter(Boolean).join(' ') || a.assetName : '',
          count: r._count.assetId,
        };
      }),
    });
  } catch (err) { next(err); }
});

export default router;
