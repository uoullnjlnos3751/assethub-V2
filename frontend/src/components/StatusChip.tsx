import React from 'react';
import { Box, Typography, useTheme, SxProps } from '@mui/material';
import { getStatusMeta } from '../config/statusConfig';

interface StatusChipProps {
  status: string;
  /** Override the Thai default label. */
  customLabel?: string;
  /** Optional icon size override (px). */
  iconSize?: number;
  sx?: SxProps;
}

/**
 * Themed status badge. Renders a soft-tinted pill with a colored icon + label.
 * Pulls label / icon / color from the central `statusConfig` so every page
 * renders the same status identically — and respects the active MUI theme
 * (light/dark). Replaces the previous hardcoded-hex local map.
 */
export default function StatusChip({ status, customLabel, iconSize = 13, sx }: StatusChipProps) {
  const theme = useTheme();
  const meta = getStatusMeta(status, theme, customLabel);
  const Icon = meta.Icon;

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        px: 1.25,
        py: 0.4,
        borderRadius: 1.5,
        bgcolor: meta.bg,
        border: `1px solid ${meta.border}`,
        ...sx,
      }}
    >
      <Icon size={iconSize} strokeWidth={2.2} color={meta.color} />
      <Typography
        sx={{
          fontSize: '0.78rem',
          fontWeight: 600,
          color: meta.color,
          lineHeight: 1.2,
          whiteSpace: 'nowrap',
        }}
      >
        {meta.label}
      </Typography>
    </Box>
  );
}
