import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  IconButton,
  TextField,
  Select,
  MenuItem,
  Card,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  ToggleButtonGroup,
  ToggleButton,
  Snackbar,
  Alert,
  GlobalStyles,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PrintIcon from '@mui/icons-material/Print';
import BarChartIcon from '@mui/icons-material/BarChart';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import EventIcon from '@mui/icons-material/Event';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import BusinessIcon from '@mui/icons-material/Business';
import CorporateFareIcon from '@mui/icons-material/CorporateFare';
import FolderIcon from '@mui/icons-material/Folder';
import ComputerIcon from '@mui/icons-material/Computer';
import ChevronRightRotateIcon from '@mui/icons-material/ChevronRight';
import * as XLSX from 'xlsx';
import { pmAPI } from '../../services/api';
import { formatDate } from '../../utils/dateUtils';

// Helper to format date
function fmtDate(d: string | Date | null) {
  if (!d) return '—';
  return formatDate(d);
}

// Get Monday of the week for a given date
function getMonday(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  return new Date(date.setDate(diff));
}

// Get calendar week number of the year
function getCalendarWeek(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return weekNo;
}

// Format date to Thai month short
function formatThaiMonthDay(date: Date) {
  const day = date.getDate();
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  return `${day} ${months[date.getMonth()]}`;
}

const PRINT_STYLES = {
  '@media print': {
    'body': { background: '#fff', color: '#000' },
    '.pms-root': { padding: '0 !important', margin: '0 !important', width: '100% !important' },
    '.no-print': { display: 'none !important' },
    '.pms-card': { border: 'none !important', boxShadow: 'none !important', marginBottom: '0 !important' },
    '.gantt-table': { width: '100% !important', border: '1px solid #000 !important' },
    '.gantt-table th, .gantt-table td': { border: '1px solid #000 !important', color: '#000 !important' },
    'header, nav, aside, footer, .sidebar, .topbar': { display: 'none !important' },
    'body *': { visibility: 'hidden' },
    '.pms-root, .pms-root *': { visibility: 'visible' },
    '.pms-root ~ .pms-root': { display: 'none' },
  },
};

