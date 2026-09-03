import React from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import { CheckCircle2 } from 'lucide-react';

/**
 * สิ่งที่ปกติ ยุบเหลือแถบเดียว
 *
 * เดิมโมดูลที่สุขภาพดีได้การ์ดของตัวเองเท่ากับเรื่องที่ค้างอยู่ ทั้งที่ไม่มีอะไร
 * ให้ทำกับมัน พื้นที่จึงถูกใช้ไปกับการยืนยันว่าทุกอย่างเรียบร้อย
 *
 * `notStarted` แยกจาก `ok` โดยตั้งใจ — โมดูลที่ยังไม่มีใครใช้ ไม่ได้แปลว่าปกติ
 * แค่ยังไม่มีข้อมูลให้ตัดสิน การนับรวมกันจะทำให้ช่องโหว่หายไปในความเขียว
 */
export function QuietStatusBar({ ok, notStarted }: {
  ok: { label: string; value: string }[];
  notStarted: string[];
}) {
  const theme = useTheme();
  if (!ok.length && !notStarted.length) return null;

  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap',
      bgcolor: alpha(theme.palette.success.main, 0.07),
      border: `1px solid ${alpha(theme.palette.success.main, 0.25)}`,
      borderRadius: '14px', px: 2.25, py: 1.5, mb: 1.5,
    }}>
      <CheckCircle2 size={17} color={theme.palette.success.main} />
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: theme.palette.success.dark }}>
        ระบบส่วนที่เหลือปกติ
      </Typography>
      {ok.map(o => (
        <Typography key={o.label} sx={{ fontSize: 12.5, color: 'text.secondary' }}>
          {o.label}{' '}
          <Box component="span" sx={{ fontWeight: 700, color: 'text.primary', fontVariantNumeric: 'tabular-nums' }}>
            {o.value}
          </Box>
        </Typography>
      ))}
      {notStarted.length > 0 && (
        <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>
          · ยังไม่เริ่มบันทึก: {notStarted.join(' · ')}
        </Typography>
      )}
    </Box>
  );
}
