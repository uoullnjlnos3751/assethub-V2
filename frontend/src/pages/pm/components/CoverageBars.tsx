import React from 'react';
import { Box, Tooltip, Typography, useTheme } from '@mui/material';
import { CoverageState, Group, STATES, Tally, pct, stateColors } from '../pmCoverage';

/**
 * Stacked coverage bars.
 *
 * Plain flex boxes rather than a charting library: every segment needs a
 * hover tooltip, an in-bar count label and a 2px gap between fills, and those
 * are three lines of CSS here versus fighting a chart component's internals.
 * The count labels double as the colour-blind fallback, so a segment is never
 * identified by hue alone.
 */

const fmt = (n: number) => n.toLocaleString('en-US');

export function StackedBar({ t, height = 46, showPct = false, minLabel = 0.09, scope }: {
  t: Tally;
  height?: number;
  showPct?: boolean;
  /** Segments narrower than this fraction drop their label — the tooltip still has it. */
  minLabel?: number;
  scope?: string;
}) {
  const theme = useTheme();
  const colors = stateColors(theme);
  const onFill = theme.palette.mode === 'dark' ? '#071120' : '#ffffff';

  return (
    <Box sx={{
      display: 'flex', gap: '2px', height, borderRadius: '8px', overflow: 'hidden',
      bgcolor: theme.palette.action.hover,
    }}>
      {STATES.map(s => {
        const v = t[s.key];
        if (!v) return null;
        const share = v / t.total;
        return (
          <Tooltip
            key={s.key}
            arrow
            title={
              <Box sx={{ fontSize: 11.5, lineHeight: 1.6 }}>
                <b>{s.label}</b><br />
                {fmt(v)} เครื่อง · {pct(v, t.total)}%
                {scope && <><br /><span style={{ opacity: 0.75 }}>{scope}</span></>}
              </Box>
            }
          >
            <Box sx={{
              flex: `0 0 ${share * 100}%`, minWidth: 0, position: 'relative',
              bgcolor: colors[s.key], transition: 'flex-basis .35s cubic-bezier(.4,0,.2,1)',
              '&:first-of-type': { borderRadius: '8px 0 0 8px' },
              '&:last-of-type': { borderRadius: '0 8px 8px 0' },
            }}>
              {share >= minLabel && (
                <Box sx={{
                  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: height > 30 ? 12.5 : 10.5, fontWeight: 700,
                  color: onFill, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
                }}>
                  {showPct ? `${fmt(v)}  ${pct(v, t.total)}%` : fmt(v)}
                </Box>
              )}
            </Box>
          </Tooltip>
        );
      })}
    </Box>
  );
}

export function CoverageLegend({ t }: { t: Tally }) {
  const theme = useTheme();
  const colors = stateColors(theme);
  return (
    <Box sx={{ display: 'flex', gap: 2.25, flexWrap: 'wrap', mt: 1.5 }}>
      {STATES.map(s => (
        <Box key={s.key} sx={{ display: 'flex', alignItems: 'center', gap: 0.9, fontSize: 12 }}>
          <Box sx={{ width: 11, height: 11, borderRadius: '3px', bgcolor: colors[s.key], flex: 'none' }} />
          <Typography component="span" sx={{ fontSize: 12, color: 'text.secondary' }}>{s.label}</Typography>
          <Typography component="span" sx={{ fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
            {fmt(t[s.key])}
          </Typography>
          <Typography component="span" sx={{ fontSize: 11, color: 'text.disabled', fontVariantNumeric: 'tabular-nums' }}>
            ({pct(t[s.key], t.total)}%)
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

/**
 * Ranked rows. Bar length is scaled against the largest group, so row length
 * compares real volume across groups rather than only the internal mix.
 */
export function RankedBars({ groups, unit = 'เครื่อง' }: { groups: Group[]; unit?: string }) {
  const theme = useTheme();
  const max = groups.length ? groups[0].total : 0;

  if (!groups.length) {
    return (
      <Typography sx={{ py: 4, textAlign: 'center', color: 'text.disabled', fontSize: 12.5 }}>
        ไม่มีข้อมูลตามตัวกรองที่เลือก
      </Typography>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.1 }}>
      {groups.map(g => (
        <Box key={g.name} sx={{
          display: 'grid', gridTemplateColumns: '108px minmax(0,1fr) 58px',
          alignItems: 'center', gap: 1.4,
        }}>
          <Tooltip title={g.name} enterDelay={600}>
            <Typography sx={{
              fontSize: 12, fontWeight: 600, color: 'text.secondary',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {g.name}
            </Typography>
          </Tooltip>
          <Box sx={{ width: `${max > 0 ? Math.max(6, (g.total / max) * 100) : 0}%` }}>
            <StackedBar
              t={g}
              height={22}
              minLabel={0.16}
              scope={`${g.name} · ${fmt(g.total)} ${unit}`}
            />
          </Box>
          <Typography sx={{
            fontSize: 11.5, color: 'text.secondary', textAlign: 'right',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {fmt(g.total)}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

/** Twelve-month completion strip. Idle months stay visible as dashed outlines. */
export function MonthStrip({ monthly, year }: { monthly: Record<string, number>; year: number }) {
  const theme = useTheme();
  const colors = stateColors(theme);
  const TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const vals = TH.map((_, i) => monthly[`${year}-${String(i + 1).padStart(2, '0')}`] || 0);
  const max = Math.max(1, ...vals);

  return (
    <Box sx={{
      display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0,1fr))',
      gap: 0.7, alignItems: 'end', height: 118,
    }}>
      {vals.map((v, i) => (
        <Tooltip
          key={i}
          arrow
          title={v ? `ทำ PM เสร็จ ${fmt(v)} เครื่อง` : 'ยังไม่มีการทำ PM'}
        >
          <Box sx={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 0.6, height: '100%', justifyContent: 'flex-end',
          }}>
            <Typography sx={{
              fontSize: 10.5, fontWeight: v ? 700 : 400,
              color: v ? 'text.primary' : 'text.disabled',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {v ? fmt(v) : '—'}
            </Typography>
            <Box sx={{
              width: '100%', height: `${v > 0 ? Math.max(8, (v / max) * 100) : 8}%`,
              borderRadius: '4px 4px 0 0',
              ...(v > 0
                ? { bgcolor: colors.DONE }
                : { border: `1.5px dashed ${theme.palette.divider}`, borderBottom: 0 }),
              transition: 'height .35s',
            }} />
            <Typography sx={{ fontSize: 9.5, color: 'text.disabled' }}>{TH[i]}</Typography>
          </Box>
        </Tooltip>
      ))}
    </Box>
  );
}
