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
 * Themed status badge. Renders a soft-tinted pill (radius 999) with a colored
 * icon + label. Pulls label / icon / color from the central `statusConfig` so
 * every page renders the same status identically — and respects the active
 * MUI theme (light/dark). Replaces the previous hardcoded-hex local map.
 */
export default function StatusChip({ status, customLabel, iconSize = 12, sx }: StatusChipProps) {
  const theme = useTheme();
  const meta = getStatusMeta(status, theme, customLabel);
  const Icon = meta.Icon;

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.6,
        px: 1.15,
        py: 0.35,
        borderRadius: 999,
        bgcolor: meta.bg,
        ...sx,
      }}
    >
      <Icon size={iconSize} strokeWidth={2.4} color={meta.color} />
      <Typography
        sx={{
          fontSize: '0.72rem',
          fontWeight: 700,
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
