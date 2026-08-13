// Extracted from routes/assets.ts (which had grown to 2700+ lines) as pure
// code motion — no behavior change. This covers CRUD + "import distinct
// values from existing assets" for the five master-data resource types that
// back the asset form's dropdowns: device types, locations, companies,
// vendors, and asset statuses.
//
// Mounted at the same base path as assets.ts (see app.ts) and MUST be
// registered before assetRoutes there: these are fixed top-level segments
// (e.g. /device-types), and assets.ts's GET /:id would otherwise treat a
// request like GET /api/assets/device-types as "get asset with id
// 'device-types'" once this block was no longer defined inline ahead of it.
import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { ASSET_STATUS_OPTIONS } from '../utils/assetConstants';
import { cleanMasterValue } from '../utils/assetHelpers';

const router = Router();

router.get('/device-types', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [types, assetCounts] = await Promise.all([
      prisma.deviceType.findMany({ orderBy: { name: 'asc' } }),
      prisma.asset.groupBy({
        by: ['type'],
        where: { type: { not: null } },
        _count: { type: true },
      }),
    ]);

    const countByType = new Map(assetCounts.map((row) => [row.type, row._count.type]));
    res.json(types.map((type) => ({ ...type, assetCount: countByType.get(type.name) || 0 })));
  } catch (err) { next(err); }
});

router.post('/device-types', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const name = String(req.body.name || '').trim();
    const description = req.body.description ? String(req.body.description).trim() : null;
    if (!name) throw new AppError('กรุณาระบุประเภทอุปกรณ์');

    const created = await prisma.deviceType.create({
      data: { name, description, isActive: req.body.isActive ?? true },
    });

    res.status(201).json(created);
  } catch (err: any) {
    if (err?.code === 'P2002') return next(new AppError('ประเภทอุปกรณ์นี้มีอยู่แล้ว'));
    next(err);
  }
});

router.put('/device-types/:typeId', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.typeId);
    const name = String(req.body.name || '').trim();
    const description = req.body.description ? String(req.body.description).trim() : null;
    if (!name) throw new AppError('กรุณาระบุประเภทอุปกรณ์');

    const updated = await prisma.deviceType.update({
      where: { id },
      data: { name, description, isActive: req.body.isActive ?? true },
    });

    res.json(updated);
  } catch (err: any) {
    if (err?.code === 'P2002') return next(new AppError('ประเภทอุปกรณ์นี้มีอยู่แล้ว'));
    if (err?.code === 'P2025') return next(new AppError('ไม่พบประเภทอุปกรณ์', 404));
    next(err);
  }
});

router.delete('/device-types/:typeId', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.typeId);
    await prisma.deviceType.delete({ where: { id } });
    res.json({ message: 'ลบประเภทอุปกรณ์เรียบร้อย' });
  } catch (err: any) {
    if (err?.code === 'P2025') return next(new AppError('ไม่พบประเภทอุปกรณ์', 404));
    next(err);
  }
});

router.post('/device-types/import-from-assets', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await prisma.asset.findMany({
      where: { type: { not: null } },
      distinct: ['type'],
      select: { type: true },
      orderBy: { type: 'asc' },
    });

    const names = rows.map((row) => row.type?.trim()).filter(Boolean) as string[];
    const result = await prisma.$transaction(
      names.map((name) => prisma.deviceType.upsert({
        where: { name },
        update: {},
        create: { name },
      }))
    );

    res.json({ imported: result.length });
  } catch (err) { next(err); }
});

router.get('/locations', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [locations, counts] = await Promise.all([
      prisma.assetLocation.findMany({ orderBy: { name: 'asc' } }),
      prisma.asset.groupBy({ by: ['location'], where: { location: { not: null } }, _count: { location: true } }),
    ]);
    const countByName = new Map(counts.map((row) => [row.location, row._count.location]));
    res.json(locations.map((location) => ({ ...location, assetCount: countByName.get(location.name) || 0 })));
  } catch (err) { next(err); }
});

