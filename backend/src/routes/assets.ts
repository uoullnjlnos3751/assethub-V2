import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { Prisma } from '@prisma/client';
import { fetchGLPISpecBySerial } from '../services/glpi';
import { searchADUsers } from '../services/ldap';
import { cleanMasterValue } from '../utils/assetHelpers';
import multer from 'multer';
import * as xlsx from 'xlsx';
import ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

declare global {
  namespace Express {
    interface Request {
      file?: Express.Multer.File;
    }
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
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
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'documents');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const docUpload = multer({
  storage: multer.diskStorage({
    destination: (_req: any, _file: any, cb: any) => cb(null, UPLOAD_DIR),
    filename: (_req: any, file: any, cb: any) => {
      const ext = path.extname(file.originalname);
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req: any, file: any, cb: any) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('ประเภทไฟล์ไม่รองรับ (รองรับ: PDF, รูปภาพ, Word, Excel)'));
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

const withCalculatedWarranty = <T extends { warrantyEndDate?: Date | null }>(asset: T) => ({
  ...asset,
  warrantyDaysLeft: asset.warrantyEndDate ? Math.max(0, Math.round((new Date(asset.warrantyEndDate).getTime() - Date.now()) / 86400000)) : null,
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
  'oldAssetCode', 'accountingCode', 'budget', 'image', 'categoryId',
  'memoryType', 'ramOnboard', 'ramType', 'ramSpeed', 'ramMaxSupported', 'ramAvailableSlots', 'ramUpgradeable',
  'assignedToUserId', 'departmentRefId', 'vendorRefId', 'locationRefId',
]);

// Resolve ownerName -> AppUser.id via exact, whitespace/case-normalized match.
// Returns null when there's no match or the match is ambiguous (never guesses).
const resolveAssignedToUserId = async (ownerName?: string | null): Promise<number | null> => {
  const trimmed = ownerName ? String(ownerName).trim() : '';
  if (!trimmed) return null;
  const rows = await prisma.$queryRaw<{ id: number }[]>`
    SELECT id FROM app_users
    WHERE "displayName" IS NOT NULL
      AND upper(trim(regexp_replace("displayName", '\s+', ' ', 'g'))) = upper(trim(regexp_replace(${trimmed}, '\s+', ' ', 'g')))
    LIMIT 2
  `;
  return rows.length === 1 ? rows[0].id : null;
};

// Resolve Asset.departmentId/vendor/location free-text -> master-table id via exact,
// whitespace/case-normalized match. name is unique on all three master tables, so
// (unlike resolveAssignedToUserId) there's no ambiguous-match case to guard against —
// only "no match", which is expected to be common until master data / free-text entry
// converge (see migration 20260804000000_asset_master_data_fk for real-world match rates).
const resolveDepartmentRefId = async (departmentId?: string | null): Promise<number | null> => {
  const trimmed = departmentId ? String(departmentId).trim() : '';
  if (!trimmed) return null;
  const rows = await prisma.$queryRaw<{ id: number }[]>`
    SELECT id FROM departments
    WHERE upper(trim(regexp_replace(name, '\s+', ' ', 'g'))) = upper(trim(regexp_replace(${trimmed}, '\s+', ' ', 'g')))
    LIMIT 1
  `;
  return rows.length === 1 ? rows[0].id : null;
};

const resolveVendorRefId = async (vendor?: string | null): Promise<number | null> => {
  const trimmed = vendor ? String(vendor).trim() : '';
  if (!trimmed) return null;
  const rows = await prisma.$queryRaw<{ id: number }[]>`
    SELECT id FROM vendors
    WHERE upper(trim(regexp_replace(name, '\s+', ' ', 'g'))) = upper(trim(regexp_replace(${trimmed}, '\s+', ' ', 'g')))
    LIMIT 1
  `;
  return rows.length === 1 ? rows[0].id : null;
};

const resolveLocationRefId = async (location?: string | null): Promise<number | null> => {
  const trimmed = location ? String(location).trim() : '';
  if (!trimmed) return null;
  const rows = await prisma.$queryRaw<{ id: number }[]>`
    SELECT id FROM asset_locations
    WHERE upper(trim(regexp_replace(name, '\s+', ' ', 'g'))) = upper(trim(regexp_replace(${trimmed}, '\s+', ' ', 'g')))
    LIMIT 1
  `;
  return rows.length === 1 ? rows[0].id : null;
};

// AD hands back a company's full legal name — ldap.ts's getEmployeeProfile reads
// itasset_company_name_eng, and searchADUsers returns the raw `company` attribute
// — but every asset row and every PM plan's scope filter matches on the short
// company code instead. An asset saved straight from an AD owner-autofill
// therefore lands outside its own company's PM scope and silently never gets a
// PM run generated (found this way: HQ-PS-N051 stored as "Phitsanulok Sugar
// Co., Ltd." instead of "PS", invisible to plan #33 forever). Map any legal name
// we recognise back to its master-data code before saving.
const resolveCompanyCode = async (company?: string | null): Promise<string | null | undefined> => {
  const trimmed = company ? String(company).trim() : '';
  if (!trimmed) return company;

  const companies = await prisma.company.findMany({
    where: { isActive: true },
    select: { code: true, name: true, nameEng: true, assetCompanyCodes: true },
  });
  const norm = (s?: string | null) => String(s ?? '').trim().toUpperCase();
  const target = norm(trimmed);

  // Already a known asset company code — leave it exactly as entered.
  for (const c of companies) {
    const codes = (c.assetCompanyCodes || c.code || '').split(',').map(norm).filter(Boolean);
    if (codes.includes(target)) return trimmed;
  }
  // Otherwise swap a matched legal name (Thai or English) for its code.
  for (const c of companies) {
    if (norm(c.nameEng) === target || norm(c.name) === target) {
      const code = (c.assetCompanyCodes || '').split(',')[0].trim() || c.code;
      if (code) return code;
    }
  }
  // Unrecognised value: keep what the user typed rather than guess at a mapping.
  return trimmed;
};

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

  if (filtered.assetCode === '-' || filtered.assetCode === '' || filtered.assetCode === null) {
    filtered.assetCode = null;
  }
  // accountingCode is @unique like assetCode — an unset '' here would collide
  // with any other asset that also has no accounting code on file, since '' is
  // a real, comparable value to Postgres (unlike NULL, which never collides).
  if (filtered.accountingCode === '-' || filtered.accountingCode === '') {
    filtered.accountingCode = null;
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

// Validate required asset fields
const validateAssetData = (data: any, isCreate = true) => {
  const errors: string[] = [];

  // Required for both create and update
  const serialNo = data.serialNo ? String(data.serialNo).trim() : '';
  if (!serialNo) {
    errors.push('Serial Number ต้องไม่ว่างเปล่า');
  } else if (!/^[A-Z0-9\-_\.]+$/i.test(serialNo)) {
    errors.push('Serial Number ต้องเป็นตัวอักษร ตัวเลข หรือ ขีดกลาง/-/.');
  }

  const assetName = data.assetName ? String(data.assetName).trim() : '';
  if (!assetName) {
    errors.push('ชื่อทรัพย์สิน ต้องไม่ว่างเปล่า');
  }

  const type = data.type ? String(data.type).trim() : '';
  if (!type) {
    errors.push('ประเภท ต้องไม่ว่างเปล่า');
  }

  const brand = data.brand ? String(data.brand).trim() : '';
  if (!brand) {
    errors.push('ยี่ห้อ ต้องไม่ว่างเปล่า');
  }

  const departmentId = data.departmentId ? String(data.departmentId).trim() : '';
  if (!departmentId) {
    errors.push('แผนก ต้องไม่ว่างเปล่า');
  }

  const ownerName = data.ownerName ? String(data.ownerName).trim() : '';
  if (!ownerName) {
    errors.push('ผู้ถือครอง ต้องไม่ว่างเปล่า');
  }

  // Warranty Date validation
  if (data.purchaseDate && data.warrantyEndDate) {
    const purchaseDate = new Date(data.purchaseDate);
    const warrantyDate = new Date(data.warrantyEndDate);
    if (!isNaN(purchaseDate.getTime()) && !isNaN(warrantyDate.getTime())) {
      if (warrantyDate < purchaseDate) {
        errors.push('วันหมดประกัน ต้องหลังจาก วันที่จัดซื้อ');
      }
    }
  }

  return errors;
};

// Check for duplicate assets
const checkDuplicateAssets = async (data: any, excludeId?: number) => {
  const errors: string[] = [];

  // Check duplicate Serial Number
  if (data.serialNo && data.serialNo.trim()) {
    const query: any = { serialNo: { equals: data.serialNo.trim() } };
    if (excludeId) query.id = { not: excludeId };
    const existingSerial = await prisma.asset.findFirst({ where: query });
    if (existingSerial) {
      errors.push(`Serial Number นี้มีอยู่แล้ว (Asset Code: ${existingSerial.assetCode})`);
    }
  }

  // Check duplicate Asset Code (if specified)
  if (data.assetCode && data.assetCode.trim() && data.assetCode !== '-') {
    const query: any = { assetCode: { equals: data.assetCode.trim() } };
    if (excludeId) query.id = { not: excludeId };
    const existingCode = await prisma.asset.findFirst({ where: query });
    if (existingCode) {
      errors.push(`Asset Code นี้มีอยู่แล้ว (S/N: ${existingCode.serialNo})`);
    }
  }

  // Check duplicate Accounting Code (เลขครุภัณฑ์ฝ่ายบัญชี) — optional field,
  // only enforced when actually provided.
  if (data.accountingCode && data.accountingCode.trim()) {
    const query: any = { accountingCode: { equals: data.accountingCode.trim() } };
    if (excludeId) query.id = { not: excludeId };
    const existingAccountingCode = await prisma.asset.findFirst({ where: query });
    if (existingAccountingCode) {
      errors.push(`เลขครุภัณฑ์นี้มีอยู่แล้ว (Asset Code: ${existingAccountingCode.assetCode})`);
    }
  }

  // Check duplicate Computer S/N (for computer assets)
  if (data.snComputer && data.snComputer.trim()) {
    const query: any = { snComputer: { equals: data.snComputer.trim() } };
    if (excludeId) query.id = { not: excludeId };
    const existingComputer = await prisma.asset.findFirst({ where: query });
    if (existingComputer) {
      errors.push(`S/N Computer นี้มีอยู่แล้ว (Asset Code: ${existingComputer.assetCode})`);
    }
  }

  return errors;
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
    
    // Sync to parent Asset columns to prevent empty specs in main asset queries
    await prisma.asset.update({
      where: { id: assetId },
      data: finalData,
    });

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

async function syncMasterDataFromAsset(asset: {
  type?: string | null;
  location?: string | null;
  company?: string | null;
  vendor?: string | null;
}) {
  const type = cleanMasterValue(asset.type);
  const location = cleanMasterValue(asset.location);
  const company = cleanMasterValue(asset.company);
  const vendor = cleanMasterValue(asset.vendor);

  await prisma.$transaction([
    ...(type ? [
      prisma.deviceType.upsert({
        where: { name: type },
        update: {},
        create: { name: type, description: type },
      }),
    ] : []),
    ...(location ? [
      prisma.assetLocation.upsert({
        where: { name: location },
        update: company ? { company } : {},
        create: { name: location, description: location, company: company || null },
      }),
    ] : []),
    ...(company ? [
      prisma.company.upsert({
        where: { name: company },
        update: {},
        create: { name: company },
      }),
    ] : []),
    ...(vendor ? [
      prisma.vendor.upsert({
        where: { name: vendor },
        update: {},
        create: { name: vendor },
      }),
    ] : []),
  ]);
}

const ASSET_TYPE_GROUPS: Record<string, string[]> = {
  computers: ['Computer', 'Notebook', 'PC Desktop', 'Desktop PC', 'Laptop', 'Workstation', 'Macbook', 'Mini PC', 'All-in-One', 'Thin Client'],
  monitors: ['Monitor', 'Monitor มาตรฐาน', 'Monitor Ultrawide', 'Monitor Curved', 'Monitor 4K'],
  devices: ['Device', 'Projector', 'Conference Speaker', 'Webcam', 'Docking Station', 'Presentation Clicker', 'Accessory', 'Peripheral', 'Speaker', 'Dock', 'Mouse', 'Keyboard', 'Microphone', 'Voice Recorder'],
  printers: ['Printer', 'Laser Printer', 'Inkjet Printer', 'Thermal Printer', 'Dot Matrix Printer'],
  phonesTablets: ['Phone', 'Tablet', 'Smartphone', 'Mobile Phone', 'Mobile Hotspot'],
  network: ['Network', 'Network Device', 'Switch', 'Router', 'Firewall', 'Access Point', 'AP', 'Modem'],
  rack: ['Server Rack', 'Server', 'PDU', 'UPS', 'Enclosure'],
};

router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, status, department, location, type, typeGroup, categoryId, cpu, ram, warrantyStatus, warrantyExpiringInDays, ownerName, exactOwnerName, screenSize, resolution, panelType, printerType, isColor, ipAddress, storage, osType, company, serialNo, purchaseDateFrom, purchaseDateTo, page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page as string);
    const parsedLimit = parseInt(limit as string);
    const limitNum = parsedLimit === 10000 ? 10000 : Math.min(parsedLimit, 100);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status) {
      // Comma-separated list -> multi-status filter (same convention as cpu/ram/storage below)
      const statusList = (status as string).split(',').map(s => s.trim()).filter(Boolean);
      if (statusList.length > 0) where.status = { in: statusList };
    }
    if (purchaseDateFrom || purchaseDateTo) {
      where.purchaseDate = {};
      if (purchaseDateFrom) where.purchaseDate.gte = new Date(purchaseDateFrom as string);
      if (purchaseDateTo) where.purchaseDate.lte = new Date(purchaseDateTo as string);
    }
    if (department) where.departmentId = department as string;
    if (location === '__EMPTY__') {
      where.OR = [...(where.OR || []), { location: null }, { location: '' }];
    } else if (location) {
      where.location = location as string;
    }
    if (categoryId) where.categoryId = parseInt(categoryId as string);
    if (company === '__EMPTY__') {
      where.OR = [...(where.OR || []), { company: null }, { company: '' }];
    } else if (company) {
      where.company = company as string;
    }
    if (serialNo === '__EMPTY__') {
      // serialNo is a required field (String @unique), so null filter is invalid — use empty/dash only
      where.OR = [...(where.OR || []), { serialNo: '' }, { serialNo: '-' }];
    } else if (serialNo) {
      where.serialNo = serialNo as string;
    }

    // Apply company visibility mapping for non-admins
    if (req.user && !['SUPERADMIN', 'IT_ADMIN'].includes(req.user.role)) {
      const appUser = await prisma.appUser.findUnique({ where: { id: req.user.userId } });
      if (appUser && appUser.company) {
        const adCompany = await prisma.company.findUnique({ where: { name: appUser.company } });
        if (adCompany && adCompany.assetCompanyCodes) {
          const allowedCompanies = adCompany.assetCompanyCodes.split(',').map(s => s.trim()).filter(Boolean);
          if (allowedCompanies.length > 0) {
            where.company = { in: allowedCompanies };
          } else {
            // If mapping exists but is empty, fallback to not seeing anything or just global
            where.company = { in: ['__NONE__'] };
          }
        } else {
          // If no mapping defined, fallback to their exact company name or nothing
          where.company = { in: ['__NONE__'] };
        }
      } else {
        where.company = { in: ['__NONE__'] };
      }
    }
    if (type === '__EMPTY__') {
      where.OR = [...(where.OR || []), { type: null }, { type: '' }];
    } else if (type) {
      where.type = type as string;
    } else if (typeGroup && ASSET_TYPE_GROUPS[String(typeGroup)]) {
      where.type = { in: ASSET_TYPE_GROUPS[String(typeGroup)] };
    }
      if (exactOwnerName) {
        where.ownerName = { equals: exactOwnerName as string, mode: 'insensitive' };
      } else if (ownerName) {
        where.ownerName = { contains: ownerName as string, mode: 'insensitive' };
      }
    if (cpu) {
      const cpuList = (cpu as string).split(',').map(s => s.trim()).filter(Boolean);
      if (cpuList.length > 1) {
        where.OR = [...(where.OR || []), ...cpuList.map(val => ({ cpu: { contains: val, mode: 'insensitive' as const } }))];
      } else {
        where.cpu = { contains: cpu as string, mode: 'insensitive' };
      }
    }
    if (ram) {
      const ramList = (ram as string).split(',').map(s => s.trim()).filter(Boolean);
      const ramConds = ramList.map(val => ({ ram: { contains: val, mode: 'insensitive' as const } }));
      where.OR = [...(where.OR || []), ...ramConds];
    }
    if (search) {
      where.OR = [
        ...(where.OR || []),
        { assetCode: { contains: search as string, mode: 'insensitive' } },
        { assetName: { contains: search as string, mode: 'insensitive' } },
        { serialNo: { contains: search as string, mode: 'insensitive' } },
        { brand: { contains: search as string, mode: 'insensitive' } },
        { model: { contains: search as string, mode: 'insensitive' } },
        { type: { contains: search as string, mode: 'insensitive' } },
        { location: { contains: search as string, mode: 'insensitive' } },
        { departmentId: { contains: search as string, mode: 'insensitive' } },
        { ownerName: { contains: search as string, mode: 'insensitive' } },
      ];
    }
    // warranty filter: active / expired / none / expiringSoon
    const now = new Date();
    if (warrantyStatus) {
      const ws = (warrantyStatus as string).toLowerCase();
      if (ws === 'active') {
        where.warrantyEndDate = { gte: now };
      } else if (ws === 'expired') {
        where.warrantyEndDate = { lt: now };
      } else if (ws === 'none') {
        where.warrantyEndDate = null;
      } else if (ws === 'expiringsoon') {
        const days = parseInt(warrantyExpiringInDays as string) || 30;
        const future = new Date(Date.now() + days * 86400000);
        where.warrantyEndDate = { gte: now, lte: future };
      }
    } else if (warrantyExpiringInDays) {
      const days = parseInt(warrantyExpiringInDays as string);
      if (!isNaN(days)) {
        const future = new Date(Date.now() + days * 86400000);
        where.warrantyEndDate = { gte: now, lte: future };
      }
    }

    // Type-specific detail filters
    if (screenSize) {
      where.monitorDetail = { ...(where.monitorDetail || {}), screenSize: { contains: screenSize as string, mode: 'insensitive' } };
    }
    if (resolution) {
      where.monitorDetail = { ...(where.monitorDetail || {}), resolution: { contains: resolution as string, mode: 'insensitive' } };
    }
    if (panelType) {
      where.monitorDetail = { ...(where.monitorDetail || {}), panelType: { contains: panelType as string, mode: 'insensitive' } };
    }
    if (printerType) {
      where.printerDetail = { ...(where.printerDetail || {}), printerType: { contains: printerType as string, mode: 'insensitive' } };
    }
    if (isColor) {
      where.printerDetail = { ...(where.printerDetail || {}), isColor: isColor === 'true' };
    }
    if (ipAddress) {
      where.networkDeviceDetail = { ...(where.networkDeviceDetail || {}), ipAddress: { contains: ipAddress as string, mode: 'insensitive' } };
    }
    if (storage) {
      const storageList = (storage as string).split(',').map(s => s.trim()).filter(Boolean);
      const storageConds = storageList.map(val => ({ storage1: { contains: val, mode: 'insensitive' as const } }));
      where.OR = [...(where.OR || []), ...storageConds];
    }
    if (osType) {
      where.osType = { contains: osType as string, mode: 'insensitive' };
    }

    // Data scoping: USER can only see Available assets
    if (req.user!.role === 'USER' && !status) {
      where.status = 'Available';
    }

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where, skip, take: limitNum, orderBy: { createdAt: 'desc' },
        // Explicit select excluding `image`: it stores the full base64 upload
        // directly in the row (up to ~10MB each), and an unfiltered
        // findMany() was round-tripping that for every row on every page
        // load — newest-first sort makes this worst-case by default, since
        // recent uploads are disproportionately the ones with a photo. The
        // list/grid view already falls back to a placeholder icon when no
        // image is present, so dropping it here is a safe no-UI-break change;
        // the full photo still loads on the single-asset detail page.
        select: {
          id: true,
          assetCode: true,
          assetName: true,
          accountingCode: true,
          serialNo: true,
          type: true,
          categoryId: true,
          brand: true,
          model: true,
          cpu: true,
          ram: true,
          osVersion: true,
          windowsLicense: true,
          officeLicense: true,
          antivirusStatus: true,
          vendor: true,
          poNumber: true,
          prNumber: true,
          purchaseDate: true,
          purchasePrice: true,
          warrantyEndDate: true,
          age: true,
          ownerName: true,
          departmentId: true,
          location: true,
          status: true,
          remark: true,
          createdAt: true,
          updatedAt: true,
          company: true,
          oldAssetCode: true,
          cpuGeneration: true,
          domainName: true,
          floor: true,
          poDate: true,
          ramDetail: true,
          gpu: true,
          osType: true,
          budget: true,
          ramSlot1: true,
          ramSlot2: true,
          memoryType: true,
          ramOnboard: true,
          ramType: true,
          ramSpeed: true,
          ramMaxSupported: true,
          ramAvailableSlots: true,
          ramUpgradeable: true,
          snComputer: true,
          storage1: true,
          storage2: true,
          assignedToUserId: true,
          departmentRefId: true,
          vendorRefId: true,
          locationRefId: true,
          usefulLifeYears: true,
          salvageValue: true,
          requesterName: true,
          budgetCode: true,
          receivedDate: true,
          category: { select: { id: true, name: true, icon: true } },
          consumableDetail: { select: { stockQuantity: true, minimumStock: true } },
        },
      }),
      prisma.asset.count({ where }),
    ]);

    // compute heldDays for each asset (days since last OWNER_CHANGE)
    const assetIds = assets.map(a => a.id);
    const lastOwnerChanges = assetIds.length > 0 ? await prisma.assetHistory.findMany({
      where: { assetId: { in: assetIds }, actionType: 'OWNER_CHANGE' },
      orderBy: { createdAt: 'desc' },
      distinct: ['assetId'],
      select: { assetId: true, createdAt: true },
    }) : [];
    const heldDaysMap = new Map(lastOwnerChanges.map(h => [h.assetId, Math.max(0, Math.round((Date.now() - new Date(h.createdAt).getTime()) / 86400000))]));

    const enriched = assets.map(a => withCalculatedWarranty(withCalculatedAge({
      ...a,
      heldDays: heldDaysMap.get(a.id) ?? (a.ownerName ? 0 : null),
    })));

    res.json({ data: enriched, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) { next(err); }
  });

