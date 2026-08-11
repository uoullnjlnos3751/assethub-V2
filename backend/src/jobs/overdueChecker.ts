import { prisma } from '../lib/prisma';
import { createNotification } from '../services/notification';
import { retryWithBackoff } from '../utils/dbRetry';

export async function checkOverdueBorrows() {
  try {
    console.log('[OverdueChecker] Checking overdue borrows...');
    const now = new Date();

    const overdueItems = await retryWithBackoff(
      () => prisma.borrowRequestItem.findMany({
        where: {
          itemStatus: { in: ['CheckedOut', 'PartiallyReturned'] },
          dueDate: { lt: now },
        },
        include: { request: { include: { requester: true } }, asset: true },
      }),
      'findOverdueItems',
      { maxRetries: 2, initialDelayMs: 100 }
    );

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
    const admins = await retryWithBackoff(
      () => prisma.appUser.findMany({
        where: { role: { in: ['IT_ADMIN', 'SUPERADMIN'] }, isActive: true },
      }),
      'findAdmins',
      { maxRetries: 2, initialDelayMs: 100 }
    );

    if (allItems.length > 0) {
      const itemsPayload = allItems.map(item => ({
        assetCode: item.asset?.assetCode || `Asset#${item.assetId}`,
        serialNo: item.asset?.serialNo || '',
        brand: item.asset?.brand || '',
        model: item.asset?.model || '',
        requester: item.request.requester?.displayName || item.request.requester?.adUsername || '-',
        status: `เกิน ${Math.floor((now.getTime() - item.dueDate!.getTime()) / (1000 * 60 * 60 * 24))} วัน`,
      }));

      for (const admin of admins) {
        if (!admin.email) continue;

        await createNotification('overdue_borrow', 'EMAIL', admin.email, {
          requester: 'ผู้ดูแลระบบ',
          itemsCount: String(allItems.length),
          daysOverdue: '-',
          items: itemsPayload,
        });
      }

      await createNotification('overdue_borrow', 'LINE', 'broadcast', {
        requester: 'สรุปรายวัน',
        itemsCount: String(allItems.length),
        daysOverdue: '-',
        items: itemsPayload,
      });
    }

    await retryWithBackoff(
      () => prisma.scheduledJob.create({
        data: { jobType: 'overdue_check', status: 'completed', result: `Checked ${overdueItems.length} overdue items` },
      }),
      'createScheduledJob-overdue',
      { maxRetries: 1, initialDelayMs: 50 }
    );

    console.log(`[OverdueChecker] Done. Found ${overdueItems.length} overdue items.`);
  } catch (err) {
    console.error(JSON.stringify({
      type: 'OVERDUE_CHECKER_ERROR',
      timestamp: new Date().toISOString(),
      message: 'Overdue checker failed',
      error: String(err),
    }));
  }
}

export async function checkOverduePMs() {
  try {
    console.log('[OverdueChecker] Checking overdue PM plans...');
    const now = new Date();

    const overduePlans = await retryWithBackoff(
      () => prisma.pMPlan.findMany({
        where: {
          endDate: { lt: now },
          runs: {
            some: {
              status: { not: 'COMPLETED' },
            },
          },
        },
        include: {
          runs: {
            where: { status: { not: 'COMPLETED' } },
            include: { asset: true },
          },
        },
      }),
      'findOverduePMPlans',
      { maxRetries: 2, initialDelayMs: 100 }
    );

    const admins = await retryWithBackoff(
      () => prisma.appUser.findMany({
        where: { role: { in: ['IT_ADMIN', 'SUPERADMIN'] }, isActive: true },
      }),
      'findAdminsForPM',
      { maxRetries: 2, initialDelayMs: 100 }
    );

    for (const plan of overduePlans) {
      const remainingCount = plan.runs.length;
      const itemsPayload = plan.runs.map(run => ({
        assetCode: run.asset?.assetCode || `Asset#${run.assetId}`,
        serialNo: run.asset?.serialNo || '',
        brand: run.asset?.brand || '',
        model: run.asset?.model || '',
        category: run.asset?.type || plan.deviceType || 'PM Equipment',
        status: 'ค้างดำเนินการ',
      }));

      const planName = [plan.company, plan.site, plan.deptTask].filter(Boolean).join(' - ') || `Plan#${plan.id}`;

      for (const admin of admins) {
        if (!admin.email) continue;
        await createNotification('pm_overdue', 'EMAIL', admin.email, {
          planName,
          year: String(plan.year),
          remainingCount: String(remainingCount),
          endDate: plan.endDate ? plan.endDate.toLocaleDateString('th-TH') : '-',
          items: itemsPayload,
        });
      }

      await createNotification('pm_overdue', 'LINE', 'broadcast', {
        planName,
        year: String(plan.year),
        remainingCount: String(remainingCount),
        endDate: plan.endDate ? plan.endDate.toLocaleDateString('th-TH') : '-',
        items: itemsPayload,
      });
    }

    console.log(`[OverdueChecker] Done. Found ${overduePlans.length} overdue PM plans.`);
  } catch (err) {
    console.error(JSON.stringify({
      type: 'PM_OVERDUE_CHECKER_ERROR',
      timestamp: new Date().toISOString(),
      message: 'PM Overdue checker failed',
      error: String(err),
    }));
  }
}

export function startOverdueChecker() {
  checkOverdueBorrows().catch(err => {
    console.error('[OverdueChecker] Initial check failed:', err.message);
  });
  checkOverduePMs().catch(err => {
    console.error('[OverdueChecker] Initial PM check failed:', err.message);
  });
  setInterval(() => {
    checkOverdueBorrows().catch(err => {
      console.error('[OverdueChecker] Periodic check failed:', err.message);
    });
    checkOverduePMs().catch(err => {
      console.error('[OverdueChecker] Periodic PM check failed:', err.message);
    });
  }, 60 * 60 * 1000);
  console.log('[OverdueChecker] Scheduled (interval: 1hr)');
}
