import React from 'react';
import { Box, Typography, Button, useTheme, alpha } from '@mui/material';
import { Inbox, Plus, RefreshCw } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export default function EmptyState({
  title = 'ไม่มีข้อมูล',
  description = 'ยังไม่มีรายการในระบบ',
  icon,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}: EmptyStateProps) {
  const theme = useTheme();

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
        {icon || <Inbox size={36} color={theme.palette.primary.main} />}
      </Box>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 1, color: theme.palette.text.primary }}>
        {title}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 400 }}>
        {description}
      </Typography>
      <Box sx={{ display: 'flex', gap: 2 }}>
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
