import React, { useMemo, useState } from 'react';
import { Box, Button, Card, Checkbox, Chip, Tooltip, Typography, alpha, useTheme } from '@mui/material';
import { AlertTriangle } from 'lucide-react';
import {
  GapCompany, PlanGap, gapKey, gapsByCompany, mergePreview, visibleGaps,
} from '../pmPlanGaps';

/**
 * "Scope with no plan" — the headline panel on the plan page.
 *
 * Rows are pickable because planning them one department at a time does not
 * scale: 14 of the 30 existing plans already cover a single machine, and
 * closing the whole gap that way would add roughly 88 more. Merging several
 * rows into one plan is the only way the count comes down without the plan
 * list becoming unusable.
 */

const fmt = (n: number) => n.toLocaleString('en-US');
const TOP = 8;

export interface GapPrefill {
  company: string;
  dept: string;
  type: string;
  count: number;
}

export function PlanGapPanel({ gaps, selCompany, selType, onToggleCompany, onCreate }: {
  gaps: PlanGap[];
  selCompany: Set<string>;
  selType: Set<string>;
  onToggleCompany: (name: string) => void;
  /** Called with one prefill per plan the selection implies. */
  onCreate: (prefills: GapPrefill[]) => void;
}) {
  const theme = useTheme();
  const gapColor = theme.palette.mode === 'dark' ? theme.palette.warning.main : theme.palette.warning.dark;
  const [expanded, setExpanded] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const shown = useMemo(() => visibleGaps(gaps, selCompany, selType), [gaps, selCompany, selType]);
  const companies: GapCompany[] = useMemo(
    () => gapsByCompany(gaps, selType, selCompany), [gaps, selType, selCompany],
  );
  const merge = useMemo(() => mergePreview(gaps, picked), [gaps, picked]);

  const totalFree = shown.reduce((a, g) => a + g.free, 0);
  const rows = expanded ? shown : shown.slice(0, TOP);
  const max = shown.length ? shown[0].free : 0;

  const toggle = (k: string) => setPicked(prev => {
    const next = new Set(prev);
    next.has(k) ? next.delete(k) : next.add(k);
    return next;
  });

  const chipSx = (active: boolean) => ({
    fontSize: 11, height: 23, fontWeight: active ? 600 : 500, cursor: 'pointer',
    borderColor: active ? gapColor : theme.palette.divider,
    bgcolor: active ? alpha(gapColor, 0.12) : 'transparent',
    color: active ? gapColor : theme.palette.text.secondary,
    '& .MuiChip-label': { px: 1 },
    '&:hover': { borderColor: gapColor },
  });

  return (
    <Card variant="outlined" sx={{ borderColor: gapColor, mb: 1.5 }}>
      <Box sx={{ p: '12px 14px 0', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1.25, flexWrap: 'wrap' }}>
        <Typography sx={{ fontSize: 12.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.9 }}>
          <AlertTriangle size={15} color={gapColor} /> ขอบเขตที่ยังไม่มีแผน PM
        </Typography>
        <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>
          เครื่องที่เข้าเกณฑ์ PM แต่ไม่มีแผนไหนครอบคลุม
        </Typography>
      </Box>

      <Box sx={{ p: '10px 14px 14px' }}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.25, flexWrap: 'wrap', mb: 1.1 }}>
          <Typography sx={{ fontSize: 27, fontWeight: 800, lineHeight: 1, letterSpacing: '-.02em', color: gapColor, fontVariantNumeric: 'tabular-nums' }}>
            {fmt(totalFree)}
          </Typography>
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
            {totalFree > 0
              ? <>เครื่องใน <b>{fmt(shown.length)}</b> กลุ่ม (บริษัท/แผนก/ประเภท) ที่ยังไม่มีแผน PM ครอบคลุม</>
              : 'ทุกกลุ่มมีแผนครอบคลุมแล้ว'}
          </Typography>
        </Box>

        {companies.length > 0 && (
          <Box sx={{
            display: 'flex', gap: 0.6, flexWrap: 'wrap', alignItems: 'center',
            pb: 1.25, mb: 1.1, borderBottom: `1px solid ${theme.palette.divider}`,
          }}>
            <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: 'text.disabled', letterSpacing: '.04em', mr: 0.4 }}>
              กรองตามบริษัท
            </Typography>
            {companies.map(c => (
              <Tooltip key={c.name} arrow title={
                <Box sx={{ fontSize: 11, lineHeight: 1.6 }}>
                  <b>{c.name}</b><br />ยังไม่มีแผนรองรับ <b>{fmt(c.free)}</b> เครื่อง<br />ใน {c.groups} กลุ่ม (แผนก/ประเภท)
                </Box>
              }>
                <Chip variant="outlined" size="small" onClick={() => onToggleCompany(c.name)}
                  sx={chipSx(selCompany.has(c.name))}
                  label={<>{c.name} <Box component="span" sx={{ fontSize: 9.5, fontWeight: 700, opacity: 0.75 }}>{fmt(c.free)}</Box></>} />
              </Tooltip>
            ))}
          </Box>
        )}

        {!shown.length ? (
          <Typography sx={{ py: 3, textAlign: 'center', color: 'text.disabled', fontSize: 11.5 }}>
            ไม่มีช่องว่างตามตัวกรองที่เลือก
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            {rows.map(g => {
              const k = gapKey(g);
              return (
                <Box key={k} sx={{
                  display: 'grid', gridTemplateColumns: '26px minmax(0,168px) minmax(0,1fr) 52px 92px',
                  alignItems: 'center', gap: 1.1, py: 0.6,
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  '&:last-of-type': { borderBottom: 0 },
                }}>
                  <Checkbox size="small" checked={picked.has(k)} onChange={() => toggle(k)}
                    sx={{ p: 0.4, color: gapColor, '&.Mui-checked': { color: gapColor } }} />
                  <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
                    <Typography sx={{ fontSize: 11.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {g.company} <Box component="span" sx={{ fontWeight: 400, color: 'text.disabled' }}>/ {g.dept}</Box>
                    </Typography>
                    <Typography sx={{ fontSize: 9.5, color: 'text.disabled', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {g.type}
                    </Typography>
                  </Box>
                  <Tooltip arrow title={
                    <Box sx={{ fontSize: 11, lineHeight: 1.6 }}>
                      <b>{g.company} / {g.dept}</b><br />{g.type}<br />
                      เข้าเกณฑ์ PM <b>{fmt(g.total)}</b> เครื่อง<br />
                      ยังไม่อยู่ในงาน PM ปีนี้ <b>{fmt(g.free)}</b> เครื่อง
                    </Box>
                  }>
                    <Box sx={{ height: 15, borderRadius: '4px', bgcolor: theme.palette.action.hover, overflow: 'hidden' }}>
                      <Box sx={{ height: '100%', width: `${Math.max(3, (g.free / max) * 100)}%`, bgcolor: gapColor, borderRadius: '4px' }} />
                    </Box>
                  </Tooltip>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, textAlign: 'right', color: gapColor, fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(g.free)}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button size="small" variant="outlined"
                      onClick={() => onCreate([{ company: g.company, dept: g.dept, type: g.type, count: g.free }])}
                      sx={{ fontSize: 10.5, py: 0.2, minWidth: 0 }}>สร้างแผน</Button>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}

        {merge && (
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap', mt: 1.25,
            p: '9px 11px', bgcolor: alpha(gapColor, 0.12),
            border: `1px solid ${gapColor}`, borderRadius: '9px',
          }}>
            <Box sx={{ flex: 1, minWidth: 190 }}>
              <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
                เลือกไว้ <Box component="span" sx={{ fontWeight: 700, color: gapColor }}>{merge.chosen.length}</Box> กลุ่ม ·
                รวม <Box component="span" sx={{ fontWeight: 700, color: gapColor }}>{fmt(merge.units)}</Box> เครื่อง
              </Typography>
              <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>
                {merge.companies.join(', ')} · {merge.types.join(', ')} ·{' '}
                {merge.depts.length > 1 ? `${merge.depts.length} แผนก` : merge.depts[0]}
                {merge.splits > 1
                  ? ` — จะแยกเป็น ${merge.splits} แผน (คนละบริษัทหรือคนละประเภทรวมกันไม่ได้)`
                  : ' — รวมเป็นแผนเดียว'}
              </Typography>
            </Box>
            {merge.depts.length > 1 && (
              <Typography sx={{ fontSize: 10, color: gapColor, flexBasis: '100%', mt: -0.5 }}>
                หมายเหตุ: แผนเก็บได้แผนกเดียว การรวมหลายแผนกจึงเว้นช่องแผนกว่าง —
                แผนที่ได้จะครอบคลุม<b>ทุกแผนกในบริษัทนั้น</b> ไม่ใช่เฉพาะที่ติ๊กไว้
              </Typography>
            )}
            <Button size="small" variant="outlined" onClick={() => setPicked(new Set())}
              sx={{ fontSize: 10.5 }}>ล้างที่เลือก</Button>
            <Button size="small" variant="contained"
              sx={{ fontSize: 10.5, bgcolor: gapColor, '&:hover': { bgcolor: gapColor, filter: 'brightness(1.08)' } }}
              onClick={() => {
                // One prefill per distinct company+type pair; several rows of the
                // same pair collapse into one plan with the dept left blank.
                const byPair = new Map<string, GapPrefill & { depts: Set<string> }>();
                for (const g of merge.chosen) {
                  const key = `${g.company}|${g.type}`;
                  let e = byPair.get(key);
                  if (!e) {
                    e = { company: g.company, dept: g.dept, type: g.type, count: 0, depts: new Set() };
                    byPair.set(key, e);
                  }
                  e.count += g.free;
                  e.depts.add(g.dept);
                }
                onCreate([...byPair.values()].map(e => ({
                  company: e.company,
                  dept: e.depts.size === 1 ? e.dept : '',
                  type: e.type,
                  // A company-wide plan covers more than the ticked rows, so the
                  // form's own eligibility check supplies the number instead of
                  // a prefill that would be overwritten a moment later.
                  count: e.depts.size === 1 ? e.count : 0,
                })));
                setPicked(new Set());
              }}>
              {merge.splits > 1 ? `สร้าง ${merge.splits} แผน` : 'สร้างแผนเดียวรวมกัน'}
            </Button>
          </Box>
        )}

        {shown.length > TOP && (
          <Box sx={{ textAlign: 'center', mt: 1 }}>
            <Button size="small" onClick={() => setExpanded(e => !e)} sx={{ fontSize: 10.5, fontWeight: 600 }}>
              {expanded ? 'ย่อรายการ' : `ดูทั้งหมด ${fmt(shown.length)} กลุ่ม`}
            </Button>
          </Box>
        )}
      </Box>
    </Card>
  );
}
