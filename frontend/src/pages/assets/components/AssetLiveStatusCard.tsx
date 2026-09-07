import React from 'react';
import { Box, Typography, Chip, LinearProgress, alpha, useTheme, Theme } from '@mui/material';
import { BatteryCharging, Radio, ShieldCheck, ShieldAlert, TriangleAlert } from 'lucide-react';
import { SectionCard } from '../../../components/SectionCard';

interface ExternalAgentData {
  online?: boolean;
  status?: string;
  last_seen?: string;
  battery_status?: string;
  battery_charge_pct?: number | null;
  battery_health_pct?: number | null;
  cpu_load_pct?: number | null;
  ram_used_pct?: number | null;
  ram_total_gb?: number | null;
  logged_user?: string;
  ip?: string;
  tm_installed?: number;
  tm_realtime_scan?: string;
  tm_last_update?: string;
}

function MeterRow({ label, pct, color }: { label: string; pct?: number | null; color: string }) {
  const theme = useTheme();
  if (pct == null) return null;
  return (
    <Box sx={{ mb: 1.1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
        <Typography sx={{ fontSize: '0.72rem', color: theme.palette.text.secondary }}>{label}</Typography>
        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color }}>{Math.round(pct)}%</Typography>
      </Box>
      <LinearProgress variant="determinate" value={Math.min(100, Math.max(0, pct))} sx={{
        height: 6, borderRadius: 999,
        bgcolor: alpha(color, theme.palette.mode === 'dark' ? 0.18 : 0.12),
        '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 999 },
      }} />
    </Box>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  const theme = useTheme();
  return (
    <Box sx={{
      display: 'flex', justifyContent: 'space-between', gap: 1.5, alignItems: 'baseline',
      py: 0.6, borderBottom: `1px dashed ${alpha(theme.palette.divider, 0.9)}`,
      '&:last-of-type': { borderBottom: 'none' },
    }}>
      <Typography sx={{ fontSize: '0.74rem', color: theme.palette.text.secondary, flex: 'none' }}>{label}</Typography>
      <Typography sx={{
        fontSize: '0.76rem', fontWeight: 600, color: value ? theme.palette.text.primary : theme.palette.text.disabled,
        textAlign: 'right', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {value || '—'}
      </Typography>
    </Box>
  );
}

const battColor = (theme: Theme, pct?: number | null) => {
  if (pct == null) return theme.palette.text.secondary;
  if (pct <= 20) return theme.palette.error.main;
  if (pct <= 50) return theme.palette.warning.main;
  return theme.palette.success.main;
};

const fmtLastSeen = (iso?: string) => {
  if (!iso) return null;
  const d = new Date(iso);
  return `${d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })} ${d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`;
};

type HealthLevel = 'ok' | 'warn' | 'critical';

/** Rolls every signal the agent reports into one verdict — this is the thing
 * a person scanning the sidebar should see before any individual meter,
 * so it renders first, above the online/offline chip. */
function assessHealth(agent: ExternalAgentData): { level: HealthLevel; reasons: string[] } {
  const reasons: string[] = [];
  let level: HealthLevel = 'ok';
  const bump = (next: HealthLevel) => { if (next === 'critical' || level === 'ok') level = next; };

  const isOnline = agent.online ?? agent.status === 'online';
  if (!isOnline) { reasons.push('เครื่องออฟไลน์'); bump('warn'); }

  if (agent.battery_charge_pct != null && agent.battery_charge_pct <= 15) {
    reasons.push('แบตเตอรี่เหลือน้อย'); bump('critical');
  } else if (agent.battery_health_pct != null && agent.battery_health_pct < 60) {
    reasons.push('สุขภาพแบตเสื่อม'); bump('warn');
  }

  if (agent.tm_installed === 0) {
    reasons.push('ไม่พบ Antivirus'); bump('critical');
  } else if (agent.tm_realtime_scan && !/enable/i.test(agent.tm_realtime_scan)) {
    reasons.push('Antivirus ปิดการสแกนเรียลไทม์'); bump('critical');
  }

  if (agent.cpu_load_pct != null && agent.cpu_load_pct >= 90) { reasons.push('CPU ทำงานหนัก'); bump('warn'); }
  if (agent.ram_used_pct != null && agent.ram_used_pct >= 90) { reasons.push('RAM ใกล้เต็ม'); bump('warn'); }

  return { level, reasons };
}

const HEALTH_META: Record<HealthLevel, { label: string; Icon: typeof ShieldCheck }> = {
  ok: { label: 'ปกติ', Icon: ShieldCheck },
  warn: { label: 'ควรตรวจสอบ', Icon: ShieldAlert },
  critical: { label: 'ต้องดำเนินการ', Icon: TriangleAlert },
};

function healthColor(theme: Theme, level: HealthLevel) {
  if (level === 'critical') return theme.palette.error.main;
  if (level === 'warn') return theme.palette.warning.main;
  return theme.palette.success.main;
}

/**
 * Live read from the separate external asset-monitoring agent (not this
 * system's own data) — battery, load, AV status. Renders nothing when the
 * asset has no matching agent (not a computer, agent never installed, or the
 * external server is unreachable) rather than showing a broken/empty card.
 */
export function AssetLiveStatusCard({ loading, agent }: { loading?: boolean; agent?: ExternalAgentData | null }) {
  const theme = useTheme();
  if (!loading && !agent) return null;

  const isOnline = agent?.online ?? agent?.status === 'online';

  return (
    <SectionCard title="สถานะเครื่องแบบเรียลไทม์" icon={Radio}>
      {loading ? (
        <Typography sx={{ fontSize: '0.76rem', color: theme.palette.text.disabled, py: 1.5 }}>กำลังตรวจสอบสถานะ...</Typography>
      ) : agent ? (
        <Box>
          {(() => {
            const { level, reasons } = assessHealth(agent);
            const meta = HEALTH_META[level];
            const color = healthColor(theme, level);
            return (
              <Box sx={{
                display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1.5, p: 1.1,
                borderRadius: '10px', bgcolor: alpha(color, theme.palette.mode === 'dark' ? 0.14 : 0.08),
                border: `1px solid ${alpha(color, 0.3)}`,
              }}>
                <meta.Icon size={17} color={color} strokeWidth={2.2} style={{ flexShrink: 0, marginTop: 1 }} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: '0.82rem', fontWeight: 800, color }}>
                    {meta.label}
                  </Typography>
                  {reasons.length > 0 && (
                    <Typography sx={{ fontSize: '0.7rem', color: theme.palette.text.secondary, mt: '1px' }}>
                      {reasons.join(' · ')}
                    </Typography>
                  )}
                </Box>
              </Box>
            );
          })()}

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Chip
              size="small"
              label={isOnline ? 'ออนไลน์' : 'ออฟไลน์'}
              sx={{
                fontWeight: 700, fontSize: '0.68rem',
                bgcolor: alpha(isOnline ? theme.palette.success.main : theme.palette.text.disabled, 0.12),
                color: isOnline ? theme.palette.success.dark : theme.palette.text.secondary,
              }}
            />
            {agent.last_seen && (
              <Typography sx={{ fontSize: '0.68rem', color: theme.palette.text.disabled }}>
                พบล่าสุด {fmtLastSeen(agent.last_seen)}
              </Typography>
            )}
          </Box>

          {agent.battery_charge_pct != null && (
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, p: 1.1,
              borderRadius: '10px', bgcolor: alpha(battColor(theme, agent.battery_charge_pct), 0.06),
            }}>
              <BatteryCharging size={18} color={battColor(theme, agent.battery_charge_pct)} style={{ flexShrink: 0 }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: '0.9rem', fontWeight: 800, color: battColor(theme, agent.battery_charge_pct) }}>
                  แบตเตอรี่ {Math.round(agent.battery_charge_pct)}%
                </Typography>
                <Typography sx={{ fontSize: '0.68rem', color: theme.palette.text.secondary }}>
                  {agent.battery_status || '—'}
                  {agent.battery_health_pct != null ? ` · สุขภาพแบต ${Math.round(agent.battery_health_pct)}%` : ''}
                </Typography>
              </Box>
            </Box>
          )}

          <MeterRow label="CPU" pct={agent.cpu_load_pct} color={theme.palette.info.main} />
          <MeterRow label={`RAM${agent.ram_total_gb ? ` (${agent.ram_total_gb} GB)` : ''}`} pct={agent.ram_used_pct} color={theme.palette.secondary.main} />

          <Box sx={{ mt: 1 }}>
            <Row label="ผู้ใช้ที่ล็อกอิน" value={agent.logged_user} />
            <Row label="IP ล่าสุด" value={agent.ip} />
            <Row label="Antivirus" value={agent.tm_installed ? `Trend Micro · ${agent.tm_realtime_scan || 'Enabled'}` : null} />
          </Box>
        </Box>
      ) : null}

      <Typography sx={{
        fontSize: '0.68rem', color: theme.palette.text.disabled, mt: 1.5,
        pt: 1.25, borderTop: `1px solid ${theme.palette.divider}`,
      }}>
        ข้อมูลจากระบบ Agent ตรวจสอบเครื่อง (ภายนอก) — อ่านอย่างเดียว ไม่ใช่ข้อมูลที่บันทึกในระบบนี้
      </Typography>
    </SectionCard>
  );
}
