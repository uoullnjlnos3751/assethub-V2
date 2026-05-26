import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
  {
    name: 'คอมพิวเตอร์',
    icon: '💻',
    description: 'คอมพิวเตอร์ทุกประเภท',
    sortOrder: 1,
    types: [
      { name: 'Notebook', description: 'โน้ตบุ๊ก', detailTable: 'computer_details', sortOrder: 1 },
      { name: 'PC Desktop', description: 'คอมพิวเตอร์ตั้งโต๊ะ', detailTable: 'computer_details', sortOrder: 2 },
      { name: 'Macbook', description: 'MacBook Apple', detailTable: 'computer_details', sortOrder: 3 },
      { name: 'Mini PC', description: 'คอมพิวเตอร์ขนาดเล็ก', detailTable: 'computer_details', sortOrder: 4 },
      { name: 'All-in-One', description: 'คอมพิวเตอร์จอในตัว', detailTable: 'computer_details', sortOrder: 5 },
      { name: 'Thin Client', description: 'Thin Client', detailTable: 'computer_details', sortOrder: 6 },
    ],
  },
  {
    name: 'อุปกรณ์สื่อสาร',
    icon: '📱',
    description: 'โทรศัพท์และแท็บเล็ต',
    sortOrder: 2,
    types: [
      { name: 'Smartphone', description: 'โทรศัพท์มือถือ', detailTable: 'phone_details', sortOrder: 1 },
      { name: 'Tablet', description: 'แท็บเล็ต', detailTable: 'phone_details', sortOrder: 2 },
      { name: 'Mobile Hotspot', description: 'อุปกรณ์กระจายสัญญาณมือถือ', detailTable: 'phone_details', sortOrder: 3 },
    ],
  },
  {
    name: 'จอภาพ',
    icon: '🖥️',
    description: 'จอมอนิเตอร์',
    sortOrder: 3,
    types: [
      { name: 'Monitor มาตรฐาน', description: 'จอมอนิเตอร์ทั่วไป', detailTable: 'monitor_details', sortOrder: 1 },
      { name: 'Monitor Ultrawide', description: 'จอกว้าง Ultrawide', detailTable: 'monitor_details', sortOrder: 2 },
      { name: 'Monitor Curved', description: 'จอโค้ง', detailTable: 'monitor_details', sortOrder: 3 },
      { name: 'Monitor 4K', description: 'จอความละเอียด 4K', detailTable: 'monitor_details', sortOrder: 4 },
    ],
  },
  {
    name: 'อุปกรณ์ต่อพ่วง',
    icon: '🔌',
    description: 'อุปกรณ์ต่อพ่วงและ AV',
    sortOrder: 4,
    types: [
      { name: 'Projector', description: 'เครื่องฉายภาพ', detailTable: 'device_details', sortOrder: 1 },
      { name: 'Conference Speaker', description: 'ลำโพงประชุม', detailTable: 'device_details', sortOrder: 2 },
      { name: 'Webcam', description: 'กล้องเว็บแคม', detailTable: 'device_details', sortOrder: 3 },
      { name: 'Docking Station', description: 'Docking Station', detailTable: 'device_details', sortOrder: 4 },
      { name: 'Presentation Clicker', description: 'รีโมทนำเสนอ', detailTable: 'device_details', sortOrder: 5 },
      { name: 'Mouse', description: 'เมาส์', detailTable: 'device_details', sortOrder: 6 },
      { name: 'Keyboard', description: 'คีย์บอร์ด', detailTable: 'device_details', sortOrder: 7 },
      { name: 'Microphone', description: 'ไมโครโฟน', detailTable: 'device_details', sortOrder: 8 },
      { name: 'Voice Recorder', description: 'เครื่องบันทึกเสียง', detailTable: 'device_details', sortOrder: 9 },
    ],
  },
  {
    name: 'เครื่องพิมพ์',
    icon: '🖨️',
    description: 'เครื่องพิมพ์ทุกประเภท',
    sortOrder: 5,
    types: [
      { name: 'Laser Printer', description: 'เครื่องพิมพ์เลเซอร์', detailTable: 'printer_details', isBorrowable: false, sortOrder: 1 },
      { name: 'Inkjet Printer', description: 'เครื่องพิมพ์หมึกฉีด', detailTable: 'printer_details', isBorrowable: false, sortOrder: 2 },
      { name: 'Thermal Printer', description: 'เครื่องพิมพ์ความร้อน', detailTable: 'printer_details', isBorrowable: false, sortOrder: 3 },
      { name: 'Dot Matrix Printer', description: 'เครื่องพิมพ์จุด', detailTable: 'printer_details', isBorrowable: false, sortOrder: 4 },
    ],
  },
  {
    name: 'อุปกรณ์เครือข่าย',
    icon: '🔌',
    description: 'Switch, Router, Access Point',
    sortOrder: 6,
    types: [
      { name: 'Switch', description: 'สวิตช์เครือข่าย', detailTable: 'network_device_details', sortOrder: 1 },
      { name: 'Router', description: 'เราเตอร์', detailTable: 'network_device_details', sortOrder: 2 },
      { name: 'Access Point', description: 'จุดกระจายสัญญาณ WiFi', detailTable: 'network_device_details', sortOrder: 3 },
      { name: 'Firewall', description: 'ไฟร์วอลล์', detailTable: 'network_device_details', sortOrder: 4 },
      { name: 'Modem', description: 'โมเด็ม', detailTable: 'network_device_details', sortOrder: 5 },
    ],
  },
  {
    name: 'Rack & Infrastructure',
    icon: '🗄️',
    description: 'แร็คเซิร์ฟเวอร์และโครงสร้างพื้นฐาน',
    sortOrder: 7,
    types: [
      { name: 'Server Rack', description: 'แร็คเซิร์ฟเวอร์', detailTable: 'rack_details', isBorrowable: false, sortOrder: 1 },
      { name: 'PDU', description: 'หน่วยจ่ายไฟ', detailTable: 'rack_details', isBorrowable: false, sortOrder: 2 },
      { name: 'UPS', description: 'เครื่องสำรองไฟ', detailTable: 'rack_details', isBorrowable: false, sortOrder: 3 },
      { name: 'Enclosure', description: 'ตู้เก็บอุปกรณ์', detailTable: 'rack_details', isBorrowable: false, sortOrder: 4 },
    ],
  },
  {
    name: 'สายสัญญาณ',
    icon: '🔗',
    description: 'สายสัญญาณทุกประเภท (Inventory)',
    sortOrder: 8,
    types: [
      { name: 'HDMI Cable', description: 'สาย HDMI', isBorrowable: true, isAssignable: false, sortOrder: 1 },
      { name: 'DisplayPort Cable', description: 'สาย DisplayPort', isBorrowable: true, isAssignable: false, sortOrder: 2 },
      { name: 'USB-C Cable', description: 'สาย USB-C', isBorrowable: true, isAssignable: false, sortOrder: 3 },
      { name: 'LAN Cable', description: 'สาย LAN (Cat5e/6/6a)', isBorrowable: true, isAssignable: false, sortOrder: 4 },
      { name: 'Power Cable', description: 'สายไฟ', isBorrowable: true, isAssignable: false, sortOrder: 5 },
      { name: 'Audio Cable', description: 'สายเสียง (3.5mm, XLR)', isBorrowable: true, isAssignable: false, sortOrder: 6 },
    ],
  },
  {
    name: 'วัสดุสิ้นเปลือง',
    icon: '📦',
    description: 'หมึกพิมพ์ ถ่าน อุปกรณ์เสริม (Inventory)',
    sortOrder: 9,
    types: [
      { name: 'หมึกพิมพ์ (Cartridge/Toner)', description: 'หมึกพิมพ์ทุกประเภท', isBorrowable: true, isAssignable: false, sortOrder: 1 },
      { name: 'ถ่าน (Battery)', description: 'ถ่าน AA, AAA, etc.', isBorrowable: true, isAssignable: false, sortOrder: 2 },
      { name: 'Adapter/Charger', description: 'อะแดปเตอร์และที่ชาร์จ', isBorrowable: true, isAssignable: false, sortOrder: 3 },
      { name: 'อุปกรณ์เสริมอื่นๆ', description: 'อุปกรณ์เสริมอื่นๆ', isBorrowable: true, isAssignable: false, sortOrder: 4 },
    ],
  },
];

