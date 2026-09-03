/**
 * Daily KPI snapshots — the time dimension none of the dashboard's cards had
 * before. Every card on the dashboard answers "how much right now"; none of
 * them could answer "better or worse than last month". This captures the
 * handful of numbers worth trending once a day (see DailyMetricSnapshot in
 * schema.prisma) and serves them back for a trend chart.
 *
 * Reuses the same functions the dashboard itself calls (assetSummary,
 * dataHealth, ...) rather than re-deriving these numbers a second way — the
 * daily snapshot and "today" on the dashboard can never quietly disagree.
 */
import type { PrismaClient } from '@prisma/client';
import { assetSummary, dataHealth, borrowSummary, pmSummary, externalAgentsSummary, warrantyExpiring } from './dashboardData';

function todayAtMidnight(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Computes today's values and upserts the row for today — safe to run more
 *  than once on the same day (the job re-running after a restart just
 *  overwrites today's row with a fresher read instead of erroring). */
export async function captureDailySnapshot(prisma: PrismaClient): Promise<void> {
  const year = new Date().getFullYear();
  const [assets, health, borrow, pm, agents, warranty] = await Promise.all([
    assetSummary(prisma),
    dataHealth(prisma),
    borrowSummary(prisma),
    pmSummary(prisma, year),
    externalAgentsSummary(),
    warrantyExpiring(prisma, 30),
  ]);

  const data = {
    assetsTotal: assets.total,
    pmDonePct: pm.total > 0 ? Math.round((pm.completed / pm.total) * 1000) / 10 : 0,
    osOutdatedCount: health.outdatedOSCount,
    borrowOverdueCount: borrow.overdue,
    agentOfflineCount: agents.available ? ((agents.data as any)?.offline ?? null) : null,
    warrantyExpiredCount: warranty.expiredCount,
  };

  const date = todayAtMidnight();
  await prisma.dailyMetricSnapshot.upsert({
    where: { date },
    create: { date, ...data },
    update: data,
  });
}

/** Last `days` snapshots, oldest first (chart-ready order). */
export async function getMetricHistory(prisma: PrismaClient, days: number) {
  const since = todayAtMidnight();
  since.setDate(since.getDate() - days);
  const rows = await prisma.dailyMetricSnapshot.findMany({
    where: { date: { gte: since } },
    orderBy: { date: 'asc' },
  });
  return rows;
}
