import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const planId = 2;
  console.log(`Trying to delete Plan ID: ${planId} directly via Prisma transaction...`);
  
  await prisma.$transaction(async (tx) => {
    const runs = await tx.pMRun.findMany({
      where: { planId },
      select: { id: true },
    });
    const runIds = runs.map(r => r.id);

    console.log(`Runs found to delete: ${runIds.length}`);
    if (runIds.length > 0) {
      await tx.pMRunAnswer.deleteMany({
        where: { runId: { in: runIds } },
      });
      await tx.pMRun.deleteMany({
        where: { planId },
      });
    }

    await tx.pMPlan.delete({
      where: { id: planId },
    });
  });

  console.log('Plan deleted successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
