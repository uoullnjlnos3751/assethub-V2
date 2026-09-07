/**
 * Route ของแดชบอร์ด
 *
 * ตรรกะทั้งหมดอยู่ใน services/dashboardData.ts — ที่นี่เหลือแค่การผูก URL,
 * สิทธิ์ และการอ่าน query string
 *
 * endpoint รายก้อนยังอยู่ครบเพราะหน้าอื่นเรียกใช้จริง (Layout ดึง pm-summary,
 * หน้ารายงานทรัพย์สิน/ยืม-คืน/PM และแท็บบันทึกกิจกรรมดึงของตัวเอง) ส่วน
 * /overview เป็นทางลัดสำหรับหน้าแดชบอร์ดที่ต้องใช้ทุกก้อนพร้อมกัน
 */
import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import * as D from '../services/dashboardData';
import { getMetricHistory } from '../services/dashboardHistory';

const router = Router();

/** ทุก endpoint ของแดชบอร์ดเปิดให้สามบทบาทนี้เท่ากันหมด */
const guard = [authenticate, authorize('IT_ADMIN', 'SUPERADMIN', 'VIEWER')] as const;

const send = (fn: (req: Request) => Promise<unknown>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try { res.json(await fn(req)); } catch (err) { next(err); }
  };

const yearOf = (req: Request) => parseInt(req.query.year as string) || new Date().getFullYear();
const companyOf = (req: Request) => (req.query.company as string) || undefined;

/**
 * ทุกก้อนในคำขอเดียว
 *
 * หน้าแดชบอร์ดเคยยิง 13 คำขอแล้วรอให้ครบก่อนวาด วัดได้ 25 วินาที ตอนนี้ทุก
 * query วิ่งพร้อมกันในคำขอเดียว เวลารวมจึงเท่ากับก้อนที่ช้าที่สุด
 */
router.get('/overview', ...guard, send(req => D.dashboardOverview(prisma, {
  year: yearOf(req),
  warrantyDays: parseInt(req.query.warrantyDays as string) || 60,
  company: companyOf(req),
})));

/** Trend chart data — see DailyMetricSnapshot / dashboardHistory.ts. */
router.get('/history', ...guard, send(req => getMetricHistory(prisma, parseInt(req.query.days as string) || 90)));

/** One level of the company → location → floor drill-down per click. */
router.get('/location-breakdown', ...guard, send(req => D.locationBreakdown(prisma, {
  company: companyOf(req),
  location: (req.query.location as string) || undefined,
})));

router.get('/asset-summary', ...guard, send(() => D.assetSummary(prisma)));
router.get('/module-status', ...guard, send(() => D.moduleStatus(prisma)));
router.get('/category-utilization', ...guard, send(() => D.categoryUtilization(prisma)));
router.get('/inventory-low-stock', ...guard, send(() => D.inventoryLowStock(prisma)));
router.get('/data-health', ...guard, send(() => D.dataHealth(prisma)));
router.get('/borrow-summary', ...guard, send(() => D.borrowSummary(prisma)));
router.get('/borrow-trend', ...guard, send(req => D.borrowTrend(prisma, yearOf(req))));
router.get('/pm-summary', ...guard, send(req => D.pmSummary(prisma, yearOf(req))));
router.get('/external-agents-summary', ...guard, send(() => D.externalAgentsSummary()));
router.get('/recent-activity', ...guard, send(() => D.recentActivity(prisma)));
router.get('/proactive-alerts', ...guard, send(() => D.proactiveAlerts(prisma)));
router.get('/warranty-expiring', ...guard,
  send(req => D.warrantyExpiring(prisma, parseInt(req.query.days as string) || 30)));

export default router;
