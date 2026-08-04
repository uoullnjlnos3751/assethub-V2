import React from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import { ArrowUpRight, type LucideIcon } from 'lucide-react';

// Section card (themed)
export function SectionCard({ title, icon: Icon, action, actionLabel, children }: {
  title: string; icon: LucideIcon; action?: () => void; actionLabel?: string; children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <Box sx={{
      bgcolor: theme.palette.background.paper,
      border: '1px solid #e2e8f0',
      borderRadius: 4,
      p: 2.5,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 4px 15px rgba(0,0,0,0.015)',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Icon size={18} strokeWidth={2.2} color={theme.palette.primary.main} />
          <Typography sx={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>{title}</Typography>
        </Box>
        {action && actionLabel && (
          <Box onClick={action} sx={{
            display: 'flex', alignItems: 'center', gap: 0.25,
            fontSize: '0.75rem', fontWeight: 700, color: theme.palette.primary.main, cursor: 'pointer',
            bgcolor: alpha(theme.palette.primary.main, 0.06),
            px: 1.25, py: 0.5, borderRadius: '999px',
            transition: 'all 0.2s',
            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.12) },
          }}>
            {actionLabel}
            <ArrowUpRight size={12} style={{ marginLeft: 2 }} />
          </Box>
        )}
      </Box>
      <Box sx={{ flex: 1, minHeight: 0 }}>{children}</Box>
    </Box>
  );
}
