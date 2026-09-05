/**
 * Daily capture of the dashboard's core KPIs (see dashboardHistory.ts) —
 * feeds the trend charts the dashboard couldn't show before this job
 * existed. Runs once a day; a missed run just means one gap in the trend
 * line, not a broken chart.
 */
import { prisma } from '../lib/prisma';
import { captureDailySnapshot } from '../services/dashboardHistory';
import { scheduleDaily } from './dailySchedule';

export async function runDailyMetricsSnapshot(): Promise<void> {
  try {
    await captureDailySnapshot(prisma);
    console.log('[DailyMetrics] Captured today\'s snapshot.');
  } catch (err) {
    console.error('[DailyMetrics] Run failed:', err);
  }
}

export function startDailyMetricsSnapshot(): void {
  // 01:00 — เก็บยอดของวันก่อนหน้าให้ปิดครบก่อน job อื่นเริ่มแก้ข้อมูล
  scheduleDaily({
    name: 'DailyMetrics',
    hour: 1,
    run: runDailyMetricsSnapshot,
  });
}
