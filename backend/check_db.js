const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const items = await prisma.pMTemplateItem.findMany();
  console.log(items.slice(0, 10));
}
main();
