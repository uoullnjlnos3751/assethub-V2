import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Grid, CircularProgress, Chip } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { assetAPI, dashboardAPI } from '../../services/api';
import { Boxes, CheckCircle2, AlertTriangle, Wrench } from 'lucide-react';

const statusColors: Record<string, string> = { Available: 'success', Borrowed: 'warning', InUse: 'info', Maintenance: 'error', Retired: 'default', Lost: 'error' };
const statusLabels: Record<string, string> = { Available: 'พร้อมใช้งาน', Borrowed: 'กำลังยืม', InUse: 'ใช้งานประจำ', Maintenance: 'ซ่อมบำรุง', Retired: 'ปลดระวาง', Lost: 'สูญหาย' };

export default function ReportAssetsPage() {
  const [summary, setSummary] = useState<any>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  const columns: GridColDef[] = [
    { field: 'assetCode', headerName: 'รหัสทรัพย์สิน', width: 140, renderCell: ({ value }) => <Typography fontWeight={600}>{value}</Typography> },
    { field: 'serialNo', headerName: 'Serial No.', width: 140 },
    { field: 'type', headerName: 'ประเภท', width: 120 },
    { field: 'brand', headerName: 'ยี่ห้อ', width: 120 },
    { field: 'model', headerName: 'รุ่น', width: 130 },
    { field: 'ownerName', headerName: 'ผู้ถือครอง', width: 150 },
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
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>รายงานทรัพย์สิน</Typography>
        <Typography variant="body2" color="text.secondary">สรุปจำนวนและสถานะทรัพย์สิน IT ทั้งหมด</Typography>
      </Box>

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <Card><CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}><Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(99,102,241,0.1)', color: '#4f46e5', display: 'flex' }}><Boxes size={20} /></Box><Typography variant="body2" color="text.secondary" fontWeight={600}>ทั้งหมด</Typography></Box>
            <Typography variant="h4" fontWeight={800}>{summary?.total || 0}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card><CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}><Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(16,185,129,0.1)', color: '#059669', display: 'flex' }}><CheckCircle2 size={20} /></Box><Typography variant="body2" color="text.secondary" fontWeight={600}>พร้อมใช้งาน</Typography></Box>
            <Typography variant="h4" fontWeight={800}>{summary?.byStatus?.find((s: any) => s.status === 'Available')?._count || 0}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card><CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}><Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(245,158,11,0.1)', color: '#d97706', display: 'flex' }}><AlertTriangle size={20} /></Box><Typography variant="body2" color="text.secondary" fontWeight={600}>กำลังยืม</Typography></Box>
            <Typography variant="h4" fontWeight={800}>{summary?.byStatus?.find((s: any) => s.status === 'Borrowed')?._count || 0}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card><CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}><Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(239,68,68,0.08)', color: '#dc2626', display: 'flex' }}><Wrench size={20} /></Box><Typography variant="body2" color="text.secondary" fontWeight={600}>ซ่อมบำรุง</Typography></Box>
            <Typography variant="h4" fontWeight={800}>{summary?.byStatus?.find((s: any) => s.status === 'Maintenance')?._count || 0}</Typography>
          </CardContent></Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <Box sx={{ p: 2.5, borderBottom: '1px solid rgba(99,102,241,0.07)' }}>
            <Typography variant="h6" fontWeight={700}>รายการทรัพย์สินทั้งหมด</Typography>
          </Box>
          <DataGrid
            rows={assets}
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
