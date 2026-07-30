import { prisma } from '../lib/prisma';
import { createNotification } from '../services/notification';
import { retryWithBackoff } from '../utils/dbRetry';

export async function sendDailySummary() {
  try {
    console.log('[DailySummary] Fetching statistics...');
    const now = new Date();
    const nextMonth = new Date();
    nextMonth.setDate(now.getDate() + 30);

    const [overdueCount, pendingCount, remainingPMCount, expiringWarrantyCount] = await Promise.all([
      // Overdue borrows
      retryWithBackoff(() => prisma.borrowRequestItem.count({
        where: { itemStatus: { in: ['CheckedOut', 'PartiallyReturned'] }, dueDate: { lt: now } }
      }), 'countOverdue'),
      // Pending borrow requests
      retryWithBackoff(() => prisma.borrowRequest.count({
        where: { status: 'Pending' }
      }), 'countPending'),
      // PM remaining for current year
      retryWithBackoff(() => prisma.pMRun.count({
        where: { status: { not: 'COMPLETED' }, year: now.getFullYear() }
      }), 'countPMRemaining'),
      // Expiring warranties in 30 days
      retryWithBackoff(() => prisma.asset.count({
        where: { warrantyEndDate: { gte: now, lte: nextMonth }, status: { not: 'Retired' } }
      }), 'countExpiringWarranty')
    ]);

    console.log(`[DailySummary] Stats loaded: Overdue=${overdueCount}, Pending=${pendingCount}, PM=${remainingPMCount}, Warranty=${expiringWarrantyCount}`);

    // Create LINE notification
    await createNotification('daily_summary', 'LINE', 'broadcast', {
      overdueCount: String(overdueCount),
      pendingCount: String(pendingCount),
      remainingPMCount: String(remainingPMCount),
      expiringWarrantyCount: String(expiringWarrantyCount)
    });

    console.log('[DailySummary] Proactive LINE summary queued.');
  } catch (err) {
    console.error('[DailySummary] Failed to send summary:', err);
  }
}

export function startDailySummaryJob() {
  // Trigger on startup after 10s delay to let server initialize
  setTimeout(() => {
    sendDailySummary().catch(err => console.error('[DailySummary] Initial run failed:', err));
  }, 10000);

  // Run every 24 hours
  setInterval(() => {
    sendDailySummary().catch(err => console.error('[DailySummary] Periodic run failed:', err));
  }, 24 * 60 * 60 * 1000);

  console.log('[DailySummary] Scheduled daily summary job (interval: 24h)');
}