export default function PMSchedulePage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear()); // Default to current year

  // Interactive filters
  const [pmStartDate, setPmStartDate] = useState<string>('');
  const [selectedLead, setSelectedLead] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [timeOffset, setTimeOffset] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('weekly');
  const [showAdhoc, setShowAdhoc] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'IN_PROGRESS' | 'PENDING'>('ALL');
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('ALL');

  // Group Expanded State — default all collapsed
  const [expandedSites, setExpandedSites] = useState<Record<string, boolean>>({});

  // Export / Feedback states
  const [toast, setToast] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    setLoading(true);
    pmAPI.dashboard({ year: selectedYear })
      .then(res => {
        const plansList = res.data?.plans || [];
        setPlans(plansList);

        // Default all collapsed
        setExpandedSites({});

        // Find earliest start date to default PM Start Date
        const validPlans = plansList.filter((p: any) => p.startDate && new Date(p.startDate).getFullYear() === selectedYear);
        if (validPlans.length > 0) {
          const minTime = Math.min(...validPlans.map((p: any) => new Date(p.startDate).getTime()));
          const minDateStr = new Date(minTime).toISOString().split('T')[0];
          setPmStartDate(minDateStr);
        } else {
          setPmStartDate(`${selectedYear}-01-01`);
        }
        setTimeOffset(0);
      })
      .catch(err => console.error('Error fetching PM plans:', err))
      .finally(() => setLoading(false));
  }, [selectedYear]);

  // Filter plans by selected Lead, Search Term, Status, Company, and Ad-hoc toggle
  const filteredPlans = plans.filter(p => {
    if (!showAdhoc && p.isAdhoc) return false;
    const matchesLead = selectedLead === 'ALL' || p.lead === selectedLead;
    const label = p.deptTask || '';
    const matchesSearch = label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (p.site || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (p.company || '').toLowerCase().includes(searchTerm.toLowerCase());

    // Status filter
    const pct = p.plannedDeviceCount > 0 ? (p.completedCount || 0) / p.plannedDeviceCount * 100 : 0;
    let matchesStatus = true;
    if (statusFilter === 'COMPLETED') matchesStatus = pct >= 100;
    else if (statusFilter === 'IN_PROGRESS') matchesStatus = pct > 0 && pct < 100;
    else if (statusFilter === 'PENDING') matchesStatus = pct === 0;

    // Company filter
    const matchesCompany = selectedCompanyFilter === 'ALL' || p.company === selectedCompanyFilter;

    return matchesLead && matchesSearch && matchesStatus && matchesCompany;
  });

  // Unique companies for filter dropdown
  const uniqueCompanies = Array.from(new Set(plans.map((p: any) => p.company).filter(Boolean))) as string[];

  // Grouping filtered plans by Company (Site)
  const groupedPlans = useMemo(() => {
    const groups: Record<string, {
      site: string;
      plans: any[];
      totalPlanned: number;
      totalCompleted: number;
      startDate: Date | null;
      endDate: Date | null;
      lead: string;
    }> = {};

    filteredPlans.forEach(plan => {
      const siteKey = [plan.company, plan.site].filter(Boolean).join(' - ') || 'ทั่วไป';
      if (!groups[siteKey]) {
        groups[siteKey] = {
          site: siteKey,
          plans: [],
          totalPlanned: 0,
          totalCompleted: 0,
          startDate: null,
          endDate: null,
          lead: plan.lead || 'ไม่ระบุ'
        };
      }

      groups[siteKey].plans.push(plan);
      groups[siteKey].totalPlanned += plan.plannedDeviceCount || 0;
      groups[siteKey].totalCompleted += plan.completedCount || 0;

      if (plan.startDate) {
        const pStart = new Date(plan.startDate);
        if (!groups[siteKey].startDate || pStart < groups[siteKey].startDate) {
          groups[siteKey].startDate = pStart;
        }
      }
      if (plan.endDate) {
        const pEnd = new Date(plan.endDate);
        if (!groups[siteKey].endDate || pEnd > groups[siteKey].endDate) {
          groups[siteKey].endDate = pEnd;
        }
      }
    });

    return Object.values(groups).sort((a, b) => a.site.localeCompare(b.site));
  }, [filteredPlans]);

  // Toggle Collapse / Expand
  const toggleSite = (siteName: string) => {
    setExpandedSites(prev => ({
      ...prev,
      [siteName]: !prev[siteName]
    }));
  };

  // Collapse All / Expand All
  const collapseAll = () => setExpandedSites({});
  const expandAll = () => {
    const expanded: Record<string, boolean> = {};
    groupedPlans.forEach(g => { expanded[g.site] = true; });
    setExpandedSites(expanded);
  };

  // Unique leads list for the dropdown
  const uniqueLeads = Array.from(new Set(plans.map((p: any) => p.lead).filter(Boolean))) as string[];

  // Calculate total machines and completed machines overall
  const totalPlanned = filteredPlans.reduce((sum, p) => sum + (p.plannedDeviceCount || 0), 0);
  const totalCompleted = filteredPlans.reduce((sum, p) => sum + (p.completedCount || 0), 0);
  const overallPct = totalPlanned > 0 ? Math.round(totalCompleted / totalPlanned * 100) : 0;

  // Status counts for cards
  const completedPlansCount = filteredPlans.filter(p => {
    const pct = p.plannedDeviceCount > 0 ? (p.completedCount || 0) / p.plannedDeviceCount * 100 : 0;
    return pct >= 100;
  }).length;
  const activePlansCount = filteredPlans.filter(p => {
    const pct = p.plannedDeviceCount > 0 ? (p.completedCount || 0) / p.plannedDeviceCount * 100 : 0;
    return pct > 0 && pct < 100;
  }).length;
  const pendingPlansCount = filteredPlans.filter(p => {
    const pct = p.plannedDeviceCount > 0 ? (p.completedCount || 0) / p.plannedDeviceCount * 100 : 0;
    return pct === 0;
  }).length;

  // Generate columns based on view mode
  const generateColumns = () => {
    const cols = [];
    const baseDate = pmStartDate ? new Date(pmStartDate) : new Date();

    if (viewMode === 'weekly') {
      baseDate.setDate(baseDate.getDate() + (timeOffset * 7));
      let current = getMonday(baseDate);
      for (let i = 0; i < 12; i++) {
        const next = new Date(current);
        next.setDate(current.getDate() + 6);
        next.setHours(23, 59, 59, 999);
        cols.push({
          start: new Date(current),
          end: next,
          label: `W${getCalendarWeek(current)}`,
          subLabel: formatThaiMonthDay(current),
        });
        current.setDate(current.getDate() + 7);
      }
    } else {
      // Daily mode
      baseDate.setDate(baseDate.getDate() + timeOffset);
      let current = new Date(baseDate);
      current.setHours(0, 0, 0, 0);
      for (let i = 0; i < 21; i++) {
        const next = new Date(current);
        next.setHours(23, 59, 59, 999);
        cols.push({
          start: new Date(current),
          end: next,
          label: current.getDate().toString(),
          subLabel: formatThaiMonthDay(current),
          isWeekend: current.getDay() === 0 || current.getDay() === 6
        });
        current.setDate(current.getDate() + 1);
      }
    }
    return cols;
  };

  const columns = generateColumns();

  const getProgressColor = (pct: number): 'success' | 'info' | 'warning' | 'error' => {
    if (pct >= 100) return 'success';
    if (pct >= 50) return 'info';
    if (pct >= 20) return 'warning';
    return 'error';
  };

  const isTodayInCol = (col: any) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(col.start);
    start.setHours(0, 0, 0, 0);
    const end = new Date(col.end);
    end.setHours(23, 59, 59, 999);
    return today >= start && today <= end;
  };

  // Render Gantt Chart Cell (Continuous blocks logic)
  const renderGanttCell = (plan: any, col: any, pct: number, isHeaderRow: boolean = false) => {
    const isToday = isTodayInCol(col);
    const startVal = plan.startDate ? new Date(plan.startDate) : null;
    const endVal = plan.endDate ? new Date(plan.endDate) : null;

    const hasBar = startVal && endVal && startVal <= col.end && endVal >= col.start;

    const barColor: 'success' | 'info' | 'warning' = pct >= 100 ? 'success' : pct > 0 ? 'info' : 'warning';

    return (
      <TableCell
        key={col.start.getTime()}
        sx={{
          p: hasBar ? '8px 0px' : '12px 14px',
          verticalAlign: 'middle',
          position: 'relative',
          bgcolor: (t) => isToday ? alpha(t.palette.error.main, 0.05) : (!isHeaderRow && col.isWeekend ? 'action.hover' : 'transparent'),
          borderLeft: isToday ? '2.5px solid' : undefined,
          borderRight: isToday ? '2.5px solid' : undefined,
          borderLeftColor: isToday ? 'error.main' : undefined,
          borderRightColor: isToday ? 'error.main' : undefined,
        }}
        title={hasBar ? `${plan.deptTask || plan.site || 'แผนงาน'}: ${pct}% (${fmtDate(plan.startDate)} - ${fmtDate(plan.endDate)})` : undefined}
      >
        {hasBar && (
          <Box
            sx={{
              height: 10, mx: 'auto', width: '95%', borderRadius: 1,
              bgcolor: (t) => alpha(t.palette[barColor].main, isHeaderRow ? 0.3 : 1),
              transition: 'all 0.2s ease',
              '&:hover': { transform: 'scaleY(1.3)', cursor: 'pointer' },
            }}
          />
        )}
      </TableCell>
    );
  };

  // Excel Export Handler (Hierarchical Structure)
  const handleExportExcel = () => {
    try {
      setExporting(true);
      const dataRows: any[] = [];

      // Title & Settings Headers
      dataRows.push(['รายงานกำหนดการ PM (PM Schedule Planner)']);
      dataRows.push([`ปีโครงการ: ${selectedYear + 543}`, `หัวหน้าโครงการ: ${selectedLead === 'ALL' ? 'ทั้งหมด' : selectedLead}`, `วันเริ่ม PM: ${pmStartDate || '—'}`]);
      dataRows.push([]); // blank line spacer

      // Table Header Row
      const tableHeaders = ['WBS', 'TASK (บริษัท / แผนกงาน)', 'LEAD', 'Device (แผน)', 'Completed (เสร็จ)', 'Remaining (เหลือ)', 'START', 'END', 'DAYS', '% DONE', 'สถานะ'];
      columns.forEach(col => {
        tableHeaders.push(`${col.label} (${col.subLabel})`);
      });
      dataRows.push(tableHeaders);

      // Overall Summary Row (WBS 1)
      const summaryRow = [
        '1',
        'TRR GROUP (ทั้งหมด)',
        '-',
        totalPlanned,
        totalCompleted,
        totalPlanned - totalCompleted,
        '-',
        '-',
        '-',
        `${overallPct}%`,
        overallPct >= 100 ? 'เสร็จสิ้นแล้ว' : 'กำลังดำเนินการ'
      ];
      columns.forEach(() => {
        summaryRow.push(overallPct >= 100 ? 'เสร็จสิ้นแล้ว' : 'กำลังดำเนินการ');
      });
      dataRows.push(summaryRow);

      // Grouped Rows (Hierarchy Level 1 = Site, Level 2 = Dept)
      groupedPlans.forEach((group, groupIdx) => {
        const sitePct = group.totalPlanned > 0 ? Math.round(group.totalCompleted / group.totalPlanned * 100) : 0;

        // 1. Write Company summary row (WBS 1.1, 1.2, ...)
        const siteWbs = `1.${groupIdx + 1}`;
        const days = (group.startDate && group.endDate) ? Math.max(1, Math.ceil((group.endDate.getTime() - group.startDate.getTime()) / 86400000)) : '-';
        const siteRow = [
          siteWbs,
          `🏢 ${group.site}`,
          group.lead || 'ไม่ระบุ',
          group.totalPlanned,
          group.totalCompleted,
          group.totalPlanned - group.totalCompleted,
          group.startDate ? fmtDate(group.startDate) : '-',
          group.endDate ? fmtDate(group.endDate) : '-',
          days,
          `${sitePct}%`,
          sitePct >= 100 ? 'เสร็จสิ้น' : sitePct > 0 ? 'กำลังดำเนินการ' : 'รอตรวจนับ'
        ];

        // Fill Gantt columns for Site Row
        columns.forEach(col => {
          const covers = group.startDate && group.endDate && group.startDate <= col.end && group.endDate >= col.start;
          if (covers) {
            siteRow.push(sitePct >= 100 ? 'เสร็จสิ้น (✓)' : sitePct > 0 ? 'กำลังดำเนินการ (⏳)' : 'ตามแผน (📅)');
          } else {
            siteRow.push('');
          }
        });
        dataRows.push(siteRow);

        // 2. Write Departments rows under this Site (WBS 1.1.1, 1.1.2, ...)
        group.plans.forEach((plan, planIdx) => {
          const planPct = plan.plannedDeviceCount > 0 ? Math.round((plan.completedCount || 0) / plan.plannedDeviceCount * 100) : 0;
          const planWbs = `${siteWbs}.${planIdx + 1}`;

          const pStartVal = plan.startDate ? new Date(plan.startDate) : null;
          const pEndVal = plan.endDate ? new Date(plan.endDate) : null;
          const pDays = (pStartVal && pEndVal) ? Math.max(1, Math.ceil((pEndVal.getTime() - pStartVal.getTime()) / 86400000)) : '-';

          const planRow = [
            planWbs,
            `   ↳ 📁 ${plan.deptTask || 'ทั่วไป'}`,
            plan.lead || group.lead || 'ไม่ระบุ',
            plan.plannedDeviceCount,
            plan.completedCount || 0,
            plan.plannedDeviceCount - (plan.completedCount || 0),
            pStartVal ? fmtDate(pStartVal) : '-',
            pEndVal ? fmtDate(pEndVal) : '-',
            pDays,
            `${planPct}%`,
            planPct >= 100 ? 'เสร็จสิ้น' : planPct > 0 ? 'กำลังดำเนินการ' : 'รอตรวจนับ'
          ];

          // Fill Gantt columns for Dept Row
          columns.forEach(col => {
            const covers = pStartVal && pEndVal && pStartVal <= col.end && pEndVal >= col.start;
            if (covers) {
              planRow.push(planPct >= 100 ? 'เสร็จสิ้น (✓)' : planPct > 0 ? 'กำลังดำเนินการ (⏳)' : 'ตามแผน (📅)');
            } else {
              planRow.push('');
            }
          });
          dataRows.push(planRow);
        });
      });

      // Generate spreadsheet
      const ws = XLSX.utils.aoa_to_sheet(dataRows);

      // Auto width formatting
      const colWidths = tableHeaders.map((_, colIdx) => {
        let maxLen = 12;
        dataRows.forEach(row => {
          const val = row[colIdx];
          if (val !== undefined && val !== null) {
            const len = val.toString().length;
            if (len > maxLen) maxLen = len;
          }
        });
        return { wch: maxLen + 2 };
      });
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'PM Schedule');

      XLSX.writeFile(wb, `PM_Schedule_Planner_${selectedYear + 543}.xlsx`);
      showToast('🚀 ส่งออกไฟล์ Excel สำเร็จ!');
    } catch (err: any) {
      console.error(err);
      showToast('❌ ไม่สามารถส่งออกไฟล์ Excel ได้');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Box className="pms-root">
      <GlobalStyles styles={PRINT_STYLES} />

      {/* ── Page Header ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, mb: 2.25 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: 2.5, bgcolor: (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.16 : 0.08), border: '1px solid', borderColor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CalendarMonthIcon color="primary" />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 16, fontWeight: 700 }}>กำหนดการ PM (PM Schedule Planner)</Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.25 }}>แผนจัดโครงการ PM จำแนกรายบริษัทและแผนกย่อย — ปี {selectedYear + 543}</Typography>
          </Box>
        </Box>
        <Box className="no-print" sx={{ display: 'flex', gap: 1 }}>
          <Button variant="contained" startIcon={<FileDownloadIcon />} onClick={handleExportExcel} disabled={exporting}>
            {exporting ? 'กำลังส่งออก...' : 'ส่งออก Excel Planner'}
          </Button>
          <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => window.print()}>พิมพ์แผนงาน</Button>
          <Button variant="outlined" startIcon={<BarChartIcon />} onClick={() => navigate('/pm')}>Dashboard</Button>
        </Box>
      </Box>

      {/* ── Status Cards Grid ── */}
      <Box className="no-print" sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 2, mb: 2.5 }}>
        {[
          { label: 'เสร็จสิ้นแผนงาน', val: completedPlansCount, color: 'success' as const, Icon: CheckCircleIcon },
          { label: 'กำลังดำเนินการตรวจ', val: activePlansCount, color: 'info' as const, Icon: AutorenewIcon },
          { label: 'รอดำเนินการตามแผน', val: pendingPlansCount, color: 'warning' as const, Icon: EventIcon },
        ].map((s) => (
          <Card key={s.label} variant="outlined" sx={{ p: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: 3, borderLeftColor: `${s.color}.main` }}>
            <Box>
              <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 600 }}>{s.label}</Typography>
              <Typography sx={{ fontSize: 24, fontWeight: 700, mt: 0.5, color: `${s.color}.main` }}>{s.val} แผนก</Typography>
            </Box>
            <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: (t) => alpha(t.palette[s.color].main, 0.12), color: `${s.color}.main`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <s.Icon />
            </Box>
          </Card>
        ))}
      </Box>

      {/* ── Top Inputs Panel ── */}
      <Card variant="outlined" className="pms-card no-print" sx={{ mb: 2.5 }}>
        <Box sx={{ p: '12px 18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 1.5 }}>
          <Box>
            <Typography sx={{ fontSize: 11, fontWeight: 500, color: 'text.secondary', mb: 0.75, textTransform: 'uppercase', letterSpacing: '0.05em' }}>ปีงบประมาณ (พ.ศ.)</Typography>
            <Select fullWidth size="small" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                <MenuItem key={y} value={y}>ปี {y + 543}</MenuItem>
              ))}
            </Select>
          </Box>
          <Box>
            <Typography sx={{ fontSize: 11, fontWeight: 500, color: 'text.secondary', mb: 0.75, textTransform: 'uppercase', letterSpacing: '0.05em' }}>วันที่เริ่มแสดงผล</Typography>
            <DatePicker
              format="DD/MM/YYYY"
              value={pmStartDate ? dayjs(pmStartDate) : null}
              onChange={(newVal) => { setPmStartDate(newVal ? newVal.format('YYYY-MM-DD') : ''); setTimeOffset(0); }}
              slotProps={{ textField: { size: 'small', fullWidth: true } }}
            />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 11, fontWeight: 500, color: 'text.secondary', mb: 0.75, textTransform: 'uppercase', letterSpacing: '0.05em' }}>บริษัท (Company)</Typography>
            <Select fullWidth size="small" value={selectedCompanyFilter} onChange={e => setSelectedCompanyFilter(e.target.value)}>
              <MenuItem value="ALL">บริษัททั้งหมด</MenuItem>
              {uniqueCompanies.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
          </Box>
          <Box>
            <Typography sx={{ fontSize: 11, fontWeight: 500, color: 'text.secondary', mb: 0.75, textTransform: 'uppercase', letterSpacing: '0.05em' }}>ผู้ดูแล/หัวหน้างาน (Lead)</Typography>
            <Select fullWidth size="small" value={selectedLead} onChange={e => setSelectedLead(e.target.value)}>
              <MenuItem value="ALL">ผู้ดูแลทั้งหมด</MenuItem>
              {uniqueLeads.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
            </Select>
          </Box>
          <Box>
            <Typography sx={{ fontSize: 11, fontWeight: 500, color: 'text.secondary', mb: 0.75, textTransform: 'uppercase', letterSpacing: '0.05em' }}>สถานะ (Status)</Typography>
            <Select fullWidth size="small" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
              <MenuItem value="ALL">ทุกสถานะ</MenuItem>
              <MenuItem value="COMPLETED">เสร็จสิ้นแล้ว</MenuItem>
              <MenuItem value="IN_PROGRESS">กำลังดำเนินการ</MenuItem>
              <MenuItem value="PENDING">รอดำเนินการ</MenuItem>
            </Select>
          </Box>
          <Box>
            <Typography sx={{ fontSize: 11, fontWeight: 500, color: 'text.secondary', mb: 0.75, textTransform: 'uppercase', letterSpacing: '0.05em' }}>ค้นหาบริษัท หรือ แผนก</Typography>
            <TextField fullWidth size="small" placeholder="พิมพ์ค้นหา..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </Box>
        </Box>
      </Card>

      {/* ── Gantt Chart Card ── */}
      <Paper variant="outlined" className="pms-card">
        <Box sx={{ p: '10px 18px', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.25, alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <BarChartIcon fontSize="small" color="action" />
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>ตารางแผนงาน (Gantt Chart) - {viewMode === 'daily' ? 'รายวัน' : 'รายสัปดาห์'}</Typography>
              <Typography sx={{ fontSize: 10, color: 'text.secondary', mt: 0.25 }}>
                {columns[0]?.subLabel} ถึง {columns[columns.length - 1]?.subLabel} {selectedYear + 543}
                {' · '}
                <Box component="span" sx={{ fontWeight: 600 }}>{filteredPlans.length} แผนงาน</Box>
                {' · '}
                <Box component="span" sx={{ fontWeight: 600 }}>{totalPlanned} เครื่อง</Box>
                {' · '}
                <Box component="span" sx={{ color: `${getProgressColor(overallPct)}.main`, fontWeight: 700 }}>{overallPct}%</Box>
              </Typography>
            </Box>
          </Box>

          <Box className="no-print" sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Button size="small" variant="outlined" startIcon={<UnfoldLessIcon fontSize="small" />} onClick={collapseAll}>ยุบทั้งหมด</Button>
              <Button size="small" variant="outlined" startIcon={<UnfoldMoreIcon fontSize="small" />} onClick={expandAll}>ขยายทั้งหมด</Button>
            </Box>

            <Box sx={{ width: '1px', height: 20, bgcolor: 'divider' }} />

            <ToggleButtonGroup size="small" exclusive value={viewMode} onChange={(_, v) => { if (v) { setViewMode(v); setTimeOffset(0); } }}>
              <ToggleButton value="daily" sx={{ fontSize: 11 }}>รายวัน</ToggleButton>
              <ToggleButton value="weekly" sx={{ fontSize: 11 }}>รายสัปดาห์</ToggleButton>
            </ToggleButtonGroup>

            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <IconButton size="small" onClick={() => setTimeOffset(prev => prev - (viewMode === 'weekly' ? 1 : 7))}><ChevronLeftIcon fontSize="small" /></IconButton>
              <IconButton size="small" onClick={() => setTimeOffset(0)} disabled={timeOffset === 0}><RestartAltIcon fontSize="small" /></IconButton>
              <IconButton size="small" onClick={() => setTimeOffset(prev => prev + (viewMode === 'weekly' ? 1 : 7))}><ChevronRightIcon fontSize="small" /></IconButton>
            </Box>
          </Box>
        </Box>

        <TableContainer sx={{ maxHeight: '65vh' }}>
          <Table className="gantt-table" size="small" sx={{ fontSize: 11 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 40, textAlign: 'center', bgcolor: 'action.hover', position: 'sticky', top: 0, zIndex: 2 }}>WBS</TableCell>
                <TableCell sx={{ minWidth: 160, bgcolor: 'action.hover', position: 'sticky', top: 0, zIndex: 2 }}>TASK (บริษัท / แผนกงาน)</TableCell>
                <TableCell sx={{ width: 60, textAlign: 'center', bgcolor: 'action.hover', position: 'sticky', top: 0, zIndex: 2 }}>LEAD</TableCell>
                <TableCell sx={{ width: 40, textAlign: 'center', bgcolor: 'action.hover', position: 'sticky', top: 0, zIndex: 2 }}>แผน</TableCell>
                <TableCell sx={{ width: 40, textAlign: 'center', bgcolor: 'action.hover', position: 'sticky', top: 0, zIndex: 2 }}>เสร็จ</TableCell>
                <TableCell sx={{ width: 40, textAlign: 'center', bgcolor: 'action.hover', position: 'sticky', top: 0, zIndex: 2 }}>เหลือ</TableCell>
                <TableCell sx={{ width: 60, textAlign: 'center', bgcolor: 'action.hover', position: 'sticky', top: 0, zIndex: 2 }}>START</TableCell>
                <TableCell sx={{ width: 60, textAlign: 'center', bgcolor: 'action.hover', position: 'sticky', top: 0, zIndex: 2 }}>END</TableCell>
                <TableCell sx={{ width: 30, textAlign: 'center', bgcolor: 'action.hover', position: 'sticky', top: 0, zIndex: 2 }}>วัน</TableCell>
                <TableCell sx={{ width: 40, textAlign: 'center', bgcolor: 'action.hover', position: 'sticky', top: 0, zIndex: 2 }}>%</TableCell>
                {columns.map(col => {
                  const isToday = isTodayInCol(col);
                  return (
                    <TableCell
                      key={col.start.getTime()}
                      sx={{
                        width: viewMode === 'daily' ? 40 : 80,
                        textAlign: 'center',
                        minWidth: viewMode === 'daily' ? 35 : 75,
                        bgcolor: isToday ? (t) => alpha(t.palette.error.main, 0.1) : 'action.hover',
                        borderLeft: isToday ? '2.5px solid' : undefined,
                        borderRight: isToday ? '2.5px solid' : undefined,
                        borderLeftColor: isToday ? 'error.main' : undefined,
                        borderRightColor: isToday ? 'error.main' : undefined,
                        position: 'sticky', top: 0, zIndex: 2,
                      }}
                    >
                      {col.label}<br />
                      <Box component="span" sx={{ fontSize: 8, fontWeight: isToday ? 700 : 400, color: isToday ? 'error.main' : 'text.secondary' }}>
                        {isToday ? '★ วันนี้' : col.subLabel.split(' ')[0]}
                      </Box>
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableHead>
            <TableBody>
              {/* ── Level 0: Total Summary Row ── */}
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ textAlign: 'center', color: 'text.secondary', fontWeight: 600 }}>1</TableCell>
                <TableCell sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}><CorporateFareIcon sx={{ fontSize: 14 }} /> TRR GROUP (ทั้งหมดในระบบ)</TableCell>
                <TableCell sx={{ textAlign: 'center' }}>-</TableCell>
                <TableCell sx={{ textAlign: 'center', fontWeight: 600 }}>{totalPlanned}</TableCell>
                <TableCell sx={{ textAlign: 'center', fontWeight: 600 }}>{totalCompleted}</TableCell>
                <TableCell sx={{ textAlign: 'center', color: 'error.main', fontWeight: 600 }}>{totalPlanned - totalCompleted}</TableCell>
                <TableCell sx={{ textAlign: 'center' }}>-</TableCell>
                <TableCell sx={{ textAlign: 'center' }}>-</TableCell>
                <TableCell sx={{ textAlign: 'center' }}>-</TableCell>
                <TableCell sx={{ textAlign: 'center' }}>
                  <Box component="span" sx={{ color: `${getProgressColor(overallPct)}.main`, fontWeight: 600 }}>{overallPct}%</Box>
                </TableCell>
                <TableCell colSpan={columns.length} sx={{ bgcolor: (t) => alpha(t.palette.success.main, 0.08), textAlign: 'center', fontSize: 11, color: 'success.main', fontWeight: 600 }}>
                  {overallPct >= 100 ? 'เสร็จสิ้นโครงการ PM แล้ว' : 'กำลังดำเนินการตามแผน'}
                </TableCell>
              </TableRow>

              {/* ── Grouped Sites Rows ── */}
              {groupedPlans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10 + columns.length} sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>
                    ไม่มีข้อมูลกำหนดการสำหรับปี {selectedYear + 543}
                  </TableCell>
                </TableRow>
              ) : (
                groupedPlans.map((group, groupIdx) => {
                  const sitePct = group.totalPlanned > 0 ? Math.round(group.totalCompleted / group.totalPlanned * 100) : 0;
                  const isExpanded = expandedSites[group.site] === true;
                  const siteWbs = `1.${groupIdx + 1}`;
                  const siteDays = (group.startDate && group.endDate) ? Math.max(1, Math.ceil((group.endDate.getTime() - group.startDate.getTime()) / 86400000)) : '-';

                  const siteDummyPlan = {
                    startDate: group.startDate,
                    endDate: group.endDate,
                    site: group.site,
                    deptTask: 'ภาพรวม'
                  };

                  return (
                    <React.Fragment key={group.site}>
                      <TableRow hover onClick={() => toggleSite(group.site)} sx={{ bgcolor: 'action.hover', fontWeight: 600, cursor: 'pointer' }}>
                        <TableCell sx={{ textAlign: 'center' }}>{siteWbs}</TableCell>
                        <TableCell sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <ChevronRightRotateIcon sx={{ fontSize: 14, transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'primary.main' }} />
                          <BusinessIcon sx={{ fontSize: 14 }} /> {group.site}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>{group.lead || '-'}</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>{group.totalPlanned}</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>{group.totalCompleted}</TableCell>
                        <TableCell sx={{ textAlign: 'center', color: 'error.main' }}>{group.totalPlanned - group.totalCompleted}</TableCell>
                        <TableCell sx={{ textAlign: 'center', fontSize: 9 }}>{group.startDate ? fmtDate(group.startDate) : '-'}</TableCell>
                        <TableCell sx={{ textAlign: 'center', fontSize: 9 }}>{group.endDate ? fmtDate(group.endDate) : '-'}</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>{siteDays}</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Box component="span" sx={{ color: 'success.main', fontWeight: 600 }}>{sitePct}%</Box>
                        </TableCell>
                        {columns.map(col => renderGanttCell(siteDummyPlan, col, sitePct, true))}
                      </TableRow>

                      {isExpanded && group.plans.map((plan, planIdx) => {
                        const planPct = plan.plannedDeviceCount > 0 ? Math.round((plan.completedCount || 0) / plan.plannedDeviceCount * 100) : 0;
                        const planWbs = `${siteWbs}.${planIdx + 1}`;

                        const pStartVal = plan.startDate ? new Date(plan.startDate) : null;
                        const pEndVal = plan.endDate ? new Date(plan.endDate) : null;
                        const pDays = (pStartVal && pEndVal) ? Math.max(1, Math.ceil((pEndVal.getTime() - pStartVal.getTime()) / 86400000)) : '-';

                        return (
                          <TableRow
                            key={plan.id}
                            hover
                            sx={{ cursor: 'pointer' }}
                            onClick={() => navigate(`/pm/runs?planId=${plan.id}`)}
                          >
                            <TableCell sx={{ textAlign: 'center', color: 'text.secondary' }}>{planWbs}</TableCell>
                            <TableCell sx={{ pl: 3.5 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><FolderIcon sx={{ fontSize: 13 }} /> {plan.deptTask || 'ทั่วไป'}</Box>
                              {plan.deviceType && (
                                <Box sx={{ fontSize: 10, color: 'info.main', fontWeight: 600, mt: 0.25, pl: 2.25, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <ComputerIcon sx={{ fontSize: 11 }} /> {plan.deviceType}
                                </Box>
                              )}
                            </TableCell>
                            <TableCell sx={{ textAlign: 'center' }}>{plan.lead || group.lead || '-'}</TableCell>
                            <TableCell sx={{ textAlign: 'center' }}>{plan.plannedDeviceCount}</TableCell>
                            <TableCell sx={{ textAlign: 'center' }}>{plan.completedCount || 0}</TableCell>
                            <TableCell sx={{ textAlign: 'center', color: 'error.main' }}>{plan.plannedDeviceCount - (plan.completedCount || 0)}</TableCell>
                            <TableCell sx={{ textAlign: 'center', fontSize: 9 }}>{pStartVal ? fmtDate(pStartVal) : '-'}</TableCell>
                            <TableCell sx={{ textAlign: 'center', fontSize: 9 }}>{pEndVal ? fmtDate(pEndVal) : '-'}</TableCell>
                            <TableCell sx={{ textAlign: 'center' }}>{pDays}</TableCell>
                            <TableCell sx={{ textAlign: 'center' }}>
                              <Box component="span" sx={{ color: `${getProgressColor(planPct)}.main`, fontWeight: 600 }}>{planPct}%</Box>
                            </TableCell>
                            {columns.map(col => renderGanttCell(plan, col, planPct))}
                          </TableRow>
                        );
                      })}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* ── Toast Notification ── */}
      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={toast?.startsWith('❌') ? 'error' : 'success'} variant="filled" sx={{ whiteSpace: 'nowrap' }}>
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  );
}
