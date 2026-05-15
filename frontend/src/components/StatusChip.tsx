import React from 'react';
import { Chip, ChipProps, Box, Typography, useTheme, alpha } from '@mui/material';

const statusConfig: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  Available: { color: '#059669', bg: '#D1FAE5', icon: '✓', label: 'พร้อมใช้งาน' },
  Borrowed: { color: '#D97706', bg: '#FEF3C7', icon: '⏳', label: 'กำลังยืม' },
  InUse: { color: '#2563EB', bg: '#DBEAFE', icon: '👤', label: 'ใช้งานประจำ' },
  Maintenance: { color: '#DC2626', bg: '#FEE2E2', icon: '🔧', label: 'ซ่อมบำรุง' },
  Retired: { color: '#6B7280', bg: '#F3F4F6', icon: '📦', label: 'ปลดระวาง' },
  Lost: { color: '#991B1B', bg: '#FEE2E2', icon: '❌', label: 'สูญหาย' },
  Pending: { color: '#D97706', bg: '#FEF3C7', icon: '⏳', label: 'รออนุมัติ' },
  Approved: { color: '#059669', bg: '#D1FAE5', icon: '✓', label: 'อนุมัติแล้ว' },
  Rejected: { color: '#DC2626', bg: '#FEE2E2', icon: '✕', label: 'ไม่อนุมัติ' },
  CheckedOut: { color: '#2563EB', bg: '#DBEAFE', icon: '📤', label: 'จ่ายแล้ว' },
  Returned: { color: '#6B7280', bg: '#F3F4F6', icon: '📥', label: 'คืนแล้ว' },
  PartiallyReturned: { color: '#D97706', bg: '#FEF3C7', icon: '↩️', label: 'คืนบางส่วน' },
  DRAFT: { color: '#6B7280', bg: '#F3F4F6', icon: '📝', label: 'ร่าง' },
  IN_PROGRESS: { color: '#2563EB', bg: '#DBEAFE', icon: '🔄', label: 'กำลังดำเนินการ' },
  COMPLETED: { color: '#059669', bg: '#D1FAE5', icon: '✅', label: 'เสร็จสิ้น' },
};

interface StatusChipProps extends Omit<ChipProps, 'label'> {
  status: string;
  customLabel?: string;
}

export default function StatusChip({ status, customLabel, sx, ...rest }: StatusChipProps) {
  const theme = useTheme();
  const config = statusConfig[status] || { color: '#6B7280', bg: '#F3F4F6', icon: '•', label: status };

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        px: 1.5,
        py: 0.5,
        borderRadius: 2,
        bgcolor: alpha(config.color, 0.08),
        border: `1px solid ${alpha(config.color, 0.15)}`,
        ...sx,
      }}
      {...rest}
    >
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: config.color,
          flexShrink: 0,
          boxShadow: `0 0 6px ${alpha(config.color, 0.4)}`,
        }}
      />
      <Typography
        sx={{
          fontSize: '0.78rem',
          fontWeight: 600,
          color: config.color,
          whiteSpace: 'nowrap',
        }}
      >
        {customLabel || config.label}
      </Typography>
    </Box>
  );
}
