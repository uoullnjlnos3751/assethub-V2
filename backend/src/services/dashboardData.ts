/**
 * ตัวคำนวณของแดชบอร์ด แยกออกจาก route
 *
 * เดิมตรรกะทุกก้อนฝังอยู่ใน handler ของตัวเอง หน้าแดชบอร์ดจึงต้องยิง 13 คำขอ
 * ไปยัง /dashboard/* แล้วรอให้ครบก่อนวาดอะไรได้เลย วัดจริงได้ 25 วินาที
 *
 * แต่ละก้อนอยู่ในฟังก์ชันของตัวเอง route เดิมเรียกฟังก์ชันเดียวกันนี้ และ
 * /overview เรียกทั้งหมดพร้อมกันใน Promise.all เดียว เวลารวมจึงเท่ากับก้อนที่
 * ช้าที่สุด (~1.5 วิ) แทนที่จะเป็นผลบวกของทุกก้อน
 *
 * ที่ต้องเป็นฟังก์ชันร่วมไม่ใช่ก๊อปโค้ด เพราะ endpoint เดิมยังมีคนใช้อยู่จริง —
 * Layout ดึง pmSummary, หน้ารายงานทรัพย์สิน/ยืม-คืน/PM และแท็บบันทึกกิจกรรม
 * ก็ดึงของตัวเอง การแยกก๊อปจะทำให้สองทางเพี้ยนจากกันเมื่อแก้ข้างเดียว
 */
import type { PrismaClient } from '@prisma/client';
import { enabledHolders } from '../config/custodyHolders';

export async function assetSummary(prisma: PrismaClient) {
  const [byStatus, byDepartment, byCompany, byType, byLocation, total, byCategory, costAgg] = await Promise.all([
    prisma.asset.groupBy({ by: ['status'], _count: true }),
    prisma.asset.groupBy({ by: ['departmentId'], _count: true }),
    prisma.asset.groupBy({ by: ['company'], _count: true }),
    prisma.asset.groupBy({ by: ['type'], _count: true }),
    prisma.asset.groupBy({ by: ['location'], _count: true }),
    prisma.asset.count(),
    prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, name: true, icon: true, _count: { select: { assets: true } } },
      orderBy: { sortOrder: 'asc' },
    }),
    // Total acquisition cost — a real, simple sum. Not a depreciated "book
    // value" (that needs a depreciation policy — useful-life years per
    // category, salvage value — which nothing in this system defines yet).
    prisma.asset.aggregate({ _sum: { purchasePrice: true } }),
  ]);
  return {
    total, byStatus, byDepartment, byCompany, byType, byLocation,
    byCategory: byCategory.map(c => ({ id: c.id, name: c.name, icon: c.icon, assetCount: c._count.assets })),
    totalPurchaseCost: costAgg._sum.purchasePrice || 0,
  };
}

export async function moduleStatus(prisma: PrismaClient) {
  const now = new Date();
  const [totalAssets, missingSerial, missingLocation, overdueItems, pmTotal, pmDone, notifSent, notifTotal] =
    await Promise.all([
      prisma.asset.count(),
      prisma.asset.count({ where: { OR: [{ serialNo: '' }, { serialNo: '-' }] } }),
      prisma.asset.count({ where: { OR: [{ location: null }, { location: '' }, { location: '-' }] } }),
      prisma.borrowRequestItem.count({ where: { itemStatus: 'CheckedOut', dueDate: { lt: now } } }),
      prisma.pMRun.count({ where: { year: now.getFullYear() } }),
      prisma.pMRun.count({ where: { year: now.getFullYear(), status: 'COMPLETED' } }),
      prisma.notificationOutbox.count({ where: { status: 'SENT' } }),
      prisma.notificationOutbox.count(),
    ]);
  const dataHealthPct = totalAssets > 0
    ? Math.round(((totalAssets * 2 - missingSerial - missingLocation) / (totalAssets * 2)) * 1000) / 10
    : 100;
  return {
    assetRegistry: { healthPct: dataHealthPct },
    borrow: { overdueItems },
    pm: { total: pmTotal, done: pmDone, pct: pmTotal > 0 ? Math.round((pmDone / pmTotal) * 1000) / 10 : 0 },
    notifications: {
      sent: notifSent, total: notifTotal,
      successPct: notifTotal > 0 ? Math.round((notifSent / notifTotal) * 1000) / 10 : 100,
    },
  };
}

