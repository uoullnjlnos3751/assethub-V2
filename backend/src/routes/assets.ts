import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { Prisma } from '@prisma/client';
import { searchADUsers } from '../services/ldap';
import multer from 'multer';

declare global {
  namespace Express {
    interface Request {
      file?: Express.Multer.File;
    }
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req: any, file: any, cb: any) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

const router = Router();

const calculateAssetAge = (purchaseDate?: Date | string | null) => {
  if (!purchaseDate) return null;
  const purchased = new Date(purchaseDate);
  if (Number.isNaN(purchased.getTime())) return null;
  const today = new Date();
  let years = today.getFullYear() - purchased.getFullYear();
  const monthDiff = today.getMonth() - purchased.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < purchased.getDate())) years -= 1;
  return Math.max(years, 0);
};

const withCalculatedAge = <T extends { purchaseDate?: Date | null }>(asset: T) => ({
  ...asset,
  age: calculateAssetAge(asset.purchaseDate),
});

const parseDate = (val: any): Date | null => {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const s = String(val).trim();
  if (!s) return null;

  // Try standard ISO
  let d = new Date(s);
  if (!isNaN(d.getTime())) return d;

  // Try DD/MM/YYYY
  const parts = s.split(/[\/\-]/);
  if (parts.length === 3) {
    const d1 = parseInt(parts[0]);
    const m1 = parseInt(parts[1]) - 1;
    let y1 = parseInt(parts[2]);
    if (y1 < 100) y1 += 2000;
    if (y1 > 2400) y1 -= 543; // Handle Buddhist Era
    d = new Date(y1, m1, d1);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
};

const ALLOWED_ASSET_FIELDS = new Set([
  'id', 'assetCode', 'serialNo', 'type', 'brand', 'model', 'cpu', 'ram',
  'osVersion', 'windowsLicense', 'officeLicense', 'antivirusStatus', 'vendor',
  'poNumber', 'prNumber', 'purchaseDate', 'age', 'ownerName', 'departmentId',
  'location', 'status', 'remark', 'company', 'cpuGeneration', 'domainName',
  'floor', 'poDate', 'ramDetail', 'gpu', 'osType', 'ramSlot1', 'ramSlot2',
  'snComputer', 'storage1', 'storage2', 'createdAt', 'updatedAt',
  'oldAssetCode', 'budget', 'image', 'categoryId',
]);

const normalizeAssetPayload = (data: any, isCreate = false) => {
  const purchaseDate = parseDate(data.purchaseDate);
  const poDate = parseDate(data.poDate);
  
  let status = data.status;
  if (isCreate && data.ownerName && data.ownerName.trim() !== '' && (!status || status === 'Available')) {
    status = 'InUse';
  }

  const filtered: any = {};
  for (const key of Object.keys(data)) {
    if (ALLOWED_ASSET_FIELDS.has(key)) {
      filtered[key] = data[key];
    }
  }

  return {
    ...filtered,
    status,
    purchaseDate,
    poDate,
    age: calculateAssetAge(purchaseDate),
  };
};

async function upsertAssetDetail(prisma: any, assetId: number, type: string, detail: any) {
  if (!detail || Object.keys(detail).length === 0) return null;
  const typeLower = type.toLowerCase();
  const cleanDetail = Object.fromEntries(
    Object.entries(detail).filter(([_, v]) => v !== undefined && v !== null && v !== '')
  );
  if (Object.keys(cleanDetail).length === 0) return null;

  if (['computer', 'notebook'].includes(typeLower)) {
    return prisma.computerDetail.upsert({
      where: { assetId },
      create: { assetId, ...cleanDetail },
      update: cleanDetail,
    });
  }
  if (['phone', 'tablet'].includes(typeLower)) {
    return prisma.phoneDetail.upsert({
      where: { assetId },
      create: { assetId, ...cleanDetail },
      update: cleanDetail,
    });
  }
  if (['monitor'].includes(typeLower)) {
    return prisma.monitorDetail.upsert({
      where: { assetId },
      create: { assetId, ...cleanDetail },
      update: cleanDetail,
    });
  }
  if (['projector', 'device', 'accessory'].includes(typeLower)) {
    return prisma.deviceDetail.upsert({
      where: { assetId },
      create: { assetId, ...cleanDetail },
      update: cleanDetail,
    });
  }
  if (['network', 'switch', 'router'].includes(typeLower)) {
    return prisma.networkDeviceDetail.upsert({
      where: { assetId },
      create: { assetId, ...cleanDetail },
      update: cleanDetail,
    });
  }
  if (['rack', 'enclosure', 'pdu'].includes(typeLower)) {
    return prisma.rackDetail.upsert({
      where: { assetId },
      create: { assetId, ...cleanDetail },
      update: cleanDetail,
    });
  }
  if (['printer'].includes(typeLower)) {
    return prisma.printerDetail.upsert({
      where: { assetId },
      create: { assetId, ...cleanDetail },
      update: cleanDetail,
    });
  }
  return null;
}

const ASSET_STATUS_OPTIONS = new Set(['Available', 'Borrowed', 'InUse', 'Maintenance', 'Retired', 'Lost']);

router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, status, department, location, type, page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 100);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status) where.status = status as string;
    if (department) where.departmentId = department as string;
    if (location) where.location = location as string;
    if (type) where.type = type as string;
    if (search) {
      where.OR = [
        { assetCode: { contains: search as string, mode: 'insensitive' } },
        { serialNo: { contains: search as string, mode: 'insensitive' } },
        { model: { contains: search as string, mode: 'insensitive' } },
        { ownerName: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    // Data scoping: USER can only see Available assets
    if (req.user!.role === 'USER' && !status) {
      where.status = 'Available';
    }

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({ where, skip, take: limitNum, orderBy: { createdAt: 'desc' } }),
      prisma.asset.count({ where }),
    ]);

    res.json({ data: assets.map(withCalculatedAge), total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) { next(err); }
});

