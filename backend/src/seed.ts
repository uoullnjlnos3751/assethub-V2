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
  console.log('\n🌱 Starting seed from assets-2026-05-18.csv...');

  try {
    console.log('\n🗑️  Clearing existing assets...');
    await prisma.assetHistory.deleteMany({});
    await prisma.borrowExtensionItem.deleteMany({});
    await prisma.borrowExtension.deleteMany({});
    await prisma.return.deleteMany({});
    await prisma.checkout.deleteMany({});
    await prisma.borrowApproval.deleteMany({});
    await prisma.borrowRequestItem.deleteMany({});
    await prisma.borrowRequest.deleteMany({});
    await prisma.pMRunAnswer.deleteMany({});
    await prisma.pMRun.deleteMany({});
    await prisma.pMPlan.deleteMany({});
    await prisma.asset.deleteMany({});
    console.log('✓ Cleared all existing assets');

    console.log('\n👥 Setting up users...');
    const admin = await prisma.appUser.upsert({
      where: { adUsername: 'admin' },
      update: {},
      create: {
        adUsername: 'admin',
        displayName: 'Admin User',
        email: 'admin@trrgroup.com',
        department: 'IT',
        role: 'SUPERADMIN',
        isActive: true,
      },
    });

    const itAdmin = await prisma.appUser.upsert({
      where: { adUsername: 'watchara.kid' },
      update: {},
      create: {
        adUsername: 'watchara.kid',
        displayName: 'วัฒนา เด็กสวย',
        email: 'watchara.kid@trrgroup.com',
        department: 'IT',
        role: 'SUPERADMIN',
        isActive: true,
      },
    });
    console.log('✓ Users created');

    console.log('\n📂 Reading assets from CSV...');
    const csvFile = '/app/assets-2026-05-18.csv';
    if (!fs.existsSync(csvFile)) throw new Error(`File not found: ${csvFile}`);

    const content = fs.readFileSync(csvFile, 'utf-8');
    const lines = content.split('\n').filter((l) => l.trim());
    if (lines.length < 2) throw new Error('CSV has no data rows');

    const headers = parseCsvLine(lines[0]);
    console.log(`✓ Found ${lines.length - 1} records in CSV`);

    let successCount = 0;
    let skipCount = 0;
    const seenSerials = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const vals = parseCsvLine(lines[i]);
      if (vals.length < 6) { skipCount++; continue; }

      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = vals[idx] || ''; });

        let assetCode = row['Computer Name']?.trim();
        const serialNo = row['Serial Number']?.trim();
        const oldAssetCode = row['Old Computer Name']?.trim() || null;
        if (!assetCode && !serialNo) { skipCount++; continue; }
        if (!serialNo || serialNo === '-' || seenSerials.has(serialNo)) { skipCount++; continue; }
        seenSerials.add(serialNo);
        if (!assetCode && oldAssetCode) assetCode = oldAssetCode;

        try {
          const company = row['Company']?.trim() || '';
          const brand = row['Brand']?.trim() || '';
          const model = row['Model']?.trim() || '';
          const type = row['Type PC/Notebook']?.trim() || 'PC';
          const ownerName = row['ผู้ถือครอง']?.trim() || '';
          const departmentId = row['แผนก']?.trim() || '';
          const floor = row['Floor']?.trim() || '';
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
          const remark = row['หมายเหตุ']?.trim() || '';

          const status = mapStatus(row['Status']?.trim() || 'Available');
          const antivirusStatus = antivirusRaw && antivirusRaw !== '-' ? 'Active' : 'Inactive';

          const asset = await prisma.asset.create({
            data: {
              assetCode,
              serialNo,
              type, brand, model, cpu, ram, osType, osVersion,
              windowsLicense, officeLicense, antivirusStatus,
              vendor, poNumber, prNumber, poDate,
              ownerName, departmentId,
              location: 'HQ',
              floor, company, oldAssetCode, domainName, cpuGeneration,
              ramSlot1, ramSlot2, storage1, storage2, budget,
              status, remark,
            },
          });

        await prisma.assetHistory.create({
          data: {
            assetId: asset.id,
            actionType: 'CREATE',
            toStatus: asset.status,
            actorUserId: itAdmin.id,
            note: 'นำเข้าข้อมูลจาก CSV ครั้งแรก',
          },
        });

        successCount++;
        if (successCount % 100 === 0) console.log(`  ⏳ Imported ${successCount} assets...`);
      } catch (err: any) {
        skipCount++;
      }
    }

    console.log(`\n✓ Successfully imported ${successCount} assets`);
    if (skipCount > 0) console.log(`⚠️  Skipped ${skipCount} rows (duplicates or invalid)`);

    // Setup notification templates
    console.log('\n📧 Setting up notification templates...');
    const templates = [
      { key: 'borrow_request_pending', channel: 'EMAIL' as const, subjectTh: 'คำขอยืมทรัพย์สินใหม่', bodyTh: 'มีคำขอยืมใหม่จาก {{requester}}' },
      { key: 'borrow_approved', channel: 'EMAIL' as const, subjectTh: 'คำขอยืมได้รับการอนุมัติ', bodyTh: 'คำขอเลขที่ {{requestNo}} ได้รับการอนุมัติแล้ว' },
      { key: 'checkout_completed', channel: 'EMAIL' as const, subjectTh: 'ส่งมอบทรัพย์สินเรียบร้อย', bodyTh: 'คำขอเลขที่ {{requestNo}} ได้ส่งมอบแล้ว' },
      { key: 'return_recorded', channel: 'EMAIL' as const, subjectTh: 'คืนทรัพย์สินเรียบร้อย', bodyTh: 'คำขอเลขที่ {{requestNo}} คืนเรียบร้อย' },
    ];

    for (const t of templates) {
      await prisma.notificationTemplate.upsert({
        where: { key_channel: { key: t.key, channel: t.channel } },
        update: { subjectTh: t.subjectTh, bodyTh: t.bodyTh },
        create: t,
      });
    }
    console.log('✓ Notification templates created');

    // Setup default settings
    const existingSettings = await prisma.notificationSetting.findFirst();
    if (!existingSettings) {
      await prisma.notificationSetting.create({ data: {} });
    }

    // Create PM Template + Plan + Sample PM Runs for first 20 assets
    console.log('\n🔧 Setting up PM data...');
    const pmiData = [
      { key: 'windows_activate', label: 'Windows Activated?', type: 'Boolean', required: true, group: 'OS & Software' },
      { key: 'windows_version', label: 'Windows Version (winver)', type: 'Text', required: true, group: 'OS & Software' },
      { key: 'office_activate', label: 'Office Activated?', type: 'Boolean', required: true, group: 'OS & Software' },
      { key: 'antivirus_update', label: 'Antivirus Updated?', type: 'Boolean', required: true, group: 'OS & Software' },
      { key: 'glpi_spiceworks', label: 'GLPI/Spiceworks Status', type: 'Text', group: 'Monitoring' },
      { key: 'usb_policy', label: 'USB Policy Enabled?', type: 'Boolean', group: 'Security' },
      { key: 'cleaning', label: 'Device Cleaned?', type: 'Boolean', group: 'Hardware' },
      { key: 'feedback', label: 'User Feedback / Notes', type: 'Text', group: 'Hardware' },
    ];
    const pmTemplate = await prisma.pMTemplate.create({
      data: { year: new Date().getFullYear(), name: 'PM ตรวจนับประจำปี', active: true },
    });
    const templateItems = await Promise.all(
      pmiData.map((item) => prisma.pMTemplateItem.create({ data: { ...item, templateId: pmTemplate.id } }))
    );
    console.log(`✓ PM Template created: ${pmTemplate.name}`);

    const pmPlan = await prisma.pMPlan.create({
      data: {
        year: new Date().getFullYear(),
        site: 'TRR HQ',
        deptTask: 'IT Asset PM',
        lead: 'IT Admin',
        plannedDeviceCount: 20,
        startDate: new Date(new Date().getFullYear(), 0, 1),
        endDate: new Date(new Date().getFullYear(), 11, 31),
        templateId: pmTemplate.id,
      },
    });
    console.log('✓ PM Plan created');

    // Create PM runs for first 20 assets
    const firstAssets = await prisma.asset.findMany({ take: 20, orderBy: { id: 'asc' } });
    for (let i = 0; i < firstAssets.length; i++) {
      const asset = firstAssets[i];
      const completed = i % 3 !== 2; // ~66% completed
      await prisma.pMRun.create({
        data: {
          planId: pmPlan.id,
          assetId: asset.id,
          year: new Date().getFullYear(),
          status: completed ? 'COMPLETED' : 'IN_PROGRESS',
          performedBy: itAdmin.id,
          performedAt: new Date(),
          completedAt: completed ? new Date() : null,
          answers: {
            create: [
              { itemId: templateItems[0].id, value: 'true' },
              { itemId: templateItems[1].id, value: 'Windows 11 Pro 23H2' },
              { itemId: templateItems[2].id, value: 'true' },
              { itemId: templateItems[3].id, value: 'true' },
            ],
          },
        },
      });
    }
    console.log(`✓ Created ${firstAssets.length} PM runs (${Math.ceil(firstAssets.length * 2 / 3)} completed)`);

    console.log('\n✨ Seed completed successfully!');
    console.log(`📊 Total: ${successCount} assets imported`);
    console.log('━'.repeat(60));

  } catch (err) {
    console.error('\n❌ Error:', err);
    process.exit(1);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