router.get('/filter-options', authenticate, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const notNull = { not: null };
    const [cpus, rams, osTypes, storages, screenSizes, resolutions, panelTypes, printerTypes, colors, brands, departments, locations, companies] = await Promise.all([
      prisma.asset.findMany({ distinct: ['cpu'], where: { cpu: notNull }, select: { cpu: true }, orderBy: { cpu: 'asc' } }),
      prisma.asset.findMany({ distinct: ['ram'], where: { ram: notNull }, select: { ram: true }, orderBy: { ram: 'asc' } }),
      prisma.asset.findMany({ distinct: ['osType'], where: { osType: notNull }, select: { osType: true }, orderBy: { osType: 'asc' } }),
      prisma.asset.findMany({ distinct: ['storage1'], where: { storage1: notNull }, select: { storage1: true }, orderBy: { storage1: 'asc' } }),
      prisma.monitorDetail.findMany({ distinct: ['screenSize'], where: { screenSize: notNull }, select: { screenSize: true }, orderBy: { screenSize: 'asc' } }),
      prisma.monitorDetail.findMany({ distinct: ['resolution'], where: { resolution: notNull }, select: { resolution: true }, orderBy: { resolution: 'asc' } }),
      prisma.monitorDetail.findMany({ distinct: ['panelType'], where: { panelType: notNull }, select: { panelType: true }, orderBy: { panelType: 'asc' } }),
      prisma.printerDetail.findMany({ distinct: ['printerType'], where: { printerType: notNull }, select: { printerType: true }, orderBy: { printerType: 'asc' } }),
      prisma.printerDetail.findMany({ distinct: ['isColor'], where: { isColor: { not: null } }, select: { isColor: true } }),
      prisma.asset.findMany({ distinct: ['brand'], where: { brand: notNull }, select: { brand: true }, orderBy: { brand: 'asc' } }),
      prisma.asset.findMany({ distinct: ['departmentId'], where: { departmentId: notNull }, select: { departmentId: true }, orderBy: { departmentId: 'asc' } }),
      prisma.asset.findMany({ distinct: ['location'], where: { location: notNull }, select: { location: true }, orderBy: { location: 'asc' } }),
      prisma.asset.findMany({ distinct: ['company'], where: { company: notNull }, select: { company: true }, orderBy: { company: 'asc' } }),
    ]);
    res.json({
      cpu: cpus.map(r => r.cpu).filter(c => c && c.trim()),
      ram: rams.map(r => r.ram).filter(c => c && c.trim()),
      osType: osTypes.map(r => r.osType).filter(c => c && c.trim()),
      storage: storages.map(r => r.storage1).filter(c => c && c.trim()),
      screenSize: screenSizes.map(r => r.screenSize).filter(c => c && c.trim()),
      resolution: resolutions.map(r => r.resolution).filter(c => c && c.trim()),
      panelType: panelTypes.map(r => r.panelType).filter(c => c && c.trim()),
      printerType: printerTypes.map(r => r.printerType).filter(c => c && c.trim()),
      isColor: colors.map(r => r.isColor).filter(c => c !== null),
      brand: brands.map(r => r.brand).filter(c => c && c.trim()),
      departmentId: departments.map(r => r.departmentId).filter(c => c && c.trim()),
      location: locations.map(r => r.location).filter(c => c && c.trim()),
      company: companies.map(r => r.company).filter(c => c && c.trim()),
    });
  } catch (err) { next(err); }
});

