import React from 'react';
import { Box, Typography, useTheme, Theme } from '@mui/material';
import { Wifi, WifiOff, ShieldCheck, ShieldAlert, ShieldX, Wrench, CalendarClock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Four-up health-card row at the top of the Overview tab — one glance answers
 * "does this machine need anything" before scrolling into the detail. Modeled
 * on the reference ITAM's own device-profile header (InvGate: Connectivity /
 * Antivirus / Firewall / Warranty), adapted to what this system actually
 * tracks — we have no firewall signal at all, so that slot is replaced with
 * PM status (a real, recurring health signal we do have) rather than faking one.
 *
 * Each card independently hides when its data doesn't exist (no agent record,
 * no PM run, no warranty date) instead of rendering a false "missing" alarm —
 * same zero-value-suppression rule the dashboard uses. The whole strip hides
 * if nothing has anything to say.
 */

type Level = 'ok' | 'warn' | 'crit' | 'mute';

interface Card {
  key: string;
  level: Level;
  icon: LucideIcon;
  title: string;
  sub: string;
}

const LEVEL_COLOR = (theme: Theme, level: Level) => {
  if (level === 'crit') return theme.palette.error.main;
  if (level === 'warn') return theme.palette.warning.main;
  if (level === 'ok') return theme.palette.success.main;
  return theme.palette.text.disabled;
};

const fmtDate = (d?: string | Date | null) =>
  d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const fmtLastSeen = (iso?: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  return `${d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} ${d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`;
};

interface ExternalAgentData {
  online?: boolean;
  status?: string;
  last_seen?: string;
  tm_installed?: number;
  tm_realtime_scan?: string;
}

function buildCards(asset: any, agent: ExternalAgentData | null | undefined): Card[] {
  const cards: Card[] = [];

  // ── Connectivity — only when this asset actually has a live agent record ──
  if (agent) {
    const online = agent.online ?? agent.status === 'online';
    const lastSeen = fmtLastSeen(agent.last_seen);
    cards.push({
      key: 'connectivity',
      level: online ? 'ok' : 'crit',
      icon: online ? Wifi : WifiOff,
      title: online ? 'ออนไลน์' : 'ออฟไลน์',
      sub: lastSeen ? `พบล่าสุด ${lastSeen}` : (online ? 'กำลังออนไลน์อยู่' : 'ไม่ทราบเวลาพบล่าสุด'),
    });
  }

  // ── Antivirus — agent's live read first, the registry's free-text field
  //    second (still useful signal on machines the agent doesn't cover) ──
  if (agent && agent.tm_installed !== undefined) {
    const installed = !!agent.tm_installed;
    const realtimeOn = !!agent.tm_realtime_scan && /enable/i.test(agent.tm_realtime_scan);
    cards.push({
      key: 'antivirus',
      level: !installed ? 'crit' : (realtimeOn ? 'ok' : 'warn'),
      icon: !installed ? ShieldX : (realtimeOn ? ShieldCheck : ShieldAlert),
      title: !installed ? 'ไม่พบแอนตี้ไวรัส' : 'มีแอนตี้ไวรัส',
      sub: installed ? (agent.tm_realtime_scan || 'Trend Micro') : 'ไม่พบการติดตั้งจากระบบ Agent',
    });
  } else if (asset.antivirusStatus) {
    cards.push({
      key: 'antivirus',
      level: 'ok',
      icon: ShieldCheck,
      title: 'แอนตี้ไวรัส',
      sub: asset.antivirusStatus,
    });
  }

  // ── PM status — stands in for InvGate's Firewall card: we have no firewall
  //    signal on any asset, but PM coverage is a real recurring health check ──
  const pmRuns: any[] = asset.pmRuns || [];
  if (pmRuns.length > 0) {
    const latest = [...pmRuns].sort((a, b) => (b.year || 0) - (a.year || 0))[0];
    const endDate = latest?.plan?.endDate ? new Date(latest.plan.endDate) : null;
    const overdue = latest.status !== 'COMPLETED' && endDate ? endDate.getTime() < Date.now() : false;
    if (latest.status === 'COMPLETED') {
      cards.push({
        key: 'pm', level: 'ok', icon: Wrench,
        title: 'ตรวจ PM แล้ว',
        sub: latest.completedAt ? `ล่าสุด ${fmtDate(latest.completedAt)}` : `ปี ${latest.year}`,
      });
    } else if (overdue) {
      cards.push({
        key: 'pm', level: 'crit', icon: Wrench,
        title: 'PM เลยกำหนด',
        sub: `ครบกำหนด ${fmtDate(endDate)}`,
      });
    } else {
      cards.push({
        key: 'pm', level: 'warn', icon: Wrench,
        title: 'รอดำเนินการ PM',
        sub: endDate ? `กำหนดถึง ${fmtDate(endDate)}` : `ปี ${latest.year}`,
      });
    }
  }

  // ── Warranty — same 45-day "expiring soon" threshold the reference ITAM uses ──
  if (asset.warrantyEndDate) {
    const end = new Date(asset.warrantyEndDate);
    const daysLeft = Math.round((end.getTime() - Date.now()) / 86400000);
    if (daysLeft <= 0) {
      cards.push({
        key: 'warranty', level: 'crit', icon: CalendarClock,
        title: 'หมดประกันแล้ว',
        sub: `หมดประกันเมื่อ ${fmtDate(end)}`,
      });
    } else if (daysLeft <= 45) {
      cards.push({
        key: 'warranty', level: 'warn', icon: CalendarClock,
        title: 'ประกันใกล้หมดอายุ',
        sub: `เหลืออีก ${daysLeft.toLocaleString('th-TH')} วัน`,
      });
    } else {
      cards.push({
        key: 'warranty', level: 'ok', icon: CalendarClock,
        title: 'อยู่ในประกัน',
        sub: `ถึง ${fmtDate(end)}`,
      });
    }
  } else {
    cards.push({
      key: 'warranty', level: 'mute', icon: CalendarClock,
      title: 'ยังไม่ระบุวันหมดประกัน',
      sub: 'กรอกได้จากหน้าแก้ไข',
    });
  }

  return cards;
}

export function AssetHealthStrip({ asset, agent, loadingAgent }: {
  asset: any;
  agent?: ExternalAgentData | null;
  /** While the live agent lookup is still in flight, hold off deciding the
   *  connectivity/antivirus cards rather than flashing them in a beat late. */
  loadingAgent?: boolean;
}) {
  const theme = useTheme();
  if (loadingAgent) return null;

  const cards = buildCards(asset, agent);
  if (cards.length === 0) return null;

  return (
    <Box sx={{
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: `repeat(${cards.length}, 1fr)` },
      gap: 1.25,
    }}>
      {cards.map(c => {
        const color = LEVEL_COLOR(theme, c.level);
        const Icon = c.icon;
        return (
          <Box key={c.key} sx={{
            display: 'flex', alignItems: 'flex-start', gap: 1.1,
            p: '12px 14px',
            borderRadius: '12px',
            bgcolor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            borderLeftWidth: '3px',
            borderLeftColor: color,
            boxShadow: theme.palette.mode === 'dark' ? '0 4px 14px rgba(0,0,0,.3)' : '0 4px 14px rgba(16,24,40,.05)',
          }}>
            <Icon size={19} color={color} strokeWidth={2.2} style={{ flexShrink: 0, marginTop: 1 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: theme.palette.text.primary, lineHeight: 1.3 }}>
                {c.title}
              </Typography>
              <Typography noWrap sx={{ fontSize: '0.72rem', color: theme.palette.text.secondary, mt: '2px' }}>
                {c.sub}
              </Typography>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
