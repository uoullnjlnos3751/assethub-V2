import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Querying PM Plans and Runs ---');
  const plans = await prisma.pMPlan.findMany({
    include: {
      _count: {
        select: {
          runs: true,
        }
      },
      runs: {
        select: {
          id: true,
          status: true,
        }
      }
    }
  });

  console.log(`Found ${plans.length} plans:`);
  for (const p of plans) {
    const totalRuns = p.runs.length;
    const completedRuns = p.runs.filter(r => r.status === 'COMPLETED').length;
    const draftRuns = p.runs.filter(r => r.status === 'DRAFT').length;
    
    console.log(`Plan ID: ${p.id}`);
    console.log(`  Year: ${p.year}`);
    console.log(`  Site: ${p.site || '(empty)'}`);
    console.log(`  DeptTask: ${p.deptTask || '(empty)'}`);
    console.log(`  Lead: ${p.lead || '(empty)'}`);
    console.log(`  Planned Count: ${p.plannedDeviceCount}`);
    console.log(`  Runs: Total=${totalRuns}, Draft=${draftRuns}, Completed=${completedRuns}`);
    
    // Check if there are answers referencing any of these runs
    const runIds = p.runs.map(r => r.id);
    if (runIds.length > 0) {
      const answerCount = await prisma.pMRunAnswer.count({
        where: { runId: { in: runIds } }
      });
      console.log(`  Answers referencing these runs: ${answerCount}`);
    }
    console.log('---------------------------------');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