router.get('/check-duplicate', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { assetCode, accountingCode, serialNo, assetName, excludeId } = req.query;
    const where: any[] = [];
    if (assetCode) where.push({ assetCode: assetCode as string });
    if (accountingCode) where.push({ accountingCode: accountingCode as string });
    if (serialNo) where.push({ serialNo: serialNo as string });
    if (assetName) where.push({ assetName: assetName as string });
    if (where.length === 0) return res.json({ duplicates: {} });
    const whereClause: any = { OR: where };
    if (excludeId) whereClause.NOT = { id: parseInt(excludeId as string) };
    const existing = await prisma.asset.findMany({ where: whereClause, select: { id: true, assetCode: true, accountingCode: true, serialNo: true, assetName: true } });
    const duplicates: Record<string, boolean> = {};
    if (assetCode) duplicates.assetCode = existing.some(a => a.assetCode === assetCode);
    if (accountingCode) duplicates.accountingCode = existing.some(a => a.accountingCode === accountingCode);
    if (serialNo) duplicates.serialNo = existing.some(a => a.serialNo === serialNo);
    if (assetName) duplicates.assetName = existing.some(a => a.assetName === assetName);
    res.json({ duplicates });
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

router.get('/options/brands', authenticate, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await prisma.asset.findMany({ where: { brand: { not: null } }, distinct: ['brand'], select: { brand: true }, orderBy: { brand: 'asc' } });
    res.json(rows.map((r) => r.brand).filter((v): v is string => v !== null && v !== ''));
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
    const defaults = ['PS', 'TRR', 'TRRCORP', 'TRRL', 'TRRP', 'TRRT', 'TRW', 'TRRSK', 'SSEC', 'TMI', 'TRM'];
    const rows = await prisma.asset.findMany({ where: { company: { not: null } }, distinct: ['company'], select: { company: true }, orderBy: { company: 'asc' } });
    const existing = new Set(rows.map((r) => r.company).filter((v): v is string => v !== null && v !== ''));
    defaults.forEach((d) => existing.add(d));
    res.json(Array.from(existing).sort((a, b) => a.localeCompare(b)));
  } catch (err) { next(err); }
});

