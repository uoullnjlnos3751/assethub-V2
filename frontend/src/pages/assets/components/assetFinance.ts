/**
 * Straight-line depreciation for an asset.
 *
 * usefulLifeYears / salvageValue have been collected on the asset form since
 * the finance fields landed, but were never surfaced anywhere in the UI — this
 * is what turns them into the book value shown on the detail page.
 *
 * Returns null when the asset lacks the inputs to compute anything meaningful
 * (no price, no purchase date, or no useful-life set), so callers can hide the
 * card entirely rather than render a bar full of zeroes.
 */
export interface Depreciation {
  cost: number;
  salvage: number;
  lifeYears: number;
  elapsedYears: number;
  /** Portion of the depreciable base already written off (0–1). */
  pct: number;
  accumulated: number;
  bookValue: number;
  fullyDepreciated: boolean;
  /** Calendar date the asset finishes depreciating. */
  endDate: Date;
}

export function calcDepreciation(asset: {
  purchasePrice?: number | null;
  purchaseDate?: string | Date | null;
  usefulLifeYears?: number | null;
  salvageValue?: number | null;
}): Depreciation | null {
  const cost = Number(asset.purchasePrice);
  const lifeYears = Number(asset.usefulLifeYears);
  if (!asset.purchaseDate || !Number.isFinite(cost) || cost <= 0) return null;
  if (!Number.isFinite(lifeYears) || lifeYears <= 0) return null;

  const start = new Date(asset.purchaseDate);
  if (Number.isNaN(start.getTime())) return null;

  const salvage = Math.max(0, Math.min(cost, Number(asset.salvageValue) || 0));
  const MS_PER_YEAR = 365.25 * 86400000;
  const elapsedYears = Math.max(0, (Date.now() - start.getTime()) / MS_PER_YEAR);

  const base = cost - salvage;
  const pct = base > 0 ? Math.max(0, Math.min(1, elapsedYears / lifeYears)) : 1;
  const accumulated = base * pct;

  const endDate = new Date(start.getTime() + lifeYears * MS_PER_YEAR);

  return {
    cost,
    salvage,
    lifeYears,
    elapsedYears,
    pct,
    accumulated,
    bookValue: cost - accumulated,
    fullyDepreciated: elapsedYears >= lifeYears,
    endDate,
  };
}

/**
 * Repair spend measured against what the asset originally cost — the number
 * that actually drives a repair-or-replace call. Mirrors the "ค่าซ่อมเทียบ
 * ราคาทุน" tile in the design handoff.
 *
 * The 50% threshold is the common IT rule of thumb, and is deliberately
 * advisory: the UI presents it as a suggestion for a human to act on, never as
 * an automatic status change.
 */
export type RepairVerdict = 'worth' | 'watch' | 'replace';

export interface RepairRatio {
  totalCost: number;
  cost: number;
  /** Repair spend ÷ purchase price (0–1+). */
  ratio: number;
  repairCount: number;
  verdict: RepairVerdict;
}

export function calcRepairRatio(
  purchasePrice: number | null | undefined,
  records: { totalCost?: number | null }[],
): RepairRatio | null {
  const cost = Number(purchasePrice);
  if (!Number.isFinite(cost) || cost <= 0) return null;

  const totalCost = records.reduce((sum, r) => sum + (Number(r.totalCost) || 0), 0);
  const ratio = totalCost / cost;

  let verdict: RepairVerdict = 'worth';
  if (ratio >= 0.5) verdict = 'replace';
  else if (ratio >= 0.3) verdict = 'watch';

  return { totalCost, cost, ratio, repairCount: records.length, verdict };
}

export const REPAIR_VERDICT_LABEL: Record<RepairVerdict, string> = {
  worth: 'ยังคุ้มค่าซ่อม · ไม่ต้องทดแทน',
  watch: 'ค่าซ่อมเริ่มสูง · ควรเฝ้าระวัง',
  replace: 'ค่าซ่อมเกินครึ่งราคาทุน · ควรพิจารณาทดแทน',
};

export const fmtBaht = (n: number) => `฿${Math.round(n).toLocaleString('th-TH')}`;
