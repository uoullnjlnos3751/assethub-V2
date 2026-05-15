import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { createNotification } from '../services/notification';

const router = Router();

// ── PM Templates ──
router.get('/templates', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const templates = await prisma.pMTemplate.findMany({
      include: { templateItems: true },
      orderBy: { year: 'desc' },
    });
    res.json(templates);
  } catch (err) { next(err); }
});

router.post('/templates', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { year, name, items } = req.body;
    const template = await prisma.pMTemplate.create({
      data: {
        year: parseInt(year),
        name,
        templateItems: {
          create: items.map((item: any) => ({
            key: item.key,
            label: item.label,
            type: item.type || 'boolean',
            required: item.required || false,
            group: item.group || null,
          })),
        },
      },
      include: { templateItems: true },
    });
    res.status(201).json(template);
  } catch (err) { next(err); }
});

// ── PM Plans ──
router.get('/plans', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { year } = req.query;
    const where: any = {};
    if (year) where.year = parseInt(year as string);
    const plans = await prisma.pMPlan.findMany({
      where,
      include: { template: true, runs: { include: { asset: true } } },
      orderBy: [{ year: 'desc' }, { site: 'asc' }],
    });
    res.json(plans);
  } catch (err) { next(err); }
});

router.post('/plans', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { year, site, deptTask, lead, plannedDeviceCount, startDate, endDate, templateId } = req.body;
    const plan = await prisma.pMPlan.create({
      data: {
        year: parseInt(year),
        site,
        deptTask,
        lead,
        plannedDeviceCount: parseInt(plannedDeviceCount),
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        templateId: parseInt(templateId),
      },
    });
    res.status(201).json(plan);
  } catch (err) { next(err); }
});

// ── Generate PM workload ──
router.post('/plans/:id/generate', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const planId = parseInt(req.params.id);
    const plan = await prisma.pMPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new AppError('ไม่พบแผน PM', 404);

    // Find eligible assets (not yet completed PM this year)
    const completedRunAssetIds = (
      await prisma.pMRun.findMany({
        where: { year: plan.year, status: 'COMPLETED' },
        select: { assetId: true },
      })
    ).map(r => r.assetId);

    const eligibleAssets = await prisma.asset.findMany({
      where: {
        id: { notIn: completedRunAssetIds },
        status: { not: 'Retired' },
        ...(plan.site ? { location: { contains: plan.site } } : {}),
        ...(plan.deptTask ? { departmentId: { contains: plan.deptTask } } : {}),
      },
      take: plan.plannedDeviceCount,
    });

    const existingRunAssetIds = (
      await prisma.pMRun.findMany({
        where: { planId, year: plan.year },
        select: { assetId: true },
      })
    ).map(r => r.assetId);

    const newAssets = eligibleAssets.filter(a => !existingRunAssetIds.includes(a.id));

    for (const asset of newAssets) {
      await prisma.pMRun.create({
        data: { planId, assetId: asset.id, year: plan.year, status: 'DRAFT' },
      });
    }

    const gap = plan.plannedDeviceCount - eligibleAssets.length;
    res.json({
      message: `สร้างงาน PM ${newAssets.length} รายการ${gap > 0 ? `, ขาดอีก ${gap} เครื่อง` : ''}`,
      created: newAssets.length,
      gap: gap > 0 ? gap : 0,
    });
  } catch (err) { next(err); }
});

// ── PM Runs ──
router.get('/runs', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { planId, status } = req.query;
    const where: any = {};
    if (planId) where.planId = parseInt(planId as string);
    if (status) where.status = status as string;

    const runs = await prisma.pMRun.findMany({
      where,
      include: { asset: true, performer: { select: { id: true, displayName: true } }, plan: true },
      orderBy: { performedAt: { sort: 'desc', nulls: 'last' } },
    });
    res.json(runs);
  } catch (err) { next(err); }
});

// ── Perform PM ──
router.post('/runs/:id/perform', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const runId = parseInt(req.params.id);
    const { answers } = req.body; // array of { itemId, value }

    const run = await prisma.pMRun.findUnique({ where: { id: runId }, include: { plan: { include: { template: { include: { templateItems: true } } } } } });
    if (!run) throw new AppError('ไม่พบงาน PM', 404);
    if (run.status === 'COMPLETED') throw new AppError('งาน PM นี้ทำเสร็จแล้ว');

    await prisma.$transaction(async (tx) => {
      // Delete old answers if re-performing
      await tx.pMRunAnswer.deleteMany({ where: { runId } });

      if (answers && answers.length > 0) {
        for (const ans of answers) {
          await tx.pMRunAnswer.create({
            data: { runId, itemId: ans.itemId, value: String(ans.value) },
          });
        }
      }

      await tx.pMRun.update({
        where: { id: runId },
        data: {
          status: 'COMPLETED',
          performedBy: req.user!.userId,
          performedAt: run.performedAt || new Date(),
          completedAt: new Date(),
        },
      });
    });

    res.json({ message: 'บันทึกผล PM เรียบร้อย' });
  } catch (err) { next(err); }
});

// ── PM Dashboard ──
router.get('/dashboard', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { year } = req.query;
    const currentYear = year ? parseInt(year as string) : new Date().getFullYear();

    const plans = await prisma.pMPlan.findMany({ where: { year: currentYear } });
    const planIds = plans.map(p => p.id);

    const runs = await prisma.pMRun.findMany({
      where: { planId: { in: planIds } },
      include: { plan: true },
    });

    const completed = runs.filter(r => r.status === 'COMPLETED').length;
    const total = plans.reduce((sum, p) => sum + p.plannedDeviceCount, 0);
    const remaining = total - completed;
    const overdue = runs.filter(r => r.status !== 'COMPLETED' && r.plan.endDate && new Date(r.plan.endDate) < new Date()).length;

    res.json({
      planned: total,
      completed,
      remaining: Math.max(0, remaining),
      overdue,
      plans: plans.map(p => {
        const planRuns = runs.filter(r => r.planId === p.id);
        return {
          ...p,
          completedCount: planRuns.filter(r => r.status === 'COMPLETED').length,
          totalCount: planRuns.length,
        };
      }),
    });
  } catch (err) { next(err); }
});

export default router;
