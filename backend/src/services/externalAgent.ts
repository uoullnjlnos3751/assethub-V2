/**
 * Talking to the external asset-monitoring agent, and reconciling what it
 * reports against the asset registry.
 *
 * The agent is a separate read-only service (see ตั้งค่า › เชื่อมต่อระบบภายนอก).
 * It knows what a machine actually is right now; the registry knows what IT
 * recorded when the machine was issued. Neither is automatically right, so the
 * rules below are deliberately conservative — see agentValueSatisfied().
 */
import type { PrismaClient } from '@prisma/client';

const AGENT_TIMEOUT_MS = 8000;

export const AGENT_FIELD_LABELS: Record<string, string> = {
  brand: 'ยี่ห้อ', model: 'รุ่น', snComputer: 'Serial (เครื่อง)', cpu: 'CPU', ram: 'RAM',
  ramSlot1: 'RAM Slot 1', ramSlot2: 'RAM Slot 2', ramType: 'ชนิด RAM', ramSpeed: 'ความเร็ว RAM',
  gpu: 'การ์ดจอ', osType: 'ระบบปฏิบัติการ', osVersion: 'เวอร์ชัน OS',
  officeLicense: 'MS Office', antivirusStatus: 'Antivirus', domainName: 'Domain',
};

function agentConfig() {
  const baseUrl = process.env.EXTERNAL_ASSET_API_URL;
  const apiKey = process.env.EXTERNAL_ASSET_API_KEY;
  return baseUrl && apiKey ? { baseUrl, apiKey } : null;
}