/** หมวดที่มีของมากที่สุด 5 อันดับ พร้อมสัดส่วนที่ถูกใช้งานอยู่ */
export async function categoryUtilization(prisma: PrismaClient) {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    select: { id: true, name: true, icon: true, assets: { select: { status: true } } },
  });
  return categories
    .map(c => {
      const total = c.assets.length;
      const inUse = c.assets.filter(a => a.status === 'InUse' || a.status === 'Borrowed').length;
      return {
        id: c.id, name: c.name, icon: c.icon, total,
        utilizationPct: total > 0 ? Math.round((inUse / total) * 1000) / 10 : 0,
      };
    })
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
}

export async function inventoryLowStock(prisma: PrismaClient) {
  // Prisma's query builder can't compare two columns of the same row
  // directly in `where`, so pull the two small fields and compare in JS.
  const [items, totalQty] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: { isActive: true },
      select: { availableQuantity: true, minStockLevel: true },
    }),
    prisma.inventoryItem.aggregate({ where: { isActive: true }, _sum: { totalQuantity: true } }),
  ]);
  return {
    lowStockCount: items.filter(i => i.availableQuantity <= i.minStockLevel).length,
    totalQuantity: totalQty._sum.totalQuantity || 0,
  };
}

export async function dataHealth(prisma: PrismaClient) {
  const [missingSerial, missingLocation, missingCompany, missingType, outdatedOSCount] = await Promise.all([
    prisma.asset.count({ where: { OR: [{ serialNo: '' }, { serialNo: '-' }] } }),
    prisma.asset.count({ where: { OR: [{ location: null }, { location: '' }, { location: '-' }] } }),
    prisma.asset.count({ where: { OR: [{ company: null }, { company: '' }, { company: '-' }] } }),
    prisma.asset.count({ where: { OR: [{ type: null }, { type: '' }] } }),
    prisma.asset.count({
      where: {
        computerDetail: {
          OR: [
            { osVersion: { contains: 'Windows 7', mode: 'insensitive' } },
            { osVersion: { contains: 'Windows 8', mode: 'insensitive' } },
            { osVersion: { contains: 'Windows 10', mode: 'insensitive' } },
          ],
        },
      },
    }),
  ]);
  return { missingSerial, missingLocation, missingCompany, missingType, outdatedOSCount };
}

export async function borrowSummary(prisma: PrismaClient) {
  const [byStatus, total, overdue, activeItems, pendingApproval] = await Promise.all([
    prisma.borrowRequest.groupBy({ by: ['status'], _count: true }),
    prisma.borrowRequest.count(),
    prisma.borrowRequestItem.count({ where: { itemStatus: 'CheckedOut', dueDate: { lt: new Date() } } }),
    prisma.borrowRequestItem.count({ where: { itemStatus: { in: ['CheckedOut', 'PartiallyReturned'] } } }),
    prisma.borrowRequest.count({ where: { status: 'Pending' } }),
  ]);
  return { total, byStatus, overdue, activeItems, pendingApproval };
}

