import React from 'react';
import { Box, Typography, Avatar, alpha, useTheme } from '@mui/material';
import { Users } from 'lucide-react';
import { SectionCard } from './SectionCard';

export function OnlineTeamCard({ onlineNow }: { onlineNow: any[] }) {
  const theme = useTheme();
  return (
    <SectionCard title="ทีมงานออนไลน์ตอนนี้" icon={Users}>
      {onlineNow.length > 0 ? (
        <Box sx={{ display: 'flex', gap: 1.25, overflowX: 'auto', pb: 0.5 }}>
          {onlineNow.map((p) => {
            const initial = (p.displayName || p.adUsername || '?').charAt(0).toUpperCase();
            const roleColor = p.role === 'SUPERADMIN' ? theme.palette.error.main
              : p.role === 'IT_ADMIN' ? theme.palette.primary.main
              : theme.palette.info?.main || '#0288d1';
            return (
              <Box key={p.userId} sx={{
                minWidth: 210, flex: '0 0 auto',
                display: 'flex', alignItems: 'center', gap: 1.25,
                bgcolor: alpha(roleColor, 0.06),
                border: `1px solid ${alpha(roleColor, 0.2)}`,
                borderRadius: 3, p: 1.25,
              }}>
                <Box sx={{ position: 'relative', flexShrink: 0 }}>
                  <Avatar src={p.avatarUrl || undefined} sx={{ width: 36, height: 36, bgcolor: roleColor, fontSize: '0.85rem', fontWeight: 700 }}>
                    {!p.avatarUrl && initial}
                  </Avatar>
                  <Box sx={{
                    position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderRadius: '50%',
                    bgcolor: theme.palette.success.main, border: `2px solid ${theme.palette.background.paper}`,
                    '@keyframes presencePulse': {
                      '0%': { boxShadow: `0 0 0 0 ${alpha(theme.palette.success.main, 0.5)}` },
                      '70%': { boxShadow: `0 0 0 5px ${alpha(theme.palette.success.main, 0)}` },
                      '100%': { boxShadow: `0 0 0 0 ${alpha(theme.palette.success.main, 0)}` },
                    },
                    animation: 'presencePulse 2s infinite',
                  }} />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: theme.palette.text.primary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.displayName || p.adUsername}
                  </Typography>
                  <Typography sx={{ fontSize: '0.68rem', color: theme.palette.text.secondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.activity}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      ) : (
        <Typography sx={{ fontSize: '0.78rem', color: theme.palette.text.secondary, py: 1 }}>ยังไม่มีใครออนไลน์อยู่ตอนนี้</Typography>
      )}
    </SectionCard>
  );
}
