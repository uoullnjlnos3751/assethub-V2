import React, { useEffect, useState, useMemo } from 'react';
import { Box, Typography, Card, CardContent, Grid, CircularProgress, Chip, MenuItem, Select, FormControl, Button, TextField, InputLabel, alpha } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { dashboardAPI, pmAPI } from '../../services/api';
import { Wrench, CheckCircle2, Clock, ArrowRight, FolderOpen, Building2, Download, Search, Filter } from 'lucide-react';
import ReportHeaderTabs from './ReportHeaderTabs';
import * as XLSX from 'xlsx';

const CAT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16'];
const statusLabels: Record<string, string> = { COMPLETED: 'เสร็จสิ้น', IN_PROGRESS: 'กำลังตรวจ', DRAFT: 'รอดำเนินการ' };

export default function ReportPMPage() {
  const [summary, setSummary] = useState<any>(null);
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState('');
  const [searchAsset, setSearchAsset] = useState('');
  const [searchPerformer, setSearchPerformer] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      dashboardAPI.pmSummary(year),
      pmAPI.runs({ limit: 10000 })
    ])
      .then(([sumRes, runsRes]) => {
        setSummary(sumRes.data);
        // Filter runs by the selected year
        const allRuns = runsRes.data || [];
        setRuns(allRuns.filter((r: any) => r.year === year));
      })
      .finally(() => setLoading(false));
  }, [year]);

  // Client-side filtering of PM Runs
  const filteredRuns = useMemo(() => {
    let list = runs;
    
    if (statusFilter) {
      list = list.filter(r => r.status === statusFilter);
    }
    
    if (searchAsset) {
      const q = searchAsset.toLowerCase();
      list = list.filter(r => 
        (r.asset?.assetCode || '').toLowerCase().includes(q) || 
        (r.asset?.serialNo || '').toLowerCase().includes(q) || 
        (r.asset?.brand || '').toLowerCase().includes(q) || 
        (r.asset?.model || '').toLowerCase().includes(q)
      );
    }
    
    if (searchPerformer) {
      const q = searchPerformer.toLowerCase();
      list = list.filter(r => (r.performer?.displayName || '').toLowerCase().includes(q));
    }
    
    return list;
  }, [runs, statusFilter, searchAsset, searchPerformer]);

  // Client-side Excel Export
  const handleExportExcel = () => {
    const exportData = filteredRuns.map(row => ({
      'ปีงบประมาณ': row.year || '-',
      'แผน PM': row.plan?.deptTask || '-',
      'สถานที่ (Site)': row.plan?.site || '-',
      'รหัสทรัพย์สิน': row.asset?.assetCode || '-',
      'Serial No.': row.asset?.serialNo || '-',
      'ยี่ห้อ': row.asset?.brand || '-',
      'รุ่น': row.asset?.model || '-',
      'แผนก': row.asset?.departmentId || '-',
      'ผู้ตรวจ PM': row.performer?.displayName || '-',
      'สถานะ': row.status === 'COMPLETED' ? 'เสร็จสิ้น' : row.status === 'IN_PROGRESS' ? 'กำลังตรวจ' : 'รอดำเนินการ',
      'วันที่เริ่มตรวจ': row.performedAt ? new Date(row.performedAt).toLocaleString('th-TH') : '-',
      'วันที่ตรวจเสร็จ': row.completedAt ? new Date(row.completedAt).toLocaleString('th-TH') : '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'รายงานแผนงาน PM');
    
    const maxProps = [
      { wch: 12 }, { wch: 20 }, { wch: 15 }, { wch: 18 }, { wch: 18 },
      { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 20 }, { wch: 15 },
      { wch: 20 }, { wch: 20 }
    ];
    worksheet['!cols'] = maxProps;

    XLSX.writeFile(workbook, `pm_report_${year}.xlsx`);
  };

  const columns: GridColDef[] = [
    { field: 'assetCode', headerName: 'รหัสทรัพย์สิน', width: 140, valueGetter: (_v, row) => row.asset?.assetCode || '-' },
    { field: 'serialNo', headerName: 'Serial No.', width: 140, valueGetter: (_v, row) => row.asset?.serialNo || '-' },
    { field: 'type', headerName: 'ประเภท', width: 110, valueGetter: (_v, row) => row.asset?.type || '-' },
    { field: 'brand', headerName: 'ยี่ห้อ/รุ่น', width: 160, valueGetter: (_v, row) => `${row.asset?.brand || ''} ${row.asset?.model || ''}`.trim() || '-' },
    { field: 'departmentId', headerName: 'แผนก', width: 110, valueGetter: (_v, row) => row.asset?.departmentId || '-' },
    { field: 'performer', headerName: 'ผู้ตรวจ PM', width: 150, valueGetter: (_v, row) => row.performer?.displayName || '-' },
    { field: 'status', headerName: 'สถานะ', width: 130, renderCell: ({ value }) => {
        const label = value === 'COMPLETED' ? 'เสร็จสิ้น' : value === 'IN_PROGRESS' ? 'กำลังตรวจ' : 'รอดำเนินการ';
        const color = value === 'COMPLETED' ? 'success' : value === 'IN_PROGRESS' ? 'warning' : 'default';
        return <Chip label={label} color={color as any} size="small" />;
      }
    },
    { field: 'completedAt', headerName: 'วันที่ทำเสร็จ', width: 160, valueFormatter: (v) => v ? new Date(v).toLocaleString('th-TH') : '-' },
  ];

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><CircularProgress /></Box>;

  const completionRate = summary?.total ? Math.round((summary.completed / summary.total) * 100) : 0;
  const byCategory = summary?.byCategory || [];
  const byDepartment = summary?.byDepartment || [];

  return (
    <Box sx={{ pb: 4 }}>
      {/* Navigation Tabs */}
      <ReportHeaderTabs />

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>รายงาน PM</Typography>
          <Typography variant="body2" color="text.secondary">สรุปผลการตรวจนับและบำรุงรักษาทรัพย์สินประจำปี</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 110 }}>
            <Select value={year} onChange={e => setYear(Number(e.target.value))}>
              {[2024, 2025, 2026].map(y => <MenuItem key={y} value={y}>{y} ปี</MenuItem>)}
            </Select>
          </FormControl>
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
      </Box>

      {/* Summary cards */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        <Grid item xs={6} md={3}>
          <Card sx={{ borderLeft: '2px solid #4f46e5', bgcolor: 'rgba(79,70,229,0.02)' }}><CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}><Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(99,102,241,0.1)', color: '#4f46e5', display: 'flex' }}><Wrench size={20} /></Box><Typography variant="body2" color="text.secondary" fontWeight={600}>แผนงานทั้งหมด</Typography></Box>
            <Typography variant="h4" fontWeight={800}>{summary?.total || 0}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ borderLeft: '2px solid #10b981', bgcolor: 'rgba(16,185,129,0.02)' }}><CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}><Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(16,185,129,0.1)', color: '#059669', display: 'flex' }}><CheckCircle2 size={20} /></Box><Typography variant="body2" color="text.secondary" fontWeight={600}>ดำเนินการเสร็จ</Typography></Box>
            <Typography variant="h4" fontWeight={800}>{summary?.completed || 0}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ borderLeft: '2px solid #f59e0b', bgcolor: 'rgba(245,158,11,0.02)' }}><CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}><Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(245,158,11,0.1)', color: '#d97706', display: 'flex' }}><Clock size={20} /></Box><Typography variant="body2" color="text.secondary" fontWeight={600}>คงเหลือ</Typography></Box>
            <Typography variant="h4" fontWeight={800}>{summary?.remaining || 0}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ borderLeft: '2px solid #7c3aed', bgcolor: 'rgba(124,58,237,0.02)' }}><CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}><Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(139,92,246,0.1)', color: '#7c3aed', display: 'flex' }}><ArrowRight size={20} /></Box><Typography variant="body2" color="text.secondary" fontWeight={600}>ความคืบหน้า</Typography></Box>
            <Typography variant="h4" fontWeight={800}>{completionRate}%</Typography>
          </CardContent></Card>
        </Grid>
      </Grid>

      {/* Progress + Stats */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', borderRadius: '12px', border: '1px solid rgba(229,231,235,0.7)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <Wrench size={20} color="#b45309" /> สรุปความคืบหน้า PM {year}
              </Typography>
              <Box sx={{ mb: 3, mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}><Typography variant="body2" color="text.secondary">อัตราความสำเร็จ (Completion Rate)</Typography><Typography variant="body2" fontWeight={700} color="#b45309">{completionRate}%</Typography></Box>
                <Box sx={{ height: 10, bgcolor: 'rgba(99,102,241,0.1)', borderRadius: 5, overflow: 'hidden' }}>
                  <Box sx={{ height: '100%', width: `${completionRate}%`, borderRadius: 5, background: 'linear-gradient(90deg, #b45309, #f59e0b)' }} />
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 3.5 }}>
                <Box sx={{ flex: 1, p: 2, borderRadius: 2, bgcolor: 'rgba(16,185,129,0.08)', textAlign: 'center', border: '1px solid rgba(16,185,129,0.15)' }}><Typography variant="h5" fontWeight={800} color="#059669">{summary?.completed || 0}</Typography><Typography variant="caption" color="text.secondary" fontWeight={600}>ตรวจเสร็จแล้ว (เครื่อง)</Typography></Box>
                <Box sx={{ flex: 1, p: 2, borderRadius: 2, bgcolor: 'rgba(245,158,11,0.08)', textAlign: 'center', border: '1px solid rgba(245,158,11,0.15)' }}><Typography variant="h5" fontWeight={800} color="#d97706">{summary?.remaining || 0}</Typography><Typography variant="caption" color="text.secondary" fontWeight={600}>คงเหลือ (เครื่อง)</Typography></Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', bgcolor: '#1e293b', color: 'white', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, color: '#f59e0b' }}>
                <CheckCircle2 size={20} color="#f59e0b" /> สถิติแผนงานภาพรวม {year}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, px: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <Typography variant="body2">โควตาแผนงานรวม</Typography><Typography variant="h6" fontWeight={800}>{summary?.total || 0}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, px: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <Typography variant="body2">ดำเนินการเสร็จ</Typography><Typography variant="h6" fontWeight={800} color="#34d399">{summary?.completed || 0}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, px: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <Typography variant="body2">คงเหลือที่ต้องตรวจ</Typography><Typography variant="h6" fontWeight={800} color="#fbbf24">{summary?.remaining || 0}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Breakdown by category */}
      {byCategory.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, color: '#1e293b' }}>
            <FolderOpen size={20} color="#b45309" /> สถานะ PM แยกตามหมวดหมู่ทรัพย์สิน
          </Typography>
          <Grid container spacing={2}>
            {byCategory.map((cat: any, i: number) => {
              const pct = cat.total > 0 ? Math.round((cat.completed / cat.total) * 100) : 0;
              return (
                <Grid key={cat.name || i} item xs={6} md={4} lg={3}>
                  <Card sx={{ borderRadius: '12px', borderTop: `4px solid ${CAT_COLORS[i % CAT_COLORS.length]}`, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                    <CardContent sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        <Typography variant="body2" fontWeight={700} sx={{ color: '#334155' }}>{cat.icon} {cat.name}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>ตรวจเสร็จ: {cat.completed}/{cat.total}</Typography>
                        <Typography variant="caption" color={pct >= 80 ? '#059669' : '#d97706'} fontWeight={800}>{pct}%</Typography>
                      </Box>
                      <Box sx={{ height: 6, bgcolor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                        <Box sx={{ height: '100%', width: `${pct}%`, borderRadius: 3, bgcolor: pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444' }} />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      {/* Breakdown by department */}
      {byDepartment.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, color: '#1e293b' }}>
            <Building2 size={20} color="#b45309" /> สถานะ PM แยกตามแผนกผู้ถือครอง
          </Typography>
          <Card sx={{ borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', border: '1px solid rgba(229,231,235,0.7)', overflow: 'hidden' }}>
            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              {byDepartment.map((dept: any, i: number) => {
                const pct = dept.total > 0 ? Math.round((dept.completed / dept.total) * 100) : 0;
                return (
                  <Box key={dept.name || i} sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 3, py: 2, borderBottom: i < byDepartment.length - 1 ? '1px solid #f1f5f9' : 'none', '&:hover': { bgcolor: '#f8fafc' } }}>
                    <Typography variant="body2" fontWeight={700} sx={{ minWidth: 160, color: '#475569' }}>{dept.name}</Typography>
                    <Box sx={{ flex: 1, height: 8, bgcolor: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                      <Box sx={{ height: '100%', width: `${pct}%`, borderRadius: 4, bgcolor: pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444', transition: 'width 0.5s' }} />
                    </Box>
                    <Typography variant="caption" fontWeight={700} sx={{ minWidth: 70, textAlign: 'right', color: '#64748b' }}>{dept.completed}/{dept.total} เครื่อง</Typography>
                    <Typography variant="caption" fontWeight={800} color={pct >= 80 ? '#059669' : '#d97706'} sx={{ minWidth: 45, textAlign: 'right' }}>{pct}%</Typography>
                  </Box>
                );
              })}
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Filter Section for PM Runs Table */}
      <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: '#1e293b' }}>
        รายละเอียดรายการตรวจนับ PM ทั้งหมด
      </Typography>
      
      <Card sx={{ mb: 3, borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', border: '1px solid rgba(229,231,235,0.6)' }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Filter size={18} color="#6b7280" />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>สถานะ PM</InputLabel>
              <Select value={statusFilter} label="สถานะ PM" onChange={e => setStatusFilter(e.target.value)}>
                <MenuItem value="">ทั้งหมด</MenuItem>
                {Object.entries(statusLabels).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField 
              size="small" 
              placeholder="ค้นหาด้วยรหัสทรัพย์สิน, Serial, แบรนด์..." 
              value={searchAsset} 
              onChange={e => setSearchAsset(e.target.value)} 
              sx={{ minWidth: 260, flexGrow: 1 }} 
            />
            <TextField 
              size="small" 
              placeholder="ค้นหาชื่อผู้ตรวจ..." 
              value={searchPerformer} 
              onChange={e => setSearchPerformer(e.target.value)} 
              sx={{ minWidth: 200 }} 
            />
          </Box>
        </CardContent>
      </Card>

      {/* Table Section */}
      <Card sx={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', border: '1px solid rgba(229,231,235,0.7)', overflow: 'hidden' }}>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <Box sx={{ p: 2.5, borderBottom: '1px solid rgba(229,231,235,0.7)', bgcolor: '#fafafa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight={700} sx={{ color: '#1e293b' }}>
              รายการตรวจสอบ PM ของปี {year} ({filteredRuns.length})
            </Typography>
          </Box>
          <DataGrid
            rows={filteredRuns}
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