/** One machine by hostname. null for every "no live data" case, never throws. */
export async function fetchAgentRecord(hostname: string | null | undefined): Promise<any | null> {
  if (!hostname) return null;
  const cfg = agentConfig();
  if (!cfg) return null;
  try {
    const res = await fetch(`${cfg.baseUrl}/api/external/agent/${encodeURIComponent(hostname)}`, {
      headers: { 'x-api-key': cfg.apiKey },
      signal: AbortSignal.timeout(AGENT_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Every machine the agent knows about. Empty array when unavailable. */
export async function fetchAllAgentRecords(): Promise<any[]> {
  const cfg = agentConfig();
  if (!cfg) return [];
  try {
    const res = await fetch(`${cfg.baseUrl}/api/external/agents`, {
      headers: { 'x-api-key': cfg.apiKey },
      signal: AbortSignal.timeout(AGENT_TIMEOUT_MS),
    });
    if (!res.ok) return [];
    const body: any = await res.json();
    return Array.isArray(body) ? body : (body?.data ?? []);
  } catch {
    return [];
  }
}

const text = (v: any): string | null => {
  const s = String(v ?? '').trim();
  return s === '' ? null : s;
};

// The registry writes plain brand names ("Dell", "HP"); the agent passes through
// the WMI manufacturer string ("Dell Inc.", "HP Inc."). Same maker, and storing
// the agent's form would leave this one asset spelled differently from the rest.
function normaliseBrand(v: any): string | null {
  const s = text(v);
  if (!s) return null;
  return s
    .replace(/\b(inc|incorporated|corp|corporation|co|ltd|limited|company|gmbh|s\.?a\.?)\b\.?/gi, '')
    .replace(/[,]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim() || s;
}

// Agent product names sometimes arrive with the vendor doubled up, e.g.
// "Microsoft Microsoft 365 Apps for Business".
function collapseRepeatedVendor(v: any): string | null {
  const s = text(v);
  return s ? s.replace(/\b(\w+)\s+\1\b/gi, '$1') : null;
}

// The agent reports Lenovo machines by MTM part number ("22AY005WTH") rather
// than the marketing name the registry uses ("ThinkPad E16 Gen 3"). A bare
// part number is never an improvement on a name someone typed, so it is
// dropped rather than offered.
function looksLikePartNumber(s: string): boolean {
  return /^[A-Z0-9]{6,}$/.test(s) && /\d/.test(s) && !s.includes(' ');
}

/**
 * Agent reading -> asset column, for fields directly comparable to what the
 * registry stores.
 *
 * Excluded on purpose, because the agent's value means something *different*
 * rather than something newer:
 *   storage1        formatted capacity ("C: 465.13 GB") vs the nominal size the
 *                   machine was bought with ("512 GB")
 *   windowsLicense  activation state ("Licensed") vs the product key
 *   ownerName       Windows login ("TRRGROUP\\watchara.kid") vs a person's name
 */
export function mapAgentToAssetSpec(a: any): Record<string, string | null> {
  if (!a) return {};
  const cleanCpu = (v: any) => {
    const s = text(v);
    return s ? s.replace(/\((?:R|TM)\)/gi, '').replace(/\s{2,}/g, ' ').trim() : null;
  };
  // Matches the format the registry already uses: "DDR4 - SODIMM 16 GB".
  const slots: string[] = (a.ram_slots || [])
    .filter((s: any) => s?.size_gb)
    .map((s: any) => `${s.type ? `${s.type} - ` : ''}SODIMM ${s.size_gb} GB`);

  const cpu = cleanCpu(a.cpu_name);
  const domain = text(a.domain);
  const model = text(a.computer_model);

  return {
    brand: normaliseBrand(a.computer_manufacturer),
    model: model && looksLikePartNumber(model) ? null : model,
    snComputer: text(a.serial_number),
    cpu: cpu ? (a.cpu_cores ? `${cpu} (${a.cpu_cores} Cores)` : cpu) : null,
    ram: a.ram_total_gb ? `${Math.round(a.ram_total_gb)} GB` : null,
    ramSlot1: slots[0] ?? null,
    ramSlot2: slots[1] ?? null,
    ramType: text(a.ram_slots?.[0]?.type),
    ramSpeed: text(a.ram_slots?.[0]?.speed_mhz),
    gpu: text(a.gpu_name),
    osType: a.os_name?.includes('Windows') ? 'Windows' : text(a.os_name),
    osVersion: text(a.os_name),
    officeLicense: collapseRepeatedVendor(a.office_name),
    antivirusStatus: a.tm_installed ? 'Trend Micro Apex One' : null,
    // Agent reports the DNS domain ("trrgroup.com"); the registry records the
    // NetBIOS name ("TRRGROUP") throughout.
    domainName: domain ? domain.split('.')[0].toUpperCase() : null,
  };
}

// Punctuation and spacing differ constantly between the two sources — "16GB"
// vs "16 GB" is not a discrepancy anyone needs to see.
const compareKey = (v: any) => String(v ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Whether the registry's value already covers what the agent reports.
 *
 * "Already contains it" is the case that matters: the registry is frequently
 * the more specific side — "NVIDIA GeForce MX550 (2 GB)" against the agent's
 * "NVIDIA GeForce MX550", "Windows 11 Pro 25H2" against "Windows 11 Pro".
 * Reporting those as drift would invite someone to "fix" them by discarding
 * the extra detail.
 */
export function agentValueSatisfied(current: any, incoming: any): boolean {
  const cur = compareKey(current);
  const next = compareKey(incoming);
  if (!next) return true;
  return cur === next || (cur.length > next.length && cur.includes(next));
}

export interface AssetDrift {
  /** Fields the registry has no value for — safe to fill, nothing is lost. */
  blanks: { field: string; label: string; value: string }[];
  /** Fields where both sides hold a value and they disagree — needs a person. */
  conflicts: { field: string; label: string; current: string; incoming: string }[];
}

export function computeDrift(asset: any, spec: Record<string, string | null>): AssetDrift {
  const blanks: AssetDrift['blanks'] = [];
  const conflicts: AssetDrift['conflicts'] = [];
  for (const [field, incoming] of Object.entries(spec)) {
    if (incoming == null) continue;
    const current = (asset as any)[field];
    if (agentValueSatisfied(current, incoming)) continue;
    const label = AGENT_FIELD_LABELS[field] || field;
    if (!String(current ?? '').trim()) blanks.push({ field, label, value: incoming });
    else conflicts.push({ field, label, current: String(current), incoming });
  }
  return { blanks, conflicts };
}

/**
 * Find the asset a given agent record belongs to.
 *
 * Hostname first because that is the link IT maintains deliberately; serial as
 * a fallback for machines renamed after being registered. Across the current
 * fleet both routes agree on every match, so the fallback costs nothing.
 */
export async function matchAssetForAgent(prisma: PrismaClient, record: any) {
  if (record?.hostname) {
    const byHost = await prisma.asset.findFirst({ where: { assetName: record.hostname } });
    if (byHost) return { asset: byHost, matchedBy: 'hostname' as const };
  }
  if (record?.serial_number) {
    const bySerial = await prisma.asset.findFirst({ where: { serialNo: record.serial_number } });
    if (bySerial) return { asset: bySerial, matchedBy: 'serial' as const };
  }
  return null;
}

/**
 * Fill only the fields the registry has left empty, for every machine the
 * agent covers. Never overwrites an existing value — that always needs a
 * person to look at it, so it is reported rather than applied.
 */
export async function fillBlanksFromAgent(
  prisma: PrismaClient,
  opts: { actorUserId?: number | null; assetIds?: number[] } = {},
): Promise<{ assetsUpdated: number; fieldsFilled: number; details: { assetId: number; assetCode: string | null; fields: string[] }[] }> {
  const records = await fetchAllAgentRecords();
  const details: { assetId: number; assetCode: string | null; fields: string[] }[] = [];
  let fieldsFilled = 0;

  for (const summary of records) {
    // The list endpoint carries less detail than the per-machine one (no RAM
    // slots), so re-read each machine before deciding what to write.
    const record = await fetchAgentRecord(summary.hostname);
    if (!record) continue;

    const match = await matchAssetForAgent(prisma, record);
    if (!match) continue;
    if (opts.assetIds && !opts.assetIds.includes(match.asset.id)) continue;

    const { blanks } = computeDrift(match.asset, mapAgentToAssetSpec(record));
    if (blanks.length === 0) continue;

    const data: Record<string, string> = {};
    blanks.forEach((b) => { data[b.field] = b.value; });
    await prisma.asset.update({ where: { id: match.asset.id }, data });
    await prisma.assetHistory.create({
      data: {
        assetId: match.asset.id,
        actionType: 'AGENT_SYNC',
        actorUserId: opts.actorUserId ?? null,
        note: `เติมข้อมูลที่ว่างจากระบบ Agent: ${blanks.map((b) => b.label).join(', ')}`,
      },
    });

    fieldsFilled += blanks.length;
    details.push({ assetId: match.asset.id, assetCode: match.asset.assetCode, fields: blanks.map((b) => b.label) });
  }

  const monitors = await fillMonitorBlanksFromAgent(prisma, records);
  fieldsFilled += monitors.fieldsFilled;
  details.push(...monitors.details);

  return { assetsUpdated: details.length, fieldsFilled, details };
}

/**
 * เติมความละเอียดจอที่ยังว่าง จากสิ่งที่ Agent อ่านได้
 *
 * Agent ส่ง width/height ของจอมาด้วย (หน่วยเป็นพิกเซล) แต่โค้ดเดิมไม่เคยอ่าน —
 * `AgentMonitor` ไม่ได้ประกาศสองช่องนี้ไว้เลย ทั้งที่ในทะเบียนมีจอเพียง 27 จาก
 * 243 ตัวที่บันทึกความละเอียดไว้
 *
 * เติมเฉพาะช่องที่ว่าง ไม่แตะของเดิม ตามกฎเดียวกับการเติมสเปคเครื่อง — และ
 * ไม่แตะ `ports` เพราะ port ของ Agent คือ "ช่องที่เสียบอยู่ตอนนี้" คนละความหมาย
 * กับ `ports` ที่หมายถึงช่องที่ตัวจอมีทั้งหมด (ข้อมูลจาก GLPI)
 */
async function fillMonitorBlanksFromAgent(
  prisma: PrismaClient,
  records: { hostname: string }[],
): Promise<{ fieldsFilled: number; details: { assetId: number; assetCode: string | null; fields: string[] }[] }> {
  const bySerial = new Map<string, string>();
  for (const summary of records) {
    const record: any = await fetchAgentRecord(summary.hostname);
    for (const m of (record?.monitors || [])) {
      const serial = String(m?.serial ?? '').trim();
      const w = Number(m?.width), h = Number(m?.height);
      if (!serial || !(w > 0) || !(h > 0)) continue;
      bySerial.set(serial, `${w}x${h}`);
    }
  }

  const details: { assetId: number; assetCode: string | null; fields: string[] }[] = [];
  let fieldsFilled = 0;
  for (const [serial, resolution] of bySerial) {
    const asset = await prisma.asset.findFirst({
      where: { OR: [{ serialNo: serial }, { computerDetail: { snComputer: serial } }] },
      select: { id: true, assetCode: true, monitorDetail: { select: { resolution: true } } },
    });
    // ว่างเท่านั้นถึงเติม ถ้ามีค่าอยู่แล้ว (แม้จะต่างกัน) ปล่อยให้คนตัดสิน
    if (!asset || asset.monitorDetail?.resolution) continue;

    await prisma.monitorDetail.upsert({
      where: { assetId: asset.id },
      create: { assetId: asset.id, resolution },
      update: { resolution },
    });
    await prisma.assetHistory.create({
      data: {
        assetId: asset.id,
        actionType: 'AGENT_SYNC',
        actorUserId: null,
        note: `เติมข้อมูลที่ว่างจากระบบ Agent: ความละเอียดจอ (${resolution})`,
      },
    });
    fieldsFilled++;
    details.push({ assetId: asset.id, assetCode: asset.assetCode, fields: ['ความละเอียดจอ'] });
  }
  return { fieldsFilled, details };
}