router.get('/owners/search-ad', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q } = req.query;
    if (!q || String(q).trim().length < 2) return res.json([]);
    const keyword = String(q).trim();
    try {
      const results = await searchADUsers(keyword);
      if (results.length > 0) return res.json(results);
    } catch (err: any) {
      console.warn(`LDAP owner search failed, falling back to local users: ${err.message}`);
    }

    const localUsers = await prisma.appUser.findMany({
      where: {
        isActive: true,
        OR: [
          { adUsername: { contains: keyword, mode: 'insensitive' } },
          { displayName: { contains: keyword, mode: 'insensitive' } },
          { email: { contains: keyword, mode: 'insensitive' } },
        ],
      },
      take: 50,
      orderBy: { displayName: 'asc' },
      select: { adUsername: true, displayName: true, email: true, department: true },
    });

    res.json(localUsers);
  } catch (err) { next(err); }
});

router.get('/options/types', authenticate, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [managedTypes, assetTypes] = await Promise.all([
      prisma.deviceType.findMany({
        where: { isActive: true },
        select: { name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.asset.findMany({
        where: { type: { not: null } },
        distinct: ['type'],
        select: { type: true },
        orderBy: { type: 'asc' },
      }),
    ]);

    const options = new Set<string>();
    managedTypes.forEach((row) => row.name && options.add(row.name));
    assetTypes.forEach((row) => row.type && options.add(row.type));

    res.json(Array.from(options).sort((a, b) => a.localeCompare(b)));
  } catch (err) { next(err); }
});

router.get('/options/locations', authenticate, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [managed, existing] = await Promise.all([
      prisma.assetLocation.findMany({ where: { isActive: true }, select: { name: true }, orderBy: { name: 'asc' } }),
      prisma.asset.findMany({ where: { location: { not: null } }, distinct: ['location'], select: { location: true }, orderBy: { location: 'asc' } }),
    ]);
    const options = new Set<string>();
    managed.forEach((row) => row.name && options.add(row.name));
    existing.forEach((row) => row.location && options.add(row.location));
    res.json(Array.from(options).sort((a, b) => a.localeCompare(b)));
  } catch (err) { next(err); }
});

