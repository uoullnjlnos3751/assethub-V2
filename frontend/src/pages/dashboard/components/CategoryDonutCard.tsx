import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { Boxes } from 'lucide-react';
import { SectionCard } from './SectionCard';
import { DonutChart } from './DonutChart';
import { CAT_COLORS } from '../dashboardHelpers';

export function CategoryDonutCard({ byCategory, total, onNavigate }: {
  byCategory: any[];
  total: number;
  onNavigate: () => void;
}) {
  const theme = useTheme();
  const donutTotal = byCategory.reduce((s: number, c: any) => s + (c.assetCount ?? 0), 0) || total;
  const donutSegs = byCategory.slice(0, 6).map((c: any, i: number) => ({
    value: c.assetCount ?? 0,
    color: CAT_COLORS[i % CAT_COLORS.length],
    name: c.name,
  }));
  if (donutSegs.length === 0) donutSegs.push({ value: total, color: theme.palette.warning.main, name: 'อื่นๆ' });

  return (
    <SectionCard title="สัดส่วนตามหมวดหมู่" icon={Boxes} action={onNavigate} actionLabel={`${total} รายการ`}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, height: '100%' }}>
        <DonutChart segments={donutSegs} total={donutTotal} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {byCategory.slice(0, 6).map((c: any, i: number) => (
            <Box key={c.name || i} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: CAT_COLORS[i % CAT_COLORS.length], flexShrink: 0 }} />
              <Typography sx={{ fontSize: '0.72rem', color: theme.palette.text.secondary, flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                {c.name || 'อื่นๆ'}
              </Typography>
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: theme.palette.text.primary, flexShrink: 0 }}>{c.assetCount ?? 0}</Typography>
            </Box>
          ))}
          {byCategory.length === 0 && (
            <Typography sx={{ fontSize: '0.72rem', color: theme.palette.text.secondary }}>ยังไม่มีข้อมูลหมวดหมู่</Typography>
          )}
        </Box>
      </Box>
    </SectionCard>
  );
}
