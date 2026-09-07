import React from 'react';
import { Box, Typography, Button, useTheme, alpha } from '@mui/material';
import { Inbox, Plus, RefreshCw, SearchX } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  /** ว่างเพราะตัวกรอง/คำค้น ไม่ใช่เพราะไม่มีข้อมูลจริง — สองอย่างนี้ต้องการ
   *  การกระทำคนละแบบ ผู้ใช้จึงต้องแยกออกจากกันได้ทันที */
  filtered?: boolean;
  onClearFilter?: () => void;
}

export default function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  filtered = false,
  onClearFilter,
}: EmptyStateProps) {
  const theme = useTheme();
  const heading = title ?? (filtered ? 'ไม่พบรายการที่ตรงกับที่ค้นหา' : 'ไม่มีข้อมูล');
  const body = description ?? (filtered
    ? 'ลองแก้คำค้นหรือล้างตัวกรองเพื่อดูรายการทั้งหมด'
    : 'ยังไม่มีรายการในระบบ');

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
        px: 4,
        textAlign: 'center',
      }}
    >
      <Box
        sx={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          bgcolor: alpha(theme.palette.primary.main, 0.08),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 3,
        }}
      >
        {icon || (filtered
          ? <SearchX size={36} color={theme.palette.primary.main} />
          : <Inbox size={36} color={theme.palette.primary.main} />)}
      </Box>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 1, color: theme.palette.text.primary }}>
        {heading}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 400 }}>
        {body}
      </Typography>
      <Box sx={{ display: 'flex', gap: 2 }}>
        {filtered && onClearFilter && (
          <Button variant="outlined" startIcon={<RefreshCw size={18} />} onClick={onClearFilter}>
            ล้างตัวกรอง
          </Button>
        )}
        {onAction && actionLabel && (
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={onAction}
          >
            {actionLabel}
          </Button>
        )}
        {onSecondaryAction && secondaryActionLabel && (
          <Button
            variant="outlined"
            startIcon={<RefreshCw size={18} />}
            onClick={onSecondaryAction}
          >
            {secondaryActionLabel}
          </Button>
        )}
      </Box>
    </Box>
  );
}
