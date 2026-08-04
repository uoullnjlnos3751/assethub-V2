import React from 'react';
import { Box, Typography, Chip, alpha, useTheme } from '@mui/material';
import { TrendingUp, type LucideIcon } from 'lucide-react';

// KPI stat card (icon-in-circle, theme tokens, optional trend)
export function KpiCard({ icon: Icon, label, value, sub, accent, trend, onClick }: {
  icon: LucideIcon; label: string; value: string | number; sub?: string;
  accent: string; trend?: { dir: 'up' | 'down'; text: string }; onClick?: () => void;
}) {
  const theme = useTheme();
  return (
    <Box onClick={onClick} sx={{
      background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
      border: '1px solid #e2e8f0',
      borderRadius: 4,
      p: 2.5,
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all .25s cubic-bezier(0.4, 0, 0.2, 1)',
      height: '100%',
      boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
      '&:hover': onClick ? {
        borderColor: accent,
        transform: 'translateY(-4px)',
        boxShadow: `0 12px 25px ${alpha(accent, 0.08)}`,
      } : {},
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Box sx={{
          width: 44, height: 44, borderRadius: 3,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: alpha(accent, 0.08),
        }}>
          <Icon size={22} strokeWidth={2.2} color={accent} />
        </Box>
        {trend && (
          <Chip
            size="small"
            icon={trend.dir === 'up'
              ? <TrendingUp size={13} color={theme.palette.success.main} />
              : <TrendingUp size={13} color={theme.palette.error.main} style={{ transform: 'rotate(180deg)' }} />}
            label={trend.text}
            sx={{
              height: 22, fontSize: '0.7rem', fontWeight: 700,
              bgcolor: alpha(trend.dir === 'up' ? theme.palette.success.main : theme.palette.error.main, 0.08),
              color: trend.dir === 'up' ? theme.palette.success.main : theme.palette.error.main,
              '& .MuiChip-icon': { marginLeft: '6px', mr: 0 },
            }}
          />
        )}
      </Box>
      <Typography sx={{ fontSize: 28, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
        {value}
      </Typography>
      <Typography sx={{ fontSize: '0.8rem', color: '#475569', mt: 0.75, fontWeight: 700 }}>
        {label}
      </Typography>
      {sub && <Typography sx={{ fontSize: '0.72rem', color: '#64748b', mt: 0.5, fontWeight: 500 }}>{sub}</Typography>}
    </Box>
  );
}
