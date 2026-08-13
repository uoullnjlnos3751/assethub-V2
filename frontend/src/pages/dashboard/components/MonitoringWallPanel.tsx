import React from 'react';
import { Box, Typography } from '@mui/material';
import { Activity } from 'lucide-react';

interface WallTile {
  label: string;
  value: number;
  color: string;
}

export function MonitoringWallPanel({
  assetsTotal, openWork, overSla, closedToday, onNavigate,
}: {
  assetsTotal: number; openWork: number; overSla: number; closedToday: number;
  onNavigate: () => void;
}) {
  const tiles: WallTile[] = [
    { label: 'ทรัพย์สิน', value: assetsTotal, color: '#22d3ee' },
    { label: 'งานเปิดอยู่', value: openWork, color: '#fbbf24' },
    { label: 'เกิน SLA', value: overSla, color: '#f87171' },
    { label: 'ปิดวันนี้', value: closedToday, color: '#34d399' },
  ];

  return (
    <Box
      onClick={onNavigate}
      sx={{
        position: 'relative',
        borderRadius: '16px',
        p: '14px 16px',
        overflow: 'hidden',
        cursor: 'pointer',
        background: 'linear-gradient(180deg, rgba(7,17,32,.93), rgba(7,17,32,.88)), #0b1524',
        backgroundImage: `
          linear-gradient(180deg, rgba(7,17,32,.93), rgba(7,17,32,.88)),
          repeating-linear-gradient(0deg, rgba(226,240,255,.05) 0 1px, transparent 1px 48px),
          repeating-linear-gradient(90deg, rgba(226,240,255,.05) 0 1px, transparent 1px 48px)
        `,
        '&::after': {
          content: '""',
          position: 'absolute', left: 0, right: 0, height: '2px',
          background: 'linear-gradient(90deg, transparent, rgba(34,211,238,.6), transparent)',
          animation: 'monitorScan 6s linear infinite',
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        },
        '@keyframes monitorScan': {
          '0%': { top: 0, opacity: 0 },
          '10%': { opacity: 1 },
          '90%': { opacity: 1 },
          '100%': { top: '100%', opacity: 0 },
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.25 }}>
        <Box sx={{
          width: 7, height: 7, borderRadius: '50%', bgcolor: '#22d3ee',
          animation: 'wallPulse 1.8s ease-in-out infinite',
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          '@keyframes wallPulse': {
            '0%, 100%': { opacity: 1, boxShadow: '0 0 0 0 rgba(34,211,238,.5)' },
            '50%': { opacity: 0.6, boxShadow: '0 0 0 4px rgba(34,211,238,0)' },
          },
        }} />
        <Activity size={13} color="rgba(226,240,255,.7)" />
        <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '.16em', color: '#eaf6ff' }}>
          MONITORING WALL
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {tiles.map(t => (
          <Box key={t.label} sx={{
            flex: '1 1 90px', minWidth: 90, borderRadius: '10px', p: '9px 10px',
            bgcolor: 'rgba(4,12,26,.55)', border: `1px solid ${t.color}55`,
          }}>
            <Typography sx={{ fontSize: '1.15rem', fontWeight: 800, color: t.color, lineHeight: 1.1 }}>
              {t.value.toLocaleString()}
            </Typography>
            <Typography sx={{ fontSize: '0.65rem', color: 'rgba(226,240,255,.72)', mt: '2px' }}>
              {t.label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
