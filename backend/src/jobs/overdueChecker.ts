import { prisma } from '../index';
import { createNotification } from '../services/notification';

export async function checkOverdueBorrows() {
  console.log('[OverdueChecker] Checking overdue borrows...');
  const now = new Date();

  const overdueItems = await prisma.borrowRequestItem.findMany({
    where: {
      itemStatus: { in: ['CheckedOut', 'PartiallyReturned'] },
      dueDate: { lt: now },
    },
    include: { request: { include: { requester: true } }, asset: true },
  });

  // Group items by requester
  const byRequester = new Map<number, { requester: any; items: any[] }>();
  // Group items for admins (all items)
  const allItems: any[] = [];

  for (const item of overdueItems) {
    if (!item.dueDate) continue;
    const requester = item.request.requester;
    allItems.push(item);

    if (!byRequester.has(requester.id)) {
      byRequester.set(requester.id, { requester, items: [] });
    }
    byRequester.get(requester.id)!.items.push(item);
  }

  // Send one email per requester with ALL their overdue items
  for (const [, group] of byRequester) {
    const { requester, items } = group;
    if (!requester.email) continue;

    const maxOverdueDays = Math.max(...items.map(i =>
      i.dueDate ? Math.floor((now.getTime() - i.dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0
    ));

    const itemsPayload = items.map(item => ({
      assetCode: item.asset?.assetCode || `Asset#${item.assetId}`,
      serialNo: item.asset?.serialNo || '',
      brand: item.asset?.brand || '',
      model: item.asset?.model || '',
      status: `เกิน ${Math.floor((now.getTime() - item.dueDate!.getTime()) / (1000 * 60 * 60 * 24))} วัน`,
    }));

    await createNotification('overdue_borrow', 'EMAIL', requester.email, {
      requester: requester.displayName || requester.adUsername,
      itemsCount: String(items.length),
      daysOverdue: String(maxOverdueDays),
      items: itemsPayload,
    });
  }

  // Send ONE email per admin with ALL overdue items across requesters
  const admins = await prisma.appUser.findMany({
    where: { role: { in: ['IT_ADMIN', 'SUPERADMIN'] }, isActive: true },
  });

  for (const admin of admins) {
    if (!admin.email) continue;

    const itemsPayload = allItems.map(item => ({
      assetCode: item.asset?.assetCode || `Asset#${item.assetId}`,
      serialNo: item.asset?.serialNo || '',
      brand: item.asset?.brand || '',
      model: item.asset?.model || '',
      requester: item.request.requester?.displayName || item.request.requester?.adUsername || '-',
      status: `เกิน ${Math.floor((now.getTime() - item.dueDate!.getTime()) / (1000 * 60 * 60 * 24))} วัน`,
    }));

    await createNotification('overdue_borrow', 'EMAIL', admin.email, {
      requester: 'ผู้ดูแลระบบ',
      itemsCount: String(allItems.length),
      daysOverdue: '-',
      items: itemsPayload,
    });
  }

  await prisma.scheduledJob.create({
    data: { jobType: 'overdue_check', status: 'completed', result: `Checked ${overdueItems.length} overdue items` },
  });

  console.log(`[OverdueChecker] Done. Found ${overdueItems.length} overdue items.`);
}

export function startOverdueChecker() {
  checkOverdueBorrows();
  setInterval(checkOverdueBorrows, 60 * 60 * 1000);
  console.log('[OverdueChecker] Scheduled (interval: 1hr)');
}
