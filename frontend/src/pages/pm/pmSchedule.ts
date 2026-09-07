import { Theme } from '@mui/material';

/**
 * PM schedule model — the timeline view of the plans.
 *
 * Separate from pmCoverage.ts on purpose: coverage asks "which machines are
 * covered", this asks "when is each plan supposed to run and is it on time".
 * The status vocabularies differ accordingly — a plan here can be
 * ยังไม่ถึงกำหนด, which is meaningless when you are counting machines.
 */

/** A plan as returned by GET /pm/plans. */
export interface RawPlan {
  id: number;
  year: number;
  site: string | null;
  deptTask: string | null;
  company: string | null;
  lead: string | null;
  deviceType: string | null;
  plannedDeviceCount: number;
  startDate: string | null;
  endDate: string | null;
  isAdhoc: boolean;
  totalCount: number;
  completedCount: number;
  /** งานที่ตั้งวันนัดไว้แล้ว และช่วงวันนัดจริง (YYYY-MM-DD) — ว่างเมื่อยังไม่มี
   *  การนัดสักเครื่อง */
  scheduledCount?: number;
  schedStart?: string | null;
  schedEnd?: string | null;
  /** แผนกจริงของงานที่สร้างไว้แล้วในแผนนี้ พร้อมจำนวนของแต่ละแผนก มาจาก
   *  /pm/plans — จำเป็นสำหรับแผนที่เลือก "ทุกแผนก" ไว้ เพราะตัวแผนเองไม่ได้เก็บ
   *  ว่ากินแผนกไหนบ้าง รู้ได้จากงานที่สร้างจริงเท่านั้น */
  deptBreakdown?: {
    dept: string; total: number; done: number;
    scheduled?: number; schedStart?: string | null; schedEnd?: string | null;
  }[];
}

export type PlanState = 'DONE' | 'OVERDUE' | 'RUNNING' | 'IDLE';

/** Fixed order, fixed colour — a filter that hides one never repaints the rest. */
export const PLAN_STATES: { key: PlanState; label: string }[] = [
  { key: 'DONE', label: 'เสร็จสิ้น' },
  { key: 'OVERDUE', label: 'เกินกำหนด' },
  { key: 'RUNNING', label: 'กำลังดำเนินการ' },
  { key: 'IDLE', label: 'ยังไม่ถึงกำหนด' },
];

export const PLAN_STATE_LABEL: Record<PlanState, string> =
  PLAN_STATES.reduce((a, s) => ({ ...a, [s.key]: s.label }), {} as Record<PlanState, string>);

/**
 * Bar colours, drawn from theme.ts rather than picked fresh.
 *
 * Checked rather than eyeballed — the first attempt used the accent teal for
 * RUNNING and it sat ΔE 14.3 from the green, below the normal-vision floor.
 * Swapping to the info blue gives adjacent CVD separation ΔE 12.0 and a
 * normal-vision worst pair of 25.4, with every step ≥3:1 on the surface. The
 * grey is deliberately low-chroma: "not started yet" is an absence, not an
 * alarm. Every bar also carries its counts and a status pill, so nothing
 * depends on hue alone.
 */
export function planStateColors(theme: Theme): Record<PlanState, string> {
  const dark = theme.palette.mode === 'dark';
  return {
    DONE: dark ? theme.palette.success.main : theme.palette.success.dark,
    OVERDUE: theme.palette.error.main,
    RUNNING: theme.palette.info.main,
    IDLE: dark ? '#94a3b8' : '#54637a',
  };
}

/** Normalised plan used by every part of the page. */
export interface SchedPlan {
  id: number;
  company: string;
  dept: string;
  site: string | null;
  deviceType: string | null;
  lead: string | null;
  /** Denominator for progress and status: the runs that actually exist and are
   *  still relevant, falling back to the target when none were generated. */
  total: number;
  /** What the plan was created to cover. Can exceed `total` when Generate
   *  produced fewer tasks than intended — a real shortfall, so it is kept
   *  rather than folded away. */
  target: number;
  done: number;
  /** กรอบของแผน — วันที่ตั้งไว้ตอนสร้างแผน */
  start: string | null;
  end: string | null;
  /** ช่วงวันนัดจริงของงานในกลุ่มนี้ และจำนวนที่นัดแล้ว */
  schedStart: string | null;
  schedEnd: string | null;
  scheduled: number;
  isAdhoc: boolean;
  state: PlanState;
  deptBreakdown?: {
    dept: string; total: number; done: number;
    scheduled?: number; schedStart?: string | null; schedEnd?: string | null;
  }[];
}

