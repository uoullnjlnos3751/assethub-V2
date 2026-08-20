import { PrismaClient } from '@prisma/client';
import { fetchAgentRecord, fetchAllAgentRecords } from './externalAgent';

/**
 * Reconciling the external monitors the agent reports against the registry.
 *
 * The agent lists every display attached to a machine. Only the external ones
 * are assets — a laptop's built-in panel is reported as `type: "Internal"` and
 * is part of the machine, not a separate thing to register.
 *
 * The monitor's own serial is the only usable key: the registry has no other
 * field that could identify one physical display. Roughly one in six of the
 * monitors seen carries no serial at all (older panels, or EDID the agent
 * cannot read), and those simply cannot be reconciled automatically — they are
 * reported as such rather than dropped.
 */

export interface AgentMonitor {
  name: string | null;
  type: string | null;
  manufacturer: string | null;
  serial: string | null;
  port: string | null;
  year: number | null;
}

export type MonitorBucket = 'FIX' | 'OK' | 'CREATE' | 'MANUAL';

export interface MonitorField {
  key: string;
  label: string;
  current: string | null;
  incoming: string;
  /** `fill` completes a blank, `diff` contradicts a stored value, `same` needs nothing. */
  state: 'fill' | 'diff' | 'same';
  note?: string;
}

export interface MonitorRow {
  bucket: MonitorBucket;
  host: string;
  hostUser: string | null;
  hostAssetId: number | null;
  hostAssetCode: string | null;
  hostAssetName: string | null;
  monitor: AgentMonitor;
  /** The registry row this monitor was matched to, when there is one. */
  assetId: number | null;
  assetCode: string | null;
  assetName: string | null;
  fields: MonitorField[];
  /** True when the pair is not yet joined in AssetLink. */
  linkable: boolean;
}

/**
 * EDID reports the maker as a three-letter PnP code. The registry writes brands
 * out in full, so comparing "DEL" against "Dell" would flag every single
 * monitor as a mismatch.
 */
const PNP_BRAND: Record<string, string> = {
  DEL: 'Dell', SAM: 'Samsung', SEC: 'Samsung', LEN: 'Lenovo', LGD: 'LG', GSM: 'LG',
  AOC: 'AOC', ACR: 'Acer', BNQ: 'BenQ', HWP: 'HP', HPN: 'HP', PHL: 'Philips',
  ACI: 'Asus', AUS: 'Asus', VSC: 'ViewSonic', NEC: 'NEC', IVM: 'iiyama',
};

export const brandFromPnp = (code: string | null | undefined): string | null => {
  const s = String(code ?? '').trim();
  if (!s) return null;
  return PNP_BRAND[s.toUpperCase()] || s;
};

const clean = (v: any): string | null => {
  const s = String(v ?? '').trim();
  return s === '' ? null : s;
};

/**
 * Whitespace-insensitive comparison. The registry holds names like
 * "Komkrit  Seengun" with a doubled space; reporting that as a different person
 * would spend a reviewer's attention on nothing, and a reconciliation tool that
 * cries wolf stops being read.
 */
const same = (a: any, b: any) =>
  String(a ?? '').replace(/\s+/g, ' ').trim().toLowerCase() ===
  String(b ?? '').replace(/\s+/g, ' ').trim().toLowerCase();

const shortUser = (v: any): string | null => {
  const s = clean(v);
  return s ? s.split('\\').pop() || null : null;
};

