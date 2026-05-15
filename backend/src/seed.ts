import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as fs from 'fs';

const prisma = new PrismaClient();

interface ExcelRow {
  [key: string]: any;
}

function mapStatusToAssetStatus(status: string): 'Available' | 'Borrowed' | 'Maintenance' | 'Retired' | 'Lost' {
  const statusLower = (status || '').toLowerCase();
  if (statusLower.includes('ใช้งาน')) return 'Available';
  if (statusLower.includes('ยืม')) return 'Borrowed';
  if (statusLower.includes('ซ่อม')) return 'Maintenance';
  if (statusLower.includes('โอน') || statusLower.includes('ปลด')) return 'Retired';
  if (statusLower.includes('หาย')) return 'Lost';
  return 'Available';
}

function parseDate(excelDate: any): Date | null {
  if (!excelDate) return null;
  try {
    if (typeof excelDate === 'number') {
      const date = new Date((excelDate - 25569) * 86400 * 1000);
      if (!isNaN(date.getTime())) return date;
    } else if (typeof excelDate === 'string') {
      const date = new Date(excelDate);
      if (!isNaN(date.getTime())) return date;
    }
  } catch (e) {}
  return null;
}

async function main() {
  console.log('\n🌱 Starting seed with asset data from Excel...');

  try {
    // Clear existing data
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

    // Setup users
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
        role: 'IT_ADMIN',
        isActive: true,
      },
    });
    console.log('✓ Users created');

    // Read Excel and import assets
    console.log('\n📂 Reading assets from Excel...');
    const excelFile = '/app/AssetIT41.xlsx';
    
    if (!fs.existsSync(excelFile)) {
      throw new Error(`File not found: ${excelFile}`);
    }

    const workbook = XLSX.readFile(excelFile);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as ExcelRow[];

    console.log(`✓ Found ${rows.length} records in Excel`);

    let successCount = 0;
    let skipCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      try {
        const assetCode = (row['New Comname'] || '').toString().trim();
        const serialNo = (row['S/N Computer'] || '').toString().trim();

        if (!assetCode || !serialNo) {
          skipCount++;
          continue;
        }

        // Check if already exists
        const existing = await prisma.asset.findFirst({
          where: { OR: [{ assetCode }, { serialNo }] },
        });

        if (existing) {
          skipCount++;
          continue;
        }

        // Create asset
        const asset = await prisma.asset.create({
          data: {
            assetCode,
            serialNo,
            type: (row['Type PC/Notebook'] || 'PC').toString().trim(),
            brand: (row['Brand'] || '').toString().trim(),
            model: (row['Model'] || '').toString().trim(),
            cpu: (row['CPU'] || '').toString().trim(),
            ram: (row['Ram'] || '').toString().trim(),
            storage1: (row['SSD'] || row['HD'] || '').toString().trim(),
            storage2: '',
            osVersion: (row['Windows'] || '').toString().trim(),
            windowsLicense: (row['Window License No.'] || '').toString().trim(),
            officeLicense: (row['Office License No.'] || '').toString().trim(),
            antivirusStatus: row['Antivirus'] ? 'Active' : 'Inactive',
            vendor: (row['Vendor'] || '').toString().trim(),
            poNumber: (row['PO No.'] || '').toString().trim(),
            purchaseDate: parseDate(row['PO Date']),
            ownerName: (row['Name'] || '').toString().trim(),
            departmentId: (row['Dep.'] || '').toString().trim(),
            location: `Floor ${row['Floor'] || 'Unknown'}`,
            status: mapStatusToAssetStatus(row['Status']),
            remark: (row['User Owner'] || '').toString().trim(),
          },
        });

        // Create CREATE history entry for every imported asset
        await prisma.assetHistory.create({
          data: {
            assetId: asset.id,
            actionType: 'CREATE',
            toStatus: asset.status,
            actorUserId: itAdmin.id,
            note: 'นำเข้าข้อมูลจาก Excel ครั้งแรก',
          },
        });

        successCount++;

        if (successCount % 100 === 0) {
          console.log(`  ⏳ Imported ${successCount} assets...`);
        }
      } catch (err: any) {
        skipCount++;
      }
    }

    console.log(`\n✓ Successfully imported ${successCount} assets`);
    if (skipCount > 0) {
      console.log(`⚠️  Skipped ${skipCount} rows (duplicates or invalid)`);
    }

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
        where: { key: t.key },
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
