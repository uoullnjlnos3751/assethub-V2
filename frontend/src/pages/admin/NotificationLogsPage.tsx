import React, { useEffect, useState } from 'react';
import { Box, Typography, Chip, CircularProgress } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { adminAPI } from '../../services/api';

const statusColors: Record<string, string> = { PENDING: 'warning', SENT: 'success', FAILED: 'error' };

export default function NotificationLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    setLoading(true);
    adminAPI.notificationLogs({ page: page + 1 })
      .then((res) => { setLogs(res.data.data); setTotal(res.data.total); })
      .finally(() => setLoading(false));
  }, [page]);

  const columns: GridColDef[] = [
    { field: 'id', headerName: '#' },
    { field: 'eventType', headerName: 'ประเภท', width: 180 },
    { field: 'channel', headerName: 'ช่องทาง', width: 100 },
    { field: 'recipient', headerName: 'ผู้รับ', width: 200 },
    {
      field: 'status', headerName: 'สถานะ', width: 120,
      renderCell: ({ value }) => <Chip label={value === 'PENDING' ? 'รอส่ง' : value === 'SENT' ? 'ส่งแล้ว' : 'ล้มเหลว'} color={(statusColors[value] as any) || 'default'} size="small" />,
    },
    { field: 'retryCount', headerName: 'ลองใหม่', width: 80 },
    { field: 'lastError', headerName: 'ข้อผิดพลาด', width: 200 },
    { field: 'createdAt', headerName: 'สร้างเมื่อ', width: 180, valueFormatter: (v) => new Date(v).toLocaleString('th-TH') },
    { field: 'sentAt', headerName: 'ส่งเมื่อ', width: 180, valueFormatter: (v) => v ? new Date(v).toLocaleString('th-TH') : '-' },
  ];

  return (
    <Box>
      <Typography variant="h4" fontWeight={600} gutterBottom>ประวัติการแจ้งเตือน</Typography>
      <DataGrid
        rows={logs}
        columns={columns}
        loading={loading}
        rowCount={total}
        pageSizeOptions={[10, 20, 50]}
        paginationMode="server"
        paginationModel={{ page, pageSize: 20 }}
        onPaginationModelChange={(m) => setPage(m.page)}
        getRowId={(r) => r.id}
        autoHeight
        disableRowSelectionOnClick
      />
    </Box>
  );
}