// Suggests the next IT asset code (assetName, e.g. HQ-TRRCORP-N116) by finding
// the most common code prefix among existing assets that match the same
// company/department/type, then incrementing its highest trailing number.
// Never invents a prefix that has no precedent in real data — degrades
// through progressively broader matches and reports which tier was used.
router.get('/next-code', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const company = String(req.query.company || '').trim();
    const departmentId = String(req.query.departmentId || '').trim();
    const type = String(req.query.type || '').trim();

    if (!company) {
      res.json({ suggested: null, matchedOn: null, basedOn: 0 });
      return;
    }

    function extractPattern(names: string[]) {
      const prefixCount = new Map<string, { count: number; maxNum: number; maxCode: string; digitLen: number }>();
      for (const name of names) {
        const m = name.match(/^(.*?)(\d+)$/);
        if (!m) continue;
        const prefix = m[1];
        const numStr = m[2];
        const num = parseInt(numStr, 10);
        const entry = prefixCount.get(prefix) || { count: 0, maxNum: -1, maxCode: '', digitLen: numStr.length };
        entry.count++;
        if (num > entry.maxNum) { entry.maxNum = num; entry.maxCode = name; entry.digitLen = numStr.length; }
        prefixCount.set(prefix, entry);
      }
      if (prefixCount.size === 0) return null;
      const [bestPrefix, info] = [...prefixCount.entries()].sort((a, b) => b[1].count - a[1].count)[0];
      return {
        prefix: bestPrefix,
        maxCode: info.maxCode,
        count: info.count,
        suggested: bestPrefix + String(info.maxNum + 1).padStart(info.digitLen, '0'),
      };
    }

    let matchedOn: string | null = null;
    let result: ReturnType<typeof extractPattern> = null;

    if (departmentId && type) {
      const rows = await prisma.asset.findMany({
        where: { company, departmentId, type, assetName: { not: null } },
        select: { assetName: true },
      });
      result = extractPattern(rows.map((r) => r.assetName!));
      if (result) matchedOn = 'company+department+type';
    }

    if (!result && type) {
      const rows = await prisma.asset.findMany({
        where: { company, type, assetName: { not: null } },
        select: { assetName: true },
      });
      result = extractPattern(rows.map((r) => r.assetName!));
      if (result) matchedOn = 'company+type';
    }

    if (!result) {
      const rows = await prisma.asset.findMany({
        where: { company, assetName: { not: null } },
        select: { assetName: true },
      });
      result = extractPattern(rows.map((r) => r.assetName!));
      if (result) matchedOn = 'company';
    }

    if (!result) {
      res.json({ suggested: null, matchedOn: null, basedOn: 0 });
      return;
    }

    res.json({
      suggested: result.suggested,
      prefix: result.prefix,
      lastCode: result.maxCode,
      basedOn: result.count,
      matchedOn,
    });
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

// Device types / locations / companies / vendors / asset statuses CRUD +
// "import from existing assets" moved to routes/assetMasterData.ts (mounted
// at the same /api/assets base in app.ts, before this router). Pure code
// motion, no behavior change — see that file for why the mount order
// matters.

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
      const { type: typeParam, search, status, categoryId, type: typeFilter, typeGroup, department, location } = req.query;
      let whereClause: any = {};

      if (search) {
        whereClause.OR = [
          { assetCode: { contains: search as string, mode: 'insensitive' } },
          { serialNo: { contains: search as string, mode: 'insensitive' } },
          { model: { contains: search as string, mode: 'insensitive' } },
          { ownerName: { contains: search as string, mode: 'insensitive' } },
        ];
      }
      if (status) whereClause.status = status as string;
      if (categoryId) whereClause.categoryId = parseInt(categoryId as string);
      if (typeFilter) whereClause.type = typeFilter as string;
      if (typeGroup && ASSET_TYPE_GROUPS[String(typeGroup)]) {
        whereClause.type = { in: ASSET_TYPE_GROUPS[String(typeGroup)] };
      }
      if (department) whereClause.departmentId = department as string;
      if (location) whereClause.location = location as string;
      // backward compat: single type param (non-filtered export)
      if (!search && !status && !categoryId && !typeFilter && !typeGroup && !department && !location) {
        if (typeParam && !ASSET_TYPE_GROUPS[String(typeParam)]) {
          whereClause = { type: typeParam as string };
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
        if (asset.computerDetail) {
          details = {
            'CPU': asset.computerDetail.cpu,
            'Generation': asset.computerDetail.cpuGeneration,
            'GPU': asset.computerDetail.gpu,
            'RAM': asset.computerDetail.ram,
            'RAM Detail': '',
            'RAM Slot1': asset.computerDetail.ramSlot1,
            'RAM Slot2': asset.computerDetail.ramSlot2,
            'Storage 1': asset.computerDetail.storage1,
            'Storage 2': asset.computerDetail.storage2,
            'OS': asset.computerDetail.osType,
            'Windows Version': asset.computerDetail.osVersion,
            'Windows License': asset.computerDetail.windowsLicense,
            'MS Office': asset.computerDetail.officeLicense,
            'Antivirus': asset.computerDetail.antivirusStatus,
            'S/N Computer': asset.computerDetail.snComputer,
            'Domain Name': asset.computerDetail.domainName,
          };
        }
        if (asset.phoneDetail) {
          details = {
            'IMEI 1': asset.phoneDetail.imei1,
            'IMEI 2': asset.phoneDetail.imei2,
            'OS Version': asset.phoneDetail.osVersion,
            'Storage': asset.phoneDetail.storageCapacity,
            'RAM': asset.phoneDetail.ram,
            'Phone Number': asset.phoneDetail.phoneNumber,
            'MDM Enrolled': asset.phoneDetail.mdmEnrolled ? 'Yes' : 'No',
            'SIM Provider': asset.phoneDetail.simProvider,
          };
        }
        if (asset.monitorDetail) {
          details = {
            'Screen Size': asset.monitorDetail.screenSize,
            'Resolution': asset.monitorDetail.resolution,
            'Panel Type': asset.monitorDetail.panelType,
            'Refresh Rate': asset.monitorDetail.refreshRate,
            'Ports': asset.monitorDetail.ports,
            'Has Speaker': asset.monitorDetail.hasSpeaker ? 'Yes' : 'No',
            'Curved': asset.monitorDetail.curved ? 'Yes' : 'No',
          };
        }
        if (asset.deviceDetail) {
          details = {
            'Device Type': asset.deviceDetail.deviceType,
            'Connection': asset.deviceDetail.connectionType,
            'Power Source': asset.deviceDetail.powerSource,
            'RGB Support': asset.deviceDetail.rgbSupport ? 'Yes' : 'No',
          };
        }
        if (asset.networkDeviceDetail) {
          details = {
            'Network Type': asset.networkDeviceDetail.networkType,
            'IP Address': asset.networkDeviceDetail.ipAddress,
            'MAC Address': asset.networkDeviceDetail.macAddress,
            'Firmware': asset.networkDeviceDetail.firmwareVersion,
            'Port Count': asset.networkDeviceDetail.portCount,
            'Rack Location': asset.networkDeviceDetail.locationRack,
            'PoE Support': asset.networkDeviceDetail.poeSupport ? 'Yes' : 'No',
          };
        }
        if (asset.rackDetail) {
          details = {
            'Sub Type': asset.rackDetail.subType,
            'Rack Units': asset.rackDetail.rackUnits,
            'Power Capacity': asset.rackDetail.powerCapacity,
            'Rack Location': asset.rackDetail.rackLocation,
          };
        }
        if (asset.printerDetail) {
          details = {
            'Printer Type': asset.printerDetail.printerType,
            'Is Color': asset.printerDetail.isColor ? 'Yes' : 'No',
            'Network Ready': asset.printerDetail.networkReady ? 'Yes' : 'No',
            'IP Address': asset.printerDetail.ipAddress,
            'MAC Address': asset.printerDetail.macAddress,
            'Page Count': asset.printerDetail.pageCount,
            'Duplex Support': asset.printerDetail.duplexSupport ? 'Yes' : 'No',
          };
        }
        if (asset.cableDetail) {
          details = {
            'Cable Type': asset.cableDetail.cableType,
            'Length': asset.cableDetail.length,
            'Stock': asset.cableDetail.stockQuantity,
            'Min Stock': asset.cableDetail.minimumStock,
          };
        }
        if (asset.consumableDetail) {
          details = {
            'Consumable Type': asset.consumableDetail.consumableType,
            'Compatible With': asset.consumableDetail.compatibleWith,
            'Stock': asset.consumableDetail.stockQuantity,
            'Min Stock': asset.consumableDetail.minimumStock,
            'Expiry Date': asset.consumableDetail.expiryDate ? new Date(asset.consumableDetail.expiryDate).toISOString().split('T')[0] : '',
          };
        }
        
        return {
          'ID': asset.id,
          'เลขครุภัณฑ์': asset.assetCode,
          'ชื่อทรัพย์สิน': asset.assetName,
          'Serial No.': asset.serialNo,
          'ประเภท': asset.type,
          'หมวดหมู่': asset.category?.name || '',
          'สถานะ': asset.status,
          'ยี่ห้อ': asset.brand,
          'รุ่น': asset.model,
          'Company': asset.company,
          'ผู้ถือครอง': asset.ownerName,
          'แผนก': asset.departmentId,
          'ที่ตั้ง': asset.location,
          'ชั้น': asset.floor,
          'รหัสทรัพย์สินเดิม': asset.oldAssetCode,
          'Domain Name': asset.domainName,
          'PO No.': asset.poNumber,
          'PO Date': asset.poDate ? asset.poDate.toISOString().split('T')[0] : '',
          'PR No.': asset.prNumber,
          'วันที่จัดซื้อ': asset.purchaseDate ? asset.purchaseDate.toISOString().split('T')[0] : '',
          'วันหมดประกัน': asset.warrantyEndDate ? asset.warrantyEndDate.toISOString().split('T')[0] : '',
          'ราคาจัดซื้อ': asset.purchasePrice ?? '',
          'Vendor': asset.vendor,
          'งบประมาณ': asset.budget,
          'หมายเหตุ': asset.remark,
          'วันที่สร้าง': asset.createdAt.toISOString(),
          'วันที่แก้ไขล่าสุด': asset.updatedAt.toISOString(),
          ...details
        };
      });

      const emptyRow = {
        'ID': '',
        'เลขครุภัณฑ์': '',
        'ชื่อทรัพย์สิน': '',
        'Serial No.': '',
        'ประเภท': '',
        'หมวดหมู่': '',
        'สถานะ': '',
        'ยี่ห้อ': '',
        'รุ่น': '',
        'Company': '',
        'ผู้ถือครอง': '',
        'แผนก': '',
        'ที่ตั้ง': '',
        'ชั้น': '',
        'รหัสทรัพย์สินเดิม': '',
        'Domain Name': '',
        'PO No.': '',
        'PO Date': '',
        'PR No.': '',
        'วันที่จัดซื้อ': '',
        'วันหมดประกัน': '',
        'ราคาจัดซื้อ': '',
        'Vendor': '',
        'งบประมาณ': '',
        'หมายเหตุ': '',
        'วันที่สร้าง': '',
        'วันที่แก้ไขล่าสุด': '',
      };

      const dataRows = rows.length > 0 ? rows : [emptyRow];
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Assets', { views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }] });
      
      const headers = Object.keys(dataRows[0]);
      worksheet.columns = headers.map(h => ({ header: h, key: h, width: 20 }));
      
      dataRows.forEach(row => {
        worksheet.addRow(row);
      });
      
      // Style Header
      worksheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0f172a' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
      
      // Style Data
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          row.eachCell((cell, colNumber) => {
            cell.border = { top: { style: 'thin', color: { argb: 'FFe2e8f0' } }, left: { style: 'thin', color: { argb: 'FFe2e8f0' } }, bottom: { style: 'thin', color: { argb: 'FFe2e8f0' } }, right: { style: 'thin', color: { argb: 'FFe2e8f0' } } };
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
            
            // Color code Status column
            if (headers[colNumber - 1] === 'สถานะ') {
              const statusVal = cell.value?.toString();
              if (statusVal === 'Available') { cell.font = { color: { argb: 'FF10b981' }, bold: true }; }
              else if (statusVal === 'Maintenance') { cell.font = { color: { argb: 'FFef4444' }, bold: true }; }
              else if (statusVal === 'Borrowed') { cell.font = { color: { argb: 'FFf59e0b' }, bold: true }; }
            }
          });
        }
      });
      
      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader('Content-Disposition', 'attachment; filename="assets_export.xlsx"');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buffer);
    } catch (err) { next(err); }
  });

  router.get('/export/csv', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { search, status, categoryId, type: typeFilter, typeGroup, department, location } = req.query;
      let whereClause: any = {};

      if (search) {
        whereClause.OR = [
          { assetCode: { contains: search as string, mode: 'insensitive' } },
          { serialNo: { contains: search as string, mode: 'insensitive' } },
          { model: { contains: search as string, mode: 'insensitive' } },
          { ownerName: { contains: search as string, mode: 'insensitive' } },
        ];
      }
      if (status) whereClause.status = status as string;
      if (categoryId) whereClause.categoryId = parseInt(categoryId as string);
      if (typeFilter) whereClause.type = typeFilter as string;
      if (typeGroup && ASSET_TYPE_GROUPS[String(typeGroup)]) {
        whereClause.type = { in: ASSET_TYPE_GROUPS[String(typeGroup)] };
      }
      if (department) whereClause.departmentId = department as string;
      if (location) whereClause.location = location as string;

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
        if (asset.computerDetail) {
          details = {
            'CPU': asset.computerDetail.cpu,
            'Generation': asset.computerDetail.cpuGeneration,
            'GPU': asset.computerDetail.gpu,
            'RAM': asset.computerDetail.ram,
            'RAM Detail': '',
            'RAM Slot1': asset.computerDetail.ramSlot1,
            'RAM Slot2': asset.computerDetail.ramSlot2,
            'Storage 1': asset.computerDetail.storage1,
            'Storage 2': asset.computerDetail.storage2,
            'OS': asset.computerDetail.osType,
            'Windows Version': asset.computerDetail.osVersion,
            'Windows License': asset.computerDetail.windowsLicense,
            'MS Office': asset.computerDetail.officeLicense,
            'Antivirus': asset.computerDetail.antivirusStatus,
            'S/N Computer': asset.computerDetail.snComputer,
          };
        }
        if (asset.phoneDetail) {
          details = {
            'IMEI 1': asset.phoneDetail.imei1,
            'IMEI 2': asset.phoneDetail.imei2,
            'OS Version': asset.phoneDetail.osVersion,
            'Storage': asset.phoneDetail.storageCapacity,
            'RAM': asset.phoneDetail.ram,
            'Phone Number': asset.phoneDetail.phoneNumber,
            'MDM Enrolled': asset.phoneDetail.mdmEnrolled ? 'Yes' : 'No',
            'SIM Provider': asset.phoneDetail.simProvider,
          };
        }
        if (asset.monitorDetail) {
          details = {
            'Screen Size': asset.monitorDetail.screenSize,
            'Resolution': asset.monitorDetail.resolution,
            'Panel Type': asset.monitorDetail.panelType,
            'Refresh Rate': asset.monitorDetail.refreshRate,
            'Ports': asset.monitorDetail.ports,
            'Has Speaker': asset.monitorDetail.hasSpeaker ? 'Yes' : 'No',
            'Curved': asset.monitorDetail.curved ? 'Yes' : 'No',
          };
        }
        if (asset.deviceDetail) {
          details = {
            'Device Type': asset.deviceDetail.deviceType,
            'Connection': asset.deviceDetail.connectionType,
            'Power Source': asset.deviceDetail.powerSource,
            'RGB Support': asset.deviceDetail.rgbSupport ? 'Yes' : 'No',
          };
        }
        if (asset.networkDeviceDetail) {
          details = {
            'Network Type': asset.networkDeviceDetail.networkType,
            'IP Address': asset.networkDeviceDetail.ipAddress,
            'MAC Address': asset.networkDeviceDetail.macAddress,
            'Firmware': asset.networkDeviceDetail.firmwareVersion,
            'Port Count': asset.networkDeviceDetail.portCount,
            'Rack Location': asset.networkDeviceDetail.locationRack,
            'PoE Support': asset.networkDeviceDetail.poeSupport ? 'Yes' : 'No',
          };
        }
        if (asset.rackDetail) {
          details = {
            'Sub Type': asset.rackDetail.subType,
            'Rack Units': asset.rackDetail.rackUnits,
            'Power Capacity': asset.rackDetail.powerCapacity,
            'Rack Location': asset.rackDetail.rackLocation,
          };
        }
        if (asset.printerDetail) {
          details = {
            'Printer Type': asset.printerDetail.printerType,
            'Is Color': asset.printerDetail.isColor ? 'Yes' : 'No',
            'Network Ready': asset.printerDetail.networkReady ? 'Yes' : 'No',
            'IP Address': asset.printerDetail.ipAddress,
            'MAC Address': asset.printerDetail.macAddress,
            'Page Count': asset.printerDetail.pageCount,
            'Duplex Support': asset.printerDetail.duplexSupport ? 'Yes' : 'No',
          };
        }
        if (asset.cableDetail) {
          details = {
            'Cable Type': asset.cableDetail.cableType,
            'Length': asset.cableDetail.length,
            'Stock': asset.cableDetail.stockQuantity,
            'Min Stock': asset.cableDetail.minimumStock,
          };
        }
        if (asset.consumableDetail) {
          details = {
            'Consumable Type': asset.consumableDetail.consumableType,
            'Compatible With': asset.consumableDetail.compatibleWith,
            'Stock': asset.consumableDetail.stockQuantity,
            'Min Stock': asset.consumableDetail.minimumStock,
            'Expiry Date': asset.consumableDetail.expiryDate ? new Date(asset.consumableDetail.expiryDate).toISOString().split('T')[0] : '',
          };
        }
        
        return {
          'ID': asset.id,
          'เลขครุภัณฑ์': asset.assetCode,
          'ชื่อทรัพย์สิน': asset.assetName,
          'Serial No.': asset.serialNo,
          'ประเภท': asset.type,
          'หมวดหมู่': asset.category?.name || '',
          'สถานะ': asset.status,
          'ยี่ห้อ': asset.brand,
          'รุ่น': asset.model,
          'Company': asset.company,
          'ผู้ถือครอง': asset.ownerName,
          'แผนก': asset.departmentId,
          'ที่ตั้ง': asset.location,
          'ชั้น': asset.floor,
          'รหัสทรัพย์สินเดิม': asset.oldAssetCode,
          'Domain Name': asset.domainName,
          'PO No.': asset.poNumber,
          'PO Date': asset.poDate ? asset.poDate.toISOString().split('T')[0] : '',
          'PR No.': asset.prNumber,
          'วันที่จัดซื้อ': asset.purchaseDate ? asset.purchaseDate.toISOString().split('T')[0] : '',
          'Vendor': asset.vendor,
          'งบประมาณ': asset.budget,
          'หมายเหตุ': asset.remark,
          'วันที่สร้าง': asset.createdAt.toISOString(),
          'วันที่แก้ไขล่าสุด': asset.updatedAt.toISOString(),
          ...details
        };
      });

      const ws = xlsx.utils.json_to_sheet(rows.length > 0 ? rows : []);
      const csv = xlsx.utils.sheet_to_csv(ws, { FS: ',', blankrows: false });
      
      res.setHeader('Content-Disposition', 'attachment; filename="assets_export.csv"');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.send('\uFEFF' + csv);
    } catch (err) { next(err); }
  });

  router.post('/export/by-ids', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new AppError('No asset IDs provided', 400);
      }

      const assets = await prisma.asset.findMany({
        where: { id: { in: ids } },
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
        if (asset.computerDetail) {
          details = {
            'CPU': asset.computerDetail.cpu,
            'Generation': asset.computerDetail.cpuGeneration,
            'GPU': asset.computerDetail.gpu,
            'RAM': asset.computerDetail.ram,
            'RAM Detail': '',
            'RAM Slot1': asset.computerDetail.ramSlot1,
            'RAM Slot2': asset.computerDetail.ramSlot2,
            'Storage 1': asset.computerDetail.storage1,
            'Storage 2': asset.computerDetail.storage2,
            'OS': asset.computerDetail.osType,
            'Windows Version': asset.computerDetail.osVersion,
            'Windows License': asset.computerDetail.windowsLicense,
            'MS Office': asset.computerDetail.officeLicense,
            'Antivirus': asset.computerDetail.antivirusStatus,
            'S/N Computer': asset.computerDetail.snComputer,
            'Domain Name': asset.computerDetail.domainName,
          };
        }
        if (asset.phoneDetail) {
          details = {
            'IMEI 1': asset.phoneDetail.imei1,
            'IMEI 2': asset.phoneDetail.imei2,
            'OS Version': asset.phoneDetail.osVersion,
            'Storage': asset.phoneDetail.storageCapacity,
            'RAM': asset.phoneDetail.ram,
            'Phone Number': asset.phoneDetail.phoneNumber,
            'MDM Enrolled': asset.phoneDetail.mdmEnrolled ? 'Yes' : 'No',
            'SIM Provider': asset.phoneDetail.simProvider,
          };
        }
        if (asset.monitorDetail) {
          details = {
            'Screen Size': asset.monitorDetail.screenSize,
            'Resolution': asset.monitorDetail.resolution,
            'Panel Type': asset.monitorDetail.panelType,
            'Refresh Rate': asset.monitorDetail.refreshRate,
            'Ports': asset.monitorDetail.ports,
            'Has Speaker': asset.monitorDetail.hasSpeaker ? 'Yes' : 'No',
            'Curved': asset.monitorDetail.curved ? 'Yes' : 'No',
          };
        }
        if (asset.deviceDetail) {
          details = {
            'Device Type': asset.deviceDetail.deviceType,
            'Connection': asset.deviceDetail.connectionType,
            'Power Source': asset.deviceDetail.powerSource,
            'RGB Support': asset.deviceDetail.rgbSupport ? 'Yes' : 'No',
          };
        }
        if (asset.networkDeviceDetail) {
          details = {
            'Network Type': asset.networkDeviceDetail.networkType,
            'IP Address': asset.networkDeviceDetail.ipAddress,
            'MAC Address': asset.networkDeviceDetail.macAddress,
            'Firmware': asset.networkDeviceDetail.firmwareVersion,
            'Port Count': asset.networkDeviceDetail.portCount,
            'Rack Location': asset.networkDeviceDetail.locationRack,
            'PoE Support': asset.networkDeviceDetail.poeSupport ? 'Yes' : 'No',
          };
        }
        if (asset.rackDetail) {
          details = {
            'Sub Type': asset.rackDetail.subType,
            'Rack Units': asset.rackDetail.rackUnits,
            'Power Capacity': asset.rackDetail.powerCapacity,
            'Rack Location': asset.rackDetail.rackLocation,
          };
        }
        if (asset.printerDetail) {
          details = {
            'Printer Type': asset.printerDetail.printerType,
            'Is Color': asset.printerDetail.isColor ? 'Yes' : 'No',
            'Network Ready': asset.printerDetail.networkReady ? 'Yes' : 'No',
            'IP Address': asset.printerDetail.ipAddress,
            'MAC Address': asset.printerDetail.macAddress,
            'Page Count': asset.printerDetail.pageCount,
            'Duplex Support': asset.printerDetail.duplexSupport ? 'Yes' : 'No',
          };
        }
        if (asset.cableDetail) {
          details = {
            'Cable Type': asset.cableDetail.cableType,
            'Length': asset.cableDetail.length,
            'Stock': asset.cableDetail.stockQuantity,
            'Min Stock': asset.cableDetail.minimumStock,
          };
        }
        if (asset.consumableDetail) {
          details = {
            'Consumable Type': asset.consumableDetail.consumableType,
            'Compatible With': asset.consumableDetail.compatibleWith,
            'Stock': asset.consumableDetail.stockQuantity,
            'Min Stock': asset.consumableDetail.minimumStock,
            'Expiry Date': asset.consumableDetail.expiryDate ? new Date(asset.consumableDetail.expiryDate).toISOString().split('T')[0] : '',
          };
        }
        
        return {
          'ID': asset.id,
          'เลขครุภัณฑ์': asset.assetCode,
          'ชื่อทรัพย์สิน': asset.assetName,
          'Serial No.': asset.serialNo,
          'ประเภท': asset.type,
          'หมวดหมู่': asset.category?.name || '',
          'สถานะ': asset.status,
          'ยี่ห้อ': asset.brand,
          'รุ่น': asset.model,
          'Company': asset.company,
          'ผู้ถือครอง': asset.ownerName,
          'แผนก': asset.departmentId,
          'ที่ตั้ง': asset.location,
          'ชั้น': asset.floor,
          'รหัสทรัพย์สินเดิม': asset.oldAssetCode,
          'Domain Name': asset.domainName,
          'PO No.': asset.poNumber,
          'PO Date': asset.poDate ? asset.poDate.toISOString().split('T')[0] : '',
          'PR No.': asset.prNumber,
          'วันที่จัดซื้อ': asset.purchaseDate ? asset.purchaseDate.toISOString().split('T')[0] : '',
          'วันหมดประกัน': asset.warrantyEndDate ? asset.warrantyEndDate.toISOString().split('T')[0] : '',
          'ราคาจัดซื้อ': asset.purchasePrice ?? '',
          'Vendor': asset.vendor,
          'งบประมาณ': asset.budget,
          'หมายเหตุ': asset.remark,
          'วันที่สร้าง': asset.createdAt.toISOString(),
          'วันที่แก้ไขล่าสุด': asset.updatedAt.toISOString(),
          ...details
        };
      });
      const ws = xlsx.utils.json_to_sheet(rows);
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, ws, 'Assets');
      const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Disposition', 'attachment; filename="selected_assets_export.xlsx"');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  });

  export function getCategoryIdByAssetType(type: string): number | null {
    const t = (type || '').toLowerCase().trim();
    if (!t) return null;
    if (t.includes('notebook') || t.includes('computer') || t.includes('macbook') || t === 'pc' || t.includes('laptop') || t.includes('workstation') || t.includes('mini pc')) {
      return 1; // คอมพิวเตอร์
    }
    if (t.includes('ipad') || t.includes('phone') || t.includes('tablet') || t.includes('smartphone')) {
      return 2; // อุปกรณ์สื่อสาร
    }
    if (t.includes('monitor') || t.includes('จอภาพ')) {
      return 3; // จอภาพ
    }
    if (t.includes('printer') || t.includes('เครื่องพิมพ์')) {
      return 5; // เครื่องพิมพ์
    }
    if (t.includes('switch') || t.includes('router') || t.includes('firewall') || t.includes('access point') || t.includes('ap') || t.includes('network')) {
      return 6; // อุปกรณ์เครือข่าย
    }
    if (t.includes('server') || t.includes('rack') || t.includes('pdu') || t.includes('ups') || t.includes('enclosure')) {
      return 7; // Rack & Infrastructure
    }
    if (t.includes('mouse') || t.includes('keyboard') || t.includes('webcam') || t.includes('projector') || t.includes('peripheral') || t.includes('device') || t.includes('dock') || t.includes('ต่อพ่วง')) {
      return 4; // อุปกรณ์ต่อพ่วง
    }
    return null;
  }

  async function importRows(rows: any[], userId: number, res: Response) {
    let success = 0, errors = 0;
    const errorDetails: { serialNo: string; reason: string }[] = [];
    for (const row of rows) {
      const assetCode = row['assetCode'] || row['เลขครุภัณฑ์'] || row['Asset Code'] || row['รหัสทรัพย์สิน'];
      const serialNo = row['serialNo'] || row['Serial No.'] || row['Serial No'] || row['Serial Number'] || row['SerialNumber'];
      const serialLabel = serialNo || assetCode || '(unknown)';
      try {

        if (!serialNo) {
          errors++;
          errorDetails.push({ serialNo: serialLabel, reason: 'ไม่มี Serial Number' });
          continue;
        }

        const categoryName = row['Category'] || row['หมวดหมู่'];
        const assetType = String(row['type'] || row['ประเภท'] || row['Type'] || row['ประเภทอุปกรณ์'] || '');
        let categoryId = null;
        if (categoryName) {
          const cat = await prisma.category.upsert({
            where: { name: categoryName },
            create: { name: categoryName, icon: '📦' },
            update: {}
          });
          categoryId = cat.id;
        } else if (assetType) {
          categoryId = getCategoryIdByAssetType(assetType);
        }

        const rawPoDate = row['poDate'] || row['PO Date'];
        const poDate = rawPoDate ? new Date(rawPoDate) : null;
        const purchaseDateStr = row['purchaseDate'] || row['วันที่จัดซื้อ'] || row['Purchase Date'];
        const purchaseDate = purchaseDateStr ? new Date(purchaseDateStr) : null;
        const budgetVal = row['budget'] || row['Budget'] || row['งบประมาณ'];

        // Normalize assetCode: empty/blank/"-" → null to avoid unique constraint clash
        const rawAssetCode = assetCode ? String(assetCode).trim() : '';
        const finalAssetCode = rawAssetCode && rawAssetCode !== '-' ? rawAssetCode : null;
        const finalSerialNo = serialNo ? String(serialNo).trim() : null;

        const assetData: any = {
          assetCode: finalAssetCode,
          assetName: String(row['assetName'] || row['Asset Name'] || row['ชื่อทรัพย์สิน'] || '').trim() || null,
          serialNo: String(finalSerialNo),
          type: String(row['type'] || row['ประเภท'] || row['Type'] || row['ประเภทอุปกรณ์'] || ''),
          categoryId,
          status: String(row['status'] || row['Status'] || row['สถานะ'] || 'Available'),
          brand: String(row['brand'] || row['Brand'] || row['ยี่ห้อ'] || ''),
          model: String(row['model'] || row['Model'] || row['รุ่น'] || ''),
          company: String(row['company'] || row['Company'] || row['บริษัท'] || ''),
          ownerName: String(row['ownerName'] || row['Owner'] || row['ผู้ถือครอง'] || ''),
          departmentId: String(row['departmentId'] || row['Department'] || row['แผนก'] || ''),
          location: String(row['location'] || row['ที่ตั้ง'] || row['Location'] || row['สถานที่'] || row['สถานที่ติดตั้ง'] || row['อาคาร'] || row['สถานที่ติดตั้ง/อาคาร'] || ''),
          floor: String(row['floor'] || row['Floor'] || row['ชั้น'] || ''),
          oldAssetCode: (row['Old Asset Code'] || row['รหัสทรัพย์สินเดิม']) ? String(row['Old Asset Code'] || row['รหัสทรัพย์สินเดิม']) : null,
          domainName: String(row['domainName'] || row['Domain Name'] || ''),
          poNumber: String(row['poNumber'] || row['PO No.'] || row['PO Number'] || row['เลขที่ PO'] || ''),
          poDate: poDate && !isNaN(poDate.getTime()) ? poDate : null,
          prNumber: String(row['prNumber'] || row['PR No.'] || row['PR Number'] || row['เลขที่ PR'] || ''),
          purchaseDate: purchaseDate && !isNaN(purchaseDate.getTime()) ? purchaseDate : null,
          warrantyEndDate: (() => {
            const w = row['warrantyEndDate'] || row['Warranty End Date'] || row['วันหมดประกัน'];
            if (!w) return null;
            const d = new Date(w);
            return !isNaN(d.getTime()) ? d : null;
          })(),
          purchasePrice: (() => {
            const p = row['purchasePrice'] || row['Purchase Price'] || row['ราคาจัดซื้อ'];
            return p ? parseFloat(p) || null : null;
          })(),
          vendor: String(row['vendor'] || row['Vendor'] || ''),
          budget: budgetVal ? String(budgetVal) : null,
          remark: String(row['remark'] || row['Remark'] || row['หมายเหตุ'] || '')
        };

        const assetNameVal = assetData.assetName ? String(assetData.assetName).trim() : '';
        
        // Find existing asset by assetCode or serialNo
        let existing = null;
        if (finalAssetCode) {
          existing = await prisma.asset.findUnique({ where: { assetCode: finalAssetCode } });
        }
        if (!existing && finalSerialNo) {
          existing = await prisma.asset.findUnique({ where: { serialNo: finalSerialNo } });
        }

        // Check for assetName duplicate only if assetName is non-empty
        if (assetNameVal) {
          const dup = await prisma.asset.findFirst({
            where: { assetName: assetNameVal, NOT: existing ? { id: existing.id } : undefined }
          });
          if (dup) {
            errors++;
            errorDetails.push({ serialNo: serialLabel, reason: `ชื่อ "${assetNameVal}" ซ้ำกับทรัพย์สินอื่น` });
            continue;
          }
        }

        // Before update, check if assetCode or serialNo would conflict with another record
        if (existing) {
          // Check assetCode conflict: another asset already has this assetCode
          if (finalAssetCode) {
            const codeConflict = await prisma.asset.findFirst({
              where: { assetCode: finalAssetCode, NOT: { id: existing.id } }
            });
            if (codeConflict) {
              errors++;
              errorDetails.push({ serialNo: serialLabel, reason: `รหัสทรัพย์สิน "${finalAssetCode}" ซ้ำกับทรัพย์สินอื่น (ID: ${codeConflict.id})` });
              continue;
            }
          }
          // Check serialNo conflict: another asset already has this serialNo
          if (finalSerialNo) {
            const serialConflict = await prisma.asset.findFirst({
              where: { serialNo: finalSerialNo, NOT: { id: existing.id } }
            });
            if (serialConflict) {
              errors++;
              errorDetails.push({ serialNo: serialLabel, reason: `Serial No. "${finalSerialNo}" ซ้ำกับทรัพย์สินอื่น (ID: ${serialConflict.id})` });
              continue;
            }
          }
        }

        let savedAsset;
        if (existing) {
          savedAsset = await prisma.asset.update({ where: { id: existing.id }, data: assetData });
        } else {
          savedAsset = await prisma.asset.create({ data: assetData });
        }

        await syncMasterDataFromAsset(savedAsset);

        if (savedAsset.type) {
          const detailFieldMap: Record<string, string> = {
            'CPU': 'cpu', 'Generation': 'cpuGeneration', 'GPU': 'gpu',
            'RAM': 'ram', 'RAM Detail': 'ramDetail', 'RAM Slot1': 'ramSlot1', 'RAM Slot2': 'ramSlot2',
            'Storage 1': 'storage1', 'Storage 2': 'storage2',
            'OS': 'osType', 'Windows Version': 'osVersion',
            'Windows License': 'windowsLicense', 'MS Office': 'officeLicense',
            'Antivirus': 'antivirusStatus', 'S/N Computer': 'snComputer',
            'IMEI 1': 'imei1', 'IMEI 2': 'imei2',
            'Storage': 'storageCapacity', 'Phone Number': 'phoneNumber',
            'SIM Provider': 'simProvider', 'MDM Enrolled': 'mdmEnrolled',
            'Screen Size': 'screenSize', 'Resolution': 'resolution',
            'Panel Type': 'panelType', 'Refresh Rate': 'refreshRate',
            'Ports': 'ports', 'Has Speaker': 'hasSpeaker', 'Curved': 'curved',
            'Device Type': 'deviceType', 'Connection': 'connectionType',
            'Power Source': 'powerSource', 'RGB Support': 'rgbSupport',
            'Network Type': 'networkType', 'IP Address': 'ipAddress',
            'MAC Address': 'macAddress', 'Firmware': 'firmwareVersion',
            'Port Count': 'portCount', 'Rack Location': 'locationRack',
            'PoE Support': 'poeSupport',
            'Sub Type': 'subType', 'Rack Units': 'rackUnits',
            'Power Capacity': 'powerCapacity',
            'Printer Type': 'printerType', 'Is Color': 'isColor',
            'Network Ready': 'networkReady', 'Page Count': 'pageCount',
            'Duplex Support': 'duplexSupport',
            'Cable Type': 'cableType', 'Length': 'length',
            'Stock': 'stockQuantity', 'Min Stock': 'minimumStock',
            'Consumable Type': 'consumableType', 'Compatible With': 'compatibleWith',
            'Expiry Date': 'expiryDate',
            'Domain Name': 'domainName',
          };
          const detailRow: any = { ...row };
          for (const [exportKey, fieldName] of Object.entries(detailFieldMap)) {
            if (row[exportKey] !== undefined && row[exportKey] !== null && row[exportKey] !== '') {
              const val = row[exportKey];
              const isInt = ['portCount', 'pageCount', 'stockQuantity', 'minimumStock'].includes(fieldName);
              detailRow[fieldName] = isInt ? parseInt(val as string, 10) : String(val);
            }
          }
          await upsertAssetDetail(prisma, savedAsset.id, savedAsset.type, detailRow);
        }
        
        success++;
      } catch (err: any) {
        console.error('Error importing row:', err);
        require('fs').appendFileSync('import_errors.log', err.message + '\n');
        errors++;
        errorDetails.push({ serialNo: serialLabel, reason: err.message });
      }
    }
    return { success, errors, errorDetails };
  }

  router.get('/import/template', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const wb = xlsx.utils.book_new();
      const headers = [
        'Asset Code', 'เลขครุภัณฑ์', 'Serial No.', 'Asset Name', 'ชื่อทรัพย์สิน',
        'Type', 'ประเภท', 'Brand', 'ยี่ห้อ', 'Model', 'รุ่น',
        'Company', 'Owner', 'ผู้ถือครอง', 'Department', 'แผนก',
        'Location', 'ที่ตั้ง', 'Floor', 'ชั้น',
        'Status', 'สถานะ', 'Vendor', 'PO No.', 'PO Date', 'PR No.',
        'Purchase Date', 'วันที่จัดซื้อ', 'Warranty End Date', 'วันหมดประกัน',
        'Purchase Price', 'ราคาจัดซื้อ',
        'Budget', 'งบประมาณ',
        'Domain Name', 'CPU', 'RAM', 'Storage 1', 'OS', 'Windows Version',
        'Remark', 'หมายเหตุ'
      ];
      const ws = xlsx.utils.aoa_to_sheet([headers]);
      ws['!cols'] = headers.map(() => ({ wch: 18 }));
      xlsx.utils.book_append_sheet(wb, ws, 'Template');
      const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Disposition', 'attachment; filename=import_template.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buf);
    } catch (err) { next(err); }
  });

  router.post('/import/excel', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), uploadExcel.single('file'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw new AppError('ไม่พบไฟล์ที่อัปโหลด', 400);
  
      let buf = req.file.buffer;
      if (buf.length > 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
        buf = buf.slice(3);
      }
      const isCSV = buf.length < 2 || buf[0] !== 0x50 || buf[1] !== 0x4B;
      const workbook = isCSV
        ? xlsx.read(buf.toString('utf8'), { type: 'string' })
        : xlsx.read(buf, { type: 'buffer' });
      
      const allRows: any[] = [];
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const rows: any[] = xlsx.utils.sheet_to_json(sheet, { defval: '' });
        allRows.push(...rows);
      }

      const result = await importRows(allRows, req.user!.userId, res);
      res.json({ ...result, total: allRows.length });
    } catch (err) {
      next(err);
    }
  });

  router.post('/import/json', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows: any[] = req.body.rows || req.body;
      if (!Array.isArray(rows) || rows.length === 0) {
        throw new AppError('ไม่มีข้อมูลที่จะนำเข้า', 400);
      }
      const result = await importRows(rows, req.user!.userId, res);
      res.json({ ...result, total: rows.length });
    } catch (err) {
      next(err);
    }
  });

