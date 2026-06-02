import React, { useEffect, useState, useMemo } from 'react';
import { Box, Typography, Card, CardContent, Grid, CircularProgress, Chip, TextField, MenuItem, Select, InputLabel, FormControl, Button, Tooltip, alpha } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { borrowAPI, dashboardAPI } from '../../services/api';
import { ShoppingCart, AlertTriangle, CheckCircle2, History, Search, TrendingUp, User, Download } from 'lucide-react';
import ReportHeaderTabs from './ReportHeaderTabs';
import * as XLSX from 'xlsx';

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

  // Client-side Excel Export
  const handleExportExcel = () => {
    const exportData = filtered.map(row => ({
      'เลขที่คำขอ': row.requestNo || '-',
      'ผู้ขอยืม': row.requester?.displayName || row.requester?.adUsername || '-',
      'แผนก': row.department || '-',
      'วัตถุประสงค์': row.purpose || '-',
      'จำนวนรายการ': row.totalItems || 0,
      'สถานะ': statusLabels[row.status] || row.status,
      'วันที่ยื่นคำขอ': new Date(row.createdAt).toLocaleString('th-TH')
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ประวัติการยืม-คืน');
    
    // Auto-fit column widths
    const maxProps = [{ wch: 18 }, { wch: 22 }, { wch: 18 }, { wch: 35 }, { wch: 12 }, { wch: 15 }, { wch: 20 }];
    worksheet['!cols'] = maxProps;

    XLSX.writeFile(workbook, `borrow_history_report_${trendYear}.xlsx`);
  };

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
      {/* Navigation Tabs */}
      <ReportHeaderTabs />

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>รายงานยืม-คืน</Typography>
          <Typography variant="body2" color="text.secondary">สรุปสถิติและประวัติการยืม-คืนทรัพย์สินทั้งหมดในระบบ</Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<Download size={16} />} 
          onClick={handleExportExcel}
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
          <Card sx={{ borderLeft: '2px solid #f59e0b', bgcolor: 'rgba(245,158,11,0.02)' }}><CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}><Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(245,158,11,0.1)', color: '#d97706', display: 'flex' }}><ShoppingCart size={20} /></Box><Typography variant="body2" color="text.secondary" fontWeight={600}>รออนุมัติ</Typography></Box>
            <Typography variant="h4" fontWeight={800}>{summary?.pendingApproval || 0}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ borderLeft: '2px solid #3b82f6', bgcolor: 'rgba(59,130,246,0.02)' }}><CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}><Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(59,130,246,0.1)', color: '#2563eb', display: 'flex' }}><CheckCircle2 size={20} /></Box><Typography variant="body2" color="text.secondary" fontWeight={600}>กำลังยืม</Typography></Box>
            <Typography variant="h4" fontWeight={800}>{summary?.activeCheckedOut || 0}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ borderLeft: '2px solid #ef4444', bgcolor: 'rgba(239,68,68,0.02)' }}><CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}><Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(239,68,68,0.08)', color: '#dc2626', display: 'flex' }}><AlertTriangle size={20} /></Box><Typography variant="body2" color="text.secondary" fontWeight={600}>ยืมเกินกำหนด</Typography></Box>
            <Typography variant="h4" fontWeight={800}>{summary?.overdue || 0}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ borderLeft: '2px solid #7c3aed', bgcolor: 'rgba(124,58,237,0.02)' }}><CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}><Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(139,92,246,0.1)', color: '#7c3aed', display: 'flex' }}><History size={20} /></Box><Typography variant="body2" color="text.secondary" fontWeight={600}>คำขอทั้งหมด</Typography></Box>
            <Typography variant="h4" fontWeight={800}>{history.length}</Typography>
          </CardContent></Card>
        </Grid>
      </Grid>

      {/* Row: Trend chart + Top borrowers */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {/* Monthly trend */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%', borderRadius: '12px', border: '1px solid rgba(229,231,235,0.7)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#1e293b' }}>
                  <TrendingUp size={20} color="#b45309" /> 
                  แนวโน้มการขอยืมรายเดือน
                </Typography>
                <FormControl size="small" sx={{ minWidth: 110 }}>
                  <Select value={trendYear} onChange={e => setTrendYear(Number(e.target.value))}>
                    {[2024, 2025, 2026].map(y => <MenuItem key={y} value={y}>{y} ปี</MenuItem>)}
                  </Select>
                </FormControl>
              </Box>
              
              {/* Custom graphical trend bar chart */}
              <Box sx={{ position: 'relative', height: 180, pt: 2, pb: 4, px: 2 }}>
                {/* Horizontal reference grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((r, idx) => (
                  <Box 
                    key={idx} 
                    sx={{ 
                      position: 'absolute', 
                      left: 0, right: 0,
                      bottom: `${(r * 120) + 40}px`,
                      borderBottom: '1px dashed #e2e8f0',
                      height: 0,
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <Typography sx={{ fontSize: 9, color: '#94a3b8', transform: 'translateY(-6px)' }}>
                      {Math.round(r * trendMax)}
                    </Typography>
                  </Box>
                ))}

                {/* Bars */}
                <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: 120, position: 'relative', zIndex: 2 }}>
                  {trend.map((m: any, i: number) => {
                    const barHeight = trendMax > 0 ? (m.requests / trendMax) * 100 : 0;
                    return (
                      <Box key={m.month} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                        <Tooltip title={`เดือน ${MONTHS_TH[i]}: ยืม ${m.requests} ครั้ง (อนุมัติ ${m.approved} ครั้ง)`} arrow placement="top">
                          <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
                            {m.requests > 0 && (
                              <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#b45309', alignSelf: 'center', mb: 0.5 }}>
                                {m.requests}
                              </Typography>
                            )}
                            <Box 
                              sx={{ 
                                width: '100%', 
                                borderRadius: '6px 6px 0 0', 
                                minHeight: m.requests > 0 ? 6 : 2, 
                                height: `${Math.max(barHeight, 2)}%`, 
                                background: m.requests > 0 
                                  ? 'linear-gradient(to top, #b45309, #f59e0b)' 
                                  : 'rgba(226, 232, 240, 0.5)', 
                                transition: 'all 0.4s ease-out',
                                '&:hover': {
                                  background: 'linear-gradient(to top, #92400e, #d97706)',
                                  transform: 'scaleX(1.05)',
                                  cursor: 'pointer'
                                }
                              }} 
                            />
                          </Box>
                        </Tooltip>
                        <Typography sx={{ fontSize: 10, color: '#64748b', mt: 1, fontWeight: 500 }}>
                          {MONTHS_TH[i]}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Top borrowers */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', borderRadius: '12px', border: '1px solid rgba(229,231,235,0.7)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3, color: '#1e293b' }}>
                <User size={20} color="#b45309" /> 
                10 อันดับผู้ขอยืมสูงสุด
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {topBorrowers.length > 0 ? (
                  topBorrowers.map((b, i) => (
                    <Box 
                      key={b.name} 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1.5,
                        p: 1,
                        borderRadius: '8px',
                        border: '1px solid #f8fafc',
                        '&:hover': { bgcolor: '#f8fafc' }
                      }}
                    >
                      <Typography variant="body2" fontWeight={800} color={i < 3 ? '#b45309' : '#94a3b8'} sx={{ minWidth: 20 }}>
                        #{i + 1}
                      </Typography>
                      <Typography variant="body2" sx={{ flex: 1, color: '#334155', fontWeight: i < 3 ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {b.name}
                      </Typography>
                      <Chip 
                        label={`${b.count} ครั้ง`} 
                        size="small" 
                        sx={{ 
                          fontWeight: 700,
                          bgcolor: i < 3 ? alpha('#b45309', 0.1) : '#f1f5f9',
                          color: i < 3 ? '#b45309' : '#475569'
                        }} 
                      />
                    </Box>
                  ))
                ) : (
                  <Box sx={{ py: 4, textAlign: 'center', color: '#94a3b8' }}>ไม่มีข้อมูลผู้ขอยืม</Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter */}
      <Card sx={{ mb: 3, borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', border: '1px solid rgba(229,231,235,0.6)' }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Search size={18} color="#6b7280" />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>สถานะคำขอ</InputLabel>
              <Select value={statusFilter} label="สถานะคำขอ" onChange={e => setStatusFilter(e.target.value)}>
                <MenuItem value="">ทั้งหมด</MenuItem>
                {Object.entries(statusLabels).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField 
              size="small" 
              placeholder="ค้นหาตามชื่อผู้ยืม..." 
              value={searchName} 
              onChange={e => setSearchName(e.target.value)} 
              sx={{ minWidth: 260, flexGrow: 1 }} 
            />
          </Box>
        </CardContent>
      </Card>

      {/* Table */}
      <Card sx={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', border: '1px solid rgba(229,231,235,0.7)', overflow: 'hidden' }}>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <Box sx={{ p: 2.5, borderBottom: '1px solid rgba(229,231,235,0.7)', bgcolor: '#fafafa' }}>
            <Typography variant="h6" fontWeight={700} sx={{ color: '#1e293b' }}>ประวัติการยืม-คืนทั้งหมด ({filtered.length})</Typography>
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