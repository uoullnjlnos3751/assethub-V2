import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { Prisma } from '@prisma/client';
import { searchADUsers } from '../services/ldap';
import multer from 'multer';
import * as xlsx from 'xlsx';

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

const uploadExcel = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
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
  'id', 'assetCode', 'assetName', 'serialNo', 'type', 'brand', 'model', 'cpu', 'ram',
  'osVersion', 'windowsLicense', 'officeLicense', 'antivirusStatus', 'vendor',
  'poNumber', 'prNumber', 'purchaseDate', 'purchasePrice', 'warrantyEndDate', 'age', 'ownerName', 'departmentId',
  'location', 'status', 'remark', 'company', 'cpuGeneration', 'domainName',
  'floor', 'poDate', 'ramDetail', 'gpu', 'osType', 'ramSlot1', 'ramSlot2',
  'snComputer', 'storage1', 'storage2', 'createdAt', 'updatedAt',
  'oldAssetCode', 'budget', 'image', 'categoryId',
]);

const normalizeAssetPayload = (data: any, isCreate = false) => {
  const purchaseDate = parseDate(data.purchaseDate);
  const poDate = parseDate(data.poDate);
  const warrantyEndDate = parseDate(data.warrantyEndDate);
  const purchasePrice = data.purchasePrice ? parseFloat(data.purchasePrice) : undefined;
  
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
    purchasePrice,
    warrantyEndDate,
    age: calculateAssetAge(purchaseDate),
  };
};

function parseBoolean(val: any): boolean | undefined {
  if (val === undefined || val === null || val === '') return undefined;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    return val.toLowerCase() === 'true';
  }
  return !!val;
}

function parseIntOrUndefined(val: any): number | undefined {
  if (val === undefined || val === null || val === '') return undefined;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? undefined : parsed;
}

function parseDateOrUndefined(val: any): Date | undefined {
  if (val === undefined || val === null || val === '') return undefined;
  const date = new Date(val);
  return isNaN(date.getTime()) ? undefined : date;
}

