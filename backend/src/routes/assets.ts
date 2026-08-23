import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { Prisma } from '@prisma/client';
import { fetchGLPISpecBySerial } from '../services/glpi';
import { searchADUsers } from '../services/ldap';
import {
  AGENT_FIELD_LABELS, agentValueSatisfied, computeDrift, fetchAgentRecord,
  fetchAllAgentRecords, fillBlanksFromAgent, mapAgentToAssetSpec, matchAssetForAgent,
} from '../services/externalAgent';
import { cleanMasterValue } from '../utils/assetHelpers';
import { isCustodyRole } from '../config/custodyHolders';
import { reconcileFleet, reconcileRecord } from '../services/agentMonitors';
import { buildGlpiFields, planGlpiSync } from '../services/glpiSpec';
import { buildFleetHealth } from '../services/agentFleetHealth';
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
// Asset.departmentId holds the short code ("PUR"), so match departments.code
// first. Matching only on departments.name — which the AD sync fills with
// department *names* ("จัดซื้อ") — meant this resolver almost never fired:
// 75 of 792 assets were linked, and those 75 only because four values happened
// to be spelled identically in both vocabularies. Name is kept as a fallback
// for anything still recorded the long way round.
const resolveDepartmentRefId = async (departmentId?: string | null): Promise<number | null> => {
  const trimmed = departmentId ? String(departmentId).trim() : '';
  if (!trimmed) return null;
  const rows = await prisma.$queryRaw<{ id: number }[]>`
    SELECT id FROM departments
    WHERE upper(trim(code)) = upper(trim(${trimmed}))
       OR upper(trim(regexp_replace(name, '\s+', ' ', 'g'))) = upper(trim(regexp_replace(${trimmed}, '\s+', ' ', 'g')))
    ORDER BY (upper(trim(code)) = upper(trim(${trimmed}))) DESC
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
    const { search, status, department, location, type, typeGroup, categoryId, cpu, ram, warrantyStatus, warrantyExpiringInDays, ownerName, exactOwnerName, screenSize, resolution, panelType, printerType, isColor, ipAddress, storage, osType, company, serialNo, custodyHolder, purchaseDateFrom, purchaseDateTo, page = '1', limit = '50' } = req.query;
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
    // __ANY__ = "held at any drop-off point"; __EMPTY__ = "not held anywhere"
    if (custodyHolder === '__ANY__') {
      where.custodyHolder = { not: null };
    } else if (custodyHolder === '__EMPTY__') {
      where.custodyHolder = null;
    } else if (custodyHolder) {
      where.custodyHolder = custodyHolder as string;
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
    if (req.user && isCustodyRole(req.user.role)) {
      // Custody roles (HR) get their own narrow endpoints under /api/custody.
      // They must not reach the registry here — and without this branch they
      // would: their AppUser.company is a real company (TRR), so the mapping
      // below would happily hand them every TRR asset.
      where.company = { in: ['__NONE__'] };
    } else if (req.user && !['SUPERADMIN', 'IT_ADMIN'].includes(req.user.role)) {
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
          custodyHolder: true,
          custodyNote: true,
          custodyUpdatedAt: true,
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

router.get('/options/types', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // ?inUse=1 — เฉพาะประเภทที่มีอุปกรณ์อยู่จริง
    //
    // The master table carries 48 active types but only 11 of them have ever
    // been used, so the registry filter offered 37 choices that can only ever
    // return nothing. Reading the types off the assets also reaches values the
    // master no longer lists — three assets are typed "IT Equipment", which is
    // not an active master row, so until now the filter could not select them.
    //
    // The create/edit form must never pass this flag: picking a type that has
    // no assets yet is exactly what registering the first one means.
    if (req.query.inUse === '1' || req.query.inUse === 'true') {
      const inUse = await prisma.asset.findMany({
        where: { type: { not: null } },
        distinct: ['type'],
        select: { type: true },
        orderBy: { type: 'asc' },
      });
      return res.json(inUse.map(row => row.type).filter(t => t && t.trim()));
    }

    // Master data only — see the note on /options/locations below.
    const managedTypes = await prisma.deviceType.findMany({
      where: { isActive: true },
      select: { name: true },
      orderBy: { name: 'asc' },
    });
    if (managedTypes.length > 0) return res.json(managedTypes.map((row) => row.name).filter(Boolean));

    const assetTypes = await prisma.asset.findMany({
      where: { type: { not: null } },
      distinct: ['type'],
      select: { type: true },
      orderBy: { type: 'asc' },
    });
    res.json(assetTypes.map((row) => row.type).filter(Boolean));
  } catch (err) { next(err); }
});

// Master data only — see the note on /options/departments. These lists used to
// union the master table with SELECT DISTINCT over the assets, which meant a
// value only had to be entered once to become a permanent option for everyone
// (that is how "Net Cube" and "Net Cube  (Thailand) Co.,Ltd" both ended up on
// the vendor dropdown, and how a deactivated master row kept being offered).
// The form keeps whatever the record already holds selectable, so existing
// values that predate the master list are not lost.
// `?company=XXX` narrows the list the same way /options/departments does:
// every company but TRRCORP keeps its machines at a single site, so offering
// all six curated locations invites a plan scoped to a site that company has
// no assets at, which then generates nothing.
router.get('/options/locations', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const company = typeof req.query.company === 'string' ? req.query.company.trim() : '';

    const managed = await prisma.assetLocation.findMany({ where: { isActive: true }, select: { name: true }, orderBy: { name: 'asc' } });
    const curated = managed.map((row) => row.name).filter((n): n is string => !!n && n.trim() !== '');

    if (curated.length > 0 && company) {
      const present = await prisma.asset.findMany({
        where: { company, location: { not: null } },
        distinct: ['location'],
        select: { location: true },
      });
      const owned = new Set(
        present.map((r) => (r.location || '').trim().toUpperCase()).filter(Boolean),
      );
      const scoped = curated.filter((name) => owned.has(name.trim().toUpperCase()));
      return res.json(scoped.length > 0 ? scoped : curated);
    }

    if (curated.length > 0) return res.json(curated);

    const existing = await prisma.asset.findMany({ where: { location: { not: null } }, distinct: ['location'], select: { location: true }, orderBy: { location: 'asc' } });
    res.json(existing.map((row) => row.location).filter(Boolean));
  } catch (err) { next(err); }
});

router.get('/options/vendors', authenticate, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const managed = await prisma.vendor.findMany({ where: { isActive: true }, select: { name: true }, orderBy: { name: 'asc' } });
    if (managed.length > 0) return res.json(managed.map((row) => row.name).filter(Boolean));

    const existing = await prisma.asset.findMany({ where: { vendor: { not: null } }, distinct: ['vendor'], select: { vendor: true }, orderBy: { vendor: 'asc' } });
    res.json(existing.map((row) => row.vendor).filter(Boolean));
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

// The asset registry stores a department *code* ("PUR"); departments.code is its
// home. The AD sync (intraSync) additionally writes one row here per department
// *name* it sees ("จัดซื้อ", "ฝ่ายจัดซื้อ", …) and stamps those with a generated
// DPT-xxxx placeholder code — org reference data, not values an asset may hold —
// so they're filtered out of this list.
//
// This used to return SELECT DISTINCT asset.departmentId, which fed the dropdown
// from the data it was supposed to constrain: one typo entered once became a
// permanent option everyone else could pick, so the value list only ever grew
// (42 distinct values by the time this was found, including "สำนักงานใหญ่" — a
// location — and placeholders like "N00"/"EOF"/"BUG").
//
// `?company=XXX` narrows the list to departments that company actually owns
// assets in. The full curated list is 32 codes while TRRT only has two (IT,
// SEC) and TRW two — picking one of the other thirty produces a plan that
// matches no machines at all. Note this is an intersection, not a switch back
// to SELECT DISTINCT: the master table still decides which values are legal,
// the asset data only decides which of them are relevant here.
router.get('/options/departments', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const company = typeof req.query.company === 'string' ? req.query.company.trim() : '';

    const managed = await prisma.department.findMany({
      where: { NOT: { code: { startsWith: 'DPT-' } } },
      select: { code: true },
      orderBy: { code: 'asc' },
    });
    const curated = managed.map((r) => r.code).filter((c): c is string => !!c && c.trim() !== '');

    if (curated.length > 0 && company) {
      const present = await prisma.asset.findMany({
        where: { company, departmentId: { not: null } },
        distinct: ['departmentId'],
        select: { departmentId: true },
      });
      const owned = new Set(
        present.map((r) => (r.departmentId || '').trim().toUpperCase()).filter(Boolean),
      );
      const scoped = curated.filter((code) => owned.has(code.trim().toUpperCase()));
      // A company whose assets carry only uncurated values (or none at all)
      // would otherwise get an empty dropdown and no way to proceed.
      return res.json(scoped.length > 0 ? scoped : curated);
    }

    if (curated.length > 0) return res.json(curated);

    // No curated codes configured yet (fresh or unseeded database) — fall back to
    // what the assets carry so the dropdown is still usable.
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
    if (!asset.assetName) return res.json({ available: false, reason: 'no_hostname' });

    const data = await fetchAgentRecord(asset.assetName);
    if (!data) return res.json({ available: false, reason: 'unavailable' });

    // spec is the same mapping the sync endpoint writes, so the comparison the
    // user sees and the value they'd apply can never drift apart.
    res.json({ available: true, hostname: asset.assetName, data, spec: mapAgentToAssetSpec(data) });
  } catch (err) { next(err); }
});

// Apply the agent's reading to the asset — one field when `field` is given,
// otherwise every mapped field that actually differs.
router.post('/:id/agent-sync', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) throw new AppError('ไม่พบทรัพย์สิน', 404);
    if (!asset.assetName) throw new AppError('ทรัพย์สินนี้ไม่มีชื่อเครื่อง (hostname) สำหรับจับคู่กับ Agent', 400);

    const data = await fetchAgentRecord(asset.assetName);
    if (!data) throw new AppError('ไม่พบข้อมูลจากระบบ Agent สำหรับเครื่องนี้', 404);

    const spec = mapAgentToAssetSpec(data);
    const field = req.body?.field as string | undefined;

    if (field && !(field in spec)) throw new AppError(`ไม่รองรับการอัปเดตฟิลด์ "${field}"`, 400);

    const fields = field ? [field] : Object.keys(spec);
    const updates: Record<string, string> = {};
    const changed: string[] = [];
    for (const key of fields) {
      const next = spec[key];
      if (next == null) continue;
      // A blanket "sync all" must never trade a more specific stored value for
      // the agent's shorter one; an explicit single-field request is the user
      // deciding they want the agent's version regardless.
      if (!field && agentValueSatisfied((asset as any)[key], next)) continue;
      if (String((asset as any)[key] ?? '').trim() === next) continue;
      updates[key] = next;
      changed.push(AGENT_FIELD_LABELS[key] || key);
    }

    if (Object.keys(updates).length === 0) {
      return res.json({ message: 'ข้อมูลตรงกับ Agent อยู่แล้ว ไม่มีอะไรต้องอัปเดต', updated: 0, fields: [] });
    }

    await prisma.asset.update({ where: { id }, data: updates });
    await prisma.assetHistory.create({
      data: {
        assetId: id,
        actionType: 'AGENT_SYNC',
        actorUserId: req.user!.userId,
        note: `อัปเดตสเปกตามระบบ Agent: ${changed.join(', ')}`,
      },
    });

    res.json({
      message: `อัปเดต ${changed.length} รายการตามระบบ Agent แล้ว (${changed.join(', ')})`,
      updated: changed.length,
      fields: Object.keys(updates),
    });
  } catch (err) { next(err); }
});

// Fleet-wide view of how far the registry has drifted from what the agent sees.
// Registered under /agent/... rather than /:id/... so it cannot be shadowed by
// the numeric-id routes above.

// ── External monitors reported by the agent ─────────────────────────────
//
// Three endpoints, no new page: the fleet list feeds a tab on the existing
// agent-drift screen, the per-asset one feeds the spec tab that already lists
// a machine's monitors read-only, and the two writes are what those views act
// with.

// Every machine the agent covers. Slow — one upstream call per host — so it is
// only ever requested by an explicit page load, never polled.
router.get('/agent/monitors', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await reconcileFleet(prisma);
    res.json({
      available: rows.length > 0,
      rows,
      summary: {
        total: rows.length,
        fix: rows.filter(r => r.bucket === 'FIX').length,
        ok: rows.filter(r => r.bucket === 'OK').length,
        create: rows.filter(r => r.bucket === 'CREATE').length,
        manual: rows.filter(r => r.bucket === 'MANUAL').length,
        linkable: rows.filter(r => r.linkable).length,
      },
    });
  } catch (err) { next(err); }
});

// The monitors attached to one machine, for its spec tab.
router.get('/:id/agent-monitors', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const asset = await prisma.asset.findUnique({
      where: { id: parseInt(req.params.id) },
      select: { assetName: true, serialNo: true },
    });
    if (!asset) throw new AppError('ไม่พบทรัพย์สิน', 404);
    const record = await fetchAgentRecord(asset.assetName);
    if (!record) return res.json({ available: false, rows: [] });
    res.json({ available: true, rows: await reconcileRecord(prisma, record) });
  } catch (err) { next(err); }
});

// Apply the picked fields to one monitor. Only the keys named in `fields` are
// touched, so a reviewer who accepted the brand but not the owner gets exactly
// that.
router.post('/:id/monitor-sync', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const incoming = (req.body?.fields ?? {}) as Record<string, string>;
    const ALLOWED = ['brand', 'model', 'ownerName', 'location', 'departmentId', 'assetName', 'assetCode'];

    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) throw new AppError('ไม่พบทรัพย์สิน', 404);

    const data: any = {};
    const changes: string[] = [];
    for (const key of ALLOWED) {
      const value = incoming[key];
      if (typeof value !== 'string' || value.trim() === '') continue;
      const before = (asset as any)[key];
      if (String(before ?? '') === value.trim()) continue;
      data[key] = value.trim();
      changes.push(key + ': ' + (before ?? '(ว่าง)') + ' → ' + value.trim());
    }
    if (!changes.length) return res.json({ message: 'ไม่มีการเปลี่ยนแปลง', asset });

    const updated = await prisma.asset.update({ where: { id }, data });
    await prisma.assetHistory.create({
      data: {
        assetId: id,
        actionType: 'AGENT_SYNC',
        note: 'ซิงก์ข้อมูลจอจาก Agent — ' + changes.join(' · '),
        actorUserId: req.user!.userId,
      },
    });
    res.json({ message: 'อัปเดต ' + changes.length + ' ช่องเรียบร้อย', asset: updated });
  } catch (err) { next(err); }
});

// Join a monitor to the machine it is plugged into. AssetLink has existed all
// along and held nothing; the agent knows the pairing for certain.
router.post('/agent/monitor-link', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pairs = (req.body?.pairs ?? []) as { parentId: number; childId: number }[];
    if (!Array.isArray(pairs) || pairs.length === 0) throw new AppError('ไม่มีคู่ที่จะผูก', 400);

    let linked = 0, skipped = 0;
    for (const pair of pairs) {
      const parentId = Number(pair.parentId), childId = Number(pair.childId);
      if (!parentId || !childId || parentId === childId) { skipped++; continue; }
      const exists = await prisma.assetLink.findFirst({ where: { parentId, childId } });
      if (exists) { skipped++; continue; }
      await prisma.assetLink.create({
        data: { parentId, childId, linkType: 'MONITOR', note: 'ผูกจากข้อมูล Agent' },
      });
      await prisma.assetHistory.create({
        data: { assetId: childId, actionType: 'AGENT_SYNC',
                note: 'ผูกจอเข้ากับเครื่อง (จากข้อมูล Agent)', actorUserId: req.user!.userId },
      });
      linked++;
    }
    res.json({ message: 'ผูก ' + linked + ' คู่' + (skipped ? ' (ข้าม ' + skipped + ')' : ''), linked, skipped });
  } catch (err) { next(err); }
});

// ค้นเครื่องจาก Agent ด้วย Serial หรือชื่อเครื่อง สำหรับเติมฟอร์มตอนสร้างทรัพย์สิน
//
// มีปุ่มดึงจาก GLPI อยู่แล้วในฟอร์มเดียวกัน แต่ Agent ให้ยี่ห้อ/รุ่น/ดิสก์/GPU ครบกว่า
// และรู้จักเครื่องที่ยังไม่ได้เข้า GLPI — โดยเฉพาะเครื่องใหม่ที่เพิ่งลง Agent เสร็จ
// สุขภาพเครื่องทั้งกองจาก Agent — จัดลำดับความเสี่ยง วางแผนเปลี่ยนเครื่อง
// ดู License ที่ใช้จริง และหาเครื่องที่หยุดรายงาน ทั้งหมดจากการสแกนรอบเดียว
router.get('/agent/health', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await buildFleetHealth(prisma));
  } catch (err) { next(err); }
});

router.get('/agent/lookup', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const serial = String(req.query.serial ?? '').trim();
    const hostname = String(req.query.hostname ?? '').trim();
    if (!serial && !hostname) throw new AppError('ต้องระบุ Serial หรือชื่อเครื่องอย่างน้อยหนึ่งอย่าง', 400);

    let record: any = hostname ? await fetchAgentRecord(hostname) : null;
    if (!record && serial) {
      const key = serial.toLowerCase();
      const hit = (await fetchAllAgentRecords())
        .find((r: any) => String(r?.serial_number ?? '').trim().toLowerCase() === key);
      if (hit?.hostname) record = await fetchAgentRecord(hit.hostname);
    }
    if (!record) throw new AppError('ไม่พบเครื่องนี้ในระบบ Agent', 404);

    // mapAgentToAssetSpec คืนเฉพาะช่องที่ตรงกับคอลัมน์ของ Asset อยู่แล้ว
    // ส่วนชื่อ/ผู้ใช้/บริษัท ส่งแยกเพราะฟอร์มตัดสินใจเองว่าจะเติมช่องไหน
    res.json({
      hostname: record.hostname ?? null,
      serial: record.serial_number ?? null,
      loggedUser: record.logged_user ?? null,
      company: record.company ?? null,
      deviceType: record.device_type ?? null,
      online: !!record.online,
      lastSeen: record.last_seen ?? null,
      spec: mapAgentToAssetSpec(record),
    });
  } catch (err) { next(err); }
});

router.get('/agent/drift', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const records = await fetchAllAgentRecords();
    if (records.length === 0) return res.json({ available: false, machines: [], unmatched: [] });

    const machines: any[] = [];
    const unmatched: any[] = [];

    for (const summary of records) {
      const record = await fetchAgentRecord(summary.hostname);
      if (!record) continue;

      const match = await matchAssetForAgent(prisma, record);
      if (!match) {
        unmatched.push({
          hostname: record.hostname,
          serialNo: record.serial_number ?? null,
          model: record.computer_model ?? null,
          brand: record.computer_manufacturer ?? null,
          loggedUser: record.logged_user ?? null,
          online: !!record.online,
        });
        continue;
      }

      const { blanks, conflicts } = computeDrift(match.asset, mapAgentToAssetSpec(record));
      machines.push({
        hostname: record.hostname,
        online: !!record.online,
        lastSeen: record.last_seen ?? null,
        matchedBy: match.matchedBy,
        assetId: match.asset.id,
        assetCode: match.asset.assetCode,
        ownerName: match.asset.ownerName,
        blanks,
        conflicts,
      });
    }

    res.json({
      available: true,
      machines,
      unmatched,
      totals: {
        machines: machines.length,
        blanks: machines.reduce((n, m) => n + m.blanks.length, 0),
        conflicts: machines.reduce((n, m) => n + m.conflicts.length, 0),
      },
    });
  } catch (err) { next(err); }
});

// Fill every empty field the agent can supply, across the fleet. Safe by
// construction — it only writes where the registry holds nothing, so no
// existing value can be lost. Conflicts are never touched here.
router.post('/agent/fill-blanks', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assetIds = Array.isArray(req.body?.assetIds) ? req.body.assetIds.map(Number).filter(Boolean) : undefined;
    const result = await fillBlanksFromAgent(prisma, { actorUserId: req.user!.userId, assetIds });
    res.json({
      ...result,
      message: result.fieldsFilled === 0
        ? 'ไม่มีช่องว่างที่ Agent เติมให้ได้'
        : `เติมข้อมูล ${result.fieldsFilled} ช่อง ใน ${result.assetsUpdated} เครื่อง`,
    });
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
    const allowed = ['status', 'departmentId', 'location', 'floor', 'company', 'ownerName', 'categoryId',
                     'brand', 'model', 'vendor', 'purchaseDate', 'warrantyEndDate'];
    const updateData: any = {};
    for (const key of allowed) {
      if (data[key] === undefined) continue;
      updateData[key] = (key === 'purchaseDate' || key === 'warrantyEndDate')
        ? (data[key] ? new Date(data[key]) : null)
        : data[key];
    }

    // Auto-clear ownerName if status is Retired or Disposed in bulk update
    if (updateData.status && (updateData.status === 'Retired' || updateData.status === 'Disposed')) {
      updateData.ownerName = null;
    }

    /**
     * กรอกวันหมดประกันเป็นชุดจาก "อายุประกันกี่ปี" นับจากวันที่ซื้อของแต่ละเครื่อง
     *
     * วันหมดประกันกรอกไว้ 8 จาก 733 เครื่อง ทั้งที่มีวันที่ซื้ออยู่ 206 เครื่อง
     * การกรอกทีละเครื่องคือเหตุผลที่มันว่าง แต่จะให้ระบบเดาอายุประกันเองก็ไม่ได้ —
     * ตัวอย่างที่มีทั้งสองค่าอยู่ 6 เครื่อง กระจายตั้งแต่ 2.87 ถึง 3.92 ปี และ
     * วันหมดประกันที่ผิดแย่กว่าช่องว่าง เพราะมันชี้นำการตัดสินใจซื้อ
     *
     * ตัวเลขอายุประกันจึงมาจากคนที่ถือใบสั่งซื้ออยู่ ระบบแค่คูณให้ทีละหลายเครื่อง
     * เครื่องที่ไม่มีวันที่ซื้อจะถูกข้าม ไม่ใช่เดาวันซื้อให้
     */
    const years = Number(data.warrantyYearsFromPurchase);
    let derived = 0, skipped = 0;
    if (Number.isFinite(years) && years > 0 && years <= 10) {
      const rows = await prisma.asset.findMany({
        where: { id: { in: ids } },
        select: { id: true, purchaseDate: true },
      });
      await prisma.$transaction(rows.map(r => {
        if (!r.purchaseDate) { skipped++; return prisma.asset.update({ where: { id: r.id }, data: {} }); }
        const end = new Date(r.purchaseDate);
        end.setFullYear(end.getFullYear() + Math.round(years));
        derived++;
        return prisma.asset.update({ where: { id: r.id }, data: { ...updateData, warrantyEndDate: end } });
      }));
      const note = skipped ? ` (ข้าม ${skipped} เครื่องที่ไม่มีวันที่ซื้อ)` : '';
      return res.json({ message: `ตั้งวันหมดประกันจากวันที่ซื้อ + ${Math.round(years)} ปี ให้ ${derived} รายการ${note}` });
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

    const spec = await fetchGLPISpecBySerial(asset.serialNo, asset.company);
    if (!spec) throw new AppError('ไม่พบข้อมูลฮาร์ดแวร์ใน GLPI สำหรับ Serial Number นี้', 404);

    // The comparison is built here rather than in the page so that what the
    // spec tab marks as a difference is exactly what a sync would write.
    res.json({ ...spec, fields: buildGlpiFields(asset, spec) });
  } catch (err) { next(err); }
});

router.post('/:id/glpi-sync', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) throw new AppError('ไม่พบทรัพย์สิน', 404);
    if (!asset.serialNo) throw new AppError('ทรัพย์สินนี้ไม่มี Serial Number สำหรับดึงข้อมูล', 400);

    const spec = await fetchGLPISpecBySerial(asset.serialNo, asset.company);
    if (!spec) throw new AppError('ไม่พบข้อมูลฮาร์ดแวร์ใน GLPI สำหรับ Serial Number นี้', 404);

    const field = req.body.field as string | undefined;
    const fields = buildGlpiFields(asset, spec);
    const { assetData, detailData, changes } = planGlpiSync(fields, field);

    if (changes.length === 0) {
      return res.json({
        message: field
          ? 'ค่านี้ตรงกับ GLPI อยู่แล้ว'
          : 'ไม่มีช่องว่างให้เติม และไม่มีค่าใดที่ GLPI ละเอียดกว่า — ค่าที่ขัดกันต้องกดรับทีละช่อง',
        updated: 0, fields: [], spec: { ...spec, fields },
      });
    }

    if (Object.keys(assetData).length > 0) {
      await prisma.asset.update({ where: { id }, data: assetData });
    }
    if (Object.keys(detailData).length > 0) {
      // Writes ComputerDetail and mirrors the same values onto Asset.
      await upsertAssetDetail(prisma, id, asset.type || '', detailData);
    }

    const note = 'ปรับปรุงตาม GLPI — ' + changes.join(' · ');

    // Write a history record
    await prisma.assetHistory.create({
      data: {
        assetId: id,
        actionType: 'GLPI_SYNC',
        actorUserId: req.user!.userId,
        note,
      },
    });

    const fresh = await prisma.asset.findUnique({ where: { id } });
    res.json({
      message: 'อัปเดต ' + changes.length + ' ช่องตาม GLPI เรียบร้อยแล้ว',
      updated: changes.length,
      fields: changes,
      spec: { ...spec, fields: buildGlpiFields(fresh, spec) },
    });
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