router.post('/locations', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const name = String(req.body.name || '').trim();
    const company = req.body.company ? String(req.body.company).trim() : null;
    const description = req.body.description ? String(req.body.description).trim() : null;
    if (!name) throw new AppError('กรุณาระบุ Location');
    const created = await prisma.assetLocation.create({
      data: { name, company, description, isActive: req.body.isActive ?? true }
    });
    res.status(201).json(created);
  } catch (err: any) {
    if (err?.code === 'P2002') return next(new AppError('Location นี้มีอยู่แล้ว'));
    next(err);
  }
});

router.put('/locations/:locationId', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.locationId);
    const name = String(req.body.name || '').trim();
    const company = req.body.company ? String(req.body.company).trim() : null;
    const description = req.body.description ? String(req.body.description).trim() : null;
    if (!name) throw new AppError('กรุณาระบุ Location');
    const updated = await prisma.assetLocation.update({
      where: { id },
      data: { name, company, description, isActive: req.body.isActive ?? true }
    });
    res.json(updated);
  } catch (err: any) {
    if (err?.code === 'P2002') return next(new AppError('Location นี้มีอยู่แล้ว'));
    if (err?.code === 'P2025') return next(new AppError('ไม่พบ Location', 404));
    next(err);
  }
});

router.delete('/locations/:locationId', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.assetLocation.delete({ where: { id: parseInt(req.params.locationId) } });
    res.json({ message: 'ลบ Location เรียบร้อย' });
  } catch (err: any) {
    if (err?.code === 'P2025') return next(new AppError('ไม่พบ Location', 404));
    next(err);
  }
});

router.post('/locations/import-from-assets', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await prisma.asset.groupBy({
      by: ['location', 'company'],
      where: { location: { not: null } },
      orderBy: { location: 'asc' },
    });
    const locationByName = new Map<string, string | null>();
    for (const row of rows) {
      const name = cleanMasterValue(row.location);
      if (!name) continue;
      const company = cleanMasterValue(row.company) || null;
      if (!locationByName.has(name) || (!locationByName.get(name) && company)) {
        locationByName.set(name, company);
      }
    }
    const result = await prisma.$transaction(Array.from(locationByName.entries()).map(([name, company]) => prisma.assetLocation.upsert({
      where: { name },
      update: company ? { company } : {},
      create: { name, description: name, company },
    })));
    res.json({ imported: result.length });
  } catch (err) { next(err); }
});

router.get('/companies', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [companies, counts] = await Promise.all([
      prisma.company.findMany({ orderBy: { name: 'asc' } }),
      prisma.asset.groupBy({ by: ['company'], where: { company: { not: null } }, _count: { company: true } }),
    ]);
    const countByName = new Map(counts.map((row) => [row.company, row._count.company]));
    res.json(companies.map((c) => ({ ...c, assetCount: countByName.get(c.name) || 0 })));
  } catch (err) { next(err); }
});

router.post('/companies', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const name = String(req.body.name || '').trim();
    const description = req.body.description ? String(req.body.description).trim() : null;
    const assetCompanyCodes = req.body.assetCompanyCodes !== undefined ? String(req.body.assetCompanyCodes).trim() : null;
    if (!name) throw new AppError('กรุณาระบุ Company');
    const created = await prisma.company.create({ data: { name, description, assetCompanyCodes, isActive: req.body.isActive ?? true } });
    res.status(201).json(created);
  } catch (err: any) {
    if (err?.code === 'P2002') return next(new AppError('Company นี้มีอยู่แล้ว'));
    next(err);
  }
});

