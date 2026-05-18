import { PrismaClient, AssetStatus } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (c === ',' && !inQuotes) {
      result.push(current.trim()); current = '';
    } else { current += c; }
  }
  result.push(current.trim());
  return result;
}

function mapStatus(status: string): AssetStatus {
  const s = (status || '').toLowerCase();
  if (s === 'inuse') return 'InUse';
  if (s.includes('ใช้งาน')) return 'InUse';
  if (s.includes('ยืม')) return 'Borrowed';
  if (s.includes('ซ่อม')) return 'Maintenance';
  if (s.includes('โอน') || s.includes('ปลด') || s === 'retired') return 'Retired';
  if (s.includes('หาย')) return 'Lost';
  if (s.includes('สำรอง')) return 'Available';
  return 'Available';
}

function parseDate(val: string): Date | null {
  if (!val) return null;
  val = val.trim();
  if (!val || val === '#N/A' || val === '0') return null;
  const parts = val.split('/');
  if (parts.length === 3) {
    const d = parseInt(parts[0]), m = parseInt(parts[1]) - 1, y = parseInt(parts[2]);
    const date = new Date(y, m, d);
    if (!isNaN(date.getTime())) return date;
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

async function main() {
  const csvPath = '/app/assets-2026-05-18.csv';
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter((l) => l.trim());

  if (lines.length < 2) { console.log('No data'); return; }

  const headers = parseCsvLine(lines[0]);

  let created = 0, updated = 0, skipped = 0;
  const companySet = new Set<string>();
  const vendorSet = new Set<string>();
  const typeSet = new Set<string>();
  const locationSet = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const vals = parseCsvLine(lines[i]);
    if (vals.length < 6) { skipped++; continue; }

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = vals[idx] || ''; });

    let assetCode = row['Computer Name']?.trim();
    const serialNo = row['Serial Number']?.trim();
    const oldAssetCode = row['Old Computer Name']?.trim() || null;
    if (!assetCode && !serialNo) { skipped++; continue; }
    if (!assetCode && oldAssetCode) assetCode = oldAssetCode;

    const type = row['Type PC/Notebook']?.trim() || 'PC';
    const brand = row['Brand']?.trim() || '';
    const model = row['Model']?.trim() || '';
    const company = row['Company']?.trim() || '';
    const ownerName = row['ผู้ถือครอง']?.trim() || '';
    const departmentId = row['แผนก']?.trim() || '';
    const floor = row['Floor']?.trim() || '';
    const statusRaw = row['Status']?.trim() || row['สถานะ']?.trim() || 'Available';
    const domainName = row['Join Domain']?.trim() || '';
    const osType = row['OS']?.trim() || '';
    const osVersion = row['Windows']?.trim() || '';
    const windowsLicense = row['Windows']?.trim() || '';
    const officeLicense = row['MS Office']?.trim() || '';
    const antivirusRaw = row['Antivirus']?.trim() || '';
    const cpu = row['CPU']?.trim() || '';
    const cpuGeneration = row['Generation']?.trim() || '';
    const storage1 = row['Storage 1']?.trim() || '';
    const storage2 = row['Storage 2']?.trim() || '';
    const ram = row['RAM']?.trim() || '';
    const ramSlot1 = row['RAM Slot1']?.trim() || '';
    const ramSlot2 = row['RAM Slot2']?.trim() || '';
    const prNumber = row['PR No.']?.trim() || '';
    const budget = row['งบประมาณ']?.trim() || '';
    const poDate = parseDate(row['PO Date']);
    const poNumber = row['PO No.']?.trim() || '';
    const vendor = row['Vendor']?.trim() || '';
    const oldAssetCode = row['Old Computer Name']?.trim() || null;
    const remark = row['หมายเหตุ']?.trim() || '';

    const location = 'HQ';
    const status = mapStatus(statusRaw);
    const antivirusStatus = antivirusRaw && antivirusRaw !== '-' ? 'Active' : 'Inactive';

    if (company) companySet.add(company);
    if (vendor) vendorSet.add(vendor);
    if (type) typeSet.add(type);
    if (location) locationSet.add(location);
    if (floor) {
      const locName = `Floor ${floor}`;
      if (floor !== '#N/A' && floor !== '0') locationSet.add(locName);
    }

    const data: any = {
      type, brand, model, cpu, ram, osType, osVersion, windowsLicense,
      officeLicense, antivirusStatus, vendor, poNumber, prNumber,
      poDate, ownerName, departmentId, location, status, remark,
      company, oldAssetCode, cpuGeneration, domainName, floor,
      ramSlot1, ramSlot2, storage1, storage2, budget,
    };

    try {
      const existing = await prisma.asset.findFirst({
        where: assetCode ? { assetCode } : { serialNo },
      });

      if (existing) {
        await prisma.asset.update({ where: { id: existing.id }, data });
        updated++;
      } else {
        data.assetCode = assetCode || `AUTO-${Date.now()}-${i}`;
        data.serialNo = serialNo || `AUTO-${Date.now()}-${i}`;
        await prisma.asset.create({ data });
        created++;
      }
    } catch (err: any) {
      console.error(`Error at row ${i} (${assetCode}): ${err.message}`);
      skipped++;
    }
  }

  // Update master data
  for (const name of companySet) {
    if (name) await prisma.company.upsert({ where: { name }, update: {}, create: { name } });
  }
  for (const name of vendorSet) {
    if (name) await prisma.vendor.upsert({ where: { name }, update: {}, create: { name } });
  }
  for (const name of typeSet) {
    if (name) await prisma.deviceType.upsert({ where: { name }, update: {}, create: { name, description: name } });
  }
  for (const name of locationSet) {
    if (name) await prisma.assetLocation.upsert({ where: { name }, update: {}, create: { name, description: name } });
  }

  console.log(`\n✅ Done! Created: ${created}, Updated: ${updated}, Skipped: ${skipped}`);
  console.log(`Companies: ${companySet.size}, Vendors: ${vendorSet.size}, Types: ${typeSet.size}, Locations: ${locationSet.size}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
