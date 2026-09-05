/**
 * Nightly RAM/disk change detection from the external monitoring agent.
 *
 * The agent has no serial number for a RAM stick or a disk — only
 * manufacturer/part-number/size/speed, which collide across the fleet often
 * enough (13 machines share one exact RAM fingerprint on this fleet) that a
 * fingerprint match alone can never prove a specific stick moved from
 * machine A to machine B. What it CAN prove, cheaply, is that something
 * changed: this machine had a stick matching fingerprint X yesterday and
 * doesn't today, or has one today it didn't before. That's real, useful
 * signal even without a serial — someone opened this case and did
 * something to it — so it gets recorded rather than silently dropped, which
 * is what happened to every such change before this job existed.
 *
 * Deliberately NOT trying to pair a removal on one machine with an addition
 * on another — that pairing is only ever a guess without a serial, and a
 * wrong guess recorded as fact is worse than two separate, honest "changed"
 * entries a person can connect themselves.
 *
 * Comparison is per-asset against AssetComponentSnapshot (this job's own
 * bookkeeping table, not user-facing). First time an asset is seen, the
 * snapshot is just recorded as the baseline — no events, since there's
 * nothing to compare against yet and every slot would otherwise show up as
 * a false "just added".
 */
import { prisma } from '../lib/prisma';
import { fetchAllAgentRecords, fetchAgentRecord, matchAssetForAgent } from '../services/externalAgent';
import { scheduleDaily } from './dailySchedule';

interface RamSlot { manufacturer?: string | null; part_number?: string | null; size_gb?: number | null; speed_mhz?: number | null; type?: string | null }
interface DiskHealth { name?: string | null; media_type?: string | null; size_gb?: number | null }

const ramKey = (s: RamSlot) => [s.manufacturer || '', s.part_number || '', s.size_gb ?? '', s.speed_mhz ?? '', s.type || ''].join('|');
const ramLabel = (s: RamSlot) => {
  const spec = [s.type, s.size_gb ? `${s.size_gb}GB` : null, s.speed_mhz ? `${s.speed_mhz}MHz` : null].filter(Boolean).join(' ');
  const source = [s.manufacturer, s.part_number].filter(Boolean).join(' ');
  return [spec, source && `(${source})`].filter(Boolean).join(' ') || 'RAM (ไม่ทราบรุ่น)';
};

// health_status ไม่รวมในลายนิ้วมือ — ดิสก์ลูกเดิมป่วยแล้วหายป่วยได้ ไม่ใช่ดิสก์คนละลูก
const diskKey = (d: DiskHealth) => [d.name || '', d.media_type || '', d.size_gb ?? ''].join('|');
const diskLabel = (d: DiskHealth) => [d.name, d.media_type, d.size_gb ? `${d.size_gb}GB` : null].filter(Boolean).join(' · ') || 'ดิสก์ (ไม่ทราบรุ่น)';

function countBy<T>(items: T[], keyFn: (i: T) => string): Map<string, { count: number; sample: T }> {
  const m = new Map<string, { count: number; sample: T }>();
  for (const item of items) {
    const k = keyFn(item);
    const cur = m.get(k);
    if (cur) cur.count++;
    else m.set(k, { count: 1, sample: item });
  }
  return m;
}

/** net additions/removals between two fingerprint counts — a count that only
 *  dropped from 2 to 1 is one removal, not two. */
function diffCounts<T>(before: Map<string, { count: number; sample: T }>, after: Map<string, { count: number; sample: T }>) {
  const added: { key: string; count: number; sample: T }[] = [];
  const removed: { key: string; count: number; sample: T }[] = [];
  const keys = new Set([...before.keys(), ...after.keys()]);
  for (const k of keys) {
    const b = before.get(k)?.count ?? 0;
    const a = after.get(k)?.count ?? 0;
    if (a > b) added.push({ key: k, count: a - b, sample: after.get(k)!.sample });
    if (b > a) removed.push({ key: k, count: b - a, sample: before.get(k)!.sample });
  }
  return { added, removed };
}

