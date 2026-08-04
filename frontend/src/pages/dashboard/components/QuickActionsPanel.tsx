import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { Zap, CheckCircle2, ShoppingCart, RotateCcw, FileText, Shield } from 'lucide-react';

export function QuickActionsPanel({ onNavigate }: { onNavigate: (path: string) => void }) {
  const theme = useTheme();
  const quickActions = [
    { icon: Zap, label: 'เพิ่มทรัพย์สิน', path: '/assets/new', color: theme.palette.warning.main },
    { icon: CheckCircle2, label: 'รออนุมัติยืม', path: '/borrow/approval-queue', color: theme.palette.primary.main },
    { icon: ShoppingCart, label: 'ส่งมอบอุปกรณ์', path: '/borrow/checkout', color: theme.palette.success.main },
    { icon: RotateCcw, label: 'รับคืนอุปกรณ์', path: '/borrow/return', color: '#bd5700' },
    { icon: FileText, label: 'รายงานทรัพย์สิน', path: '/reports/assets', color: theme.palette.info.main },
    { icon: Shield, label: 'แผน PM', path: '/pm/plans', color: '#964400' },
  ];

  return (
    <Box sx={{
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      borderRadius: 4, p: 2.5, color: '#fff',
      display: 'flex', flexDirection: 'column',
      boxShadow: '0 8px 25px rgba(15, 23, 42, 0.15)',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Zap size={18} color="#f59e0b" strokeWidth={2.5} />
        <Typography sx={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff' }}>ทางลัดด่วน (Shortcuts)</Typography>
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, flex: 1 }}>
        {quickActions.map(act => {
          const Icon = act.icon;
          return (
            <Box key={act.path} onClick={() => onNavigate(act.path)} sx={{
              bgcolor: 'rgba(255,255,255,0.06)',
              borderRadius: 3, p: 1.5, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', gap: 0.75,
              transition: 'all 0.2s ease-in-out',
              border: '1px solid rgba(255,255,255,0.05)',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.12)',
                transform: 'translateY(-2px)',
                borderColor: 'rgba(255,255,255,0.2)'
              },
            }}>
              <Icon size={18} color="#fff" />
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{act.label}</Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
