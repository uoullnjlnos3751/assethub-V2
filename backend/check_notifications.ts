import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check admin users
  const admins = await prisma.appUser.findMany({
    where: { role: { in: ['IT_ADMIN', 'SUPERADMIN'] } },
    select: { id: true, adUsername: true, displayName: true, email: true, role: true },
  });
  console.log('Admin users:');
  admins.forEach(a => console.log(`  ${a.adUsername} (${a.role}) - email: ${a.email || 'NONE'}`));

  // Check notification templates
  const templates = await prisma.notificationTemplate.findMany();
  console.log('\nNotification templates:');
  templates.forEach(t => console.log(`  ${t.key} (${t.channel})`));

  // Check pending notifications
  const pending = await prisma.notificationOutbox.count({ where: { status: 'PENDING' } });
  console.log(`\nPending notifications: ${pending}`);

  // Check recent extensions
  const extensions = await prisma.borrowExtension.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: { request: true, requester: true },
  });
  console.log('\nRecent extensions:');
  extensions.forEach(e => console.log(`  ${e.request.requestNo} by ${e.requester.adUsername} - status: ${e.status} - reason: ${e.reason || 'NONE'}`));

  // Create notification templates if missing
  const templateKeys = ['extension_pending', 'extension_approved', 'extension_rejected'];
  for (const key of templateKeys) {
    const exists = await prisma.notificationTemplate.findFirst({ where: { key } });
    if (!exists) {
      await prisma.notificationTemplate.createMany({
        data: [
          { key, channel: 'EMAIL', subjectTh: `คำขอขยายวันยืม - ${key}`, bodyTh: `มีคำขอขยายวันยืม: {{requestNo}}\nจำนวนวัน: {{extraDays}}\nเหตุผล: {{reason}}` },
          { key, channel: 'TEAMS', subjectTh: '', bodyTh: `**คำขอขยายวันยืม**\nคำขอ: {{requestNo}}\nจำนวนวัน: {{extraDays}}\nเหตุผล: {{reason}}` },
        ],
      });
      console.log(`Created template: ${key}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