async function main() {
  console.log('🌱 Seeding categories...');

  for (const cat of categories) {
    const { types, ...catData } = cat;
    const existing = await prisma.category.findUnique({ where: { name: catData.name } });

    if (existing) {
      let added = 0;
      for (const type of types) {
        const existingCatType = await prisma.categoryType.findFirst({
          where: { categoryId: existing.id, name: type.name },
        });
        if (!existingCatType) {
          await prisma.categoryType.create({
            data: { ...type, categoryId: existing.id },
          });
          added++;
        }
        const existingDevType = await prisma.deviceType.findUnique({ where: { name: type.name } });
        if (!existingDevType) {
          await prisma.deviceType.create({ data: { name: type.name, description: type.description, isActive: true } });
        }
      }
      if (added > 0) {
        console.log(`✅ Added ${added} new type(s) to category "${catData.name}"`);
      } else {
        console.log(`⏭️  Category "${catData.name}" already exists, all types present`);
      }
      continue;
    }

    const category = await prisma.category.create({
      data: {
        ...catData,
        types: {
          create: types,
        },
      },
    });

    for (const type of types) {
      const exists = await prisma.deviceType.findUnique({ where: { name: type.name } });
      if (!exists) {
        await prisma.deviceType.create({ data: { name: type.name, description: type.description, isActive: true } });
      }
    }

    console.log(`✅ Created category "${category.icon} ${category.name}" with ${types.length} types`);
  }

  console.log('🎉 Seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
