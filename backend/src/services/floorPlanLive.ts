import type { PrismaClient } from '@prisma/client';

/**
 * แผนผังชั้นที่ประกอบขึ้นจากข้อมูลจริง ณ เวลาที่เปิดดู
 *
 * แบบเดิมปักหมุดทีละเครื่อง (floor_plan_pins ผูกกับ assetId) ซึ่งใช้งานจริงไม่ได้
 * ด้วยเหตุผลเชิงโครงสร้าง ไม่ใช่เพราะยังไม่มีใครกรอก:
 *
 *   ต้นทุนโตตามจำนวนอุปกรณ์ ไม่ใช่จำนวนที่นั่ง — ของที่ต้องปักมี 733 ชิ้น
 *   แต่คนมี 365 คน และ 313 คนมีคอมพิวเตอร์คนละเครื่องเดียว
 *
 *   แผนผังพังเองเมื่อเปลี่ยนเครื่อง — หมุดชี้ไปที่เครื่องเก่าที่ปลดไปแล้ว
 *   ต้องกลับมาแก้แผนผังทุกครั้งที่ส่งมอบเครื่องใหม่ ซึ่งไม่มีใครทำ
 *
 * ที่นี่กลับข้าง: ปักหมุดที่ "คน" แล้วอุปกรณ์ตามไปเองผ่าน ownerName ซึ่ง
 * คอมพิวเตอร์ 99% และจอ 91% มีค่านี้อยู่แล้ว การส่งมอบเครื่องใหม่จึงอัปเดต
 * แผนผังให้เองโดยไม่ต้องแตะแผนผัง
 *
 * ข้อยกเว้นคือเครื่องพิมพ์ — มี ownerName แค่ 5% เพราะเป็นของใช้ร่วมกันจริง ๆ
 * ตามคนไปไม่ได้ จึงยังปักตำแหน่งเองผ่าน floor_plan_pins เหมือนเดิม
 */

/** จัดกลุ่มชนิดอุปกรณ์ให้เหลือเท่าที่ต้องแยกไอคอนบนแผนผัง */
export type DeviceKind = 'notebook' | 'desktop' | 'monitor' | 'printer' | 'network' | 'other';

const KIND_BY_TYPE: Record<string, DeviceKind> = {
  'Notebook': 'notebook',
  'Macbook': 'notebook',
  'PC Desktop': 'desktop',
  'Server': 'desktop',
  'Monitor มาตรฐาน': 'monitor',
  'Laser Printer': 'printer',
  'Dot Matrix Printer': 'printer',
  'Firewall': 'network',
};

export function deviceKind(type: string | null | undefined): DeviceKind {
  return KIND_BY_TYPE[String(type ?? '').trim()] ?? 'other';
}

/** ชนิดที่ถือว่า "ตามคนไป" — ของใช้ร่วมกันไม่อยู่ในนี้ */
const FOLLOWS_PERSON: DeviceKind[] = ['notebook', 'desktop', 'monitor'];

export type PMStatus = 'COMPLETED' | 'IN_PROGRESS' | 'DRAFT' | 'OVERDUE' | 'NO_PM';

/**
 * เรียงจากแย่ไปดีสำหรับสรุปสถานะของที่นั่ง
 *
 * ที่นั่งหนึ่งมีหลายเครื่อง จึงต้องหยิบสถานะที่แย่ที่สุดมาแสดง ไม่งั้นเครื่องที่
 * เลยกำหนดจะถูกกลบด้วยเครื่องที่เสร็จแล้ว
 *
 * "ไม่มีแผน PM" อยู่แย่กว่า "เสร็จแล้ว" โดยตั้งใจ — จอที่ไม่เคยถูกใส่ในแผนเลยคือ
 * ช่องโหว่ของแผน ไม่ใช่งานที่ไม่ต้องทำ ที่นั่งจะขึ้นเขียวก็ต่อเมื่ออุปกรณ์ทุกชิ้น
 * บนโต๊ะนั้นทำ PM ครบจริง ๆ
 */
const SEAT_SEVERITY: PMStatus[] = ['OVERDUE', 'DRAFT', 'IN_PROGRESS', 'NO_PM', 'COMPLETED'];

/** เรียงจากยังไม่ได้ทำไปถึงทำเสร็จ ใช้เลือกรอบที่คืบหน้าที่สุดเมื่อเครื่องเดียว
 *  มีหลายรอบในปีเดียวกัน — คนละเรื่องกับความรุนแรงข้างบน */