router.put('/companies/:companyId', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.companyId);
    const name = String(req.body.name || '').trim();
    const description = req.body.description ? String(req.body.description).trim() : null;
    const assetCompanyCodes = req.body.assetCompanyCodes !== undefined ? String(req.body.assetCompanyCodes).trim() : null;
    if (!name) throw new AppError('กรุณาระบุ Company');
    const updated = await prisma.company.update({ where: { id }, data: { name, description, assetCompanyCodes, isActive: req.body.isActive ?? true } });
    res.json(updated);
  } catch (err: any) {
    if (err?.code === 'P2002') return next(new AppError('Company นี้มีอยู่แล้ว'));
    if (err?.code === 'P2025') return next(new AppError('ไม่พบ Company', 404));
    next(err);
  }
});

router.delete('/companies/:companyId', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.company.delete({ where: { id: parseInt(req.params.companyId) } });
    res.json({ message: 'ลบ Company เรียบร้อย' });
  } catch (err: any) {
    if (err?.code === 'P2025') return next(new AppError('ไม่พบ Company', 404));
    next(err);
  }
});

router.post('/companies/import-from-assets', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await prisma.asset.findMany({ where: { company: { not: null } }, distinct: ['company'], select: { company: true }, orderBy: { company: 'asc' } });
    const names = rows.map((row) => row.company?.trim()).filter(Boolean) as string[];
    const result = await prisma.$transaction(names.map((name) => prisma.company.upsert({ where: { name }, update: {}, create: { name } })));
    res.json({ imported: result.length });
  } catch (err) { next(err); }
});

router.get('/vendors', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [vendors, counts] = await Promise.all([
      prisma.vendor.findMany({ orderBy: { name: 'asc' } }),
      prisma.asset.groupBy({ by: ['vendor'], where: { vendor: { not: null } }, _count: { vendor: true } }),
    ]);
    const countByName = new Map(counts.map((row) => [row.vendor, row._count.vendor]));
    res.json(vendors.map((vendor) => ({ ...vendor, assetCount: countByName.get(vendor.name) || 0 })));
  } catch (err) { next(err); }
});

router.post('/vendors', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const name = String(req.body.name || '').trim();
    const description = req.body.description ? String(req.body.description).trim() : null;
    if (!name) throw new AppError('กรุณาระบุ Vendor');
    const created = await prisma.vendor.create({ data: { name, description, isActive: req.body.isActive ?? true } });
    res.status(201).json(created);
  } catch (err: any) {
    if (err?.code === 'P2002') return next(new AppError('Vendor นี้มีอยู่แล้ว'));
    next(err);
  }
});

router.put('/vendors/:vendorId', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.vendorId);
    const name = String(req.body.name || '').trim();
    const description = req.body.description ? String(req.body.description).trim() : null;
    if (!name) throw new AppError('กรุณาระบุ Vendor');
    const updated = await prisma.vendor.update({ where: { id }, data: { name, description, isActive: req.body.isActive ?? true } });
    res.json(updated);
  } catch (err: any) {
    if (err?.code === 'P2002') return next(new AppError('Vendor นี้มีอยู่แล้ว'));
    if (err?.code === 'P2025') return next(new AppError('ไม่พบ Vendor', 404));
    next(err);
  }
});

router.delete('/vendors/:vendorId', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.vendor.delete({ where: { id: parseInt(req.params.vendorId) } });
    res.json({ message: 'ลบ Vendor เรียบร้อย' });
  } catch (err: any) {
    if (err?.code === 'P2025') return next(new AppError('ไม่พบ Vendor', 404));
    next(err);
  }
});

router.post('/vendors/import-from-assets', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await prisma.asset.findMany({ where: { vendor: { not: null } }, distinct: ['vendor'], select: { vendor: true }, orderBy: { vendor: 'asc' } });
    const names = rows.map((row) => row.vendor?.trim()).filter(Boolean) as string[];
    const result = await prisma.$transaction(names.map((name) => prisma.vendor.upsert({ where: { name }, update: {}, create: { name } })));
    res.json({ imported: result.length });
  } catch (err) { next(err); }
});

