import React, { useEffect, useState } from 'react';
import {
  Grid, Card, CardContent, Typography, Box, CircularProgress,
  LinearProgress, Chip, Divider, alpha, useTheme,
} from '@mui/material';
import { motion } from 'framer-motion';
import {
  Boxes,
  ShoppingCart,
  Wrench,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  Clock,
  ArrowRight,
  Activity,
  Users,
  Calendar,
  ListTodo as ListAltIcon,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { dashboardAPI } from '../services/api';
import StatCard from '../components/StatCard';
import EmptyState from '../components/EmptyState';
import StatusChip from '../components/StatusChip';

const MotionBox = motion(Box);

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 }
  }
} as const;

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 12 } }
} as const;

const cardSx = {
  borderRadius: 3,
  border: 'none',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
  transition: 'box-shadow 0.2s ease, transform 0.2s ease',
  '&:hover': {
    boxShadow: '0 2px 6px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.05)',
  },
};

const statCardSx = (bgColor: string) => ({
  ...cardSx,
  background: bgColor,
  p: 3,
  display: 'flex',
  flexDirection: 'column',
  gap: 1,
});

const sectionTitleSx = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  mb: 3,
};

export default function DashboardPage() {
  const theme = useTheme();
  const { user } = useAuth();
  const [assetSummary, setAssetSummary] = useState<any>(null);
  const [borrowSummary, setBorrowSummary] = useState<any>(null);
  const [pmSummary, setPmSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'IT_ADMIN' || user?.role === 'SUPERADMIN') {
      Promise.all([
        dashboardAPI.assetSummary(),
        dashboardAPI.borrowSummary(),
        dashboardAPI.pmSummary(),
      ])
        .then(([a, b, p]) => {
          setAssetSummary(a.data);
          setBorrowSummary(b.data);
          setPmSummary(p.data);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user]);

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <CircularProgress size={32} sx={{ color: '#66BB6A' }} />
    </Box>
  );

  if (user?.role === 'USER') {
    return (
      <MotionBox initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight={600} sx={{ mb: 0.5, color: '#1a1a2e' }}>
            สวัสดี, {user?.displayName || user?.adUsername} 
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ระบบบริหารจัดการทรัพย์สิน IT พร้อมให้บริการคุณแล้ว
          </Typography>
        </Box>

        <Grid container spacing={2.5} sx={{ mb: 4 }}>
          {[
            { label: 'อุปกรณ์พร้อมยืม', path: '/assets?status=Available', icon: CheckCircle2, bg: '#E8F5E9', color: '#43A047' },
            { label: 'ยืมทรัพย์สินใหม่', path: '/borrow/new', icon: ShoppingCart, bg: '#E3F2FD', color: '#1976D2' },
            { label: 'คำขอของฉัน', path: '/borrow/my-requests', icon: ListAltIcon, bg: '#FFF3E0', color: '#F57C00' },
          ].map((action, idx) => (
            <Grid item xs={12} md={4} key={idx}>
              <Card
                sx={{
                  ...cardSx,
                  background: action.bg,
                  cursor: 'pointer',
                  p: 2.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  '&:hover': { transform: 'translateY(-2px)' },
                }}
                onClick={() => window.location.href = action.path}
              >
                <Box sx={{
                  p: 1.5,
                  borderRadius: 2.5,
                  bgcolor: alpha(action.color, 0.15),
                  color: action.color,
                }}>
                  <action.icon size={22} />
                </Box>
                <Typography variant="body2" fontWeight={600} sx={{ color: action.color }}>
                  {action.label}
                </Typography>
                <ArrowRight size={16} style={{ marginLeft: 'auto', opacity: 0.5 }} />
              </Card>
            </Grid>
          ))}
        </Grid>

        <Card sx={{ p: 3, border: `1px dashed ${alpha(theme.palette.primary.main, 0.2)}`, bgcolor: alpha(theme.palette.primary.main, 0.02), borderRadius: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ p: 1.5, borderRadius: 2.5, bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main }}>
              <ArrowRight size={20} />
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.25 }}>เริ่มต้นใช้งาน</Typography>
              <Typography variant="caption" color="text.secondary">ใช้เมนูด้านซ้ายเพื่อเริ่มทำรายการยืมอุปกรณ์ หรือตรวจสอบประวัติการยืมของคุณ</Typography>
            </Box>
          </Box>
        </Card>
      </MotionBox>
    );
  }

  const statusLabels: Record<string, string> = {
    Available: 'พร้อมใช้งาน',
    Borrowed: 'กำลังยืม',
    InUse: 'ใช้งานประจำ',
    Maintenance: 'ซ่อมบำรุง',
    Retired: 'ปลดระวาง',
    Lost: 'สูญหาย',
  };

  const statusColors: Record<string, string> = {
    Available: '#66BB6A',
    Borrowed: '#FFA726',
    InUse: '#42A5F5',
    Maintenance: '#EF5350',
    Retired: '#9E9E9E',
    Lost: '#C62828',
  };

  const statusBgs: Record<string, string> = {
    Available: '#E8F5E9',
    Borrowed: '#FFF3E0',
    InUse: '#E3F2FD',
    Maintenance: '#FFEBEE',
    Retired: '#F5F5F5',
    Lost: '#FFEBEE',
  };

  return (
    <Box sx={{ pb: 4 }}>
      {/* Header */}
      <MotionBox initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h4" fontWeight={600} sx={{ color: '#1a1a2e', mb: 0.5 }}>
              แดชบอร์ด
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ภาพรวมข้อมูลทรัพย์สินและสถานะการดำเนินงาน
            </Typography>
          </Box>
          <Chip
            label="Live"
            size="small"
            sx={{
              bgcolor: '#E8F5E9',
              color: '#43A047',
              fontWeight: 600,
              fontSize: '0.75rem',
              '& .MuiChip-label': { px: 1.5 },
            }}
          />
        </Box>
      </MotionBox>

      {/* Stat Cards */}
      <Grid container spacing={2.5} component={motion.div} variants={container} initial="hidden" animate="show" sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3} component={motion.div} variants={item}>
          <Card sx={statCardSx('#E8F5E9')}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{
                p: 1.5,
                borderRadius: 2.5,
                bgcolor: alpha('#43A047', 0.15),
                color: '#43A047',
              }}>
                <Boxes size={22} />
              </Box>
              <Typography variant="h3" fontWeight={700} sx={{ color: '#1a1a2e', m: 0 }}>
                {assetSummary?.total || 0}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" fontWeight={500}>
              ทรัพย์สินทั้งหมด
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3} component={motion.div} variants={item}>
          <Card sx={statCardSx('#FFEBEE')}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{
                p: 1.5,
                borderRadius: 2.5,
                bgcolor: alpha('#EF5350', 0.15),
                color: '#EF5350',
              }}>
                <AlertTriangle size={22} />
              </Box>
              <Typography variant="h3" fontWeight={700} sx={{ color: '#1a1a2e', m: 0 }}>
                {borrowSummary?.overdue || 0}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" fontWeight={500}>
              ยืมเกินกำหนด
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3} component={motion.div} variants={item}>
          <Card sx={statCardSx('#FFF3E0')}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{
                p: 1.5,
                borderRadius: 2.5,
                bgcolor: alpha('#FFA726', 0.15),
                color: '#FFA726',
              }}>
                <ShoppingCart size={22} />
              </Box>
              <Typography variant="h3" fontWeight={700} sx={{ color: '#1a1a2e', m: 0 }}>
                {borrowSummary?.pendingApproval || 0}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" fontWeight={500}>
              รออนุมัติ
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3} component={motion.div} variants={item}>
          <Card sx={statCardSx('#E3F2FD')}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{
                p: 1.5,
                borderRadius: 2.5,
                bgcolor: alpha('#42A5F5', 0.15),
                color: '#42A5F5',
              }}>
                <CheckCircle2 size={22} />
              </Box>
              <Typography variant="h3" fontWeight={700} sx={{ color: '#1a1a2e', m: 0 }}>
                {pmSummary ? `${Math.round((pmSummary.completed / pmSummary.total) * 100)}%` : '0%'}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" fontWeight={500}>
              PM Completion
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Asset Status Breakdown */}
      {assetSummary && (
        <Grid container spacing={2.5} sx={{ mt: 1 }}>
          <Grid item xs={12} md={8}>
            <Card sx={{ ...cardSx, p: 0 }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={sectionTitleSx}>
                  <Typography variant="subtitle2" fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    สรุปทรัพย์สินตามสถานะ
                  </Typography>
                  <MoreHorizontal size={18} style={{ opacity: 0.4, cursor: 'pointer' }} />
                </Box>
                <Grid container spacing={2}>
                  {assetSummary.byStatus?.map((s: any) => {
                    const color = statusColors[s.status] || '#9E9E9E';
                    const bg = statusBgs[s.status] || '#F5F5F5';
                    const percentage = assetSummary.total > 0 ? (s._count / assetSummary.total) * 100 : 0;
                    return (
                      <Grid item xs={12} sm={6} md={4} key={s.status}>
                        <Box sx={{
                          p: 2.5,
                          borderRadius: 2.5,
                          background: bg,
                          border: `1px solid ${alpha(color, 0.1)}`,
                        }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                            <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                              {statusLabels[s.status] || s.status}
                            </Typography>
                            <Typography variant="h4" fontWeight={700} sx={{ color, m: 0, lineHeight: 1 }}>
                              {s._count}
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={percentage}
                            sx={{
                              height: 6,
                              borderRadius: 3,
                              bgcolor: alpha(color, 0.1),
                              '& .MuiLinearProgress-bar': { borderRadius: 3, bgcolor: color },
                            }}
                          />
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', fontWeight: 500 }}>
                            {percentage.toFixed(1)}%
                          </Typography>
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* PM Summary */}
          {pmSummary && (
            <Grid item xs={12} md={4}>
              <Card sx={{ ...cardSx, p: 0, height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={sectionTitleSx}>
                    <Typography variant="subtitle2" fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
                      PM {new Date().getFullYear()}
                    </Typography>
                    <MoreHorizontal size={18} style={{ opacity: 0.4, cursor: 'pointer' }} />
                  </Box>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {[
                      { label: 'แผนงานทั้งหมด', value: pmSummary.total, icon: Calendar, color: '#1a1a2e' },
                      { label: 'ดำเนินการเสร็จสิ้น', value: pmSummary.completed, icon: CheckCircle2, color: '#43A047' },
                      { label: 'คงเหลือรายการ', value: pmSummary.remaining, icon: Clock, color: '#FFA726' },
                    ].map((row, idx) => (
                      <Box key={idx} sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: idx === 1 ? alpha('#43A047', 0.06) : 'transparent',
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Box sx={{
                            p: 1,
                            borderRadius: 2,
                            bgcolor: alpha(row.color, 0.1),
                            color: row.color,
                          }}>
                            <row.icon size={16} />
                          </Box>
                          <Typography variant="body2" fontWeight={500} color="text.secondary">{row.label}</Typography>
                        </Box>
                        <Typography variant="h6" fontWeight={700} sx={{ color: row.color, m: 0 }}>{row.value}</Typography>
                      </Box>
                    ))}
                  </Box>

                  <Box sx={{ mt: 3, p: 2.5, borderRadius: 2.5, bgcolor: alpha('#43A047', 0.06), border: `1px solid ${alpha('#43A047', 0.1)}` }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={500} sx={{ display: 'block', mb: 1 }}>
                      ความคืบหน้าภาพรวม
                    </Typography>
                    <Typography variant="h3" fontWeight={700} sx={{ color: '#43A047', m: 0, lineHeight: 1 }}>
                      {pmSummary.total > 0 ? Math.round((pmSummary.completed / pmSummary.total) * 100) : 0}%
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={pmSummary.total > 0 ? (pmSummary.completed / pmSummary.total) * 100 : 0}
                      sx={{
                        mt: 1.5,
                        height: 6,
                        borderRadius: 3,
                        bgcolor: alpha('#43A047', 0.1),
                        '& .MuiLinearProgress-bar': { borderRadius: 3, bgcolor: '#43A047' },
                      }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}
    </Box>
  );
}
