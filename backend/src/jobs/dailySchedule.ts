/**
 * ตัวจับเวลารายวันที่รอด restart
 *
 * ของเดิมทุก job ใช้ `setTimeout(run, ~1 นาที)` + `setInterval(run, 24 ชม.)`
 * ซึ่งพังสองทางพร้อมกันเมื่อ process ถูก restart:
 *
 *   1. ตัวนับ 24 ชม. เริ่มนับใหม่ทุกครั้ง วันที่ deploy บ่อยกว่าวันละครั้ง
 *      รอบตามกำหนดจึงไม่เคยยิงเลยสักครั้ง (ยืนยันจาก log จริง: ทุกบรรทัดของ
 *      [ComponentChange] ตั้งแต่ 3 ก.ย. เป็นรอบตอนบูตทั้งหมด)
 *   2. รอบตอนบูตยิงทุก restart งานที่ตั้งใจให้ทำวันละครั้งจึงถูกยิงซ้ำ
 *      หลายรอบในวันเดียว
 *
 * ตัวนี้ผูกกับ "วันตามปฏิทินไทย" แทนเวลาที่ process มีชีวิตอยู่ โดยจำวันที่
 * รันสำเร็จล่าสุดไว้ใน SystemSetting (ตาราง key/value ที่มีอยู่แล้ว ไม่ต้อง
 * migrate) แล้วตื่นมาเช็คเป็นระยะ ผลคือ
 *
 *   - restart กี่ครั้งในวันเดียวก็รันแค่ครั้งเดียว
 *   - ถ้าเซิร์ฟเวอร์ดับคร่อมเวลาที่นัดไว้ รอบถัดไปที่ตื่นมาจะรันตามให้
 *   - เวลาที่รันไม่ผูกกับว่า deploy ตอนไหน
 */
import { prisma } from '../lib/prisma';

/** ตื่นมาเช็คทุก 15 นาที ถูกกว่าการตั้งเวลาแบบแม่นยำมาก และคลาดได้ไม่เกิน 15 นาที */
const TICK_MS = 15 * 60 * 1000;
const TZ = 'Asia/Bangkok';

/** วันตามปฏิทินไทยในรูป YYYY-MM-DD */
const bangkokDay = (d: Date = new Date()) => d.toLocaleDateString('en-CA', { timeZone: TZ });

/** นาทีนับจากเที่ยงคืนตามเวลาไทย ใช้เทียบกับเวลาที่นัดไว้ */
const bangkokMinutes = (d: Date = new Date()) => {
  const [h, m] = d.toLocaleString('en-GB', {
    timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false,
  }).split(':').map(Number);
  return h * 60 + m;
};

const settingKey = (name: string) => `JOB_LAST_RUN_${name}`;

async function readLastRunDay(name: string): Promise<string | null> {
  try {
    const row = await prisma.systemSetting.findUnique({ where: { key: settingKey(name) } });
    return row?.value || null;
  } catch (err) {
    // อ่านไม่ได้ = ถือว่ายังไม่เคยรัน ยอมให้รันซ้ำดีกว่าข้ามไปเงียบ ๆ
    console.error(`[${name}] Could not read last-run marker:`, err);
    return null;
  }
}

async function writeLastRunDay(name: string, day: string): Promise<void> {
  try {
    await prisma.systemSetting.upsert({
      where: { key: settingKey(name) },
      create: {
        key: settingKey(name), value: day, group: 'JOBS',
        description: `วันที่ job ${name} ทำงานสำเร็จล่าสุด (เวลาไทย)`,
      },
      update: { value: day },
    });
  } catch (err) {
    // เขียนไม่ได้แปลว่าพรุ่งนี้อาจรันซ้ำ ซึ่งรับได้ ทั้งสาม job เป็นแบบ
    // idempotent — เขียนทับ snapshot เดิม ไม่ได้ต่อท้ายซ้ำ
    console.error(`[${name}] Could not write last-run marker:`, err);
  }
}

export interface DailyJob {
  /** ใช้เป็นทั้ง tag ใน log และ key ใน SystemSetting */
  name: string;
  /** ชั่วโมงตามเวลาไทยที่อยากให้รัน (0–23) */
  hour: number;
  /** นาที (0–59) ใช้เหลื่อมเวลา job ที่ไม่อยากให้ชนกัน — ละเอียดได้ถึงระดับ
   *  รอบตื่น 15 นาที คือจะรันที่รอบแรกหลังเวลานี้ */
  minute?: number;
  run: () => Promise<void>;
}

/**
 * เริ่มจับเวลาให้ job รายวันหนึ่งตัว
 *
 * คืนฟังก์ชันสำหรับหยุด เผื่อการทดสอบ — โค้ดจริงปล่อยให้รันไปจนกว่า process จะจบ
 */
export function scheduleDaily(job: DailyJob): () => void {
  let running = false;

  const tick = async () => {
    // กันรอบที่ทับกันเอง งานที่กวาดทั้ง fleet ใช้เวลาเกิน 15 นาทีได้
    if (running) return;

    const today = bangkokDay();
    if (await readLastRunDay(job.name) === today) return;
    if (bangkokMinutes() < job.hour * 60 + (job.minute ?? 0)) return;

    running = true;
    try {
      await job.run();
      // บันทึกวันหลังรันเสร็จเท่านั้น ถ้ารอบนี้ล้ม รอบถัดไปจะลองใหม่ให้เอง
      await writeLastRunDay(job.name, today);
    } finally {
      running = false;
    }
  };

  // เช็ครอบแรกหลังบูต 30 วินาที ให้ระบบตั้งตัวเสร็จก่อน ถ้าวันนี้รันไปแล้ว
  // รอบนี้จะไม่ทำอะไร — นี่คือจุดที่กัน restart ไม่ให้ยิงงานซ้ำ
  const first = setTimeout(() => { void tick(); }, 30_000);
  const timer = setInterval(() => { void tick(); }, TICK_MS);

  const at = `${String(job.hour).padStart(2, '0')}:${String(job.minute ?? 0).padStart(2, '0')}`;
  console.log(`[${job.name}] Scheduled daily at ~${at} ${TZ} (survives restarts)`);

  return () => { clearTimeout(first); clearInterval(timer); };
}
