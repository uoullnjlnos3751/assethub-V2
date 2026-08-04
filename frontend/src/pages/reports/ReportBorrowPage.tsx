import React, { useEffect, useState, useMemo } from 'react';
import { Box, Typography, Card, CardContent, Grid, CircularProgress, Chip, TextField, MenuItem, Select, InputLabel, FormControl, Button, Tooltip, alpha, useTheme } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { borrowAPI, dashboardAPI } from '../../services/api';
import { ShoppingCart, AlertTriangle, CheckCircle2, History, Search, TrendingUp, User, Download, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ReportHeaderTabs from './ReportHeaderTabs';
import * as XLSX from 'xlsx';

const statusLabels: Record<string, string> = { Pending: 'รออนุมัติ', Approved: 'อนุมัติแล้ว', Rejected: 'ปฏิเสธ', CheckedOut: 'ส่งมอบแล้ว', PartiallyReturned: 'คืนบางส่วน', Returned: 'คืนแล้ว' };
const statusColors: Record<string, string> = { Pending: 'warning', Approved: 'info', Rejected: 'error', CheckedOut: 'primary', PartiallyReturned: 'secondary', Returned: 'success' };
const MONTHS_TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

export default function ReportBorrowPage() {
  const theme = useTheme();
  const [summary, setSummary] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [trend, setTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchName, setSearchName] = useState('');
  const [trendYear, setTrendYear] = useState(new Date().getFullYear());
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
      pdf.text('Borrow Executive Summary', 14, 20);
      pdf.setFontSize(10);
      pdf.setTextColor(100, 116, 139);
      pdf.text(`Exported Date: ${new Date().toLocaleString('th-TH')}`, 14, 28);
      pdf.addImage(imgData, 'PNG', 10, 35, pdfWidth - 20, Math.min(pdfHeight, pdf.internal.pageSize.getHeight() - 40));
      pdf.save(`Borrow_Executive_Report_${new Date().getTime()}.pdf`);
    } catch (err) {
      console.error('Failed to export PDF', err);
    } finally {
      setExportingPDF(false);
    }
  };

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
    if (statusFilter) {
      if (statusFilter === 'Overdue') {
        list = list.filter(r => {
          if (r.dueDate) return new Date(r.dueDate) < new Date() && (r.status === 'CheckedOut' || r.status === 'PartiallyReturned');
          if (r.items && r.items.length > 0) {
            return r.items.some((item: any) => new Date(item.dueDate) < new Date() && (item.status === 'CheckedOut' || item.status === 'PartiallyReturned'));
          }
          // Fallback if no item relation exists: check if request is CheckedOut but overdue count in summary is > 0
          return r.status === 'CheckedOut' && (summary?.overdue > 0);
        });
      } else {
        list = list.filter(r => r.status === statusFilter);
      }
    }
    if (searchName) { const q = searchName.toLowerCase(); list = list.filter(r => (r.requester?.displayName || r.requester?.adUsername || '').toLowerCase().includes(q)); }
    return list;
  }, [history, statusFilter, searchName, summary]);

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
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="outlined" 
            startIcon={<Download size={16} />} 
            onClick={handleExportExcel}
            sx={{
              borderColor: 'divider',
              color: 'text.secondary',
              '&:hover': { bgcolor: 'action.hover', borderColor: 'text.disabled' },
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            Export Excel
          </Button>
          <Button
            variant="contained"
            startIcon={exportingPDF ? <CircularProgress size={16} color="inherit" /> : <FileText size={16} />}
            onClick={handleExportPDF}
            disabled={exportingPDF}
            sx={{
              bgcolor: 'warning.dark',
              '&:hover': { bgcolor: 'warning.dark', filter: 'brightness(0.9)' },
              boxShadow: `0 4px 10px ${alpha(theme.palette.warning.dark, 0.15)}`,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            {exportingPDF ? 'Generating...' : 'Export PDF'}
          </Button>
        </Box>
      </Box>

      <Box id="report-content" sx={{ bgcolor: 'background.paper', borderRadius: 4, p: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: `1px solid ${theme.palette.divider}` }}>
        {/* Summary cards */}
        <Grid container spacing={2.5} sx={{ mb: 4 }}>
          <Grid item xs={6} md={3}>
            <Card 
              onClick={() => setStatusFilter(statusFilter === 'Pending' ? '' : 'Pending')}
              sx={{
                borderLeft: `4px solid ${theme.palette.warning.main}`,
                bgcolor: statusFilter === 'Pending' ? alpha(theme.palette.warning.main, 0.06) : alpha(theme.palette.warning.main, 0.01),
                cursor: 'pointer',
                transition: 'all 0.2s',
                opacity: (statusFilter === '' || statusFilter === 'Pending') ? 1 : 0.45,
                transform: statusFilter === 'Pending' ? 'scale(1.02)' : 'scale(1)',
                boxShadow: statusFilter === 'Pending' ? `0 8px 20px ${alpha(theme.palette.warning.main, 0.15)}` : 'none',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 6px 15px ${alpha(theme.palette.warning.main, 0.1)}` }
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha(theme.palette.warning.main, 0.1), color: 'warning.dark', display: 'flex' }}>
                    <ShoppingCart size={20} />
                  </Box>
                  <Typography variant="body2" color="text.secondary" fontWeight={700}>รออนุมัติ</Typography>
                </Box>
                <Typography variant="h4" fontWeight={800} color="warning.dark">{summary?.pendingApproval || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card 
              onClick={() => setStatusFilter(statusFilter === 'CheckedOut' ? '' : 'CheckedOut')}
              sx={{
                borderLeft: `4px solid ${theme.palette.primary.main}`,
                bgcolor: statusFilter === 'CheckedOut' ? alpha(theme.palette.primary.main, 0.06) : alpha(theme.palette.primary.main, 0.01),
                cursor: 'pointer',
                transition: 'all 0.2s',
                opacity: (statusFilter === '' || statusFilter === 'CheckedOut') ? 1 : 0.45,
                transform: statusFilter === 'CheckedOut' ? 'scale(1.02)' : 'scale(1)',
                boxShadow: statusFilter === 'CheckedOut' ? `0 8px 20px ${alpha(theme.palette.primary.main, 0.15)}` : 'none',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 6px 15px ${alpha(theme.palette.primary.main, 0.1)}` }
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', display: 'flex' }}>
                    <CheckCircle2 size={20} />
                  </Box>
                  <Typography variant="body2" color="text.secondary" fontWeight={700}>กำลังยืม</Typography>
                </Box>
                <Typography variant="h4" fontWeight={800} color="primary.main">{summary?.activeCheckedOut || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card 
              onClick={() => setStatusFilter(statusFilter === 'Overdue' ? '' : 'Overdue')}
              sx={{
                borderLeft: `4px solid ${theme.palette.error.main}`,
                bgcolor: statusFilter === 'Overdue' ? alpha(theme.palette.error.main, 0.06) : alpha(theme.palette.error.main, 0.01),
                cursor: 'pointer',
                transition: 'all 0.2s',
                opacity: (statusFilter === '' || statusFilter === 'Overdue') ? 1 : 0.45,
                transform: statusFilter === 'Overdue' ? 'scale(1.02)' : 'scale(1)',
                boxShadow: statusFilter === 'Overdue' ? `0 8px 20px ${alpha(theme.palette.error.main, 0.15)}` : 'none',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 6px 15px ${alpha(theme.palette.error.main, 0.1)}` }
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha(theme.palette.error.main, 0.08), color: 'error.main', display: 'flex' }}>
                    <AlertTriangle size={20} />
                  </Box>
                  <Typography variant="body2" color="text.secondary" fontWeight={700}>ยืมเกินกำหนด</Typography>
                </Box>
                <Typography variant="h4" fontWeight={800} color="error.main">{summary?.overdue || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card 
              onClick={() => setStatusFilter('')}
              sx={{ 
                borderLeft: '4px solid #7c3aed', 
                bgcolor: statusFilter === '' ? 'rgba(124,58,237,0.06)' : 'rgba(124,58,237,0.01)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                opacity: (statusFilter === '' || statusFilter === 'Pending' || statusFilter === 'CheckedOut' || statusFilter === 'Overdue') ? 1 : 0.45,
                transform: statusFilter === '' ? 'scale(1.02)' : 'scale(1)',
                boxShadow: statusFilter === '' ? '0 8px 20px rgba(124,58,237,0.15)' : 'none',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 15px rgba(124,58,237,0.1)' }
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(139,92,246,0.1)', color: '#7c3aed', display: 'flex' }}>
                    <History size={20} />
                  </Box>
                  <Typography variant="body2" color="text.secondary" fontWeight={700}>คำขอทั้งหมด</Typography>
                </Box>
                <Typography variant="h4" fontWeight={800} color="#7c3aed">{history.length}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Row: Trend chart + Top borrowers */}
        <Grid container spacing={2.5}>
          {/* Monthly trend */}
          <Grid item xs={12} md={8}>
            <Card sx={{ height: '100%', borderRadius: '12px', border: `1px solid ${theme.palette.divider}`, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                  <Typography variant="h6" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.primary' }}>
                    <TrendingUp size={20} color={theme.palette.warning.dark} />
                    แนวโน้มการขอยืมรายเดือน
                  </Typography>
                  <FormControl size="small" sx={{ minWidth: 110 }}>
                    <Select value={trendYear} onChange={e => setTrendYear(Number(e.target.value))}>
                      {[2024, 2025, 2026].map(y => <MenuItem key={y} value={y}>{y} ปี</MenuItem>)}
                    </Select>
                  </FormControl>
                </Box>

                {/* Recharts Bar Chart */}
                <Box sx={{ width: '100%', height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trend} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <XAxis dataKey="month" tickFormatter={(tick, idx) => MONTHS_TH[idx] || tick} stroke={theme.palette.text.secondary} fontSize={10} tickLine={false} />
                      <YAxis stroke={theme.palette.text.secondary} fontSize={10} tickLine={false} axisLine={false} />
                      <RechartsTooltip
                        formatter={(value: any, name: any) => [`${value} ครั้ง`, 'จำนวนการยืม']}
                        contentStyle={{ background: theme.palette.background.paper, borderRadius: 8, color: theme.palette.text.primary, border: `1px solid ${theme.palette.divider}`, fontSize: 12 }}
                        itemStyle={{ color: theme.palette.text.primary }}
                      />
                      <Bar dataKey="requests" fill={theme.palette.warning.dark} radius={[4, 4, 0, 0]}>
                        {trend.map((entry: any, index: number) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.requests > 0 ? 'url(#barGradient)' : theme.palette.divider}
                          />
                        ))}
                      </Bar>
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={theme.palette.warning.main} />
                          <stop offset="100%" stopColor={theme.palette.warning.dark} />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Top borrowers */}
          <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', borderRadius: '12px', border: `1px solid ${theme.palette.divider}`, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3, color: 'text.primary' }}>
                <User size={20} color={theme.palette.warning.dark} />
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
                        border: '1px solid transparent',
                        '&:hover': { bgcolor: 'action.hover' }
                      }}
                    >
                      <Typography variant="body2" fontWeight={800} color={i < 3 ? theme.palette.warning.dark : 'text.disabled'} sx={{ minWidth: 20 }}>
                        #{i + 1}
                      </Typography>
                      <Typography variant="body2" sx={{ flex: 1, color: 'text.primary', fontWeight: i < 3 ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {b.name}
                      </Typography>
                      <Chip
                        label={`${b.count} ครั้ง`}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          bgcolor: i < 3 ? alpha(theme.palette.warning.dark, 0.1) : 'action.hover',
                          color: i < 3 ? theme.palette.warning.dark : 'text.secondary'
                        }}
                      />
                    </Box>
                  ))
                ) : (
                  <Box sx={{ py: 4, textAlign: 'center', color: 'text.disabled' }}>ไม่มีข้อมูลผู้ขอยืม</Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>

      {/* Filter */}
      <Card sx={{ mb: 3, borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', border: `1px solid ${theme.palette.divider}` }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Search size={18} color={theme.palette.text.secondary} />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>สถานะคำขอ</InputLabel>
              <Select value={statusFilter} label="สถานะคำขอ" onChange={e => setStatusFilter(e.target.value)}>
                <MenuItem value="">ทั้งหมด</MenuItem>
                <MenuItem value="Overdue">🔴 ยืมเกินกำหนด</MenuItem>
                <hr style={{ margin: '8px 0', border: 'none', borderTop: `1px solid ${theme.palette.divider}` }} />
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
      <Card sx={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <Box sx={{ p: 2.5, borderBottom: `1px solid ${theme.palette.divider}`, bgcolor: 'action.hover' }}>
            <Typography variant="h6" fontWeight={700} sx={{ color: 'text.primary' }}>ประวัติการยืม-คืนทั้งหมด ({filtered.length})</Typography>
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
              '& .MuiDataGrid-columnHeader': { bgcolor: 'action.hover', color: 'text.secondary', fontWeight: 700 },
              '& .MuiDataGrid-cell': { borderColor: 'divider' },
              '& .MuiDataGrid-row:hover': { bgcolor: 'action.hover' }
            }}
          />
        </CardContent>
      </Card>
    </Box>
  );
}