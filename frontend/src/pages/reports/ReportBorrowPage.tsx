import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Grid, CircularProgress, Chip } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { borrowAPI, dashboardAPI } from '../../services/api';
import { ShoppingCart, AlertTriangle, CheckCircle2, History } from 'lucide-react';

const statusLabels: Record<string, string> = { Pending: 'รออนุมัติ', Approved: 'อนุมัติแล้ว', Rejected: 'ปฏิเสธ', CheckedOut: 'ส่งมอบแล้ว', PartiallyReturned: 'คืนบางส่วน', Returned: 'คืนแล้ว' };
const statusColors: Record<string, string> = { Pending: 'warning', Approved: 'info', Rejected: 'error', CheckedOut: 'primary', PartiallyReturned: 'secondary', Returned: 'success' };

export default function ReportBorrowPage() {
  const [summary, setSummary] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dashboardAPI.borrowSummary(),
      borrowAPI.history({ limit: 10000 }),
    ])
      .then(([s, h]) => {
        setSummary(s.data);
        setHistory(h.data?.data || h.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const columns: GridColDef[] = [
    { field: 'requestNo', headerName: 'เลขที่คำขอ', width: 160, renderCell: ({ value }) => <Typography fontWeight={600} fontSize="0.85rem">{value || '-'}</Typography> },
    { field: 'requester', headerName: 'ผู้ขอ', width: 160, valueGetter: (_v, row) => row.requester?.displayName || row.requester?.adUsername || '-' },
    { field: 'purpose', headerName: 'วัตถุประสงค์', flex: 1, minWidth: 200 },
    { field: 'department', headerName: 'แผนก', width: 120 },
    { field: 'totalItems', headerName: 'จำนวนรายการ', width: 110, align: 'center' as const },
    { field: 'status', headerName: 'สถานะ', width: 130, renderCell: ({ value }) => <Chip label={statusLabels[value] || value} color={(statusColors[value] as any) || 'default'} size="small" /> },
    { field: 'createdAt', headerName: 'วันที่สร้าง', width: 170, valueFormatter: (v) => new Date(v).toLocaleString('th-TH') },
  ];

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ pb: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>รายงานยืม-คืน</Typography>
        <Typography variant="body2" color="text.secondary">สรุปสถิติและประวัติการยืม-คืนทรัพย์สิน</Typography>
      </Box>

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <Card><CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}><Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(99,102,241,0.1)', color: '#4f46e5', display: 'flex' }}><ShoppingCart size={20} /></Box><Typography variant="body2" color="text.secondary" fontWeight={600}>รออนุมัติ</Typography></Box>
            <Typography variant="h4" fontWeight={800}>{summary?.pendingApproval || 0}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card><CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}><Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(16,185,129,0.1)', color: '#059669', display: 'flex' }}><CheckCircle2 size={20} /></Box><Typography variant="body2" color="text.secondary" fontWeight={600}>{summary?.activeCheckedOut !== undefined ? 'กำลังยืม' : 'CheckedOut'}</Typography></Box>
            <Typography variant="h4" fontWeight={800}>{summary?.activeCheckedOut || 0}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card><CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}><Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(245,158,11,0.1)', color: '#d97706', display: 'flex' }}><AlertTriangle size={20} /></Box><Typography variant="body2" color="text.secondary" fontWeight={600}>เกินกำหนด</Typography></Box>
            <Typography variant="h4" fontWeight={800}>{summary?.overdue || 0}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card><CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}><Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(139,92,246,0.1)', color: '#7c3aed', display: 'flex' }}><History size={20} /></Box><Typography variant="body2" color="text.secondary" fontWeight={600}>คำขอทั้งหมด</Typography></Box>
            <Typography variant="h4" fontWeight={800}>{history.length}</Typography>
          </CardContent></Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <Box sx={{ p: 2.5, borderBottom: '1px solid rgba(99,102,241,0.07)' }}>
            <Typography variant="h6" fontWeight={700}>ประวัติการยืม-คืนทั้งหมด</Typography>
          </Box>
          <DataGrid
            rows={history}
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
