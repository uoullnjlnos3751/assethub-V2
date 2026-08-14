import React, { useMemo } from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import { History } from 'lucide-react';
import { SectionCard } from '../../../components/SectionCard';
import { calcDepreciation } from './assetFinance';

type Tone = 'primary' | 'success' | 'warning' | 'error' | 'muted';

interface Entry {
  at: number;
  title: string;
  sub: string;
  tone: Tone;
  future?: boolean;
}

const fmt = (d: Date) => d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * One chronological story for the asset, stitched from the three sources that
 * each used to live in their own tab: the audit trail (assetHistory), PM runs,
 * and maintenance tickets — plus the projected replacement date derived from
 * the depreciation schedule.
 */
function buildEntries(asset: any, maintenance: any[]): Entry[] {
  const out: Entry[] = [];

  for (const h of asset.assetHistory || []) {
    const at = new Date(h.createdAt).getTime();
    if (Number.isNaN(at)) continue;
    const actor = h.actor?.displayName || h.actor?.email || '';

    switch (h.actionType) {
      case 'CREATE':
        out.push({ at, title: 'ลงทะเบียนเข้าระบบ', sub: [fmt(new Date(at)), actor].filter(Boolean).join(' · '), tone: 'primary' });
        break;
      case 'OWNER_CHANGE':
        out.push({
          at,
          title: h.fromOwner ? `เปลี่ยนผู้ครอบครอง: ${h.fromOwner} → ${h.toOwner || '—'}` : `จ่ายใช้งานให้ ${h.toOwner || '—'}`,
          sub: [fmt(new Date(at)), actor].filter(Boolean).join(' · '),
          tone: 'success',
        });
        break;
      case 'LOCATION_CHANGE':
        out.push({
          at,
          title: `ย้ายที่ตั้ง: ${h.fromLoc || '—'} → ${h.toLoc || '—'}`,
          sub: [fmt(new Date(at)), actor].filter(Boolean).join(' · '),
          tone: 'primary',
        });
        break;
      case 'STATUS_CHANGE':
        out.push({
          at,
          title: `เปลี่ยนสถานะ: ${h.fromStatus || '—'} → ${h.toStatus || '—'}`,
          sub: [fmt(new Date(at)), actor].filter(Boolean).join(' · '),
          tone: 'warning',
        });
        break;
      case 'GLPI_SYNC':
        out.push({
          at,
          title: 'ซิงก์ข้อมูลจาก GLPI',
          sub: [fmt(new Date(at)), h.note || ''].filter(Boolean).join(' · '),
          tone: 'muted',
        });
        break;
      default:
        out.push({ at, title: h.actionType, sub: fmt(new Date(at)), tone: 'muted' });
    }
  }

  for (const run of asset.pmRuns || []) {
    const when = run.completedAt || run.performedAt;
    if (!when) continue;
    const at = new Date(when).getTime();
    if (Number.isNaN(at)) continue;
    const total = run.answers?.length ?? 0;
    // Count answered items, matching AssetServiceHistoryCard — the two used to
    // disagree (passed-count here vs answered-count there) while both read
    // "ตรวจ X/Y ข้อ", so the same run showed two different numbers.
    const answered = (run.answers || []).filter((a: any) => a.value !== null && a.value !== '').length;
    out.push({
      at,
      title: `PM ${run.plan?.year || ''} — ${total > 0 ? `ตรวจ ${answered}/${total} ข้อ` : 'บันทึกผลแล้ว'}`.trim(),
      sub: [fmt(new Date(at)), run.performer?.displayName].filter(Boolean).join(' · '),
      tone: 'success',
    });
  }

  for (const m of maintenance) {
    const at = new Date(m.startedAt).getTime();
    if (Number.isNaN(at)) continue;
    const closed = !!m.completedAt;
    out.push({
      at,
      title: `${m.repairType || 'ซ่อม'} — ${m.reportedProblem || m.ticketNo}`,
      sub: [fmt(new Date(at)), m.technician?.displayName, Number(m.totalCost) > 0 ? `฿${Number(m.totalCost).toLocaleString('th-TH')}` : null]
        .filter(Boolean).join(' · '),
      tone: closed ? 'warning' : 'error',
    });
  }

  out.sort((a, b) => b.at - a.at);

  // Projected replacement — always last (oldest position is newest-first list's
  // head, so a future date belongs at the top).
  const dep = calcDepreciation(asset);
  if (dep && !dep.fullyDepreciated) {
    out.unshift({
      at: dep.endDate.getTime(),
      title: 'ครบกำหนดเปลี่ยนทดแทน (ตามอายุใช้งาน)',
      sub: dep.endDate.toLocaleDateString('th-TH', { month: 'short', year: 'numeric' }),
      tone: 'muted',
      future: true,
    });
  }

  return out;
}

export function AssetTimeline({ asset, maintenance = [] }: { asset: any; maintenance?: any[] }) {
  const theme = useTheme();
  const entries = useMemo(() => buildEntries(asset, maintenance), [asset, maintenance]);

  const toneColor = (tone: Tone) => ({
    primary: theme.palette.primary.main,
    success: theme.palette.success.main,
    warning: theme.palette.warning.main,
    error: theme.palette.error.main,
    muted: alpha(theme.palette.text.disabled, 0.6),
  }[tone]);

  return (
    <SectionCard title="ไทม์ไลน์ทรัพย์สิน" icon={History}>
      {entries.length === 0 ? (
        <Typography sx={{ fontSize: '0.78rem', color: theme.palette.text.disabled, py: 2, textAlign: 'center' }}>
          ยังไม่มีประวัติของทรัพย์สินนี้
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75, maxHeight: 420, overflowY: 'auto', pr: 0.5 }}>
          {entries.map((e, i) => (
            <Box key={`${e.at}-${i}`} sx={{ display: 'flex', gap: 1.4, opacity: e.future ? 0.7 : 1 }}>
              <Box sx={{
                width: 9, height: 9, borderRadius: '50%', mt: '5px', flex: 'none',
                bgcolor: e.future ? 'transparent' : toneColor(e.tone),
                border: e.future ? `2px dashed ${toneColor(e.tone)}` : 'none',
              }} />
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: '0.79rem', color: theme.palette.text.primary, lineHeight: 1.45 }}>
                  {e.title}
                </Typography>
                <Typography sx={{ fontSize: '0.71rem', color: theme.palette.text.disabled }}>
                  {e.sub}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </SectionCard>
  );
}
