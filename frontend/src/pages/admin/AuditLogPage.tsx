import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Chip, CircularProgress, Card, CardContent, Tabs, Tab, 
  TextField, FormControl, InputLabel, Select, MenuItem, alpha, useTheme
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { ClipboardList, History, RotateCcw, Search, Filter } from 'lucide-react';
import { dashboardAPI, assetAPI } from '../../services/api';

const actionLabels: Record<string, string> = {
  CREATE: 'สร้างทรัพย์สิน',
  UPDATE: 'แก้ไขข้อมูล',
  DELETE: 'ลบทรัพย์สิน',
  STATUS_CHANGE: 'เปลี่ยนสถานะ',
  OWNER_CHANGE: 'เปลี่ยนผู้ถือครอง',
  LOCATION_CHANGE: 'เปลี่ยนสถานที่',
  CHECKOUT: 'ส่งมอบยืม',
  RETURN: 'คืนทรัพย์สิน',
};

const actionColors: Record<string, 'success' | 'warning' | 'info' | 'primary' | 'secondary' | 'error' | 'default'> = {
  CREATE: 'success',
  UPDATE: 'default',
  DELETE: 'error',
  STATUS_CHANGE: 'warning',
  OWNER_CHANGE: 'info',
  LOCATION_CHANGE: 'primary',
  CHECKOUT: 'secondary',
  RETURN: 'success',
};

function formatHistoryDetail(row: any) {
  const parts: string[] = [];
  if (row.fromStatus || row.toStatus) {
    parts.push(`สถานะ: ${row.fromStatus || '-'} ➡️ ${row.toStatus || '-'}`);
  }
  if (row.fromOwner || row.toOwner) {
    parts.push(`ผู้ถือครอง: ${row.fromOwner || '-'} ➡️ ${row.toOwner || '-'}`);
  }
  if (row.fromLoc || row.toLoc) {
    parts.push(`สถานที่: ${row.fromLoc || '-'} ➡️ ${row.toLoc || '-'}`);
  }
  if (row.fromDept || row.toDept) {
    parts.push(`แผนก: ${row.fromDept || '-'} ➡️ ${row.toDept || '-'}`);
  }
  if (row.note) {
    parts.push(`บันทึก: ${row.note}`);
  }
  return parts.join(' | ') || '-';
}

