import React, { useEffect, useState } from 'react';
import { Grid, Card, CardContent, Typography, Box, CircularProgress, Chip, alpha, useTheme } from '@mui/material';
import { motion } from 'framer-motion';
import { 
  Boxes, 
  ShoppingCart, 
  Wrench, 
  AlertTriangle, 
  TrendingUp, 
  CheckCircle2, 
  Clock,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { dashboardAPI } from '../services/api';

const MotionBox = motion(Box);
const MotionGrid = motion(Grid);

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
} as const;

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
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
      <CircularProgress thickness={5} size={60} sx={{ color: theme.palette.primary.main }} />
    </Box>
  );

  if (user?.role === 'USER') {
    return (
      <MotionBox 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        sx={{ py: 4 }}
      >
        <Typography variant="h4" sx={{ mb: 1, background: 'linear-gradient(90deg, #0f172a 0%, #2563eb 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          ยินดีต้อนรับ, {user?.displayName || user?.adUsername}
        </Typography>
        <Typography variant="h6" color="text.secondary" fontWeight={500} sx={{ maxWidth: 600 }}>
          ระบบบริหารจัดการทรัพย์สิน IT ของ TRR Group พร้อมให้บริการคุณแล้ว
        </Typography>
        
        <Box sx={{ mt: 6, p: 4, borderRadius: 4, bgcolor: alpha(theme.palette.primary.main, 0.03), border: `1px dashed ${alpha(theme.palette.primary.main, 0.2)}` }}>
           <Typography variant="body1" sx={{ color: theme.palette.primary.dark, display: 'flex', alignItems: 'center', gap: 1.5 }}>
             <ArrowRight size={20} /> ใช้เมนูด้านซ้ายเพื่อเริ่มทำรายการยืมอุปกรณ์ หรือตรวจสอบประวัติการยืมของคุณ
           </Typography>
        </Box>
      </MotionBox>
    );
  }

  const statCard = (title: string, value: string | number, icon: React.ElementType, color: string) => {
    const Icon = icon;
    return (
      <MotionGrid item xs={12} sm={6} md={3} variants={item}>
        <Card sx={{ 
          height: '100%', 
          position: 'relative', 
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: `0 12px 24px ${alpha(color, 0.1)}`,
            borderColor: alpha(color, 0.3)
          }
        }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box sx={{ 
                p: 1.5, 
                borderRadius: '12px', 
                bgcolor: alpha(color, 0.1), 
                color: color,
                display: 'flex' 
              }}>
                <Icon size={24} strokeWidth={2.5} />
              </Box>
            </Box>
            <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {title}
            </Typography>
            <Typography variant="h3" fontWeight={800} sx={{ mt: 1, color: '#0f172a' }}>
              {value}
            </Typography>
          </CardContent>
          <Box sx={{ 
            position: 'absolute', 
            bottom: -20, 
            right: -20, 
            opacity: 0.05, 
            color: color,
            transform: 'rotate(-15deg)'
          }}>
            <Icon size={120} strokeWidth={1} />
          </Box>
        </Card>
      </MotionGrid>
    );
  };

  return (
    <Box sx={{ pb: 6 }}>
      <MotionBox 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        sx={{ mb: 5 }}
      >
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          Dashboard
          <Chip label="Live Analytics" size="small" sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), color: theme.palette.success.dark, fontWeight: 700, borderRadius: 1.5 }} />
        </Typography>
        <Typography variant="body1" color="text.secondary">
          ภาพรวมข้อมูลทรัพย์สินและสถานะการดำเนินงานแบบเรียลไทม์
        </Typography>
      </MotionBox>

      <MotionGrid container spacing={3} variants={container} initial="hidden" animate="show">
        {statCard('ทรัพย์สินทั้งหมด', assetSummary?.total || 0, Boxes, theme.palette.primary.main)}
        {statCard('ยืมค้าง/เกินกำหนด', borrowSummary?.overdue || 0, AlertTriangle, theme.palette.error.main)}
        {statCard('รออนุมัติ', borrowSummary?.pendingApproval || 0, ShoppingCart, theme.palette.warning.main)}
        {statCard('PM Completion', pmSummary ? `${Math.round((pmSummary.completed/pmSummary.total)*100)}%` : '0%', CheckCircle2, theme.palette.success.main)}
      </MotionGrid>

      <Grid container spacing={3} sx={{ mt: 1 }}>
        {assetSummary && (
          <Grid item xs={12} md={7}>
            <MotionBox variants={item} initial="hidden" animate="show">
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                    <TrendingUp size={20} color={theme.palette.primary.main} /> สรุปทรัพย์สินตามสถานะ
                  </Typography>
                  <Grid container spacing={3}>
                    {assetSummary.byStatus?.map((s: any) => {
                      const label = s.status === 'Available' ? 'พร้อมใช้งาน' : s.status === 'Borrowed' ? 'กำลังยืม' : s.status === 'InUse' ? 'ใช้งานประจำ' : s.status === 'Maintenance' ? 'ซ่อมบำรุง' : s.status === 'Retired' ? 'ปลดระวาง' : s.status;
                      const statusColor = s.status === 'Available' ? theme.palette.success.main : s.status === 'Borrowed' ? theme.palette.warning.main : s.status === 'InUse' ? theme.palette.primary.main : theme.palette.error.main;
                      
                      return (
                        <Grid item xs={6} sm={4} key={s.status}>
                          <Box sx={{ p: 2, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, bgcolor: alpha(statusColor, 0.02) }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase' }}>{label}</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 0.5 }}>
                              <Typography variant="h5" fontWeight={800}>{s._count}</Typography>
                              <Typography variant="caption" color="text.secondary">รายการ</Typography>
                            </Box>
                            <Box sx={{ mt: 1.5, height: 4, width: '100%', bgcolor: alpha(statusColor, 0.1), borderRadius: 1, overflow: 'hidden' }}>
                              <Box sx={{ height: '100%', width: `${Math.min((s._count / assetSummary.total) * 100, 100)}%`, bgcolor: statusColor }} />
                            </Box>
                          </Box>
                        </Grid>
                      );
                    })}
                  </Grid>
                </CardContent>
              </Card>
            </MotionBox>
          </Grid>
        )}

        {pmSummary && (
          <Grid item xs={12} md={5}>
            <MotionBox variants={item} initial="hidden" animate="show">
              <Card sx={{ height: '100%', bgcolor: '#0f172a', color: 'white' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                    <Wrench size={20} color={theme.palette.primary.light} /> สรุป PM {new Date().getFullYear()}
                  </Typography>
                  <Stack spacing={3}>
                    {[
                      { label: 'แผนงานทั้งหมด', value: pmSummary.total, icon: Clock, color: 'grey' },
                      { label: 'ดำเนินการเสร็จสิ้น', value: pmSummary.completed, icon: CheckCircle2, color: theme.palette.success.light },
                      { label: 'คงเหลือรายการ', value: pmSummary.remaining, icon: ArrowRight, color: theme.palette.warning.light },
                    ].map((row, idx) => (
                      <Box key={idx} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha('#fff', 0.1) }}><row.icon size={18} /></Box>
                          <Typography variant="body1" fontWeight={500}>{row.label}</Typography>
                        </Box>
                        <Typography variant="h5" fontWeight={800} sx={{ color: row.color !== 'grey' ? row.color : 'inherit' }}>{row.value}</Typography>
                      </Box>
                    ))}
                  </Stack>
                  <Box sx={{ mt: 4, p: 2.5, borderRadius: 3, bgcolor: alpha(theme.palette.primary.main, 0.2), border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}` }}>
                    <Typography variant="body2" sx={{ opacity: 0.8, mb: 1 }}>ความคืบหน้าภาพรวม</Typography>
                    <Typography variant="h4" fontWeight={800}>{Math.round((pmSummary.completed/pmSummary.total)*100)}%</Typography>
                  </Box>
                </CardContent>
              </Card>
            </MotionBox>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}

function Stack({ children, spacing }: { children: React.ReactNode, spacing: number }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: spacing }}>
      {children}
    </Box>
  );
}
