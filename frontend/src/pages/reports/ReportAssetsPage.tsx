import React, { useEffect, useState, useMemo } from 'react';
import { Box, Typography, Card, CardContent, Grid, CircularProgress, Chip, Button, TextField, MenuItem, Select, InputLabel, FormControl, alpha, useTheme } from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { assetAPI, dashboardAPI } from '../../services/api';
import CompanyAssetMatrix from '../../components/CompanyAssetMatrix';
import { Boxes, CheckCircle2, AlertTriangle, Wrench, Download, Filter, Eye, FileText, PackageX, Activity, MonitorPlay } from 'lucide-react';
import { PieChart as ReChartsPieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import ReportHeaderTabs from './ReportHeaderTabs';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const statusLabels: Record<string, string> = { Available: 'พร้อมใช้งาน', Borrowed: 'กำลังยืม', InUse: 'ใช้งานประจำ', Maintenance: 'ซ่อมบำรุง', Retired: 'ปลดระวาง', Lost: 'สูญหาย' };
const CAT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16', '#ec4899', '#14b8a6', '#f43f5e'];

export default function ReportAssetsPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const STATUS_COLORS: Record<string, string> = {
    Available: theme.palette.success.main,
    Borrowed: theme.palette.warning.main,
    InUse: theme.palette.info.main,
    Maintenance: theme.palette.error.main,
    Retired: theme.palette.text.disabled,
    Lost: theme.palette.error.dark,
  };
  const [summary, setSummary] = useState<any>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [exportingPDF, setExportingPDF] = useState(false);

  const handleExportPDF = async () => {
    try {
      setExportingPDF(true);
      const element = document.getElementById('report-content');
      if (!element) return;
      const canvas = await html2canvas(element, { 
        scale: 3, 
        useCORS: true, 
        backgroundColor: '#ffffff',
        logging: false
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.setFontSize(18);
      pdf.setTextColor(15, 23, 42);
      pdf.text('Asset Executive Summary', 14, 20);
      pdf.setFontSize(10);
      pdf.setTextColor(100, 116, 139);
      pdf.text(`Exported Date: ${new Date().toLocaleString('th-TH')}`, 14, 28);
      pdf.addImage(imgData, 'PNG', 10, 35, pdfWidth - 20, Math.min(pdfHeight, pdf.internal.pageSize.getHeight() - 40));
      pdf.save(`Asset_Executive_Report_${new Date().getTime()}.pdf`);
    } catch (err) {
      console.error('Failed to export PDF', err);
    } finally {
      setExportingPDF(false);
    }
  };

  useEffect(() => {
    Promise.all([
      dashboardAPI.assetSummary(),
      assetAPI.list({ limit: 10000 }),
    ])
      .then(([s, a]) => {
        setSummary(s.data);
        setAssets(a.data.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = assets;
    if (filterType) list = list.filter(a => a.type === filterType);
    if (filterStatus) {
      if (filterStatus === 'Active') {
        list = list.filter(a => a.status === 'Available' || a.status === 'InUse');
      } else if (filterStatus === 'Issue') {
        list = list.filter(a => a.status === 'Maintenance' || a.status === 'Lost');
      } else if (filterStatus === 'Other') {
        list = list.filter(a => a.status === 'Borrowed' || a.status === 'Retired');
      } else if (filterStatus === 'WarrantyExpired') {
        list = list.filter(a => a.warrantyDaysLeft !== null && a.warrantyDaysLeft !== undefined && a.warrantyDaysLeft <= 0);
      } else if (filterStatus === 'WarrantyExpiring') {
        list = list.filter(a => a.warrantyDaysLeft !== null && a.warrantyDaysLeft !== undefined && a.warrantyDaysLeft > 0 && a.warrantyDaysLeft <= 30);
      } else {
        list = list.filter(a => a.status === filterStatus);
      }
    }
    if (search) { const q = search.toLowerCase(); list = list.filter(a => (a.assetCode || '').toLowerCase().includes(q) || (a.serialNo || '').toLowerCase().includes(q) || (a.assetName || '').toLowerCase().includes(q) || (a.category?.name || '').toLowerCase().includes(q)); }
    return list;
  }, [assets, filterType, filterStatus, search]);

  const byCategory = summary?.byCategory || [];
  const byStatus = summary?.byStatus || [];
  const byType = summary?.byType || [];
  const byCompany = summary?.byCompany || [];
  const byDepartment = summary?.byDepartment || [];
  const total = summary?.total || 0;

  const sortedCompany = useMemo(() => [...byCompany].sort((a: any, b: any) => (b._count || 0) - (a._count || 0)), [byCompany]);
  const sortedDepartment = useMemo(() => [...byDepartment].sort((a: any, b: any) => (b._count || 0) - (a._count || 0)), [byDepartment]);
  const typeOptions = useMemo(() => [...new Set(assets.map(a => a.type).filter(Boolean))] as string[], [assets]);

  const getCount = (st: string) => byStatus.find((s: any) => s.status === st)?._count || 0;
  const activeAssets = getCount('Available') + getCount('InUse');
  const issueAssets = getCount('Maintenance') + getCount('Lost');
  const otherAssets = getCount('Borrowed') + getCount('Retired');

  const donutData = useMemo(() => {
    if (!byType || byType.length === 0 || total === 0) return [];
    const sortedTypes = [...byType].sort((a: any, b: any) => {
      const aVal = typeof a._count === 'object' ? a._count.id || a._count._all || 0 : a._count;
      const bVal = typeof b._count === 'object' ? b._count.id || b._count._all || 0 : b._count;
      return bVal - aVal;
    });
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    let currentOffset = 0;
    return sortedTypes.map((t: any, i: number) => {
      const count = typeof t._count === 'object' ? t._count.id || t._count._all || 0 : t._count;
      const percent = total > 0 ? (count / total) * 100 : 0;
      const strokeOffset = circumference - (percent / 100) * circumference;
      const rotation = (currentOffset / circumference) * 360;
      currentOffset += (percent / 100) * circumference;
      return {
        name: t.type || 'ไม่ระบุประเภท',
        count,
        percent,
        strokeOffset,
        rotation,
        color: CAT_COLORS[i % CAT_COLORS.length]
      };
    });
  }, [byType, total]);

  const columns: GridColDef[] = [
    { field: 'assetCode', headerName: 'รหัสทรัพย์สิน', width: 140, renderCell: ({ value }) => <Typography fontWeight={700} color="primary">{value}</Typography> },
    { field: 'type', headerName: 'ประเภท', width: 120, renderCell: ({ value }) => <Chip label={value || '-'} size="small" variant="outlined" /> },
    { field: 'brand', headerName: 'ยี่ห้อ', width: 120 },
    { field: 'assetName', headerName: 'ชื่อทรัพย์สิน', width: 180 },
    { field: 'departmentId', headerName: 'แผนก', width: 120 },
    { 
      field: 'warrantyDaysLeft', 
      headerName: 'ประกันคงเหลือ', 
      width: 155,
      renderCell: ({ value }) => {
        if (value === null || value === undefined) return <Typography variant="body2" color="text.secondary">-</Typography>;
        const color = value > 90 ? 'success' : value > 0 ? 'warning' : 'error';
        const label = value > 0 ? `รับประกัน ${value} วัน` : 'หมดประกัน';
        return <Chip label={label} color={color} size="small" variant="outlined" sx={{ fontWeight: 600 }} />;
      }
    },
    {
      field: 'status', headerName: 'สถานะ', width: 130,
      renderCell: ({ value }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: STATUS_COLORS[value] || theme.palette.text.disabled }} />
          <Typography variant="body2" fontWeight={600} sx={{ color: STATUS_COLORS[value] || theme.palette.text.disabled }}>{statusLabels[value] || value}</Typography>
        </Box>
      ),
    },
    {
      field: 'actions', type: 'actions', headerName: 'ดูข้อมูล', width: 100,
      getActions: (params) => [
        <GridActionsCellItem icon={<Eye size={18} color={theme.palette.primary.main} />} label="ดูรายละเอียด" onClick={() => navigate(`/assets/${params.id}`)} />
      ],
    },
  ];

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ pb: 6, bgcolor: 'background.default', minHeight: '100vh', mx: -3, px: 3 }}>
      <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
        <ReportHeaderTabs />

        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 4 }}>
          <Box>
            <Typography variant="h4" fontWeight={800} sx={{ color: 'text.primary', mb: 0.5, letterSpacing: '-0.02em' }}>Asset Executive Dashboard</Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>ภาพรวมสถานะและจำนวนทรัพย์สิน IT ทั้งหมดขององค์กร (Executive View)</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant="outlined" startIcon={<Download size={18} />} onClick={() => assetAPI.exportAssets().then(r => { const url = URL.createObjectURL(r.data); const a = document.createElement('a'); a.href = url; a.download = 'assets.xlsx'; a.click(); })} sx={{ borderRadius: 2, borderColor: 'divider', color: 'text.secondary', fontWeight: 600, '&:hover': { bgcolor: 'action.hover', borderColor: 'text.disabled' } }}>Export Excel</Button>
            <Button variant="contained" startIcon={exportingPDF ? <CircularProgress size={16} color="inherit" /> : <FileText size={18} />} onClick={handleExportPDF} disabled={exportingPDF} sx={{ borderRadius: 2, bgcolor: 'primary.main', fontWeight: 600, boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.25)}`, '&:hover': { bgcolor: 'primary.dark' } }}>{exportingPDF ? 'Generating...' : 'Export PDF'}</Button>
          </Box>
        </Box>

        <Box id="report-content" sx={{ bgcolor: 'background.paper', borderRadius: 4, p: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          {/* Executive KPIs */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card 
                onClick={() => setFilterStatus('')}
                sx={{
                  borderRadius: 4,
                  background: `linear-gradient(150deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  color: '#fff',
                  boxShadow: filterStatus === '' ? '0 12px 28px -5px rgba(15,23,42,0.6)' : '0 6px 15px -5px rgba(15,23,42,0.2)',
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  opacity: (filterStatus === '' || filterStatus === 'Active' || filterStatus === 'Issue' || filterStatus === 'Other') ? 1 : 0.45,
                  transform: filterStatus === '' ? 'scale(1.02)' : 'scale(1)',
                  border: filterStatus === '' ? '2px solid #fff' : '2px solid transparent',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 28px -5px rgba(15,23,42,0.5)'
                  }
                }}
              >
                <Box sx={{ position: 'absolute', top: -30, right: -20, opacity: 0.1, transform: 'scale(1.5)', pointerEvents: 'none' }}><Boxes size={120} /></Box>
                <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
                  <Typography variant="body2" fontWeight={600} sx={{ opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1 }}>ทรัพย์สินทั้งหมด</Typography>
                  <Typography variant="h2" fontWeight={800} sx={{ mb: 1 }}>{total}</Typography>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>รายการในระบบ</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card 
                onClick={() => setFilterStatus(filterStatus === 'Active' ? '' : 'Active')}
                sx={{
                  borderRadius: 4,
                  bgcolor: 'success.main',
                  color: '#fff',
                  boxShadow: filterStatus === 'Active' ? '0 12px 28px -5px rgba(16,185,129,0.6)' : '0 6px 15px -5px rgba(16,185,129,0.2)',
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  opacity: (filterStatus === '' || filterStatus === 'Active') ? 1 : 0.45,
                  transform: filterStatus === 'Active' ? 'scale(1.02)' : 'scale(1)',
                  border: filterStatus === 'Active' ? '2px solid #ffffff' : '2px solid transparent',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 28px -5px rgba(16,185,129,0.5)'
                  }
                }}
              >
                <Box sx={{ position: 'absolute', top: -30, right: -20, opacity: 0.15, transform: 'scale(1.5)', pointerEvents: 'none' }}><Activity size={120} /></Box>
                <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
                  <Typography variant="body2" fontWeight={600} sx={{ opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1 }}>พร้อมใช้งาน / กำลังใช้</Typography>
                  <Typography variant="h2" fontWeight={800} sx={{ mb: 1 }}>{activeAssets}</Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>{(total > 0 ? (activeAssets/total)*100 : 0).toFixed(1)}% ของทั้งหมด</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card 
                onClick={() => setFilterStatus(filterStatus === 'Issue' ? '' : 'Issue')}
                sx={{
                  borderRadius: 4,
                  bgcolor: 'error.main',
                  color: '#fff',
                  boxShadow: filterStatus === 'Issue' ? '0 12px 28px -5px rgba(239,68,68,0.6)' : '0 6px 15px -5px rgba(239,68,68,0.2)',
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  opacity: (filterStatus === '' || filterStatus === 'Issue') ? 1 : 0.45,
                  transform: filterStatus === 'Issue' ? 'scale(1.02)' : 'scale(1)',
                  border: filterStatus === 'Issue' ? '2px solid #ffffff' : '2px solid transparent',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 28px -5px rgba(239,68,68,0.5)'
                  }
                }}
              >
                <Box sx={{ position: 'absolute', top: -30, right: -20, opacity: 0.15, transform: 'scale(1.5)', pointerEvents: 'none' }}><AlertTriangle size={120} /></Box>
                <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
                  <Typography variant="body2" fontWeight={600} sx={{ opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1 }}>ซ่อมบำรุง / สูญหาย</Typography>
                  <Typography variant="h2" fontWeight={800} sx={{ mb: 1 }}>{issueAssets}</Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>ปัญหาที่ต้องดำเนินการ</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card 
                onClick={() => setFilterStatus(filterStatus === 'Other' ? '' : 'Other')}
                sx={{
                  borderRadius: 4,
                  bgcolor: 'warning.main',
                  color: '#fff',
                  boxShadow: filterStatus === 'Other' ? '0 12px 28px -5px rgba(245,158,11,0.6)' : '0 6px 15px -5px rgba(245,158,11,0.2)',
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  opacity: (filterStatus === '' || filterStatus === 'Other') ? 1 : 0.45,
                  transform: filterStatus === 'Other' ? 'scale(1.02)' : 'scale(1)',
                  border: filterStatus === 'Other' ? '2px solid #ffffff' : '2px solid transparent',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 28px -5px rgba(245,158,11,0.5)'
                  }
                }}
              >
                <Box sx={{ position: 'absolute', top: -30, right: -20, opacity: 0.15, transform: 'scale(1.5)', pointerEvents: 'none' }}><PackageX size={120} /></Box>
                <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
                  <Typography variant="body2" fontWeight={600} sx={{ opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1 }}>กำลังยืม / ปลดระวาง</Typography>
                  <Typography variant="h2" fontWeight={800} sx={{ mb: 1 }}>{otherAssets}</Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>สถานะอื่นๆ</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Status Breakdown Bar & Legend */}
          <Box sx={{ mb: 6, p: 4, bgcolor: 'action.hover', borderRadius: 4, border: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="h6" fontWeight={800} sx={{ mb: 3, color: 'text.primary' }}>สัดส่วนสถานะทรัพย์สินโดยละเอียด (Status Distribution)</Typography>
            
            {/* Progress Bar */}
            <Box sx={{ width: '100%', height: 28, display: 'flex', borderRadius: 14, overflow: 'hidden', mb: 4, boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)' }}>
              {['Available', 'InUse', 'Borrowed', 'Maintenance', 'Retired', 'Lost'].map((st) => {
                const count = getCount(st);
                if (count === 0 || total === 0) return null;
                return (
                  <Box key={st} sx={{ width: `${(count/total)*100}%`, bgcolor: STATUS_COLORS[st], transition: 'all 0.3s', '&:hover': { filter: 'brightness(1.1)' } }} title={`${statusLabels[st]}: ${count}`} />
                );
              })}
            </Box>

            {/* Clickable Legend Cards */}
            <Grid container spacing={2}>
              {['Available', 'InUse', 'Borrowed', 'Maintenance', 'Retired', 'Lost'].map((st) => {
                const count = getCount(st);
                const isActive = filterStatus === st;
                return (
                  <Grid item xs={6} sm={4} md={2} key={st}>
                    <Box 
                      onClick={() => setFilterStatus(isActive ? '' : st)}
                      sx={{ 
                        p: 2, borderRadius: 3, bgcolor: 'background.paper', border: `2px solid ${isActive ? STATUS_COLORS[st] : theme.palette.divider}`,
                        cursor: 'pointer', transition: 'all 0.2s', boxShadow: isActive ? `0 4px 12px ${alpha(STATUS_COLORS[st], 0.2)}` : '0 2px 4px rgba(0,0,0,0.02)',
                        '&:hover': { borderColor: STATUS_COLORS[st], transform: 'translateY(-2px)' }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: STATUS_COLORS[st] }} />
                        <Typography variant="body2" fontWeight={700} sx={{ color: 'text.secondary' }}>{statusLabels[st]}</Typography>
                      </Box>
                      <Typography variant="h5" fontWeight={800} sx={{ color: 'text.primary' }}>{count}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>{total > 0 ? ((count/total)*100).toFixed(1) : 0}%</Typography>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </Box>

          {/* Row: Donut Chart & Category Boxes */}
          <Grid container spacing={4} sx={{ mb: 4 }}>
            {/* Donut Chart */}
            <Grid item xs={12} md={5}>
              <Box sx={{ p: 4, borderRadius: 4, border: `1px solid ${theme.palette.divider}`, height: '100%', bgcolor: 'background.paper' }}>
                <Typography variant="h6" fontWeight={800} sx={{ mb: 4, color: 'text.primary' }}>ประเภทอุปกรณ์ (Device Types)</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Box sx={{ position: 'relative', width: 220, height: 220, mb: 4 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ReChartsPieChart>
                        <Pie
                          data={donutData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="count"
                          nameKey="name"
                        >
                          {donutData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip 
                          formatter={(value: any, name: any) => [`${value} รายการ (${((value / total) * 100).toFixed(1)}%)`, name]}
                          contentStyle={{ background: theme.palette.background.paper, borderRadius: 8, color: theme.palette.text.primary, border: `1px solid ${theme.palette.divider}`, fontSize: 12 }}
                          itemStyle={{ color: theme.palette.text.primary }}
                        />
                      </ReChartsPieChart>
                    </ResponsiveContainer>
                    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                      <Typography variant="h3" fontWeight={800} sx={{ color: 'text.primary', lineHeight: 1 }}>{total}</Typography>
                      <Typography variant="caption" fontWeight={600} sx={{ color: 'text.secondary', mt: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>ทั้งหมด</Typography>
                    </Box>
                  </Box>
                  
                  {/* Donut Legend (Top 5 only to save space) */}
                  <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {donutData.slice(0, 5).map((slice: any, idx: number) => (
                      <Box key={idx} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box sx={{ width: 12, height: 12, borderRadius: 3, bgcolor: slice.color }} />
                          <Typography variant="body2" fontWeight={600} sx={{ color: 'text.primary' }}>{slice.name}</Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="body2" fontWeight={800} sx={{ color: 'text.primary' }}>{slice.count}</Typography>
                        </Box>
                      </Box>
                    ))}
                    {donutData.length > 5 && (
                      <Typography variant="caption" sx={{ color: 'text.disabled', textAlign: 'center', mt: 1, fontWeight: 600 }}>+ อีก {donutData.length - 5} ประเภท</Typography>
                    )}
                  </Box>
                </Box>
              </Box>
            </Grid>

            {/* Category Cards & Top Company/Dept */}
            <Grid item xs={12} md={7}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, height: '100%' }}>
                
                {/* Category Cards */}
                <Box sx={{ p: 4, borderRadius: 4, border: `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper' }}>
                  <Typography variant="h6" fontWeight={800} sx={{ mb: 3, color: 'text.primary' }}>หมวดหมู่การใช้งานหลัก (Categories)</Typography>
                  <Grid container spacing={2}>
                    {byCategory.slice(0, 6).map((cat: any, i: number) => (
                      <Grid item xs={6} sm={4} key={cat.id || i}>
                        <Box sx={{ p: 2, borderRadius: 3, bgcolor: 'action.hover', border: `1px solid ${theme.palette.divider}`, display: 'flex', flexDirection: 'column', height: '100%' }}>
                           <Box sx={{ fontSize: 24, mb: 1 }}>{cat.icon || '📦'}</Box>
                           <Typography variant="body2" fontWeight={700} sx={{ color: 'text.secondary', mb: 1, flexGrow: 1 }}>{cat.name}</Typography>
                           <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                             <Typography variant="h5" fontWeight={800} sx={{ color: 'text.primary' }}>{cat.assetCount ?? 0}</Typography>
                             <Typography variant="caption" fontWeight={700} sx={{ color: CAT_COLORS[i % CAT_COLORS.length] }}>{total ? ((cat.assetCount/total)*100).toFixed(0) : 0}%</Typography>
                           </Box>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Box>

                {/* Company & Dept Top 3 */}
                <Grid container spacing={3} sx={{ flexGrow: 1 }}>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ p: 3, borderRadius: 4, border: `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper', height: '100%' }}>
                      <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2, color: 'text.primary' }}>จัดสรรตามบริษัท (Top 4)</Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {sortedCompany.slice(0, 4).map((c: any, i: number) => (
                          <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" fontWeight={600} color="text.secondary" noWrap sx={{ maxWidth: '70%' }}>{c.company || 'N/A'}</Typography>
                            <Chip label={c._count} size="small" sx={{ fontWeight: 700, bgcolor: 'action.hover', color: 'text.primary' }} />
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ p: 3, borderRadius: 4, border: `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper', height: '100%' }}>
                      <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2, color: 'text.primary' }}>จัดสรรตามแผนก (Top 4)</Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {sortedDepartment.slice(0, 4).map((d: any, i: number) => (
                          <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" fontWeight={600} color="text.secondary" noWrap sx={{ maxWidth: '70%' }}>{d.departmentId || 'N/A'}</Typography>
                            <Chip label={d._count} size="small" sx={{ fontWeight: 700, bgcolor: 'action.hover', color: 'text.primary' }} />
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  </Grid>
                </Grid>

              </Box>
            </Grid>
          </Grid>
        </Box> {/* End of PDF capture area */}

        {/* Matrix Report Section */}
        <Box sx={{ mt: 4, mb: 4 }}>
          <CompanyAssetMatrix assets={assets} />
        </Box>

        {/* Detailed Table Section */}
        <Box sx={{ mt: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="h5" fontWeight={800} sx={{ color: 'text.primary' }}>รายการข้อมูลทรัพย์สินทั้งหมด</Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 220, bgcolor: 'background.paper' }}>
                <InputLabel>สถานะ</InputLabel>
                <Select value={filterStatus} label="สถานะ" onChange={e => setFilterStatus(e.target.value)}>
                  <MenuItem value="">ทั้งหมด</MenuItem>
                  <MenuItem value="Active">🟢 พร้อมใช้งาน / กำลังใช้</MenuItem>
                  <MenuItem value="Issue">🔴 ซ่อมบำรุง / สูญหาย</MenuItem>
                  <MenuItem value="Other">🟠 กำลังยืม / ปลดระวาง</MenuItem>
                  <MenuItem value="WarrantyExpired">⚠️ ประกันหมดอายุ</MenuItem>
                  <MenuItem value="WarrantyExpiring">⏳ ประกันใกล้หมดอายุ (30 วัน)</MenuItem>
                  <hr style={{ margin: '8px 0', border: 'none', borderTop: `1px solid ${theme.palette.divider}` }} />
                  {Object.entries(statusLabels).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField 
                size="small" 
                placeholder="ค้นหารหัส, ชื่อ, ยี่ห้อ..." 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                sx={{ minWidth: 250, bgcolor: 'background.paper' }} 
              />
            </Box>
          </Box>

          <Card sx={{ borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.02)', border: 'none', overflow: 'hidden' }}>
            <DataGrid
              rows={filtered}
              columns={columns}
              loading={loading}
              getRowId={(r) => r.id}
              autoHeight
              disableRowSelectionOnClick
              onRowDoubleClick={(params) => navigate(`/assets/${params.id}`)}
              pageSizeOptions={[25, 50, 100]}
              initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
              sx={{ 
                border: 'none', 
                '& .MuiDataGrid-columnHeader': { bgcolor: 'action.hover', color: 'text.primary', fontWeight: 800 },
                '& .MuiDataGrid-cell': { borderColor: 'divider', py: 1 },
                '& .MuiDataGrid-row': { cursor: 'pointer' },
                '& .MuiDataGrid-row:hover': { bgcolor: 'action.hover' }
              }}
            />
          </Card>
        </Box>
        
      </Box>
    </Box>
  );
}