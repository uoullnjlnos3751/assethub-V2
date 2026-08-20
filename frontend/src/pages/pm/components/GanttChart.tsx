import React from 'react';
import { Box, Tooltip, Typography, useTheme } from '@mui/material';
import {
  DAY_MS, PLAN_STATE_LABEL, PlanState, Timeline, day, pct, planStateColors, thDate,
} from '../pmSchedule';

/**
 * Gantt primitives.
 *
 * Both charts on the schedule page share one Timeline, so the week columns and
 * the "today" line land on the same pixels in each — a roll-up bar and the
 * department bars beneath it can be read against each other without the eye
 * having to re-register the axis.
 *
 * Layout is a CSS grid of [label gutter | track | meta], with bars positioned
 * as percentages inside the track. A charting library would own the axis and
 * make that alignment somebody else's decision.
 */

const fmt = (n: number) => n.toLocaleString('en-US');

export const GUTTER = 178;
export const META = 94;

export function GanttRow({ children, sx }: { children: React.ReactNode; sx?: object }) {
  return (
    <Box sx={{
      display: 'grid',
      gridTemplateColumns: `${GUTTER}px minmax(0,1fr) ${META}px`,
      alignItems: 'stretch',
      ...sx,
    }}>
      {children}
    </Box>
  );
}

/** Sticky month + week header. */
export function GanttAxis({ tl, today }: { tl: Timeline; today: Date }) {
  const theme = useTheme();
  const tf = tl.frac(today);
  const showToday = tf > 0 && tf < 1;

  const headSx = {
    borderBottom: `1px solid ${theme.palette.divider}`,
    display: 'flex', alignItems: 'flex-end', p: '0 8px 3px',
    fontSize: 9, fontWeight: 700, color: 'text.disabled', letterSpacing: '.05em',
  };

  return (
    <GanttRow sx={{ position: 'sticky', top: 0, zIndex: 3, bgcolor: 'background.paper' }}>
      <Box sx={headSx}>รายการ</Box>
      <Box sx={{ position: 'relative', height: 32, borderBottom: `1px solid ${theme.palette.divider}` }}>
        {showToday && (
          <Box sx={{
            position: 'absolute', top: 0, bottom: 0, left: `${tf * 100}%`,
            borderLeft: `2px dashed ${theme.palette.error.main}`, zIndex: 4, pointerEvents: 'none',
          }}>
            <Typography component="span" sx={{
              position: 'absolute', top: 1, left: 3, fontSize: 8.5, fontWeight: 700,
              color: 'error.main', bgcolor: 'background.paper', px: '3px',
              borderRadius: '3px', whiteSpace: 'nowrap',
            }}>วันนี้</Typography>
          </Box>
        )}
        <Box sx={{
          position: 'absolute', inset: 0, display: 'grid',
          gridTemplateColumns: tl.months.map(m => `${m.weeks}fr`).join(' '),
        }}>
          {tl.months.map(m => (
            <Box key={m.label} sx={{
              fontSize: 9.5, fontWeight: 700, color: 'text.secondary', letterSpacing: '.03em',
              display: 'flex', alignItems: 'center', pl: '6px',
              borderLeft: `1px solid ${theme.palette.divider}`,
            }}>{m.label}</Box>
          ))}
        </Box>
        <Box sx={{
          position: 'absolute', top: 16, height: 16, left: 0, right: 0, display: 'grid',
          gridTemplateColumns: `repeat(${tl.weeks},1fr)`,
        }}>
          {tl.weekStarts.map((w, i) => (
            <Box key={i} sx={{
              fontSize: 8.5, color: 'text.disabled', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              borderLeft: `1px solid ${theme.palette.divider}`,
              fontVariantNumeric: 'tabular-nums',
            }}>{w.getDate()}</Box>
          ))}
        </Box>
      </Box>
      <Box sx={{ ...headSx, justifyContent: 'flex-end' }}>เสร็จ/ทั้งหมด</Box>
    </GanttRow>
  );
}

/** The lane a row's bars sit in: week gridlines plus the today marker. */
export function GanttTrack({ tl, today, height, children }: {
  tl: Timeline; today: Date; height: number; children?: React.ReactNode;
}) {
  const theme = useTheme();
  const tf = tl.frac(today);
  return (
    <Box sx={{ position: 'relative', height, borderLeft: `1px solid ${theme.palette.divider}` }}>
      <Box sx={{
        position: 'absolute', inset: 0, display: 'grid', pointerEvents: 'none',
        gridTemplateColumns: `repeat(${tl.weeks},1fr)`,
      }}>
        {tl.weekStarts.map((w, i) => (
          <Box key={i} sx={{
            borderLeft: `1px solid ${w.getDate() <= 7 ? theme.palette.divider : 'transparent'}`,
            boxShadow: w.getDate() <= 7 ? 'none' : `inset 1px 0 0 ${theme.palette.action.hover}`,
          }} />
        ))}
      </Box>
      {tf > 0 && tf < 1 && (
        <Box sx={{
          position: 'absolute', top: 0, bottom: 0, left: `${tf * 100}%`, zIndex: 2,
          borderLeft: `2px dashed ${theme.palette.error.main}`, pointerEvents: 'none',
        }} />
      )}
      <Box sx={{ position: 'relative', height: '100%' }}>{children}</Box>
    </Box>
  );
}