export async function borrowTrend(prisma: PrismaClient, year: number) {
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  const requests = await prisma.borrowRequest.findMany({
    where: { createdAt: { gte: start, lt: end } },
    select: { createdAt: true, status: true },
  });
  const monthly: Record<string, { month: string; requests: number; approved: number; returned: number }> = {};
  for (let m = 0; m < 12; m++) {
    const key = `${year}-${String(m + 1).padStart(2, '0')}`;
    monthly[key] = { month: key, requests: 0, approved: 0, returned: 0 };
  }
  for (const r of requests) {
    const key = `${r.createdAt.getFullYear()}-${String(r.createdAt.getMonth() + 1).padStart(2, '0')}`;
    if (monthly[key]) {
      monthly[key].requests++;
      if (r.status === 'Approved' || r.status === 'CheckedOut' || r.status === 'Returned') monthly[key].approved++;
      if (r.status === 'Returned') monthly[key].returned++;
    }
  }
  return { year, months: Object.values(monthly) };
}

export async function pmSummary(prisma: PrismaClient, year: number) {
  const [runs, plans] = await Promise.all([
    prisma.pMRun.findMany({
      where: { year },
      include: {
        plan: true,
        asset: { select: { category: { select: { id: true, name: true, icon: true } }, departmentId: true } },
      },
    }),
    prisma.pMPlan.findMany({ where: { year } }),
  ]);
  const completed = runs.filter(r => r.status === 'COMPLETED').length;
  const total = runs.length;
  const overdue = runs.filter(r => r.status !== 'COMPLETED' && r.plan.endDate && new Date(r.plan.endDate) < new Date()).length;
  const plannedTotal = plans.reduce((s, p) => s + p.plannedDeviceCount, 0);
  // Category & department breakdown via PMRun → asset (reuses `runs` above, no second query)
  const catBreakdown: Record<string, { name: string; icon: string; total: number; completed: number }> = {};
  const deptBreakdown: Record<string, { name: string; total: number; completed: number }> = {};
  for (const run of runs) {
    const cat = run.asset?.category;
    const catKey = cat?.name || 'อื่นๆ';
    if (!catBreakdown[catKey]) catBreakdown[catKey] = { name: catKey, icon: cat?.icon || '📦', total: 0, completed: 0 };
    catBreakdown[catKey].total += run.plan.plannedDeviceCount;
    if (run.status === 'COMPLETED') catBreakdown[catKey].completed += run.plan.plannedDeviceCount;

    const deptKey = `แผนก${run.asset?.departmentId || 'อื่นๆ'}`;
    if (!deptBreakdown[deptKey]) deptBreakdown[deptKey] = { name: deptKey, total: 0, completed: 0 };
    deptBreakdown[deptKey].total += run.plan.plannedDeviceCount;
    if (run.status === 'COMPLETED') deptBreakdown[deptKey].completed += run.plan.plannedDeviceCount;
  }
  return {
    planned: plannedTotal, total, completed, remaining: total - completed, overdue,
    byCategory: Object.values(catBreakdown),
    byDepartment: Object.values(deptBreakdown),
  };
}

/** สรุปจาก Agent — เป็นบริการภายนอก ล่มได้ จึงคืน available:false แทนการโยน error */
export async function externalAgentsSummary() {
  const baseUrl = process.env.EXTERNAL_ASSET_API_URL;
  const apiKey = process.env.EXTERNAL_ASSET_API_KEY;
  if (!baseUrl || !apiKey) return { available: false as const };
  try {
    const response = await fetch(`${baseUrl}/api/external/summary`, {
      headers: { 'x-api-key': apiKey },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return { available: false as const };
    return { available: true as const, data: await response.json() };
  } catch {
    return { available: false as const };
  }
}

export async function custodySummary(prisma: PrismaClient) {
  const grouped = await prisma.asset.groupBy({
    by: ['custodyHolder'],
    where: { custodyHolder: { not: null } },
    _count: { _all: true },
  });
  const counts = new Map(grouped.map(g => [g.custodyHolder, g._count._all]));
  return {
    data: enabledHolders().map(h => ({ code: h.code, label: h.label, count: counts.get(h.code) || 0 })),
    total: grouped.reduce((sum, g) => sum + g._count._all, 0),
  };
}

export async function recentActivity(prisma: PrismaClient) {
  const [recentRequests, recentReturns] = await Promise.all([
    prisma.borrowRequest.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { requester: { select: { displayName: true } } },
    }),
    prisma.return.findMany({
      take: 10,
      orderBy: { returnedAt: 'desc' },
      include: { requestItem: { include: { asset: true } }, returner: { select: { displayName: true } } },
    }),
  ]);
  return { recentRequests, recentReturns };
}

