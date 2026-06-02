import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { createNotification } from '../services/notification';
import { fetchGLPISpecBySerial } from '../services/glpi';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import multer from 'multer';

const router = Router();

const PM_UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'pm');
fs.mkdirSync(PM_UPLOAD_DIR, { recursive: true });

const pmPhotoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req: any, _file: any, cb: any) => cb(null, PM_UPLOAD_DIR),
    filename: (_req: any, file: any, cb: any) => {
      const ext = path.extname(file.originalname);
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req: any, file: any, cb: any) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('ประเภทไฟล์ไม่รองรับ (รองรับเฉพาะไฟล์รูปภาพ)'));
  },
});

function buildPMAssetWhere(plan: { company?: string | null; site?: string | null; deptTask?: string | null; deviceType?: string | null }) {
  return {
    status: { not: 'Retired' as const },
    ...(plan.company ? { company: { contains: plan.company } } : {}),
    ...(plan.site ? { location: { contains: plan.site } } : {}),
    ...(plan.deptTask ? { departmentId: { contains: plan.deptTask } } : {}),
    ...(plan.deviceType ? { type: plan.deviceType } : {}),
  };
}

async function getPMEligibility(client: any, plan: { year: number; company?: string | null; site?: string | null; deptTask?: string | null; deviceType?: string | null; plannedDeviceCount?: number | string | null }) {
  const scopedAssets = await client.asset.findMany({
    where: buildPMAssetWhere(plan),
    select: { id: true },
  });
  const scopedAssetIds = scopedAssets.map((asset: { id: number }) => asset.id);
  const existingRuns = scopedAssetIds.length > 0
    ? await client.pMRun.findMany({
      where: { year: plan.year, assetId: { in: scopedAssetIds } },
      distinct: ['assetId'],
      select: { assetId: true },
    })
    : [];
  const existingAssetIds = new Set(existingRuns.map((run: { assetId: number }) => run.assetId));
  const availableAssetIds = scopedAssetIds.filter((id: number) => !existingAssetIds.has(id));
  const requestedCount = Math.max(0, parseInt(String(plan.plannedDeviceCount ?? availableAssetIds.length), 10) || 0);

  return {
    totalInScope: scopedAssetIds.length,
    alreadyInYear: existingAssetIds.size,
    available: availableAssetIds.length,
    requestedCount,
    creatable: Math.min(requestedCount, availableAssetIds.length),
    shortage: Math.max(0, requestedCount - availableAssetIds.length),
    availableAssetIds,
  };
}

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
    const { year, name, description, items } = req.body;
    const template = await prisma.pMTemplate.create({
      data: {
        year: year ? parseInt(year) : new Date().getFullYear(),
        name,
        description: description || null,
        templateItems: {
          create: (items || []).map((item: any, idx: number) => ({
            key: item.key,
            label: item.label,
            type: item.type || 'boolean',
            required: item.required || false,
            group: item.group || null,
            order: item.order || idx + 1,
          })),
        },
      },
      include: { templateItems: { orderBy: { order: 'asc' } } },
    });
    res.status(201).json(template);
  } catch (err) { next(err); }
});

