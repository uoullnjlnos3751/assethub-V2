import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const assets = await prisma.asset.findMany({
    where: {
      company: { contains: 'TRRT' },
      location: { contains: 'HQ' },
      departmentId: { contains: 'IT' },
      type: 'Computer',
      status: { not: 'Retired' }
    },
    select: {
      id: true,
      assetCode: true,
      company: true,
      location: true,
      departmentId: true,
      type: true,
      status: true
    }
  });

  console.log('Assets count:', assets.length);
  console.log('Assets:', assets);
  
  // Let's also check without type to see what we actually have
  const allAssets = await prisma.asset.findMany({
    where: {
      company: { contains: 'TRRT' },
      location: { contains: 'HQ' }
    },
    select: {
      id: true,
      assetCode: true,
      company: true,
      location: true,
      departmentId: true,
      type: true,
      status: true
    }
  });
  console.log('Total TRRT HQ assets:', allAssets.length);
  const types = await prisma.asset.groupBy({
    by: ['type'],
    where: {
      company: { contains: 'TRRT' },
      location: { contains: 'HQ' }
    },
    _count: true
  });
  console.log('Types in TRRT HQ:', types);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
