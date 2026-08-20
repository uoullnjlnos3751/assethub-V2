/**
 * ออกรหัสทรัพย์สินให้จอ/เครื่องพิมพ์ที่พบตอนทำ PM
 *
 * เดิมมีโค้ดสองชุดคนละที่ (ตอนพรีวิวในหน้าจอ กับตอนบันทึกจริง) ที่ลอกกันมา
 * แล้วเพี้ยนคนละทาง — ช่างเห็นเลขหนึ่งแต่ระบบบันทึกอีกเลขหนึ่ง ไฟล์นี้คือชุดเดียว
 * ที่ทั้งสองทางเรียกใช้
 *
 * ปัญหาที่แก้ไปพร้อมกัน:
 *
 * 1. prefix ไม่ตรงกับของจริง — ตาราง COMPANY_PREFIXES ว่างเปล่ามาตลอด โค้ดจึงตก
 *    ไปใช้ `${บริษัท}-M` ได้ `PS-M001` ทั้งที่ทั้งบริษัทใช้ `HQ-PS-M###` อยู่ 30 ตัว
 *    ตอนนี้ถ้าไม่ได้ตั้งค่าไว้จะ "อ่านจากของจริง" ว่าบริษัทนั้นใช้ prefix อะไรอยู่
 *
 * 2. นับเลขจาก assetCode อย่างเดียว — จอ 109 จาก 212 ตัวไม่มี assetCode ตัวนับจึง
 *    มองไม่เห็นแล้วเริ่มที่ 001 ใหม่ ตอนนี้นับจากทั้ง assetName และ assetCode
 *
 * 3. ไม่เคยเช็กว่าเลขที่ออกไปว่างจริงไหม — PM run 511 ล้มด้วย P2002 เพราะสองอุปกรณ์
 *    ใน transaction เดียวกันได้เลขเดียวกัน ตอนนี้ไล่ขึ้นจนกว่าจะเจอเลขที่ว่างจริง
 */
import { prisma } from '../lib/prisma';

export interface PrefixSpec {
  prefix: string;
  padding: number;
}

/** ตัดรหัสเป็น (ส่วนหน้า, ตัวเลขท้าย) เช่น "HQ-PS-M042" -> ["HQ-PS-M", "042"] */
const SPLIT = /^(.*[A-Za-z-])(\d+)$/;

const norm = (v: any) => String(v ?? '').trim();
const companyKey = (v: any) => norm(v).toUpperCase().replace(/\s+/g, '');

/** จอกับเครื่องพิมพ์อยู่คนละชุดเลข จึงต้องกรองด้วยชนิดที่ตรงกัน */
const typeFilter = (isPrinter: boolean) => ({ type: { contains: isPrinter ? 'Printer' : 'Monitor' } });

/**
 * prefix ที่บริษัทนี้ใช้อยู่จริง
 *
 * ลำดับ: ค่าที่ตั้งไว้ใน COMPANY_PREFIXES > อ่านจากรหัสที่บริษัทนี้ใช้อยู่ > เดา
 *
 * การอ่านจากของจริงต้องเจอซ้ำอย่างน้อย 2 ครั้งถึงจะยอมรับ ไม่งั้นรหัสแปลกปลอม
 * ตัวเดียว (เช่น "CE-000963" ที่เป็นเลขบัญชีของฝ่ายบัญชี) จะกลายเป็นแบบแผน
 * ของทั้งบริษัทไปเลย
 */
