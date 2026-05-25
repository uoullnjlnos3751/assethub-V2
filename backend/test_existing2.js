const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const byId = await prisma.asset.findUnique({ where: { id: 522 } });
  console.log('byId:', byId);
  const bySerial = await prisma.asset.findUnique({ where: { serialNo: 'BRBFGG3' } });
  console.log('bySerial:', bySerial);
  await prisma.$disconnect();
}
main();
