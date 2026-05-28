import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // 1. Check detail endpoint logic
  const asset = await prisma.asset.findFirst({
    where: { NOT: { purchaseDate: null } },
    include: {
      assetHistory: { orderBy: { createdAt: 'desc' }, take: 50 },
      pmRuns: { orderBy: { completedAt: 'desc' }, take: 20, include: { plan: true, performer: true } },
      category: true,
    },
  });

  if (asset) {
    const detail = null; // skip getAssetDetail
    const withAge = { ...asset, age: calculateAssetAge(asset.purchaseDate) };
    console.log('=== Detail API fields (simulated) ===');
    console.log('age:', withAge.age);
    console.log('purchaseDate:', asset.purchaseDate);
    console.log('warrantyEndDate:', asset.warrantyEndDate);
    console.log('purchasePrice:', asset.purchasePrice);
    console.log('warrantyDaysLeft (calculated):', asset.warrantyEndDate
      ? Math.max(0, Math.round((new Date(asset.warrantyEndDate).getTime() - Date.now()) / 86400000))
      : null);
  }

  // 2. List all assets - check warrantyDaysLeft
  const assets = await prisma.asset.findMany({
    take: 5,
    where: { NOT: { purchaseDate: null } },
  });
  console.log('\n=== List API - first 5 with purchaseDate ===');
  assets.forEach(a => {
    const age = calculateAssetAge(a.purchaseDate);
    const warrantyDaysLeft = a.warrantyEndDate
      ? Math.max(0, Math.round((new Date(a.warrantyEndDate).getTime() - Date.now()) / 86400000))
      : null;
    console.log(`  ${a.serialNo}: age=${age}, warranty=${warrantyDaysLeft}, purchaseDate=${a.purchaseDate}, warrantyEndDate=${a.warrantyEndDate}`);
  });

  // 3. Check if assets WITHOUT purchaseDate show null age
  const noPurchase = await prisma.asset.findFirst({ where: { purchaseDate: null } });
  if (noPurchase) {
    console.log(`\nAsset without purchaseDate: ${noPurchase.serialNo}, age calculated:`, calculateAssetAge(noPurchase.purchaseDate));
  }

  await prisma.$disconnect();
}

function calculateAssetAge(purchaseDate) {
  if (!purchaseDate) return null;
  const purchased = new Date(purchaseDate);
  if (Number.isNaN(purchased.getTime())) return null;
  const today = new Date();
  let years = today.getFullYear() - purchased.getFullYear();
  const monthDiff = today.getMonth() - purchased.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < purchased.getDate())) years -= 1;
  return Math.max(years, 0);
}

main().catch(console.error);