async function upsertAssetDetail(prisma: any, assetId: number, type: string, detail: any) {
  if (!detail || Object.keys(detail).length === 0) return null;
  const typeLower = type.toLowerCase();
  const cleanDetail = Object.fromEntries(
    Object.entries(detail).filter(([, v]) => v !== '' && v !== null && v !== undefined)
  );
  if (Object.keys(cleanDetail).length === 0) return null;

  if (['notebook', 'pc desktop', 'macbook', 'mini pc', 'all-in-one', 'thin client', 'computer'].some(t => typeLower.includes(t))) {
    const data = {
      cpu: cleanDetail.cpu,
      cpuGeneration: cleanDetail.cpuGeneration,
      ram: cleanDetail.ram,
      ramSlot1: cleanDetail.ramSlot1,
      ramSlot2: cleanDetail.ramSlot2,
      storage1: cleanDetail.storage1,
      storage2: cleanDetail.storage2,
      gpu: cleanDetail.gpu,
      osType: cleanDetail.osType,
      osVersion: cleanDetail.osVersion,
      windowsLicense: cleanDetail.windowsLicense,
      officeLicense: cleanDetail.officeLicense,
      antivirusStatus: cleanDetail.antivirusStatus,
      domainName: cleanDetail.domainName,
      snComputer: cleanDetail.snComputer,
    };
    const finalData = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
    return prisma.computerDetail.upsert({
      where: { assetId },
      create: { assetId, ...finalData },
      update: finalData,
    });
  }
  if (['smartphone', 'tablet', 'mobile hotspot'].some(t => typeLower.includes(t))) {
    const data = {
      imei1: cleanDetail.imei1,
      imei2: cleanDetail.imei2,
      osVersion: cleanDetail.osVersion,
      storageCapacity: cleanDetail.storageCapacity,
      ram: cleanDetail.ram,
      phoneNumber: cleanDetail.phoneNumber,
      simProvider: cleanDetail.simProvider,
      mdmEnrolled: parseBoolean(cleanDetail.mdmEnrolled),
    };
    const finalData = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
    return prisma.phoneDetail.upsert({
      where: { assetId },
      create: { assetId, ...finalData },
      update: finalData,
    });
  }
  if (typeLower.includes('monitor')) {
    const data = {
      screenSize: cleanDetail.screenSize,
      resolution: cleanDetail.resolution,
      panelType: cleanDetail.panelType,
      refreshRate: cleanDetail.refreshRate,
      ports: cleanDetail.ports,
      hasSpeaker: parseBoolean(cleanDetail.hasSpeaker),
      curved: parseBoolean(cleanDetail.curved),
    };
    const finalData = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
    return prisma.monitorDetail.upsert({
      where: { assetId },
      create: { assetId, ...finalData },
      update: finalData,
    });
  }
  if (['projector', 'conference speaker', 'webcam', 'docking station', 'presentation clicker', 'device', 'accessory', 'speaker', 'dock', 'peripheral', 'keyboard', 'mouse', 'headset'].some(t => typeLower.includes(t))) {
    const data = {
      deviceType: cleanDetail.deviceType,
      connectionType: cleanDetail.connectionType,
      powerSource: cleanDetail.powerSource,
      rgbSupport: parseBoolean(cleanDetail.rgbSupport),
    };
    const finalData = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
    return prisma.deviceDetail.upsert({
      where: { assetId },
      create: { assetId, ...finalData },
      update: finalData,
    });
  }
  if (['switch', 'router', 'access point', 'firewall', 'modem', 'network'].some(t => typeLower.includes(t))) {
    const data = {
      networkType: cleanDetail.networkType,
      ipAddress: cleanDetail.ipAddress,
      macAddress: cleanDetail.macAddress,
      firmwareVersion: cleanDetail.firmwareVersion,
      portCount: parseIntOrUndefined(cleanDetail.portCount),
      locationRack: cleanDetail.locationRack,
      poeSupport: parseBoolean(cleanDetail.poeSupport),
    };
    const finalData = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
    return prisma.networkDeviceDetail.upsert({
      where: { assetId },
      create: { assetId, ...finalData },
      update: finalData,
    });
  }
  if (['server rack', 'pdu', 'ups', 'enclosure', 'rack'].some(t => typeLower.includes(t))) {
    const data = {
      subType: cleanDetail.subType,
      rackUnits: cleanDetail.rackUnits,
      powerCapacity: cleanDetail.powerCapacity,
      rackLocation: cleanDetail.rackLocation,
    };
    const finalData = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
    return prisma.rackDetail.upsert({
      where: { assetId },
      create: { assetId, ...finalData },
      update: finalData,
    });
  }
  if (typeLower.includes('printer')) {
    const data = {
      printerType: cleanDetail.printerType,
      isColor: parseBoolean(cleanDetail.isColor),
      networkReady: parseBoolean(cleanDetail.networkReady),
      ipAddress: cleanDetail.ipAddress,
      macAddress: cleanDetail.macAddress,
      pageCount: parseIntOrUndefined(cleanDetail.pageCount),
      duplexSupport: parseBoolean(cleanDetail.duplexSupport),
    };
    const finalData = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
    return prisma.printerDetail.upsert({
      where: { assetId },
      create: { assetId, ...finalData },
      update: finalData,
    });
  }
  if (['hdmi', 'displayport', 'usb-c', 'lan', 'power', 'audio', 'cable', 'vga', 'adapter', 'converter'].some(t => typeLower.includes(t))) {
    const data = {
      cableType: cleanDetail.cableType,
      length: cleanDetail.length,
      stockQuantity: parseIntOrUndefined(cleanDetail.stockQuantity),
      minimumStock: parseIntOrUndefined(cleanDetail.minimumStock),
    };
    const finalData = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
    return prisma.cableDetail.upsert({
      where: { assetId },
      create: { assetId, ...finalData },
      update: finalData,
    });
  }
  if (['toner', 'ink', 'cartridge', 'battery', 'adapter', 'charger', 'consumable', 'paper', 'drum', 'ribbon'].some(t => typeLower.includes(t))) {
    const data = {
      consumableType: cleanDetail.consumableType,
      compatibleWith: cleanDetail.compatibleWith,
      stockQuantity: parseIntOrUndefined(cleanDetail.stockQuantity),
      minimumStock: parseIntOrUndefined(cleanDetail.minimumStock),
      expiryDate: parseDateOrUndefined(cleanDetail.expiryDate),
    };
    const finalData = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
    return prisma.consumableDetail.upsert({
      where: { assetId },
      create: { assetId, ...finalData },
      update: finalData,
    });
  }
  return null;
}

