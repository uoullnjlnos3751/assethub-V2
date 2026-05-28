import React, { useEffect, useState, useMemo } from 'react';
import { Box, Typography, Card, CardContent, Grid, CircularProgress, Chip, Button, TextField, MenuItem, Select, InputLabel, FormControl, alpha } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { assetAPI, dashboardAPI } from '../../services/api';
import { Boxes, CheckCircle2, AlertTriangle, Wrench, Download, Filter, PieChart } from 'lucide-react';
import ReportHeaderTabs from './ReportHeaderTabs';

const statusColors: Record<string, string> = { Available: 'success', Borrowed: 'warning', InUse: 'info', Maintenance: 'error', Retired: 'default', Lost: 'error' };
const statusLabels: Record<string, string> = { Available: 'พร้อมใช้งาน', Borrowed: 'กำลังยืม', InUse: 'ใช้งานประจำ', Maintenance: 'ซ่อมบำรุง', Retired: 'ปลดระวาง', Lost: 'สูญหาย' };
const CAT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16'];

export default function ReportAssetsPage() {
  const [summary, setSummary] = useState<any>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

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
    if (filterStatus) list = list.filter(a => a.status === filterStatus);
    if (search) { const q = search.toLowerCase(); list = list.filter(a => (a.assetCode || '').toLowerCase().includes(q) || (a.serialNo || '').toLowerCase().includes(q) || (a.assetName || '').toLowerCase().includes(q)); }
    return list;
  }, [assets, filterType, filterStatus, search]);

  const byCategory = summary?.byCategory || [];
  const byStatus = summary?.byStatus || [];
  const byType = summary?.byType || [];
  const total = summary?.total || 0;

  const typeOptions = useMemo(() => [...new Set(assets.map(a => a.type).filter(Boolean))] as string[], [assets]);

  // Donut Chart logic
  const donutData = useMemo(() => {
    if (!byType || byType.length === 0 || total === 0) return [];
    
    // Sort by count descending
    const sortedTypes = [...byType].sort((a: any, b: any) => {
      const aVal = typeof a._count === 'object' ? a._count.id || a._count._all || 0 : a._count;
      const bVal = typeof b._count === 'object' ? b._count.id || b._count._all || 0 : b._count;
      return bVal - aVal;
    });

    const radius = 40;
    const circumference = 2 * Math.PI * radius; // ~251.3
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
    { field: 'assetCode', headerName: 'รหัสทรัพย์สิน', width: 140, renderCell: ({ value }) => <Typography fontWeight={600}>{value}</Typography> },
    { field: 'serialNo', headerName: 'Serial No.', width: 140 },
    { field: 'type', headerName: 'ประเภท', width: 120 },
    { field: 'brand', headerName: 'ยี่ห้อ', width: 120 },
    { field: 'model', headerName: 'รุ่น', width: 130 },
    { field: 'assetName', headerName: 'ชื่อทรัพย์สิน', width: 150 },
    { field: 'departmentId', headerName: 'แผนก', width: 100 },
    { field: 'location', headerName: 'สถานที่ติดตั้ง/อาคาร', width: 150 },
    {
      field: 'status', headerName: 'สถานะ', width: 130,
      renderCell: ({ value }) => <Chip label={statusLabels[value] || value} color={(statusColors[value] as any) || 'default'} size="small" />,
    },
  ];

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ pb: 4 }}>
      {/* Navigation Tabs */}
      <ReportHeaderTabs />

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>รายงานทรัพย์สิน</Typography>
          <Typography variant="body2" color="text.secondary">สรุปจำนวนและสถานะทรัพย์สิน IT ทั้งหมดในระบบ</Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<Download size={16} />} 
          onClick={() => assetAPI.exportAssets().then(r => { const url = URL.createObjectURL(r.data); const a = document.createElement('a'); a.href = url; a.download = 'assets.xlsx'; a.click(); })}
          sx={{ 
            bgcolor: '#b45309', 
            '&:hover': { bgcolor: '#92400e' },
            boxShadow: '0 4px 10px rgba(180, 83, 9, 0.15)',
            textTransform: 'none'
          }}
        >
          Export Excel
        </Button>
      </Box>

      {/* Summary cards */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        <Grid item xs={6} md={3}>
          <Card sx={{ borderLeft: '4px solid #4f46e5', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}><CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}><Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(99,102,241,0.1)', color: '#4f46e5', display: 'flex' }}><Boxes size={20} /></Box><Typography variant="body2" color="text.secondary" fontWeight={600}>ทรัพย์สินทั้งหมด</Typography></Box>
            <Typography variant="h4" fontWeight={800}>{total}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ borderLeft: '4px solid #10b981', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}><CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}><Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(16,185,129,0.1)', color: '#059669', display: 'flex' }}><CheckCircle2 size={20} /></Box><Typography variant="body2" color="text.secondary" fontWeight={600}>พร้อมใช้งาน</Typography></Box>
            <Typography variant="h4" fontWeight={800}>{byStatus.find((s: any) => s.status === 'Available')?._count || 0}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ borderLeft: '4px solid #f59e0b', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}><CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}><Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(245,158,11,0.1)', color: '#d97706', display: 'flex' }}><AlertTriangle size={20} /></Box><Typography variant="body2" color="text.secondary" fontWeight={600}>กำลังยืม</Typography></Box>
            <Typography variant="h4" fontWeight={800}>{byStatus.find((s: any) => s.status === 'Borrowed')?._count || 0}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ borderLeft: '4px solid #ef4444', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}><CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}><Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(239,68,68,0.08)', color: '#dc2626', display: 'flex' }}><Wrench size={20} /></Box><Typography variant="body2" color="text.secondary" fontWeight={600}>ซ่อมบำรุง</Typography></Box>
            <Typography variant="h4" fontWeight={800}>{byStatus.find((s: any) => s.status === 'Maintenance')?._count || 0}</Typography>
          </CardContent></Card>
        </Grid>
      </Grid>

      {/* Chart Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={12}>
          <Card sx={{ borderRadius: '12px', border: '1px solid rgba(229,231,235,0.7)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <PieChart size={20} color="#b45309" />
                สัดส่วนทรัพย์สินแยกตามประเภท (Asset Types Distribution)
              </Typography>
              
              <Grid container spacing={4} alignItems="center">
                {/* SVG Donut Chart */}
                <Grid item xs={12} sm={4} sx={{ display: 'flex', justifyContent: 'center' }}>
                  <Box sx={{ position: 'relative', width: 200, height: 200 }}>
                    <svg width="200" height="200" viewBox="0 0 100 100">
                      {/* background track */}
                      <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f3f4f6" strokeWidth="9" />
                      
                      {/* segments */}
                      {donutData.map((slice: any, idx: number) => {
                        const radius = 40;
                        const circumference = 2 * Math.PI * radius;
                        return (
                          <circle
                            key={idx}
                            cx="50"
                            cy="50"
                            r={radius}
                            fill="transparent"
                            stroke={slice.color}
                            strokeWidth="9"
                            strokeDasharray={circumference}
                            strokeDashoffset={slice.strokeOffset}
                            transform={`rotate(${slice.rotation - 90} 50 50)`}
                            strokeLinecap={slice.percent > 2 ? "round" : "butt"}
                            style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
                          />
                        );
                      })}
                    </svg>
                    
                    {/* Centered Total Text */}
                    <Box sx={{
                      position: 'absolute',
                      top: 0, left: 0, right: 0, bottom: 0,
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Typography variant="h4" fontWeight={800} sx={{ color: '#1e293b', lineHeight: 1 }}>
                        {total}
                      </Typography>
                      <Typography variant="caption" fontWeight={600} sx={{ color: '#94a3b8', mt: 0.5, letterSpacing: '0.05em' }}>
                        เครื่องทั้งหมด
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                
                {/* Legend details */}
                <Grid item xs={12} sm={8}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                    {donutData.map((slice: any, idx: number) => (
                      <Box 
                        key={idx} 
                        sx={{ 
                          p: 1.5, 
                          borderRadius: '8px', 
                          border: '1px solid #f1f5f9',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          '&:hover': { bgcolor: '#f8fafc', borderColor: '#e2e8f0' }
                        }}
                      >
                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: slice.color, flexShrink: 0 }} />
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={600} noWrap sx={{ color: '#334155' }}>
                            {slice.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b' }}>
                            {slice.count} เครื่อง ({slice.percent.toFixed(1)}%)
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Category breakdown cards */}
      <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>จำนวนทรัพย์สินแยกตามหมวดหมู่การใช้งาน</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 2, mb: 4 }}>
        {byCategory.map((cat: any, i: number) => (
          <Card 
            key={cat.id || i} 
            sx={{ 
              borderRadius: '12px',
              borderTop: `4px solid ${CAT_COLORS[i % CAT_COLORS.length]}`, 
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              background: `linear-gradient(to bottom, #ffffff, ${alpha(CAT_COLORS[i % CAT_COLORS.length], 0.01)})`,
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': { 
                boxShadow: '0 8px 16px rgba(0,0,0,0.06)',
                transform: 'translateY(-2px)'
              } 
            }}
          >
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box sx={{ fontSize: 28, mb: 1, p: 0.5, borderRadius: '8px', bgcolor: alpha(CAT_COLORS[i % CAT_COLORS.length], 0.08), display: 'inline-flex' }}>{cat.icon || '📦'}</Box>
                <Chip 
                  label={`${((cat.assetCount ?? 0) / (total || 1) * 100).toFixed(0)}%`} 
                  size="small" 
                  sx={{ 
                    bgcolor: alpha(CAT_COLORS[i % CAT_COLORS.length], 0.1), 
                    color: CAT_COLORS[i % CAT_COLORS.length],
                    fontWeight: 700,
                    fontSize: '10px'
                  }} 
                />
              </Box>
              <Typography variant="body2" fontWeight={700} sx={{ color: '#475569', mt: 1 }}>{cat.name}</Typography>
              <Typography variant="h4" fontWeight={800} color={CAT_COLORS[i % CAT_COLORS.length]} sx={{ mt: 0.5 }}>{cat.assetCount ?? 0}</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Filter toolbar */}
      <Card sx={{ mb: 3, borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', border: '1px solid rgba(229,231,235,0.6)' }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Filter size={18} color="#6b7280" />
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>ประเภททรัพย์สิน</InputLabel>
              <Select value={filterType} label="ประเภททรัพย์สิน" onChange={e => setFilterType(e.target.value)}>
                <MenuItem value="">ทั้งหมด</MenuItem>
                {typeOptions.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>สถานะการใช้งาน</InputLabel>
              <Select value={filterStatus} label="สถานะการใช้งาน" onChange={e => setFilterStatus(e.target.value)}>
                <MenuItem value="">ทั้งหมด</MenuItem>
                {Object.entries(statusLabels).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField 
              size="small" 
              placeholder="ค้นหาด้วย รหัสทรัพย์สิน, Serial, ชื่อ..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              sx={{ minWidth: 260, flexGrow: 1 }} 
            />
          </Box>
        </CardContent>
      </Card>

      {/* Table */}
      <Card sx={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', border: '1px solid rgba(229,231,235,0.7)', overflow: 'hidden' }}>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <Box sx={{ p: 2.5, borderBottom: '1px solid rgba(229,231,235,0.7)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#fafafa' }}>
            <Typography variant="h6" fontWeight={700} sx={{ color: '#1e293b' }}>รายการทรัพย์สินทั้งหมด ({filtered.length})</Typography>
          </Box>
          <DataGrid
            rows={filtered}
            columns={columns}
            loading={loading}
            getRowId={(r) => r.id}
            autoHeight
            disableRowSelectionOnClick
            pageSizeOptions={[25, 50, 100]}
            initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
            sx={{ 
              border: 'none', 
              '& .MuiDataGrid-columnHeader': { bgcolor: '#f8fafc', color: '#475569', fontWeight: 700 },
              '& .MuiDataGrid-cell': { borderColor: '#f1f5f9' },
              '& .MuiDataGrid-row:hover': { bgcolor: '#f8fafc' }
            }}
          />
        </CardContent>
      </Card>
    </Box>
  );
}