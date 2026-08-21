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
 * การแปลงเป็นชื่อเครื่องใช้ข้อมูลจาก Agent ไม่ได้ใช้ reverse DNS เพราะ Agent
 * รู้จักเครื่องในองค์กรแม่นกว่าและไม่ต้องพึ่ง PTR record ที่อาจไม่ได้ตั้งไว้
 *
 * ⚠ ที่ระบบนี้ IP ใช้ระบุเครื่องไม่ได้: nginx รันใน Docker และชั้น port-mapping
 * ทำ SNAT ต้นทางทิ้งก่อนถึง container — ตรวจจาก access log ของ nginx เองแล้ว
 * ทุกคำขอเป็น 172.19.0.1 เหมือนกันหมด และ X-Forwarded-For ที่รับเข้ามาว่างเปล่า
 * ทางที่ใช้ได้จริงคือถาม Agent ว่าบัญชีนี้ล็อกอิน Windows อยู่เครื่องไหน — ดู
 * resolveHost() ด้านล่าง
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

interface FleetMaps {
  byIp: Map<string, string>;
  /** ชื่อผู้ใช้ (ตัวพิมพ์เล็ก ไม่มีโดเมน) -> ชื่อเครื่องที่เขาล็อกอินอยู่ */
  byUser: Map<string, string>;
}
let cache: FleetMaps | null = null;
let cachedAt = 0;
let inflight: Promise<FleetMaps> | null = null;

/** ตัด prefix ของ IPv6-mapped IPv4 ("::ffff:10.0.0.1") ออกให้เทียบกันได้ */
export function normaliseIp(ip: any): string | null {
  const raw = String(ip ?? '').trim();
  if (!raw) return null;
  const stripped = raw.replace(/^::ffff:/i, '');
  return stripped || null;
}

/** ตัดโดเมนออก: `TRRGROUP\\watchara.kid` -> `watchara.kid` (รับทั้ง \\ และ /) */
const accountOf = (v: any) => String(v ?? '').trim().split(/[\\/]/).pop()?.toLowerCase() || '';

async function fleet(): Promise<FleetMaps> {
  if (cache && Date.now() - cachedAt < TTL_MS) return cache;
  if (inflight) return inflight;

  inflight = (async () => {
    const maps: FleetMaps = { byIp: new Map(), byUser: new Map() };
    try {
      const records = await fetchAllAgentRecords();
      // เครื่องที่ยัง online และรายงานล่าสุดควรชนะ เวลาคนคนเดียวเคยล็อกอินหลายเครื่อง
      const ranked = [...records].sort((a: any, b: any) =>
        (Number(!!b?.online) - Number(!!a?.online)) ||
        String(b?.last_seen ?? '').localeCompare(String(a?.last_seen ?? '')));

      for (const rec of ranked) {
        const host = String((rec as any)?.hostname || '').trim();
        if (!host) continue;
        const ip = normaliseIp((rec as any)?.ip);
        if (ip && !maps.byIp.has(ip)) maps.byIp.set(ip, host);
        const account = accountOf((rec as any)?.logged_user);
        if (account && !maps.byUser.has(account)) maps.byUser.set(account, host);
      }
      cache = maps;
      cachedAt = Date.now();
    } catch (err) {
      // Agent ล่มต้องไม่ทำให้ล็อกอินไม่ได้ — ยอมไม่รู้ชื่อเครื่องดีกว่า
      console.error('loginAudit: อ่านรายชื่อเครื่องจาก Agent ไม่สำเร็จ', err);
      if (cache) return cache;
    } finally {
      inflight = null;
    }
    return cache ?? maps;
  })();

  return inflight;
}

/** ชื่อเครื่องที่ IP นี้เป็นของ — null ถ้าไม่รู้จัก (เช่น เข้าจากนอกออฟฟิศ/VPN) */
export async function resolveHostByIp(ip: any): Promise<string | null> {
  const key = normaliseIp(ip);
  if (!key) return null;
  return (await fleet()).byIp.get(key) ?? null;
}

/** เครื่องที่ผู้ใช้คนนี้ล็อกอิน Windows อยู่ ตามที่ Agent รายงาน */
export async function resolveHostByUser(adUsername: any): Promise<string | null> {
  const key = accountOf(adUsername);
  if (!key) return null;
  return (await fleet()).byUser.get(key) ?? null;
}

/**
 * หาเครื่องที่คนนี้กำลังใช้
 *
 * ลอง IP ก่อนเพราะตรงกับ "เบราว์เซอร์อยู่ที่ไหน" ที่สุด แต่ที่นี่ nginx รันใน Docker
 * และชั้น port-mapping กลืน IP ต้นทางไปแล้ว ทุกคนจึงมาถึงเป็น 172.19.0.1 เหมือนกันหมด
 * (ตรวจแล้วจาก access log ของ nginx เอง) จึงต้องมีทางที่สอง: ถาม Agent ว่าบัญชีนี้
 * ล็อกอิน Windows อยู่เครื่องไหน ซึ่งไม่ขึ้นกับเส้นทางเครือข่ายเลย
 */
export async function resolveHost(ip: any, adUsername?: any): Promise<string | null> {
  return (await resolveHostByIp(ip)) ?? (await resolveHostByUser(adUsername));
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
    const hostname = await resolveHost(outcome.ip, outcome.username);

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