const ASSET_STATUS_OPTIONS = new Set(['Available', 'Borrowed', 'InUse', 'Maintenance', 'Retired', 'Lost']);

const ASSET_TYPE_GROUPS: Record<string, string[]> = {
  computers: ['Computer', 'Notebook', 'PC Desktop', 'Desktop PC', 'Laptop', 'Workstation', 'Macbook', 'Mini PC', 'All-in-One', 'Thin Client'],
  monitors: ['Monitor', 'Monitor มาตรฐาน', 'Monitor Ultrawide', 'Monitor Curved', 'Monitor 4K'],
  devices: ['Device', 'Projector', 'Conference Speaker', 'Webcam', 'Docking Station', 'Presentation Clicker', 'Accessory', 'Peripheral', 'Speaker', 'Dock'],
  printers: ['Printer', 'Laser Printer', 'Inkjet Printer', 'Thermal Printer', 'Dot Matrix Printer'],
  phonesTablets: ['Phone', 'Tablet', 'Smartphone', 'Mobile Phone', 'Mobile Hotspot'],
  network: ['Network', 'Network Device', 'Switch', 'Router', 'Firewall', 'Access Point', 'AP', 'Modem'],
};

router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, status, department, location, type, typeGroup, page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 100);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status) where.status = status as string;
    if (department) where.departmentId = department as string;
    if (location) where.location = location as string;
    if (type) {
      where.type = type as string;
    } else if (typeGroup && ASSET_TYPE_GROUPS[String(typeGroup)]) {
      where.type = { in: ASSET_TYPE_GROUPS[String(typeGroup)] };
    }
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

