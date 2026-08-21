/**
 * สิ่งที่ Agent ตรวจเจอ สำหรับใช้ตอนทำ PM
 *
 * แยกเป็นสองส่วนที่ต่างกันโดยเจตนา:
 *
 *   answers  — ข้อใน checklist ที่ Agent ตอบแทนได้ พร้อมหลักฐานว่าตอบจากอะไร
 *   findings — เรื่องที่ checklist ไม่ได้ถาม แต่เป็นงานซ่อมบำรุงจริง
 *
 * ส่วนหลังคือเหตุผลหลักที่ทำ: จาก 33 เครื่องที่ Agent ดูแล มี 21 เครื่องแบตต่ำกว่า
 * 80% (ต่ำสุด 11%) และ 11 เครื่องดิสก์เหลือไม่ถึง 15% — ทั้งสองอย่างเป็นงานที่ต้อง
 * สั่งของหรือลงมือทำ แต่ไม่มีข้อไหนใน checklist ถามถึง และคนเดินไปดูด้วยตาก็ไม่เห็น
 */

export type Severity = 'critical' | 'warn' | 'info';

export interface AgentFinding {
  key: string;
  severity: Severity;
  label: string;
  detail: string;
}

export interface AgentAnswer {
  /** key ของข้อใน checklist template */
  key: string;
  value: 'yes' | 'no';
  /** ข้อความที่จะลงในช่องหมายเหตุของข้อนั้น */
  note: string;
}

export interface AgentPrinter {
  name: string;
  /** พอร์ตที่ต่ออยู่ เช่น USB001 — เก็บไว้ให้ช่างยืนยันได้ว่าเป็นตัวเดียวกับที่เห็น */
  port: string;
  isDefault: boolean;
}

export interface AgentPmCheck {
  available: boolean;
  hostname: string | null;
  lastSeen: string | null;
  online: boolean;
  agentVersion: string | null;
  findings: AgentFinding[];
  answers: AgentAnswer[];
  printers: AgentPrinter[];
}

const num = (v: any): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const str = (v: any): string => String(v ?? '').trim();
const yes = (v: any) => Number(v) === 1;

/**
 * เอาเฉพาะเครื่องพิมพ์ที่ต่อสาย USB กับเครื่องนี้จริง ๆ
 *
 * ช่อง `port` แยกได้ขาดกว่าอย่างอื่น:
 *   USB001 / USB002        ต่อ USB อยู่กับเครื่องนี้           ← เอาเฉพาะพวกนี้
 *   10.100.23.11           เครื่องพิมพ์เครือข่ายที่ใช้ร่วมกัน
 *   WSD-<guid>             เครือข่ายเหมือนกัน แม้ is_network=0
 *   nul: / pdfcmon / …     เครื่องพิมพ์เสมือนที่มากับโปรแกรม
 *
 * กรองด้วย is_network อย่างเดียวไม่พอ เพราะ WSD รายงานเป็น 0 ทั้งที่ต่อผ่านเครือข่าย
 * และถ้าไม่กรองเลย รายการจะยาว 8–11 บรรทัดต่อเครื่อง (สุ่ม 12 เครื่องพบ 107 รายการ
 * เป็นเครื่องพิมพ์จริงแค่ 28 และในนั้นส่วนใหญ่เป็นเครื่องเครือข่ายที่ทั้งออฟฟิศใช้ร่วมกัน)
 */
const USB_PORT = /^usb\d+/i;

const isUsbPrinter = (p: any) => USB_PORT.test(str(p?.port));

/** เกณฑ์ที่ใช้ตัดสินว่าเข้าข่ายต้องทำอะไร */
const BATTERY_WARN = 80;
const BATTERY_CRITICAL = 30;
const DISK_FREE_WARN = 0.15;
const DISK_FREE_CRITICAL = 0.10;

