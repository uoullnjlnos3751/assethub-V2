import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const ipads = await prisma.asset.findMany({
    where: { type: 'IPAD Air' }
  });

  console.log(JSON.stringify(ipads, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
