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

router.get('/pm-summary', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const currentYear = new Date().getFullYear();
    const runs = await prisma.pMRun.findMany({
      where: { year: currentYear },
      include: { plan: true },
    });
    const completed = runs.filter(r => r.status === 'COMPLETED').length;
    const total = runs.length;
    const overdue = runs.filter(r => r.status !== 'COMPLETED' && r.plan.endDate && new Date(r.plan.endDate) < new Date()).length;
    const plans = await prisma.pMPlan.findMany({ where: { year: currentYear } });
    const plannedTotal = plans.reduce((s, p) => s + p.plannedDeviceCount, 0);
    res.json({ planned: plannedTotal, total, completed, remaining: total - completed, overdue });
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

export default router;