router.put('/templates/:id', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description, items } = req.body;

    if (!name) throw new AppError('ต้องระบุชื่อ Template', 400);

    const incomingItems: any[] = items || [];

    // Step 1: Update template name/description
    await prisma.pMTemplate.update({
      where: { id },
      data: { name, description: description || null },
    });

    // Step 2: Get existing items for this template
    const existingItems = await prisma.pMTemplateItem.findMany({ where: { templateId: id } });
    const existingIds = new Set(existingItems.map(i => i.id));

    // Step 3: Separate incoming items into "has id" (update) vs "no id" (create)
    const toUpdate = incomingItems.filter(i => i.id && existingIds.has(i.id));
    const toCreate = incomingItems.filter(i => !i.id);
    const incomingIdSet = new Set(incomingItems.filter(i => i.id).map(i => i.id));

    // Step 4: Items to potentially delete = existing items not in incoming list
    const candidateDeleteIds = existingItems
      .filter(i => !incomingIdSet.has(i.id))
      .map(i => i.id);

    // Step 5: Check which candidates have PMRunAnswer references (cannot delete)
    const referencedItems = await prisma.pMRunAnswer.findMany({
      where: { itemId: { in: candidateDeleteIds } },
      select: { itemId: true },
      distinct: ['itemId'],
    });
    const referencedIds = new Set(referencedItems.map(r => r.itemId));
    const safeToDeleteIds = candidateDeleteIds.filter(i => !referencedIds.has(i));

    await prisma.$transaction(async (tx) => {
      // Delete items with no answer references
      if (safeToDeleteIds.length > 0) {
        await tx.pMTemplateItem.deleteMany({ where: { id: { in: safeToDeleteIds } } });
      }

      // Update existing items
      for (const item of toUpdate) {
        await tx.pMTemplateItem.update({
          where: { id: item.id },
          data: {
            key: item.key,
            label: item.label,
            type: item.type || 'boolean',
            required: item.required || false,
            group: item.group || null,
            order: item.order ?? 0,
          },
        });
      }

      // Create new items
      if (toCreate.length > 0) {
        await tx.pMTemplateItem.createMany({
          data: toCreate.map((item, idx) => ({
            templateId: id,
            key: item.key || `item_${Date.now()}_${idx}`,
            label: item.label,
            type: item.type || 'boolean',
            required: item.required || false,
            group: item.group || null,
            order: item.order ?? (toUpdate.length + idx + 1),
          })),
        });
      }
    });

    const updated = await prisma.pMTemplate.findUnique({
      where: { id },
      include: { templateItems: { orderBy: { order: 'asc' } } },
    });

    // Warn if some items were kept due to existing answers
    const keptCount = referencedIds.size;
    res.json({ ...updated, _warning: keptCount > 0 ? `${keptCount} รายการที่มีข้อมูล PM ผูกอยู่ไม่ถูกลบ` : null });
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
    const { year, site, deptTask, company, lead, plannedDeviceCount, startDate, endDate, templateId, deviceType } = req.body;
    const plan = await prisma.pMPlan.create({
      data: {
        year: parseInt(year),
        site,
        deptTask,
        company,
        deviceType,
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

router.get('/plans/eligibility', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const year = parseInt(String(req.query.year || new Date().getFullYear()));
    const summary = await getPMEligibility(prisma, {
      year,
      company: req.query.company ? String(req.query.company) : null,
      site: req.query.site ? String(req.query.site) : null,
      deptTask: req.query.deptTask ? String(req.query.deptTask) : null,
      deviceType: req.query.deviceType ? String(req.query.deviceType) : null,
      plannedDeviceCount: req.query.plannedDeviceCount ? String(req.query.plannedDeviceCount) : null,
    });
    const { availableAssetIds, ...safeSummary } = summary;
    res.json(safeSummary);
  } catch (err) { next(err); }
});

router.put('/plans/:id', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const { year, site, deptTask, company, lead, plannedDeviceCount, startDate, endDate, templateId, deviceType } = req.body;

    const plan = await prisma.pMPlan.findUnique({ where: { id } });
    if (!plan) throw new AppError('ไม่พบแผน PM', 404);

    // Check if there are any completed runs
    const completedCount = await prisma.pMRun.count({
      where: { planId: id, status: 'COMPLETED' },
    });

    const data: any = {
      lead,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    };

    if (completedCount === 0) {
      if (year !== undefined) data.year = parseInt(year);
      if (site !== undefined) data.site = site;
      if (deptTask !== undefined) data.deptTask = deptTask;
      if (company !== undefined) data.company = company;
      if (deviceType !== undefined) data.deviceType = deviceType;
      if (plannedDeviceCount !== undefined) data.plannedDeviceCount = parseInt(plannedDeviceCount);
      if (templateId !== undefined) data.templateId = parseInt(templateId);

      // Check if target criteria or template actually changed
      const isTargetOrTemplateChanged =
        (year !== undefined && parseInt(year) !== plan.year) ||
        (site !== undefined && site !== plan.site) ||
        (deptTask !== undefined && deptTask !== plan.deptTask) ||
        (company !== undefined && company !== plan.company) ||
        (deviceType !== undefined && deviceType !== plan.deviceType) ||
        (plannedDeviceCount !== undefined && parseInt(plannedDeviceCount) !== plan.plannedDeviceCount) ||
        (templateId !== undefined && parseInt(templateId) !== plan.templateId);

      // Check if runs exist (they must be drafts since completedCount === 0)
      const runCount = await prisma.pMRun.count({ where: { planId: id } });

      if (isTargetOrTemplateChanged && runCount > 0) {
        // Run as a transaction to delete old draft runs and answers, update plan, and generate new workload
        const updated = await prisma.$transaction(async (tx) => {
          // Get existing runs to delete answers
          const runs = await tx.pMRun.findMany({
            where: { planId: id },
            select: { id: true },
          });
          const runIds = runs.map(r => r.id);
          if (runIds.length > 0) {
            await tx.pMRunAnswer.deleteMany({
              where: { runId: { in: runIds } },
            });
            await tx.pMRun.deleteMany({
              where: { planId: id },
            });
          }

          // Update the plan
          const updatedPlan = await tx.pMPlan.update({
            where: { id },
            data,
          });

          const eligibility = await getPMEligibility(tx, updatedPlan);
          const eligibleAssets = await tx.asset.findMany({
            where: { id: { in: eligibility.availableAssetIds } },
            take: updatedPlan.plannedDeviceCount,
          });

          for (const asset of eligibleAssets) {
            await tx.pMRun.create({
              data: {
                planId: id,
                assetId: asset.id,
                year: updatedPlan.year,
                status: 'DRAFT',
              },
            });
          }

          return updatedPlan;
        });

        return res.json(updated);
      }
    }

    const updated = await prisma.pMPlan.update({
      where: { id },
      data,
    });

    res.json(updated);
  } catch (err) { next(err); }
});

