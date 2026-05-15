import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Grid, CircularProgress, Chip } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { dashboardAPI } from '../../services/api';
import { Wrench, CheckCircle2, Clock, ArrowRight } from 'lucide-react';

const statusColors: Record<string, string> = { DRAFT: 'default', IN_PROGRESS: 'warning', COMPLETED: 'success' };
const statusLabels: Record<string, string> = { DRAFT: 'ร่าง', IN_PROGRESS: 'กำลังดำเนินการ', COMPLETED: 'เสร็จสิ้น' };

export default function ReportPMPage() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.pmSummary()
      .then((res) => setSummary(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><CircularProgress /></Box>;

  const completionRate = summary?.total ? Math.round((summary.completed / summary.total) * 100) : 0;

  return (
    <Box sx={{ pb: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>รายงาน PM</Typography>
        <Typography variant="body2" color="text.secondary">สรุปผลการตรวจนับและบำรุงรักษาทรัพย์สินประจำปี</Typography>
      </Box>

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <Card><CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}><Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(99,102,241,0.1)', color: '#4f46e5', display: 'flex' }}><Wrench size={20} /></Box><Typography variant="body2" color="text.secondary" fontWeight={600}>แผนงานทั้งหมด</Typography></Box>
            <Typography variant="h4" fontWeight={800}>{summary?.total || 0}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card><CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}><Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(16,185,129,0.1)', color: '#059669', display: 'flex' }}><CheckCircle2 size={20} /></Box><Typography variant="body2" color="text.secondary" fontWeight={600}>ดำเนินการเสร็จ</Typography></Box>
            <Typography variant="h4" fontWeight={800}>{summary?.completed || 0}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card><CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}><Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(245,158,11,0.1)', color: '#d97706', display: 'flex' }}><Clock size={20} /></Box><Typography variant="body2" color="text.secondary" fontWeight={600}>คงเหลือ</Typography></Box>
            <Typography variant="h4" fontWeight={800}>{summary?.remaining || 0}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card><CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}><Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(139,92,246,0.1)', color: '#7c3aed', display: 'flex' }}><ArrowRight size={20} /></Box><Typography variant="body2" color="text.secondary" fontWeight={600}>ความคืบหน้า</Typography></Box>
            <Typography variant="h4" fontWeight={800}>{completionRate}%</Typography>
          </CardContent></Card>
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <Wrench size={20} color="#4f46e5" /> สรุป PM {new Date().getFullYear()}
              </Typography>
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}><Typography variant="body2" color="text.secondary">ความคืบหน้า</Typography><Typography variant="body2" fontWeight={700}>{completionRate}%</Typography></Box>
                <Box sx={{ height: 8, bgcolor: 'rgba(99,102,241,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                  <Box sx={{ height: '100%', width: `${completionRate}%`, borderRadius: 2, background: 'linear-gradient(90deg, #4f46e5, #7c3aed)' }} />
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ flex: 1, p: 2, borderRadius: 2, bgcolor: 'rgba(16,185,129,0.08)', textAlign: 'center' }}><Typography variant="h5" fontWeight={800} color="#059669">{summary?.completed || 0}</Typography><Typography variant="caption" color="text.secondary">เสร็จ</Typography></Box>
                <Box sx={{ flex: 1, p: 2, borderRadius: 2, bgcolor: 'rgba(245,158,11,0.08)', textAlign: 'center' }}><Typography variant="h5" fontWeight={800} color="#d97706">{summary?.remaining || 0}</Typography><Typography variant="caption" color="text.secondary">คงเหลือ</Typography></Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', bgcolor: '#0f172a', color: 'white' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, color: 'white' }}>
                <CheckCircle2 size={20} color="#34d399" /> สถิติภาพรวม
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)' }}>
                  <Typography>แผนงานทั้งหมด</Typography><Typography variant="h6" fontWeight={800}>{summary?.total || 0}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)' }}>
                  <Typography>ดำเนินการเสร็จ</Typography><Typography variant="h6" fontWeight={800} color="#34d399">{summary?.completed || 0}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)' }}>
                  <Typography>คงเหลือ</Typography><Typography variant="h6" fontWeight={800} color="#fbbf24">{summary?.remaining || 0}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
