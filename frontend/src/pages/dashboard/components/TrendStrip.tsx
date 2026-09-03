import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { TrendingUp, TrendingDown, Minus, LineChart as LineChartIcon } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

/**
 * The one thing every card on this dashboard was missing: whether a number
 * is getting better or worse. A KPI card answering "277 outdated OS" is
 * silent on whether that's 250 last month (worsening) or 300 (improving) —
 * two situations that call for opposite reactions, indistinguishable from a
 * single snapshot.
 *
 * Backed by DailyMetricSnapshot, captured once a day by a background job.
 * Renders nothing until there are at least 3 days of history — a 1-2 point
 * "trend" is just noise, and a fresh deploy has zero rows until the job has
 * run a few times. Same zero-value-suppression rule the rest of this
 * dashboard already follows, applied to "not enough history" instead of
 * "not enough data".
 */

export interface MetricPoint {
  date: string;
  assetsTotal: number;
  pmDonePct: number;
  osOutdatedCount: number;
  borrowOverdueCount: number;
  agentOfflineCount: number | null;
  warrantyExpiredCount: number;
}

interface Metric {
  key: keyof MetricPoint;
  label: string;
  /** Higher is better (green on the way up) vs higher is worse (red on the way up). */
  direction: 'up-good' | 'down-good' | 'neutral';
  fmt: (v: number) => string;
}

const METRICS: Metric[] = [
  { key: 'assetsTotal', label: 'ทรัพย์สินทั้งหมด', direction: 'neutral', fmt: v => v.toLocaleString('th-TH') },
  { key: 'pmDonePct', label: 'PM เสร็จแล้ว', direction: 'up-good', fmt: v => `${v}%` },
  { key: 'osOutdatedCount', label: 'OS ล้าสมัย', direction: 'down-good', fmt: v => v.toLocaleString('th-TH') },
  { key: 'borrowOverdueCount', label: 'ยืมเกินกำหนด', direction: 'down-good', fmt: v => v.toLocaleString('th-TH') },
  { key: 'warrantyExpiredCount', label: 'ประกันหมดแล้ว', direction: 'down-good', fmt: v => v.toLocaleString('th-TH') },
  { key: 'agentOfflineCount', label: 'Agent ออฟไลน์', direction: 'down-good', fmt: v => v.toLocaleString('th-TH') },
];

function Tile({ metric, points }: { metric: Metric; points: MetricPoint[] }) {
  const theme = useTheme();
  const series = points.map(p => ({ date: p.date, v: p[metric.key] as number }));
  const first = series[0].v;
  const last = series[series.length - 1].v;
  const delta = last - first;

  let trendColor = theme.palette.text.disabled;
  if (delta !== 0 && metric.direction !== 'neutral') {
    const improving = metric.direction === 'up-good' ? delta > 0 : delta < 0;
    trendColor = improving ? theme.palette.success.main : theme.palette.error.main;
  } else if (delta !== 0) {
    trendColor = theme.palette.info.main;
  }

  const Icon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;

  return (
    <Box sx={{
      flex: '1 1 150px', minWidth: 150,
      p: '10px 12px', borderRadius: '10px',
      border: `1px solid ${theme.palette.divider}`,
      bgcolor: theme.palette.background.paper,
    }}>
      <Typography sx={{ fontSize: '0.68rem', color: theme.palette.text.secondary, mb: '2px' }}>
        {metric.label}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 1 }}>
        <Box>
          <Typography sx={{ fontSize: '1.05rem', fontWeight: 800, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
            {metric.fmt(last)}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '3px', mt: '3px' }}>
            <Icon size={11} color={trendColor} strokeWidth={2.5} />
            <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: trendColor }}>
              {delta === 0 ? 'ไม่เปลี่ยนแปลง' : `${delta > 0 ? '+' : ''}${metric.fmt(delta)}`}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ width: 60, height: 30, flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series}>
              <defs>
                <linearGradient id={`trend-${String(metric.key)}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={trendColor} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={trendColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={trendColor} strokeWidth={1.75}
                fill={`url(#trend-${String(metric.key)})`} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      </Box>
    </Box>
  );
}

export function TrendStrip({ history }: { history: MetricPoint[] }) {
  const theme = useTheme();
  if (!history || history.length < 3) return null;

  const days = Math.max(1, Math.round(
    (new Date(history[history.length - 1].date).getTime() - new Date(history[0].date).getTime()) / 86_400_000,
  ));

  const visibleMetrics = METRICS.filter(m =>
    m.key !== 'agentOfflineCount' || history.some(p => p.agentOfflineCount != null),
  );
  // agentOfflineCount เป็น null ได้บางวัน (Agent ล่มวันนั้น) — คั่นด้วยค่าล่าสุดที่มีจริง
  const filled = history.map((p, i) => {
    if (p.agentOfflineCount != null) return p;
    const prior = [...history.slice(0, i)].reverse().find(q => q.agentOfflineCount != null);
    return { ...p, agentOfflineCount: prior?.agentOfflineCount ?? 0 };
  });

  return (
    <Box sx={{
      bgcolor: theme.palette.background.paper,
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: '14px', p: '14px 18px', mb: 1.5,
      boxShadow: theme.palette.mode === 'dark' ? '0 6px 18px rgba(0,0,0,.35)' : '0 6px 18px rgba(16,24,40,.06)',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <LineChartIcon size={16} color={theme.palette.primary.main} strokeWidth={2.2} />
        <Typography sx={{ fontSize: '0.82rem', fontWeight: 800 }}>
          แนวโน้มย้อนหลัง {days} วัน
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap' }}>
        {visibleMetrics.map(m => <Tile key={String(m.key)} metric={m} points={filled} />)}
      </Box>
    </Box>
  );
}
