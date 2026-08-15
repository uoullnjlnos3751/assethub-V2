import React from 'react';
import { Box, alpha, useTheme } from '@mui/material';

export interface PillTab {
  value: string;
  label: string;
  /** Small red dot — used for "this tab has a validation error" style signals. */
  alert?: boolean;
}

/**
 * Shared pill-style tab bar. First used on the asset detail page; the asset
 * edit form reuses it so both screens read as the same system rather than two
 * different tab styles for two halves of the same object.
 */
export function PillTabBar({ tabs, value, onChange }: {
  tabs: PillTab[];
  value: string;
  onChange: (value: string) => void;
}) {
  const theme = useTheme();
  return (
    <Box sx={{
      display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 2,
      p: 0.75, borderRadius: '14px',
      bgcolor: theme.palette.background.paper,
      border: `1px solid ${theme.palette.divider}`,
    }}>
      {tabs.map(t => {
        const active = value === t.value;
        return (
          <Box
            key={t.value}
            onClick={() => onChange(t.value)}
            role="tab"
            tabIndex={0}
            aria-selected={active}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChange(t.value); } }}
            sx={{
              position: 'relative',
              px: 2, py: 1.05, borderRadius: '10px', cursor: 'pointer',
              fontSize: '0.83rem', fontWeight: active ? 700 : 500,
              color: active ? theme.palette.primary.main : theme.palette.text.secondary,
              bgcolor: active ? alpha(theme.palette.primary.main, 0.12) : 'transparent',
              border: `1px solid ${active ? alpha(theme.palette.primary.main, 0.35) : 'transparent'}`,
              transition: 'all .18s',
              '&:hover': active ? {} : {
                color: theme.palette.text.primary,
                bgcolor: alpha(theme.palette.text.primary, 0.05),
              },
              '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
            }}
          >
            {t.label}
            {t.alert && (
              <Box sx={{
                position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: '50%',
                bgcolor: theme.palette.error.main,
              }} />
            )}
          </Box>
        );
      })}
    </Box>
  );
}
