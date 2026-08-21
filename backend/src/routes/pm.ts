import { Router, Request, Response, NextFunction } from 'express';
import { AssetStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { createNotification } from '../services/notification';
import { fetchGLPISpecBySerial } from '../services/glpi';
import { nextDeviceCode, resolveDevicePrefix } from '../services/deviceCode';
import { fetchAgentRecord, fetchAllAgentRecords } from '../services/externalAgent';
import { buildAgentPmCheck } from '../services/agentPmCheck';
import { buildProcurementReport } from '../services/pmProcurement';
import { getCategoryIdByAssetType } from './assets';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import multer from 'multer';

const router = Router();

// Shared with GET /runs so a single perform/bulk-perform response can patch
// the frontend's run list in place instead of forcing a full refetch.
const RUN_INCLUDE = {
  asset: {
    select: {
      id: true, assetCode: true, assetName: true, brand: true, model: true,
      serialNo: true, ownerName: true, type: true, company: true,
      departmentId: true, location: true, status: true, age: true
    }
  },
  performer: { select: { id: true, displayName: true, adUsername: true } },
  plan: {
    include: {
      template: { include: { templateItems: { orderBy: { order: 'asc' as const } } } },
    },
  },
  answers: { include: { item: true } },
} as const;

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

// Assets in these statuses are not due for PM: Retired/Lost/Damaged are gone
// or unusable, and Maintenance means the device is already being worked on
// so a routine PM check would be redundant until it's back in service.
const PM_EXCLUDED_STATUSES: AssetStatus[] = ['Retired', 'Lost', 'Damaged', 'Maintenance'];

// Shown wherever an asset has no company / type / department recorded.
const UNSPECIFIED = '(ไม่ระบุ)';

function buildPMAssetWhere(plan: { company?: string | null; site?: string | null; deptTask?: string | null; deviceType?: string | null }) {
  return {
    status: { notIn: PM_EXCLUDED_STATUSES },
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
    totalInScope: scopedAssets.length,
    alreadyInYear: existingAssetIds.size,
    available: availableAssetIds.length,
    requestedCount,
    creatable: Math.min(requestedCount, availableAssetIds.length),
    shortage: Math.max(0, requestedCount - availableAssetIds.length),
    availableAssetIds,
  };
}

// ── PM Templates ──
// `?activeOnly=1` hides retired templates. The template manager needs to see
// them all so they can be brought back; the pickers that create work must not
// offer them — two near-identical names ("PM ตรวจนับประจำปี" and
// "PM ตรวจนับประจำปี 2026") are easy to confuse when only one is live.
router.get('/templates', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activeOnly = req.query.activeOnly === '1' || req.query.activeOnly === 'true';
    const templates = await prisma.pMTemplate.findMany({
      where: activeOnly ? { active: true } : {},
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

    await prisma.pMTemplate.update({
      where: { id },
      data: { name, description: description || null },
    });

    const existingItems = await prisma.pMTemplateItem.findMany({ where: { templateId: id } });
    const existingIds = new Set(existingItems.map(i => i.id));

    const toUpdate = incomingItems.filter(i => i.id && existingIds.has(i.id));
    const toCreate = incomingItems.filter(i => !i.id);
    const incomingIdSet = new Set(incomingItems.filter(i => i.id).map(i => i.id));

    const candidateDeleteIds = existingItems
      .filter(i => !incomingIdSet.has(i.id))
      .map(i => i.id);

    const referencedItems = await prisma.pMRunAnswer.findMany({
      where: { itemId: { in: candidateDeleteIds } },
      select: { itemId: true },
      distinct: ['itemId'],
    });
    const referencedIds = new Set(referencedItems.map(r => r.itemId));

    await prisma.$transaction(async (tx) => {
      if (candidateDeleteIds.length > 0) {
        await tx.pMRunAnswer.deleteMany({ where: { itemId: { in: candidateDeleteIds } } });
        await tx.pMTemplateItem.deleteMany({ where: { id: { in: candidateDeleteIds } } });
      }

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

    const keptCount = referencedIds.size;
    res.json({ ...updated, _warning: keptCount > 0 ? `${keptCount} รายการที่มีข้อมูล PM ผูกอยู่ไม่ถูกลบ` : null });
  } catch (err) { next(err); }
});


// GET /pm/leads — people who can be assigned as a plan owner.
//
// The Lead field was free text and every one of the 31 plans in 2569 held
// the literal string "IT Support", so it carried no information and could
// not be filtered or reported on. /admin/users is SUPERADMIN-only, hence
// this narrow read: active IT staff, name and username only.
router.get('/leads', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.appUser.findMany({
      where: { isActive: true, role: { in: ['IT_ADMIN', 'SUPERADMIN'] } },
      select: { id: true, displayName: true, adUsername: true },
      orderBy: { displayName: 'asc' },
    });

    // Whatever the existing plans already carry stays selectable, so editing
    // an old plan cannot silently drop its owner.
    const existing = await prisma.pMPlan.findMany({
      where: { lead: { not: null } },
      distinct: ['lead'],
      select: { lead: true },
    });

    const names = users.map(u => u.displayName || u.adUsername).filter((n): n is string => !!n);
    const seen = new Set(names.map(n => n.toLowerCase()));
    const legacy = existing
      .map(r => (r.lead || '').trim())
      .filter(n => n && !seen.has(n.toLowerCase()));

    res.json({ users: names, legacy });
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
      include: { template: true },
      orderBy: [{ year: 'desc' }, { site: 'asc' }],
    });
    const planIds = plans.map(p => p.id);
    let runStats: any[] = [];
    if (planIds.length > 0) {
      runStats = await (prisma.pMRun.groupBy as any)({
        by: ['planId', 'status'],
        // Exclude runs whose asset has since left service (retired/lost/
        // damaged/under maintenance) — same rule /pm/dashboard and /pm/runs
        // already apply. Without it, a run stuck in DRAFT because nobody
        // will ever perform PM on a retired device keeps the plan's count
        // below 100% forever, showing "เกินกำหนด" even once every device
        // still in service has actually been completed.
        where: { planId: { in: planIds }, asset: { status: { notIn: PM_EXCLUDED_STATUSES } } },
        _count: { id: true },
      });
    }
    const plansWithCounts = plans.map(plan => {
      const planStats = runStats.filter(s => s.planId === plan.id);
      const totalCount = planStats.reduce((acc, curr) => acc + curr._count.id, 0);
      const completedCount = planStats.filter(s => s.status === 'COMPLETED').reduce((acc, curr) => acc + curr._count.id, 0);
      return {
        ...plan,
        totalCount,
        completedCount
      };
    });
    res.json(plansWithCounts);
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


// GET /pm/plans/gaps — scope that no plan covers.
//
// The plan list could say what had been planned but never what had not, and
// this is the page where you would fix that. A company/department pair counts
// as covered when some non-ad-hoc plan names it; everything else is a gap,
// broken down by device type because one plan carries one type.
//
// `free` is the number worth acting on: machines with no PM run at all this
// year. `total` includes ones already picked up by an overlapping plan, which
// is why the two differ and why a row with free = 0 is dropped entirely.
//
// Registered above /plans/:id so "gaps" is not parsed as an id.
router.get('/plans/gaps', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const year = parseInt(String(req.query.year || new Date().getFullYear()));

    const [plans, assets, runs] = await Promise.all([
      prisma.pMPlan.findMany({ where: { year }, select: { company: true, deptTask: true, isAdhoc: true } }),
      prisma.asset.findMany({
        where: { status: { notIn: PM_EXCLUDED_STATUSES } },
        select: { id: true, company: true, departmentId: true, type: true },
      }),
      prisma.pMRun.findMany({ where: { year }, distinct: ['assetId'], select: { assetId: true } }),
    ]);

    // Ad-hoc plans carry no company/department, so they cover nothing in the
    // scoping sense even though their machines do have runs — which the
    // per-asset `inRun` check below still accounts for.
    const covered = new Set(
      plans.filter(pl => !pl.isAdhoc).map(pl => (pl.company || '') + '|' + (pl.deptTask || '')),
    );
    const inRun = new Set(runs.map(r => r.assetId));

    const map = new Map<string, { company: string; dept: string; type: string; total: number; free: number }>();
    for (const a of assets) {
      if (covered.has((a.company || '') + '|' + (a.departmentId || ''))) continue;
      const company = a.company || UNSPECIFIED;
      const dept = a.departmentId || UNSPECIFIED;
      const type = a.type || UNSPECIFIED;
      const key = company + '|' + dept + '|' + type;
      let g = map.get(key);
      if (!g) { g = { company, dept, type, total: 0, free: 0 }; map.set(key, g); }
      g.total++;
      if (!inRun.has(a.id)) g.free++;
    }

    const gaps = [...map.values()].filter(g => g.free > 0).sort((x, y) => y.free - x.free);
    res.json({ year, gaps, totalFree: gaps.reduce((s, g) => s + g.free, 0) });
  } catch (err) { next(err); }
});