router.get('/options/vendors', authenticate, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [managed, existing] = await Promise.all([
      prisma.vendor.findMany({ where: { isActive: true }, select: { name: true }, orderBy: { name: 'asc' } }),
      prisma.asset.findMany({ where: { vendor: { not: null } }, distinct: ['vendor'], select: { vendor: true }, orderBy: { vendor: 'asc' } }),
    ]);
    const options = new Set<string>();
    managed.forEach((row) => row.name && options.add(row.name));
    existing.forEach((row) => row.vendor && options.add(row.vendor));
    res.json(Array.from(options).sort((a, b) => a.localeCompare(b)));
  } catch (err) { next(err); }
});

router.get('/options/statuses', authenticate, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await prisma.assetStatusMaster.findMany({ where: { isActive: true }, orderBy: { code: 'asc' } });
    res.json(rows.map((row) => ({ code: row.code, name: row.name })));
  } catch (err) { next(err); }
});

router.get('/options/os-types', authenticate, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const defaults = ['Windows', 'macOS', 'Linux', 'ChromeOS', 'Android', 'iOS'];
    const rows = await prisma.asset.findMany({ where: { osType: { not: null } }, distinct: ['osType'], select: { osType: true }, orderBy: { osType: 'asc' } });
    const existing = new Set(rows.map((r) => r.osType).filter((v): v is string => v !== null));
    defaults.forEach((d) => existing.add(d));
    res.json(Array.from(existing).sort((a, b) => a.localeCompare(b)));
  } catch (err) { next(err); }
});

router.get('/options/departments', authenticate, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await prisma.asset.findMany({ where: { departmentId: { not: null } }, distinct: ['departmentId'], select: { departmentId: true }, orderBy: { departmentId: 'asc' } });
    res.json(rows.map((r) => r.departmentId));
  } catch (err) { next(err); }
});

router.get('/options/domains', authenticate, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await prisma.asset.findMany({ where: { domainName: { not: null } }, distinct: ['domainName'], select: { domainName: true }, orderBy: { domainName: 'asc' } });
    res.json(rows.map((r) => r.domainName));
  } catch (err) { next(err); }
});

router.get('/options/companies', authenticate, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const defaults = ['PS', 'TRR', 'TRR Corp', 'TRRL', 'TRRP', 'TRRT', 'TRW', 'TRRSK', 'SSEC', 'TMI', 'TRM'];
    const rows = await prisma.asset.findMany({ where: { company: { not: null } }, distinct: ['company'], select: { company: true }, orderBy: { company: 'asc' } });
    const existing = new Set(rows.map((r) => r.company).filter((v): v is string => v !== null && v !== ''));
    defaults.forEach((d) => existing.add(d));
    res.json(Array.from(existing).sort((a, b) => a.localeCompare(b)));
  } catch (err) { next(err); }
});

router.get('/options/antivirus', authenticate, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const defaults = ['Trend Micro Apex One', 'Sangfor Endpoint Secure', 'ESET Endpoint Security'];
    const rows = await prisma.asset.findMany({ where: { antivirusStatus: { not: null } }, distinct: ['antivirusStatus'], select: { antivirusStatus: true }, orderBy: { antivirusStatus: 'asc' } });
    const existing = new Set(rows.map((r) => r.antivirusStatus).filter((v): v is string => v !== null && v !== ''));
    defaults.forEach((d) => existing.add(d));
    res.json(Array.from(existing).sort((a, b) => a.localeCompare(b)));
  } catch (err) { next(err); }
});

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
    const rows = await prisma.asset.findMany({ where: { location: { not: null } }, distinct: ['location'], select: { location: true }, orderBy: { location: 'asc' } });
    const names = rows.map((row) => row.location?.trim()).filter(Boolean) as string[];
    const result = await prisma.$transaction(names.map((name) => prisma.assetLocation.upsert({ where: { name }, update: {}, create: { name } })));
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
    if (!name) throw new AppError('กรุณาระบุ Company');
    const created = await prisma.company.create({ data: { name, description, isActive: req.body.isActive ?? true } });
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
    if (!name) throw new AppError('กรุณาระบุ Company');
    const updated = await prisma.company.update({ where: { id }, data: { name, description, isActive: req.body.isActive ?? true } });
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