router.get('/asset-statuses', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [statuses, counts] = await Promise.all([
      prisma.assetStatusMaster.findMany({ orderBy: { code: 'asc' } }),
      prisma.asset.groupBy({ by: ['status'], _count: { status: true } }),
    ]);
    const countByCode = new Map(counts.map((row) => [row.status, row._count.status]));
    res.json(statuses.map((status) => ({ ...status, assetCount: countByCode.get(status.code as any) || 0 })));
  } catch (err) { next(err); }
});

router.post('/asset-statuses', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const code = String(req.body.code || '').trim();
    const name = String(req.body.name || '').trim();
    const description = req.body.description ? String(req.body.description).trim() : null;
    if (!ASSET_STATUS_OPTIONS.has(code)) throw new AppError('รหัสสถานะไม่ถูกต้อง');
    if (!name) throw new AppError('กรุณาระบุชื่อสถานะ');
    const created = await prisma.assetStatusMaster.create({ data: { code, name, description, isActive: req.body.isActive ?? true } });
    res.status(201).json(created);
  } catch (err: any) {
    if (err?.code === 'P2002') return next(new AppError('สถานะนี้มีอยู่แล้ว'));
    next(err);
  }
});

router.put('/asset-statuses/:statusId', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.statusId);
    const code = String(req.body.code || '').trim();
    const name = String(req.body.name || '').trim();
    const description = req.body.description ? String(req.body.description).trim() : null;
    if (!ASSET_STATUS_OPTIONS.has(code)) throw new AppError('รหัสสถานะไม่ถูกต้อง');
    if (!name) throw new AppError('กรุณาระบุชื่อสถานะ');
    const updated = await prisma.assetStatusMaster.update({ where: { id }, data: { code, name, description, isActive: req.body.isActive ?? true } });
    res.json(updated);
  } catch (err: any) {
    if (err?.code === 'P2002') return next(new AppError('สถานะนี้มีอยู่แล้ว'));
    if (err?.code === 'P2025') return next(new AppError('ไม่พบสถานะ', 404));
    next(err);
  }
});

router.delete('/asset-statuses/:statusId', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.assetStatusMaster.delete({ where: { id: parseInt(req.params.statusId) } });
    res.json({ message: 'ลบสถานะเรียบร้อย' });
  } catch (err: any) {
    if (err?.code === 'P2025') return next(new AppError('ไม่พบสถานะ', 404));
    next(err);
  }
});

// ── Printers (Settings tab 3: เครื่องพิมพ์ตามพื้นที่) ──
router.get('/printers', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const printers = await prisma.printer.findMany({ orderBy: { floorArea: 'asc' } });
    res.json(printers);
  } catch (err) { next(err); }
});

router.post('/printers', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const floorArea = String(req.body.floorArea || '').trim();
    const brandModel = String(req.body.brandModel || '').trim();
    if (!floorArea) throw new AppError('กรุณาระบุชั้น/พื้นที่');
    if (!brandModel) throw new AppError('กรุณาระบุยี่ห้อ/รุ่น');
    const created = await prisma.printer.create({
      data: {
        floorArea, brandModel,
        serialNo: req.body.serialNo ? String(req.body.serialNo).trim() : null,
        ipAddress: req.body.ipAddress ? String(req.body.ipAddress).trim() : null,
        driver: req.body.driver ? String(req.body.driver).trim() : null,
        pinNote: req.body.pinNote ? String(req.body.pinNote).trim() : null,
        status: req.body.status || 'active',
        isActive: req.body.isActive ?? true,
      },
    });
    res.status(201).json(created);
  } catch (err) { next(err); }
});

