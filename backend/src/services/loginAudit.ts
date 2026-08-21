import { prisma } from '../lib/prisma';
import { fetchAllAgentRecords } from './externalAgent';

/**
 * บันทึกว่าใครเข้าใช้งานจากเครื่องไหน
 *
 * nginx ส่ง X-Real-IP กับ X-Forwarded-For มาให้อยู่แล้ว และ express ตั้ง
 * `trust proxy` ไว้ถูกต้อง (app.ts) ดังนั้น `req.ip` คือ IP ของผู้ใช้จริง —
 * แต่ก่อนหน้านี้ไม่มีโค้ดตรงไหนอ่านค่านั้นเลย ระบบจึงตอบไม่ได้ว่าบัญชีหนึ่ง
 * เข้าใช้งานจากเครื่องไหน ทั้งที่ข้อมูลมาถึงหน้าประตูแล้ว
 *
 * การแปลง IP เป็นชื่อเครื่องใช้ข้อมูลจาก Agent ซึ่งรายงาน ip คู่กับ hostname
 * ของทุกเครื่องที่ดูแลอยู่ ไม่ได้ใช้ reverse DNS เพราะ Agent รู้จักเครื่องใน
 * องค์กรแม่นกว่าและไม่ต้องพึ่ง DNS ที่อาจไม่ได้ตั้งค่า PTR ไว้
 */

interface LoginContext {
  ip?: string | null;
  userAgent?: string | null;
}

export interface LoginOutcome extends LoginContext {
  username: string;
  success: boolean;
  userId?: number | null;
  reason?: string | null;
  authType?: string | null;
}

/* ── แคช IP → hostname ────────────────────────────────────────────────
   Agent ตอบช้า (หนึ่งคำขอต่อการเรียกหนึ่งครั้ง) และแผนที่ IP เปลี่ยนไม่บ่อย
   การล็อกอินต้องไม่รอ Agent ทุกครั้ง จึงแคชไว้และรีเฟรชเมื่อหมดอายุ */
const TTL_MS = 5 * 60_000;
let cache: Map<string, string> | null = null;
let cachedAt = 0;
let inflight: Promise<Map<string, string>> | null = null;

/** ตัด prefix ของ IPv6-mapped IPv4 ("::ffff:10.0.0.1") ออกให้เทียบกันได้ */
export function normaliseIp(ip: any): string | null {
  const raw = String(ip ?? '').trim();
  if (!raw) return null;
  const stripped = raw.replace(/^::ffff:/i, '');
  return stripped || null;
}

async function ipMap(): Promise<Map<string, string>> {
  if (cache && Date.now() - cachedAt < TTL_MS) return cache;
  if (inflight) return inflight;

  inflight = (async () => {
    const map = new Map<string, string>();
    try {
      for (const rec of await fetchAllAgentRecords()) {
        const ip = normaliseIp((rec as any)?.ip);
        const host = String((rec as any)?.hostname || '').trim();
        if (ip && host) map.set(ip, host);
      }
      cache = map;
      cachedAt = Date.now();
    } catch (err) {
      // Agent ล่มต้องไม่ทำให้ล็อกอินไม่ได้ — ยอมไม่รู้ชื่อเครื่องดีกว่า
      console.error('loginAudit: อ่านรายชื่อเครื่องจาก Agent ไม่สำเร็จ', err);
      if (cache) return cache;
    } finally {
      inflight = null;
    }
    return cache ?? map;
  })();

  return inflight;
}

/** ชื่อเครื่องที่ IP นี้เป็นของ — null ถ้าไม่รู้จัก (เช่น เข้าจากนอกออฟฟิศ/VPN) */
export async function resolveHostByIp(ip: any): Promise<string | null> {
  const key = normaliseIp(ip);
  if (!key) return null;
  return (await ipMap()).get(key) ?? null;
}

/** ดึง IP กับเบราว์เซอร์ออกมาจาก request */
export function loginContext(req: any): LoginContext {
  return {
    ip: normaliseIp(req?.ip),
    // ตัดให้สั้นลง — user agent ยาวได้เป็นร้อยตัวอักษรและส่วนท้ายไม่ได้บอกอะไรเพิ่ม
    userAgent: String(req?.headers?.['user-agent'] ?? '').slice(0, 400) || null,
  };
}

/**
 * เขียนประวัติการเข้าใช้งานหนึ่งครั้ง และอัปเดตร่องรอยล่าสุดบนบัญชีเมื่อสำเร็จ
 *
 * ห้าม throw ไม่ว่ากรณีใด — การบันทึกประวัติล้มเหลวต้องไม่ทำให้คนล็อกอินไม่ได้
 */
export async function recordLogin(outcome: LoginOutcome): Promise<string | null> {
  try {
    const hostname = await resolveHostByIp(outcome.ip);

    await prisma.loginLog.create({
      data: {
        userId: outcome.userId ?? null,
        username: String(outcome.username || '').slice(0, 200),
        success: outcome.success,
        reason: outcome.reason ?? null,
        ip: outcome.ip ?? null,
        userAgent: outcome.userAgent ?? null,
        hostname,
        authType: outcome.authType ?? null,
      },
    });

    if (outcome.success && outcome.userId) {
      await prisma.appUser.update({
        where: { id: outcome.userId },
        data: {
          lastLoginIp: outcome.ip ?? null,
          lastLoginAgent: outcome.userAgent ?? null,
          lastLoginHost: hostname,
        },
      });
    }
    return hostname;
  } catch (err) {
    console.error('loginAudit: บันทึกประวัติการเข้าใช้งานไม่สำเร็จ', err);
    return null;
  }
}