const detailIncludeMap: Record<string, any> = {
  Computer: { computerDetail: true },
  Notebook: { computerDetail: true },
  Phone: { phoneDetail: true },
  Tablet: { phoneDetail: true },
  Monitor: { monitorDetail: true },
  Projector: { deviceDetail: true },
  Device: { deviceDetail: true },
  Accessory: { deviceDetail: true },
  Network: { networkDeviceDetail: true },
  Switch: { networkDeviceDetail: true },
  Router: { networkDeviceDetail: true },
  Rack: { rackDetail: true },
  Enclosure: { rackDetail: true },
  PDU: { rackDetail: true },
  Printer: { printerDetail: true },
};

function getDetailInclude(type?: string | null): any {
  if (!type) return {};
  const key = Object.keys(detailIncludeMap).find(
    (k) => k.toLowerCase() === type.toLowerCase()
  );
  return key ? detailIncludeMap[key] : {};
}

function getAssetDetail(prisma: any, assetId: number, type?: string | null) {
  if (!type) return null;
  const typeLower = type.toLowerCase();
  if (['computer', 'notebook'].includes(typeLower)) {
    return prisma.computerDetail.findUnique({ where: { assetId } });
  }
  if (['phone', 'tablet'].includes(typeLower)) {
    return prisma.phoneDetail.findUnique({ where: { assetId } });
  }
  if (['monitor'].includes(typeLower)) {
    return prisma.monitorDetail.findUnique({ where: { assetId } });
  }
  if (['projector', 'device', 'accessory'].includes(typeLower)) {
    return prisma.deviceDetail.findUnique({ where: { assetId } });
  }
  if (['network', 'switch', 'router'].includes(typeLower)) {
    return prisma.networkDeviceDetail.findUnique({ where: { assetId } });
  }
  if (['rack', 'enclosure', 'pdu'].includes(typeLower)) {
    return prisma.rackDetail.findUnique({ where: { assetId } });
  }
  if (['printer'].includes(typeLower)) {
    return prisma.printerDetail.findUnique({ where: { assetId } });
  }
  return null;
}

router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        assetHistory: { orderBy: { createdAt: 'desc' }, take: 50 },
        pmRuns: { orderBy: { completedAt: 'desc' }, take: 20, include: { plan: true, performer: true } },
        category: true,
      },
    });
    if (!asset) throw new AppError('ไม่พบทรัพย์สิน', 404);

    const detail = await getAssetDetail(prisma, id, asset.type);
    res.json({ ...withCalculatedAge(asset), detail });
  } catch (err) { next(err); }
});

router.post('/upsert', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { detail, ...assetData } = req.body;
    const data = normalizeAssetPayload(assetData);
    const { assetCode, serialNo } = data;

    if (!assetCode && !serialNo) {
      throw new AppError('กรุณาระบุ Asset Code หรือ Serial Number');
    }

    // Find existing asset
    const existing = await prisma.asset.findFirst({
      where: {
        OR: [
          assetCode ? { assetCode } : undefined,
          serialNo ? { serialNo } : undefined,
        ].filter(Boolean) as any[],
      },
    });

    if (existing) {
      const old = existing;
      const asset = await prisma.asset.update({ where: { id: old.id }, data });
      
      if (detail && asset.type) {
        await upsertAssetDetail(prisma, asset.id, asset.type, detail);
      }

      const changes: any[] = [];
      if (data.status && data.status !== old.status) changes.push({ actionType: 'STATUS_CHANGE', fromStatus: old.status, toStatus: data.status });
      if (data.ownerName && data.ownerName !== old.ownerName) changes.push({ actionType: 'OWNER_CHANGE', fromOwner: old.ownerName, toOwner: data.ownerName });
      if (data.location && data.location !== old.location) changes.push({ actionType: 'LOCATION_CHANGE', fromLoc: old.location, toLoc: data.location });
      
      for (const ch of changes) {
        await prisma.assetHistory.create({
          data: { assetId: asset.id, ...ch, actorUserId: req.user!.userId, note: 'Updated via Import (Upsert)' },
        });
      }
      return res.json({ action: 'updated', asset });
    } else {
      const asset = await prisma.asset.create({ data });

      if (detail && asset.type) {
        await upsertAssetDetail(prisma, asset.id, asset.type, detail);
      }

      await prisma.assetHistory.create({
        data: {
          assetId: asset.id,
          actionType: 'CREATE',
          toStatus: data.status || 'Available',
          actorUserId: req.user!.userId,
          note: 'Created via Import (Upsert)',
        },
      });
      return res.status(201).json({ action: 'created', asset });
    }
  } catch (err: any) {
    next(err);
  }
});

