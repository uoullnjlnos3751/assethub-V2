import React from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import { ShoppingCart } from 'lucide-react';
import { SectionCard } from './SectionCard';
import { statusColor } from '../dashboardHelpers';

export function BorrowSummaryCard({ borrowActive, borrowPending, borrowOverdue, onNavigate }: {
  borrowActive: number;
  borrowPending: number;
  borrowOverdue: number;
  onNavigate: () => void;
}) {
  const theme = useTheme();
  return (
    <SectionCard title="ระบบยืม-คืน" icon={ShoppingCart} action={onNavigate} actionLabel="จัดการ">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {[
          { label: 'กำลังยืม', value: borrowActive, status: 'Borrowed' },
          { label: 'รออนุมัติ', value: borrowPending, status: 'Borrowed' },
          { label: 'เกินกำหนด', value: borrowOverdue, status: 'Lost' },
        ].map(row => {
          const color = statusColor(theme, row.status);
          return (
            <Box key={row.label} sx={{
              display: 'flex', alignItems: 'center', gap: 1,
              p: '7px 10px', borderRadius: 1.5,
              bgcolor: alpha(color, 0.06),
            }}>
              <Typography sx={{ fontSize: '0.75rem', color: theme.palette.text.secondary, flex: 1 }}>{row.label}</Typography>
              <Typography sx={{ fontSize: '1rem', fontWeight: 700, color }}>{row.value}</Typography>
            </Box>
          );
        })}
      </Box>
    </SectionCard>
  );
}
