import React from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import { ChevronRight, AlertTriangle } from 'lucide-react';
import { SectionCard } from './SectionCard';

/**
 * คิวงานที่ต้องลงมือ เรียงตามความเร่งด่วน
 *
 * แดชบอร์ดเดิมวางการ์ดตามลำดับที่เขียนโค้ด การ์ดที่บอกว่า 99.9% ปกติจึงได้พื้นที่
 * เท่ากับเรื่องที่ค้างอยู่ 274 เครื่อง และเรื่องที่ต้องแก้จริงหล่นไปอยู่ใต้ fold
 *
 * ที่นี่เรียงตามความรุนแรงก่อน แล้วตามสัดส่วนของตัวหารตัวเอง — 31 จาก 33
 * เร่งด่วนกว่า 274 จาก 815 แม้ตัวเลขจะเล็กกว่า เพราะเกือบทั้งหมดของสิ่งนั้นเสีย
 *
 * รายการที่เป็นศูนย์ไม่แสดง ไม่ใช่แสดงเลขศูนย์ — แดชบอร์ดที่เต็มไปด้วยศูนย์
 * สอนให้คนเลิกอ่านมัน
 *
 * วางเป็นกริดการ์ดย่อย ไม่ใช่รายการเรียงลงมาแถวละบรรทัด — แบบเดิมแต่ละแถวสูง
 * ~57px แต่ใช้ความกว้างจริงไม่ถึงครึ่ง พอมี 8 เรื่องจึงกินความสูงเกือบ 460px
 * ทั้งที่ครึ่งขวาว่างเปล่า แบบกริดใช้ความกว้างที่มีอยู่แล้วแทน ความสูงเหลือ
 * ราวหนึ่งในสาม โดยไม่ต้องซ่อนเรื่องไหนไว้ใต้ปุ่ม "ดูเพิ่ม" — ทุกเรื่องในนี้คือ
 * งานที่ต้องทำ การซ่อนคือการทำให้ลืม
 *
 * แถบสีซ้ายแทนจุดกลม: ในกริดหลายคอลัมน์ ลำดับความรุนแรงอ่านจากตำแหน่งไม่ได้
 * เหมือนรายการเรียงลงมา สีจึงต้องเด่นพอให้กวาดตาเห็นทั้งกริดพร้อมกัน
 */

export type Severity = 'crit' | 'warn' | 'info';

export interface AttentionItem {
  key: string;
  severity: Severity;
  title: string;
  detail: string;
  count: number;
  /** ตัวหาร ใช้บอกว่าเรื่องนี้กินสัดส่วนเท่าไรของกลุ่มตัวเอง */
  of: number;
  ofLabel: string;
  actionLabel: string;
  href: string;
}

const RANK: Record<Severity, number> = { crit: 3, warn: 2, info: 1 };
const SEVERITY_LABEL: Record<Severity, string> = { crit: 'ด่วน', warn: 'ควรทำ', info: 'ทั่วไป' };

export function AttentionQueue({ items, navigate }: {
  items: AttentionItem[];
  navigate: (path: string) => void;
}) {
  const theme = useTheme();
  const tone = (s: Severity) =>
    s === 'crit' ? theme.palette.error.main
      : s === 'warn' ? theme.palette.warning.main
        : theme.palette.info.main;

  const sorted = [...items]
    .filter(i => i.count > 0)
    .sort((a, b) =>
      RANK[b.severity] - RANK[a.severity]
      || (b.count / (b.of || 1)) - (a.count / (a.of || 1)));

  if (!sorted.length) {
    return (
      <SectionCard title="ต้องจัดการ" icon={AlertTriangle}>
        <Typography sx={{ fontSize: 13, color: 'success.main', fontWeight: 600, textAlign: 'center', py: 2 }}>
          ไม่มีเรื่องค้างที่ต้องตัดสินใจ
        </Typography>
      </SectionCard>
    );
  }

  /* สรุปหัวการ์ดเป็นจำนวนแยกตามความรุนแรง แทนที่จะบอกแค่ผลรวม — "ด่วน 2"
     บอกได้ทันทีว่าต้องรีบแค่ไหน ซึ่ง "8 เรื่อง" เฉย ๆ บอกไม่ได้ */
  const subtitle = (['crit', 'warn', 'info'] as Severity[])
    .map(s => ({ s, n: sorted.filter(i => i.severity === s).length }))
    .filter(x => x.n > 0)
    .map(x => `${SEVERITY_LABEL[x.s]} ${x.n}`)
    .join(' · ');

  return (
    <SectionCard title="ต้องจัดการ" icon={AlertTriangle} subtitle={subtitle}>
      {/* minmax(0, …) กันช่องกริดกว้างตาม min-content ของข้อความ noWrap ข้างใน
          ซึ่งจะดันให้ล้นกรอบที่จอแคบ */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'minmax(0, 1fr)',
          sm: 'repeat(2, minmax(0, 1fr))',
          lg: 'repeat(3, minmax(0, 1fr))',
        },
        gap: 1,
      }}>
        {sorted.map(it => {
          const col = tone(it.severity);
          const share = it.of ? Math.round((it.count / it.of) * 100) : 0;
          return (
            <Box key={it.key} onClick={() => navigate(it.href)}
              // รายละเอียดย้ายมาเป็น tooltip — เป็นคำอธิบายที่อ่านครั้งเดียวจำได้
              // ไม่คุ้มกับการกินอีกบรรทัดในทุกใบตลอดไป
              title={it.detail}
              sx={{
                p: 1.25, borderRadius: 2, cursor: 'pointer', minWidth: 0,
                border: `1px solid ${theme.palette.divider}`,
                borderLeft: `3px solid ${col}`,
                transition: 'background .13s',
                '&:hover': { bgcolor: alpha(col, 0.06) },
              }}>
              <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1 }}>
                <Typography noWrap sx={{ fontSize: 13, fontWeight: 600, minWidth: 0 }}>
                  {it.title}
                </Typography>
                <Typography sx={{
                  fontSize: 16, fontWeight: 700, color: col, lineHeight: 1.2,
                  fontVariantNumeric: 'tabular-nums', flexShrink: 0,
                }}>
                  {it.count.toLocaleString()}
                </Typography>
              </Box>

              <Box sx={{ height: 4, borderRadius: 2, bgcolor: 'action.hover', overflow: 'hidden', mt: 0.75 }}>
                <Box sx={{ height: '100%', width: `${Math.max(2, share)}%`, bgcolor: col, borderRadius: 2 }} />
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mt: 0.5 }}>
                <Typography noWrap sx={{ fontSize: 10.5, color: 'text.disabled', minWidth: 0 }}>
                  {it.count.toLocaleString()}/{it.of.toLocaleString()} · {share}% {it.ofLabel}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0, color: col }}>
                  <Typography sx={{ fontSize: 10.5, fontWeight: 700 }}>{it.actionLabel}</Typography>
                  <ChevronRight size={13} />
                </Box>
              </Box>
            </Box>
          );
        })}
      </Box>
    </SectionCard>
  );
}
