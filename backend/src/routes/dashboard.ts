import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/asset-summary', authenticate, authorize('IT_ADMIN', 'SUPERADMIN', 'VIEWER'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [byStatus, byDepartment, byCompany, byType, byLocation, total, byCategory, costAgg] = await Promise.all([
      prisma.asset.groupBy({ by: ['status'], _count: true }),
      prisma.asset.groupBy({ by: ['departmentId'], _count: true }),
      prisma.asset.groupBy({ by: ['company'], _count: true }),
      prisma.asset.groupBy({ by: ['type'], _count: true }),
      prisma.asset.groupBy({ by: ['location'], _count: true }),
      prisma.asset.count(),
      prisma.category.findMany({
        where: { isActive: true },
        select: { id: true, name: true, icon: true, _count: { select: { assets: true } } },
        orderBy: { sortOrder: 'asc' },
      }),
      // Total acquisition cost — a real, simple sum. Not a depreciated "book
      // value" (that needs a depreciation policy — useful-life years per
      // category, salvage value — which nothing in this system defines yet).
      prisma.asset.aggregate({ _sum: { purchasePrice: true } }),
    ]);
    const byCategoryFlat = byCategory.map(c => ({
      id: c.id, name: c.name, icon: c.icon, assetCount: c._count.assets,
    }));
    res.json({
      total, byStatus, byDepartment, byCompany, byType, byLocation, byCategory: byCategoryFlat,
      totalPurchaseCost: costAgg._sum.purchasePrice || 0,
    });
  } catch (err) { next(err); }
});

// Small real-data health strip for the dashboard's "module status" card —
// each metric reuses a query already proven elsewhere on the dashboard
// rather than inventing a new health concept.
router.get('/module-status', authenticate, authorize('IT_ADMIN', 'SUPERADMIN', 'VIEWER'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const [
      totalAssets, missingSerial, missingLocation,
      overdueItems,
      pmTotal, pmDone,
      notifSent, notifTotal,
    ] = await Promise.all([
      prisma.asset.count(),
      prisma.asset.count({ where: { OR: [{ serialNo: '' }, { serialNo: '-' }] } }),
      prisma.asset.count({ where: { OR: [{ location: null }, { location: '' }, { location: '-' }] } }),
      prisma.borrowRequestItem.count({ where: { itemStatus: 'CheckedOut', dueDate: { lt: now } } }),
      prisma.pMRun.count({ where: { year: now.getFullYear() } }),
      prisma.pMRun.count({ where: { year: now.getFullYear(), status: 'COMPLETED' } }),
      prisma.notificationOutbox.count({ where: { status: 'SENT' } }),
      prisma.notificationOutbox.count(),
    ]);
    const dataHealthPct = totalAssets > 0
      ? Math.round(((totalAssets * 2 - missingSerial - missingLocation) / (totalAssets * 2)) * 1000) / 10
      : 100;
    res.json({
      assetRegistry: { healthPct: dataHealthPct },
      borrow: { overdueItems },
      pm: { total: pmTotal, done: pmDone, pct: pmTotal > 0 ? Math.round((pmDone / pmTotal) * 1000) / 10 : 0 },
      notifications: { sent: notifSent, total: notifTotal, successPct: notifTotal > 0 ? Math.round((notifSent / notifTotal) * 1000) / 10 : 100 },
    });
  } catch (err) { next(err); }
});

// Top categories with utilization = assets currently deployed (InUse or
// CheckedOut) / total in that category.
router.get('/category-utilization', authenticate, authorize('IT_ADMIN', 'SUPERADMIN', 'VIEWER'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      select: {
        id: true, name: true, icon: true,
        assets: { select: { status: true } },
      },
    });
    const rows = categories
      .map(c => {
        const total = c.assets.length;
        const inUse = c.assets.filter(a => a.status === 'InUse' || a.status === 'Borrowed').length;
        return {
          id: c.id, name: c.name, icon: c.icon, total,
          utilizationPct: total > 0 ? Math.round((inUse / total) * 1000) / 10 : 0,
        };
      })
      .filter(c => c.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
    res.json(rows);
  } catch (err) { next(err); }
});

// Low-stock inventory count — feeds the ops-room parts-shelf desk.
router.get('/inventory-low-stock', authenticate, authorize('IT_ADMIN', 'SUPERADMIN', 'VIEWER'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // Prisma's query builder can't compare two columns of the same row
    // directly in `where`, so pull the two small fields and compare in JS.
    const [items, totalQty] = await Promise.all([
      prisma.inventoryItem.findMany({
        where: { isActive: true },
        select: { availableQuantity: true, minStockLevel: true },
      }),
      prisma.inventoryItem.aggregate({ where: { isActive: true }, _sum: { totalQuantity: true } }),
    ]);
    const lowStockCount = items.filter(i => i.availableQuantity <= i.minStockLevel).length;
    res.json({ lowStockCount, totalQuantity: totalQty._sum.totalQuantity || 0 });
  } catch (err) { next(err); }
});