router.post('/', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { detail, ...assetData } = req.body;
    const data = normalizeAssetPayload(assetData);
    const existing = await prisma.asset.findFirst({
      where: { OR: [{ assetCode: data.assetCode }, { serialNo: data.serialNo }] },
    });
    if (existing) throw new AppError('รหัสทรัพย์สินหรือ Serial Number มีอยู่ในระบบแล้ว');

    const asset = await prisma.asset.create({ data });
    await prisma.assetHistory.create({
      data: {
        assetId: asset.id,
        actionType: 'CREATE',
        toStatus: data.status || 'Available',
        actorUserId: req.user!.userId,
      },
    });

    // Create type-specific detail
    if (detail && asset.type) {
      await upsertAssetDetail(prisma, asset.id, asset.type, detail);
    }

    const fullAsset = await prisma.asset.findUnique({ where: { id: asset.id } });
    res.status(201).json(fullAsset);
  } catch (err) { next(err); }
});

router.put('/:id', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const old = await prisma.asset.findUnique({ where: { id } });
    if (!old) throw new AppError('ไม่พบทรัพย์สิน', 404);

    const { detail, ...assetData } = req.body;
    const data = normalizeAssetPayload(assetData);
    
    const asset = await prisma.asset.update({ where: { id }, data });

    // Upsert type-specific detail
    if (detail && asset.type) {
      await upsertAssetDetail(prisma, id, asset.type, detail);
    }

    const changes: any[] = [];
    if (data.status && data.status !== old.status) changes.push({ actionType: 'STATUS_CHANGE', fromStatus: old.status, toStatus: data.status });
    if (data.ownerName && data.ownerName !== old.ownerName) changes.push({ actionType: 'OWNER_CHANGE', fromOwner: old.ownerName, toOwner: data.ownerName });
    if (data.location && data.location !== old.location) changes.push({ actionType: 'LOCATION_CHANGE', fromLoc: old.location, toLoc: data.location });

    for (const ch of changes) {
      await prisma.assetHistory.create({
        data: { assetId: id, ...ch, actorUserId: req.user!.userId, note: data.remark || null },
      });
    }

    res.json(asset);
  } catch (err) { next(err); }
});

router.delete('/:id', authenticate, authorize('SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.asset.delete({ where: { id } });
    res.json({ message: 'ลบทรัพย์สินเรียบร้อย' });
  } catch (err) { next(err); }
});

router.post('/:id/image', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), upload.single('image'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) throw new AppError('ไม่พบทรัพย์สิน', 404);

    if (!req.file) throw new AppError('ไม่พบไฟล์รูปภาพ', 400);

    const base64 = req.file.buffer.toString('base64');
    const dataUrl = `data:${req.file.mimetype};base64,${base64}`;

    const updated = await prisma.asset.update({
      where: { id },
      data: { image: dataUrl },
    });

    res.json({ message: 'อัพโหลดรูปภาพเรียบร้อย', image: updated.image });
  } catch (err) { next(err); }
});

router.delete('/:id/image', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) throw new AppError('ไม่พบทรัพย์สิน', 404);

    await prisma.asset.update({
      where: { id },
      data: { image: null },
    });

    res.json({ message: 'ลบรูปภาพเรียบร้อย' });
  } catch (err) { next(err); }
});

export default router;
