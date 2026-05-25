import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Grid, CircularProgress, Chip, MenuItem, Select, FormControl, alpha } from '@mui/material';
import { dashboardAPI } from '../../services/api';
import { Wrench, CheckCircle2, Clock, ArrowRight, FolderOpen, Building2 } from 'lucide-react';

const CAT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16'];

export default function ReportPMPage() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    setLoading(true);
    dashboardAPI.pmSummary(year)
      .then((res) => setSummary(res.data))
      .finally(() => setLoading(false));
  }, [year]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><CircularProgress /></Box>;

  const completionRate = summary?.total ? Math.round((summary.completed / summary.total) * 100) : 0;
  const byCategory = summary?.byCategory || [];
  const byDepartment = summary?.byDepartment || [];

  return (
    <Box sx={{ pb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>รายงาน PM</Typography>
          <Typography variant="body2" color="text.secondary">สรุปผลการตรวจนับและบำรุงรักษาทรัพย์สิน</Typography>
        </Box>
        <FormControl size="small" sx={{ minWidth: 110 }}>
          <Select value={year} onChange={e => setYear(Number(e.target.value))}>
            {[2024, 2025, 2026].map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      {/* Summary cards */}
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

      {/* Progress + Stats */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <Wrench size={20} color="#4f46e5" /> สรุป PM {year}
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
                <CheckCircle2 size={20} color="#34d399" /> สถิติภาพรวม {year}
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

      {/* Breakdown by category */}
      {byCategory.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <FolderOpen size={18} color="#4f46e5" /> สถานะ PM แยกตามหมวดหมู่
          </Typography>
          <Grid container spacing={1.5}>
            {byCategory.map((cat: any, i: number) => {
              const pct = cat.total > 0 ? Math.round((cat.completed / cat.total) * 100) : 0;
              return (
                <Grid key={cat.name || i} item xs={6} md={4} lg={3}>
                  <Card sx={{ borderTop: `3px solid ${CAT_COLORS[i % CAT_COLORS.length]}` }}>
                    <CardContent sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="body2" fontWeight={600}>{cat.icon} {cat.name}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1.5, mb: 1 }}>
                        <Typography variant="body2" color="#059669">{cat.completed}/{cat.total}</Typography>
                        <Typography variant="body2" color={pct >= 80 ? '#059669' : '#d97706'} fontWeight={700}>{pct}%</Typography>
                      </Box>
                      <Box sx={{ height: 4, bgcolor: '#f3f4f6', borderRadius: 2, overflow: 'hidden' }}>
                        <Box sx={{ height: '100%', width: `${pct}%`, borderRadius: 2, bgcolor: pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444' }} />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      {/* Breakdown by department */}
      {byDepartment.length > 0 && (
        <Box>
          <Typography variant="h6" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <Building2 size={18} color="#4f46e5" /> สถานะ PM แยกตามแผนก
          </Typography>
          <Card>
            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              {byDepartment.map((dept: any, i: number) => {
                const pct = dept.total > 0 ? Math.round((dept.completed / dept.total) * 100) : 0;
                return (
                  <Box key={dept.name || i} sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2.5, py: 1.5, borderBottom: i < byDepartment.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                    <Typography variant="body2" fontWeight={600} sx={{ minWidth: 150 }}>{dept.name}</Typography>
                    <Box sx={{ flex: 1, height: 6, bgcolor: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                      <Box sx={{ height: '100%', width: `${pct}%`, borderRadius: 3, bgcolor: pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444', transition: 'width 0.5s' }} />
                    </Box>
                    <Typography variant="caption" fontWeight={700} sx={{ minWidth: 60, textAlign: 'right' }}>{dept.completed}/{dept.total}</Typography>
                    <Typography variant="caption" fontWeight={700} color={pct >= 80 ? '#059669' : '#d97706'} sx={{ minWidth: 40, textAlign: 'right' }}>{pct}%</Typography>
                  </Box>
                );
              })}
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
}