export async function proactiveAlerts(prisma: PrismaClient) {
  const now = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(now.getDate() + 7);
  const [overdueItems, pendingApprovals, upcomingPMs] = await Promise.all([
    prisma.borrowRequestItem.count({ where: { itemStatus: 'CheckedOut', dueDate: { lt: now } } }),
    prisma.borrowRequest.count({ where: { status: 'Pending' } }),
    prisma.pMRun.count({
      where: { status: { not: 'COMPLETED' }, plan: { endDate: { gte: now, lte: nextWeek } } },
    }),
  ]);
  return { overdueItems, pendingApprovals, upcomingPMs };
}

export async function warrantyExpiring(prisma: PrismaClient, days: number) {
  const now = new Date();
  const future = new Date();
  future.setDate(now.getDate() + days);
  const [expiring, expiredCount] = await Promise.all([
    prisma.asset.findMany({
      where: { warrantyEndDate: { gte: now, lte: future }, status: { not: 'Retired' } },
      select: {
        id: true, assetCode: true, brand: true, model: true,
        warrantyEndDate: true, status: true,
        category: { select: { name: true, icon: true } },
      },
      orderBy: { warrantyEndDate: 'asc' },
      take: 20,
    }),
    prisma.asset.count({ where: { warrantyEndDate: { lt: now }, status: { not: 'Retired' } } }),
  ]);
  return {
    expiring: expiring.map(a => ({
      ...a,
      daysLeft: Math.ceil((new Date(a.warrantyEndDate!).getTime() - now.getTime()) / 86_400_000),
    })),
    expiredCount,
    days,
  };
}

/**
 * ทุกก้อนในคำขอเดียว
 *
 * ก้อนที่ล้มไม่ควรลากทั้งแดชบอร์ดลงไปด้วย — Agent เป็นบริการภายนอกที่ล่มได้
 * และ warranty เคยตอบ 404 ตอนยังไม่ deploy ทั้งคู่จึงถูกห่อด้วย settle()
 * ที่คืน null แทนการโยน ฝั่งหน้าจอเช็ค null อยู่แล้วเพราะเดิมก็ .catch() ทิ้ง
 */
async function settle<T>(p: Promise<T>): Promise<T | null> {
  try { return await p; } catch { return null; }
}

export async function dashboardOverview(prisma: PrismaClient, opts: { year: number; warrantyDays: number }) {
  const [
    assets, modules, categories, inventory, health, borrow, trend,
    pm, agents, custody, activity, alerts, warranty,
  ] = await Promise.all([
    settle(assetSummary(prisma)),
    settle(moduleStatus(prisma)),
    settle(categoryUtilization(prisma)),
    settle(inventoryLowStock(prisma)),
    settle(dataHealth(prisma)),
    settle(borrowSummary(prisma)),
    settle(borrowTrend(prisma, opts.year)),
    settle(pmSummary(prisma, opts.year)),
    settle(externalAgentsSummary()),
    settle(custodySummary(prisma)),
    settle(recentActivity(prisma)),
    settle(proactiveAlerts(prisma)),
    settle(warrantyExpiring(prisma, opts.warrantyDays)),
  ]);
  return {
    generatedAt: new Date().toISOString(),
    year: opts.year,
    assets, modules, categories, inventory, health, borrow, trend,
    pm, agents, custody, activity, alerts, warranty,
  };
}