const RUN_PROGRESS: PMStatus[] = ['NO_PM', 'OVERDUE', 'DRAFT', 'IN_PROGRESS', 'COMPLETED'];

function worst(list: PMStatus[]): PMStatus {
  for (const s of SEAT_SEVERITY) if (list.includes(s)) return s;
  return 'NO_PM';
}

export interface LiveDevice {
  assetId: number;
  assetName: string | null;
  assetCode: string | null;
  type: string | null;
  kind: DeviceKind;
  pmStatus: PMStatus;
  pmDate: string | null;
  /** จอ/เครื่องพิมพ์ที่ผูกกับคอมพิวเตอร์เครื่องนี้ตอนทำ PM */
  viaLink: boolean;
}

export interface LiveSeat {
  id: number;
  x: number;
  y: number;
  label: string | null;
  ownerName: string | null;
  departmentId: string | null;
  note: string | null;
  devices: LiveDevice[];
  status: PMStatus;
  /** ชื่อผู้ครอบครองที่ผูกกับเครื่องจำนวนมากผิดปกติ มักเป็นป้ายจุดเก็บ ไม่ใช่คน */
  looksLikeStorage: boolean;
}

export interface LiveSpot {
  id: number;
  x: number;
  y: number;
  label: string | null;
  assetId: number;
  assetName: string | null;
  assetCode: string | null;
  type: string | null;
  kind: DeviceKind;
  ownerName: string | null;
  departmentId: string | null;
  pmStatus: PMStatus;
  pmDate: string | null;
}

export interface LiveFloorPlan {
  plan: { id: number; name: string; floor: string; building: string | null; company: string | null; imageUrl: string };
  year: number;
  seats: LiveSeat[];
  spots: LiveSpot[];
  summary: {
    seats: number;
    seatsDone: number;
    seatsUnplaced: number;
    devices: number;
    devicesDone: number;
    spots: number;
    byKind: Record<string, number>;
  };
}

const norm = (v: any) => String(v ?? '').trim().toLowerCase();

/** เครื่องที่ผูกกับคนหนึ่งคนเกินจำนวนนี้ แทบจะไม่ใช่โต๊ะทำงานของคนคนเดียว
 *  ข้อมูลจริง: 313 คนมีเครื่องเดียว, 48 คนมีสองเครื่อง, ที่เหลือคือป้ายจุดเก็บ */
const STORAGE_HINT_DEVICES = 5;

/**
 * สถานะ PM ล่าสุดของแต่ละเครื่องในปีที่เลือก
 *
 * คำนวณฝั่ง server เพราะหน้าเดิมดึง PM run มาทั้งปี (limit 10000) มาไล่หาเองใน
 * เบราว์เซอร์ ทั้งที่ต้องการแค่สถานะของเครื่องที่อยู่บนแปลนนี้
 */
async function pmStatusByAsset(
  prisma: PrismaClient,
  assetIds: number[],
  year: number,
): Promise<Map<number, { status: PMStatus; date: string | null }>> {
  const out = new Map<number, { status: PMStatus; date: string | null }>();
  if (!assetIds.length) return out;

  const runs = await prisma.pMRun.findMany({
    where: { assetId: { in: assetIds }, year },
    select: {
      assetId: true, status: true, completedAt: true, performedAt: true, updatedAt: true,
      plan: { select: { endDate: true } },
    },
  });

  const now = Date.now();
  for (const r of runs) {
    if (!r.assetId) continue;
    let status = String(r.status ?? '') as PMStatus;
    // งานที่ยังไม่เสร็จและเลยวันสิ้นสุดแผนไปแล้ว ต้องเห็นว่าเลยกำหนด
    // ไม่ใช่ "รอทำ" ปนอยู่กับงานที่ยังมีเวลาเหลือ
    if (status !== 'COMPLETED' && r.plan?.endDate && new Date(r.plan.endDate).getTime() < now) {
      status = 'OVERDUE';
    }
    const date = r.completedAt ?? r.performedAt ?? r.updatedAt ?? null;
    const prev = out.get(r.assetId);
    // เครื่องหนึ่งอาจมีหลายรอบในปีเดียว เอารอบที่คืบหน้าที่สุด
    if (!prev || RUN_PROGRESS.indexOf(status) > RUN_PROGRESS.indexOf(prev.status)) {
      out.set(r.assetId, { status, date: date ? new Date(date).toISOString() : null });
    }
  }
  return out;
}

