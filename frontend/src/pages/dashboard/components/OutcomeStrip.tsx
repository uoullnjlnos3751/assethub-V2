import React from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import { TrendingUp, ArrowUpRight } from 'lucide-react';

/**
 * ผลลัพธ์ที่ระบบเสนอไปแล้วปีนี้
 *
 * ทั้งแดชบอร์ดตอบว่า "มีของเท่าไร" ซึ่งเป็นตัวเลขที่ไม่เปลี่ยนและไม่มีใครทำอะไรกับมัน
 * สิ่งที่ผู้บริหารถามคือ "แล้วได้อะไร" — ระบบคำนวณคำตอบไว้แล้วในรายงานจัดซื้อ
 * แต่ไม่เคยขึ้นหน้าแรก
 *
 * ใช้ตัวเลขจากตัวคำนวณเดียวกับเอกสารที่ยื่นหน่วยงาน ตัวเลขสองที่จึงเถียงกันเองไม่ได้
 */
export function OutcomeStrip({ outcome, year, navigate }: {
  outcome: { addRam: number; replaceBattery: number; replaceMachine: number;
             coverage?: { pmCompleted: number; totalAssets: number; pmPercent: number } } | null;
  year: number;
  navigate: (path: string) => void;
}) {
  const theme = useTheme();
  if (!outcome) return null;

  const total = outcome.addRam + outcome.replaceBattery + outcome.replaceMachine;
  if (total === 0) return null;

  const items = [
    { n: outcome.addRam, label: 'เสนอเพิ่ม RAM', note: 'แทนการเปลี่ยนเครื่อง', c: theme.palette.success.main },
    { n: outcome.replaceBattery, label: 'เสนอเปลี่ยนแบตเตอรี่', note: 'จาก Agent ที่วัดได้จริง', c: theme.palette.warning.main },
    { n: outcome.replaceMachine, label: 'เสนอพิจารณาเปลี่ยนเครื่อง', note: 'เพิ่ม RAM แล้วไม่น่าช่วย', c: theme.palette.error.main },
  ].filter(i => i.n > 0);

  return (
    <Box sx={{
      bgcolor: 'background.paper',
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: '14px', p: '14px 18px', mb: 2,
      boxShadow: theme.palette.mode === 'dark' ? '0 6px 18px rgba(0,0,0,.35)' : '0 6px 18px rgba(16,24,40,.06)',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, gap: 1, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingUp size={16} color={theme.palette.primary.main} strokeWidth={2.2} />
          <Typography sx={{ fontSize: '0.82rem', fontWeight: 800 }}>
            ผลจากการตรวจ PM ปี {year + 543}
          </Typography>
          {outcome.coverage && (
            <Typography sx={{ fontSize: 11.5, color: 'text.disabled' }}>
              จากที่ตรวจแล้ว {outcome.coverage.pmCompleted}/{outcome.coverage.totalAssets} เครื่อง ({outcome.coverage.pmPercent}%)
            </Typography>
          )}
        </Box>
        <Box onClick={() => navigate('/reports/pm')}
          sx={{ display: 'flex', alignItems: 'center', gap: 0.25, fontSize: '0.75rem', fontWeight: 700,
            color: 'primary.main', cursor: 'pointer' }}>
          ออกเอกสารเสนอผู้บริหาร <ArrowUpRight size={13} />
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {items.map(i => (
          <Box key={i.label} sx={{
            flex: '1 1 180px', px: 1.75, py: 1.25, borderRadius: 2,
            bgcolor: alpha(i.c, 0.07), border: `1px solid ${alpha(i.c, 0.22)}`,
          }}>
            <Typography sx={{ fontSize: 22, fontWeight: 700, color: i.c, lineHeight: 1.2,
              fontVariantNumeric: 'tabular-nums' }}>
              {i.n}
            </Typography>
            <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{i.label}</Typography>
            <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>{i.note}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
