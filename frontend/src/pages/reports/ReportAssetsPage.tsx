import React, { useEffect, useState, useMemo } from 'react';
import { Box, Typography, Card, CardContent, Grid, CircularProgress, Chip, Button, TextField, MenuItem, Select, InputLabel, FormControl, alpha } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { assetAPI, dashboardAPI } from '../../services/api';
import { Boxes, CheckCircle2, AlertTriangle, Wrench, Download, Filter } from 'lucide-react';

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
  const total = summary?.total || 0;

  const typeOptions = useMemo(() => [...new Set(assets.map(a => a.type).filter(Boolean))] as string[], [assets]);

  const columns: GridColDef[] = [
    { field: 'assetCode', headerName: 'รหัสทรัพย์สิน', width: 140, renderCell: ({ value }) => <Typography fontWeight={600}>{value}</Typography> },
    { field: 'serialNo', headerName: 'Serial No.', width: 140 },
    { field: 'type', headerName: 'ประเภท', width: 120 },
    { field: 'brand', headerName: 'ยี่ห้อ', width: 120 },
    { field: 'model', headerName: 'รุ่น', width: 130 },
    { field: 'assetName', headerName: 'ชื่อทรัพย์สิน', width: 150 },
    { field: 'departmentId', headerName: 'แผนก', width: 100 },
    { field: 'location', headerName: 'Location', width: 100 },
    {
      field: 'status', headerName: 'สถานะ', width: 130,
      renderCell: ({ value }) => <Chip label={statusLabels[value] || value} color={(statusColors[value] as any) || 'default'} size="small" />,
    },
  ];

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ pb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>รายงานทรัพย์สิน</Typography>
          <Typography variant="body2" color="text.secondary">สรุปจำนวนและสถานะทรัพย์สิน IT ทั้งหมด</Typography>
        </Box>
        <Button variant="outlined" startIcon={<Download size={16} />} onClick={() => assetAPI.exportAssets().then(r => { const url = URL.createObjectURL(r.data); const a = document.createElement('a'); a.href = url; a.download = 'assets.xlsx'; a.click(); })}>
          Export Excel
        </Button>
      </Box>

      {/* Summary cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <Card><CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}><Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(99,102,241,0.1)', color: '#4f46e5', display: 'flex' }}><Boxes size={20} /></Box><Typography variant="body2" color="text.secondary" fontWeight={600}>ทั้งหมด</Typography></Box>
            <Typography variant="h4" fontWeight={800}>{total}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card><CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}><Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(16,185,129,0.1)', color: '#059669', display: 'flex' }}><CheckCircle2 size={20} /></Box><Typography variant="body2" color="text.secondary" fontWeight={600}>พร้อมใช้งาน</Typography></Box>
            <Typography variant="h4" fontWeight={800}>{byStatus.find((s: any) => s.status === 'Available')?._count || 0}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card><CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}><Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(245,158,11,0.1)', color: '#d97706', display: 'flex' }}><AlertTriangle size={20} /></Box><Typography variant="body2" color="text.secondary" fontWeight={600}>กำลังยืม</Typography></Box>
            <Typography variant="h4" fontWeight={800}>{byStatus.find((s: any) => s.status === 'Borrowed')?._count || 0}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card><CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}><Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(239,68,68,0.08)', color: '#dc2626', display: 'flex' }}><Wrench size={20} /></Box><Typography variant="body2" color="text.secondary" fontWeight={600}>ซ่อมบำรุง</Typography></Box>
            <Typography variant="h4" fontWeight={800}>{byStatus.find((s: any) => s.status === 'Maintenance')?._count || 0}</Typography>
          </CardContent></Card>
        </Grid>
      </Grid>

      {/* Category breakdown cards */}
      <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>จำนวนทรัพย์สินแยกตามหมวดหมู่</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 1.5, mb: 3 }}>
        {byCategory.map((cat: any, i: number) => (
          <Card key={cat.id || i} sx={{ borderTop: `3px solid ${CAT_COLORS[i % CAT_COLORS.length]}`, '&:hover': { boxShadow: 2 } }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ fontSize: 24, mb: 0.5 }}>{cat.icon || '📦'}</Box>
              <Typography variant="body2" fontWeight={700}>{cat.name}</Typography>
              <Typography variant="h5" fontWeight={800} color={CAT_COLORS[i % CAT_COLORS.length]}>{cat.assetCount ?? 0}</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Filter toolbar */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Filter size={18} color="#6b7280" />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>ประเภท</InputLabel>
              <Select value={filterType} label="ประเภท" onChange={e => setFilterType(e.target.value)}>
                <MenuItem value="">ทั้งหมด</MenuItem>
                {typeOptions.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>สถานะ</InputLabel>
              <Select value={filterStatus} label="สถานะ" onChange={e => setFilterStatus(e.target.value)}>
                <MenuItem value="">ทั้งหมด</MenuItem>
                {Object.entries(statusLabels).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField size="small" placeholder="ค้นหา..." value={search} onChange={e => setSearch(e.target.value)} sx={{ minWidth: 200 }} />
          </Box>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <Box sx={{ p: 2.5, borderBottom: '1px solid rgba(99,102,241,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight={700}>รายการทรัพย์สินทั้งหมด ({filtered.length})</Typography>
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
            sx={{ border: 'none', '& .MuiDataGrid-columnHeaders': { bgcolor: 'transparent' } }}
          />
        </CardContent>
      </Card>
    </Box>
  );
}