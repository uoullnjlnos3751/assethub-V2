import React from 'react';
import { Box, Skeleton, Typography, alpha, useTheme } from '@mui/material';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonIcon from '@mui/icons-material/Person';
import ScheduleIcon from '@mui/icons-material/Schedule';
import BuildIcon from '@mui/icons-material/Build';

/* ─── KPI stat strip (5 interactive cards above filter, admin only, non-user) ── */
export default function AssetKpiStrip({
  isAvailableOnlyView,
  statsLoading,
  categoryStats,
  statuses,
  setStatuses,
  setPage,
}: {
  isAvailableOnlyView: boolean;
  statsLoading: boolean;
  categoryStats: { total: number; byStatus: { status: string; _count: number }[] } | null;
  statuses: string[];
  setStatuses: React.Dispatch<React.SetStateAction<string[]>>;
  setPage: (page: number) => void;
}) {
  const theme = useTheme();

  if (isAvailableOnlyView) return null;

  if (statsLoading) {
    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(5, 1fr)' }, gap: 1.5, mb: 2 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} variant="rectangular" height={64} sx={{ borderRadius: 2 }} />
        ))}
      </Box>
    );
  }

  if (!categoryStats) return null;

  const kpiItems = [
    { label: 'ทรัพย์สินทั้งหมด', value: categoryStats.total, color: theme.palette.primary.main, status: '', Icon: Inventory2Icon },
    { label: 'พร้อมใช้งาน', value: categoryStats.byStatus.find((b) => b.status === 'Available')?._count ?? 0, color: theme.palette.success.main, status: 'Available', Icon: CheckCircleIcon },
    { label: 'ใช้งานประจำ', value: categoryStats.byStatus.find((b) => b.status === 'InUse')?._count ?? 0, color: (theme.palette as any).info?.main || '#0288d1', status: 'InUse', Icon: PersonIcon },
    { label: 'กำลังยืม', value: categoryStats.byStatus.find((b) => b.status === 'Borrowed')?._count ?? 0, color: theme.palette.warning.main, status: 'Borrowed', Icon: ScheduleIcon },
    { label: 'ซ่อมบำรุง', value: categoryStats.byStatus.find((b) => b.status === 'Maintenance')?._count ?? 0, color: theme.palette.error.main, status: 'Maintenance', Icon: BuildIcon },
  ];

  return (
    <Box sx={{
      display: 'grid',
      gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(5, 1fr)' },
      gap: 1.5,
      mb: 2,
    }}>
      {kpiItems.map((kpi) => {
        const isActive = kpi.status === '' ? statuses.length === 0 : statuses.length === 1 && statuses[0] === kpi.status;
        const activate = () => { setStatuses(kpi.status ? [kpi.status] : []); setPage(0); };
        return (
          <Box
            key={kpi.label}
            onClick={activate}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); } }}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 0.75,
              p: 1.5,
              bgcolor: isActive ? alpha(kpi.color, 0.05) : theme.palette.background.paper,
              border: `1px solid ${isActive ? kpi.color : theme.palette.divider}`,
              borderRadius: 2,
              cursor: 'pointer',
              transition: 'all .2s ease',
              boxShadow: isActive ? `0 4px 14px ${alpha(kpi.color, 0.15)}` : 'none',
              '&:hover': {
                borderColor: kpi.color,
                boxShadow: `0 4px 14px ${alpha(kpi.color, 0.12)}`,
              },
              '&:focus-visible': {
                outline: `2px solid ${kpi.color}`,
                outlineOffset: 2,
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{
                width: 28, height: 28, borderRadius: 1.5,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                bgcolor: alpha(kpi.color, 0.12), color: kpi.color, flexShrink: 0,
              }}>
                <kpi.Icon sx={{ fontSize: 16 }} />
              </Box>
              <Typography sx={{ fontSize: '1.15rem', fontWeight: 800, color: kpi.color, lineHeight: 1 }}>{kpi.value}</Typography>
            </Box>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: isActive ? 700 : 500, color: isActive ? kpi.color : theme.palette.text.secondary, lineHeight: 1.2 }}>{kpi.label}</Typography>
          </Box>
        );
      })}
    </Box>
  );
}
