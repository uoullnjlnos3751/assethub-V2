import type { PrismaClient } from '@prisma/client';
import { fetchAllAgentRecords } from './externalAgent';

/**
 * สรุปผล PM เป็นข้อเสนอให้หน่วยงานเอาไปขออนุมัติ
 *
 * รายงาน PM ที่มีอยู่ตอบว่า "IT ทำ PM ไปกี่เครื่องแล้ว" ซึ่งเป็นเรื่องของ IT เอง
 * เอกสารนี้ตอบคนละคำถาม — "แล้วหน่วยงานต้องซื้ออะไร" — และมีคนอ่านคนละกลุ่ม
 *
 * หลักสามข้อที่ทำให้เอกสารมีน้ำหนักพอจะยื่นผู้บริหาร:
 *
 *   1. แยก "เพิ่ม RAM" ออกจาก "เปลี่ยนเครื่อง" ให้ชัด — จาก 15 เครื่องที่ช่างว่าช้า
 *      มี 10 เครื่องที่แก้ได้ด้วยการเพิ่ม RAM การเสนอทางถูกก่อนทำให้ข้อเสนอ
 *      ที่เหลือน่าเชื่อถือขึ้น
 *
 *   2. ทุกบรรทัดต้องมีหลักฐานสองชั้น — ช่างไปเห็นด้วยตาว่าช้า (ผลประเมิน PM)
 *      บวกกับสเปกที่ระบบยืนยัน (RAM/แบต) ไม่เสนอจากความรู้สึกฝ่ายเดียว
 *
 *   3. ไม่ใส่ราคา — ทะเบียนมีราคาซื้ออยู่ 4 จาก 522 เครื่อง การเดาตัวเลขงบลงไป
 *      จะทำให้ทั้งฉบับเสียความน่าเชื่อถือ ปล่อยช่องว่างให้จัดซื้อตีราคาเอง
 */

/** RAM เท่านี้หรือน้อยกว่า ถือว่าเพิ่มแล้วน่าจะช่วย */
const RAM_UPGRADE_GB = 8;
/** แบตต่ำกว่านี้ถือว่าควรเสนอเปลี่ยน */
const BATTERY_REPLACE_PCT = 50;

export interface ProposalItem {
  assetId: number;
  assetName: string | null;
  department: string | null;
  ownerName: string | null;
  ram: string | null;
  cpu: string | null;
  purchaseDate: string | null;
  /** เหตุผลที่เข้าข่าย เขียนให้คนนอก IT อ่านรู้เรื่อง */
  reason: string;
  /** สิ่งที่เสนอ — ราคาเว้นไว้ให้จัดซื้อกรอก */
  proposal: string;
  batteryPct?: number | null;
}

export interface ProcurementReport {
  company: string;
  year: number;
  generatedAt: string;
  coverage: {
    totalAssets: number;
    pmCompleted: number;
    pmPercent: number;
    /** เครื่องที่มีข้อมูลแบตจาก Agent — บอกตรง ๆ ว่าหัวข้อแบตครอบคลุมแค่ไหน */
    withAgent: number;
  };
  addRam: ProposalItem[];
  replaceBattery: ProposalItem[];
  replaceMachine: ProposalItem[];
  /** ตัวเลขประกอบ ไม่ได้เสนอในรอบนี้ */
  context: {
    /** RAM ≤ 8GB ที่ยังไม่มีหลักฐานว่าช้า — ไว้ดูปีถัดไป */
    lowRamNotFlagged: number;
    ramDistribution: Record<string, number>;
  };
}

const gb = (v: any): number | null => {
  const m = String(v ?? '').match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
};
const low = (v: any) => String(v ?? '').trim().toLowerCase();
const ymd = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null);

const COMPUTER_TYPES = ['Notebook', 'PC Desktop', 'Macbook'];