export function buildAgentPmCheck(rec: any): AgentPmCheck {
  if (!rec) {
    return { available: false, hostname: null, lastSeen: null, online: false,
             agentVersion: null, findings: [], answers: [], printers: [] };
  }

  const findings: AgentFinding[] = [];
  const answers: AgentAnswer[] = [];
  const add = (key: string, severity: Severity, label: string, detail: string) =>
    findings.push({ key, severity, label, detail });

  /* ── ข้อที่ checklist ถามอยู่แล้ว ─────────────────────────────────── */

  // 4. ตรวจสอบ Windows Version & Activate
  const osLabel = [str(rec.os_name), str(rec.os_version)].filter(Boolean).join(' ');
  if (osLabel) {
    const activated = yes(rec.win_activated);
    answers.push({
      key: 'windows_version',
      value: activated ? 'yes' : 'no',
      note: `${osLabel}${str(rec.win_edition) ? ` (${str(rec.win_edition)})` : ''} — ` +
            `${activated ? 'Activated' : 'ยังไม่ Activate'}` +
            `${str(rec.win_license_channel) ? ` · ${str(rec.win_license_channel)}` : ''}`,
    });
    if (!activated) add('win_activation', 'critical', 'Windows ยังไม่ Activate', osLabel);
  }

  // 5. ตรวจสอบ Microsoft Office & Activate
  const officeLabel = [str(rec.office_name), str(rec.office_version)].filter(Boolean).join(' ');
  if (officeLabel) {
    const activated = yes(rec.office_activated);
    answers.push({
      key: 'office_check',
      value: activated ? 'yes' : 'no',
      note: `${officeLabel} — ${activated ? 'Activated' : 'ยังไม่ Activate'}` +
            `${str(rec.office_license_type) ? ` · ${str(rec.office_license_type)}` : ''}`,
    });
    if (!activated) add('office_activation', 'critical', 'Office ยังไม่ Activate', officeLabel);
  }

  // 6. อัปเดต Antivirus
  //
  // ชื่อฟิลด์ต่างกันระหว่างสองรูปแบบของ record: รายการสรุปใช้ ep_installed /
  // ep_service_ok ส่วน record เต็มของแต่ละเครื่องใช้ tm_installed / tm_service_ok
  // (ตั้งชื่อตาม Trend Micro) ถ้าอ่านแค่ ep_* จะสรุปว่า "ไม่พบ Antivirus" เกือบทุก
  // เครื่องทั้งที่บอกยี่ห้อรุ่นได้ — ต้องรับทั้งสองชื่อ
  const epName = [str(rec.ep_vendor), str(rec.ep_product)].filter(Boolean).join(' ');
  const installedRaw = rec.ep_installed ?? rec.tm_installed;
  const serviceRaw = rec.ep_service_ok ?? rec.tm_service_ok;
  const known = installedRaw !== undefined && installedRaw !== null;
  const installed = yes(installedRaw);
  const epOk = installed && yes(serviceRaw);
  const pattern = str(rec.tm_pattern_ver) || str(rec.ep_pattern_ver);
  const patternDate = str(rec.tm_last_update);
  const realtime = str(rec.tm_realtime_scan);

  if (known) {
    answers.push({
      key: 'antivirus',
      value: epOk ? 'yes' : 'no',
      note: epOk
        ? `${epName || 'Antivirus'} ทำงานปกติ${realtime ? ` · Real-time ${realtime}` : ''}` +
          `${pattern ? ` · pattern ${pattern}` : ''}${patternDate ? ` (${patternDate})` : ''}`
        : (installed ? `${epName || 'Antivirus'} ติดตั้งแล้วแต่ service ไม่ทำงาน` : 'ไม่พบ Antivirus บนเครื่อง'),
    });
    if (!epOk) {
      add('antivirus', 'critical',
          installed ? 'Antivirus service ไม่ทำงาน' : 'ไม่พบ Antivirus บนเครื่อง',
          epName || 'ไม่พบข้อมูลผู้ผลิต');
    }
  }

  /* ── เรื่องที่ checklist ไม่ได้ถาม แต่เป็นงานซ่อมบำรุงจริง ────────── */

  // แบตเตอรี่ — เห็นด้วยตาไม่ได้ ต้องเปิดดูถึงจะรู้ และการเปลี่ยนต้องสั่งของ
  const batt = num(rec.battery_health_pct);
  if (batt !== null) {
    const model = str(rec.battery_model);
    answers.push({
      key: 'battery_health',
      value: batt >= BATTERY_WARN ? 'yes' : 'no',
      note: `สุขภาพแบตเตอรี่ ${batt}%${model ? ` · ${model}` : ''}` +
            (batt < BATTERY_CRITICAL ? ' — ควรเสนอเปลี่ยน' : batt < BATTERY_WARN ? ' — เริ่มเสื่อม' : ''),
    });
    if (batt < BATTERY_CRITICAL) {
      add('battery', 'critical', `แบตเตอรี่เสื่อมหนัก ${batt}%`, `ควรเสนอเปลี่ยน${model ? ` · ${model}` : ''}`);
    } else if (batt < BATTERY_WARN) {
      add('battery', 'warn', `แบตเตอรี่ ${batt}%`, `เริ่มเสื่อม ควรเฝ้าดู${model ? ` · ${model}` : ''}`);
    }
  }

  // พื้นที่ดิสก์ — ข้อ "ทำความสะอาด/Disk Clean up" ไม่เคยบอกว่าเครื่องไหนต้องทำ
  const diskParts: string[] = [];
  let tightest: number | null = null;
  for (const d of (rec.disks || [])) {
    const total = num(d?.total_gb), free = num(d?.free_gb);
    if (!total || free === null || total <= 0) continue;
    const ratio = free / total;
    const drive = str(d.drive) || '?';
    diskParts.push(`${drive} ${Math.round(free)}/${Math.round(total)} GB (${Math.round(ratio * 100)}%)`);
    if (tightest === null || ratio < tightest) tightest = ratio;
    if (ratio >= DISK_FREE_WARN) continue;
    add(`disk_${drive}`,
        ratio < DISK_FREE_CRITICAL ? 'critical' : 'warn',
        `ดิสก์ ${drive} เหลือ ${Math.round(free)} GB จาก ${Math.round(total)} GB`,
        `${Math.round(ratio * 100)}% — ต้อง Disk Clean up`);
  }
  if (tightest !== null) {
    answers.push({
      key: 'disk_space',
      value: tightest >= DISK_FREE_WARN ? 'yes' : 'no',
      note: diskParts.join(' · ') + (tightest < DISK_FREE_WARN ? ' — ต้อง Disk Clean up' : ''),
    });
  }

  // สุขภาพดิสก์จาก SMART
  for (const d of (rec.disk_health || [])) {
    const status = str(d?.media_status);
    if (!status || /ok|healthy/i.test(status)) continue;
    add('disk_health', 'critical', `ดิสก์แจ้งสถานะผิดปกติ: ${status}`, str(d?.name));
  }

  // Windows Update
  const wu = str(rec.wu_status);
  const wuLast = str(rec.wu_last_install);
  if (wu) {
    const stale = /outdated|fail|error/i.test(wu);
    answers.push({
      key: 'windows_update',
      value: stale ? 'no' : 'yes',
      note: `สถานะ ${wu}${wuLast ? ` · ติดตั้งล่าสุด ${wuLast}` : ''}` +
            (yes(rec.wu_reboot_required) ? ' · ค้างรอ restart' : ''),
    });
    if (stale) {
      add('windows_update', 'warn', `Windows Update: ${wu}`,
          wuLast ? `ติดตั้งล่าสุด ${wuLast}` : 'ไม่ทราบวันติดตั้งล่าสุด');
    }
  }
  if (yes(rec.wu_reboot_required)) {
    add('wu_reboot', 'warn', 'ค้างรอ restart จาก Windows Update', 'อัปเดตจะยังไม่มีผลจนกว่าจะรีสตาร์ท');
  }

  // เครื่องที่ไม่ได้รีสตาร์ทนาน มักเป็นต้นเหตุของอาการช้าที่ผู้ใช้บ่น
  const boot = str(rec.last_boot);
  if (boot) {
    const days = Math.floor((Date.now() - new Date(boot.replace(' ', 'T')).getTime()) / 86_400_000);
    if (Number.isFinite(days) && days >= 14) {
      add('uptime', 'info', `ไม่ได้รีสตาร์ทมา ${days} วัน`, `เปิดเครื่องล่าสุด ${boot}`);
    }
  }

  /* ── เครื่องพิมพ์ที่ต่อ USB: แสดงให้ดูเฉย ๆ ไม่เติมลงฟอร์ม ────────── */
  const printers: AgentPrinter[] = (rec.printers || [])
    .filter(isUsbPrinter)
    .map((p: any) => ({ name: str(p?.name), port: str(p?.port), isDefault: yes(p?.is_default) }))
    .filter((p: AgentPrinter) => p.name);

  return {
    available: true,
    hostname: str(rec.hostname) || null,
    lastSeen: str(rec.last_seen) || null,
    online: !!rec.online,
    agentVersion: str(rec.agent_version) || null,
    findings,
    answers,
    printers,
  };
}
