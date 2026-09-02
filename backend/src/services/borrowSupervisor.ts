import { PrismaClient } from '@prisma/client';

/**
 * Promotes every BorrowRequestStatus.PendingSupervisor request under the
 * given requester ids straight to the IT-Admin queue — the same path a
 * request takes at creation time when the requester has no manager at all
 * (see routes/borrow.ts's create-request handler).
 *
 * Called whenever a requester's supervisor stops being able to act on their
 * queue: the manager relationship is cleared, the manager account is
 * deleted, or the manager account is deactivated. Without this, such a
 * request sits at PendingSupervisor forever — invisible to every approval
 * queue, since the supervisor-queue filters live off the requester's
 * *current* managerId and the IT-Admin queue only shows status:'Pending'.
 *
 * `actingUserId` is the SUPERADMIN performing the admin action that
 * triggered this (clearing/deleting/deactivating a manager) — attributed as
 * the BorrowApproval row's approver, since no human at the supervisor stage
 * actually made this call. `stage: 'Supervisor'` keeps it out of the
 * IT-Admin KPI queries, which filter on stage:'ITAdmin'.
 */
export async function promoteOrphanedSupervisorRequests(
  prisma: PrismaClient,
  requesterUserIds: number[],
  actingUserId: number,
  reasonNote: string,
): Promise<number> {
  if (requesterUserIds.length === 0) return 0;

  const stuck = await prisma.borrowRequest.findMany({
    where: { status: 'PendingSupervisor', requesterUserId: { in: requesterUserIds } },
    include: { requester: true },
  });
  if (stuck.length === 0) return 0;

  for (const request of stuck) {
    await prisma.$transaction(async (tx) => {
      await tx.borrowApproval.create({
        data: { requestId: request.id, approverUserId: actingUserId, action: 'Approved', note: reasonNote, stage: 'Supervisor' },
      });
      await tx.borrowRequest.update({ where: { id: request.id }, data: { status: 'Pending' } });
    });

    await prisma.appNotification.create({
      data: {
        userId: request.requesterUserId,
        title: 'คำขอยืมถูกส่งต่อให้ IT Admin โดยอัตโนมัติ',
        message: `คำขอยืมเลขที่ ${request.requestNo} ถูกส่งต่อให้ IT Admin พิจารณาโดยตรง — ${reasonNote}`,
        type: 'BORROW',
        link: '/borrow/my-requests',
      },
    });

    const admins = await prisma.appUser.findMany({ where: { role: { in: ['IT_ADMIN', 'SUPERADMIN'] } } });
    if (admins.length > 0) {
      await prisma.appNotification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          title: 'คำขอยืม (ข้ามขั้นหัวหน้างานอัตโนมัติ)',
          message: `คำขอยืมเลขที่ ${request.requestNo} จาก ${request.requester.displayName || request.requester.adUsername} ถูกส่งตรงมาที่คิวนี้ — ${reasonNote}`,
          type: 'BORROW',
          link: '/borrow/approval-queue',
        })),
      });
    }
  }

  return stuck.length;
}
