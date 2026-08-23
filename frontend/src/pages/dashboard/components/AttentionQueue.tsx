import React from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import { ChevronRight } from 'lucide-react';
import { SectionCard } from './SectionCard';
import { AlertTriangle } from 'lucide-react';

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

  return (
    <SectionCard title="ต้องจัดการ" icon={AlertTriangle} subtitle={`${sorted.length} เรื่องที่รอการตัดสินใจ`}>
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        {sorted.map(it => {
          const col = tone(it.severity);
          const share = it.of ? Math.round((it.count / it.of) * 100) : 0;
          return (
            <Box key={it.key} onClick={() => navigate(it.href)}
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr auto', sm: '1fr 150px 76px 18px' },
                alignItems: 'center', gap: 1.5,
                px: 1.25, py: 1.25, borderRadius: 2, cursor: 'pointer',
                transition: 'background .13s',
                '&:hover': { bgcolor: alpha(col, 0.06) },
              }}>
              <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start', minWidth: 0 }}>
                <Box sx={{
                  width: 8, height: 8, borderRadius: '50%', bgcolor: col,
                  mt: '6px', flexShrink: 0,
                }} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.4 }}>{it.title}</Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.5 }}>{it.detail}</Typography>
                </Box>
              </Box>

              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <Box sx={{ height: 6, borderRadius: 3, bgcolor: 'action.hover', overflow: 'hidden' }}>
                  <Box sx={{ height: '100%', width: `${Math.max(2, share)}%`, bgcolor: col, borderRadius: 3 }} />
                </Box>
                <Typography sx={{ fontSize: 10.5, color: 'text.disabled', mt: 0.5 }}>
                  {it.count.toLocaleString()} / {it.of.toLocaleString()} · {share}% {it.ofLabel}
                </Typography>
              </Box>

              <Box sx={{ textAlign: 'right' }}>
                <Typography sx={{ fontSize: 17, fontWeight: 700, color: col, lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' }}>
                  {it.count.toLocaleString()}
                </Typography>
                <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>{it.actionLabel}</Typography>
              </Box>

              <ChevronRight size={15} style={{ color: theme.palette.text.disabled }} />
            </Box>
          );
        })}
      </Box>
    </SectionCard>
  );
}
