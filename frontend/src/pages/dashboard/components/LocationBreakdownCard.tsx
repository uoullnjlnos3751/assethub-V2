import React from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import { Boxes } from 'lucide-react';
import { SectionCard } from './SectionCard';
import { CAT_COLORS, pct } from '../dashboardHelpers';

export function LocationBreakdownCard({ byLocation, total, onNavigate }: {
  byLocation: any[];
  total: number;
  onNavigate: () => void;
}) {
  const theme = useTheme();
  return (
    <SectionCard title="ทรัพย์สินตามสถานที่ตั้ง" icon={Boxes} action={onNavigate} actionLabel="แผนที่">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {byLocation.length > 0 ? byLocation.slice(0, 6).map((loc: any, i: number) => {
          const locName = loc.location || 'ไม่ระบุสถานที่';
          const locColor = CAT_COLORS[(i + 3) % CAT_COLORS.length];
          const p = pct(loc._count, total);
          return (
            <Box key={locName}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.25 }}>
                <Typography sx={{ fontSize: '0.72rem', color: theme.palette.text.secondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>{locName}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: theme.palette.text.primary }}>{loc._count}</Typography>
                  <Typography sx={{ fontSize: '0.68rem', color: theme.palette.text.disabled, minWidth: 28, textAlign: 'right' }}>{p}%</Typography>
                </Box>
              </Box>
              <Box sx={{ height: 4, borderRadius: 2, bgcolor: alpha(locColor, 0.12), overflow: 'hidden' }}>
                <Box sx={{ height: '100%', width: `${p}%`, borderRadius: 2, bgcolor: locColor }} />
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
