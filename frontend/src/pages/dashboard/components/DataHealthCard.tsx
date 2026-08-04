import React from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import { AlertTriangle } from 'lucide-react';
import { SectionCard } from './SectionCard';
import { statusColor } from '../dashboardHelpers';

export function DataHealthCard({ dataHealth, navigate }: { dataHealth: any; navigate: (path: string) => void }) {
  const theme = useTheme();
  return (
    <SectionCard title="ข้อมูลไม่สมบูรณ์" icon={AlertTriangle} action={() => navigate('/assets')} actionLabel="ตรวจสอบ">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {[
          { label: 'OS เก่า/เสี่ยง (Win 7, 8, 10)', value: dataHealth?.outdatedOSCount || 0, status: 'Lost', filter: 'search=windows' },
          { label: 'ไม่มี Serial No.', value: dataHealth?.missingSerial || 0, status: 'Lost', filter: 'serialNo=' },
          { label: 'ไม่ระบุสถานที่', value: dataHealth?.missingLocation || 0, status: 'Borrowed', filter: 'location=' },
          { label: 'ไม่ระบุบริษัท', value: dataHealth?.missingCompany || 0, status: 'Borrowed', filter: 'company=' },
          { label: 'ไม่ระบุประเภท', value: dataHealth?.missingType || 0, status: 'InUse', filter: 'type=' },
        ].map(row => {
          const color = statusColor(theme, row.status);
          return (
            <Box key={row.label} onClick={() => { if (row.value > 0) navigate(`/assets?${row.filter}`); }} sx={{
              display: 'flex', alignItems: 'center', gap: 1,
              p: '7px 10px', borderRadius: 1.5,
              bgcolor: alpha(theme.palette.divider, 0.4),
              cursor: row.value > 0 ? 'pointer' : 'default',
              '&:hover': row.value > 0 ? { bgcolor: alpha(color, 0.08) } : {},
            }}>
              <Typography sx={{ fontSize: '0.75rem', color: theme.palette.text.secondary, flex: 1 }}>{row.label}</Typography>
              <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: row.value > 0 ? color : theme.palette.text.disabled }}>{row.value}</Typography>
            </Box>
          );
        })}
      </Box>
    </SectionCard>
  );
}
