import type { PrismaClient } from '@prisma/client';
import { fetchAllAgentRecords } from './externalAgent';
import { buildAgentPmCheck, AgentFinding } from './agentPmCheck';

/**
 * สุขภาพของเครื่องทั้งกองจากมุมของ Agent
 *
 * รวมสี่คำถามที่เคยต้องเปิดดูทีละเครื่องไว้ในที่เดียว:
 *
 *   1. เครื่องไหนควรได้รับการดูแลก่อน       -> riskScore
 *   2. เครื่องไหนใกล้ถึงเวลาเปลี่ยน          -> osAgeYears + แบต + RAM
 *   3. License ที่ใช้อยู่จริงเป็นแบบไหน       -> winChannel / officeLicense
 *   4. เครื่องไหนหยุดรายงาน (อาจหาย/ถูกยกเลิก) -> staleDays
 *
 * ทั้งหมดอ่านจากข้อมูลชุดเดียวกับที่หน้าทำ PM ใช้ จึงไม่มีเกณฑ์สองชุดให้เพี้ยนกัน
 */

/** ถ่วงน้ำหนักให้ critical ชนะ warn หลายตัวรวมกัน — เครื่องไม่มี AV ต้องมาก่อน
 *  เครื่องที่แค่ยังไม่รีสตาร์ท ไม่ว่าจะมีเรื่องเล็กสะสมกี่เรื่อง */
const WEIGHT: Record<string, number> = { critical: 10, warn: 3, info: 1 };

/** ไม่รายงานเกินเท่านี้ถือว่าน่าสงสัย — เครื่องที่ใช้งานอยู่จริงรายงานทุกวัน */
const STALE_DAYS = 14;

export interface FleetMachine {
  hostname: string;
  online: boolean;
  lastSeen: string | null;
  staleDays: number | null;
  riskScore: number;
  critical: number;
  warn: number;
  findings: AgentFinding[];
  /** ระเบียนในทะเบียน ถ้าจับคู่ได้ */
  assetId: number | null;
  assetName: string | null;
  company: string | null;
  ownerName: string | null;
  status: string | null;
  /* ข้อมูลวางแผน */
  osName: string | null;
  osInstallDate: string | null;
  osAgeYears: number | null;
  ramGb: number | null;
  batteryPct: number | null;
  winChannel: string | null;
  winActivated: boolean;
  officeLicense: string | null;
  officeActivated: boolean;
  agentVersion: string | null;
}

export interface FleetHealth {
  scannedAt: string;
  machines: FleetMachine[];
  summary: {
    total: number;
    online: number;
    stale: number;
    withCritical: number;
    noAntivirus: number;
    notActivated: number;
    batteryBelow80: number;
    diskBelow15: number;
    updateOutdated: number;
    /** เครื่องที่ Agent เห็นแต่ยังไม่มีในทะเบียน */
    unregistered: number;
    winChannels: Record<string, number>;
    officeLicenses: Record<string, number>;
    agentVersions: Record<string, number>;
    /** ผู้ที่ควรพิจารณาเปลี่ยนเครื่อง: OS เกิน 4 ปี หรือแบตต่ำกว่า 50% หรือ RAM ไม่ถึง 8 GB */
    refreshCandidates: number;
  };
}

const str = (v: any): string | null => {
  const s = String(v ?? '').trim();
  return s === '' ? null : s;
};
const low = (v: any) => String(v ?? '').trim().toLowerCase();
const daysSince = (v: any): number | null => {
  const s = String(v ?? '').trim();
  if (!s) return null;
  const t = new Date(s.includes('T') ? s : s.replace(' ', 'T')).getTime();
  return Number.isFinite(t) ? Math.floor((Date.now() - t) / 86_400_000) : null;
};

/** เกณฑ์เดียวที่ใช้ตัดสินว่าเครื่องควรเข้าคิวเปลี่ยน */
export function isRefreshCandidate(m: FleetMachine): boolean {
  return (m.osAgeYears !== null && m.osAgeYears >= 4)
      || (m.batteryPct !== null && m.batteryPct < 50)
      || (m.ramGb !== null && m.ramGb < 8);
}

