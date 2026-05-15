import React from 'react';
import { Card, CardContent, Box, Typography, useTheme, alpha } from '@mui/material';
import { motion } from 'framer-motion';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  trend?: { value: number; label: string };
  onClick?: () => void;
}

export default function StatCard({ title, value, icon: Icon, color, trend, onClick }: StatCardProps) {
  const theme = useTheme();

  return (
    <motion.div
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <Card
        sx={{
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          border: `1px solid ${alpha(color, 0.15)}`,
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: `0 12px 24px ${alpha(color, 0.12)}`,
            borderColor: alpha(color, 0.3),
          },
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 3,
                bgcolor: alpha(color, 0.1),
                color: color,
                display: 'flex',
                boxShadow: `0 4px 12px ${alpha(color, 0.15)}`,
              }}
            >
              <Icon size={24} strokeWidth={2} />
            </Box>
            {trend && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 2,
                  bgcolor: trend.value >= 0 ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.error.main, 0.1),
                  color: trend.value >= 0 ? theme.palette.success.dark : theme.palette.error.dark,
                }}
              >
                <Typography variant="caption" fontWeight={700}>
                  {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
                </Typography>
              </Box>
            )}
          </Box>
          <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.5 }}>
            {title}
          </Typography>
          <Typography variant="h3" fontWeight={800} sx={{ color: '#0F172A', lineHeight: 1.2 }}>
            {value}
          </Typography>
          {trend && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {trend.label}
            </Typography>
          )}
        </CardContent>
        <Box
          sx={{
            position: 'absolute',
            bottom: -15,
            right: -15,
            opacity: 0.04,
            color: color,
            transform: 'rotate(-15deg)',
          }}
        >
          <Icon size={100} strokeWidth={1} />
        </Box>
      </Card>
    </motion.div>
  );
}
