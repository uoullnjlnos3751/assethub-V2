import React from 'react';
import { Box, Typography, LinearProgress, alpha, useTheme } from '@mui/material';
import { Shield } from 'lucide-react';
import { SectionCard } from './SectionCard';

export function PMSummaryCard({ pmTotal, pmDone, pmPct, onNavigate }: {
  pmTotal: number;
  pmDone: number;
  pmPct: number;
  onNavigate: () => void;
}) {
  const theme = useTheme();
  return (
    <SectionCard title="PM ตรวจนับ" icon={Shield} action={onNavigate} actionLabel="รายละเอียด">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 1.25 }}>
        {[
          { label: 'แผนงานทั้งหมด', value: pmTotal, color: theme.palette.text.secondary },
          { label: 'เสร็จสมบูรณ์', value: pmDone, color: theme.palette.success.main },
          { label: 'คงเหลือ', value: pmTotal - pmDone, color: theme.palette.warning.main },
        ].map(row => (
          <Box key={row.label} sx={{
            display: 'flex', alignItems: 'center', gap: 1,
            p: '7px 10px', borderRadius: 1.5,
            bgcolor: alpha(theme.palette.divider, 0.4),
          }}>
            <Typography sx={{ fontSize: '0.75rem', color: theme.palette.text.secondary, flex: 1 }}>{row.label}</Typography>
            <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: row.color }}>{row.value}</Typography>
          </Box>
        ))}
      </Box>
      <Box sx={{
        bgcolor: alpha(theme.palette.success.main, 0.06),
        border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
        borderRadius: 1.5, p: 1.25,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography sx={{ fontSize: '0.72rem', color: theme.palette.text.secondary }}>ความคืบหน้า</Typography>
          <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: theme.palette.success.main }}>{pmPct}%</Typography>
        </Box>
        <LinearProgress variant="determinate" value={pmPct} sx={{
          height: 6, borderRadius: 3,
          bgcolor: alpha(theme.palette.success.main, 0.12),
          '& .MuiLinearProgress-bar': { borderRadius: 3, bgcolor: theme.palette.success.main },
        }} />
      </Box>
    </SectionCard>
  );
}