router.put('/printers/:printerId', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.printerId);
    const floorArea = String(req.body.floorArea || '').trim();
    const brandModel = String(req.body.brandModel || '').trim();
    if (!floorArea) throw new AppError('กรุณาระบุชั้น/พื้นที่');
    if (!brandModel) throw new AppError('กรุณาระบุยี่ห้อ/รุ่น');
    const updated = await prisma.printer.update({
      where: { id },
      data: {
        floorArea, brandModel,
        serialNo: req.body.serialNo ? String(req.body.serialNo).trim() : null,
        ipAddress: req.body.ipAddress ? String(req.body.ipAddress).trim() : null,
        driver: req.body.driver ? String(req.body.driver).trim() : null,
        pinNote: req.body.pinNote ? String(req.body.pinNote).trim() : null,
        status: req.body.status || 'active',
        isActive: req.body.isActive ?? true,
      },
    });
    res.json(updated);
  } catch (err: any) {
    if (err?.code === 'P2025') return next(new AppError('ไม่พบเครื่องพิมพ์', 404));
    next(err);
  }
});

router.delete('/printers/:printerId', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.printer.delete({ where: { id: parseInt(req.params.printerId) } });
    res.json({ message: 'ลบเครื่องพิมพ์เรียบร้อย' });
  } catch (err: any) {
    if (err?.code === 'P2025') return next(new AppError('ไม่พบเครื่องพิมพ์', 404));
    next(err);
  }
});

// ── Checklist sets (Settings tab 3: ชุด Checklist ติดตั้ง) ──
router.get('/checklist-sets', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const sets = await prisma.checklistSet.findMany({ orderBy: { docCode: 'asc' } });
    res.json(sets);
  } catch (err) { next(err); }
});

router.post('/checklist-sets', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const docCode = String(req.body.docCode || '').trim();
    const name = String(req.body.name || '').trim();
    if (!docCode) throw new AppError('กรุณาระบุรหัสเอกสาร');
    if (!name) throw new AppError('กรุณาระบุชื่อชุด');
    const created = await prisma.checklistSet.create({
      data: {
        docCode, name,
        appliesToCategories: req.body.appliesToCategories ? String(req.body.appliesToCategories).trim() : null,
        itemCount: Number(req.body.itemCount) || 0,
        categoryCount: Number(req.body.categoryCount) || 0,
        avgTimeLabel: req.body.avgTimeLabel ? String(req.body.avgTimeLabel).trim() : null,
        revision: Number(req.body.revision) || 1,
        isActive: req.body.isActive ?? true,
      },
    });
    res.status(201).json(created);
  } catch (err: any) {
    if (err?.code === 'P2002') return next(new AppError('รหัสเอกสารนี้มีอยู่แล้ว'));
    next(err);
  }
});

router.put('/checklist-sets/:setId', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.setId);
    const docCode = String(req.body.docCode || '').trim();
    const name = String(req.body.name || '').trim();
    if (!docCode) throw new AppError('กรุณาระบุรหัสเอกสาร');
    if (!name) throw new AppError('กรุณาระบุชื่อชุด');
    const updated = await prisma.checklistSet.update({
      where: { id },
      data: {
        docCode, name,
        appliesToCategories: req.body.appliesToCategories ? String(req.body.appliesToCategories).trim() : null,
        itemCount: Number(req.body.itemCount) || 0,
        categoryCount: Number(req.body.categoryCount) || 0,
        avgTimeLabel: req.body.avgTimeLabel ? String(req.body.avgTimeLabel).trim() : null,
        revision: Number(req.body.revision) || 1,
        isActive: req.body.isActive ?? true,
      },
    });
    res.json(updated);
  } catch (err: any) {
    if (err?.code === 'P2002') return next(new AppError('รหัสเอกสารนี้มีอยู่แล้ว'));
    if (err?.code === 'P2025') return next(new AppError('ไม่พบชุด Checklist', 404));
    next(err);
  }
});

router.delete('/checklist-sets/:setId', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.checklistSet.delete({ where: { id: parseInt(req.params.setId) } });
    res.json({ message: 'ลบชุด Checklist เรียบร้อย' });
  } catch (err: any) {
    if (err?.code === 'P2025') return next(new AppError('ไม่พบชุด Checklist', 404));
    next(err);
  }
});

export default router;
