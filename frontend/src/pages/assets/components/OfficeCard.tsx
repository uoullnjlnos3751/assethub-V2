import React from 'react';
import { Box, Typography, Chip, alpha, useTheme } from '@mui/material';
import { FileSpreadsheet } from 'lucide-react';
import { SectionCard } from '../../../components/SectionCard';

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

/** Microsoft Office install, read live from the agent — richer than the
 *  registry's own flat officeLicense text field (name/year/platform/license
 *  type/activation, not just "which product"). */
export function OfficeCard({ agent }: { agent: any }) {
  const theme = useTheme();
  if (!agent?.office_name) return null;

  const activated = agent.office_activated === 1;

  return (
    <SectionCard title="Microsoft Office" icon={FileSpreadsheet}>
      <Box>
        <Row label="ชุดโปรแกรม" value={agent.office_name} />
        <Row label="รุ่น" value={agent.office_year} />
        <Row label="เวอร์ชัน" value={agent.office_version} />
        <Row label="แพลตฟอร์ม" value={agent.office_platform} />
        <Row label="ประเภทไลเซนส์" value={agent.office_license_type} />
        <Row label="สถานะ" value={
          <Chip
            label={activated ? 'เปิดใช้งานแล้ว' : 'ยังไม่เปิดใช้งาน'}
            size="small"
            sx={{
              height: 20, fontSize: '0.68rem', fontWeight: 700,
              bgcolor: alpha(activated ? theme.palette.success.main : theme.palette.warning.main, 0.14),
              color: activated ? theme.palette.success.dark : theme.palette.warning.dark,
            }}
          />
        } />
      </Box>
    </SectionCard>
  );
}
