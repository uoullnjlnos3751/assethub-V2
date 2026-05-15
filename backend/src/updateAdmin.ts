import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const username = 'watchara.kid';
  const user = await prisma.appUser.findUnique({
    where: { adUsername: username }
  });

  if (user) {
    await prisma.appUser.update({
      where: { id: user.id },
      data: { role: 'SUPERADMIN' }
    });
    console.log(`User ${username} updated to SUPERADMIN`);
  } else {
    await prisma.appUser.create({
      data: {
        adUsername: username,
        displayName: 'Watchara Kid',
        email: 'watchara.kid@trrgroup.com',
        role: 'SUPERADMIN',
        isActive: true
      }
    });
    console.log(`User ${username} created as SUPERADMIN`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
