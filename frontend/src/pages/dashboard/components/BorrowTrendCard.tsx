import React from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import {
  BarChart, Bar, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { Activity } from 'lucide-react';
import { SectionCard } from './SectionCard';
import { TH_MONTHS } from '../dashboardHelpers';

export function BorrowTrendCard({ trendData, onNavigate }: { trendData: any; onNavigate: () => void }) {
  const theme = useTheme();
  const trendMonths: any[] = trendData?.months || [];
  const chartData = trendMonths.map((m: any) => {
    const monthIdx = parseInt(String(m.month).split('-')[1], 10) - 1;
    return { name: TH_MONTHS[monthIdx] || m.month, ยืม: m.requests, อนุมัติ: m.approved, คืน: m.returned };
  });

  return (
    <SectionCard title={`แนวโน้มยืม-คืน ปี ${new Date().getFullYear()}`} icon={Activity} action={onNavigate} actionLabel="รายงาน">
      <Box sx={{ height: 220, width: '100%' }}>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.5)} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: theme.palette.text.secondary }} axisLine={{ stroke: theme.palette.divider }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: theme.palette.text.secondary }} axisLine={false} tickLine={false} allowDecimals={false} />
              <RechartsTooltip
                contentStyle={{ borderRadius: 8, border: 'none', background: theme.palette.background.paper, boxShadow: theme.shadows[4], fontSize: 12 }}
                labelStyle={{ color: theme.palette.text.primary, fontWeight: 600 }}
                itemStyle={{ color: theme.palette.text.primary }}
              />
              <Bar dataKey="ยืม" fill={theme.palette.primary.main} radius={[3, 3, 0, 0]} maxBarSize={28} />
              <Bar dataKey="อนุมัติ" fill={theme.palette.success.main} radius={[3, 3, 0, 0]} maxBarSize={28} />
              <Bar dataKey="คืน" fill={theme.palette.warning.main} radius={[3, 3, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Typography sx={{ fontSize: '0.78rem', color: theme.palette.text.secondary }}>ยังไม่มีข้อมูล</Typography>
        )}
      </Box>
    </SectionCard>
  );
}