router.delete('/plans/:id', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const plan = await prisma.pMPlan.findUnique({ where: { id } });
    if (!plan) throw new AppError('ไม่พบแผน PM', 404);

    // Safely delete associated runs and answers in a transaction

    // Safely delete associated draft runs and answers in a transaction
    await prisma.$transaction(async (tx) => {
      const runs = await tx.pMRun.findMany({
        where: { planId: id },
        select: { id: true },
      });
      const runIds = runs.map(r => r.id);

      if (runIds.length > 0) {
        // Delete answers
        await tx.pMRunAnswer.deleteMany({
          where: { runId: { in: runIds } },
        });
        // Delete runs
        await tx.pMRun.deleteMany({
          where: { planId: id },
        });
      }

      // Delete plan
      await tx.pMPlan.delete({
        where: { id },
      });
    });

    res.json({ message: 'ลบแผน PM สำเร็จ' });
  } catch (err) { next(err); }
});


// ── Generate PM workload ──
router.post('/plans/:id/generate', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const planId = parseInt(req.params.id);
    const plan = await prisma.pMPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new AppError('ไม่พบแผน PM', 404);

    const eligibility = await getPMEligibility(prisma, plan);
    const eligibleAssets = await prisma.asset.findMany({
      where: { id: { in: eligibility.availableAssetIds } },
      take: plan.plannedDeviceCount,
    });

    const newAssets = eligibleAssets;

    for (const asset of newAssets) {
      await prisma.pMRun.create({
        data: { planId, assetId: asset.id, year: plan.year, status: 'DRAFT' },
      });
    }

    const remainingAfterGenerate = Math.max(0, eligibility.available - newAssets.length);
    res.json({
      message: `สร้างงาน PM ${newAssets.length} รายการ${eligibility.shortage > 0 ? `, เครื่องใน scope ไม่พออีก ${eligibility.shortage} เครื่อง` : ''}${remainingAfterGenerate > 0 ? `, ยังเหลือ ${remainingAfterGenerate} เครื่องที่ยังสร้างเพิ่มได้` : ''}`,
      created: newAssets.length,
      gap: eligibility.shortage,
      totalInScope: eligibility.totalInScope,
      alreadyInYear: eligibility.alreadyInYear,
      availableBeforeGenerate: eligibility.available,
      remainingAfterGenerate,
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
      include: {
        asset: true,
        performer: { select: { id: true, displayName: true, adUsername: true } },
        plan: {
          include: {
            template: { include: { templateItems: { orderBy: { order: 'asc' } } } },
          },
        },
        answers: { include: { item: true } },
      },
      orderBy: { performedAt: { sort: 'desc', nulls: 'last' } },
    });
    res.json(runs);
  } catch (err) { next(err); }
});

