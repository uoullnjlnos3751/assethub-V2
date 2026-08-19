import { Theme } from '@mui/material';

/**
 * PM coverage model — shared by the dashboard's charts, its table and its
 * exports so the three can never disagree about what a number means.
 *
 * The distinction this file exists to make: the old dashboard measured
 * progress *inside* the plans (97 of 144 done = 67%), which looked healthy
 * while four fifths of the fleet had never been put in a plan at all. Here
 * every PM-eligible asset is one row in exactly one of three states, so
 * "ยังไม่ได้สร้างแผน" is a first-class number rather than an absence.
 */

/** One PM-eligible asset. Keys are short because the payload is one row per asset. */
export interface CoverageRow {
  /** assetCode */      a: string;
  /** serialNo */       n: string;
  /** ownerName */      o: string;
  /** type */           t: string;
  /** company */        c: string;
  /** departmentId */   d: string;
  /** location */       l: string;
  /** state */          s: CoverageState;
}

export type CoverageState = 'DONE' | 'PENDING' | 'UNPLANNED';

export interface CoveragePlan {
  id: number;
  site: string | null;
  dept: string | null;
  company: string | null;
  lead: string | null;
  deviceType: string | null;
  planned: number;
  generated: number;
  done: number;
  startDate: string | null;
  endDate: string | null;
  isAdhoc: boolean;
}

export interface CoveragePayload {
  year: number;
  generated: string;
  rows: CoverageRow[];
  plans: CoveragePlan[];
  monthly: Record<string, number>;
}

export interface Selection {
  state: Set<CoverageState>;
  company: Set<string>;
  type: Set<string>;
}

export const emptySelection = (): Selection => ({
  state: new Set<CoverageState>(),
  company: new Set<string>(),
  type: new Set<string>(),
});

export const selectionActive = (sel: Selection) =>
  sel.state.size > 0 || sel.company.size > 0 || sel.type.size > 0;

/**
 * Fixed order, fixed colour. The three states are one ordinal dimension, so
 * they always render in this sequence and a filter that hides one never
 * repaints the survivors.
 */
export const STATES: { key: CoverageState; label: string }[] = [
  { key: 'DONE', label: 'ทำ PM เสร็จแล้ว' },
  { key: 'PENDING', label: 'อยู่ในแผน รอทำ' },
  { key: 'UNPLANNED', label: 'ยังไม่ได้สร้างแผน' },
];

export const STATE_LABEL: Record<CoverageState, string> =
  STATES.reduce((acc, s) => ({ ...acc, [s.key]: s.label }), {} as Record<CoverageState, string>);

/**
 * Chart colours, drawn from the palette in theme.ts rather than picked fresh.
 *
 * Green/amber is the classic protanope collision, so the pair was checked
 * rather than eyeballed: light mode uses success.dark (#047857) against
 * warning.main (#c2820a) for a CVD separation of ΔE 11.9, comfortably past
 * the ΔE 8 floor; dark mode's #34d399 / #fbbf24 clears it at 10.6. The in-bar
 * count labels are the secondary encoding, so the segments never depend on
 * hue alone. The grey is the handoff's `retired` token — deliberately low-chroma
 * because "no plan" is an absence, not an alarm.
 */
export function stateColors(theme: Theme): Record<CoverageState, string> {
  const dark = theme.palette.mode === 'dark';
  return {
    DONE: dark ? theme.palette.success.main : theme.palette.success.dark,
    PENDING: theme.palette.warning.main,
    UNPLANNED: dark ? '#94a3b8' : '#54637a',
  };
}

export interface Tally {
  DONE: number;
  PENDING: number;
  UNPLANNED: number;
  total: number;
}

export const emptyTally = (): Tally => ({ DONE: 0, PENDING: 0, UNPLANNED: 0, total: 0 });

export function tally(rows: CoverageRow[]): Tally {
  const t = emptyTally();
  for (const r of rows) { t[r.s]++; t.total++; }
  return t;
}

/**
 * `skip` names the dimension that should NOT filter itself. Without it,
 * picking one company would leave the by-company chart with a single bar and
 * destroy the comparison the chart exists to make.
 */
export function matches(row: CoverageRow, sel: Selection, skip: 'state' | 'company' | 'type' | null): boolean {
  if (skip !== 'state' && sel.state.size && !sel.state.has(row.s)) return false;
  if (skip !== 'company' && sel.company.size && !sel.company.has(row.c)) return false;
  if (skip !== 'type' && sel.type.size && !sel.type.has(row.t)) return false;
  return true;
}

export const filterRows = (rows: CoverageRow[], sel: Selection, skip: 'state' | 'company' | 'type' | null) =>
  rows.filter(r => matches(r, sel, skip));

export interface Group extends Tally { name: string }

export function groupBy(
  rows: CoverageRow[], sel: Selection, key: 'c' | 't', skip: 'company' | 'type',
): Group[] {
  const map = new Map<string, Group>();
  for (const r of rows) {
    if (!matches(r, sel, skip)) continue;
    const name = r[key];
    let g = map.get(name);
    if (!g) { g = { name, ...emptyTally() }; map.set(name, g); }
    g[r.s]++; g.total++;
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

/** Counts across the whole dataset, for the filter chips. */
export function dimensionCounts(rows: CoverageRow[], key: 'c' | 't'): { name: string; count: number }[] {
  const map = new Map<string, number>();
  for (const r of rows) map.set(r[key], (map.get(r[key]) || 0) + 1);
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

/** Plans carry their own company/type tags, so they filter on those directly. */
export function filterPlans(plans: CoveragePlan[], sel: Selection): CoveragePlan[] {
  return plans.filter(p => {
    if (sel.company.size && !(p.company && sel.company.has(p.company))) return false;
    if (sel.type.size && !(p.deviceType && sel.type.has(p.deviceType))) return false;
    return true;
  });
}

export type PlanStatusKey = 'NOT_GENERATED' | 'DONE' | 'OVERDUE' | 'RUNNING';

export function planStatus(p: CoveragePlan): { key: PlanStatusKey; label: string } {
  const progress = pct(p.done, p.generated || p.planned);
  const end = p.endDate ? new Date(p.endDate) : null;
  if (p.generated === 0) return { key: 'NOT_GENERATED', label: 'ยังไม่ Generate' };
  if (progress >= 100) return { key: 'DONE', label: 'เสร็จสิ้น' };
  if (end && new Date() > end) return { key: 'OVERDUE', label: 'เกินกำหนด' };
  return { key: 'RUNNING', label: 'กำลังดำเนินการ' };
}

export function planStatusColor(theme: Theme, key: PlanStatusKey): string {
  const c = stateColors(theme);
  if (key === 'DONE') return c.DONE;
  if (key === 'OVERDUE') return theme.palette.error.main;
  if (key === 'RUNNING') return c.PENDING;
  return c.UNPLANNED;
}

/** Human-readable description of the active filters — printed and exported. */
export function scopeBits(sel: Selection): string[] {
  const bits: string[] = [];
  if (sel.company.size) bits.push(`บริษัท: ${[...sel.company].join(', ')}`);
  if (sel.type.size) bits.push(`ประเภทอุปกรณ์: ${[...sel.type].join(', ')}`);
  if (sel.state.size) {
    bits.push(`สถานะ: ${STATES.filter(s => sel.state.has(s.key)).map(s => s.label).join(', ')}`);
  }
  return bits;
}

export const scopeSummary = (sel: Selection) =>
  scopeBits(sel).join('  ·  ') || 'ทุกบริษัท ทุกประเภทอุปกรณ์ ทุกสถานะ';