router.get('/plans/cleanup-mismatch', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plans = await prisma.pMPlan.findMany();
    let deletedCount = 0;
    for (const plan of plans) {
      if (!plan.deviceType) continue;
      const mismatchRuns = await prisma.pMRun.findMany({
        where: {
          planId: plan.id,
          status: 'DRAFT',
          asset: {
            type: { not: plan.deviceType }
          }
        },
        select: { id: true }
      });
      if (mismatchRuns.length > 0) {
        const runIds = mismatchRuns.map(r => r.id);
        await prisma.pMRunAnswer.deleteMany({
          where: { runId: { in: runIds } }
        });
        const dRes = await prisma.pMRun.deleteMany({
          where: { id: { in: runIds } }
        });
        deletedCount += dRes.count;
      }
    }
    res.json({ message: `ลบงาน PM ที่ไม่ตรงกับประเภทอุปกรณ์สำเร็จ (${deletedCount} รายการ)` });
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

    const completedCount = await prisma.pMRun.count({
      where: { planId: id, status: 'COMPLETED' },
    });

    const data: any = {
      lead,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    };

    if (deviceType !== undefined) {
      data.deviceType = deviceType;
    }
    if (plannedDeviceCount !== undefined) {
      data.plannedDeviceCount = parseInt(plannedDeviceCount);
    }

    if (completedCount === 0) {
      if (year !== undefined) data.year = parseInt(year);
      if (site !== undefined) data.site = site;
      if (deptTask !== undefined) data.deptTask = deptTask;
      if (company !== undefined) data.company = company;
      if (templateId !== undefined) data.templateId = parseInt(templateId);

      const isTargetOrTemplateChanged =
        (year !== undefined && parseInt(year) !== plan.year) ||
        (site !== undefined && site !== plan.site) ||
        (deptTask !== undefined && deptTask !== plan.deptTask) ||
        (company !== undefined && company !== plan.company) ||
        (deviceType !== undefined && deviceType !== plan.deviceType) ||
        (plannedDeviceCount !== undefined && parseInt(plannedDeviceCount) !== plan.plannedDeviceCount) ||
        (templateId !== undefined && parseInt(templateId) !== plan.templateId);

      if (isTargetOrTemplateChanged) {
        const updated = await prisma.$transaction(async (tx) => {
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

    const completedCount = await prisma.pMRun.count({
      where: { planId: id, status: 'COMPLETED' },
    });
    if (completedCount > 0) {
      throw new AppError(`ไม่สามารถลบแผน PM ได้ เนื่องจากมีงาน PM ที่ดำเนินการเสร็จแล้ว ${completedCount} รายการ กรุณาลบงาน PM ที่เสร็จแล้วก่อน`, 400);
    }

    await prisma.$transaction(async (tx) => {
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
    const where: any = {
      asset: { status: { notIn: PM_EXCLUDED_STATUSES } }
    };
    if (planId) where.planId = parseInt(planId as string);
    if (status) where.status = status as string;

    const runs = await prisma.pMRun.findMany({
      where,
      include: RUN_INCLUDE,
      orderBy: { performedAt: { sort: 'desc', nulls: 'last' } },
    });
    res.json(runs);
  } catch (err) { next(err); }
});

/**
 * อ่านรหัสทรัพย์สินที่ช่างกรอก/ระบบส่งมาให้เป็นค่าที่เขียนลงฐานข้อมูลได้
 *
 * ค่าที่รับเข้ามาเคยเป็นสตริงประกอบรูปแบบ `ชื่อ / รหัส` ซึ่งเมื่อจอไม่มีรหัส
 * (109 จาก 212 ตัว) จะได้ `ชื่อ / null` แล้วการตัดเอาท่อนหลังก็เขียนคำว่า
 * "null" ลงคอลัมน์จริง ๆ ตอนนี้ฝั่ง GLPI ส่งเป็นคนละช่องแล้ว แต่คำตอบ PM ที่
 * บันทึกไว้ก่อนหน้านี้ยังมีรูปแบบเก่าค้างอยู่ จึงต้องกันไว้ตรงนี้ด้วย
 */
function parseDeviceCode(input: any): string | null {
  const raw = String(input ?? '').trim();
  if (!raw) return null;
  const tail = raw.includes('/') ? raw.split('/').pop()!.trim() : raw;
  if (!tail) return null;
  if (['null', 'undefined', 'nan', '-'].includes(tail.toLowerCase())) return null;
  return tail;
}

async function generateAssetCode(
  tx: any,
  companyStr: string,
  isPrinter: boolean = false,
  skip: Iterable<string> = [],
): Promise<string> {
  const { prefix } = await resolveDevicePrefix(tx, companyStr, isPrinter);

  // กันสองคำขอที่บันทึกพร้อมกันอ่านเลขล่าสุดตัวเดียวกันแล้วแย่งกันเขียน
  // ปลดล็อกเองเมื่อ transaction จบ
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${prefix}))`;

  return nextDeviceCode(tx, companyStr, isPrinter, { skip });
}

async function processDeviceAnswers(tx: any, run: any, answers: any[], oldAnswers: any[] = []): Promise<any[]> {
  const templateItems = run.plan.template.templateItems;
  const processedAnswers: any[] = [];

  if (Array.isArray(answers)) {
    for (const ans of answers) {
      let itemDef = null;
      if (ans.key) {
        itemDef = templateItems.find((i: any) => i.key === ans.key);
      } else if (ans.itemId) {
        itemDef = templateItems.find((i: any) => i.id === Number(ans.itemId));
      }

      if (itemDef) {
        let value = String(ans.value ?? '');
        const itemTypeUpper = (itemDef.type || '').toUpperCase();

        if (itemTypeUpper === 'MONITOR_ARRAY' || itemTypeUpper === 'PRINTER_ARRAY') {
          const newAssetIds = new Set<number>();
          if (value && value !== 'no') {
            try {
              const devices = JSON.parse(value);
              const isPrinter = itemTypeUpper === 'PRINTER_ARRAY';
              for (let i = 0; i < devices.length; i++) {
                const dev = devices[i];
                let existingAsset = null;
                if (dev.serialNo && dev.serialNo.trim() !== '') {
                  existingAsset = await tx.asset.findFirst({ where: { serialNo: dev.serialNo.trim() } });
                }

                if (!existingAsset) {
                  if (!dev._assetId) {
                    const sNo = dev.serialNo?.trim();
                    if (!sNo) {
                      throw new AppError(`กรุณาระบุ Serial No. สำหรับ ${isPrinter ? 'Printer' : 'Monitor'} ให้ครบถ้วนก่อนบันทึก`, 400);
                    }

                    let finalCode = parseDeviceCode(dev.assetCode) ?? '';

                    let needsFreshCode = !finalCode || finalCode.includes('X') || finalCode.includes('x') || finalCode.includes('ร่าง');
                    if (!needsFreshCode) {
                      // finalCode came from the client (typed, or accepted from an
                      // earlier "use suggested code" preview). That preview can go
                      // stale between when it was shown and when this PM is actually
                      // saved — another save may have taken it in the meantime — so
                      // re-check it's still free instead of trusting it blindly.
                      const taken = await tx.asset.findFirst({ where: { assetCode: finalCode }, select: { id: true } });
                      if (taken) needsFreshCode = true;
                    }
                    if (needsFreshCode) {
                      finalCode = await generateAssetCode(tx, dev.company || run.asset?.company || 'HQ-TRRT', isPrinter);
                    }

                    // Prefer the detected brand/model as the display name (e.g.
                    // "Samsung S24D300H") over a bare "Monitor"/"Printer" label,
                    // which told the technician nothing beyond the device type.
                    const deviceLabel = [dev.brand, dev.model].filter(Boolean).join(' ').trim()
                      || (isPrinter ? 'Printer' : 'Monitor');

                    // เลขครุภัณฑ์ฝ่ายบัญชี — คนละอย่างกับ finalCode (รหัสที่ IT
                    // สร้างอัตโนมัติ). ฝ่ายบัญชีมักออกเลขทีหลังหรือไม่เคยออกเลย
                    // จึงเว้นว่างได้จนกว่าช่างจะทราบและกรอกเข้ามา (ตอนทำ PM
                    // ครั้งนี้หรือครั้งถัดไปก็ได้).
                    const accountingCode = dev.accountingCode && dev.accountingCode.trim() !== ''
                      ? dev.accountingCode.trim()
                      : null;

                    const newAsset = await tx.asset.create({
                      data: {
                        assetCode: finalCode,
                        accountingCode,
                        serialNo: sNo,
                        // ชื่อทรัพย์สิน / รหัสทรัพย์สิน (IT) is the mandatory canonical
                        // identifier (see AssetFormPage.tsx) — defaults to the
                        // system-generated code itself, same as every manually
                        // created asset with no distinct display name. brand/model
                        // still get their own columns and still appear in
                        // deviceLabel below for the per-row "which device was
                        // found" text — just not duplicated into assetName.
                        assetName: finalCode,
                        // 'Monitor มาตรฐาน' (not bare 'Monitor') so the value lands on
                        // one of the actual category_types options for จอภาพ — a bare
                        // 'Monitor' matches no option, so the ประเภทอุปกรณ์ dropdown on
                        // the edit page renders blank even though the field is set.
                        type: isPrinter ? 'Printer' : 'Monitor มาตรฐาน',
                        categoryId: getCategoryIdByAssetType(isPrinter ? 'Printer' : 'Monitor') ?? undefined,
                        company: dev.company || run.asset?.company,
                        brand: dev.brand || '',
                        model: dev.model || '',
                        departmentId: run.asset?.departmentId,
                        location: run.asset?.location,
                        ownerName: run.asset?.ownerName,
                        status: run.asset?.status || 'InUse',
                      }
                    });

                    // Create MonitorDetail if specs are present
                    if (!isPrinter && (dev.screenSize || dev.ports || dev.hasSpeaker !== undefined)) {
                      await tx.monitorDetail.create({
                        data: {
                          assetId: newAsset.id,
                          screenSize: dev.screenSize || null,
                          ports: dev.ports || null,
                          hasSpeaker: !!dev.hasSpeaker,
                        }
                      });
                    }

                    devices[i].assetCode = `${deviceLabel} / ${finalCode}`;
                    devices[i]._assetId = newAsset.id;
                    newAssetIds.add(newAsset.id);
                  }
                } else {
                  // ถ้าอ่านค่าที่ส่งมาไม่ได้ ให้คงรหัสเดิมไว้ ห้ามเขียนทับด้วยขยะ
                  // รหัสที่ส่งมาอาจถูกระเบียนอื่นถือไว้แล้ว — assetCode เป็น unique
                  // ทั้งตาราง การเขียนทับจึงล้มทั้ง transaction (PM run 511 ตายด้วย
                  // P2002 แบบนี้) ถ้าชนก็คงรหัสเดิมไว้ ดีกว่าทำให้ช่างบันทึกงานไม่ได้
                  const requestedCode = parseDeviceCode(dev.assetCode);
                  let finalCode = existingAsset.assetCode;
                  if (requestedCode && requestedCode !== existingAsset.assetCode) {
                    const clash = await tx.asset.findFirst({
                      where: { assetCode: requestedCode, NOT: { id: existingAsset.id } },
                      select: { id: true },
                    });
                    if (!clash) finalCode = requestedCode;
                  }

                  await tx.asset.update({
                    where: { id: existingAsset.id },
                    data: {
                      assetCode: finalCode,
                      accountingCode: dev.accountingCode && dev.accountingCode.trim() !== ''
                        ? dev.accountingCode.trim()
                        : existingAsset.accountingCode,
                      brand: dev.brand || existingAsset.brand,
                      model: dev.model || existingAsset.model,
                      company: dev.company || existingAsset.company,
                      departmentId: run.asset?.departmentId,
                      location: run.asset?.location,
                      ownerName: run.asset?.ownerName,
                      status: run.asset?.status || existingAsset.status,
                    }
                  });

                  // Upsert MonitorDetail if specs are present
                  if (!isPrinter && (dev.screenSize || dev.ports || dev.hasSpeaker !== undefined)) {
                    await tx.monitorDetail.upsert({
                      where: { assetId: existingAsset.id },
                      create: {
                        assetId: existingAsset.id,
                        screenSize: dev.screenSize || null,
                        ports: dev.ports || null,
                        hasSpeaker: !!dev.hasSpeaker,
                      },
                      update: {
                        screenSize: dev.screenSize || null,
                        ports: dev.ports || null,
                        hasSpeaker: !!dev.hasSpeaker,
                      }
                    });
                  }

                  devices[i].assetCode = [existingAsset.assetName || (isPrinter ? 'Printer' : 'Monitor'), finalCode].filter(Boolean).join(' / ');
                  devices[i]._assetId = existingAsset.id;
                  newAssetIds.add(existingAsset.id);
                }
              }
              value = JSON.stringify(devices);
            } catch (e) {
              console.error('Error processing PM devices:', e);
              throw e;
            }
          }

          // Unlinking logic
          const oldAns = oldAnswers.find((oa) => oa.itemId === itemDef.id);
          if (oldAns && oldAns.value && oldAns.value !== 'no') {
            try {
              const oldDevices = JSON.parse(oldAns.value);
              for (const oldDev of oldDevices) {
                if (oldDev._assetId && !newAssetIds.has(Number(oldDev._assetId))) {
                  await tx.asset.update({
                    where: { id: Number(oldDev._assetId) },
                    data: {
                      status: 'Available',
                      ownerName: null,
                    }
                  });
                  // ถอดสายใน CMDB ด้วย ไม่งั้นแท็บ 'อุปกรณ์ที่เชื่อมโยง' จะยังโชว์จอ
                  // ที่ช่างเพิ่งบอกว่าไม่ได้ต่ออยู่แล้ว
                  if (run.assetId) {
                    await tx.assetLink.deleteMany({
                      where: { parentId: run.assetId, childId: Number(oldDev._assetId) },
                    });
                  }
                  console.log(`Unlinked device ${oldDev._assetId} from PM run ${run.id}`);
                }
              }
            } catch (e) {
              console.error('Error parsing old devices for unlinking:', e);
            }
          }

          // ── ผูกอุปกรณ์เข้ากับเครื่องใน CMDB ───────────────────────────
          // ช่างเพิ่งยืนยันด้วยตาว่าจอ/เครื่องพิมพ์ตัวไหนต่ออยู่กับเครื่องนี้ ซึ่งเป็น
          // หลักฐานที่ดีที่สุดที่ระบบจะได้ ก่อนหน้านี้ความรู้นั้นถูกเก็บเป็น JSON ใน
          // คำตอบ checklist อย่างเดียว แท็บ 'อุปกรณ์ที่เชื่อมโยง' จึงว่างทุกเครื่อง
          // (asset_links ทั้งตารางมี 0 แถว)
          if (run.assetId && newAssetIds.size > 0) {
            const linkType = itemTypeUpper === 'PRINTER_ARRAY' ? 'PRINTER' : 'MONITOR';
            for (const childId of newAssetIds) {
              if (childId === run.assetId) continue;   // กันเครื่องผูกกับตัวเอง
              await tx.assetLink.upsert({
                where: { parentId_childId: { parentId: run.assetId, childId } },
                create: { parentId: run.assetId, childId, linkType, note: 'ยืนยันจากการทำ PM' },
                update: { linkType },
              });
            }
          }
        }


        processedAnswers.push({
          runId: run.id,
          itemId: itemDef.id,
          value,
        });
      }
    }
  }
  return processedAnswers;
}

// ── Perform PM ──
router.post('/runs/:id/perform', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const runId = parseInt(req.params.id);
    const { answers, status = 'COMPLETED' } = req.body;
    const nextStatus = ['IN_PROGRESS', 'DRAFT', 'COMPLETED'].includes(status) ? status : 'COMPLETED';

    const run = await prisma.pMRun.findUnique({
      where: { id: runId },
      include: {
        asset: true,
        plan: {
          include: {
            template: {
              include: { templateItems: true }
            }
          }
        }
      }
    });
    if (!run) throw new AppError('ไม่พบงาน PM', 404);
    if (!run.plan.template.templateItems.length) throw new AppError('แผน PM นี้ยังไม่มี Checklist Template', 400);

    const validItemIds = new Set(run.plan.template.templateItems.map((item) => item.id));
    const cleanAnswers = Array.isArray(answers)
      ? answers.filter((ans: any) => validItemIds.has(Number(ans.itemId)))
      : [];

    await prisma.$transaction(async (tx) => {
      const oldAnswers = await tx.pMRunAnswer.findMany({ where: { runId: run.id } });
      await tx.pMRunAnswer.deleteMany({ where: { runId } });

      const processedAnswers = await processDeviceAnswers(tx, run, cleanAnswers, oldAnswers);
      for (const ans of processedAnswers) {
        await tx.pMRunAnswer.create({
          data: ans,
        });
      }

      // Auto-Sync PC Specs
      if (run.assetId && run.asset?.type === 'Computer') {
        const specUpdates: any = {};
        for (const ans of cleanAnswers) {
          const itemDef = run.plan.template.templateItems.find((i) => i.id === Number(ans.itemId));
          if (!itemDef || !ans.value) continue;
          const v = ans.value.split('::')[0];
          if (itemDef.key === 'cpu') specUpdates.cpu = v;
          else if (itemDef.key === 'ram') specUpdates.ram = v;
          else if (itemDef.key === 'storage') specUpdates.storage1 = v;
          else if (itemDef.key === 'windows_version' || itemDef.key === 'os') specUpdates.osVersion = v;
          else if (itemDef.key === 'computer_name') specUpdates.domainName = v;
        }

        if (Object.keys(specUpdates).length > 0) {
          await tx.computerDetail.upsert({
            where: { assetId: run.assetId },
            create: { assetId: run.assetId, ...specUpdates },
            update: { ...specUpdates }
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

    const updated = await prisma.pMRun.findUnique({ where: { id: runId }, include: RUN_INCLUDE });
    res.json(updated);
  } catch (err) { next(err); }
});

// ── PM Dashboard ──

// GET /pm/coverage — the PM dashboard's data source.
//
// /pm/dashboard answers "how far through the plans are we", which is why it
// could report 65% while only a fifth of the fleet was ever put in a plan.
// This endpoint answers the question that was missing: of every asset that is
// DUE for PM, how many are covered by a plan at all? It returns one row per
// eligible asset rather than pre-aggregated counts, so the client can pivot by
// company / device type / state and export the underlying list without a
// round-trip per filter combination. The fleet is a few hundred rows, so the
// payload stays small.
router.get('/coverage', authenticate, authorize('IT_ADMIN', 'SUPERADMIN', 'VIEWER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const year = parseInt(String(req.query.year || new Date().getFullYear()));

    const [assets, runs, plans] = await Promise.all([
      prisma.asset.findMany({
        where: { status: { notIn: PM_EXCLUDED_STATUSES } },
        select: {
          id: true, assetCode: true, serialNo: true, type: true, company: true,
          departmentId: true, location: true, ownerName: true,
        },
        orderBy: { assetCode: 'asc' },
      }),
      prisma.pMRun.findMany({
        where: { year },
        select: { assetId: true, planId: true, status: true, completedAt: true, performedAt: true },
      }),
      prisma.pMPlan.findMany({ where: { year }, orderBy: { id: 'asc' } }),
    ]);

    const adhocPlanIds = new Set(plans.filter(pl => pl.isAdhoc).map(pl => pl.id));

    // State is tracked per source, not just overall, so the dashboard can ask
    // "how much is covered by SCHEDULED PM" separately from "what got picked
    // up ad-hoc". Nine TRR machines are only covered ad-hoc, and rolling that
    // into one number hid the fact that TRR has no scheduled plan at all.
    //
    // An asset counts as DONE for a source if ANY of its runs from that source
    // is complete — a machine can appear in more than one plan, and one
    // finished check is enough for the year.
    type Src = 'plan' | 'adhoc';
    const stateByAsset = new Map<number, Partial<Record<Src, 'DONE' | 'PENDING'>>>();
    for (const run of runs) {
      const src: Src = adhocPlanIds.has(run.planId) ? 'adhoc' : 'plan';
      const entry = stateByAsset.get(run.assetId) || {};
      if (run.status === 'COMPLETED') entry[src] = 'DONE';
      else if (!entry[src]) entry[src] = 'PENDING';
      stateByAsset.set(run.assetId, entry);
    }

    // The overall state keeps DONE winning over PENDING across both sources.
    const overallState = (e?: Partial<Record<Src, 'DONE' | 'PENDING'>>) => {
      if (!e) return 'UNPLANNED';
      if (e.plan === 'DONE' || e.adhoc === 'DONE') return 'DONE';
      if (e.plan || e.adhoc) return 'PENDING';
      return 'UNPLANNED';
    };

    const rows = assets.map(a => ({
      a: a.assetCode || '',
      n: a.serialNo || '',
      o: a.ownerName || '',
      t: a.type || UNSPECIFIED,
      c: a.company || UNSPECIFIED,
      d: a.departmentId || UNSPECIFIED,
      l: a.location || '',
      s: overallState(stateByAsset.get(a.id)),
      // per-source state; omitted when the asset has no run from that source
      sp: stateByAsset.get(a.id)?.plan || null,
      sa: stateByAsset.get(a.id)?.adhoc || null,
    }));

    const runsByPlan = new Map<number, { total: number; done: number }>();
    for (const run of runs) {
      const acc = runsByPlan.get(run.planId) || { total: 0, done: 0 };
      acc.total++;
      if (run.status === 'COMPLETED') acc.done++;
      runsByPlan.set(run.planId, acc);
    }

    const monthly: Record<string, number> = {};
    for (const run of runs) {
      if (run.status !== 'COMPLETED') continue;
      const when = run.completedAt || run.performedAt;
      if (!when) continue;
      const key = when.getFullYear() + '-' + String(when.getMonth() + 1).padStart(2, '0');
      monthly[key] = (monthly[key] || 0) + 1;
    }

    res.json({
      year,
      generated: new Date().toISOString(),
      rows,
      plans: plans.map(pl => {
        const acc = runsByPlan.get(pl.id) || { total: 0, done: 0 };
        return {
          id: pl.id, site: pl.site, dept: pl.deptTask, company: pl.company, lead: pl.lead,
          deviceType: pl.deviceType, planned: pl.plannedDeviceCount,
          generated: acc.total, done: acc.done,
          startDate: pl.startDate, endDate: pl.endDate, isAdhoc: pl.isAdhoc,
        };
      }),
      monthly,
    });
  } catch (err) { next(err); }
});

router.get('/dashboard', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { year } = req.query;
    const currentYear = year ? parseInt(year as string) : new Date().getFullYear();

    const plans = await prisma.pMPlan.findMany({ where: { year: currentYear } });
    const planIds = plans.map(p => p.id);

    const runs = await prisma.pMRun.findMany({
      where: {
        planId: { in: planIds },
        asset: { status: { notIn: PM_EXCLUDED_STATUSES } }
      },
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
      include: { asset: true, plan: { include: { template: { include: { templateItems: true } } } } }
    });

    if (validRuns.length === 0) throw new AppError('ไม่พบรายการ PM ที่ระบุ', 404);

    await prisma.$transaction(async (tx) => {
      for (const run of validRuns) {
        const oldAnswers = await tx.pMRunAnswer.findMany({ where: { runId: run.id } });
        await tx.pMRunAnswer.deleteMany({ where: { runId: run.id } });

        const processedAnswers = await processDeviceAnswers(tx, run, answers, oldAnswers);
        if (processedAnswers.length > 0) {
          await tx.pMRunAnswer.createMany({
            data: processedAnswers,
          });
        }

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

    const updated = await prisma.pMRun.findMany({ where: { id: { in: validRuns.map((r) => r.id) } }, include: RUN_INCLUDE });
    res.json({ message: `บันทึกผล PM แบบกลุ่มสำเร็จทั้งหมด ${validRuns.length} รายการ`, runs: updated });
  } catch (err) { next(err); }
});

// สรุปผล PM เป็นข้อเสนอให้หน่วยงานเอาไปขออนุมัติจัดซื้อ
// ออกได้ตลอดเวลา ไม่ต้องรอ PM ครบ — แต่แสดง % ความครบไว้บนหัวเอกสารเสมอ
router.get('/procurement-report', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const company = String(req.query.company ?? '').trim();
    if (!company) throw new AppError('ต้องระบุบริษัท', 400);
    const year = parseInt(String(req.query.year ?? '')) || new Date().getFullYear();
    res.json(await buildProcurementReport(prisma, company, year));
  } catch (err) { next(err); }
});

// ── สิ่งที่ Agent ตรวจเจอ สำหรับหน้าทำ PM ─────────────────────────────
//
// อ่านอย่างเดียว ไม่เขียนอะไรทั้งสิ้น — ช่างเป็นคนตัดสินว่าจะรับคำตอบที่ Agent
// เสนอหรือไม่ ส่วน findings เป็นข้อมูลประกอบการตรวจ ไม่ถูกบันทึกเป็นคำตอบ
router.get('/runs/:id/agent-check', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const run = await prisma.pMRun.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { asset: { select: { assetName: true, serialNo: true, snComputer: true } } },
    });
    if (!run) throw new AppError('ไม่พบรายการ PM', 404);
    const asset = run.asset;
    if (!asset) throw new AppError('รายการ PM นี้ไม่มีทรัพย์สินผูกอยู่', 400);

    // ลองด้วยชื่อเครื่องก่อนเพราะเป็นคีย์ที่ Agent ใช้ ถ้าไม่เจอค่อยไล่หาจาก Serial
    // (ชื่อในทะเบียนกับ hostname จริงไม่ตรงกันได้ — เพิ่งแก้ไป 142 เครื่อง)
    let record: any = asset.assetName ? await fetchAgentRecord(asset.assetName) : null;
    if (!record) {
      const wanted = [asset.serialNo, asset.snComputer]
        .map(s => String(s ?? '').trim().toLowerCase()).filter(Boolean);
      if (wanted.length) {
        const hit = (await fetchAllAgentRecords())
          .find((r: any) => wanted.includes(String(r?.serial_number ?? '').trim().toLowerCase()));
        if (hit?.hostname) record = await fetchAgentRecord(hit.hostname);
      }
    }

    res.json(buildAgentPmCheck(record));
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

    const spec = await fetchGLPISpecBySerial(run.asset.serialNo, run.asset.company);
    if (!spec) {
      throw new AppError('ไม่พบข้อมูลฮาร์ดแวร์ในระบบ GLPI สำหรับ Serial Number นี้', 404);
    }

    res.json(spec);
  } catch (err) { next(err); }
});

// ── Delete PM Run ──
router.delete('/runs/:id', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.$transaction(async (tx) => {
      const run = await tx.pMRun.findUnique({ where: { id } });
      if (!run) throw new AppError('ไม่พบงาน PM', 404);
      await tx.pMRunAnswer.deleteMany({ where: { runId: id } });
      await tx.pMRun.delete({ where: { id } });
    });
    res.json({ message: 'ลบงาน PM สำเร็จ' });
  } catch (err) { next(err); }
});

// Freeform remark on a PM run (e.g. "owner busy, will reschedule to <date>")
// kept separate from /perform so staff can leave a note without touching the
// checklist/status.
router.patch('/runs/:id/notes', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const notes = typeof req.body.notes === 'string' ? req.body.notes.trim() : '';
    const run = await prisma.pMRun.findUnique({ where: { id } });
    if (!run) throw new AppError('ไม่พบงาน PM', 404);
    const updated = await prisma.pMRun.update({ where: { id }, data: { notes: notes || null } });
    res.json(updated);
  } catch (err) { next(err); }
});

// ── Helpers for PM Components ──
router.post('/upload-temp', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), pmPhotoUpload.single('file'), (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new AppError('กรุณาอัพโหลดไฟล์', 400);
    const fileUrl = `/uploads/pm/${req.file.filename}`;
    res.json({ url: fileUrl });
  } catch (err) { next(err); }
});

router.get('/check-serial', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { serialNo } = req.query;
    if (!serialNo) return res.json({ found: false });
    const asset = await prisma.asset.findFirst({
      where: { serialNo: String(serialNo), status: { notIn: PM_EXCLUDED_STATUSES } },
      select: {
        id: true,
        assetCode: true,
        serialNo: true,
        assetName: true,
        brand: true,
        model: true,
        type: true,
        company: true,
        monitorDetail: {
          select: {
            screenSize: true,
            ports: true,
            hasSpeaker: true
          }
        }
      }
    });
    if (asset) {
      res.json({ found: true, asset });
    } else {
      res.json({ found: false });
    }
  } catch (err) { next(err); }
});

router.get('/preview-monitor-code', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // เรียกตัวเดียวกับตอนบันทึกจริง (services/deviceCode.ts) — เดิมเป็นโค้ด
    // คนละชุดที่ลอกกันมาแล้วเพี้ยน: ตรงนี้ประกอบ prefix จาก query ดิบ ๆ ที่ยังมี
    // เว้นวรรค ('TRR HQ-M') ส่วนตอนบันทึกตัดเว้นวรรคทิ้ง ('TRRHQ-M') ช่างจึงเห็น
    // เลขหนึ่งแต่ระบบเขียนอีกเลขหนึ่ง
    const code = await nextDeviceCode(prisma, req.query.company, false, {
      offset: parseInt(String(req.query.index || '0'), 10) || 0,
    });
    res.json({ code });
  } catch (err) { next(err); }
});

router.get('/preview-printer-code', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // เรียกตัวเดียวกับตอนบันทึกจริง (services/deviceCode.ts) — เดิมเป็นโค้ด
    // คนละชุดที่ลอกกันมาแล้วเพี้ยน: ตรงนี้ประกอบ prefix จาก query ดิบ ๆ ที่ยังมี
    // เว้นวรรค ('TRR HQ-M') ส่วนตอนบันทึกตัดเว้นวรรคทิ้ง ('TRRHQ-M') ช่างจึงเห็น
    // เลขหนึ่งแต่ระบบเขียนอีกเลขหนึ่ง
    const code = await nextDeviceCode(prisma, req.query.company, true, {
      offset: parseInt(String(req.query.index || '0'), 10) || 0,
    });
    res.json({ code });
  } catch (err) { next(err); }
});

// ── Ad-hoc PM ──
router.get('/runs/adhoc-search', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = String(req.query.q || '').trim();
    if (q.length < 3) return res.json({ data: [] });
    const assets = await prisma.asset.findMany({
      where: {
        OR: [
          { assetCode: { contains: q, mode: 'insensitive' } },
          { serialNo: { contains: q, mode: 'insensitive' } },
          { assetName: { contains: q, mode: 'insensitive' } },
          { ownerName: { contains: q, mode: 'insensitive' } },
        ],
        status: { notIn: PM_EXCLUDED_STATUSES },
      },
      take: 10,
    });
    res.json({ data: assets });
  } catch (err) { next(err); }
});

// Checked from the asset detail page's PM tab before offering "start PM" / "continue PM" —
// tells the caller whether this asset already has a PM run for the current year.
router.get('/runs/adhoc-check/:assetId', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assetId = parseInt(req.params.assetId);
    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) throw new AppError('ไม่พบทรัพย์สิน', 404);

    const year = new Date().getFullYear();
    const existingRun = await prisma.pMRun.findFirst({
      where: { assetId, year },
      select: { id: true, status: true },
    });

    res.json({ eligible: true, existingRun });
  } catch (err) { next(err); }
});

router.post('/runs/adhoc', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { assetId, templateId } = req.body;
    if (!assetId || !templateId) throw new AppError('ระบุ assetId และ templateId ไม่ครบ', 400);

    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) throw new AppError('ไม่พบทรัพย์สิน', 404);

    const year = new Date().getFullYear();
    let plan = await prisma.pMPlan.findFirst({
      where: { year, site: 'Ad-hoc', deptTask: 'Ad-hoc', company: 'Ad-hoc', deviceType: asset.type },
    });

    if (!plan) {
      plan = await prisma.pMPlan.create({
        data: {
          year,
          site: 'Ad-hoc',
          deptTask: 'Ad-hoc',
          company: 'Ad-hoc',
          deviceType: asset.type,
          lead: 'Ad-hoc',
          plannedDeviceCount: 1,
          templateId,
        },
      });
    } else {
      await prisma.pMPlan.update({
        where: { id: plan.id },
        data: { plannedDeviceCount: plan.plannedDeviceCount + 1 },
      });
    }

    const run = await prisma.pMRun.create({
      data: {
        planId: plan.id,
        assetId,
        year,
        status: 'DRAFT',
      },
      include: {
        asset: true,
        plan: { include: { template: { include: { templateItems: { orderBy: { order: 'asc' } } } } } },
      },
    });

    res.json({ run });
  } catch (err) { next(err); }
});

export default router;
