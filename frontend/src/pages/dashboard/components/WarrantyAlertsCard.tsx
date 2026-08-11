import React from 'react';
import { Box, Typography, Chip, alpha, useTheme } from '@mui/material';
import { AlertTriangle, Shield } from 'lucide-react';
import { SectionCard } from './SectionCard';

export function WarrantyAlertsCard({ warrantyData, navigate }: { warrantyData: any; navigate: (path: string) => void }) {
  const theme = useTheme();
  return (
    <SectionCard title={`ประกันใกล้หมดอายุ${warrantyData?.expiredCount > 0 ? ` · หมดแล้ว ${warrantyData.expiredCount}` : ''}`} icon={Shield} action={() => navigate('/reports/assets')} actionLabel="ดูรายงาน">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {warrantyData?.expiredCount > 0 && (
          <Box sx={{
            p: 1.25, borderRadius: 1.5,
            bgcolor: alpha(theme.palette.error.main, 0.08),
            border: `1px solid ${alpha(theme.palette.error.main, 0.25)}`,
            display: 'flex', gap: 1.25, alignItems: 'center',
          }}>
            <AlertTriangle size={18} color={theme.palette.error.main} />
            <Typography sx={{ fontSize: '0.75rem', color: theme.palette.error.main, fontWeight: 600 }}>
              มีอุปกรณ์ {warrantyData.expiredCount} รายการที่ประกันหมดแล้ว กรุณาต่ออายุหรือตรวจสอบ
            </Typography>
          </Box>
        )}
        {warrantyData?.expiring?.slice(0, 4).map((item: any) => (
          <Box key={item.id} onClick={() => navigate(`/assets/${item.id}`)} sx={{
            display: 'flex', alignItems: 'center', gap: 1.25,
            p: '7px 10px', borderRadius: 1.5,
            border: `1px solid ${item.daysLeft <= 14 ? alpha(theme.palette.error.main, 0.25) : alpha(theme.palette.warning.main, 0.25)}`,
            bgcolor: item.daysLeft <= 14 ? alpha(theme.palette.error.main, 0.05) : alpha(theme.palette.warning.main, 0.05),
            cursor: 'pointer', '&:hover': { opacity: 0.85 },
          }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography noWrap sx={{ fontSize: '0.75rem', fontWeight: 600, color: theme.palette.text.primary }}>
                {item.assetCode} — {item.brand} {item.model}
              </Typography>
              <Typography sx={{ fontSize: '0.68rem', color: theme.palette.text.secondary }}>
                {item.category?.name} · หมดอายุ: {new Date(item.warrantyEndDate).toLocaleDateString('th-TH')}
              </Typography>
            </Box>
            <Chip label={`${item.daysLeft} วัน`} size="small" sx={{
              height: 20, fontSize: '0.68rem', fontWeight: 700,
              bgcolor: item.daysLeft <= 7 ? alpha(theme.palette.error.main, 0.15)
                : item.daysLeft <= 30 ? alpha(theme.palette.warning.main, 0.15)
                : alpha(theme.palette.success.main, 0.15),
              color: item.daysLeft <= 7 ? theme.palette.error.main
                : item.daysLeft <= 30 ? theme.palette.warning.main
                : theme.palette.success.main,
            }} />
          </Box>
        ))}
        {(!warrantyData || (warrantyData.expiring?.length === 0 && !warrantyData.expiredCount)) && (
          <Typography sx={{ fontSize: '0.75rem', color: theme.palette.text.secondary, py: 1 }}>ไม่มีอุปกรณ์ที่ประกันใกล้หมดอายุ</Typography>
        )}
      </Box>
    </SectionCard>
  );
}
