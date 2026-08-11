import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import {
  Cell, ResponsiveContainer, PieChart, Pie, Tooltip as RechartsTooltip,
} from 'recharts';

// Themed donut chart (Recharts)
export function DonutChart({ segments, total }: { segments: { value: number; color: string; name?: string }[]; total: number }) {
  const theme = useTheme();
  return (
    <Box sx={{ width: 130, height: 130, position: 'relative', flexShrink: 0 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={segments}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={58}
            paddingAngle={2}
            dataKey="value"
            stroke="none"
          >
            {segments.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <RechartsTooltip
            contentStyle={{
              borderRadius: 8, border: 'none',
              background: theme.palette.background.paper,
              boxShadow: theme.shadows[4], fontSize: 12,
            }}
            itemStyle={{ color: theme.palette.text.primary, fontWeight: 500 }}
            formatter={(value: any) => [value, 'รายการ']}
          />
        </PieChart>
      </ResponsiveContainer>
      <Box sx={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
      }}>
        <Typography sx={{ fontSize: 18, fontWeight: 700, color: theme.palette.text.primary, lineHeight: 1 }}>
          {total}
        </Typography>
        <Typography sx={{ fontSize: 9, color: theme.palette.text.secondary, mt: 0.3 }}>รายการ</Typography>
      </Box>
    </Box>
  );
}
