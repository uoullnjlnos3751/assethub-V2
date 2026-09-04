import React from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';

/**
 * วงจรชีวิตทรัพย์สินเป็นแถวเดียว
 *
 * ระบบจัดตาม "โมดูล" มาตลอด โมดูลที่ยังไม่มีข้อมูลจึงดูเหมือนเมนูที่ไม่มีใครใช้
 * พอเรียงเป็นเส้นเดียวตามวงจรชีวิต ช่วงที่ว่างกลายเป็นข้อเท็จจริงที่ใช้ตัดสินใจได้
 *
 * ช่วงที่ยังไม่เริ่มบันทึกจะจางลงและเขียนบอกตรง ๆ แทนการโชว์เลข 0 —
 * "ยังไม่เริ่มใช้" กับ "ไม่มีปัญหา" เป็นคนละเรื่องกัน แต่เลข 0 บอกแยกไม่ได้
 *
 * เดิมมีลูกศรคั่นระหว่างช่วงเพื่อบอกว่าเป็นลำดับ ตอนนี้ถอดออกแล้ว — พอแถบนี้ย้าย
 * มาอยู่ในคอลัมน์ที่แคบลง (คู่กับผลตรวจ PM) ช่วงจะตกบรรทัดที่จอราว 1200-1280px
 * แล้วลูกศรที่ตกตามลงไปจะกลายเป็นลูกศรลอยหน้าช่องแรกของบรรทัดใหม่ ชี้ไปยังที่ว่าง
 * ลำดับยังอ่านออกจากชื่อช่วงและการเรียงซ้ายไปขวาอยู่แล้ว
 */

export interface Stage {
  key: string;
  label: string;
  value: number;
  detail: string;
  started: boolean;
  href: string;
}

export function LifecycleStrip({ stages, navigate }: {
  stages: Stage[];
  navigate: (path: string) => void;
}) {
  const theme = useTheme();
  if (!stages?.length) return null;

  return (
    <Box sx={{
      bgcolor: 'background.paper',
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: '14px',
      p: '14px 18px',
      height: '100%',
      boxShadow: theme.palette.mode === 'dark' ? '0 6px 18px rgba(0,0,0,.35)' : '0 6px 18px rgba(16,24,40,.06)',
    }}>
      <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '.08em',
        textTransform: 'uppercase', color: 'text.disabled', mb: 1.5 }}>
        วงจรชีวิตทรัพย์สิน
      </Typography>

      {/* ห่อได้เสมอ ไม่ล็อก nowrap ที่ lg เหมือนเดิม — ตอนนี้แถบนี้อยู่ในคอลัมน์
          ที่แคบกว่าเต็มหน้า พอจอเล็กลงช่องจะบีบจนต่ำกว่า minWidth ถ้าห้ามห่อไว้
          กล่องจะล้นออกนอกกรอบและทำให้ทั้งหน้าเลื่อนแนวนอน ปล่อยให้ตกลงบรรทัด
          ใหม่แทน สูงขึ้นนิดเดียวแต่ไม่พัง */}
      <Box sx={{ display: 'flex', alignItems: 'stretch', gap: 0.5, flexWrap: 'wrap' }}>
        {stages.map((s) => (
            <Box key={s.key} onClick={() => navigate(s.href)}
              sx={{
                flex: '1 1 112px', minWidth: 112, px: 1.5, py: 1.25, borderRadius: 2, cursor: 'pointer',
                opacity: s.started ? 1 : 0.55,
                border: '1px solid',
                borderColor: s.started ? 'transparent' : theme.palette.divider,
                borderStyle: s.started ? 'solid' : 'dashed',
                transition: 'background .13s',
                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.06) },
              }}>
              <Typography sx={{ fontSize: 11.5, color: 'text.secondary', fontWeight: 500 }}>{s.label}</Typography>
              <Typography sx={{
                fontSize: 21, fontWeight: 700, lineHeight: 1.25, fontVariantNumeric: 'tabular-nums',
                color: s.started ? 'text.primary' : 'text.disabled',
              }}>
                {s.started ? s.value.toLocaleString() : '—'}
              </Typography>
              <Typography sx={{ fontSize: 10.5, color: 'text.disabled', lineHeight: 1.5, mt: '2px' }}>
                {s.detail}
              </Typography>
            </Box>
        ))}
      </Box>
    </Box>
  );
}
