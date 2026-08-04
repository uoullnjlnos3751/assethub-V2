import React from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import { type LucideIcon } from 'lucide-react';

// KPI stat card — badge-in-circle, mono value, plain-text delta (theme tokens throughout)
export function KpiCard({ icon: Icon, label, value, sub, accent, trend, onClick }: {
  icon: LucideIcon; label: string; value: string | number; sub?: string;
  accent: string; trend?: { dir: 'up' | 'down'; text: string }; onClick?: () => void;
}) {
  const theme = useTheme();
  const deltaColor = trend ? (trend.dir === 'up' ? theme.palette.success.main : theme.palette.error.main) : undefined;
  return (
    <Box onClick={onClick} sx={{
      background: theme.palette.mode === 'dark'
        ? theme.palette.background.paper
        : `linear-gradient(180deg, ${theme.palette.background.paper}, ${theme.palette.background.paper} 60%, ${theme.palette.action.hover})`,
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: '14px',
      p: 2.5,
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all .25s cubic-bezier(0.4, 0, 0.2, 1)',
      height: '100%',
      boxShadow: theme.palette.mode === 'dark' ? '0 10px 28px -12px rgba(0,0,0,0.5)' : '0 10px 28px -12px rgba(16,24,40,.12)',
      '&:hover': onClick ? {
        borderColor: accent,
        transform: 'translateY(-4px)',
        boxShadow: `0 14px 30px -12px ${alpha(accent, 0.35)}`,
      } : {},
    }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
        <Box sx={{
          width: 30, height: 30, borderRadius: '9px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: alpha(accent, theme.palette.mode === 'dark' ? 0.18 : 0.1),
        }}>
          <Icon size={16} strokeWidth={2.4} color={accent} />
        </Box>
        {trend && (
          <Typography sx={{
            fontFamily: 'ui-monospace, "SF Mono", Consolas, monospace',
            fontSize: '0.68rem', fontWeight: 700, color: deltaColor, mt: 0.5,
          }}>
            {trend.dir === 'up' ? '▲' : '▼'} {trend.text}
          </Typography>
        )}
      </Box>
      <Typography sx={{
        fontFamily: 'ui-monospace, "SF Mono", Consolas, monospace',
        fontSize: 25, fontWeight: 700, color: theme.palette.text.primary, lineHeight: 1, letterSpacing: '-0.5px',
      }}>
        {value}
      </Typography>
      <Typography sx={{ fontSize: '0.8rem', color: theme.palette.text.secondary, mt: 0.75, fontWeight: 700 }}>
        {label}
      </Typography>
      {sub && <Typography sx={{ fontSize: '0.72rem', color: theme.palette.text.disabled, mt: 0.5, fontWeight: 500 }}>{sub}</Typography>}
    </Box>
  );
}