router.get('/data-health', authenticate, authorize('IT_ADMIN', 'SUPERADMIN', 'VIEWER'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [missingSerial, missingLocation, missingCompany, missingType, outdatedOSCount] = await Promise.all([
      prisma.asset.count({ where: { OR: [{ serialNo: '' }, { serialNo: '-' }] } }),
      prisma.asset.count({ where: { OR: [{ location: null }, { location: '' }, { location: '-' }] } }),
      prisma.asset.count({ where: { OR: [{ company: null }, { company: '' }, { company: '-' }] } }),
      prisma.asset.count({ where: { OR: [{ type: null }, { type: '' }] } }),
      prisma.asset.count({
        where: {
          computerDetail: {
            OR: [
              { osVersion: { contains: 'Windows 7', mode: 'insensitive' } },
              { osVersion: { contains: 'Windows 8', mode: 'insensitive' } },
              { osVersion: { contains: 'Windows 10', mode: 'insensitive' } }
            ]
          }
        }
      }),
    ]);
    res.json({ missingSerial, missingLocation, missingCompany, missingType, outdatedOSCount });
  } catch (err) { next(err); }
});

router.get('/borrow-summary', authenticate, authorize('IT_ADMIN', 'SUPERADMIN', 'VIEWER'), async (_req: Request, res: Response, next: NextFunction) => {
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

router.get('/borrow-trend', authenticate, authorize('IT_ADMIN', 'SUPERADMIN', 'VIEWER'), async (_req: Request, res: Response, next: NextFunction) => {
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

router.get('/pm-summary', authenticate, authorize('IT_ADMIN', 'SUPERADMIN', 'VIEWER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentYear = parseInt(req.query.year as string) || new Date().getFullYear();
    const [runs, plans] = await Promise.all([
      prisma.pMRun.findMany({
        where: { year: currentYear },
        include: {
          plan: true,
          asset: { select: { category: { select: { id: true, name: true, icon: true } }, departmentId: true } },
        },
      }),
      prisma.pMPlan.findMany({ where: { year: currentYear } }),
    ]);
    const completed = runs.filter(r => r.status === 'COMPLETED').length;
    const total = runs.length;
    const overdue = runs.filter(r => r.status !== 'COMPLETED' && r.plan.endDate && new Date(r.plan.endDate) < new Date()).length;
    const plannedTotal = plans.reduce((s, p) => s + p.plannedDeviceCount, 0);
    // Category & department breakdown via PMRun → asset (reuses `runs` above, no second query)
    const catBreakdown: Record<string, { name: string; icon: string; total: number; completed: number }> = {};
    const deptBreakdown: Record<string, { name: string; total: number; completed: number }> = {};
    for (const run of runs) {
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

router.get('/recent-activity', authenticate, authorize('IT_ADMIN', 'SUPERADMIN', 'VIEWER'), async (_req: Request, res: Response, next: NextFunction) => {
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

router.get('/proactive-alerts', authenticate, authorize('IT_ADMIN', 'SUPERADMIN', 'VIEWER'), async (_req: Request, res: Response, next: NextFunction) => {
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


router.get('/warranty-expiring', authenticate, authorize('IT_ADMIN', 'SUPERADMIN', 'VIEWER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const now = new Date();
    const future = new Date();
    future.setDate(now.getDate() + days);

    const [expiring, expired] = await Promise.all([
      prisma.asset.findMany({
        where: {
          warrantyEndDate: { gte: now, lte: future },
          status: { not: 'Retired' },
        },
        select: {
          id: true, assetCode: true, brand: true, model: true,
          warrantyEndDate: true, status: true,
          category: { select: { name: true, icon: true } },
        },
        orderBy: { warrantyEndDate: 'asc' },
        take: 20,
      }),
      prisma.asset.count({
        where: {
          warrantyEndDate: { lt: now },
          status: { not: 'Retired' },
        },
      }),
    ]);

    const result = expiring.map(a => {
      const diff = Math.ceil((new Date(a.warrantyEndDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return { ...a, daysLeft: diff };
    });

    res.json({ expiring: result, expiredCount: expired, days });
  } catch (err) { next(err); }
});

export default router;