export async function resolveDevicePrefix(db: any, company: any, isPrinter: boolean): Promise<PrefixSpec> {
  const key = companyKey(company);
  // เครื่องพิมพ์ใช้ -PR ตามที่ทุกบริษัทตั้งไว้ (HQ-TRRCORP-PR มีของจริง 6 เครื่อง)
  const letter = isPrinter ? 'PR' : 'M';

  try {
    const setting = await db.systemSetting.findUnique({ where: { key: 'COMPANY_PREFIXES' } });
    if (setting?.value) {
      const map = JSON.parse(setting.value);
      const hit = key ? map[key] : null;
      const configured = hit && (isPrinter ? hit.printerPrefix : hit.monitorPrefix);
      if (configured) return { prefix: String(configured), padding: Number(hit.padding) || 3 };
    }
  } catch {
    /* ตั้งค่าเสียก็อ่านจากของจริงต่อไป */
  }

  if (key) {
    const rows = await db.asset.findMany({
      where: { company: norm(company), ...typeFilter(isPrinter) },
      select: { assetName: true, assetCode: true },
    });
    const tally = new Map<string, { n: number; widths: number[] }>();
    for (const row of rows) {
      for (const raw of [row.assetName, row.assetCode]) {
        const m = norm(raw).match(SPLIT);
        if (!m) continue;
        const entry = tally.get(m[1]) || { n: 0, widths: [] };
        entry.n += 1;
        entry.widths.push(m[2].length);
        tally.set(m[1], entry);
      }
    }
    const best = [...tally.entries()].filter(([, v]) => v.n >= 2).sort((a, b) => b[1].n - a[1].n)[0];
    if (best) {
      // ความยาวเลขที่พบบ่อยที่สุด — นับด้วย map ไม่ใช่ sort ที่อ่านอาร์เรย์ตัวเองไป
      // ระหว่างจัดเรียง (ของเดิมเขียนไว้แบบนั้นแล้วได้ padding 4 ให้ TRRT ที่ใช้ 3 หลัก)
      const freq = new Map<number, number>();
      for (const w of best[1].widths) freq.set(w, (freq.get(w) || 0) + 1);
      const mode = [...freq.entries()].sort((x, y) => y[1] - x[1] || x[0] - y[0])[0]?.[0];
      return { prefix: best[0], padding: mode || 3 };
    }
  }

  // ยังไม่มีอุปกรณ์ชนิดนี้ของบริษัทนี้เลย — ใช้รูปแบบเดียวกับที่ทุกบริษัทใช้กันอยู่
  return { prefix: key ? `HQ-${key}-${letter}` : `HQ-TRRT-${letter}`, padding: 3 };
}

/**
 * รหัสถัดไปที่ยังว่างจริง
 *
 * `skip` ไว้ให้ผู้เรียกกันเลขที่เพิ่งจ่ายไปในรอบเดียวกันแต่ยังไม่ได้ commit
 * `offset` ไว้ให้หน้าพรีวิวแสดงเลขไล่กันสำหรับอุปกรณ์หลายตัวในรายการเดียว
 */
export async function nextDeviceCode(
  db: any,
  company: any,
  isPrinter: boolean,
  opts: { offset?: number; skip?: Iterable<string> } = {},
): Promise<string> {
  const { prefix, padding } = await resolveDevicePrefix(db, company, isPrinter);
  const skip = new Set([...(opts.skip || [])].map(s => norm(s).toUpperCase()));

  // นับจากทั้งสองช่อง และไม่จำกัดบริษัท เพราะ assetCode ต้องไม่ซ้ำทั้งระบบ
  const rows = await db.asset.findMany({
    where: { OR: [{ assetName: { startsWith: prefix } }, { assetCode: { startsWith: prefix } }] },
    select: { assetName: true, assetCode: true },
  });

  const used = new Set<string>();
  let highest = 0;
  for (const row of rows) {
    for (const raw of [row.assetName, row.assetCode]) {
      const value = norm(raw);
      if (!value) continue;
      used.add(value.toUpperCase());
      const m = value.match(SPLIT);
      if (m && m[1] === prefix) highest = Math.max(highest, parseInt(m[2], 10));
    }
  }

  let n = highest + 1 + Math.max(0, opts.offset || 0);
  // ช่องว่างระหว่างเลขเกิดได้จากการลบทิ้ง จึงไล่ต่อไปเรื่อย ๆ แทนที่จะเชื่อ max
  for (let guard = 0; guard < 10000; guard++, n++) {
    const candidate = `${prefix}${String(n).padStart(padding, '0')}`;
    if (used.has(candidate.toUpperCase()) || skip.has(candidate.toUpperCase())) continue;
    const taken = await db.asset.findFirst({
      where: { OR: [{ assetName: candidate }, { assetCode: candidate }] },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
  throw new Error(`ออกรหัสให้ ${prefix} ไม่ได้ — เลขเต็มหรือข้อมูลผิดปกติ`);
}

/** ใช้ตอนเติมค่าเริ่มต้นให้ COMPANY_PREFIXES จากข้อมูลที่มีอยู่ */
export async function derivePrefixTable(): Promise<Record<string, any>> {
  const db = prisma;
  const companies: { company: string | null }[] = await db.asset.findMany({
    where: { OR: [typeFilter(false), typeFilter(true)] },
    select: { company: true },
    distinct: ['company'],
  });
  const table: Record<string, any> = {};
  for (const { company } of companies) {
    if (!company) continue;
    const mon = await resolveDevicePrefix(db, company, false);
    const pr = await resolveDevicePrefix(db, company, true);
    table[companyKey(company)] = {
      monitorPrefix: mon.prefix,
      printerPrefix: pr.prefix,
      padding: mon.padding,
    };
  }
  return table;
}