export async function buildLiveFloorPlan(
  prisma: PrismaClient,
  planId: number,
  year: number,
): Promise<LiveFloorPlan | null> {
  const plan = await prisma.floorPlan.findUnique({
    where: { id: planId },
    include: {
      seats: { orderBy: { id: 'asc' } },
      pins: {
        include: {
          asset: { select: { id: true, assetName: true, assetCode: true, type: true, ownerName: true, departmentId: true } },
        },
      },
    },
  });
  if (!plan) return null;

  const owners = plan.seats.map(s => s.ownerName).filter((o): o is string => !!o && !!o.trim());

  // ดึงอุปกรณ์ของคนที่นั่งอยู่บนแปลนนี้เท่านั้น ไม่ใช่ทั้งทะเบียน
  //
  // เทียบชื่อแบบไม่สนตัวพิมพ์ใหญ่เล็กและช่องว่างหัวท้าย เพราะ ownerName เป็นข้อความ
  // ที่คนพิมพ์เอง ("BENJAWAN KHAJORNSILP" กับ "Benjawan Khajornsilp" คือคนเดียวกัน)
  const ownedAssets = owners.length
    ? await prisma.asset.findMany({
        where: { ownerName: { in: owners, mode: 'insensitive' }, NOT: { status: 'Retired' } },
        select: { id: true, assetName: true, assetCode: true, type: true, ownerName: true, departmentId: true },
      })
    : [];

  const byOwner = new Map<string, typeof ownedAssets>();
  for (const a of ownedAssets) {
    const k = norm(a.ownerName);
    if (!byOwner.has(k)) byOwner.set(k, []);
    byOwner.get(k)!.push(a);
  }

  // จอ/เครื่องพิมพ์ที่ยืนยันตอนทำ PM ว่าต่ออยู่กับเครื่องไหน — ของพวกนี้อาจไม่มี
  // ownerName ของตัวเอง แต่ตามเครื่องแม่ไป ซึ่งตามคนไปอีกที
  const parentIds = ownedAssets.map(a => a.id);
  const links = parentIds.length
    ? await prisma.assetLink.findMany({
        where: { parentId: { in: parentIds } },
        select: {
          parentId: true,
          child: { select: { id: true, assetName: true, assetCode: true, type: true, status: true } },
        },
      })
    : [];
  const linkedByParent = new Map<number, typeof links>();
  for (const l of links) {
    if (!l.child || l.child.status === 'Retired') continue;
    if (!linkedByParent.has(l.parentId)) linkedByParent.set(l.parentId, []);
    linkedByParent.get(l.parentId)!.push(l);
  }

  const allIds = new Set<number>([
    ...ownedAssets.map(a => a.id),
    ...links.map(l => l.child?.id).filter((v): v is number => typeof v === 'number'),
    ...plan.pins.map(p => p.assetId),
  ]);
  const pm = await pmStatusByAsset(prisma, [...allIds], year);
  const statusOf = (id: number) => pm.get(id)?.status ?? 'NO_PM';
  const dateOf = (id: number) => pm.get(id)?.date ?? null;

  const seats: LiveSeat[] = plan.seats.map(s => {
    const own = byOwner.get(norm(s.ownerName)) ?? [];
    const devices: LiveDevice[] = [];
    const seen = new Set<number>();

    for (const a of own) {
      if (!FOLLOWS_PERSON.includes(deviceKind(a.type))) continue;
      seen.add(a.id);
      devices.push({
        assetId: a.id, assetName: a.assetName, assetCode: a.assetCode, type: a.type,
        kind: deviceKind(a.type), pmStatus: statusOf(a.id), pmDate: dateOf(a.id), viaLink: false,
      });
      for (const l of linkedByParent.get(a.id) ?? []) {
        const c = l.child!;
        if (seen.has(c.id)) continue;
        seen.add(c.id);
        devices.push({
          assetId: c.id, assetName: c.assetName, assetCode: c.assetCode, type: c.type,
          kind: deviceKind(c.type), pmStatus: statusOf(c.id), pmDate: dateOf(c.id), viaLink: true,
        });
      }
    }

    // เครื่องก่อน แล้วค่อยของต่อพ่วง เพื่อให้ไอคอนบนแผนผังเรียงอ่านง่ายเสมอ
    const order: DeviceKind[] = ['notebook', 'desktop', 'monitor', 'printer', 'network', 'other'];
    devices.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind)
      || String(a.assetName).localeCompare(String(b.assetName)));

    return {
      id: s.id, x: s.x, y: s.y, label: s.label,
      ownerName: s.ownerName, departmentId: s.departmentId ?? own[0]?.departmentId ?? null,
      note: s.note,
      devices,
      status: worst(devices.map(d => d.pmStatus)),
      looksLikeStorage: devices.length >= STORAGE_HINT_DEVICES,
    };
  });

  const spots: LiveSpot[] = plan.pins.map(p => ({
    id: p.id, x: p.x, y: p.y, label: p.label,
    assetId: p.assetId,
    assetName: p.asset?.assetName ?? null,
    assetCode: p.asset?.assetCode ?? null,
    type: p.asset?.type ?? null,
    kind: deviceKind(p.asset?.type),
    ownerName: p.asset?.ownerName ?? null,
    departmentId: p.asset?.departmentId ?? null,
    pmStatus: statusOf(p.assetId),
    pmDate: dateOf(p.assetId),
  }));

  const byKind: Record<string, number> = {};
  for (const d of [...seats.flatMap(s => s.devices), ...spots]) {
    byKind[d.kind] = (byKind[d.kind] || 0) + 1;
  }
  const devicesAll = seats.flatMap(s => s.devices);

  return {
    plan: {
      id: plan.id, name: plan.name, floor: plan.floor,
      building: plan.building, company: plan.company, imageUrl: plan.imageUrl,
    },
    year,
    seats,
    spots,
    summary: {
      seats: seats.length,
      seatsDone: seats.filter(s => s.status === 'COMPLETED').length,
      // ที่นั่งที่ปักไว้แต่หาอุปกรณ์ไม่เจอ — สะกดชื่อไม่ตรง หรือคนลาออกไปแล้ว
      seatsUnplaced: seats.filter(s => s.devices.length === 0).length,
      devices: devicesAll.length,
      devicesDone: devicesAll.filter(d => d.pmStatus === 'COMPLETED').length,
      spots: spots.length,
      byKind,
    },
  };
}

