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

  for (const item of overdueItems) {
    const requester = item.request.requester;
    if (!item.dueDate) continue;
    const daysOverdue = Math.floor((now.getTime() - item.dueDate.getTime()) / (1000 * 60 * 60 * 24));
    const dueDateStr = item.dueDate.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });

    if (requester.email) {
      await createNotification('overdue_borrow', 'EMAIL', requester.email, {
        requester: requester.displayName || requester.adUsername,
        assetCode: item.asset?.assetCode || `Asset#${item.assetId}`,
        daysOverdue: String(daysOverdue),
        dueDate: dueDateStr,
      });
    }

    const admins = await prisma.appUser.findMany({
      where: { role: { in: ['IT_ADMIN', 'SUPERADMIN'] }, isActive: true },
    });
    for (const admin of admins) {
      if (admin.email) {
        await createNotification('overdue_borrow', 'EMAIL', admin.email, {
          requester: requester.displayName || requester.adUsername,
          assetCode: item.asset?.assetCode || `Asset#${item.assetId}`,
          daysOverdue: String(daysOverdue),
          dueDate: dueDateStr,
        });
      }
    }
  }

  await prisma.scheduledJob.create({
    data: { jobType: 'overdue_check', status: 'completed', result: `Checked ${overdueItems.length} overdue items` },
  });

  console.log(`[OverdueChecker] Done. Found ${overdueItems.length} overdue items.`);
}

export function startOverdueChecker() {
  checkOverdueBorrows(); // Run immediately on start
  setInterval(checkOverdueBorrows, 60 * 60 * 1000); // Every hour
  console.log('[OverdueChecker] Scheduled (interval: 1hr)');
}
