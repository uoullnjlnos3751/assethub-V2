import React from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import { TrendingUp, ArrowUpRight } from 'lucide-react';

export interface OutcomeData {
  addRam: number;
  replaceBattery: number;
  replaceMachine: number;
  coverage?: { pmCompleted: number; totalAssets: number; pmPercent: number };
}

/**
 * มีอะไรให้แสดงไหม — แยกออกมาเป็นฟังก์ชันเพราะหน้าแดชบอร์ดต้องรู้คำตอบก่อน
 * เรนเดอร์ เพื่อตัดสินว่าจะจับคู่แถบนี้กับวงจรชีวิตแบบสองคอลัมน์ หรือปล่อยให้
 * วงจรชีวิตกินเต็มความกว้าง ถ้าปล่อยให้แต่ละที่คิดเงื่อนไขเอง สองที่จะเพี้ยนกัน
 * เมื่อแก้ข้างเดียว
 */
export function hasOutcome(outcome: OutcomeData | null | undefined): boolean {
  if (!outcome) return false;
  return outcome.addRam + outcome.replaceBattery + outcome.replaceMachine > 0;
}

/**
 * ผลลัพธ์ที่ระบบเสนอไปแล้วปีนี้
 *
 * ทั้งแดชบอร์ดตอบว่า "มีของเท่าไร" ซึ่งเป็นตัวเลขที่ไม่เปลี่ยนและไม่มีใครทำอะไรกับมัน
 * สิ่งที่ผู้บริหารถามคือ "แล้วได้อะไร" — ระบบคำนวณคำตอบไว้แล้วในรายงานจัดซื้อ
 * แต่ไม่เคยขึ้นหน้าแรก
 *
 * ใช้ตัวเลขจากตัวคำนวณเดียวกับเอกสารที่ยื่นหน่วยงาน ตัวเลขสองที่จึงเถียงกันเองไม่ได้
 *
 * แต่ละรายการเป็นแถวบรรทัดเดียว ไม่ใช่กล่องสามใบเรียงข้างกัน — แบบกล่องต้องการ
 * ความกว้างราว 600px ถึงจะไม่ตก ทำให้แถบนี้ต้องกินเต็มความกว้างทั้งที่มีแค่สาม
 * ตัวเลข พอเป็นแถวก็อยู่ในคอลัมน์แคบข้างวงจรชีวิตได้ ประหยัดความสูงไปทั้งแถบ
 */
export function OutcomeStrip({ outcome, year, navigate }: {
  outcome: OutcomeData | null;
  year: number;
  navigate: (path: string) => void;
}) {
  const theme = useTheme();
  if (!hasOutcome(outcome)) return null;

  const items = [
    { n: outcome!.addRam, label: 'เสนอเพิ่ม RAM', note: 'แทนการเปลี่ยนเครื่อง', c: theme.palette.success.main },
    { n: outcome!.replaceBattery, label: 'เสนอเปลี่ยนแบตเตอรี่', note: 'จาก Agent ที่วัดได้จริง', c: theme.palette.warning.main },
    { n: outcome!.replaceMachine, label: 'เสนอพิจารณาเปลี่ยนเครื่อง', note: 'เพิ่ม RAM แล้วไม่น่าช่วย', c: theme.palette.error.main },
  ].filter(i => i.n > 0);

  return (
    <Box sx={{
      bgcolor: 'background.paper',
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: '14px', p: '14px 18px', height: '100%',
      boxShadow: theme.palette.mode === 'dark' ? '0 6px 18px rgba(0,0,0,.35)' : '0 6px 18px rgba(16,24,40,.06)',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1, gap: 1 }}>
        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            <TrendingUp size={16} color={theme.palette.primary.main} strokeWidth={2.2} />
            <Typography noWrap sx={{ fontSize: '0.82rem', fontWeight: 800 }}>
              ผลจากการตรวจ PM ปี {year + 543}
            </Typography>
          </Box>
          {/* ความครอบคลุมเป็นบรรทัดรองของหัวข้อ ไม่ใช่แถวแยกท้ายการ์ด — เป็น
              เงื่อนไขของตัวเลขข้างล่าง ไม่ใช่ผลลัพธ์อีกตัว */}
          {outcome!.coverage && (
            <Typography noWrap sx={{ fontSize: 10.5, color: 'text.disabled', mt: '1px' }}>
              ตรวจแล้ว {outcome!.coverage.pmCompleted}/{outcome!.coverage.totalAssets} เครื่อง ({outcome!.coverage.pmPercent}%)
            </Typography>
          )}
        </Box>
        <Box onClick={() => navigate('/reports/pm')}
          sx={{ display: 'flex', alignItems: 'center', gap: 0.25, fontSize: '0.72rem', fontWeight: 700,
            color: 'primary.main', cursor: 'pointer', flexShrink: 0 }}>
          ออกเอกสาร <ArrowUpRight size={12} />
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6 }}>
        {items.map(i => (
          <Box key={i.label} title={`${i.label} — ${i.note}`} sx={{
            display: 'flex', alignItems: 'center', gap: 1.25,
            px: 1.25, py: 0.7, borderRadius: 2,
            bgcolor: alpha(i.c, 0.07), border: `1px solid ${alpha(i.c, 0.22)}`,
          }}>
            <Typography sx={{
              fontSize: 18, fontWeight: 700, color: i.c, lineHeight: 1.15,
              fontVariantNumeric: 'tabular-nums', minWidth: 26, textAlign: 'right', flexShrink: 0,
            }}>
              {i.n}
            </Typography>
            {/* ป้ายกับคำขยายอยู่บรรทัดเดียว — ในคอลัมน์แคบ การแยกสองบรรทัดทำให้
                การ์ดสูงขึ้นเกือบเท่าที่ประหยัดได้จากการจับคู่ */}
            <Typography noWrap sx={{ fontSize: 12, fontWeight: 600, minWidth: 0 }}>
              {i.label}
              <Box component="span" sx={{ fontWeight: 400, color: 'text.disabled' }}> · {i.note}</Box>
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