/**
 * One bar. The count label sits inside when the progress fill is wide enough
 * to carry white text, and outside in the status colour otherwise — a bar that
 * is 13% done has no fill under the middle, and the label vanished there.
 */
export function GanttBar({ tl, start, end, state, done, total, target, height, title, subtitle }: {
  tl: Timeline;
  start: string;
  end: string;
  state: PlanState;
  done: number;
  total: number;
  /** Plan target. Shown only when Generate produced fewer tasks than intended. */
  target?: number;
  height: number;
  title: string;
  subtitle?: string;
}) {
  const theme = useTheme();
  const color = planStateColors(theme)[state];
  const a = tl.frac(day(start));
  const b = tl.frac(new Date(day(end).getTime() + DAY_MS));
  const w = Math.max(b - a, 0.006);
  const p = pct(done, total);
  const inside = w >= 0.075 && p >= 55;
  const onFill = theme.palette.mode === 'dark' ? '#071120' : '#ffffff';

  const label = (
    <Typography component="span" sx={{
      position: 'absolute', inset: inside ? 0 : 'auto', top: 0, bottom: 0,
      ...(inside
        ? { display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: onFill, textShadow: '0 1px 2px rgba(0,0,0,.25)' }
        : { display: 'flex', alignItems: 'center', left: 'calc(100% + 6px)',
            width: 'max-content', color }),
      fontSize: 9.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
      whiteSpace: 'nowrap', zIndex: 1, pointerEvents: 'none',
    }}>
      {fmt(done)}/{fmt(total)}
    </Typography>
  );

  return (
    <Tooltip
      arrow
      title={
        <Box sx={{ fontSize: 11, lineHeight: 1.6 }}>
          <b>{title}</b>
          {subtitle && <><br /><Box component="span" sx={{ opacity: 0.75 }}>{subtitle}</Box></>}
          <Box sx={{ height: '1px', bgcolor: 'currentColor', opacity: 0.2, my: 0.6 }} />
          {thDate(day(start))} – {thDate(day(end))}<br />
          ทำเสร็จ <b>{fmt(done)}</b> จาก <b>{fmt(total)}</b> เครื่อง ({p}%)<br />
          สถานะ: {PLAN_STATE_LABEL[state]}
          {target !== undefined && target > total && (
            <><br />เป้าหมายตั้งไว้ <b>{fmt(target)}</b> เครื่อง — ยังสร้างงานไม่ครบอีก <b>{fmt(target - total)}</b></>
          )}
        </Box>
      }
    >
      <Box sx={{
        position: 'absolute', top: '50%', transform: 'translateY(-50%)',
        left: `${a * 100}%`, width: `${w * 100}%`, height,
        borderRadius: '6px', border: `1px solid ${color}`,
        bgcolor: theme.palette.mode === 'dark' ? `${color}29` : `${color}1f`,
      }}>
        <Box sx={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: `${p}%`,
          bgcolor: color, borderRadius: '5px', transition: 'width .3s',
        }} />
        {label}
      </Box>
    </Tooltip>
  );
}

/** Small status pill used in the row gutters. */
export function StatePill({ state }: { state: PlanState }) {
  const theme = useTheme();
  const color = planStateColors(theme)[state];
  return (
    <Box component="span" sx={{
      display: 'inline-flex', alignItems: 'center', gap: 0.5, flex: 'none',
      fontSize: 9, fontWeight: 700, px: 0.75, py: '0.5px', borderRadius: 999,
      bgcolor: theme.palette.mode === 'dark' ? `${color}29` : `${color}1f`, color,
    }}>
      <Box component="span" sx={{ width: 4.5, height: 4.5, borderRadius: '50%', bgcolor: color }} />
      {PLAN_STATE_LABEL[state]}
    </Box>
  );
}

export function GanttLegend() {
  const theme = useTheme();
  const colors = planStateColors(theme);
  const items = (Object.keys(colors) as PlanState[]).map(k => ({ k, c: colors[k] }));
  return (
    <Box sx={{
      display: 'flex', gap: 1.6, flexWrap: 'wrap', pt: 1.1, mt: 0.25,
      borderTop: `1px solid ${theme.palette.divider}`,
    }}>
      {items.map(i => (
        <Box key={i.k} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: 10.5, color: 'text.secondary' }}>
          <Box sx={{ width: 9, height: 9, borderRadius: '2.5px', bgcolor: i.c, flex: 'none' }} />
          {PLAN_STATE_LABEL[i.k]}
        </Box>
      ))}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: 10.5, color: 'text.disabled' }}>
        <Box sx={{
          width: 9, height: 9, borderRadius: '2.5px', flex: 'none',
          border: `1px solid ${theme.palette.text.disabled}`,
        }} />
        พื้นจาง = ยังไม่เสร็จ · พื้นทึบ = เสร็จแล้ว
      </Box>
    </Box>
  );
}