// ── GLPI Spec Integration for Asset Registry ──
router.get('/glpi-spec', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const serial = req.query.serial as string;
    if (!serial) throw new AppError('กรุณาระบุ Serial Number', 400);

    const spec = await fetchGLPISpecBySerial(serial);
    if (!spec) throw new AppError('ไม่พบข้อมูลฮาร์ดแวร์ใน GLPI สำหรับ Serial Number นี้', 404);

    res.json(spec);
  } catch (err) { next(err); }
});

// Get global audit log / history for all assets
router.get('/global-history', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const offset = parseInt(req.query.offset as string) || 0;

    const [history, total] = await Promise.all([
      prisma.assetHistory.findMany({
        include: {
          asset: { select: { assetCode: true, assetName: true } },
          actor: { select: { id: true, displayName: true, email: true } },
          owner: { select: { id: true, displayName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.assetHistory.count(),
    ]);

    res.json({
      data: history,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
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
        assetHistory: { 
          orderBy: { createdAt: 'desc' }, 
          take: 50,
          include: { actor: { select: { displayName: true, email: true } } }
        },
        pmRuns: { orderBy: { completedAt: 'desc' }, take: 20, include: { plan: true, performer: true, answers: { include: { item: true } } } },
        category: true,
        documents: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!asset) throw new AppError('ไม่พบทรัพย์สิน', 404);

    const detail = await getAssetDetail(prisma, id, asset.type);
    res.json({ ...withCalculatedAge(asset), detail });
  } catch (err) { next(err); }
});

// Live hardware/status read from the separate external asset-monitoring
// agent server (hostname == assetName). Read-only, gated the same as the
// GLPI spec pull below since both call an external system with a stored key.
router.get('/:id/external-agent', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const asset = await prisma.asset.findUnique({ where: { id }, select: { assetName: true } });
    if (!asset) throw new AppError('ไม่พบทรัพย์สิน', 404);

    const hostname = asset.assetName;
    if (!hostname) return res.json({ available: false, reason: 'no_hostname' });

    const baseUrl = process.env.EXTERNAL_ASSET_API_URL;
    const apiKey = process.env.EXTERNAL_ASSET_API_KEY;
    if (!baseUrl || !apiKey) return res.json({ available: false, reason: 'not_configured' });

    let response: globalThis.Response;
    try {
      response = await fetch(`${baseUrl}/api/external/agent/${encodeURIComponent(hostname)}`, {
        headers: { 'x-api-key': apiKey },
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      return res.json({ available: false, reason: 'unreachable' });
    }

    if (response.status === 404) return res.json({ available: false, reason: 'not_found' });
    if (!response.ok) return res.json({ available: false, reason: 'error' });

    const data = await response.json();
    res.json({ available: true, hostname, data });
  } catch (err) { next(err); }
});

router.post('/upsert', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { detail, ...assetData } = req.body;
    
    // Validate required fields
    const validationErrors = validateAssetData(assetData, true);
    if (validationErrors.length > 0) {
      throw new AppError(validationErrors.join('; '), 400);
    }

    const data = normalizeAssetPayload(assetData);
    const { assetCode, serialNo } = data;

    if (!assetCode && !serialNo) {
      throw new AppError('กรุณาระบุ Asset Code หรือ Serial Number');
    }

    const validAssetCode = assetCode && String(assetCode) !== '-' ? String(assetCode) : null;
    const validSerialNo = serialNo && String(serialNo) !== '-' ? String(serialNo) : null;

    let existing = null;
    if (validAssetCode) {
      existing = await prisma.asset.findFirst({ where: { assetCode: validAssetCode } });
    }
    if (!existing && validSerialNo) {
      existing = await prisma.asset.findFirst({ where: { serialNo: validSerialNo } });
    }

    if (data.ownerName !== undefined && data.ownerName !== existing?.ownerName && data.assignedToUserId === undefined) {
      data.assignedToUserId = await resolveAssignedToUserId(data.ownerName);
    }
    if (data.departmentId !== undefined && data.departmentId !== existing?.departmentId && data.departmentRefId === undefined) {
      data.departmentRefId = await resolveDepartmentRefId(data.departmentId);
    }
    if (data.vendor !== undefined && data.vendor !== existing?.vendor && data.vendorRefId === undefined) {
      data.vendorRefId = await resolveVendorRefId(data.vendor);
    }
    if (data.location !== undefined && data.location !== existing?.location && data.locationRefId === undefined) {
      data.locationRefId = await resolveLocationRefId(data.location);
    }
    if (data.company !== undefined) {
      data.company = await resolveCompanyCode(data.company);
    }

    // Check for duplicates
    const duplicateErrors = await checkDuplicateAssets(data, existing?.id);
    if (duplicateErrors.length > 0) {
      throw new AppError(duplicateErrors.join('; '), 400);
    }

    if (data.assetName) {
      const dup = await prisma.asset.findFirst({
        where: { assetName: data.assetName, NOT: existing ? { id: existing.id } : undefined }
      });
      if (dup) throw new AppError('ชื่อทรัพย์สินนี้มีอยู่ในระบบแล้ว');
    }

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
    
    // Validate required fields
    const validationErrors = validateAssetData(assetData, true);
    if (validationErrors.length > 0) {
      throw new AppError(validationErrors.join('; '), 400);
    }

    const data = normalizeAssetPayload(assetData);

    if (data.ownerName && data.assignedToUserId === undefined) {
      data.assignedToUserId = await resolveAssignedToUserId(data.ownerName);
    }
    if (data.departmentId && data.departmentRefId === undefined) {
      data.departmentRefId = await resolveDepartmentRefId(data.departmentId);
    }
    if (data.vendor && data.vendorRefId === undefined) {
      data.vendorRefId = await resolveVendorRefId(data.vendor);
    }
    if (data.location && data.locationRefId === undefined) {
      data.locationRefId = await resolveLocationRefId(data.location);
    }
    if (data.company !== undefined) {
      data.company = await resolveCompanyCode(data.company);
    }

    // Check for duplicates
    const duplicateErrors = await checkDuplicateAssets(data);
    if (duplicateErrors.length > 0) {
      throw new AppError(duplicateErrors.join('; '), 400);
    }

    if (data.assetName) {
      const dup = await prisma.asset.findFirst({ where: { assetName: data.assetName } });
      if (dup) throw new AppError('ชื่อทรัพย์สินนี้มีอยู่ในระบบแล้ว');
    }

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
    
    // Validate required fields
    const validationErrors = validateAssetData(assetData, false);
    if (validationErrors.length > 0) {
      throw new AppError(validationErrors.join('; '), 400);
    }

    const data = normalizeAssetPayload(assetData);

    // Auto-clear ownerName if status becomes Retired or Disposed
    if (data.status && (data.status === 'Retired' || data.status === 'Disposed')) {
      data.ownerName = null;
    }

    if (data.ownerName !== undefined && data.ownerName !== old.ownerName && data.assignedToUserId === undefined) {
      data.assignedToUserId = await resolveAssignedToUserId(data.ownerName);
    }
    if (data.departmentId !== undefined && data.departmentId !== old.departmentId && data.departmentRefId === undefined) {
      data.departmentRefId = await resolveDepartmentRefId(data.departmentId);
    }
    if (data.vendor !== undefined && data.vendor !== old.vendor && data.vendorRefId === undefined) {
      data.vendorRefId = await resolveVendorRefId(data.vendor);
    }
    if (data.location !== undefined && data.location !== old.location && data.locationRefId === undefined) {
      data.locationRefId = await resolveLocationRefId(data.location);
    }
    if (data.company !== undefined) {
      data.company = await resolveCompanyCode(data.company);
    }

    // Check for duplicates (excluding current asset)
    const duplicateErrors = await checkDuplicateAssets(data, id);
    if (duplicateErrors.length > 0) {
      throw new AppError(duplicateErrors.join('; '), 400);
    }

    if (data.assetName && data.assetName !== old.assetName) {
      const dup = await prisma.asset.findFirst({ where: { assetName: data.assetName } });
      if (dup) throw new AppError('ชื่อทรัพย์สินนี้มีอยู่ในระบบแล้ว');
    }
    
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
    await prisma.$transaction(async (tx) => {
      // 1. Delete PM runs and answers
      const pmRuns = await tx.pMRun.findMany({ where: { assetId: id }, select: { id: true } });
      const pmRunIds = pmRuns.map(r => r.id);
      if (pmRunIds.length > 0) {
        await tx.pMRunAnswer.deleteMany({ where: { runId: { in: pmRunIds } } });
        await tx.pMRun.deleteMany({ where: { id: { in: pmRunIds } } });
      }

      // 2. Delete asset history
      await tx.assetHistory.deleteMany({ where: { assetId: id } });

      // 3. Set borrow request item assetId to null
      await tx.borrowRequestItem.updateMany({ where: { assetId: id }, data: { assetId: null } });

      // 4. Delete donation items
      await tx.donationItem.deleteMany({ where: { assetId: id } });

      // 5. Delete maintenance records
      await tx.maintenanceRecord.deleteMany({ where: { assetId: id } });

      // 6. Delete asset
      await tx.asset.delete({ where: { id } });
    });
    res.json({ message: 'ลบทรัพย์สินเรียบร้อย' });
  } catch (err) { next(err); }
});

router.post('/bulk-delete', authenticate, authorize('SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) throw new AppError('No asset IDs provided', 400);
    const result = await prisma.$transaction(async (tx) => {
      const pmRuns = await tx.pMRun.findMany({ where: { assetId: { in: ids } }, select: { id: true } });
      const pmRunIds = pmRuns.map(r => r.id);
      if (pmRunIds.length > 0) {
        await tx.pMRunAnswer.deleteMany({ where: { runId: { in: pmRunIds } } });
        await tx.pMRun.deleteMany({ where: { id: { in: pmRunIds } } });
      }
      await tx.assetHistory.deleteMany({ where: { assetId: { in: ids } } });
      await tx.borrowRequestItem.updateMany({ where: { assetId: { in: ids } }, data: { assetId: null } });
      await tx.donationItem.deleteMany({ where: { assetId: { in: ids } } });
      await tx.maintenanceRecord.deleteMany({ where: { assetId: { in: ids } } });
      return tx.asset.deleteMany({ where: { id: { in: ids } } });
    });
    res.json({ message: `ลบ ${result.count} รายการเรียบร้อย` });
  } catch (err) { next(err); }
});

router.post('/bulk-delete-by-type', authenticate, authorize('SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type } = req.body;
    if (!type || typeof type !== 'string') throw new AppError('กรุณาระบุประเภททรัพย์สิน', 400);
    const result = await prisma.$transaction(async (tx) => {
      const pmRuns = await tx.pMRun.findMany({ where: { asset: { type } }, select: { id: true } });
      const pmRunIds = pmRuns.map(r => r.id);
      if (pmRunIds.length > 0) {
        await tx.pMRunAnswer.deleteMany({ where: { runId: { in: pmRunIds } } });
        await tx.pMRun.deleteMany({ where: { id: { in: pmRunIds } } });
      }
      await tx.assetHistory.deleteMany({ where: { asset: { type } } });
      await tx.borrowRequestItem.updateMany({ where: { asset: { type } }, data: { assetId: null } });
      await tx.donationItem.deleteMany({ where: { asset: { type } } });
      await tx.maintenanceRecord.deleteMany({ where: { asset: { type } } });
      return tx.asset.deleteMany({ where: { type } });
    });
    res.json({ message: `ลบ ${result.count} รายการจากประเภท ${type} เรียบร้อย`, count: result.count });
  } catch (err) { next(err); }
});

