const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.asset.findFirst({
    where: { serialNo: 'BRBFGG3' }
  });
  console.log('existing:', existing);
  await prisma.$disconnect();
}
main();