export async function runComponentChangeDetection(): Promise<void> {
  if (process.env.AGENT_AUTOFILL_ENABLED === 'false') return;
  if (!process.env.EXTERNAL_ASSET_API_URL || !process.env.EXTERNAL_ASSET_API_KEY) return;

  try {
    const summaries = await fetchAllAgentRecords();
    let changed = 0;
    let eventCount = 0;

    for (const summary of summaries) {
      const record = await fetchAgentRecord(summary.hostname);
      if (!record) continue;

      const match = await matchAssetForAgent(prisma, record);
      if (!match) continue;

      const ramSlots: RamSlot[] = record.ram_slots || [];
      const disks: DiskHealth[] = record.disk_health || [];
      // เครื่องที่ Agent รอบนี้ไม่มีข้อมูลชิ้นส่วนเลย (สลับ agent เวอร์ชันเก่า /
      // อ่านฮาร์ดแวร์ไม่สำเร็จรอบนี้) ข้ามไปเฉย ๆ — ไม่งั้นจะกลายเป็น "ถอดออกหมด"
      // ปลอม ๆ ทุกแถวเพราะไม่มีอะไรจะเทียบ
      if (ramSlots.length === 0 && disks.length === 0) continue;

      const existing = await prisma.assetComponentSnapshot.findUnique({ where: { assetId: match.asset.id } });

      // Trimmed to just the fingerprint-relevant fields — the snapshot is
      // this job's own bookkeeping, not a copy of whatever else the agent
      // sends. Stored (and read back) as plain objects rather than bare key
      // strings so a *removed* entry can be labeled just as richly as an
      // *added* one — both sides of a diff need the same shape.
      const ramNowTrim: RamSlot[] = ramSlots.map((s) => ({ manufacturer: s.manufacturer, part_number: s.part_number, size_gb: s.size_gb, speed_mhz: s.speed_mhz, type: s.type }));
      const diskNowTrim: DiskHealth[] = disks.map((d) => ({ name: d.name, media_type: d.media_type, size_gb: d.size_gb }));
      const ramNow = countBy(ramNowTrim, ramKey);
      const diskNow = countBy(diskNowTrim, diskKey);

      if (existing) {
        const ramBefore = countBy((existing.ramFingerprint as unknown as RamSlot[]) || [], ramKey);
        const diskBefore = countBy((existing.diskFingerprint as unknown as DiskHealth[]) || [], diskKey);
        const ramDiff = diffCounts(ramBefore, ramNow);
        const diskDiff = diffCounts(diskBefore, diskNow);

        const events: { actionType: string; note: string }[] = [];
        for (const r of ramDiff.removed) events.push({ actionType: 'COMPONENT_REMOVED', note: `RAM ถอดออก: ${ramLabel(r.sample)}${r.count > 1 ? ` ×${r.count}` : ''}` });
        for (const r of ramDiff.added) events.push({ actionType: 'COMPONENT_ADDED', note: `RAM ใส่เพิ่ม: ${ramLabel(r.sample)}${r.count > 1 ? ` ×${r.count}` : ''}` });
        for (const d of diskDiff.removed) events.push({ actionType: 'COMPONENT_REMOVED', note: `ดิสก์ถอดออก: ${diskLabel(d.sample)}${d.count > 1 ? ` ×${d.count}` : ''}` });
        for (const d of diskDiff.added) events.push({ actionType: 'COMPONENT_ADDED', note: `ดิสก์ใส่เพิ่ม: ${diskLabel(d.sample)}${d.count > 1 ? ` ×${d.count}` : ''}` });

        if (events.length > 0) {
          await prisma.$transaction([
            ...events.map((e) => prisma.assetHistory.create({
              data: { assetId: match.asset.id, actionType: e.actionType, note: e.note, actorUserId: null },
            })),
            prisma.assetComponentSnapshot.update({
              where: { assetId: match.asset.id },
              data: { ramFingerprint: ramNowTrim as any, diskFingerprint: diskNowTrim as any },
            }),
          ]);
          changed++;
          eventCount += events.length;
          console.log(`[ComponentChange] ${match.asset.assetCode || `asset#${match.asset.id}`}: ${events.map((e) => e.note).join('; ')}`);
        }
      } else {
        // First sighting — record the baseline only, no events.
        await prisma.assetComponentSnapshot.create({
          data: { assetId: match.asset.id, ramFingerprint: ramNowTrim as any, diskFingerprint: diskNowTrim as any },
        });
      }
    }

    if (eventCount === 0) {
      console.log('[ComponentChange] No RAM/disk changes detected this run.');
    } else {
      console.log(`[ComponentChange] Recorded ${eventCount} change(s) across ${changed} asset(s).`);
    }
  } catch (err) {
    console.error('[ComponentChange] Run failed:', err);
  }
}

export function startComponentChangeDetection(): void {
  if (process.env.AGENT_AUTOFILL_ENABLED === 'false') {
    console.log('[ComponentChange] Disabled via AGENT_AUTOFILL_ENABLED=false');
    return;
  }

  // 02:00 — หลัง AgentAutofill (01:30) เพื่อให้เทียบกับสเปคที่เพิ่งเติมล่าสุด
  // และไม่ยิงหา agent service พร้อมกัน
  scheduleDaily({
    name: 'ComponentChange',
    hour: 2,
    run: runComponentChangeDetection,
  });
}
