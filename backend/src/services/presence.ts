import { AuthUser } from '../middleware/auth';
import { resolveHostByIp } from './loginAudit';

interface PresenceEntry {
  userId: number;
  displayName: string | null;
  adUsername: string;
  role: string;
  avatarUrl?: string | null;
  path: string;
  lastSeen: number;
  /** ที่อยู่ที่ heartbeat ล่าสุดส่งมาจาก */
  ip?: string | null;
  /** ชื่อเครื่องที่แปลจาก ip — เติมทีหลังแบบไม่บล็อก heartbeat */
  hostname?: string | null;
}

// In-memory only — presence is inherently ephemeral (single backend
// container, no multi-instance fan-out needed) and writing every heartbeat
// to the DB would be pure churn for data nobody needs after ~90s.
const store = new Map<number, PresenceEntry>();
const ONLINE_WINDOW_MS = 90_000;

export function touch(user: AuthUser, path: string, ip?: string | null): void {
  const prev = store.get(user.userId);
  // ที่อยู่เดิม = ชื่อเครื่องเดิม ไม่ต้องแปลใหม่ทุก heartbeat (ทุก ~25 วินาที)
  const sameIp = !!ip && prev?.ip === ip;

  store.set(user.userId, {
    userId: user.userId,
    displayName: user.displayName,
    adUsername: user.adUsername,
    role: user.role,
    avatarUrl: user.avatarUrl,
    path,
    lastSeen: Date.now(),
    ip: ip ?? prev?.ip ?? null,
    hostname: sameIp ? prev?.hostname ?? null : null,
  });

  // แปล ip เป็นชื่อเครื่องแบบไม่ให้ heartbeat ต้องรอ — แผนที่ ip ถูกแคชไว้แล้ว
  // ปกติจึงเสร็จทันที ส่วนรอบที่แคชหมดอายุก็แค่ได้ชื่อเครื่องช้าไปหนึ่งจังหวะ
  if (ip && !sameIp) {
    void resolveHostByIp(ip).then((host) => {
      const cur = store.get(user.userId);
      if (cur && cur.ip === ip) cur.hostname = host;
    }).catch(() => { /* ไม่รู้ชื่อเครื่องดีกว่าทำให้ presence พัง */ });
  }
}

export function listOnline(): PresenceEntry[] {
  const now = Date.now();
  return Array.from(store.values())
    .filter((e) => now - e.lastSeen < ONLINE_WINDOW_MS)
    .sort((a, b) => b.lastSeen - a.lastSeen);
}

// Ordered most-specific-first — patterns are tested top to bottom, first match wins.
const PATH_LABELS: { pattern: RegExp; label: string }[] = [
  { pattern: /^\/dashboard/, label: 'กำลังดูแดชบอร์ด' },
  { pattern: /^\/assets\/new/, label: 'กำลังเพิ่มทรัพย์สินใหม่' },
  { pattern: /^\/assets\/\d+\/edit/, label: 'กำลังแก้ไขทรัพย์สิน' },
  { pattern: /^\/assets\/\d+/, label: 'กำลังดูรายละเอียดทรัพย์สิน' },
  { pattern: /^\/assets\/import-export/, label: 'กำลังนำเข้า/ส่งออกข้อมูลทรัพย์สิน' },
  { pattern: /^\/assets\/print-qr/, label: 'กำลังพิมพ์ QR สติ๊กเกอร์' },
  { pattern: /^\/assets/, label: 'กำลังดูทะเบียนทรัพย์สิน' },
  { pattern: /^\/inventory/, label: 'กำลังดูคลังวัสดุ' },
  { pattern: /^\/pm\/runs\/\d+/, label: 'กำลังทำ PM ทรัพย์สิน' },
  { pattern: /^\/pm\/runs/, label: 'กำลังดูรายการทำ PM' },
  { pattern: /^\/pm\/plans/, label: 'กำลังดูแผน PM' },
  { pattern: /^\/pm\/schedule/, label: 'กำลังดูกำหนดการ PM' },
  { pattern: /^\/pm\/floorplan/, label: 'กำลังดูแผนผังชั้น PM' },
  { pattern: /^\/pm\/templates/, label: 'กำลังจัดการ Checklist Template' },
  { pattern: /^\/pm\/sw-hub/, label: 'กำลังตรวจ Hub Room' },
  { pattern: /^\/pm/, label: 'กำลังดูภาพรวม PM' },
  { pattern: /^\/borrow\/approval-queue/, label: 'กำลังตรวจอนุมัติคำขอยืม' },
  { pattern: /^\/borrow\/checkout/, label: 'กำลังส่งมอบทรัพย์สิน' },
  { pattern: /^\/borrow\/return/, label: 'กำลังรับคืนทรัพย์สิน' },
  { pattern: /^\/borrow\/extensions/, label: 'กำลังจัดการคำขอขยายวัน' },
  { pattern: /^\/borrow\/overdue/, label: 'กำลังดูรายการยืมเกินกำหนด' },
  { pattern: /^\/borrow\/history/, label: 'กำลังดูประวัติยืม-คืน' },
  { pattern: /^\/borrow/, label: 'กำลังใช้งานระบบยืม-คืน' },
  { pattern: /^\/donations/, label: 'กำลังจัดการการบริจาค' },
  { pattern: /^\/disposals/, label: 'กำลังบันทึกการจำหน่ายทรัพย์สิน' },
  { pattern: /^\/licenses/, label: 'กำลังดู Software License' },
  { pattern: /^\/contracts/, label: 'กำลังดูสัญญา' },
  { pattern: /^\/reports/, label: 'กำลังดูรายงาน' },
  { pattern: /^\/categories/, label: 'กำลังจัดการหมวดหมู่' },
  { pattern: /^\/admin\/master-data/, label: 'กำลังจัดการข้อมูลหลัก' },
  { pattern: /^\/admin\/users/, label: 'กำลังจัดการผู้ใช้งาน' },
  { pattern: /^\/admin\/settings/, label: 'กำลังตั้งค่าระบบ' },
  { pattern: /^\/admin/, label: 'กำลังใช้งานหน้าผู้ดูแลระบบ' },
];

export function labelForPath(path: string): string {
  const hit = PATH_LABELS.find((p) => p.pattern.test(path));
  return hit?.label || 'กำลังใช้งานระบบ';
}

// Buckets a path into one of the dashboard ops-room "desks". Only desks that
// correspond to a real menu are listed here — the mockup's "เครื่องใหม่ &
// ส่งมอบ" and standalone "ซ่อมบำรุง" desks have no equivalent menu in this
// app yet, so a path never resolves to them.
export type OpsRoomZone = 'borrow' | 'pm' | 'inventory' | null;

const ZONE_PATTERNS: { pattern: RegExp; zone: OpsRoomZone }[] = [
  { pattern: /^\/borrow/, zone: 'borrow' },
  { pattern: /^\/pm/, zone: 'pm' },
  { pattern: /^\/inventory/, zone: 'inventory' },
];

export function zoneForPath(path: string): OpsRoomZone {
  return ZONE_PATTERNS.find((p) => p.pattern.test(path))?.zone ?? null;
}
