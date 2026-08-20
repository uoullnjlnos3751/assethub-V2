import { agentValueSatisfied } from './externalAgent';

/**
 * Reconciling a GLPI hardware record against the registry.
 *
 * GLPI reports far more than the sync used to write: it has the brand, model,
 * both RAM slots, both disks and the GPU, and none of those ever reached the
 * asset. "ปรับปรุงตาม GLPI" touched seven fields and silently ignored the rest.
 *
 * Widening it is not simply a matter of copying more keys across, because GLPI
 * is not uniformly the better source. Sampled against real machines:
 *
 *   Dell                     vs  Dell Inc.                       same maker
 *   Windows 11 Pro 64 bit    vs  Windows                         GLPI is coarser
 *   512GB                    vs  PM9C1a Samsung 512GB 500 GB     GLPI is better
 *   1 TB                     vs  Ambient Light Sensor            GLPI is wrong
 *   Unchana Soparp           vs  unchana.sop@TRRGROUP            different thing
 *   Intel Arc Pro 140T       vs  NVIDIA RTX PRO 1000             both real (dual GPU)
 *
 * So each field is classified rather than copied. Blanks and strictly-better
 * values apply on their own; a genuine disagreement is shown and waits for
 * someone to click it, which is the same rule the agent sync already follows.
 */

export type GlpiFieldState = 'same' | 'fill' | 'better' | 'diff';

export interface GlpiField {
  /** Key in the GLPI payload — also what the per-field sync button sends. */
  key: string;
  /** Column on Asset. */
  column: string;
  label: string;
  current: string | null;
  incoming: string;
  state: GlpiFieldState;
  /** True for columns that live on Asset alone, not on ComputerDetail. */
  assetOnly: boolean;
  note?: string;
}

interface FieldDef { column: string; label: string; assetOnly?: boolean; note?: string }

/** GLPI key → registry column, in the order the comparison is shown. */
const FIELDS: Record<string, FieldDef> = {
  name:      { column: 'assetName',       label: 'ชื่อคอมพิวเตอร์', assetOnly: true },
  user:      { column: 'ownerName',       label: 'ผู้ใช้งานหลัก (End User)', assetOnly: true,
               note: 'GLPI เก็บเป็นชื่อล็อกอิน ไม่ใช่ชื่อ-นามสกุล — ตรวจก่อนรับ' },
  brand:     { column: 'brand',           label: 'ยี่ห้อ', assetOnly: true },
  model:     { column: 'model',           label: 'รุ่น', assetOnly: true },
  cpu:       { column: 'cpu',             label: 'CPU' },
  ram:       { column: 'ram',             label: 'RAM' },
  ramSlot1:  { column: 'ramSlot1',        label: 'RAM Slot 1' },
  ramSlot2:  { column: 'ramSlot2',        label: 'RAM Slot 2' },
  storage1:  { column: 'storage1',        label: 'ดิสก์ 1' },
  storage2:  { column: 'storage2',        label: 'ดิสก์ 2' },
  gpu:       { column: 'gpu',             label: 'การ์ดจอ' },
  osType:    { column: 'osType',          label: 'ระบบปฏิบัติการ' },
  os:        { column: 'osVersion',       label: 'เวอร์ชัน OS' },
  license:   { column: 'windowsLicense',  label: 'Windows License' },
  msOffice:  { column: 'officeLicense',   label: 'MS Office' },
  antivirus: { column: 'antivirusStatus', label: 'Antivirus' },
  serial:    { column: 'snComputer',      label: 'Serial (เครื่อง)' },
};

const clean = (v: any): string => String(v ?? '').trim();
const key = (v: any) => clean(v).toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * "Dell" and "Dell Inc." are one maker. Without this every Dell in the fleet
 * reads as a mismatch, and a reconciliation tool that cries wolf stops being
 * read — the registry's shorter form is the one worth keeping.
 */
const CORP_SUFFIX = /\b(inc|co|ltd|corp|corporation|company|gmbh|technologies|technology|computers?|electronics)\b/g;
const brandKey = (v: any) => clean(v).toLowerCase().replace(CORP_SUFFIX, '').replace(/[^a-z0-9]/g, '');

/**
 * Fields whose value is a quantity. GLPI occasionally enumerates something that
 * is not a disk at all as one — an ambient light sensor turned up as storage2
 * on a real machine — and those never carry a number.
 */
const CAPACITY = new Set(['ram', 'ramSlot1', 'ramSlot2', 'storage1', 'storage2']);

function classify(glpiKey: string, current: any, incoming: string): GlpiFieldState {
  if (CAPACITY.has(glpiKey) && !/\d/.test(incoming)) return 'same';
  if (glpiKey === 'brand') {
    return brandKey(current) === brandKey(incoming) ? 'same' : (clean(current) ? 'diff' : 'fill');
  }
  if (agentValueSatisfied(current, incoming)) return 'same';
  if (!clean(current)) return 'fill';
  // Strictly more informative: everything the registry holds is still in there.
  const cur = key(current), next = key(incoming);
  return cur && next.includes(cur) ? 'better' : 'diff';
}

/** The field-by-field comparison shown on the spec tab. */
export function buildGlpiFields(asset: any, spec: any): GlpiField[] {
  const out: GlpiField[] = [];
  for (const [glpiKey, def] of Object.entries(FIELDS)) {
    const incoming = clean(spec?.[glpiKey]);
    if (!incoming) continue; // GLPI has nothing to say about this field
    const current = clean((asset as any)?.[def.column]) || null;
    out.push({
      key: glpiKey, column: def.column, label: def.label, current, incoming,
      state: classify(glpiKey, current, incoming),
      assetOnly: !!def.assetOnly, note: def.note,
    });
  }
  return out;
}

/**
 * What a sync should write.
 *
 * With no `only`, this is the "ปรับปรุงตาม GLPI" button: it takes blanks and
 * strictly-better values and leaves every real disagreement alone. Naming one
 * field is a person clicking that row, which overrides the classification —
 * they can see both values and have decided.
 */
export function planGlpiSync(fields: GlpiField[], only?: string) {
  const picked = only
    ? fields.filter(f => f.key === only && f.state !== 'same')
    : fields.filter(f => f.state === 'fill' || f.state === 'better');

  const assetData: Record<string, string> = {};
  const detailData: Record<string, string> = {};
  const changes: string[] = [];
  for (const f of picked) {
    (f.assetOnly ? assetData : detailData)[f.column] = f.incoming;
    changes.push(`${f.label}: ${f.current || '(ว่าง)'} → ${f.incoming}`);
  }
  return { assetData, detailData, changes, picked };
}
