import express, { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// GET /notifications - Fetch user's notifications
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const notifications = await prisma.appNotification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20, // Only fetch latest 20
    });

    res.json(notifications);
  } catch (err) {
    next(err);
  }
});

// PUT /notifications/:id/read - Mark specific notification as read
router.put('/:id/read', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const notificationId = parseInt(req.params.id);

    const notification = await prisma.appNotification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return res.status(404).json({ message: 'ไม่พบการแจ้งเตือน' });
    }
    if (notification.userId !== userId) {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึง' });
    }

    await prisma.appNotification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    res.json({ message: 'อัปเดตสถานะการอ่านเรียบร้อยแล้ว' });
  } catch (err) {
    next(err);
  }
});

// PUT /notifications/read-all - Mark all notifications as read for current user
router.put('/read-all', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    await prisma.appNotification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    res.json({ message: 'อ่านทั้งหมดแล้ว' });
  } catch (err) {
    next(err);
  }
});

export default router;
