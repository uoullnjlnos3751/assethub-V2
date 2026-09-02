import React from 'react';
import { Box, Typography, MenuItem, Select, Skeleton, alpha, useTheme } from '@mui/material';
import { getStatusMeta } from '../../../config/statusConfig';

/**
 * Results-summary sidebar for the asset Explorer — count, total purchase
 * value, and a breakdown by a chosen dimension for whatever filters are
 * currently applied. Adapted from the InvGate-style Explorer sidebar in
 * docs/ITAM-V3's reference material; our own KPI strip above the table
 * already covers "count by status" as clickable filters, so this focuses on
 * what that doesn't: total value, and breakdown by any dimension.
 */

const DIMENSION_LABELS: Record<string, string> = {
  location: 'สถานที่',
  departmentId: 'แผนก',
  status: 'สถานะ',
  type: 'ประเภท',
  company: 'บริษัท',
};

function fmtBaht(n: number): string {
  return `฿${Math.round(n).toLocaleString('th-TH')}`;
}

interface SummaryData {
  total: number;
  totalValue: number;
  dimension: string;
  breakdown: { label: string; count: number }[];
}

export function AssetSummarySidebar({
  loading, summary, dimension, onDimensionChange,
}: {
  loading: boolean;
  summary: SummaryData | null;
  dimension: string;
  onDimensionChange: (d: string) => void;
}) {
  const theme = useTheme();
  const maxCount = summary?.breakdown.length ? Math.max(...summary.breakdown.map((b) => b.count)) : 1;

  const labelFor = (raw: string) => {
    if (dimension === 'status') return getStatusMeta(raw, theme).label || raw;
    return raw;
  };

  return (
    <Box sx={{
      width: 260, flex: 'none', display: { xs: 'none', lg: 'flex' }, flexDirection: 'column', gap: 2,
    }}>
      <Box sx={{
        bgcolor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`,
        borderRadius: '14px', p: 2.25,
      }}>
        <Typography sx={{ fontSize: '0.7rem', color: theme.palette.text.secondary, mb: 0.5 }}>
          ผลลัพธ์ที่แสดงอยู่
        </Typography>
        {loading ? <Skeleton width={80} height={40} /> : (
          <Typography sx={{ fontSize: '1.7rem', fontWeight: 800, color: theme.palette.text.primary, lineHeight: 1.1 }}>
            {(summary?.total ?? 0).toLocaleString('th-TH')}
          </Typography>
        )}

        <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Typography sx={{ fontSize: '0.7rem', color: theme.palette.text.secondary, mb: 0.5 }}>
            มูลค่าตามราคาซื้อ
          </Typography>
          {loading ? <Skeleton width={110} height={30} /> : (
            <Typography sx={{ fontSize: '1.2rem', fontWeight: 800, color: theme.palette.primary.main, lineHeight: 1.1, fontFamily: 'monospace' }}>
              {fmtBaht(summary?.totalValue ?? 0)}
            </Typography>
          )}
        </Box>
      </Box>

      <Box sx={{
        bgcolor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`,
        borderRadius: '14px', p: 2.25,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: theme.palette.text.primary }}>
            สรุปตามมิติ
          </Typography>
          <Select
            size="small"
            value={dimension}
            onChange={(e) => onDimensionChange(e.target.value)}
            variant="standard"
            disableUnderline
            sx={{ fontSize: '0.75rem', fontWeight: 600, color: theme.palette.primary.main }}
          >
            {Object.entries(DIMENSION_LABELS).map(([key, label]) => (
              <MenuItem key={key} value={key} sx={{ fontSize: '0.8rem' }}>{label}</MenuItem>
            ))}
          </Select>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height={30} />)}
          </Box>
        ) : !summary || summary.breakdown.length === 0 ? (
          <Typography sx={{ fontSize: '0.76rem', color: theme.palette.text.disabled, py: 1 }}>
            ไม่มีข้อมูลให้สรุปในผลลัพธ์นี้
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {summary.breakdown.map((b) => (
              <Box key={b.label}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: '3px' }}>
                  <Typography noWrap sx={{ fontSize: '0.76rem', color: theme.palette.text.primary, minWidth: 0 }}>
                    {labelFor(b.label)}
                  </Typography>
                  <Typography sx={{ fontSize: '0.76rem', fontWeight: 700, color: theme.palette.text.secondary, flexShrink: 0, fontFamily: 'monospace' }}>
                    {b.count}
                  </Typography>
                </Box>
                <Box sx={{ height: 5, borderRadius: 999, bgcolor: alpha(theme.palette.primary.main, 0.1), overflow: 'hidden' }}>
                  <Box sx={{
                    height: '100%', borderRadius: 999, bgcolor: theme.palette.primary.main,
                    width: `${Math.max(4, (b.count / maxCount) * 100)}%`,
                  }} />
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
