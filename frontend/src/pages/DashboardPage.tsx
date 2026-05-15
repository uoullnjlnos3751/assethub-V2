import React, { useEffect, useState } from 'react';
import { Grid, Card, CardContent, Typography, Box, CircularProgress, alpha, useTheme, LinearProgress } from '@mui/material';
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
    transition: { staggerChildren: 0.08 }
  }
} as const;

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 14 } }
} as const;

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
      <CircularProgress thickness={5} size={48} sx={{ color: theme.palette.primary.main }} />
    </Box>
  );

  if (user?.role === 'USER') {
    return (
      <MotionBox initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" sx={{ mb: 1, color: '#0F172A' }}>
            ยินดีต้อนรับ, {user?.displayName || user?.adUsername} 👋
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600 }}>
            ระบบบริหารจัดการทรัพย์สิน IT พร้อมให้บริการคุณแล้ว
          </Typography>
        </Box>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          {[
            { label: 'รายการอุปกรณ์พร้อมยืม', path: '/assets?status=Available', icon: CheckCircle2, color: theme.palette.success.main },
            { label: 'ยืมทรัพย์สินใหม่', path: '/borrow/new', icon: ShoppingCart, color: theme.palette.primary.main },
            { label: 'คำขอของฉัน', path: '/borrow/my-requests', icon: ListAltIcon, color: theme.palette.info.main },
          ].map((action, idx) => (
            <Grid item xs={12} md={4} key={idx}>
              <StatCard title={action.label} value="คลิกเลย" icon={action.icon} color={action.color} onClick={() => window.location.href = action.path} />
            </Grid>
          ))}
        </Grid>

        <Card sx={{ p: 4, border: `1px dashed ${alpha(theme.palette.primary.main, 0.3)}`, bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main }}>
              <ArrowRight size={24} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>เริ่มต้นใช้งาน</Typography>
              <Typography variant="body2" color="text.secondary">ใช้เมนูด้านซ้ายเพื่อเริ่มทำรายการยืมอุปกรณ์ หรือตรวจสอบประวัติการยืมของคุณ</Typography>
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
    Available: theme.palette.success.main,
    Borrowed: theme.palette.warning.main,
    InUse: theme.palette.info.main,
    Maintenance: theme.palette.error.main,
    Retired: theme.palette.grey[500],
    Lost: theme.palette.error.dark,
  };

  return (
    <Box sx={{ pb: 4 }}>
      <MotionBox initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          แดชบอร์ด
          <Box sx={{ px: 2, py: 0.5, borderRadius: 2, bgcolor: alpha(theme.palette.success.main, 0.1), display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: theme.palette.success.main, animation: 'pulse 2s infinite' }} />
            <Typography variant="caption" fontWeight={700} color="success.dark">Live</Typography>
          </Box>
        </Typography>
        <Typography variant="body1" color="text.secondary">
          ภาพรวมข้อมูลทรัพย์สินและสถานะการดำเนินงานแบบเรียลไทม์
        </Typography>
      </MotionBox>

      <Grid container spacing={3} component={motion.div} variants={container} initial="hidden" animate="show">
        <Grid item xs={12} sm={6} md={3} component={motion.div} variants={item}>
          <StatCard title="ทรัพย์สินทั้งหมด" value={assetSummary?.total || 0} icon={Boxes} color={theme.palette.primary.main} />
        </Grid>
        <Grid item xs={12} sm={6} md={3} component={motion.div} variants={item}>
          <StatCard title="ยืมเกินกำหนด" value={borrowSummary?.overdue || 0} icon={AlertTriangle} color={theme.palette.error.main} />
        </Grid>
        <Grid item xs={12} sm={6} md={3} component={motion.div} variants={item}>
          <StatCard title="รออนุมัติ" value={borrowSummary?.pendingApproval || 0} icon={ShoppingCart} color={theme.palette.warning.main} />
        </Grid>
        <Grid item xs={12} sm={6} md={3} component={motion.div} variants={item}>
          <StatCard
            title="PM Completion"
            value={pmSummary ? `${Math.round((pmSummary.completed / pmSummary.total) * 100)}%` : '0%'}
            icon={CheckCircle2}
            color={theme.palette.success.main}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mt: 1 }}>
        {assetSummary && (
          <Grid item xs={12} md={8}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                  <TrendingUp size={20} color={theme.palette.primary.main} />
                  สรุปทรัพย์สินตามสถานะ
                </Typography>
                <Grid container spacing={2}>
                  {assetSummary.byStatus?.map((s: any) => {
                    const color = statusColors[s.status] || theme.palette.grey[500];
                    const percentage = assetSummary.total > 0 ? (s._count / assetSummary.total) * 100 : 0;
                    return (
                      <Grid item xs={12} sm={6} md={4} key={s.status}>
                        <Box sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${alpha(color, 0.15)}`, bgcolor: alpha(color, 0.03) }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                            <StatusChip status={s.status} />
                            <Typography variant="h4" fontWeight={800} sx={{ color }}>{s._count}</Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 1 }}>
                            {statusLabels[s.status] || s.status}
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={percentage}
                            sx={{
                              height: 8,
                              borderRadius: 4,
                              bgcolor: alpha(color, 0.1),
                              '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: color },
                            }}
                          />
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                            {percentage.toFixed(1)}% ของทั้งหมด
                          </Typography>
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}

        {pmSummary && (
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', color: 'white', border: 'none' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                  <Wrench size={20} color={theme.palette.primary.light} />
                  สรุป PM {new Date().getFullYear()}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  {[
                    { label: 'แผนงานทั้งหมด', value: pmSummary.total, icon: Calendar, color: theme.palette.grey[300] },
                    { label: 'ดำเนินการเสร็จสิ้น', value: pmSummary.completed, icon: CheckCircle2, color: theme.palette.success.light },
                    { label: 'คงเหลือรายการ', value: pmSummary.remaining, icon: Clock, color: theme.palette.warning.light },
                  ].map((row, idx) => (
                    <Box key={idx} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha('#fff', 0.1) }}>
                          <row.icon size={18} />
                        </Box>
                        <Typography variant="body1" fontWeight={500}>{row.label}</Typography>
                      </Box>
                      <Typography variant="h5" fontWeight={800} sx={{ color: row.color }}>{row.value}</Typography>
                    </Box>
                  ))}
                </Box>
                <Box sx={{ mt: 4, p: 3, borderRadius: 3, bgcolor: alpha(theme.palette.primary.main, 0.2), border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}` }}>
                  <Typography variant="body2" sx={{ opacity: 0.8, mb: 1 }}>ความคืบหน้าภาพรวม</Typography>
                  <Typography variant="h3" fontWeight={800}>
                    {pmSummary.total > 0 ? Math.round((pmSummary.completed / pmSummary.total) * 100) : 0}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={pmSummary.total > 0 ? (pmSummary.completed / pmSummary.total) * 100 : 0}
                    sx={{
                      mt: 1.5,
                      height: 6,
                      borderRadius: 3,
                      bgcolor: alpha('#fff', 0.1),
                      '& .MuiLinearProgress-bar': { borderRadius: 3, bgcolor: theme.palette.primary.main },
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </Box>
  );
}
