import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/asset-summary', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [byStatus, byDepartment, byType, total, byCategory] = await Promise.all([
      prisma.asset.groupBy({ by: ['status'], _count: true }),
      prisma.asset.groupBy({ by: ['departmentId'], _count: true }),
      prisma.asset.groupBy({ by: ['type'], _count: true }),
      prisma.asset.count(),
      prisma.category.findMany({
        where: { isActive: true },
        select: { id: true, name: true, icon: true, _count: { select: { assets: true } } },
        orderBy: { sortOrder: 'asc' },
      }),
    ]);
    const byCategoryFlat = byCategory.map(c => ({
      id: c.id, name: c.name, icon: c.icon, assetCount: c._count.assets,
    }));
    res.json({ total, byStatus, byDepartment, byType, byCategory: byCategoryFlat });
  } catch (err) { next(err); }
});

router.get('/borrow-summary', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [byStatus, total, overdue, activeItems] = await Promise.all([
      prisma.borrowRequest.groupBy({ by: ['status'], _count: true }),
      prisma.borrowRequest.count(),
      prisma.borrowRequestItem.count({
        where: { itemStatus: 'CheckedOut', dueDate: { lt: new Date() } },
      }),
      prisma.borrowRequestItem.count({
        where: { itemStatus: { in: ['CheckedOut', 'PartiallyReturned'] } },
      }),
    ]);
    const pendingApproval = await prisma.borrowRequest.count({ where: { status: 'Pending' } });
    res.json({ total, byStatus, overdue, activeItems, pendingApproval });
  } catch (err) { next(err); }
});

router.get('/borrow-trend', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const year = parseInt(_req.query.year as string) || new Date().getFullYear();
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);
    const requests = await prisma.borrowRequest.findMany({
      where: { createdAt: { gte: start, lt: end } },
      select: { createdAt: true, status: true },
    });
    const monthly: Record<string, { month: string; requests: number; approved: number; returned: number }> = {};
    for (let m = 0; m < 12; m++) {
      const key = `${year}-${String(m + 1).padStart(2, '0')}`;
      monthly[key] = { month: key, requests: 0, approved: 0, returned: 0 };
    }
    for (const r of requests) {
      const key = `${r.createdAt.getFullYear()}-${String(r.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (monthly[key]) {
        monthly[key].requests++;
        if (r.status === 'Approved' || r.status === 'CheckedOut' || r.status === 'Returned') monthly[key].approved++;
        if (r.status === 'Returned') monthly[key].returned++;
      }
    }
    res.json({ year, months: Object.values(monthly) });
  } catch (err) { next(err); }
});

router.get('/pm-summary', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentYear = parseInt(req.query.year as string) || new Date().getFullYear();
    const runs = await prisma.pMRun.findMany({
      where: { year: currentYear },
      include: { plan: true },
    });
    const completed = runs.filter(r => r.status === 'COMPLETED').length;
    const total = runs.length;
    const overdue = runs.filter(r => r.status !== 'COMPLETED' && r.plan.endDate && new Date(r.plan.endDate) < new Date()).length;
    const plans = await prisma.pMPlan.findMany({ where: { year: currentYear } });
    const plannedTotal = plans.reduce((s, p) => s + p.plannedDeviceCount, 0);
    // Category & department breakdown via PMRun → asset
    const pmRuns = await prisma.pMRun.findMany({
      where: { year: currentYear },
      select: {
        planId: true, status: true,
        plan: { select: { plannedDeviceCount: true } },
        asset: { select: { category: { select: { id: true, name: true, icon: true } }, departmentId: true } },
      },
    });
    const catBreakdown: Record<string, { name: string; icon: string; total: number; completed: number }> = {};
    const deptBreakdown: Record<string, { name: string; total: number; completed: number }> = {};
    for (const run of pmRuns) {
      const cat = run.asset?.category;
      const catKey = cat?.name || 'อื่นๆ';
      if (!catBreakdown[catKey]) catBreakdown[catKey] = { name: catKey, icon: cat?.icon || '📦', total: 0, completed: 0 };
      catBreakdown[catKey].total += run.plan.plannedDeviceCount;
      if (run.status === 'COMPLETED') catBreakdown[catKey].completed += run.plan.plannedDeviceCount;

      const deptKey = `แผนก${run.asset?.departmentId || 'อื่นๆ'}`;
      if (!deptBreakdown[deptKey]) deptBreakdown[deptKey] = { name: deptKey, total: 0, completed: 0 };
      deptBreakdown[deptKey].total += run.plan.plannedDeviceCount;
      if (run.status === 'COMPLETED') deptBreakdown[deptKey].completed += run.plan.plannedDeviceCount;
    }
    res.json({
      planned: plannedTotal, total, completed, remaining: total - completed, overdue,
      byCategory: Object.values(catBreakdown),
      byDepartment: Object.values(deptBreakdown),
    });
  } catch (err) { next(err); }
});

router.get('/recent-activity', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [recentRequests, recentReturns] = await Promise.all([
      prisma.borrowRequest.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { requester: { select: { displayName: true } } },
      }),
      prisma.return.findMany({
        take: 10,
        orderBy: { returnedAt: 'desc' },
        include: { requestItem: { include: { asset: true } }, returner: { select: { displayName: true } } },
      }),
    ]);
    res.json({ recentRequests, recentReturns });
  } catch (err) { next(err); }
});

router.get('/proactive-alerts', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);

    const [overdueCount, pendingApprovals, upcomingPMs] = await Promise.all([
      prisma.borrowRequestItem.count({
        where: { itemStatus: 'CheckedOut', dueDate: { lt: now } },
      }),
      prisma.borrowRequest.count({
        where: { status: 'Pending' },
      }),
      prisma.pMRun.count({
        where: {
          status: { not: 'COMPLETED' },
          plan: {
            endDate: {
              gte: now,
              lte: nextWeek,
            },
          },
        },
      }),
    ]);

    res.json({
      overdueItems: overdueCount,
      pendingApprovals: pendingApprovals,
      upcomingPMs: upcomingPMs,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
