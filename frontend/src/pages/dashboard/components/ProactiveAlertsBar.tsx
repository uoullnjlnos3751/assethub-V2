import React from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import { type LucideIcon } from 'lucide-react';
import { statusColor } from '../dashboardHelpers';

export function ProactiveAlertsBar({ alerts }: {
  alerts: { icon: LucideIcon; text: string; sub: string; colorKey: string }[];
}) {
  const theme = useTheme();
  const visible = alerts.filter(a => a.colorKey !== 'success');
  if (visible.length === 0) return null;

  return (
    <Box sx={{ mb: 2, display: 'flex', gap: 1.5, overflowX: 'auto', pb: 0.5 }}>
      {visible.map((alert, i) => {
        const AlertIcon = alert.icon;
        const color = statusColor(theme, alert.colorKey === 'success' ? 'Available' : alert.colorKey === 'warning' ? 'Borrowed' : 'Lost');
        return (
          <Box key={i} sx={{
            minWidth: 280, flex: '0 0 auto',
            bgcolor: alpha(color, 0.10),
            border: `1px solid ${alpha(color, 0.25)}`,
            borderRadius: 2, p: 1.5,
            display: 'flex', alignItems: 'center', gap: 1.5,
          }}>
            <Box sx={{
              width: 32, height: 32, borderRadius: 1.5,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              bgcolor: alpha(color, 0.15), flexShrink: 0,
            }}>
              <AlertIcon size={18} color={color} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: theme.palette.text.primary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{alert.text}</Typography>
              <Typography sx={{ fontSize: '0.72rem', color: theme.palette.text.secondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{alert.sub}</Typography>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
