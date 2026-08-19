/**
 * Coverage gaps on the plan page — scope that no PM plan covers.
 *
 * The plan list could say what had been planned but never what had not, which
 * is the question you are actually there to answer when you open it. Backed by
 * GET /pm/plans/gaps.
 */

export interface PlanGap {
  company: string;
  dept: string;
  type: string;
  /** Eligible machines in this company/department/type. */
  total: number;
  /** Of those, the ones with no PM run at all this year — the number to act on. */
  free: number;
}

export interface GapPayload {
  year: number;
  gaps: PlanGap[];
  totalFree: number;
}

export const gapKey = (g: PlanGap) => `${g.company}|${g.dept}|${g.type}`;

/** Gaps narrowed by the page's company/type chips. Plan status never applies:
 *  it describes plans that exist, and these rows are scope that has none. */
export function visibleGaps(gaps: PlanGap[], company: Set<string>, type: Set<string>): PlanGap[] {
  return gaps.filter(g => {
    if (company.size && !company.has(g.company)) return false;
    if (type.size && !type.has(g.type)) return false;
    return true;
  });
}

export interface GapCompany { name: string; free: number; groups: number }

/** Counts for the chip row inside the gap card — machines, not plans. Skips
 *  the company dimension so a selection never hides the alternatives. */
export function gapsByCompany(gaps: PlanGap[], type: Set<string>, selected: Set<string>): GapCompany[] {
  const map = new Map<string, GapCompany>();
  for (const g of gaps) {
    if (type.size && !type.has(g.type)) continue;
    let c = map.get(g.company);
    if (!c) { c = { name: g.company, free: 0, groups: 0 }; map.set(g.company, c); }
    c.free += g.free;
    c.groups++;
  }
  selected.forEach(n => { if (!map.has(n)) map.set(n, { name: n, free: 0, groups: 0 }); });
  return [...map.values()].sort((a, b) => b.free - a.free || a.name.localeCompare(b.name, 'th'));
}

/**
 * What a set of picked gap rows turns into.
 *
 * One plan carries one company and one device type, so a mixed selection has
 * to become several plans. Counting the distinct (company, type) pairs that
 * were actually picked — not the product of the two lists — is the difference
 * between telling someone "2 แผน" and "4 แผน" for the same three clicks.
 */
export interface MergePreview {
  chosen: PlanGap[];
  units: number;
  companies: string[];
  types: string[];
  depts: string[];
  /** Distinct company+type pairs present in the selection. */
  splits: number;
  /** Prefill for the create form when the selection makes exactly one plan. */
  single: { company: string; dept: string; type: string; count: number } | null;
}

export function mergePreview(gaps: PlanGap[], picked: Set<string>): MergePreview | null {
  const chosen = gaps.filter(g => picked.has(gapKey(g)));
  if (!chosen.length) return null;

  const companies = [...new Set(chosen.map(g => g.company))];
  const types = [...new Set(chosen.map(g => g.type))];
  const depts = [...new Set(chosen.map(g => g.dept))];
  const pairs = [...new Set(chosen.map(g => `${g.company}|${g.type}`))];
  const units = chosen.reduce((a, g) => a + g.free, 0);

  return {
    chosen, units, companies, types, depts,
    splits: pairs.length,
    // An empty dept means "every department in this company", which is how a
    // merge of several departments is expressed to the planner.
    single: pairs.length === 1
      ? { company: companies[0], dept: depts.length === 1 ? depts[0] : '', type: types[0], count: units }
      : null,
  };
}
