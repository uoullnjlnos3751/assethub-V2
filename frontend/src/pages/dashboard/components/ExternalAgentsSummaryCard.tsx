import React from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import { Radio, ShieldCheck } from 'lucide-react';
import { SectionCard } from './SectionCard';

interface Summary {
  total: number;
  online: number;
  offline: number;
  trend_micro?: { ok: number; installed: number };
}

function Stat({ label, value, color }: { label: string; value: number | string; color: string }) {
  const theme = useTheme();
  return (
    <Box sx={{ flex: '1 1 0', minWidth: 0, textAlign: 'center' }}>
      <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color, lineHeight: 1.1 }}>{value}</Typography>
      <Typography sx={{ fontSize: '0.68rem', color: theme.palette.text.secondary, mt: 0.25 }}>{label}</Typography>
    </Box>
  );
}

/**
 * "Devices online right now" pulled from the external asset-monitoring
 * agent's own /summary endpoint (already aggregated server-side — no
 * per-device loop). Renders nothing when the agent server has no data for
 * this env, same graceful-degrade rule as the asset-detail live status card.
 */
export function ExternalAgentsSummaryCard({ summary }: { summary: Summary | null }) {
  const theme = useTheme();
  if (!summary) return null;

  const onlinePct = summary.total > 0 ? Math.round((summary.online / summary.total) * 100) : 0;

  return (
    <SectionCard title="อุปกรณ์ออนไลน์ตอนนี้" icon={Radio}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Stat label="ออนไลน์" value={summary.online} color={theme.palette.success.main} />
        <Stat label="ออฟไลน์" value={summary.offline} color={theme.palette.text.disabled} />
        <Stat label="ทั้งหมด" value={summary.total} color={theme.palette.text.primary} />
      </Box>

      <Box sx={{
        height: 8, borderRadius: 999, overflow: 'hidden', display: 'flex',
        bgcolor: alpha(theme.palette.text.disabled, 0.15), mb: 1.5,
      }}>
        <Box sx={{ width: `${onlinePct}%`, bgcolor: theme.palette.success.main }} />
      </Box>

      {summary.trend_micro && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <ShieldCheck size={14} color={theme.palette.text.secondary} />
          <Typography sx={{ fontSize: '0.7rem', color: theme.palette.text.secondary }}>
            Trend Micro ทำงานปกติ {summary.trend_micro.ok}/{summary.trend_micro.installed} เครื่องที่ติดตั้ง
          </Typography>
        </Box>
      )}

      <Typography sx={{
        fontSize: '0.66rem', color: theme.palette.text.disabled, mt: 1.5,
        pt: 1, borderTop: `1px solid ${theme.palette.divider}`,
      }}>
        ข้อมูลจากระบบ Agent ตรวจสอบเครื่อง (ภายนอก)
      </Typography>
    </SectionCard>
  );
}