router.post('/bulk-update', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ids, data } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) throw new AppError('No asset IDs provided', 400);
    if (!data || Object.keys(data).length === 0) throw new AppError('No update data provided', 400);
    const allowed = ['status', 'departmentId', 'location', 'floor', 'company', 'ownerName', 'categoryId', 'brand', 'model'];
    const updateData: any = {};
    for (const key of allowed) {
      if (data[key] !== undefined) updateData[key] = data[key];
    }
    
    // Auto-clear ownerName if status is Retired or Disposed in bulk update
    if (updateData.status && (updateData.status === 'Retired' || updateData.status === 'Disposed')) {
      updateData.ownerName = null;
    }

    if (Object.keys(updateData).length === 0) throw new AppError('No valid fields to update', 400);
    const result = await prisma.asset.updateMany({ where: { id: { in: ids } }, data: updateData });
    res.json({ message: `อัปเดต ${result.count} รายการเรียบร้อย` });
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

router.get('/:id/documents', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const docs = await prisma.assetDocument.findMany({
      where: { assetId: id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(docs);
  } catch (err) { next(err); }
});

router.post('/:id/documents', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), docUpload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) throw new AppError('ไม่พบทรัพย์สิน', 404);
    if (!req.file) throw new AppError('ไม่พบไฟล์', 400);

    const doc = await prisma.assetDocument.create({
      data: {
        assetId: id,
        fileName: req.file.originalname,
        storedName: req.file.filename,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        docType: (req.body.docType as string) || 'OTHER',
        note: (req.body.note as string) || null,
        uploadedBy: req.user?.userId ? String(req.user.userId) : null,
      },
    });
    res.status(201).json(doc);
  } catch (err) { next(err); }
});

