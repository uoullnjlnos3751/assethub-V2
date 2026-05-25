import React, { useEffect, useState, useMemo } from 'react';
import { Box, Typography, Card, CardContent, Grid, CircularProgress, Chip, TextField, MenuItem, Select, InputLabel, FormControl, alpha } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { borrowAPI, dashboardAPI } from '../../services/api';
import { ShoppingCart, AlertTriangle, CheckCircle2, History, Search, TrendingUp, User } from 'lucide-react';

const statusLabels: Record<string, string> = { Pending: 'รออนุมัติ', Approved: 'อนุมัติแล้ว', Rejected: 'ปฏิเสธ', CheckedOut: 'ส่งมอบแล้ว', PartiallyReturned: 'คืนบางส่วน', Returned: 'คืนแล้ว' };
const statusColors: Record<string, string> = { Pending: 'warning', Approved: 'info', Rejected: 'error', CheckedOut: 'primary', PartiallyReturned: 'secondary', Returned: 'success' };
const MONTHS_TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

export default function ReportBorrowPage() {
  const [summary, setSummary] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [trend, setTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchName, setSearchName] = useState('');
  const [trendYear, setTrendYear] = useState(new Date().getFullYear());

  useEffect(() => {
    Promise.all([
      dashboardAPI.borrowSummary(),
      borrowAPI.history({ limit: 10000 }),
      dashboardAPI.borrowTrend(trendYear),
    ])
      .then(([s, h, t]) => {
        setSummary(s.data);
        setHistory(h.data?.data || h.data || []);
        setTrend(t.data?.months || []);
      })
      .finally(() => setLoading(false));
  }, [trendYear]);

  const filtered = useMemo(() => {
    let list = history;
    if (statusFilter) list = list.filter(r => r.status === statusFilter);
    if (searchName) { const q = searchName.toLowerCase(); list = list.filter(r => (r.requester?.displayName || r.requester?.adUsername || '').toLowerCase().includes(q)); }
    return list;
  }, [history, statusFilter, searchName]);

  const topBorrowers = useMemo(() => {
    const map: Record<string, { name: string; count: number }> = {};
    for (const r of history) {
      const name = r.requester?.displayName || r.requester?.adUsername || 'ไม่ระบุ';
      if (!map[name]) map[name] = { name, count: 0 };
      map[name].count++;
    }
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [history]);

  const trendMax = Math.max(...trend.map((m: any) => m.requests), 1);

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

      {/* Summary cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <Card><CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}><Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(99,102,241,0.1)', color: '#4f46e5', display: 'flex' }}><ShoppingCart size={20} /></Box><Typography variant="body2" color="text.secondary" fontWeight={600}>รออนุมัติ</Typography></Box>
            <Typography variant="h4" fontWeight={800}>{summary?.pendingApproval || 0}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card><CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}><Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(16,185,129,0.1)', color: '#059669', display: 'flex' }}><CheckCircle2 size={20} /></Box><Typography variant="body2" color="text.secondary" fontWeight={600}>กำลังยืม</Typography></Box>
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

      {/* Row: Trend chart + Top borrowers */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* Monthly trend */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><TrendingUp size={18} color="#4f46e5" /> แนวโน้มรายเดือน</Typography>
                <FormControl size="small" sx={{ minWidth: 100 }}>
                  <Select value={trendYear} onChange={e => setTrendYear(Number(e.target.value))}>
                    {[2024, 2025, 2026].map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: 120 }}>
                {trend.map((m: any, i: number) => (
                  <Box key={m.month} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                    <Box sx={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                      <Box sx={{ width: '100%', borderRadius: '3px 3px 0 0', minHeight: 3, height: `${Math.max((m.requests / trendMax) * 100, 4)}%`, bgcolor: alpha('#4f46e5', 0.7), transition: 'height 0.3s' }} />
                    </Box>
                    <Typography sx={{ fontSize: 9, color: '#9ca3af', transform: 'rotate(-45deg)', mt: 1 }}>{MONTHS_TH[i]}</Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        {/* Top borrowers */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}><User size={18} color="#4f46e5" /> ผู้ขอยืมสูงสุด</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {topBorrowers.map((b, i) => (
                  <Box key={b.name} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography variant="body2" fontWeight={700} color="#6b7280" sx={{ minWidth: 20 }}>#{i + 1}</Typography>
                    <Typography variant="body2" sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</Typography>
                    <Chip label={b.count} size="small" color="primary" sx={{ fontWeight: 700 }} />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Search size={18} color="#6b7280" />
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>สถานะ</InputLabel>
              <Select value={statusFilter} label="สถานะ" onChange={e => setStatusFilter(e.target.value)}>
                <MenuItem value="">ทั้งหมด</MenuItem>
                {Object.entries(statusLabels).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField size="small" placeholder="ค้นหาชื่อผู้ยืม..." value={searchName} onChange={e => setSearchName(e.target.value)} sx={{ minWidth: 220 }} />
          </Box>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <Box sx={{ p: 2.5, borderBottom: '1px solid rgba(99,102,241,0.07)' }}>
            <Typography variant="h6" fontWeight={700}>ประวัติการยืม-คืนทั้งหมด ({filtered.length})</Typography>
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