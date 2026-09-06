import React, { useEffect, useState, useMemo } from 'react';
import { Box, Typography, Card, CardContent, Grid, CircularProgress, Chip, MenuItem, Select, FormControl, Button, TextField, InputLabel, alpha, useTheme } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { dashboardAPI, pmAPI, assetAPI } from '../../services/api';
import { Wrench, CheckCircle2, Clock, ArrowRight, FolderOpen, Building2, Download, Search, Filter, FileText, Star, AlertTriangle, ShieldAlert, Check } from 'lucide-react';
import ReportHeaderTabs from './ReportHeaderTabs';
import ProcurementPanel from './components/ProcurementPanel';
import { PieChart as ReChartsPieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';

// jspdf ~382 KB โหลดตอนกดออก PDF จริงเท่านั้น
const loadJsPdf = async () => (await import('jspdf')).default;
// html2canvas ~198 KB ใช้คู่กับ jspdf ตอนออก PDF เท่านั้น
const loadHtml2Canvas = async () => (await import('html2canvas')).default;

// xlsx ~419 KB โหลดตอนกดส่งออกจริงเท่านั้น ไม่ใช่ตอนเปิดหน้า
const loadXlsx = () => import('xlsx');

const CAT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16'];
const statusLabels: Record<string, string> = { COMPLETED: 'เสร็จสิ้น', IN_PROGRESS: 'กำลังตรวจ', DRAFT: 'รอดำเนินการ' };

export default function ReportPMPage() {
  const theme = useTheme();
  const [summary, setSummary] = useState<any>(null);
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState('');
  const [searchAsset, setSearchAsset] = useState('');
  const [searchPerformer, setSearchPerformer] = useState('');
  const [exportingPDF, setExportingPDF] = useState(false);

  /* ── ข้อเสนอจัดซื้อ ────────────────────────────────────────────────
     คนละเอกสารกับความคืบหน้า PM และคนละคนอ่าน: ความคืบหน้าเป็นเรื่องของ IT
     ส่วนข้อเสนอเป็นสิ่งที่หน่วยงานเอาไปยื่นผู้บริหาร */
  const [view, setView] = useState<'progress' | 'proposal'>('progress');
  const [proposalCompany, setProposalCompany] = useState('');
  const [proposal, setProposal] = useState<any>(null);
  const [proposalLoading, setProposalLoading] = useState(false);
  const [companyList, setCompanyList] = useState<string[]>([]);

  useEffect(() => {
    assetAPI.companyOptions()
      .then(r => setCompanyList((r.data || []).map((x: any) => (typeof x === 'string' ? x : x.name || x))))
      .catch(() => setCompanyList([]));
  }, []);

  useEffect(() => {
    if (view !== 'proposal' || !proposalCompany) return;
    setProposalLoading(true);
    pmAPI.procurementReport(proposalCompany, year)
      .then(r => setProposal(r.data))
      .catch(() => setProposal(null))
      .finally(() => setProposalLoading(false));
  }, [view, proposalCompany, year]);

  const handleExportPDF = async () => {
    try {
      setExportingPDF(true);
      const element = document.getElementById('report-content');
      if (!element) return;
      const html2canvas = await loadHtml2Canvas();
      const canvas = await html2canvas(element, { 
        scale: 3, 
        useCORS: true, 
        backgroundColor: '#ffffff',
        logging: false
      });
      const imgData = canvas.toDataURL('image/png');
      const jsPDF = await loadJsPdf();
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.setFontSize(18);
      pdf.setTextColor(15, 23, 42);
      pdf.text('PM Executive Summary', 14, 20);
      pdf.setFontSize(10);
      pdf.setTextColor(100, 116, 139);
      pdf.text(`Fiscal Year: ${year} | Exported Date: ${new Date().toLocaleString('th-TH')}`, 14, 28);
      pdf.addImage(imgData, 'PNG', 10, 35, pdfWidth - 20, Math.min(pdfHeight, pdf.internal.pageSize.getHeight() - 40));
      pdf.save(`PM_Executive_Report_${year}_${new Date().getTime()}.pdf`);
    } catch (err) {
      console.error('Failed to export PDF', err);
    } finally {
      setExportingPDF(false);
    }
  };

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
      if (statusFilter === 'REMAINING') {
        list = list.filter(r => r.status !== 'COMPLETED');
      } else {
        list = list.filter(r => r.status === statusFilter);
      }
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

  const getAnswerValue = (run: any, key: string) => {
    const ans = run.answers?.find((a: any) => (a.item?.key || a.key) === key);
    if (!ans?.value) return '';
    if (ans.value.includes('::')) return ans.value.split('::')[0];
    return ans.value;
  };

  const getAnswerNote = (run: any, key: string) => {
    const ans = run.answers?.find((a: any) => (a.item?.key || a.key) === key);
    if (!ans?.value) return '';
    if (ans.value.includes('::')) return ans.value.split('::')[1];
    return '';
  };

  const completedRuns = useMemo(() => runs.filter(r => r.status === 'COMPLETED'), [runs]);

  // 1. Satisfaction Rating
  const satisfactionStats = useMemo(() => {
    const ratings = completedRuns
      .map(r => getAnswerValue(r, 'satisfaction'))
      .filter(v => v && !isNaN(Number(v)))
      .map(Number);
    const count = ratings.length;
    const avg = count > 0 ? (ratings.reduce((a, b) => a + b, 0) / count).toFixed(1) : 'N/A';
    return { avg, count };
  }, [completedRuns]);

  // 2. Physical Condition Pie Data
  const physicalData = useMemo(() => {
    const counts = { normal: 0, minor_damage: 0, broken: 0, retired: 0 };
    completedRuns.forEach(r => {
      const val = getAnswerValue(r, 'physical_condition');
      if (val in counts) counts[val as keyof typeof counts]++;
    });
    return [
      { name: 'ปกติสมบูรณ์', value: counts.normal, color: theme.palette.success.main },
      { name: 'ชำรุดเล็กน้อย', value: counts.minor_damage, color: theme.palette.warning.light },
      { name: 'ชำรุดรอซ่อม', value: counts.broken, color: theme.palette.warning.dark },
      { name: 'หมดสภาพ', value: counts.retired, color: theme.palette.error.main }
    ].filter(d => d.value > 0);
  }, [completedRuns]);

  // 3. Speed / Performance Pie Data
  const performanceData = useMemo(() => {
    const counts = { fast: 0, slow: 0, very_slow: 0 };
    completedRuns.forEach(r => {
      const val = getAnswerValue(r, 'speed_performance');
      if (val in counts) counts[val as keyof typeof counts]++;
    });
    return [
      { name: 'เร็วปกติ', value: counts.fast, color: theme.palette.success.main },
      { name: 'เริ่มช้า/หน่วง', value: counts.slow, color: theme.palette.warning.dark },
      { name: 'ช้ามาก', value: counts.very_slow, color: theme.palette.error.main }
    ].filter(d => d.value > 0);
  }, [completedRuns]);

  // 4. Overall Check Result Pie Data
  const pmResultData = useMemo(() => {
    const counts = { passed: 0, resolved: 0, pending: 0 };
    completedRuns.forEach(r => {
      const val = getAnswerValue(r, 'pm_result');
      if (val in counts) counts[val as keyof typeof counts]++;
    });
    return [
      { name: 'ผ่านเกณฑ์มาตรฐาน', value: counts.passed, color: theme.palette.success.main },
      { name: 'แก้ไขแล้วขณะตรวจ', value: counts.resolved, color: theme.palette.primary.main },
      { name: 'ไม่ผ่าน/รอซ่อมต่อ', value: counts.pending, color: theme.palette.error.main }
    ].filter(d => d.value > 0);
  }, [completedRuns]);

  // 5. Action Items (To-Do list)
  const actionItems = useMemo(() => {
    return completedRuns.filter(r => {
      const cond = getAnswerValue(r, 'physical_condition');
      const speed = getAnswerValue(r, 'speed_performance');
      const res = getAnswerValue(r, 'pm_result');
      return cond === 'broken' || speed === 'very_slow' || res === 'pending';
    });
  }, [completedRuns]);

  // Client-side Excel Export
  const handleExportExcel = async () => {
    const XLSX = await loadXlsx();
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
          <FormControl size="small" sx={{ minWidth: 110, bgcolor: 'background.paper' }}>
            <Select value={year} onChange={e => setYear(Number(e.target.value))}>
              {[2024, 2025, 2026].map(y => <MenuItem key={y} value={y}>{y} ปี</MenuItem>)}
            </Select>
          </FormControl>
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

      <Box sx={{ display: 'flex', gap: 0.75, mb: 2, flexWrap: 'wrap', alignItems: 'center' }} className="no-print">
        {([['progress', 'ความคืบหน้า PM'], ['proposal', 'ข้อเสนอจัดซื้อ']] as const).map(([k, label]) => (
          <Button key={k} size="small" variant={view === k ? 'contained' : 'outlined'}
            onClick={() => setView(k)}
            sx={{ borderRadius: '9px', textTransform: 'none', fontWeight: 600, fontSize: 12 }}>
            {label}
          </Button>
        ))}
        {view === 'proposal' && (
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="proposal-company">บริษัทที่จะออกเอกสาร</InputLabel>
            <Select labelId="proposal-company" label="บริษัทที่จะออกเอกสาร"
              value={proposalCompany} onChange={(e) => setProposalCompany(e.target.value)}>
              {companyList.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
          </FormControl>
        )}
      </Box>

      {view === 'proposal' ? (
        <ProcurementPanel data={proposal} loading={proposalLoading} company={proposalCompany} theme={theme} />
      ) : (
        <>
      <Box id="report-content" sx={{ bgcolor: 'background.paper', borderRadius: 4, p: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: `1px solid ${theme.palette.divider}` }}>
        {/* Summary cards */}
        <Grid container spacing={2.5} sx={{ mb: 4 }}>
          <Grid item xs={6} md={3}>
            <Card 
              onClick={() => setStatusFilter('')}
              sx={{
                borderLeft: `4px solid ${theme.palette.primary.main}`,
                bgcolor: statusFilter === '' ? alpha(theme.palette.primary.main, 0.06) : alpha(theme.palette.primary.main, 0.01),
                cursor: 'pointer',
                transition: 'all 0.2s',
                opacity: (statusFilter === '' || statusFilter === 'COMPLETED' || statusFilter === 'REMAINING') ? 1 : 0.45,
                transform: statusFilter === '' ? 'scale(1.02)' : 'scale(1)',
                boxShadow: statusFilter === '' ? `0 8px 20px ${alpha(theme.palette.primary.main, 0.15)}` : 'none',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 6px 15px ${alpha(theme.palette.primary.main, 0.1)}` }
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', display: 'flex' }}>
                    <Wrench size={20} />
                  </Box>
                  <Typography variant="body2" color="text.secondary" fontWeight={700}>แผนงานทั้งหมด</Typography>
                </Box>
                <Typography variant="h4" fontWeight={800} color="primary.main">{summary?.total || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card 
              onClick={() => setStatusFilter(statusFilter === 'COMPLETED' ? '' : 'COMPLETED')}
              sx={{
                borderLeft: `4px solid ${theme.palette.success.main}`,
                bgcolor: statusFilter === 'COMPLETED' ? alpha(theme.palette.success.main, 0.06) : alpha(theme.palette.success.main, 0.01),
                cursor: 'pointer',
                transition: 'all 0.2s',
                opacity: (statusFilter === '' || statusFilter === 'COMPLETED') ? 1 : 0.45,
                transform: statusFilter === 'COMPLETED' ? 'scale(1.02)' : 'scale(1)',
                boxShadow: statusFilter === 'COMPLETED' ? `0 8px 20px ${alpha(theme.palette.success.main, 0.15)}` : 'none',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 6px 15px ${alpha(theme.palette.success.main, 0.1)}` }
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha(theme.palette.success.main, 0.1), color: 'success.dark', display: 'flex' }}>
                    <CheckCircle2 size={20} />
                  </Box>
                  <Typography variant="body2" color="text.secondary" fontWeight={700}>ดำเนินการเสร็จ</Typography>
                </Box>
                <Typography variant="h4" fontWeight={800} color="success.dark">{summary?.completed || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card 
              onClick={() => setStatusFilter(statusFilter === 'REMAINING' ? '' : 'REMAINING')}
              sx={{
                borderLeft: `4px solid ${theme.palette.warning.main}`,
                bgcolor: statusFilter === 'REMAINING' ? alpha(theme.palette.warning.main, 0.06) : alpha(theme.palette.warning.main, 0.01),
                cursor: 'pointer',
                transition: 'all 0.2s',
                opacity: (statusFilter === '' || statusFilter === 'REMAINING') ? 1 : 0.45,
                transform: statusFilter === 'REMAINING' ? 'scale(1.02)' : 'scale(1)',
                boxShadow: statusFilter === 'REMAINING' ? `0 8px 20px ${alpha(theme.palette.warning.main, 0.15)}` : 'none',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 6px 15px ${alpha(theme.palette.warning.main, 0.1)}` }
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha(theme.palette.warning.main, 0.1), color: 'warning.dark', display: 'flex' }}>
                    <Clock size={20} />
                  </Box>
                  <Typography variant="body2" color="text.secondary" fontWeight={700}>คงเหลือ</Typography>
                </Box>
                <Typography variant="h4" fontWeight={800} color="warning.dark">{summary?.remaining || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card
              sx={{
                borderLeft: `4px solid ${theme.palette.secondary.main}`,
                bgcolor: alpha(theme.palette.secondary.main, 0.03),
                opacity: 1
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha(theme.palette.secondary.main, 0.1), color: theme.palette.secondary.main, display: 'flex' }}>
                    <ArrowRight size={20} />
                  </Box>
                  <Typography variant="body2" color="text.secondary" fontWeight={700}>ความคืบหน้า</Typography>
                </Box>
                <Typography variant="h4" fontWeight={800} sx={{ color: theme.palette.secondary.main }}>{completionRate}%</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

      {/* Progress + Stats */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', borderRadius: '12px', border: `1px solid ${theme.palette.divider}`, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <Wrench size={20} color={theme.palette.warning.dark} /> สรุปความคืบหน้า PM {year}
              </Typography>
              <Box sx={{ mb: 3, mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}><Typography variant="body2" color="text.secondary">อัตราความสำเร็จ (Completion Rate)</Typography><Typography variant="body2" fontWeight={700} color="warning.dark">{completionRate}%</Typography></Box>
                <Box sx={{ height: 10, bgcolor: alpha(theme.palette.warning.main, 0.1), borderRadius: 5, overflow: 'hidden' }}>
                  <Box sx={{ height: '100%', width: `${completionRate}%`, borderRadius: 5, background: `linear-gradient(90deg, ${theme.palette.warning.dark}, ${theme.palette.warning.main})` }} />
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 3.5 }}>
                <Box sx={{ flex: 1, p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.success.main, 0.08), textAlign: 'center', border: `1px solid ${alpha(theme.palette.success.main, 0.15)}` }}><Typography variant="h5" fontWeight={800} color="success.dark">{summary?.completed || 0}</Typography><Typography variant="caption" color="text.secondary" fontWeight={600}>ตรวจเสร็จแล้ว (เครื่อง)</Typography></Box>
                <Box sx={{ flex: 1, p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.warning.main, 0.08), textAlign: 'center', border: `1px solid ${alpha(theme.palette.warning.main, 0.15)}` }}><Typography variant="h5" fontWeight={800} color="warning.dark">{summary?.remaining || 0}</Typography><Typography variant="caption" color="text.secondary" fontWeight={600}>คงเหลือ (เครื่อง)</Typography></Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`, color: '#fff', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, color: '#fbbf24' }}>
                <CheckCircle2 size={20} color="#fbbf24" /> สถิติแผนงานภาพรวม {year}
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
          <Typography variant="h6" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, color: 'text.primary' }}>
            <FolderOpen size={20} color={theme.palette.warning.dark} /> สถานะ PM แยกตามหมวดหมู่ทรัพย์สิน
          </Typography>
          <Grid container spacing={2}>
            {byCategory.map((cat: any, i: number) => {
              const pct = cat.total > 0 ? Math.round((cat.completed / cat.total) * 100) : 0;
              return (
                <Grid key={cat.name || i} item xs={6} md={4} lg={3}>
                  <Card sx={{ borderRadius: '12px', borderTop: `4px solid ${CAT_COLORS[i % CAT_COLORS.length]}`, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                    <CardContent sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        <Typography variant="body2" fontWeight={700} sx={{ color: 'text.primary' }}>{cat.icon} {cat.name}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>ตรวจเสร็จ: {cat.completed}/{cat.total}</Typography>
                        <Typography variant="caption" color={pct >= 80 ? theme.palette.success.dark : theme.palette.warning.dark} fontWeight={800}>{pct}%</Typography>
                      </Box>
                      <Box sx={{ height: 6, bgcolor: 'action.hover', borderRadius: 3, overflow: 'hidden' }}>
                        <Box sx={{ height: '100%', width: `${pct}%`, borderRadius: 3, bgcolor: pct >= 80 ? theme.palette.success.main : pct >= 50 ? theme.palette.warning.main : theme.palette.error.main }} />
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
          <Typography variant="h6" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, color: 'text.primary' }}>
            <Building2 size={20} color={theme.palette.warning.dark} /> สถานะ PM แยกตามแผนกผู้ถือครอง
          </Typography>
          <Card sx={{ borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              {byDepartment.map((dept: any, i: number) => {
                const pct = dept.total > 0 ? Math.round((dept.completed / dept.total) * 100) : 0;
                return (
                  <Box key={dept.name || i} sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 3, py: 2, borderBottom: i < byDepartment.length - 1 ? `1px solid ${theme.palette.divider}` : 'none', '&:hover': { bgcolor: 'action.hover' } }}>
                    <Typography variant="body2" fontWeight={700} sx={{ minWidth: 160, color: 'text.secondary' }}>{dept.name}</Typography>
                    <Box sx={{ flex: 1, height: 8, bgcolor: 'action.hover', borderRadius: 4, overflow: 'hidden' }}>
                      <Box sx={{ height: '100%', width: `${pct}%`, borderRadius: 4, bgcolor: pct >= 80 ? theme.palette.success.main : pct >= 50 ? theme.palette.warning.main : theme.palette.error.main }} />
                    </Box>
                    <Typography variant="caption" fontWeight={700} sx={{ minWidth: 70, textAlign: 'right', color: 'text.secondary' }}>{dept.completed}/{dept.total} เครื่อง</Typography>
                    <Typography variant="caption" fontWeight={800} color={pct >= 80 ? theme.palette.success.dark : theme.palette.warning.dark} sx={{ minWidth: 45, textAlign: 'right' }}>{pct}%</Typography>
                  </Box>
                );
              })}
            </CardContent>
          </Card>
        </Box>
      )}

      {/* 📊 ส่วนสรุปผลการประเมินและสถิติ (Evaluation & Proactive Maintenance) */}
      <Box sx={{ mt: 4, pt: 4, borderTop: `2px dashed ${theme.palette.divider}` }}>
        <Typography variant="h6" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3, color: 'text.primary' }}>
          <Star size={20} color={theme.palette.warning.dark} fill={theme.palette.warning.dark} /> ผลการประเมินและความพึงพอใจการทำ PM ({completedRuns.length} เครื่องที่เสร็จสิ้น)
        </Typography>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Satisfaction Card */}
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', borderRadius: '12px', border: `1px solid ${theme.palette.divider}`, boxShadow: '0 4px 12px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'center', p: 1 }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary" fontWeight={700} gutterBottom>ความพึงพอใจจากผู้ใช้เฉลี่ย</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, my: 1.5 }}>
                  <Star size={36} color={theme.palette.warning.main} fill={theme.palette.warning.main} />
                  <Typography variant="h3" fontWeight={800} color="text.primary">{satisfactionStats.avg}</Typography>
                  <Typography variant="h6" color="text.secondary" sx={{ pt: 1.5 }}>/ 5.0</Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  ประเมินแล้วทั้งหมด {satisfactionStats.count} เครื่อง
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Action Items Count Card */}
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', borderRadius: '12px', border: `1px solid ${theme.palette.divider}`, boxShadow: '0 4px 12px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'center', p: 1 }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary" fontWeight={700} gutterBottom>พบเครื่องทำงานช้า/ชำรุดรอซ่อม</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, my: 1.5 }}>
                  <AlertTriangle size={36} color={theme.palette.warning.dark} />
                  <Typography variant="h3" fontWeight={800} color="warning.dark">{actionItems.length}</Typography>
                  <Typography variant="h6" color="text.secondary" sx={{ pt: 1.5 }}>เครื่อง</Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  คิดเป็น {completedRuns.length ? Math.round((actionItems.length / completedRuns.length) * 100) : 0}% ของเครื่องที่ตรวจแล้ว
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Average Passed Rate */}
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', borderRadius: '12px', border: `1px solid ${theme.palette.divider}`, boxShadow: '0 4px 12px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'center', p: 1 }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary" fontWeight={700} gutterBottom>อัตราผ่านเกณฑ์มาตรฐานทันที</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, my: 1.5 }}>
                  <ShieldAlert size={36} color={theme.palette.success.main} />
                  <Typography variant="h3" fontWeight={800} color="success.main">
                    {completedRuns.length ? Math.round(((completedRuns.filter(r => getAnswerValue(r, 'pm_result') === 'passed').length) / completedRuns.length) * 100) : 0}
                  </Typography>
                  <Typography variant="h5" color="success.main" sx={{ pt: 1 }}>%</Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  ผ่านเกณฑ์มาตรฐาน ไม่ต้องแก้ไขหรือซ่อมต่อ
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Charts Row */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Chart 1: Physical Condition */}
          <Grid item xs={12} md={4}>
            <Card sx={{ borderRadius: '12px', border: `1px solid ${theme.palette.divider}`, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="body2" fontWeight={700} sx={{ mb: 2, textAlign: 'center', color: 'text.secondary' }}>สภาพภายนอกอุปกรณ์</Typography>
                <Box sx={{ height: 180, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  {physicalData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <ReChartsPieChart>
                        <Pie data={physicalData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={3}>
                          {physicalData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip formatter={(v) => [`${v} เครื่อง`, 'จำนวน']} />
                      </ReChartsPieChart>
                    </ResponsiveContainer>
                  ) : (
                    <Typography variant="caption" color="text.secondary">ไม่มีข้อมูลการประเมิน</Typography>
                  )}
                </Box>
                {/* Custom Legend */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 1.5, mt: 1 }}>
                  {physicalData.map((d, idx) => (
                    <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: d.color }} />
                      <Typography style={{ fontSize: 10, color: theme.palette.text.secondary, fontWeight: 600 }}>{d.name} ({d.value})</Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Chart 2: Performance Speed */}
          <Grid item xs={12} md={4}>
            <Card sx={{ borderRadius: '12px', border: `1px solid ${theme.palette.divider}`, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="body2" fontWeight={700} sx={{ mb: 2, textAlign: 'center', color: 'text.secondary' }}>ประสิทธิภาพความเร็วคอมพิวเตอร์</Typography>
                <Box sx={{ height: 180, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  {performanceData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <ReChartsPieChart>
                        <Pie data={performanceData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={3}>
                          {performanceData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip formatter={(v) => [`${v} เครื่อง`, 'จำนวน']} />
                      </ReChartsPieChart>
                    </ResponsiveContainer>
                  ) : (
                    <Typography variant="caption" color="text.secondary">ไม่มีข้อมูลการประเมิน</Typography>
                  )}
                </Box>
                {/* Custom Legend */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 1.5, mt: 1 }}>
                  {performanceData.map((d, idx) => (
                    <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: d.color }} />
                      <Typography style={{ fontSize: 10, color: theme.palette.text.secondary, fontWeight: 600 }}>{d.name} ({d.value})</Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Chart 3: PM Result status */}
          <Grid item xs={12} md={4}>
            <Card sx={{ borderRadius: '12px', border: `1px solid ${theme.palette.divider}`, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="body2" fontWeight={700} sx={{ mb: 2, textAlign: 'center', color: 'text.secondary' }}>สรุปผลการตรวจสอบ PM</Typography>
                <Box sx={{ height: 180, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  {pmResultData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <ReChartsPieChart>
                        <Pie data={pmResultData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={3}>
                          {pmResultData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip formatter={(v) => [`${v} เครื่อง`, 'จำนวน']} />
                      </ReChartsPieChart>
                    </ResponsiveContainer>
                  ) : (
                    <Typography variant="caption" color="text.secondary">ไม่มีข้อมูลการประเมิน</Typography>
                  )}
                </Box>
                {/* Custom Legend */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 1.5, mt: 1 }}>
                  {pmResultData.map((d, idx) => (
                    <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: d.color }} />
                      <Typography style={{ fontSize: 10, color: theme.palette.text.secondary, fontWeight: 600 }}>{d.name} ({d.value})</Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Action Items List (To-Do list) */}
        {actionItems.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="body2" fontWeight={700} sx={{ mb: 1.5, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1 }}>
              <AlertTriangle size={16} color={theme.palette.warning.dark} /> คอมพิวเตอร์ที่พบข้อบกพร่อง/ต้องซ่อมบำรุงเชิงรุกต่อ ({actionItems.length} เครื่อง)
            </Typography>
            <Card sx={{ border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`, borderRadius: '8px', overflow: 'hidden' }}>
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: alpha(theme.palette.error.main, 0.08), borderBottom: `1px solid ${alpha(theme.palette.error.main, 0.2)}`, color: theme.palette.error.dark, fontWeight: 700 }}>
                      <th style={{ padding: '10px 16px', textAlign: 'left' }}>รหัสทรัพย์สิน</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left' }}>แบรนด์/รุ่น</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left' }}>แผนก</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left' }}>อาการ/สภาพที่พบ</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left' }}>ข้อเสนอแนะของช่าง</th>
                    </tr>
                  </thead>
                  <tbody>
                    {actionItems.map((r, idx) => {
                      const cond = getAnswerValue(r, 'physical_condition');
                      const speed = getAnswerValue(r, 'speed_performance');
                      const res = getAnswerValue(r, 'pm_result');
                      const note = getAnswerValue(r, 'issue_note') || '-';
                      
                      let issues = [];
                      if (cond === 'broken') issues.push('❌ ชำรุดรอซ่อม');
                      else if (cond === 'minor_damage') issues.push('⚠ ชำรุดเล็กน้อย');
                      else if (cond === 'retired') issues.push('☠ ควรจำหน่ายออก');

                      if (speed === 'very_slow') issues.push('⚡ ช้ามาก');
                      else if (speed === 'slow') issues.push('⚡ เริ่มหน่วง');

                      if (res === 'pending') issues.push('⚙ รอดำเนินการแก้ไข');

                      return (
                        <tr key={r.id} style={{ borderBottom: idx < actionItems.length - 1 ? `1px solid ${theme.palette.divider}` : 'none', background: idx % 2 === 0 ? theme.palette.background.paper : theme.palette.action.hover }}>
                          <td style={{ padding: '10px 16px', color: theme.palette.text.primary, fontWeight: 600 }}>
                            <a href={`/inventory?search=${r.asset?.assetCode}`} style={{ color: theme.palette.warning.dark, textDecoration: 'none', fontWeight: 700 }}>
                              {r.asset?.assetCode || '-'}
                            </a>
                          </td>
                          <td style={{ padding: '10px 16px', color: theme.palette.text.secondary }}>{r.asset?.brand || ''} {r.asset?.model || ''}</td>
                          <td style={{ padding: '10px 16px', color: theme.palette.text.secondary }}>{r.asset?.departmentId || '-'}</td>
                          <td style={{ padding: '10px 16px' }}>
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                              {issues.map((iss, i) => (
                                <span key={i} style={{ padding: '2px 6px', borderRadius: 4, background: alpha(theme.palette.error.main, 0.08), border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`, color: theme.palette.error.main, fontSize: 10, fontWeight: 600 }}>
                                  {iss}
                                </span>
                              ))}
                            </Box>
                          </td>
                          <td style={{ padding: '10px 16px', color: theme.palette.text.secondary, fontStyle: note !== '-' ? 'italic' : 'normal' }}>
                            {note}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Box>
            </Card>
          </Box>
        )}
      </Box>

      </Box>

      {/* Filter Section for PM Runs Table */}
      <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: 'text.primary' }}>
        รายละเอียดรายการตรวจนับ PM ทั้งหมด
      </Typography>

      <Card sx={{ mb: 3, borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', border: `1px solid ${theme.palette.divider}` }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Filter size={18} color={theme.palette.text.secondary} />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>สถานะ PM</InputLabel>
              <Select value={statusFilter} label="สถานะ PM" onChange={e => setStatusFilter(e.target.value)}>
                <MenuItem value="">ทั้งหมด</MenuItem>
                <MenuItem value="REMAINING">🟠 คงเหลือที่ต้องตรวจ</MenuItem>
                <hr style={{ margin: '8px 0', border: 'none', borderTop: `1px solid ${theme.palette.divider}` }} />
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
      <Card sx={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <Box sx={{ p: 2.5, borderBottom: `1px solid ${theme.palette.divider}`, bgcolor: 'action.hover', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight={700} sx={{ color: 'text.primary' }}>
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
              '& .MuiDataGrid-columnHeader': { bgcolor: 'action.hover', color: 'text.secondary', fontWeight: 700 },
              '& .MuiDataGrid-cell': { borderColor: 'divider' },
              '& .MuiDataGrid-row:hover': { bgcolor: 'action.hover' }
            }}
          />
        </CardContent>
      </Card>
        </>
      )}
    </Box>
  );
}