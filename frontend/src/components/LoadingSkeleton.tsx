import React from 'react';
import { Box, Skeleton, Paper, useTheme } from '@mui/material';

interface LoadingSkeletonProps {
  type?: 'page' | 'table' | 'cards' | 'form';
  count?: number;
}

export default function LoadingSkeleton({ type = 'page', count = 5 }: LoadingSkeletonProps) {
  const theme = useTheme();

  if (type === 'table') {
    return (
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Skeleton variant="rectangular" height={40} sx={{ borderRadius: 2, mb: 2 }} />
        {Array.from({ length: count }).map((_, i) => (
          <Box key={i} sx={{ display: 'flex', gap: 2, mb: 2 }}>
            {Array.from({ length: 4 }).map((_, j) => (
              <Skeleton key={j} variant="rectangular" height={30} sx={{ flex: 1, borderRadius: 1 }} />
            ))}
          </Box>
        ))}
      </Paper>
    );
  }

  if (type === 'cards') {
    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 3 }}>
        {Array.from({ length: count }).map((_, i) => (
          <Paper key={i} sx={{ p: 3, borderRadius: 3 }}>
            <Skeleton variant="circular" width={48} height={48} sx={{ mb: 2 }} />
            <Skeleton variant="text" width="60%" height={28} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="40%" height={20} sx={{ mb: 2 }} />
            <Skeleton variant="rectangular" height={40} sx={{ borderRadius: 2 }} />
          </Paper>
        ))}
      </Box>
    );
  }

  if (type === 'form') {
    return (
      <Paper sx={{ p: 4, borderRadius: 3, maxWidth: 600 }}>
        <Skeleton variant="text" width="40%" height={36} sx={{ mb: 3 }} />
        {Array.from({ length: 4 }).map((_, i) => (
          <Box key={i} sx={{ mb: 2 }}>
            <Skeleton variant="text" width="30%" height={20} sx={{ mb: 0.5 }} />
            <Skeleton variant="rectangular" height={44} sx={{ borderRadius: 2 }} />
          </Box>
        ))}
        <Skeleton variant="rectangular" height={44} width={120} sx={{ borderRadius: 2, mt: 2 }} />
      </Paper>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      <Skeleton variant="text" width="30%" height={40} sx={{ mb: 2 }} />
      <Skeleton variant="text" width="50%" height={24} sx={{ mb: 3 }} />
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 3, mb: 4 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} variant="rectangular" height={100} sx={{ borderRadius: 3 }} />
        ))}
      </Box>
      <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 3 }} />
    </Box>
  );
}