function buildFields(reg: any, mon: AgentMonitor, host: any): MonitorField[] {
  const out: MonitorField[] = [];
  const add = (key: string, label: string, current: any, incoming: any, note?: string) => {
    const value = clean(incoming);
    if (!value) return;
    const cur = clean(current);
    out.push({
      key, label, current: cur, incoming: value,
      state: !cur ? 'fill' : (same(cur, value) ? 'same' : 'diff'),
      note,
    });
  };

  add('brand', 'ยี่ห้อ', reg.brand, brandFromPnp(mon.manufacturer));
  add('model', 'รุ่น', reg.model, mon.name);
  if (host) {
    // Only a suggestion: a monitor on a shared desk belongs to the desk, not to
    // whoever happens to be signed in, so this is never applied automatically.
    add('ownerName', 'ผู้ครอบครอง', reg.ownerName, host.ownerName,
        'มาจากผู้ครอบครองของเครื่องที่จอเสียบอยู่ — ตรวจก่อนรับ');
    add('location', 'สถานที่', reg.location, host.location);
    add('departmentId', 'แผนก', reg.departmentId, host.departmentId);
  }

  // Notebooks keep the accounting code in assetCode and the IT hostname in
  // assetName. Monitors were entered with the IT code in both, which is how a
  // stray character in one of them survived unnoticed.
  if (reg.assetCode && reg.assetName && !same(reg.assetCode, reg.assetName)) {
    out.push({
      key: 'assetName', label: 'รหัส IT (ชื่อ)', current: reg.assetName,
      incoming: reg.assetCode, state: 'diff',
      note: 'ไม่ตรงกับรหัสทรัพย์สินของระเบียนเดียวกัน',
    });
  }
  if (!reg.assetCode) {
    out.push({
      key: 'assetCode', label: 'รหัสทรัพย์สิน', current: null, incoming: '',
      state: 'diff', note: 'Agent ให้รหัสบัญชีไม่ได้ ต้องให้ IT กำหนดเอง',
    });
  }
  return out;
}

const REG_SELECT = {
  id: true, assetCode: true, assetName: true, brand: true, model: true, type: true,
  ownerName: true, location: true, departmentId: true, company: true, status: true,
} as const;

/** Reconcile one agent record. Used by both the per-asset and fleet endpoints. */
export async function reconcileRecord(prisma: PrismaClient, record: any): Promise<MonitorRow[]> {
  const host = record?.hostname
    ? await prisma.asset.findFirst({
        where: { OR: [{ assetName: record.hostname }, ...(record.serial_number ? [{ serialNo: record.serial_number }] : [])] },
        select: { id: true, assetCode: true, assetName: true, ownerName: true, location: true, departmentId: true, company: true },
      })
    : null;

  const rows: MonitorRow[] = [];
  for (const raw of (record?.monitors ?? [])) {
    const mon: AgentMonitor = {
      name: clean(raw.name), type: clean(raw.type), manufacturer: clean(raw.manufacturer),
      serial: clean(raw.serial), port: clean(raw.port),
      year: typeof raw.year === 'number' ? raw.year : null,
    };
    // Built-in laptop panels are part of the machine, never their own asset.
    if (mon.type !== 'External') continue;

    const base = {
      host: record.hostname, hostUser: shortUser(record.logged_user),
      hostAssetId: host?.id ?? null, hostAssetCode: host?.assetCode ?? null,
      hostAssetName: host?.assetName ?? null, monitor: mon,
    };

    if (!mon.serial) {
      rows.push({ ...base, bucket: 'MANUAL', assetId: null, assetCode: null, assetName: null, fields: [], linkable: false });
      continue;
    }

    const reg = await prisma.asset.findFirst({
      where: { OR: [{ serialNo: mon.serial }, { snComputer: mon.serial }] },
      select: REG_SELECT,
    });

    if (!reg) {
      rows.push({ ...base, bucket: 'CREATE', assetId: null, assetCode: null, assetName: null, fields: [], linkable: false });
      continue;
    }

    const fields = buildFields(reg, mon, host);
    const linked = host
      ? await prisma.assetLink.findFirst({ where: { parentId: host.id, childId: reg.id } })
      : null;

    rows.push({
      ...base,
      bucket: fields.some(f => f.state !== 'same') ? 'FIX' : 'OK',
      assetId: reg.id, assetCode: reg.assetCode, assetName: reg.assetName,
      fields,
      linkable: !!host && !linked,
    });
  }
  return rows;
}

/** Every machine the agent covers. The fleet view is where the work happens —
 *  the problems are spread thin, a few across a dozen-odd machines. */
export async function reconcileFleet(prisma: PrismaClient): Promise<MonitorRow[]> {
  const list = await fetchAllAgentRecords();
  const out: MonitorRow[] = [];
  for (const summary of list) {
    if (!summary?.hostname) continue;
    const full = await fetchAgentRecord(summary.hostname);
    if (!full) continue;
    out.push(...await reconcileRecord(prisma, full));
  }
  return out;
}