/**
 * ช่วงเวลาที่แท่งกราฟควรวาด
 *
 * ใช้วันนัดจริงเมื่อมีการนัดแล้ว เพราะนั่นคือสิ่งที่ทีมจะไปทำจริง ๆ ส่วนกรอบของ
 * แผนเป็นเพียงขอบเขตกว้าง ๆ ที่ตั้งไว้ตอนสร้าง — แผนเดียวกินทั้งเดือนแต่แผนก SAL
 * ลงจริงแค่ 7–11 ก.ย. ถ้าวาดตามกรอบแผนทุกแถวจะยาวเท่ากันหมดจนอ่านไม่ได้ว่า
 * ใครทำเมื่อไหร่
 *
 * `booked` แยกไว้ให้ผู้เรียกรู้ว่าแท่งนี้เป็นวันนัดจริงหรือกรอบแผนที่ยังไม่ได้นัด
 */
export function barRange(p: { start: string | null; end: string | null; schedStart: string | null; schedEnd: string | null }) {
  if (p.schedStart && p.schedEnd) return { start: p.schedStart, end: p.schedEnd, booked: true };
  return { start: p.start, end: p.end, booked: false };
}

const UNSET_COMPANY = '(ไม่ระบุบริษัท)';
const ALL_DEPTS = 'ทุกแผนก';

export function normalise(raw: RawPlan[], today: Date): SchedPlan[] {
  return raw.map(p => {
    // /pm/plans already drops runs whose asset left service, so totalCount is
    // the work that still matters. Using max() against the target instead made
    // a finished plan read "19/20 · เสร็จสิ้น" — the label and the fraction
    // disagreeing because they were computed from different denominators.
    const total = p.totalCount > 0 ? p.totalCount : p.plannedDeviceCount;
    const start = p.startDate ? p.startDate.slice(0, 10) : null;
    const end = p.endDate ? p.endDate.slice(0, 10) : null;
    return {
      id: p.id,
      company: p.company || UNSET_COMPANY,
      /* แผนที่ไม่ระบุแผนกคือแผนที่ครอบคลุมทุกแผนก ไม่ใช่แผน "ไม่มีชื่อ" ที่ต้องไป
         หยิบชื่อสถานที่มาใช้แทน — ของเดิมตกไปใช้ site ทำให้แผนของบริษัท TRR ที่
         เลือกทุกแผนกไว้ ขึ้นเป็นแถวชื่อ "HQ" แถวเดียว อ่านได้เป็นว่ามีแค่แผนก HQ
         ทั้งที่ไม่มีแผนกชื่อนี้อยู่จริง (HQ เป็นสถานที่) */
      dept: p.deptTask || (p.isAdhoc ? `แผน #${p.id}` : ALL_DEPTS),
      site: p.site,
      deptBreakdown: p.deptBreakdown,
      deviceType: p.deviceType,
      lead: p.lead,
      total,
      target: p.plannedDeviceCount,
      done: p.completedCount,
      start,
      end,
      schedStart: p.schedStart ?? null,
      schedEnd: p.schedEnd ?? null,
      scheduled: p.scheduledCount ?? 0,
      isAdhoc: p.isAdhoc,
      // สถานะยังตัดสินจากกรอบของแผน ไม่ใช่วันนัด — "เกินกำหนด" หมายถึงเลย
      // กำหนดส่งของแผน ซึ่งเป็นข้อผูกพันจริง ส่วนวันนัดเลื่อนได้ตลอดโดยไม่ได้
      // แปลว่าแผนพลาด (งานที่เลยวันนัดรายเครื่องเตือนอยู่แล้วในหน้า PM Runs)
      state: stateOf(p.completedCount, p.totalCount, start, end, today),
    };
  });
}

function stateOf(done: number, generated: number, start: string | null, end: string | null, today: Date): PlanState {
  if (generated > 0 && done >= generated) return 'DONE';
  if (!start || !end) return 'IDLE';
  if (day(end) < today) return 'OVERDUE';
  if (day(start) <= today) return 'RUNNING';
  return 'IDLE';
}

export const day = (iso: string) => new Date(`${iso}T00:00:00`);
export const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

export const TH_MONTH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
export const thDate = (x: Date) => `${x.getDate()} ${TH_MONTH[x.getMonth()]}`;

/* ── filters ─────────────────────────────────────────────────────────── */

export interface SchedSelection {
  state: Set<PlanState>;
  company: Set<string>;
  dept: Set<string>;
}

export const emptySchedSelection = (): SchedSelection => ({
  state: new Set(), company: new Set(), dept: new Set(),
});