// ── Perform PM ──
router.post('/runs/:id/perform', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const runId = parseInt(req.params.id);
    const { answers, status = 'COMPLETED' } = req.body; // array of { itemId, value }
    const nextStatus = status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'COMPLETED';

    const run = await prisma.pMRun.findUnique({ where: { id: runId }, include: { plan: { include: { template: { include: { templateItems: true } } } } } });
    if (!run) throw new AppError('ไม่พบงาน PM', 404);
    if (!run.plan.template.templateItems.length) throw new AppError('แผน PM นี้ยังไม่มี Checklist Template', 400);

    const validItemIds = new Set(run.plan.template.templateItems.map((item) => item.id));
    const cleanAnswers = Array.isArray(answers)
      ? answers.filter((ans: any) => validItemIds.has(Number(ans.itemId)))
      : [];

    await prisma.$transaction(async (tx) => {
      // Delete old answers if re-performing
      await tx.pMRunAnswer.deleteMany({ where: { runId } });

      if (cleanAnswers.length > 0) {
        for (const ans of cleanAnswers) {
          await tx.pMRunAnswer.create({
            data: { runId, itemId: Number(ans.itemId), value: String(ans.value ?? '') },
          });
        }
      }

      await tx.pMRun.update({
        where: { id: runId },
        data: {
          status: nextStatus,
          performedBy: req.user!.userId,
          performedAt: run.performedAt || new Date(),
          completedAt: nextStatus === 'COMPLETED' ? (run.completedAt || new Date()) : null,
        },
      });
    });

    res.json({ message: nextStatus === 'COMPLETED' ? 'บันทึกผล PM เรียบร้อย' : 'บันทึกร่าง PM เรียบร้อย' });
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

// ── PM Run Photo Upload ──
router.post('/runs/:id/upload', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), pmPhotoUpload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const run = await prisma.pMRun.findUnique({ where: { id } });
    if (!run) throw new AppError('ไม่พบงาน PM', 404);
    if (!req.file) throw new AppError('ไม่พบไฟล์รูปภาพ', 400);

    // Delete old file if exists
    if (run.photoUrl) {
      const oldPath = path.join(PM_UPLOAD_DIR, run.photoUrl);
      if (fs.existsSync(oldPath)) {
        try { fs.unlinkSync(oldPath); } catch (e) { console.error('Error deleting old photo:', e); }
      }
    }

    const updated = await prisma.pMRun.update({
      where: { id },
      data: { photoUrl: req.file.filename },
    });

    res.json(updated);
  } catch (err) { next(err); }
});

// ── Bulk Perform PM ──
router.post('/runs/bulk-perform', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { runIds, answers } = req.body;
    if (!Array.isArray(runIds) || runIds.length === 0) {
      throw new AppError('ต้องเลือกรายการ PM อย่างน้อย 1 รายการ', 400);
    }

    const validRuns = await prisma.pMRun.findMany({
      where: { id: { in: runIds } },
      include: { plan: { include: { template: { include: { templateItems: true } } } } }
    });

    if (validRuns.length === 0) throw new AppError('ไม่พบรายการ PM ที่ระบุ', 404);

    await prisma.$transaction(async (tx) => {
      // For each run, delete old answers and create new ones
      for (const run of validRuns) {
        await tx.pMRunAnswer.deleteMany({ where: { runId: run.id } });

        const validItemIds = new Set(run.plan.template.templateItems.map(item => item.id));
        const cleanAnswers = Array.isArray(answers)
          ? answers.filter((ans: any) => validItemIds.has(Number(ans.itemId)))
          : [];

        if (cleanAnswers.length > 0) {
          await tx.pMRunAnswer.createMany({
            data: cleanAnswers.map((ans: any) => ({
              runId: run.id,
              itemId: Number(ans.itemId),
              value: String(ans.value ?? ''),
            })),
          });
        }

        // Update PMRun status
        await tx.pMRun.update({
          where: { id: run.id },
          data: {
            status: 'COMPLETED',
            performedBy: req.user!.userId,
            performedAt: new Date(),
            completedAt: new Date(),
          },
        });
      }
    });

    res.json({ message: `บันทึกผล PM แบบกลุ่มสำเร็จทั้งหมด ${validRuns.length} รายการ` });
  } catch (err) { next(err); }
});

// ── Fetch GLPI Spec for PM Run ──
router.get('/runs/:id/glpi-spec', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const run = await prisma.pMRun.findUnique({
      where: { id },
      include: { asset: true },
    });
    if (!run) throw new AppError('ไม่พบงาน PM', 404);
    if (!run.asset?.serialNo) {
      throw new AppError('ทรัพย์สินนี้ไม่มี Serial Number สำหรับดึงข้อมูลจาก GLPI', 400);
    }

    const spec = await fetchGLPISpecBySerial(run.asset.serialNo);
    if (!spec) {
      throw new AppError('ไม่พบข้อมูลฮาร์ดแวร์ในระบบ GLPI สำหรับ Serial Number นี้', 404);
    }

    res.json(spec);
  } catch (err) { next(err); }
});

export default router;