router.get('/stats', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { typeGroup } = req.query;
    const where: any = {};
    if (typeGroup && ASSET_TYPE_GROUPS[String(typeGroup)]) {
      where.type = { in: ASSET_TYPE_GROUPS[String(typeGroup)] };
    }
    if (req.user!.role === 'USER') where.status = 'Available';
    const [byStatus, total] = await Promise.all([
      prisma.asset.groupBy({ by: ['status'], where, _count: true }),
      prisma.asset.count({ where }),
    ]);
    res.json({ total, byStatus });
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

  if (['notebook', 'pc desktop', 'macbook', 'mini pc', 'all-in-one', 'thin client', 'computer'].some(t => typeLower.includes(t))) {
    return prisma.computerDetail.findUnique({ where: { assetId } });
  }
  if (['smartphone', 'tablet', 'mobile hotspot'].some(t => typeLower.includes(t))) {
    return prisma.phoneDetail.findUnique({ where: { assetId } });
  }
  if (typeLower.includes('monitor')) {
    return prisma.monitorDetail.findUnique({ where: { assetId } });
  }
  if (['projector', 'conference speaker', 'webcam', 'docking station', 'presentation clicker', 'device', 'accessory', 'speaker', 'dock', 'peripheral'].some(t => typeLower.includes(t))) {
    return prisma.deviceDetail.findUnique({ where: { assetId } });
  }
  if (['switch', 'router', 'access point', 'firewall', 'modem', 'network'].some(t => typeLower.includes(t))) {
    return prisma.networkDeviceDetail.findUnique({ where: { assetId } });
  }
  if (['server rack', 'pdu', 'ups', 'enclosure', 'rack'].some(t => typeLower.includes(t))) {
    return prisma.rackDetail.findUnique({ where: { assetId } });
  }
  if (typeLower.includes('printer')) {
    return prisma.printerDetail.findUnique({ where: { assetId } });
  }
  if (['hdmi', 'displayport', 'usb-c', 'lan', 'power', 'audio', 'cable'].some(t => typeLower.includes(t))) {
    return prisma.cableDetail.findUnique({ where: { assetId } });
  }
  if (['toner', 'ink', 'cartridge', 'battery', 'adapter', 'charger', 'consumable'].some(t => typeLower.includes(t))) {
    return prisma.consumableDetail.findUnique({ where: { assetId } });
  }
  return null;
}

  router.get('/export/excel', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const typeParam = req.query.type as string;
      let whereClause: any = {};
      if (typeParam) {
        if (ASSET_TYPE_GROUPS[typeParam]) {
          whereClause = { type: { in: ASSET_TYPE_GROUPS[typeParam] } };
        } else {
          whereClause = { type: typeParam };
        }
      }

      const assets = await prisma.asset.findMany({
        where: whereClause,
        include: {
          category: true,
          computerDetail: true,
          phoneDetail: true,
          monitorDetail: true,
          deviceDetail: true,
          networkDeviceDetail: true,
          rackDetail: true,
          printerDetail: true,
          cableDetail: true,
          consumableDetail: true,
        },
        orderBy: { updatedAt: 'desc' }
      });
  
      const rows = assets.map(asset => {
        let details: any = {};
        if (asset.computerDetail) details = { ...asset.computerDetail };
        if (asset.phoneDetail) details = { ...asset.phoneDetail };
        if (asset.monitorDetail) details = { ...asset.monitorDetail };
        if (asset.deviceDetail) details = { ...asset.deviceDetail };
        if (asset.networkDeviceDetail) details = { ...asset.networkDeviceDetail };
        if (asset.rackDetail) details = { ...asset.rackDetail };
        if (asset.printerDetail) details = { ...asset.printerDetail };
        if (asset.cableDetail) details = { ...asset.cableDetail };
        if (asset.consumableDetail) details = { ...asset.consumableDetail };
        
        delete details.id;
        delete details.assetId;
        
        return {
          'Asset ID': asset.id,
          'Asset Code': asset.assetCode,
          'Asset Name': asset.assetName,
          'Serial No': asset.serialNo,
          'Type': asset.type,
          'Category': asset.category?.name || '',
          'Status': asset.status,
          'Brand': asset.brand,
          'Model': asset.model,
          'Company': asset.company,
          'Owner': asset.ownerName,
          'Department': asset.departmentId,
          'Location': asset.location,
          'Floor': asset.floor,
          'Old Asset Code': asset.oldAssetCode,
          'Domain Name': asset.domainName,
          'PO Number': asset.poNumber,
          'PO Date': asset.poDate ? asset.poDate.toISOString().split('T')[0] : '',
          'PR Number': asset.prNumber,
          'Purchase Date': asset.purchaseDate ? asset.purchaseDate.toISOString().split('T')[0] : '',
          'Vendor': asset.vendor,
          'Budget': asset.budget,
          'Remark': asset.remark,
          'Created At': asset.createdAt.toISOString(),
          'Updated At': asset.updatedAt.toISOString(),
          ...details
        };
      });
  
      const emptyRow = {
        'Asset ID': '',
        'Asset Code': '',
        'Asset Name': '',
        'Serial No': '',
        'Type': '',
        'Category': '',
        'Status': '',
        'Brand': '',
        'Model': '',
        'Company': '',
        'Owner': '',
        'Department': '',
        'Location': '',
        'Floor': '',
        'Old Asset Code': '',
        'Domain Name': '',
        'PO Number': '',
        'PO Date': '',
        'PR Number': '',
        'Purchase Date': '',
        'Vendor': '',
        'Budget': '',
        'Remark': '',
        'Created At': '',
        'Updated At': ''
      };

      const sheetsData: Record<string, any[]> = {};
      if (rows.length === 0) {
        sheetsData['Assets'] = [emptyRow];
      } else {
        rows.forEach((row, index) => {
          const type = assets[index].type || 'Other';
          if (!sheetsData[type]) sheetsData[type] = [];
          sheetsData[type].push(row);
        });
      }

      const workbook = xlsx.utils.book_new();
      for (const [sheetName, sheetRows] of Object.entries(sheetsData)) {
        const ws = xlsx.utils.json_to_sheet(sheetRows.length > 0 ? sheetRows : [emptyRow]);
        
        // Excel sheet names cannot exceed 31 chars and cannot contain certain chars
        let safeName = sheetName.replace(/[\\/*?:\[\]]/g, '').substring(0, 31);
        if (!safeName) safeName = 'Sheet';
        
        // Ensure unique name
        let finalName = safeName;
        let counter = 1;
        while (workbook.SheetNames.includes(finalName)) {
          finalName = `${safeName.substring(0, 28)}_${counter}`;
          counter++;
        }
        
        xlsx.utils.book_append_sheet(workbook, ws, finalName);
      }

      const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  
      res.setHeader('Content-Disposition', 'attachment; filename="assets_export.xlsx"');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  });

  router.post('/import/excel', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), uploadExcel.single('file'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw new AppError('ไม่พบไฟล์ที่อัปโหลด', 400);
  
      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
      
      const allRows: any[] = [];
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const rows: any[] = xlsx.utils.sheet_to_json(sheet);
        allRows.push(...rows);
      }
  
      let success = 0, errors = 0;
      
      for (const row of allRows) {
        try {
          const assetCode = row['Asset Code'] || row['รหัสทรัพย์สิน'];
          const serialNo = row['Serial No'] || row['Serial Number'] || row['SerialNumber'];
          
          if (!assetCode && !serialNo) {
            errors++;
            continue;
          }
  
          const categoryName = row['Category'] || row['หมวดหมู่'];
          let categoryId = null;
          if (categoryName) {
            const cat = await prisma.category.upsert({
              where: { name: categoryName },
              create: { name: categoryName, icon: '📦' },
              update: {}
            });
            categoryId = cat.id;
          }
  
          const poDate = row['PO Date'] ? new Date(row['PO Date']) : null;
          const purchaseDate = row['Purchase Date'] ? new Date(row['Purchase Date']) : null;
          const budgetVal = row['Budget'] || row['งบประมาณ'];
  
          const assetData = {
            assetCode: assetCode ? String(assetCode) : String(serialNo),
            assetName: row['Asset Name'] || row['ชื่อทรัพย์สิน'] || '',
            serialNo: serialNo ? String(serialNo) : String(assetCode),
            type: row['Type'] || row['ประเภทอุปกรณ์'] || '',
            categoryId,
            status: row['Status'] || row['สถานะ'] || 'Available',
            brand: row['Brand'] || row['ยี่ห้อ'] || '',
            model: row['Model'] || row['รุ่น'] || '',
            company: row['Company'] || row['บริษัท'] || '',
            ownerName: row['Owner'] || row['ผู้ถือครอง'] || '',
            departmentId: row['Department'] || row['แผนก'] || '',
            location: row['Location'] || row['สถานที่'] || '',
            floor: row['Floor'] || row['ชั้น'] || '',
            oldAssetCode: row['Old Asset Code'] || row['รหัสทรัพย์สินเดิม'] || null,
            domainName: row['Domain Name'] || '',
            poNumber: row['PO Number'] || row['เลขที่ PO'] || '',
            poDate: poDate && !isNaN(poDate.getTime()) ? poDate : null,
            prNumber: row['PR Number'] || row['เลขที่ PR'] || '',
            purchaseDate: purchaseDate && !isNaN(purchaseDate.getTime()) ? purchaseDate : null,
            vendor: row['Vendor'] || '',
            budget: budgetVal ? String(budgetVal) : null,
            remark: row['Remark'] || row['หมายเหตุ'] || ''
          };
  
          const existing = await prisma.asset.findFirst({
            where: assetCode ? { assetCode: String(assetCode) } : { serialNo: String(serialNo) }
          });
  
          let savedAsset;
          if (existing) {
            savedAsset = await prisma.asset.update({ where: { id: existing.id }, data: assetData });
          } else {
            savedAsset = await prisma.asset.create({ data: assetData });
          }
  
          if (savedAsset.type) {
            await upsertAssetDetail(prisma, savedAsset.id, savedAsset.type, row);
          }
          
          success++;
        } catch (err) {
          console.error('Error importing row:', err);
          errors++;
        }
      }
  
      res.json({ success, errors, total: allRows.length });
    } catch (err) {
      next(err);
    }
  });

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