export const schedSelectionActive = (s: SchedSelection) =>
  s.state.size > 0 || s.company.size > 0 || s.dept.size > 0;

/**
 * `skip` names the dimension that must not filter itself — otherwise picking
 * one company leaves its own chip row with a single option.
 */
export function matchesPlan(
  p: SchedPlan, sel: SchedSelection, skip: 'state' | 'company' | 'dept' | null,
): boolean {
  if (skip !== 'state' && sel.state.size && !sel.state.has(p.state)) return false;
  if (skip !== 'company' && sel.company.size && !sel.company.has(p.company)) return false;
  if (skip !== 'dept' && sel.dept.size && !sel.dept.has(p.dept)) return false;
  return true;
}

/* ── grouping ────────────────────────────────────────────────────────── */

export interface SchedGroup {
  name: string;
  plans: SchedPlan[];
  done: number;
  total: number;
  target: number;
  /** ช่วงที่แท่งของกลุ่มนี้กิน — วันนัดจริงถ้ามี ไม่งั้นคือกรอบของแผน */
  start: string;
  end: string;
  /** จำนวนที่ตั้งวันนัดแล้ว และกลุ่มนี้วาดจากวันนัดจริงหรือยัง */
  scheduled: number;
  booked: boolean;
}

export function rollup(plans: SchedPlan[], key: 'company' | 'dept'): SchedGroup[] {
  const map = new Map<string, SchedGroup>();
  for (const p of plans) {
    const r = barRange(p);
    if (!r.start || !r.end) continue;
    const name = p[key];
    let g = map.get(name);
    if (!g) {
      g = { name, plans: [], done: 0, total: 0, target: 0, start: r.start, end: r.end, scheduled: 0, booked: false };
      map.set(name, g);
    }
    g.plans.push(p);
    g.done += p.done;
    g.total += p.total;
    g.target += p.target;
    g.scheduled += p.scheduled;
    // กลุ่มนับว่า "ตามวันนัดจริง" เมื่อมีแผนใดในกลุ่มนัดแล้ว ช่วงของกลุ่มจึงเป็น
    // ช่วงที่ครอบทั้งวันนัดจริงและกรอบของแผนที่ยังไม่ได้นัด
    if (r.booked) g.booked = true;
    if (r.start < g.start) g.start = r.start;
    if (r.end > g.end) g.end = r.end;
  }
  return [...map.values()].sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
}

/**
 * เหมือน rollup(plans, 'dept') แต่กางแผนที่เลือก "ทุกแผนก" ออกเป็นรายแผนกจริง
 *
 * แผนหนึ่งใบที่ครอบคลุมทุกแผนกเคยได้แถวเดียวในตารางรายแผนก ทั้งที่ข้างในมีงาน
 * กระจายอยู่ 27 แผนก ซึ่งเป็นข้อมูลที่หน้านี้มีไว้เพื่อแสดงโดยเฉพาะ ที่นี่จึงตัดแผน
 * แบบนั้นเป็นชิ้นละแผนกตามงานที่สร้างจริง แต่ละชิ้นถือจำนวนของแผนกตัวเอง แถบ
 * ในกราฟจึงยาวตามความคืบหน้าของแผนกนั้นจริง ๆ ไม่ใช่ของทั้งแผน
 *
 * เป้าหมาย (target) ของชิ้นย่อยตั้งเท่ากับจำนวนงานที่สร้างแล้วของแผนกนั้น เพราะ
 * เป้าหมายเป็นตัวเลขระดับแผน ไม่มีการตั้งแยกรายแผนก การเฉลี่ยลงไปจะเป็นการแต่ง
 * ตัวเลขที่ไม่มีอยู่จริง — ส่วนเป้าหมายจริงของแผนยังอ่านได้จากตารางรายบริษัทและ
 * ชีต "รายแผน" ซึ่งยังใช้ตัวแผนเต็มใบเหมือนเดิม
 */