export async function buildProcurementReport(
  prisma: PrismaClient,
  company: string,
  year: number,
): Promise<ProcurementReport> {
  const assets = await prisma.asset.findMany({
    where: { company, type: { in: COMPUTER_TYPES }, NOT: { status: 'Retired' } },
    select: {
      id: true, assetName: true, departmentId: true, ownerName: true,
      ram: true, cpu: true, serialNo: true, purchaseDate: true,
    },
  });
  const ids = assets.map(a => a.id);

  // ผลประเมินความเร็วจากรอบ PM ล่าสุดของแต่ละเครื่อง — เครื่องที่เคยช้าเมื่อปีก่อน
  // แต่รอบล่าสุดปกติแล้ว ไม่ควรถูกเสนอซื้อ
  const speedAnswers = await prisma.pMRunAnswer.findMany({
    where: {
      item: { key: 'speed_performance' },
      run: { assetId: { in: ids }, status: 'COMPLETED', year },
    },
    select: { value: true, run: { select: { assetId: true, completedAt: true, performedAt: true } } },
  });
  const latestSpeed = new Map<number, { at: number; slow: boolean }>();
  for (const a of speedAnswers) {
    const assetId = a.run?.assetId;
    if (!assetId) continue;
    const at = new Date(a.run?.completedAt ?? a.run?.performedAt ?? 0).getTime();
    const prev = latestSpeed.get(assetId);
    if (prev && prev.at >= at) continue;
    latestSpeed.set(assetId, { at, slow: /หน่วง|ช้า/.test(String(a.value ?? '')) });
  }

  const pmCompleted = await prisma.pMRun.count({
    where: { assetId: { in: ids }, status: 'COMPLETED', year },
  });

  // แบตเตอรี่มีเฉพาะเครื่องที่ติดตั้ง Agent — ส่วนที่เหลือไม่ได้แปลว่าแบตดี
  // แค่ไม่มีข้อมูล จึงต้องรายงานความครอบคลุมไว้ด้วย
  const battery = new Map<string, number>();
  try {
    for (const rec of await fetchAllAgentRecords()) {
      const pct = Number((rec as any)?.battery_health_pct);
      if (!Number.isFinite(pct)) continue;
      for (const k of [low((rec as any)?.serial_number), low((rec as any)?.hostname)]) {
        if (k) battery.set(k, pct);
      }
    }
  } catch {
    /* Agent ล่มก็ยังออกรายงานได้ แค่ไม่มีหัวข้อแบต */
  }

  const addRam: ProposalItem[] = [];
  const replaceBattery: ProposalItem[] = [];
  const replaceMachine: ProposalItem[] = [];
  const ramDistribution: Record<string, number> = {};
  let lowRamNotFlagged = 0;
  let withAgent = 0;

  for (const a of assets) {
    const ram = gb(a.ram);
    const bucket = ram === null ? 'ไม่ทราบ' : ram <= 4 ? '≤4 GB' : ram <= 8 ? '8 GB' : ram <= 16 ? '16 GB' : '>16 GB';
    ramDistribution[bucket] = (ramDistribution[bucket] || 0) + 1;

    const batt = battery.get(low(a.serialNo)) ?? battery.get(low(a.assetName));
    if (batt !== undefined) withAgent++;

    const slow = latestSpeed.get(a.id)?.slow === true;
    const base = {
      assetId: a.id, assetName: a.assetName, department: a.departmentId,
      ownerName: a.ownerName, ram: a.ram, cpu: a.cpu, purchaseDate: ymd(a.purchaseDate),
    };

    if (slow && ram !== null && ram <= RAM_UPGRADE_GB) {
      addRam.push({ ...base,
        reason: `ช่างประเมินรอบ PM ว่าเครื่องเริ่มหน่วงหนืด และ RAM มีเพียง ${a.ram}`,
        proposal: `เพิ่ม RAM เป็น 16 GB` });
    } else if (slow) {
      replaceMachine.push({ ...base,
        reason: `ช่างประเมินรอบ PM ว่าเครื่องเริ่มหน่วงหนืด ทั้งที่ RAM ${a.ram} เพียงพอแล้ว — การเพิ่ม RAM ไม่น่าช่วย`,
        proposal: 'ตรวจดิสก์ก่อน หากไม่ดีขึ้นเสนอเปลี่ยนเครื่อง' });
    } else if (ram !== null && ram <= RAM_UPGRADE_GB) {
      lowRamNotFlagged++;
    }

    if (batt !== undefined && batt < BATTERY_REPLACE_PCT) {
      replaceBattery.push({ ...base, batteryPct: batt,
        reason: `ระบบ Agent รายงานสุขภาพแบตเตอรี่เหลือ ${batt}%`,
        proposal: 'เปลี่ยนแบตเตอรี่' });
    }
  }

  const bySeverity = (a: ProposalItem, b: ProposalItem) =>
    (a.batteryPct ?? 999) - (b.batteryPct ?? 999) || String(a.assetName).localeCompare(String(b.assetName));
  addRam.sort(bySeverity);
  replaceBattery.sort(bySeverity);
  replaceMachine.sort(bySeverity);

  return {
    company,
    year,
    generatedAt: new Date().toISOString(),
    coverage: {
      totalAssets: assets.length,
      pmCompleted,
      pmPercent: assets.length ? Math.round((pmCompleted / assets.length) * 100) : 0,
      withAgent,
    },
    addRam,
    replaceBattery,
    replaceMachine,
    context: { lowRamNotFlagged, ramDistribution },
  };
}
