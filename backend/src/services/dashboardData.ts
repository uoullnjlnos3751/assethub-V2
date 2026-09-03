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
import { buildProcurementReport } from './pmProcurement';

export async function assetSummary(prisma: PrismaClient, company?: string) {
  const where = company ? { company } : {};
  const [byStatus, byDepartment, byCompany, byType, byLocation, total, byCategory, costAgg] = await Promise.all([
    prisma.asset.groupBy({ where, by: ['status'], _count: true }),
    prisma.asset.groupBy({ where, by: ['departmentId'], _count: true }),
    prisma.asset.groupBy({ where, by: ['company'], _count: true }),
    prisma.asset.groupBy({ where, by: ['type'], _count: true }),
    prisma.asset.groupBy({ where, by: ['location'], _count: true }),
    prisma.asset.count({ where }),
    prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, name: true, icon: true, _count: { select: { assets: { where } } } },
      orderBy: { sortOrder: 'asc' },
    }),
    // Total acquisition cost — a real, simple sum. Not a depreciated "book
    // value" (that needs a depreciation policy — useful-life years per
    // category, salvage value — which nothing in this system defines yet).
    prisma.asset.aggregate({ where, _sum: { purchasePrice: true } }),
  ]);
  return {
    total, byStatus, byDepartment, byCompany, byType, byLocation,
    byCategory: byCategory.map(c => ({ id: c.id, name: c.name, icon: c.icon, assetCount: c._count.assets })),
    totalPurchaseCost: costAgg._sum.purchasePrice || 0,
  };
}

/**
 * `company` narrows everything genuinely asset-scoped (registry health, PM).
 * Borrow overdue count and notification success rate stay unfiltered on
 * purpose — a BorrowRequestItem has no company of its own (it links through
 * an asset, and the notification outbox isn't asset-scoped at all), so
 * "filtering" those would mean silently dropping rows rather than actually
 * narrowing by company. Left as fleet-wide numbers instead of faking a scope
 * they don't have.
 */
