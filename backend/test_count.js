const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const c = await prisma.asset.count();
  const max = await prisma.asset.findFirst({orderBy: {id: 'desc'}});
  console.log('Count:', c, 'Max ID:', max ? max.id : null);
  await prisma.$disconnect();
}
main();
