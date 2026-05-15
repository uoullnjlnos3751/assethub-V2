import React, { useEffect, useState } from 'react';
import { Box, Typography, Chip, CircularProgress, Card, CardContent } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { dashboardAPI } from '../../services/api';

const actionLabels: Record<string, string> = {
  CREATE: 'สร้าง', STATUS_CHANGE: 'เปลี่ยนสถานะ', OWNER_CHANGE: 'เปลี่ยนผู้ถือครอง',
  LOCATION_CHANGE: 'เปลี่ยนสถานที่', CHECKOUT: 'ส่งมอบ', RETURN: 'คืน',
};

const actionColors: Record<string, string> = {
  CREATE: 'success', STATUS_CHANGE: 'warning', OWNER_CHANGE: 'info',
  LOCATION_CHANGE: 'primary', CHECKOUT: 'secondary', RETURN: 'default',
};

export default function AuditLogPage() {
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [recentReturns, setRecentReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.recentActivity()
      .then((res) => {
        setRecentRequests(res.data.recentRequests || []);
        setRecentReturns(res.data.recentReturns || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const columns: GridColDef[] = [
    { field: 'id', headerName: '#', width: 60 },
    { field: 'requestNo', headerName: 'เลขที่คำขอ', width: 160, renderCell: ({ value }) => <Typography fontWeight={600} fontSize="0.85rem">{value || '-'}</Typography> },
    { field: 'requester', headerName: 'ผู้ขอ', width: 160, valueGetter: (_v, row) => row.requester?.displayName || row.requester?.adUsername || '-' },
    { field: 'purpose', headerName: 'วัตถุประสงค์', flex: 1, minWidth: 200 },
    { field: 'department', headerName: 'แผนก', width: 120 },
    { field: 'status', headerName: 'สถานะ', width: 120, renderCell: ({ value }) => <Chip label={value} size="small" color={value === 'Approved' ? 'success' : value === 'Pending' ? 'warning' : value === 'CheckedOut' ? 'info' : 'default'} /> },
    { field: 'createdAt', headerName: 'วันที่', width: 170, valueFormatter: (v) => new Date(v).toLocaleString('th-TH') },
  ];

  const returnColumns: GridColDef[] = [
    { field: 'id', headerName: '#', width: 60 },
    { field: 'assetCode', headerName: 'รหัสทรัพย์สิน', width: 140, renderCell: ({ value }) => <Typography fontWeight={600} fontSize="0.85rem">{value || '-'}</Typography> },
    { field: 'requesterName', headerName: 'ผู้คืน', width: 160 },
    { field: 'returnDate', headerName: 'วันที่คืน', width: 170, valueFormatter: (v) => new Date(v).toLocaleString('th-TH') },
  ];

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ pb: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>Audit Log</Typography>
        <Typography variant="body2" color="text.secondary">ประวัติการทำรายการยืม-คืน และการเปลี่ยนแปลงล่าสุด</Typography>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <Box sx={{ p: 2.5, borderBottom: '1px solid rgba(99,102,241,0.07)' }}>
            <Typography variant="h6" fontWeight={700}>รายการยืมล่าสุด</Typography>
          </Box>
          <DataGrid
            rows={recentRequests}
            columns={columns}
            loading={loading}
            getRowId={(r) => r.id}
            autoHeight
            disableRowSelectionOnClick
            pageSizeOptions={[10, 25, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            sx={{ border: 'none', '& .MuiDataGrid-columnHeaders': { bgcolor: 'transparent' } }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <Box sx={{ p: 2.5, borderBottom: '1px solid rgba(99,102,241,0.07)' }}>
            <Typography variant="h6" fontWeight={700}>รายการคืนล่าสุด</Typography>
          </Box>
          <DataGrid
            rows={recentReturns}
            columns={returnColumns}
            loading={loading}
            getRowId={(r) => r.id}
            autoHeight
            disableRowSelectionOnClick
            pageSizeOptions={[10, 25, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            sx={{ border: 'none', '& .MuiDataGrid-columnHeaders': { bgcolor: 'transparent' } }}
          />
        </CardContent>
      </Card>
    </Box>
  );
}