export default function AuditLogPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);

  // States for Tab 0: Global Audit Log
  const [globalHistory, setGlobalHistory] = useState<any[]>([]);
  const [historySearch, setHistorySearch] = useState('');
  const [historyActionFilter, setHistoryActionFilter] = useState('');

  // States for Tab 1 & 2: Borrows & Returns
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [recentReturns, setRecentReturns] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [histRes, activityRes] = await Promise.all([
        assetAPI.getGlobalHistory({ limit: 500 }),
        dashboardAPI.recentActivity()
      ]);
      setGlobalHistory(histRes.data.data || []);
      setRecentRequests(activityRes.data.recentRequests || []);
      setRecentReturns(activityRes.data.recentReturns || []);
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered Global History
  const filteredHistory = useMemo(() => {
    return globalHistory.filter(row => {
      const q = historySearch.toLowerCase();
      const matchSearch = !q || 
        (row.asset?.assetCode || '').toLowerCase().includes(q) ||
        (row.asset?.assetName || '').toLowerCase().includes(q) ||
        (row.actor?.displayName || '').toLowerCase().includes(q) ||
        (row.note || '').toLowerCase().includes(q);
      
      const matchAction = !historyActionFilter || row.actionType === historyActionFilter;
      return matchSearch && matchAction;
    });
  }, [globalHistory, historySearch, historyActionFilter]);

  // Tab 0: Global History Columns
  const historyColumns: GridColDef[] = [
    { field: 'id', headerName: '#', width: 60 },
    { 
      field: 'createdAt', 
      headerName: 'วัน-เวลาทำรายการ', 
      width: 170, 
      valueFormatter: (v) => new Date(v).toLocaleString('th-TH') 
    },
    { 
      field: 'assetCode', 
      headerName: 'รหัสทรัพย์สิน', 
      width: 140, 
      renderCell: ({ row }) => (
        <Typography 
          onClick={() => navigate(`/assets/${row.assetId}`)}
          fontWeight={700} 
          color="primary" 
          sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
          fontSize="0.75rem"
        >
          {row.asset?.assetCode || `Asset#${row.assetId}`}
        </Typography>
      )
    },
    { 
      field: 'assetName', 
      headerName: 'ชื่อทรัพย์สิน', 
      width: 180,
      valueGetter: (_v, row) => row.asset?.assetName || '-'
    },
    { 
      field: 'actionType', 
      headerName: 'ประเภทรายการ', 
      width: 150, 
      renderCell: ({ value }) => {
        const label = actionLabels[value] || value;
        const color = actionColors[value] || 'default';
        return <Chip label={label} size="small" color={color} sx={{ fontWeight: 600, fontSize: '0.68rem' }} />;
      }
    },
    { 
      field: 'actor', 
      headerName: 'ผู้ทำรายการ', 
      width: 150, 
      valueGetter: (_v, row) => row.actor?.displayName || '-' 
    },
    { 
      field: 'detail', 
      headerName: 'รายละเอียดความเปลี่ยนแปลง', 
      flex: 1, 
      minWidth: 300,
      valueGetter: (_v, row) => formatHistoryDetail(row)
    }
  ];

  // Tab 1: Borrow Request Columns
  const borrowColumns: GridColDef[] = [
    { field: 'id', headerName: '#', width: 60 },
    { 
      field: 'requestNo', 
      headerName: 'เลขที่คำขอ', 
      width: 160, 
      renderCell: ({ value, row }) => (
        <Typography 
          onClick={() => navigate(`/borrow/approval-queue`)} // Redirect to management
          fontWeight={700} 
          color="primary"
          sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
          fontSize="0.75rem"
        >
          {value || `Request#${row.id}`}
        </Typography>
      ) 
    },
    { 
      field: 'requester', 
      headerName: 'ผู้ขอยืม', 
      width: 160, 
      valueGetter: (_v, row) => row.requester?.displayName || row.requester?.adUsername || '-' 
    },
    { field: 'purpose', headerName: 'วัตถุประสงค์การยืม', flex: 1, minWidth: 200 },
    { field: 'department', headerName: 'แผนก', width: 120 },
    { 
      field: 'status', 
      headerName: 'สถานะ', 
      width: 120, 
      renderCell: ({ value }) => (
        <Chip 
          label={value === 'Approved' ? 'อนุมัติแล้ว' : value === 'Pending' ? 'รออนุมัติ' : value === 'CheckedOut' ? 'ส่งมอบแล้ว' : value} 
          size="small" 
          color={value === 'Approved' ? 'success' : value === 'Pending' ? 'warning' : value === 'CheckedOut' ? 'info' : 'default'} 
          sx={{ fontWeight: 600, fontSize: '0.68rem' }}
        />
      ) 
    },
    { 
      field: 'createdAt', 
      headerName: 'วันที่ทำรายการ', 
      width: 170, 
      valueFormatter: (v) => new Date(v).toLocaleString('th-TH') 
    },
  ];

  // Tab 2: Return Columns
  const returnColumns: GridColDef[] = [
    { field: 'id', headerName: '#', width: 60 },
    { 
      field: 'assetCode', 
      headerName: 'รหัสทรัพย์สิน', 
      width: 140, 
      renderCell: ({ row }) => (
        <Typography 
          onClick={() => navigate(`/assets/${row.requestItem?.assetId}`)}
          fontWeight={700} 
          color="primary"
          sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
          fontSize="0.75rem"
        >
          {row.assetCode || '-'}
        </Typography>
      ) 
    },
    { field: 'requesterName', headerName: 'ผู้ส่งคืน', width: 160 },
    { 
      field: 'returnDate', 
      headerName: 'วันที่คืนสำเร็จ', 
      width: 170, 
      valueFormatter: (v) => new Date(v).toLocaleString('th-TH') 
    },
  ];

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ pb: 4 }}>
      {/* Page Header */}
      <Box sx={{ mb: 2 }}>
        <Typography sx={{ fontSize: '1.35rem', fontWeight: 800, color: 'text.primary', mb: '2px', letterSpacing: '-0.02em' }}>Audit Log & Activity History</Typography>
        <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>ประวัติการปรับปรุง เปลี่ยนแปลงข้อมูล และการทำรายการธุรกรรมทั้งหมดในระบบ</Typography>
      </Box>

      {/* Modern Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={(_e, val) => setTabValue(val)} 
          textColor="primary" 
          indicatorColor="primary"
          sx={{
            minHeight: 40,
            '& .MuiTab-root': {
              fontWeight: 700,
              fontSize: '0.78rem',
              textTransform: 'none',
              minHeight: 40,
              py: 1,
            }
          }}
        >
          <Tab icon={<History size={15} />} iconPosition="start" label="ประวัติการปรับปรุงทรัพย์สิน (Asset History)" />
          <Tab icon={<ClipboardList size={15} />} iconPosition="start" label="รายการยืมล่าสุด (Recent Borrows)" />
          <Tab icon={<RotateCcw size={15} />} iconPosition="start" label="รายการคืนล่าสุด (Recent Returns)" />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      {tabValue === 0 && (
        <Card sx={{ borderRadius: 4, border: `1px solid ${theme.palette.divider}`, boxShadow: '0 4px 15px rgba(0,0,0,0.015)' }}>
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            {/* Filter Bar */}
            <Box sx={{ p: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', bgcolor: 'action.hover', borderBottom: `1px solid ${theme.palette.divider}` }}>
              <TextField
                size="small"
                placeholder="ค้นหารหัสทรัพย์สิน, ชื่อเครื่อง, ผู้ทำรายการ..."
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                InputProps={{
                  startAdornment: <Search size={15} style={{ marginRight: 8, color: theme.palette.text.secondary }} />
                }}
                sx={{ minWidth: 300, bgcolor: 'background.paper', '& .MuiInputBase-input': { fontSize: '0.78rem' } }}
              />
              <FormControl size="small" sx={{ minWidth: 200, bgcolor: 'background.paper' }}>
                <InputLabel sx={{ fontSize: '0.78rem' }}>การกระทำ (Action)</InputLabel>
                <Select
                  value={historyActionFilter}
                  label="การกระทำ (Action)"
                  onChange={e => setHistoryActionFilter(e.target.value)}
                  sx={{ fontSize: '0.78rem' }}
                >
                  <MenuItem value="" sx={{ fontSize: '0.78rem' }}>ทั้งหมด</MenuItem>
                  {Object.entries(actionLabels).map(([k, v]) => (
                    <MenuItem key={k} value={k} sx={{ fontSize: '0.78rem' }}>{v}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <DataGrid
              rows={filteredHistory}
              columns={historyColumns}
              loading={loading}
              getRowId={(r) => r.id}
              autoHeight
              density="compact"
              disableRowSelectionOnClick
              pageSizeOptions={[10, 25, 50]}
              initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
              sx={{ 
                border: 'none', 
                '& .MuiDataGrid-cell': { 
                  fontSize: '0.75rem', 
                  color: 'text.primary' 
                },
                '& .MuiDataGrid-columnHeaderTitle': { 
                  fontSize: '0.75rem', 
                  fontWeight: 700, 
                  color: 'text.secondary' 
                },
                '& .MuiDataGrid-columnHeaders': { 
                  bgcolor: 'action.hover',
                  borderBottom: `1px solid ${theme.palette.divider}`
                } 
              }}
            />
          </CardContent>
        </Card>
      )}

      {tabValue === 1 && (
        <Card sx={{ borderRadius: 4, border: `1px solid ${theme.palette.divider}`, boxShadow: '0 4px 15px rgba(0,0,0,0.015)' }}>
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            <DataGrid
              rows={recentRequests}
              columns={borrowColumns}
              loading={loading}
              getRowId={(r) => r.id}
              autoHeight
              density="compact"
              disableRowSelectionOnClick
              pageSizeOptions={[10, 25, 50]}
              initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
              sx={{ 
                border: 'none', 
                '& .MuiDataGrid-cell': { 
                  fontSize: '0.75rem', 
                  color: 'text.primary' 
                },
                '& .MuiDataGrid-columnHeaderTitle': { 
                  fontSize: '0.75rem', 
                  fontWeight: 700, 
                  color: 'text.secondary' 
                },
                '& .MuiDataGrid-columnHeaders': { 
                  bgcolor: 'action.hover',
                  borderBottom: `1px solid ${theme.palette.divider}`
                } 
              }}
            />
          </CardContent>
        </Card>
      )}

      {tabValue === 2 && (
        <Card sx={{ borderRadius: 4, border: `1px solid ${theme.palette.divider}`, boxShadow: '0 4px 15px rgba(0,0,0,0.015)' }}>
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            <DataGrid
              rows={recentReturns}
              columns={returnColumns}
              loading={loading}
              getRowId={(r) => r.id}
              autoHeight
              density="compact"
              disableRowSelectionOnClick
              pageSizeOptions={[10, 25, 50]}
              initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
              sx={{ 
                border: 'none', 
                '& .MuiDataGrid-cell': { 
                  fontSize: '0.75rem', 
                  color: 'text.primary' 
                },
                '& .MuiDataGrid-columnHeaderTitle': { 
                  fontSize: '0.75rem', 
                  fontWeight: 700, 
                  color: 'text.secondary' 
                },
                '& .MuiDataGrid-columnHeaders': { 
                  bgcolor: 'action.hover',
                  borderBottom: `1px solid ${theme.palette.divider}`
                } 
              }}
            />
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
