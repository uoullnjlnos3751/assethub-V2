import React from 'react';
import { Box, Typography, Chip, alpha, useTheme } from '@mui/material';
import { AppWindow } from 'lucide-react';
import { SectionCard } from '../../../components/SectionCard';

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : null;

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  const theme = useTheme();
  if (value == null || value === '') return null;
  return (
    <Box sx={{
      display: 'flex', justifyContent: 'space-between', gap: 1.5, alignItems: 'baseline',
      py: 0.7, borderBottom: `1px dashed ${alpha(theme.palette.divider, 0.9)}`,
      '&:last-of-type': { borderBottom: 'none' },
    }}>
      <Typography sx={{ fontSize: '0.75rem', color: theme.palette.text.secondary, flex: 'none' }}>{label}</Typography>
      <Box sx={{ fontSize: '0.78rem', fontWeight: 600, color: theme.palette.text.primary, textAlign: 'right', minWidth: 0, wordBreak: 'break-word' }}>
        {value}
      </Box>
    </Box>
  );
}

/**
 * Windows license + update status, read live from the monitoring agent —
 * this system's Windows tab has no equivalent anywhere else, and unlike a
 * per-update history list (which the agent doesn't report), activation
 * state and update rollup status are real fields it does send.
 */
export function WindowsCard({ agent }: { agent: any }) {
  const theme = useTheme();
  if (!agent || (!agent.win_activation_status && !agent.os_name)) return null;

  const activated = agent.win_activated === 1 || agent.win_activation_status === 'Licensed';
  const wuOutdated = agent.wu_status && agent.wu_status !== 'Up to date' && agent.wu_status !== 'Current';

  return (
    <SectionCard title="Windows" icon={AppWindow}>
      <Box>
        <Row label="ระบบปฏิบัติการ" value={agent.os_name} />
        <Row label="Edition" value={agent.win_edition} />
        <Row label="เวอร์ชัน / Build" value={[agent.os_version, agent.os_build_full || agent.os_build].filter(Boolean).join(' · Build ')} />
        <Row label="สถาปัตยกรรม" value={agent.os_architecture} />
        <Row label="วันที่ติดตั้ง" value={fmtDate(agent.os_install_date)} />
        <Row label="สิทธิ์การใช้งาน" value={
          <Chip
            label={activated ? (agent.win_activation_status || 'เปิดใช้งานแล้ว') : 'ยังไม่เปิดใช้งาน'}
            size="small"
            sx={{
              height: 20, fontSize: '0.68rem', fontWeight: 700,
              bgcolor: alpha(activated ? theme.palette.success.main : theme.palette.error.main, 0.14),
              color: activated ? theme.palette.success.dark : theme.palette.error.main,
            }}
          />
        } />
        <Row label="ช่องทางไลเซนส์" value={agent.win_license_channel} />
        <Row label="Product Key" value={agent.win_partial_key ? `••••-${agent.win_partial_key}` : null} />
      </Box>

      {(agent.wu_status || agent.wu_last_install) && (
        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: theme.palette.text.disabled, textTransform: 'uppercase', letterSpacing: '.04em', mb: 0.5 }}>
            Windows Update
          </Typography>
          <Row label="สถานะ" value={
            <Chip
              label={agent.wu_status || '—'}
              size="small"
              sx={{
                height: 20, fontSize: '0.68rem', fontWeight: 700,
                bgcolor: alpha(wuOutdated ? theme.palette.warning.main : theme.palette.success.main, 0.14),
                color: wuOutdated ? theme.palette.warning.dark : theme.palette.success.dark,
              }}
            />
          } />
          <Row label="ติดตั้งล่าสุด" value={fmtDate(agent.wu_last_install)} />
          <Row label="ต้องรีสตาร์ทเพื่อติดตั้ง" value={agent.wu_reboot_required ? 'ใช่' : agent.wu_reboot_required === 0 ? 'ไม่ต้อง' : null} />
          <Row label="อัปเดตที่ล้มเหลว" value={agent.wu_failed_count > 0 ? `${agent.wu_failed_count} รายการ` : (agent.wu_failed_count === 0 ? 'ไม่มี' : null)} />
        </Box>
      )}
    </SectionCard>
  );
}