/**
 * ช่องบริษัทของแปลนเป็นข้อความที่คนพิมพ์เอง ไม่ใช่รหัสบริษัทตัวเดียว
 *
 * แปลนชั้น 22 กรอกไว้ว่า "TRRT-TRRCORP" เพราะชั้นนั้นมีคนของสองบริษัทนั่งรวมกัน
 * ซึ่งไม่ตรงกับค่าใดใน assets.company เลย การกรองแบบเท่ากันตรง ๆ จึงคืนค่าว่าง
 * และหาคนไม่เจอสักคน
 *
 * แยกเป็นรหัสย่อยแล้วเทียบกับรายชื่อบริษัทจริง ถ้าแยกแล้วไม่ตรงสักตัวให้เลิกกรอง
 * ไปเลย — แสดงทุกคนยังพอใช้งานได้ แต่แสดงศูนย์คนคือใช้ไม่ได้
 */
async function resolveCompanies(prisma: PrismaClient, raw?: string): Promise<string[]> {
  const text = String(raw ?? '').trim();
  if (!text) return [];
  const known = (await prisma.asset.groupBy({ by: ['company'] }))
    .map(r => r.company)
    .filter((c): c is string => !!c);
  const tokens = text.split(/[^A-Za-z0-9]+/).filter(Boolean).map(t => t.toUpperCase());
  return known.filter(c => tokens.includes(c.toUpperCase()));
}

/**
 * รายชื่อผู้ครอบครองไว้ให้เลือกตอนปักที่นั่ง
 *
 * ปักที่นั่งต้องเลือก "คน" ไม่ใช่ "เครื่อง" — แบบเดิมให้ค้นหาทรัพย์สินแล้วปักตัว
 * ทรัพย์สิน ซึ่งเป็นต้นตอของปัญหาทั้งหมด
 */
export async function listSeatOwners(prisma: PrismaClient, q: string, company?: string) {
  const companies = await resolveCompanies(prisma, company);
  const assets = await prisma.asset.findMany({
    where: {
      NOT: { status: 'Retired' },
      ownerName: { not: null },
      ...(companies.length ? { company: { in: companies } } : {}),
      ...(q ? { ownerName: { contains: q, mode: 'insensitive' as const } } : {}),
    },
    select: { ownerName: true, departmentId: true, type: true, company: true },
  });

  const map = new Map<string, { ownerName: string; departmentId: string | null; company: string | null; devices: number; computers: number }>();
  for (const a of assets) {
    const name = String(a.ownerName ?? '').trim();
    if (!name) continue;
    const k = name.toLowerCase();
    if (!map.has(k)) map.set(k, { ownerName: name, departmentId: a.departmentId, company: a.company, devices: 0, computers: 0 });
    const e = map.get(k)!;
    e.devices++;
    const kind = deviceKind(a.type);
    if (kind === 'notebook' || kind === 'desktop') e.computers++;
    if (!e.departmentId && a.departmentId) e.departmentId = a.departmentId;
  }

  return [...map.values()]
    .sort((a, b) => a.ownerName.localeCompare(b.ownerName))
    .slice(0, 50)
    .map(e => ({ ...e, looksLikeStorage: e.devices >= STORAGE_HINT_DEVICES }));
}