export async function buildFleetHealth(prisma: PrismaClient): Promise<FleetHealth> {
  const list = await fetchAllAgentRecords();

  // ดึงทะเบียนมาครั้งเดียวแล้วทำดัชนีในหน่วยความจำ — เร็วกว่ายิงทีละเครื่อง
  const assets = await prisma.asset.findMany({
    select: { id: true, assetName: true, serialNo: true, snComputer: true, company: true, ownerName: true, status: true },
  });
  const bySerial = new Map<string, typeof assets[number]>();
  const byName = new Map<string, typeof assets[number]>();
  for (const a of assets) {
    for (const s of [a.serialNo, a.snComputer]) if (low(s)) bySerial.set(low(s), a);
    if (low(a.assetName)) byName.set(low(a.assetName), a);
  }

  const machines: FleetMachine[] = [];
  for (const rec of list) {
    if (!rec?.hostname) continue;
    // ใช้เฉพาะรายการสรุปที่ได้มาจากคำขอเดียว ไม่ยิงรายเครื่อง
    //
    // เดิมเรียก fetchAgentRecord ต่อเครื่องเพื่อเอา printers/monitors/last_boot
    // ซึ่งหน้านี้ไม่ได้ใช้เลย แลกกับการรอ 33 คำขอเรียงกันเป็นนาที ๆ ต่อการเปิดแท็บ
    // หนึ่งครั้ง ข้อมูลที่จัดอันดับความเสี่ยงต้องใช้ — แบต ดิสก์ AV activation
    // Windows Update อายุ OS — มีอยู่ในรายการสรุปครบอยู่แล้ว
    //
    // สิ่งที่หายไปคือ finding เรื่อง "ไม่ได้รีสตาร์ทนาน" กับ "ค้างรอ restart"
    // ซึ่งยังเห็นได้ในหน้าทำ PM ของเครื่องนั้น ๆ ที่ดึง record เต็ม
    const check = buildAgentPmCheck(rec);

    const critical = check.findings.filter(f => f.severity === 'critical').length;
    const warn = check.findings.filter(f => f.severity === 'warn').length;
    const info = check.findings.filter(f => f.severity === 'info').length;

    const asset = bySerial.get(low((rec as any).serial_number)) ?? byName.get(low(rec.hostname)) ?? null;
    const osAgeDays = daysSince((rec as any).os_install_date);

    machines.push({
      hostname: String(rec.hostname),
      online: !!(rec as any).online,
      lastSeen: str((rec as any).last_seen),
      staleDays: daysSince((rec as any).last_seen),
      riskScore: critical * WEIGHT.critical + warn * WEIGHT.warn + info * WEIGHT.info,
      critical, warn,
      findings: check.findings,
      assetId: asset?.id ?? null,
      assetName: asset?.assetName ?? null,
      company: asset?.company ?? str((rec as any).company),
      ownerName: asset?.ownerName ?? null,
      status: asset?.status ?? null,
      osName: str((rec as any).os_name),
      osInstallDate: str((rec as any).os_install_date),
      osAgeYears: osAgeDays === null ? null : Math.round((osAgeDays / 365.25) * 10) / 10,
      ramGb: Number.isFinite(Number((rec as any).ram_total_gb)) ? Math.round(Number((rec as any).ram_total_gb)) : null,
      batteryPct: Number.isFinite(Number((rec as any).battery_health_pct)) ? Number((rec as any).battery_health_pct) : null,
      winChannel: str((rec as any).win_license_channel),
      winActivated: Number((rec as any).win_activated) === 1,
      officeLicense: str((rec as any).office_license_type),
      officeActivated: Number((rec as any).office_activated) === 1,
      agentVersion: str((rec as any).agent_version),
    });
  }

  machines.sort((a, b) => b.riskScore - a.riskScore || a.hostname.localeCompare(b.hostname));

  const tally = (pick: (m: FleetMachine) => string | null) => {
    const out: Record<string, number> = {};
    for (const m of machines) { const k = pick(m) ?? 'ไม่ทราบ'; out[k] = (out[k] || 0) + 1; }
    return out;
  };
  const has = (m: FleetMachine, key: string) => m.findings.some(f => f.key === key);

  return {
    scannedAt: new Date().toISOString(),
    machines,
    summary: {
      total: machines.length,
      online: machines.filter(m => m.online).length,
      stale: machines.filter(m => m.staleDays !== null && m.staleDays >= STALE_DAYS).length,
      withCritical: machines.filter(m => m.critical > 0).length,
      noAntivirus: machines.filter(m => has(m, 'antivirus')).length,
      notActivated: machines.filter(m => !m.winActivated || !m.officeActivated).length,
      batteryBelow80: machines.filter(m => m.batteryPct !== null && m.batteryPct < 80).length,
      diskBelow15: machines.filter(m => m.findings.some(f => f.key.startsWith('disk_'))).length,
      updateOutdated: machines.filter(m => has(m, 'windows_update')).length,
      unregistered: machines.filter(m => !m.assetId).length,
      winChannels: tally(m => m.winChannel),
      officeLicenses: tally(m => m.officeLicense),
      agentVersions: tally(m => m.agentVersion),
      refreshCandidates: machines.filter(isRefreshCandidate).length,
    },
  };
}