router.get('/:id/documents/:docId/download', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const docId = parseInt(req.params.docId);
    const doc = await prisma.assetDocument.findUnique({ where: { id: docId } });
    if (!doc) throw new AppError('ไม่พบเอกสาร', 404);
    const filePath = path.join(UPLOAD_DIR, doc.storedName);
    if (!fs.existsSync(filePath)) throw new AppError('ไม่พบไฟล์ในระบบ', 404);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.fileName)}"`);
    res.setHeader('Content-Type', doc.mimeType);
    fs.createReadStream(filePath).pipe(res);
  } catch (err) { next(err); }
});

router.delete('/:id/documents/:docId', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const docId = parseInt(req.params.docId);
    const doc = await prisma.assetDocument.findUnique({ where: { id: docId } });
    if (!doc) throw new AppError('ไม่พบเอกสาร', 404);
    const filePath = path.join(UPLOAD_DIR, doc.storedName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await prisma.assetDocument.delete({ where: { id: docId } });
    res.json({ message: 'ลบเอกสารเรียบร้อย' });
  } catch (err) { next(err); }
});

router.get('/:id/glpi-spec', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) throw new AppError('ไม่พบทรัพย์สิน', 404);
    if (!asset.serialNo) throw new AppError('ทรัพย์สินนี้ไม่มี Serial Number สำหรับดึงข้อมูล', 400);

    const spec = await fetchGLPISpecBySerial(asset.serialNo);
    if (!spec) throw new AppError('ไม่พบข้อมูลฮาร์ดแวร์ใน GLPI สำหรับ Serial Number นี้', 404);

    res.json(spec);
  } catch (err) { next(err); }
});