/**
 * คนที่ควรอยู่บนแปลนนี้ เตรียมไว้ให้เลือกวางเลยโดยไม่ต้องค้นทีละชื่อ
 *
 * ข้อจำกัดที่ต้องพูดตรง ๆ: แผน PM ไม่ได้เก็บ "ชั้น" ไว้ ช่อง site ของแผนทั้ง 32 แผน
 * มีค่าเป็น "HQ" กับ "คลังพระประแดง" ซึ่งเป็นสถานที่ ไม่ใช่ชั้น ระบบจึงบอกไม่ได้
 * ว่าใครนั่งชั้น 22 ชั้น 23 จากข้อมูลที่มี
 *
 * สิ่งที่แผน PM บอกได้จริงคือ *บริษัท* กับ *แผนก* และแปลนก็ถูกแบ่งโซนตามแผนก
 * อยู่แล้ว จึงดึงคนตามบริษัทของแปลนมาจัดกลุ่มตามแผนกให้ แล้วให้คนวางเลือกว่า
 * แผนกไหนอยู่ชั้นนี้ — วางครั้งเดียวจบ ครั้งต่อไปที่นั่งอยู่บนแปลนแล้ว
 */
export interface FloorCandidate {
  ownerName: string;
  departmentId: string;
  devices: number;
  /** อยู่ในแผน PM ของปีนี้ — กลุ่มนี้คือคนที่ต้องเดินไปหาอยู่แล้ว ควรวางก่อน */
  pmPlanned: boolean;
  /** ปักที่นั่งบนแปลนนี้ไปแล้ว */
  placed: boolean;
  looksLikeStorage: boolean;
}

export async function listFloorCandidates(
  prisma: PrismaClient,
  planId: number,
  year: number,
): Promise<{ companies: string[]; candidates: FloorCandidate[] }> {
  const plan = await prisma.floorPlan.findUnique({
    where: { id: planId },
    select: { company: true, seats: { select: { ownerName: true } } },
  });
  if (!plan) return { companies: [], candidates: [] };

  const companies = await resolveCompanies(prisma, plan.company ?? undefined);
  const placed = new Set(plan.seats.map(s => norm(s.ownerName)).filter(Boolean));

  const assets = await prisma.asset.findMany({
    where: {
      NOT: { status: 'Retired' },
      ownerName: { not: null },
      ...(companies.length ? { company: { in: companies } } : {}),
    },
    select: { id: true, ownerName: true, departmentId: true, type: true },
  });

  // เครื่องที่มีรอบ PM ในปีนี้ ใช้ชี้ว่าเจ้าของอยู่ในแผนแล้วหรือยัง
  const planned = new Set(
    (await prisma.pMRun.findMany({
      where: { year, assetId: { in: assets.map(a => a.id) } },
      select: { assetId: true },
    })).map(r => r.assetId),
  );

  const map = new Map<string, FloorCandidate>();
  for (const a of assets) {
    const name = String(a.ownerName ?? '').trim();
    if (!name) continue;
    const k = name.toLowerCase();
    if (!map.has(k)) {
      map.set(k, {
        ownerName: name,
        departmentId: a.departmentId || 'ไม่ระบุแผนก',
        devices: 0,
        pmPlanned: false,
        placed: placed.has(k),
        looksLikeStorage: false,
      });
    }
    const e = map.get(k)!;
    e.devices++;
    if (planned.has(a.id)) e.pmPlanned = true;
    if (e.departmentId === 'ไม่ระบุแผนก' && a.departmentId) e.departmentId = a.departmentId;
  }

  const candidates = [...map.values()].map(c => ({
    ...c,
    looksLikeStorage: c.devices >= STORAGE_HINT_DEVICES,
  }));

  // ยังไม่วางมาก่อน แล้วคนที่อยู่ในแผน PM มาก่อน — สองอย่างนี้คือลำดับที่คนทำงานสนใจ
  candidates.sort((a, b) =>
    Number(a.placed) - Number(b.placed)
    || Number(b.pmPlanned) - Number(a.pmPlanned)
    || a.departmentId.localeCompare(b.departmentId)
    || a.ownerName.localeCompare(b.ownerName));

  return { companies, candidates };
}