export function rollupDepartments(plans: SchedPlan[]): SchedGroup[] {
  const expanded: SchedPlan[] = [];
  for (const p of plans) {
    // กางเฉพาะแผนที่เป็น "ทุกแผนก" จริง ๆ และมีงานสร้างไว้แล้ว — แผนที่ยังไม่ได้
    // generate ไม่มีงานให้ดูว่าตกแผนกไหน จึงคงเป็นแถวเดียวชื่อ "ทุกแผนก" ตามเดิม
    if (p.dept !== ALL_DEPTS || !p.deptBreakdown?.length) { expanded.push(p); continue; }
    for (const d of p.deptBreakdown) {
      // แต่ละแผนกถือวันนัดของตัวเอง ไม่ใช่ของทั้งแผน — นี่คือจุดที่กราฟเริ่ม
      // บอกได้ว่า SAL ลง 7–11 ก.ย. ส่วน ACC ลง 14 ก.ย.
      expanded.push({
        ...p, dept: d.dept, done: d.done, total: d.total, target: d.total,
        schedStart: d.schedStart ?? null,
        schedEnd: d.schedEnd ?? null,
        scheduled: d.scheduled ?? 0,
      });
    }
  }
  return rollup(expanded, 'dept');
}

/**
 * A group is only as healthy as its worst plan — one overdue plan makes the
 * whole company row overdue. Averaging it into green would hide exactly the
 * thing the roll-up exists to surface.
 */
export function groupState(g: SchedGroup): PlanState {
  if (g.plans.some(p => p.state === 'OVERDUE')) return 'OVERDUE';
  if (g.plans.every(p => p.state === 'DONE')) return 'DONE';
  if (g.plans.some(p => p.state === 'RUNNING')) return 'RUNNING';
  return 'IDLE';
}

/* ── timeline ────────────────────────────────────────────────────────── */

export const DAY_MS = 86_400_000;

export function monday(x: Date) {
  const t = new Date(x);
  const dow = t.getDay();
  t.setDate(t.getDate() - (dow === 0 ? 6 : dow - 1));
  t.setHours(0, 0, 0, 0);
  return t;
}

export interface Timeline {
  t0: Date;
  weeks: number;
  span: number;
  weekStarts: Date[];
  /** Fraction across the axis, clamped so a stray date cannot escape its lane. */
  frac: (x: Date) => number;
  months: { label: string; weeks: number }[];
}

/**
 * Whole Mon-start weeks covering every dated plan.
 *
 * วัดจากช่วงที่แท่งกินจริง (barRange) ไม่ใช่กรอบของแผน — ถ้าวันนัดถูกเลื่อนออก
 * ไปพ้นกำหนดของแผน แกนเวลาต้องยืดตาม ไม่งั้นแท่งจะถูกหนีบติดขอบขวาโดยไม่มีอะไร
 * บอกว่ามันเลยกรอบไปแล้ว
 */
export function buildTimeline(plans: SchedPlan[]): Timeline | null {
  const dated = plans.map(barRange).filter(r => r.start && r.end);
  if (!dated.length) return null;

  const t0 = monday(new Date(Math.min(...dated.map(r => day(r.start!).getTime()))));
  const last = monday(new Date(Math.max(...dated.map(r => day(r.end!).getTime()))));
  const tEnd = new Date(last); tEnd.setDate(tEnd.getDate() + 7);   // exclusive
  const weeks = Math.round((tEnd.getTime() - t0.getTime()) / (7 * DAY_MS));
  const span = tEnd.getTime() - t0.getTime();

  const weekStarts: Date[] = [];
  for (let i = 0; i < weeks; i++) {
    const w = new Date(t0); w.setDate(w.getDate() + i * 7); weekStarts.push(w);
  }

  const months: { label: string; weeks: number }[] = [];
  let cur: { key: string; label: string; weeks: number } | null = null;
  for (const w of weekStarts) {
    const key = `${w.getFullYear()}-${w.getMonth()}`;
    if (!cur || cur.key !== key) {
      cur = { key, label: `${TH_MONTH[w.getMonth()]} ${(w.getFullYear() + 543) % 100}`, weeks: 0 };
      months.push(cur);
    }
    cur.weeks++;
  }

  return {
    t0, weeks, span, weekStarts, months,
    frac: (x: Date) => Math.max(0, Math.min(1, (x.getTime() - t0.getTime()) / span)),
  };
}

/** Human-readable description of the active filters — printed and exported. */
export function schedScopeBits(sel: SchedSelection): string[] {
  const bits: string[] = [];
  if (sel.company.size) bits.push(`บริษัท: ${[...sel.company].join(', ')}`);
  if (sel.dept.size) bits.push(`แผนก: ${[...sel.dept].join(', ')}`);
  if (sel.state.size) {
    bits.push(`สถานะ: ${PLAN_STATES.filter(s => sel.state.has(s.key)).map(s => s.label).join(', ')}`);
  }
  return bits;
}

export const schedScopeSummary = (sel: SchedSelection) =>
  schedScopeBits(sel).join('  ·  ') || 'ทุกบริษัท ทุกแผนก ทุกสถานะ';