router.post('/:id/glpi-sync', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) throw new AppError('ไม่พบทรัพย์สิน', 404);
    if (!asset.serialNo) throw new AppError('ทรัพย์สินนี้ไม่มี Serial Number สำหรับดึงข้อมูล', 400);

    const spec = await fetchGLPISpecBySerial(asset.serialNo);
    if (!spec) throw new AppError('ไม่พบข้อมูลฮาร์ดแวร์ใน GLPI สำหรับ Serial Number นี้', 404);

    const field = req.body.field as string;
    const updateDetail: any = {};
    let note = '';

    if (field) {
      if (field === 'name') {
        await prisma.asset.update({
          where: { id },
          data: { assetName: spec.name }
        });
        note = `อัปเดตชื่อคอมพิวเตอร์ตาม GLPI เป็น "${spec.name}"`;
      } else if (field === 'user') {
        await prisma.asset.update({
          where: { id },
          data: { ownerName: spec.user }
        });
        note = `อัปเดตผู้ใช้งานตาม GLPI เป็น "${spec.user}"`;
      } else {
        if (field === 'cpu') {
          updateDetail.cpu = spec.cpu;
          note = `อัปเดต CPU ตาม GLPI เป็น "${spec.cpu}"`;
        } else if (field === 'ram') {
          updateDetail.ram = spec.ram;
          note = `อัปเดต RAM ตาม GLPI เป็น "${spec.ram}"`;
        } else if (field === 'os') {
          updateDetail.osVersion = spec.os;
          note = `อัปเดต OS ตาม GLPI เป็น "${spec.os}"`;
        } else if (field === 'license') {
          updateDetail.windowsLicense = spec.license;
          note = `อัปเดต Windows License ตาม GLPI เป็น "${spec.license}"`;
        } else if (field === 'msOffice') {
          updateDetail.officeLicense = spec.msOffice;
          note = `อัปเดต MS Office ตาม GLPI เป็น "${spec.msOffice}"`;
        } else if (field === 'antivirus') {
          updateDetail.antivirusStatus = spec.antivirus;
          note = `อัปเดต Antivirus ตาม GLPI เป็น "${spec.antivirus}"`;
        }
        await upsertAssetDetail(prisma, id, asset.type || '', updateDetail);
      }
    } else {
      // Sync all fields
      await prisma.asset.update({
        where: { id },
        data: { 
          assetName: spec.name,
          ownerName: spec.user || asset.ownerName,
        }
      });
      await upsertAssetDetail(prisma, id, asset.type || '', {
        cpu: spec.cpu,
        ram: spec.ram,
        osVersion: spec.os,
        windowsLicense: spec.license,
        snComputer: spec.serial,
        officeLicense: spec.msOffice,
        antivirusStatus: spec.antivirus,
      });
      note = `อัปเดตรายละเอียดฮาร์ดแวร์ทั้งหมดตาม GLPI (CPU: ${spec.cpu}, RAM: ${spec.ram}, OS: ${spec.os}, Office: ${spec.msOffice || '—'}, AV: ${spec.antivirus || '—'})`;
    }

    // Write a history record
    await prisma.assetHistory.create({
      data: {
        assetId: id,
        actionType: 'GLPI_SYNC',
        actorUserId: req.user!.userId,
        note,
      },
    });

    res.json({ message: field ? 'อัปเดตฟิลด์เรียบร้อยแล้ว' : 'อัปเดตข้อมูลรายละเอียดฮาร์ดแวร์จาก GLPI เรียบร้อยแล้ว', spec });
  } catch (err) { next(err); }
});

// Get audit log history for an asset
router.get('/:id/history', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;

    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) throw new AppError('ไม่พบทรัพย์สิน', 404);

    const [history, total] = await Promise.all([
      prisma.assetHistory.findMany({
        where: { assetId: id },
        include: { 
          asset: { select: { assetCode: true, assetName: true } },
          actor: { select: { id: true, displayName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.assetHistory.count({ where: { assetId: id } }),
    ]);

    res.json({
      data: history,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (err) { next(err); }
});

export default router;