export async function moduleStatus(prisma: PrismaClient, company?: string) {
  const now = new Date();
  const assetWhere = company ? { company } : {};
  const [totalAssets, missingSerial, missingLocation, overdueItems, pmTotal, pmDone, notifSent, notifTotal] =
    await Promise.all([
      prisma.asset.count({ where: assetWhere }),
      prisma.asset.count({ where: { ...assetWhere, OR: [{ serialNo: '' }, { serialNo: '-' }] } }),
      prisma.asset.count({ where: { ...assetWhere, OR: [{ location: null }, { location: '' }, { location: '-' }] } }),
      prisma.borrowRequestItem.count({ where: { itemStatus: 'CheckedOut', dueDate: { lt: now } } }),
      prisma.pMRun.count({ where: { year: now.getFullYear(), ...(company ? { asset: { company } } : {}) } }),
      prisma.pMRun.count({ where: { year: now.getFullYear(), status: 'COMPLETED', ...(company ? { asset: { company } } : {}) } }),
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
export async function categoryUtilization(prisma: PrismaClient, company?: string) {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    select: { id: true, name: true, icon: true, assets: { where: company ? { company } : undefined, select: { status: true } } },
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

export async function dataHealth(prisma: PrismaClient, company?: string) {
  const base = company ? { company } : {};
  const [missingSerial, missingLocation, missingCompany, missingType, outdatedOSCount] = await Promise.all([
    prisma.asset.count({ where: { ...base, OR: [{ serialNo: '' }, { serialNo: '-' }] } }),
    prisma.asset.count({ where: { ...base, OR: [{ location: null }, { location: '' }, { location: '-' }] } }),
    prisma.asset.count({ where: { ...base, OR: [{ company: null }, { company: '' }, { company: '-' }] } }),
    prisma.asset.count({ where: { ...base, OR: [{ type: null }, { type: '' }] } }),
    prisma.asset.count({
      where: {
        ...base,
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
  /* วันหมดประกันที่ยังว่าง — ช่องนี้เป็นเหตุผลเดียวที่การ์ด "ใกล้หมดประกัน" ว่าง
     เปล่ามาตลอด ไม่ใช่เพราะฟีเจอร์พัง นับเฉพาะเครื่องที่ยังไม่ปลดระวาง */
  const [missingWarranty, activeTotal] = await Promise.all([
    prisma.asset.count({ where: { ...base, warrantyEndDate: null, NOT: { status: 'Retired' } } }),
    prisma.asset.count({ where: { ...base, NOT: { status: 'Retired' } } }),
  ]);
  return {
    missingSerial, missingLocation, missingCompany, missingType, outdatedOSCount,
    missingWarranty, activeTotal,
  };
}

export async function borrowSummary(prisma: PrismaClient) {
  const [byStatus, total, overdue, activeItems, pendingApproval] = await Promise.all([
    prisma.borrowRequest.groupBy({ by: ['status'], _count: true }),
    prisma.borrowRequest.count(),
    prisma.borrowRequestItem.count({ where: { itemStatus: 'CheckedOut', dueDate: { lt: new Date() } } }),
    prisma.borrowRequestItem.count({ where: { itemStatus: { in: ['CheckedOut', 'PartiallyReturned'] } } }),
    // ทั้ง Pending (รอ IT Admin) และ PendingSupervisor (รอหัวหน้างาน) คือคำขอที่
    // "ยังรออนุมัติอยู่" — นับแค่ Pending ตัวเดียวทำให้คำขอที่ค้างอยู่ที่หัวหน้างาน
    // หายไปจากตัวเลขนี้ทั้งที่ยังไม่จบขั้นตอน
    prisma.borrowRequest.count({ where: { status: { in: ['Pending', 'PendingSupervisor'] } } }),
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

export async function pmSummary(prisma: PrismaClient, year: number, company?: string) {
  const [runs, plans] = await Promise.all([
    prisma.pMRun.findMany({
      where: { year, ...(company ? { asset: { company } } : {}) },
      include: {
        plan: true,
        asset: { select: { category: { select: { id: true, name: true, icon: true } }, departmentId: true } },
      },
    }),
    // PMPlan มีแต่ site/deptTask/company ที่เป็น free text ไม่ผูกกับ Asset.company
    // ตรง ๆ — ตัวรวม plannedTotal จึงยังเป็นทั้งปีเสมอ ไม่กรองตามบริษัทที่เลือก
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
    prisma.borrowRequest.count({ where: { status: { in: ['Pending', 'PendingSupervisor'] } } }),
    prisma.pMRun.count({
      where: { status: { not: 'COMPLETED' }, plan: { endDate: { gte: now, lte: nextWeek } } },
    }),
  ]);
  return { overdueItems, pendingApprovals, upcomingPMs };
}

export async function warrantyExpiring(prisma: PrismaClient, days: number, company?: string) {
  const now = new Date();
  const future = new Date();
  future.setDate(now.getDate() + days);
  const base = company ? { company } : {};
  const [expiring, expiredCount] = await Promise.all([
    prisma.asset.findMany({
      where: { ...base, warrantyEndDate: { gte: now, lte: future }, status: { not: 'Retired' } },
      select: {
        id: true, assetCode: true, brand: true, model: true,
        warrantyEndDate: true, status: true,
        category: { select: { name: true, icon: true } },
      },
      orderBy: { warrantyEndDate: 'asc' },
      take: 20,
    }),
    prisma.asset.count({ where: { ...base, warrantyEndDate: { lt: now }, status: { not: 'Retired' } } }),
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
 * ทรัพย์สินอยู่ช่วงไหนของวงจรชีวิตบ้าง
 *
 * ระบบจัดตาม "โมดูล" มาตลอด ทำให้โมดูลที่ยังไม่มีข้อมูลดูเหมือนเมนูที่ไม่มีใครใช้
 * พอเรียงเป็นวงจรชีวิตแทน ช่วงที่ว่างจะกลายเป็นข้อเท็จจริงที่ใช้ตัดสินใจได้ —
 * "ยังไม่เริ่มบันทึกช่วงนี้" ต่างจาก "ช่วงนี้ไม่มีปัญหา" คนละเรื่องกัน
 */
/**
 * DeliveryRequest has no company column of its own (it's a delivery/pickup
 * event, not scoped to one), so that stage stays fleet-wide even when a
 * company filter is active — same reasoning as the borrow/notification
 * numbers in moduleStatus above.
 */
export async function lifecycle(prisma: PrismaClient, company?: string) {
  const now = new Date();
  const year = now.getFullYear();
  const assetWhere = company ? { company } : {};
  const [
    deliveryTotal, deliveryOpen,
    inUse, available,
    pmTotal, pmDone, maintenanceOpen,
    retired, disposed,
  ] = await Promise.all([
    prisma.deliveryRequest.count(),
    // ยังไม่ถึงมือผู้ใช้ = ยังไม่ CONFIRMED (ผู้รับยืนยันแล้ว) และไม่ใช่สายคืนของ
    prisma.deliveryRequest.count({
      where: { status: { notIn: ['CONFIRMED', 'RETURNED'] } },
    }),
    prisma.asset.count({ where: { ...assetWhere, status: 'InUse' } }),
    prisma.asset.count({ where: { ...assetWhere, status: 'Available' } }),
    prisma.pMRun.count({ where: { year, ...(company ? { asset: { company } } : {}) } }),
    prisma.pMRun.count({ where: { year, status: 'COMPLETED', ...(company ? { asset: { company } } : {}) } }),
    prisma.asset.count({ where: { ...assetWhere, status: 'Maintenance' } }),
    prisma.asset.count({ where: { ...assetWhere, status: 'Retired' } }),
    prisma.assetDisposal.count({ where: company ? { asset: { company } } : {} }),
  ]);

  return [
    {
      key: 'deliver', label: 'จัดหา & ส่งมอบ', value: deliveryTotal,
      detail: deliveryOpen > 0 ? `ค้างอยู่ ${deliveryOpen} รายการ` : 'ยังไม่มีการบันทึกการส่งมอบ',
      started: deliveryTotal > 0, href: '/deliveries',
    },
    {
      key: 'inuse', label: 'ใช้งานอยู่', value: inUse,
      detail: `พร้อมจ่ายอีก ${available} เครื่อง`,
      started: true, href: '/assets?status=InUse',
    },
    {
      key: 'maintain', label: 'ดูแล & ซ่อมบำรุง', value: pmDone,
      detail: pmTotal > 0
        ? `PM ${pmDone}/${pmTotal} · ซ่อมอยู่ ${maintenanceOpen}`
        : 'ยังไม่มีแผน PM ปีนี้',
      started: pmTotal > 0, href: '/pm/runs',
    },
    {
      // เครื่องที่ว่างอยู่คือช่วง "เรียกคืนแล้วรอจ่ายต่อ" ของวงจรชีวิต
      key: 'recover', label: 'รอจ่ายต่อ', value: available,
      detail: available > 0 ? 'พร้อมจ่ายให้ผู้ใช้รายถัดไป' : 'ไม่มีเครื่องว่าง',
      started: available > 0, href: '/assets?status=Available',
    },
    {
      key: 'dispose', label: 'จำหน่ายออก', value: retired,
      detail: disposed > 0
        ? `บันทึกการจำหน่ายแล้ว ${disposed} รายการ`
        : `ปลดระวางแล้วแต่ยังไม่บันทึกการจำหน่ายสักรายการ`,
      started: disposed > 0, href: '/disposals',
    },
  ];
}

/**
 * ผลลัพธ์ที่เสนอไปแล้วปีนี้ — ตัวเลขที่ผู้บริหารสนใจ ไม่ใช่จำนวนทรัพย์สิน
 *
 * ใช้ตัวคำนวณเดียวกับเอกสารที่ยื่นหน่วยงาน (buildProcurementReport) — ตัวเลขบน
 * แดชบอร์ดกับในเอกสารจึงเถียงกันเองไม่ได้ ไม่ว่าจะกรองบริษัทหรือไม่ก็ตาม เพราะ
 * ทั้งสองทางเรียกฟังก์ชันเดียวกันด้วยค่า company เดียวกัน
 */
export async function procurementOutcome(prisma: PrismaClient, year: number, company?: string) {
  const r = await buildProcurementReport(prisma, company || null, year);
  return {
    addRam: r.addRam.length,
    replaceBattery: r.replaceBattery.length,
    replaceMachine: r.replaceMachine.length,
    // เหตุผลที่ต้องโชว์: เสนอเพิ่ม RAM แทนเปลี่ยนเครื่องได้กี่เครื่อง คือส่วนที่
    // ประหยัดจริง และเป็นตัวเลขที่ไม่เคยขึ้นหน้าแรกมาก่อน
    savedByRamUpgrade: r.addRam.length,
    coverage: r.coverage,
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

export async function dashboardOverview(prisma: PrismaClient, opts: { year: number; warrantyDays: number; company?: string }) {
  const { company } = opts;
  const [
    assets, modules, categories, inventory, health, borrow, trend,
    pm, agents, activity, alerts, warranty, stages, outcome,
  ] = await Promise.all([
    settle(assetSummary(prisma, company)),
    settle(moduleStatus(prisma, company)),
    settle(categoryUtilization(prisma, company)),
    settle(inventoryLowStock(prisma)),
    settle(dataHealth(prisma, company)),
    settle(borrowSummary(prisma)),
    settle(borrowTrend(prisma, opts.year)),
    settle(pmSummary(prisma, opts.year, company)),
    settle(externalAgentsSummary()),
    settle(recentActivity(prisma)),
    settle(proactiveAlerts(prisma)),
    settle(warrantyExpiring(prisma, opts.warrantyDays, company)),
    settle(lifecycle(prisma, company)),
    settle(procurementOutcome(prisma, opts.year, company)),
  ]);
  return {
    generatedAt: new Date().toISOString(),
    year: opts.year,
    company: company || null,
    assets, modules, categories, inventory, health, borrow, trend,
    pm, agents, activity, alerts, warranty, stages, outcome,
  };
}

/**
 * ไล่ลึกทีละชั้น: บริษัท → สถานที่ → ชั้น — ให้ค่า `company`/`location` มา
 * เท่าไรก็ตอบชั้นถัดไปให้ ไม่ส่ง `company` มา = ตอบระดับบริษัท (บนสุด)
 *
 * ทำเป็น endpoint แยกจาก /overview เพราะ "ผู้ใช้กำลังไล่ดูอยู่ตรงไหน" เป็นสถานะ
 * ชั่วคราวของการ์ดเดียว ไม่ใช่ข้อมูลที่ต้องมากับก้อนใหญ่ทุกครั้ง
 */
export async function locationBreakdown(prisma: PrismaClient, opts: { company?: string; location?: string }) {
  const { company, location } = opts;
  const where: Record<string, string> = {};
  if (company) where.company = company;
  if (location) where.location = location;

  // ปกติไล่ company -> location -> floor ทีละชั้น แต่การ์ด "ตามสถานที่ตั้ง"
  // เดิมเริ่มที่ชั้น location อยู่แล้ว (ข้าม company) แล้วอยากไล่ลงชั้น floor
  // ต่อเลย — ให้ location อย่างเดียวก็กระโดดไป floor ได้ ไม่ต้องบังคับผ่าน company ก่อน
  const level: 'company' | 'location' | 'floor' = location ? 'floor' : company ? 'location' : 'company';
  const groupField = level === 'company' ? 'company' : level === 'location' ? 'location' : 'floor';

  const rows = await prisma.asset.groupBy({
    where,
    by: [groupField as 'company' | 'location' | 'floor'],
    _count: true,
  });

  return {
    level,
    company: company || null,
    location: location || null,
    rows: rows
      .map(r => ({ value: (r as any)[groupField] as string | null, count: r._count }))
      .filter(r => r.value)
      .sort((a, b) => b.count - a.count),
  };
}
