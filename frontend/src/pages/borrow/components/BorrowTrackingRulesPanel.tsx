import React from 'react';
import { Card, CardContent, Box, Typography, alpha, useTheme } from '@mui/material';
import GavelIcon from '@mui/icons-material/Gavel';

// Real policy from BUSINESS-RULES.md §3 (ระยะเวลายืมและการต่ออายุ) — not
// decorative copy. Shared by ExtensionQueuePage and BorrowOverduePage since
// the design handoff shows both on one "ต่ออายุ & เกินกำหนด" screen.
const RULES = [
  { label: 'ระยะเวลายืมสูงสุด', value: '30 วัน' },
  { label: 'ต่ออายุได้สูงสุด', value: '2 ครั้ง ครั้งละ 15 วัน' },
  { label: 'ยื่นขอต่ออายุล่วงหน้า', value: 'ไม่น้อยกว่า 3 วันทำการ' },
  { label: 'แจ้งเตือนก่อนครบกำหนด', value: '7 · 3 · 1 วัน' },
  { label: 'ระงับสิทธิ์เมื่อคืนช้า', value: 'เกิน 7 วัน → ระงับ 30 วัน' },
];

export function BorrowTrackingRulesPanel() {
  const theme = useTheme();
  return (
    <Card sx={{ bgcolor: alpha(theme.palette.info.main, 0.06), border: `1px solid ${alpha(theme.palette.info.main, 0.2)}` }}>
      <CardContent sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
        <GavelIcon color="info" fontSize="small" sx={{ mt: 0.25 }} />
        <Box sx={{ minWidth: 0, width: '100%' }}>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>มาตรการติดตาม</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 0.75 }}>
            {RULES.map(r => (
              <Box key={r.label} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">{r.label}</Typography>
                <Typography variant="body2" fontWeight={700}>{r.value}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
