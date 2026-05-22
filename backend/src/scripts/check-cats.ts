import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  const cats = await p.category.findMany({ orderBy: { sortOrder: 'asc' } });
  for (const c of cats) {
    const cnt = await p.asset.count({ where: { categoryId: c.id } });
    console.log(c.icon, c.name, '->', cnt);
  }
  console.log('Total w/o cat:', await p.asset.count({ where: { categoryId: null } }));
  console.log('Total all:', await p.asset.count());
  await p.$disconnect();
}
main();
