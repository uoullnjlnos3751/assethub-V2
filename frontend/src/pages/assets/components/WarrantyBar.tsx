import React from 'react';
import { Card, CardContent, Box, Typography, LinearProgress } from '@mui/material';

/* ─── Warranty progress bar ───────────────────────────────────── */
export function WarrantyBar({ purchaseDate, warrantyEndDate }: { purchaseDate?: string; warrantyEndDate?: string }) {
  if (!purchaseDate || !warrantyEndDate) return null;
  const start = new Date(purchaseDate).getTime();
  const end = new Date(warrantyEndDate).getTime();
  const now = Date.now();
  const total = end - start;
  const elapsed = now - start;
  const pct = Math.max(0, Math.min(100, (elapsed / total) * 100));
  const daysLeft = Math.max(0, Math.round((end - now) / 86400000));

  let color: 'success' | 'warning' | 'error' | 'primary' = 'primary';
  if (pct >= 90) color = 'error';
  else if (pct >= 70) color = 'warning';

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent sx={{ p: '12px 14px', '&:last-child': { pb: '12px' } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="caption" color="text.secondary">
            ประกัน: {new Date(purchaseDate).toLocaleDateString('th-TH')} → {new Date(warrantyEndDate).toLocaleDateString('th-TH')}
          </Typography>
          <Typography variant="caption" fontWeight={700} color="primary.main">
            {daysLeft > 0 ? `เหลือ ${daysLeft.toLocaleString('th-TH')} วัน (${Math.round(100 - pct)}%)` : 'หมดประกันแล้ว'}
          </Typography>
        </Box>
        <LinearProgress variant="determinate" value={pct} color={color} sx={{ height: 6, borderRadius: 4 }} />
      </CardContent>
    </Card>
  );
}
