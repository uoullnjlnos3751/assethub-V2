import React from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import { CheckCircle2 } from 'lucide-react';
import { SectionCard } from './SectionCard';
import { STATUS_CFG, statusColor, pct } from '../dashboardHelpers';

export function AssetStatusBreakdownCard({ byStatus, total, onNavigate }: {
  byStatus: any[];
  total: number;
  onNavigate: () => void;
}) {
  const theme = useTheme();
  return (
    <SectionCard title="สรุปสถานะทรัพย์สิน" icon={CheckCircle2} action={onNavigate} actionLabel="ดูทั้งหมด">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {byStatus.length > 0 ? byStatus.map((s: any) => {
          const cfg = STATUS_CFG[s.status] || { label: s.status, colorKey: 'neutral' };
          const color = statusColor(theme, s.status);
          const p = pct(s._count, total);
          return (
            <Box key={s.status}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.25 }}>
                <Typography sx={{ fontSize: '0.72rem', color: theme.palette.text.secondary }}>{cfg.label}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: theme.palette.text.primary }}>{s._count}</Typography>
                  <Typography sx={{ fontSize: '0.68rem', color: theme.palette.text.disabled, minWidth: 28, textAlign: 'right' }}>{p}%</Typography>
                </Box>
              </Box>
              <Box sx={{ height: 4, borderRadius: 2, bgcolor: alpha(color, 0.12), overflow: 'hidden' }}>
                <Box sx={{ height: '100%', width: `${p}%`, borderRadius: 2, bgcolor: color }} />
              </Box>
            </Box>
          );
        }) : (
          <Typography sx={{ fontSize: '0.72rem', color: theme.palette.text.secondary, py: 1 }}>ยังไม่มีข้อมูล</Typography>
        )}
      </Box>
    </SectionCard>
  );
}
