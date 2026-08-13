import React from 'react';
import { Box, Typography, LinearProgress, alpha, useTheme } from '@mui/material';
import { PieChart } from 'lucide-react';
import { SectionCard } from './SectionCard';

interface CategoryUtil {
  id: number;
  name: string;
  icon: string | null;
  total: number;
  utilizationPct: number;
}

export function CategoryUtilizationCard({ categories, onNavigate }: { categories: CategoryUtil[]; onNavigate?: () => void }) {
  const theme = useTheme();

  return (
    <SectionCard title="อัตราการใช้งานตามหมวดหมู่" icon={PieChart} action={onNavigate} actionLabel="ดูทั้งหมด">
      {categories.length === 0 ? (
        <Typography sx={{ fontSize: '0.78rem', color: theme.palette.text.secondary, py: 1 }}>ยังไม่มีข้อมูลหมวดหมู่</Typography>
      ) : (
        <Box>
          {categories.map(c => {
            const color = c.utilizationPct >= 80 ? theme.palette.error.main : c.utilizationPct >= 50 ? theme.palette.warning.main : theme.palette.success.main;
            return (
              <Box key={c.id} sx={{ py: 0.9 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                  <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: theme.palette.text.primary, display: 'flex', alignItems: 'center', gap: 0.6, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.icon && <span>{c.icon}</span>} {c.name}
                  </Typography>
                  <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: theme.palette.text.secondary, flexShrink: 0 }}>
                    {c.total} ชิ้น
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <LinearProgress variant="determinate" value={c.utilizationPct} sx={{
                    flex: 1, height: 5, borderRadius: 999,
                    bgcolor: alpha(color, theme.palette.mode === 'dark' ? 0.18 : 0.12),
                    '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 999 },
                  }} />
                  <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color, fontFamily: 'ui-monospace, "SF Mono", Consolas, monospace', width: 36, textAlign: 'right' }}>
                    {c.utilizationPct}%
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </SectionCard>
  );
}
