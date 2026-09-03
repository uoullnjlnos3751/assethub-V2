/**
 * Daily capture of the dashboard's core KPIs (see dashboardHistory.ts) —
 * feeds the trend charts the dashboard couldn't show before this job
 * existed. Runs once a day; a missed run just means one gap in the trend
 * line, not a broken chart.
 */
import { prisma } from '../lib/prisma';
import { captureDailySnapshot } from '../services/dashboardHistory';

const DAY_MS = 24 * 60 * 60 * 1000;

export async function runDailyMetricsSnapshot(): Promise<void> {
  try {
    await captureDailySnapshot(prisma);
    console.log('[DailyMetrics] Captured today\'s snapshot.');
  } catch (err) {
    console.error('[DailyMetrics] Run failed:', err);
  }
}

export function startDailyMetricsSnapshot(): void {
  // Staggered behind the other startup jobs (60s / 120s) so all three don't
  // hit the database in the same instant.
  setTimeout(() => { void runDailyMetricsSnapshot(); }, 30_000);
  setInterval(() => { void runDailyMetricsSnapshot(); }, DAY_MS);

  console.log('[DailyMetrics] Scheduled daily dashboard KPI snapshot (interval: 24h)');
}
