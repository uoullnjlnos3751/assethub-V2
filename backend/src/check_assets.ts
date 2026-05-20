import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const assets = await prisma.asset.findMany({
    include: { category: true }
  });

  console.log(`Total assets in DB: ${assets.length}`);

  const counts: Record<string, number> = {};
  const sampleByType: Record<string, any[]> = {};

  for (const asset of assets) {
    const catName = asset.category?.name || 'No Category';
    const type = asset.type || 'No Type';
    const key = `${catName} | ${type}`;
    counts[key] = (counts[key] || 0) + 1;

    // Check if isComputer would be true
    const t = type.toLowerCase().trim();
    const isComputer = catName === 'คอมพิวเตอร์' || (catName === 'No Category' && (t === 'pc' || ['notebook', 'pc desktop', 'macbook', 'mini pc', 'all-in-one', 'thin client', 'computer'].some(k => t.includes(k))));

    if (isComputer && catName !== 'คอมพิวเตอร์') {
      if (!sampleByType[type]) sampleByType[type] = [];
      if (sampleByType[type].length < 3) {
        sampleByType[type].push({
          id: asset.id,
          assetCode: asset.assetCode,
          serialNo: asset.serialNo,
          catName,
        });
      }
    }
  }

  console.log('\n--- Grouped Counts (Category | Type) ---');
  for (const [key, count] of Object.entries(counts)) {
    console.log(`${key}: ${count}`);
  }

  console.log('\n--- Non-Computer Category Assets Matching isComputer logic ---');
  console.log(JSON.stringify(sampleByType, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
