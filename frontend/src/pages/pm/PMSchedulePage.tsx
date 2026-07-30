import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { pmAPI } from '../../services/api';
import * as XLSX from 'xlsx';
import { formatDate } from '../../utils/dateUtils';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';


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

  const getProgressColor = (pct: number) => {
    if (pct >= 100) return '#10b981';
    if (pct >= 50) return '#0ea5e9';
    if (pct >= 20) return '#f59e0b';
    return '#ef4444';
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

    let barClass = 'gantt-bar-block';
    if (pct >= 100) {
      barClass += isHeaderRow ? ' gantt-bar-done-light' : ' gantt-bar-done';
    } else if (pct > 0) {
      barClass += isHeaderRow ? ' gantt-bar-pending-light' : ' gantt-bar-pending';
    } else {
      barClass += isHeaderRow ? ' gantt-bar-scheduled-light' : ' gantt-bar-scheduled';
    }

    const radiusStyle: React.CSSProperties = {
      borderRadius: '6px',
      opacity: isHeaderRow ? 0.75 : 1,
      height: '10px',
      margin: '0 auto',
      width: '95%',
    };

    return (
      <td 
        key={col.start.getTime()} 
        style={{ 
          padding: hasBar ? '8px 0px' : '12px 14px', 
          verticalAlign: 'middle', 
          position: 'relative',
          background: isToday ? 'rgba(239, 68, 68, 0.05)' : (!isHeaderRow && col.isWeekend ? 'rgba(0,0,0,0.02)' : 'transparent'),
          borderLeft: isToday ? '2.5px solid #ef4444' : undefined,
          borderRight: isToday ? '2.5px solid #ef4444' : undefined,
        }}
        title={hasBar ? `${plan.deptTask || plan.site || 'แผนงาน'}: ${pct}% (${fmtDate(plan.startDate)} - ${fmtDate(plan.endDate)})` : undefined}
      >
        {hasBar && <div className={barClass} style={radiusStyle} />}
      </td>
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
    <>
      <style>{`
        .pms-root { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif; color: #1d1d1f; }
        .pms-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.02); margin-bottom: 20px; }
        .pms-header { padding: 16px 20px; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; gap: 10px; background: #ffffff; }
        .pms-input { width: 100%; border: 1px solid #d2d2d7; border-radius: 8px; padding: 10px 12px; font-size: 13px; font-family: inherit; outline: none; background: #f5f5f7; box-sizing: border-box; transition: all 0.15s ease; color: #1d1d1f; }
        .pms-input:focus { border-color: #0071e3; background: #ffffff; box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.15); }
        .pms-select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2386868b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px; cursor: pointer; }
        .pms-label { font-size: 11px; font-weight: 500; color: #86868b; margin-bottom: 6px; display: block; text-transform: uppercase; letter-spacing: 0.05em; }
        
        .pms-stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 20px; }
        .pms-stat-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 18px 22px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 4px 20px rgba(0,0,0,0.02); }
        .pms-stat-icon { width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px; }
        .pms-toast { position: fixed; bottom: 24px; right: 24px; background: #1d1d1f; color: #fff; padding: 12px 20px; border-radius: 8px; font-size: 13px; font-weight: 500; box-shadow: 0 8px 24px rgba(0,0,0,0.15); z-index: 9999; animation: slideIn 0.2s ease-out; }

        /* Modern Gantt Table — Compact */
        .gantt-table { border-collapse: collapse; font-size: 11px; width: 100%; border: 1px solid #e5e7eb; background: #ffffff; }
        .gantt-table th, .gantt-table td { border: 1px solid #f3f4f6; padding: 6px 8px; white-space: nowrap; vertical-align: middle; }
        .gantt-table thead th { background: #f5f5f7; font-weight: 600; color: #1d1d1f; text-align: center; font-size: 10px; border-bottom: 2px solid #e5e7eb; padding: 8px 6px; position: sticky; top: 0; z-index: 2; }
        
        .gantt-progress-wrap { background: #e5e7eb; border-radius: 99px; height: 5px; overflow: hidden; width: 50px; display: inline-block; }
        .gantt-progress-bar { height: 100%; border-radius: 99px; }
        
        /* Gantt Bars - Modern Rounded Pill */
        .gantt-bar-block { height: 8px; border-radius: 4px; box-shadow: none; transition: all 0.2s ease; }
        .gantt-bar-block:hover { transform: scaleY(1.3); cursor: pointer; }
        
        .gantt-bar-done { background: #34c759; }
        .gantt-bar-pending { background: #0071e3; }
        .gantt-bar-scheduled { background: #ff9500; }
        
        .gantt-bar-done-light { background: rgba(52, 199, 89, 0.25); }
        .gantt-bar-pending-light { background: rgba(0, 113, 227, 0.25); }
        .gantt-bar-scheduled-light { background: rgba(255, 149, 0, 0.25); }

        .gantt-cell-empty { background: transparent; }
        
        /* WBS Rows styling — Compact */
        .gantt-site-row { background: #f0f1f3 !important; font-weight: 600; color: #1d1d1f; border-bottom: 1px solid #e5e7eb; cursor: pointer; transition: background 0.15s; }
        .gantt-site-row:hover { background: #e8e8ed !important; }
        .gantt-site-row td { padding: 8px 8px !important; }
        .gantt-dept-row { background: #ffffff; transition: background 0.15s; }
        .gantt-dept-row:hover { background: #f5f5f7; }
        .gantt-dept-row td { padding: 5px 8px !important; }
        
        .pms-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; border-radius: 8px; font-size: 12px; font-weight: 500; cursor: pointer; font-family: inherit; transition: all .15s; border: 1px solid transparent; white-space: nowrap; }
        .pms-btn-outline { background: #fff; border-color: #d2d2d7; color: #1d1d1f; }
        .pms-btn-outline:hover { background-color: #f5f5f7; border-color: #86868b; }
        .pms-btn-primary { background: #0071e3; color: #fff; border-color: #0071e3; }
        .pms-btn-primary:hover { background: #0077ed; }
        
        .gantt-row-interactive { cursor: pointer; }

        .collapsible-icon { display: inline-block; width: 14px; font-size: 10px; margin-right: 6px; color: #0071e3; transition: transform 0.2s; }

        @keyframes slideIn {
          from { transform: translateY(10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        @media print {
          body { background: #fff; color: #000; }
          .pms-root { padding: 0; margin: 0; width: 100% !important; }
          .no-print { display: none !important; }
          .pms-card { border: none !important; box-shadow: none !important; margin-bottom: 0 !important; }
          .gantt-table { width: 100% !important; border: 1px solid #000 !important; }
          .gantt-table th, .gantt-table td { border: 1px solid #000 !important; color: #000 !important; }
          header, nav, aside, footer, .sidebar, .topbar { display: none !important; }
          body * { visibility: hidden; }
          .pms-root, .pms-root * { visibility: visible; }
          .pms-root { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>

      <div className="pms-root">
        {/* ── Page Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(0, 113, 227, 0.08)', border: '1.5px solid rgba(0, 113, 227, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📅</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1d1d1f' }}>กำหนดการ PM (PM Schedule Planner)</div>
              <div style={{ fontSize: 11, color: '#86868b', marginTop: 2 }}>แผนจัดโครงการ PM จำแนกรายบริษัทและแผนกย่อย — ปี {selectedYear + 543}</div>
            </div>
          </div>
          <div className="no-print" style={{ display: 'flex', gap: 8 }}>
            <button 
              className="pms-btn pms-btn-primary" 
              onClick={handleExportExcel} 
              disabled={exporting}
            >
              📥 {exporting ? 'กำลังส่งออก...' : 'ส่งออก Excel Planner'}
            </button>
            <button className="pms-btn pms-btn-outline" onClick={() => window.print()}>
              🖨️ พิมพ์แผนงาน
            </button>
            <button className="pms-btn pms-btn-outline" onClick={() => navigate('/pm')} style={{ background: '#f5f5f7' }}>
              📊 Dashboard
            </button>
          </div>
        </div>

        {/* ── Status Cards Grid ── */}
        <div className="pms-stat-grid no-print">
          <div className="pms-stat-card" style={{ borderLeft: '2px solid #34c759', background: 'rgba(52, 199, 89, 0.02)' }}>
            <div>
              <div style={{ fontSize: 11, color: '#86868b', fontWeight: 600 }}>🟢 เสร็จสิ้นแผนงาน</div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4, color: '#34c759' }}>{completedPlansCount} แผนก</div>
            </div>
            <div className="pms-stat-icon" style={{ background: 'rgba(52, 199, 89, 0.08)', color: '#34c759' }}>✓</div>
          </div>
          <div className="pms-stat-card" style={{ borderLeft: '2px solid #0071e3', background: 'rgba(0, 113, 227, 0.02)' }}>
            <div>
              <div style={{ fontSize: 11, color: '#86868b', fontWeight: 600 }}>🔵 กำลังดำเนินการตรวจ</div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4, color: '#0071e3' }}>{activePlansCount} แผนก</div>
            </div>
            <div className="pms-stat-icon" style={{ background: 'rgba(0, 113, 227, 0.08)', color: '#0071e3' }}>⏳</div>
          </div>
          <div className="pms-stat-card" style={{ borderLeft: '2px solid #ff9500', background: 'rgba(255, 149, 0, 0.02)' }}>
            <div>
              <div style={{ fontSize: 11, color: '#86868b', fontWeight: 600 }}>🟡 รอดำเนินการตามแผน</div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4, color: '#ff9500' }}>{pendingPlansCount} แผนก</div>
            </div>
            <div className="pms-stat-icon" style={{ background: 'rgba(255, 149, 0, 0.08)', color: '#ff9500' }}>📅</div>
          </div>
        </div>

        {/* ── Top Inputs Panel ── */}
        <div className="pms-card no-print">
          <div style={{ padding: '12px 18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            <div>
              <label className="pms-label">ปีงบประมาณ (พ.ศ.)</label>
              <select className="pms-input pms-select" value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}>
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                  <option key={y} value={y}>ปี {y + 543}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="pms-label">วันที่เริ่มแสดงผล</label>
              <DatePicker
                format="DD/MM/YYYY"
                value={pmStartDate ? dayjs(pmStartDate) : null}
                onChange={(newVal) => { setPmStartDate(newVal ? newVal.format('YYYY-MM-DD') : ''); setTimeOffset(0); }}
                slotProps={{ textField: { size: 'small', className: 'pms-input', sx: { bgcolor: '#fff', borderRadius: '6px' } } }}
              />
            </div>
            <div>
              <label className="pms-label">บริษัท (Company)</label>
              <select className="pms-input pms-select" value={selectedCompanyFilter} onChange={e => setSelectedCompanyFilter(e.target.value)}>
                <option value="ALL">บริษัททั้งหมด</option>
                {uniqueCompanies.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="pms-label">ผู้ดูแล/หัวหน้างาน (Lead)</label>
              <select className="pms-input pms-select" value={selectedLead} onChange={e => setSelectedLead(e.target.value)}>
                <option value="ALL">ผู้ดูแลทั้งหมด</option>
                {uniqueLeads.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="pms-label">สถานะ (Status)</label>
              <select className="pms-input pms-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
                <option value="ALL">ทุกสถานะ</option>
                <option value="COMPLETED">✅ เสร็จสิ้นแล้ว</option>
                <option value="IN_PROGRESS">🔵 กำลังดำเนินการ</option>
                <option value="PENDING">🟡 รอดำเนินการ</option>
              </select>
            </div>
            <div>
              <label className="pms-label">ค้นหาบริษัท หรือ แผนก</label>
              <input
                type="text"
                className="pms-input"
                placeholder="พิมพ์ค้นหา..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ── Gantt Chart Card ── */}
        <div className="pms-card">
          <div className="pms-header" style={{ justifyContent: 'space-between', flexWrap: 'wrap', padding: '10px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16 }}>📊</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1d1d1f' }}>ตารางแผนงาน (Gantt Chart) - {viewMode === 'daily' ? 'รายวัน' : 'รายสัปดาห์'}</div>
                <div style={{ fontSize: 10, color: '#86868b', marginTop: 1 }}>
                  {columns[0]?.subLabel} ถึง {columns[columns.length-1]?.subLabel} {selectedYear + 543}
                  {' · '}
                  <span style={{ fontWeight: 600 }}>{filteredPlans.length} แผนงาน</span>
                  {' · '}
                  <span style={{ fontWeight: 600 }}>{totalPlanned} เครื่อง</span>
                  {' · '}
                  <span style={{ color: getProgressColor(overallPct), fontWeight: 700 }}>{overallPct}%</span>
                </div>
              </div>
            </div>

            <div className="no-print" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Collapse / Expand buttons */}
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="pms-btn pms-btn-outline" style={{ padding: '4px 10px', fontSize: '10px' }} onClick={collapseAll} title="ยุบทั้งหมด">
                  ▼ ยุบทั้งหมด
                </button>
                <button className="pms-btn pms-btn-outline" style={{ padding: '4px 10px', fontSize: '10px' }} onClick={expandAll} title="ขยายทั้งหมด">
                  ▲ ขยายทั้งหมด
                </button>
              </div>

              <div style={{ width: 1, height: 20, background: '#e5e7eb' }} />

              <div style={{ background: '#f5f5f7', padding: '3px', borderRadius: '8px', display: 'flex', gap: '3px' }}>
                <button 
                  className={`pms-btn ${viewMode === 'daily' ? 'pms-btn-primary' : 'pms-btn-outline'}`} 
                  style={{ padding: '4px 10px', fontSize: '10px', border: 'none' }} 
                  onClick={() => { setViewMode('daily'); setTimeOffset(0); }}
                >
                  รายวัน
                </button>
                <button 
                  className={`pms-btn ${viewMode === 'weekly' ? 'pms-btn-primary' : 'pms-btn-outline'}`} 
                  style={{ padding: '4px 10px', fontSize: '10px', border: 'none' }} 
                  onClick={() => { setViewMode('weekly'); setTimeOffset(0); }}
                >
                  รายสัปดาห์
                </button>
              </div>

              <div style={{ display: 'flex', gap: 4 }}>
                <button className="pms-btn pms-btn-outline" style={{ padding: '4px 8px', fontSize: '10px' }} onClick={() => setTimeOffset(prev => prev - (viewMode === 'weekly' ? 1 : 7))}>
                  ◀
                </button>
                <button className="pms-btn pms-btn-outline" style={{ padding: '4px 8px', fontSize: '10px' }} onClick={() => setTimeOffset(0)} disabled={timeOffset === 0}>
                  ↺
                </button>
                <button className="pms-btn pms-btn-outline" style={{ padding: '4px 8px', fontSize: '10px' }} onClick={() => setTimeOffset(prev => prev + (viewMode === 'weekly' ? 1 : 7))}>
                  ▶
                </button>
              </div>
            </div>
          </div>

          <div style={{ overflowX: 'auto', maxHeight: '65vh', padding: 0 }}>
            <table className="gantt-table">
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: 'center' }}>WBS</th>
                  <th style={{ minWidth: 160, textAlign: 'left' }}>TASK (บริษัท / แผนกงาน)</th>
                  <th style={{ width: 60, textAlign: 'center' }}>LEAD</th>
                  <th style={{ width: 40, textAlign: 'center' }}>แผน</th>
                  <th style={{ width: 40, textAlign: 'center' }}>เสร็จ</th>
                  <th style={{ width: 40, textAlign: 'center' }}>เหลือ</th>
                  <th style={{ width: 60, textAlign: 'center' }}>START</th>
                  <th style={{ width: 60, textAlign: 'center' }}>END</th>
                  <th style={{ width: 30, textAlign: 'center' }}>วัน</th>
                  <th style={{ width: 40, textAlign: 'center' }}>%</th>
                  {columns.map(col => {
                    const isToday = isTodayInCol(col);
                    return (
                      <th 
                        key={col.start.getTime()} 
                        style={{ 
                          width: viewMode === 'daily' ? 40 : 80, 
                          textAlign: 'center', 
                          minWidth: viewMode === 'daily' ? 35 : 75,
                          backgroundColor: isToday ? '#fee2e2' : undefined,
                          borderLeft: isToday ? '2.5px solid #ef4444' : undefined,
                          borderRight: isToday ? '2.5px solid #ef4444' : undefined,
                        }}
                      >
                        {col.label}<br />
                        <span style={{ fontSize: 8, fontWeight: isToday ? 700 : 400, color: isToday ? '#ef4444' : '#86868b' }}>
                          {isToday ? '★ วันนี้' : col.subLabel.split(' ')[0]}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {/* ── Level 0: Total Summary Row ── */}
                <tr style={{ background: '#f5f5f7', fontWeight: 600 }}>
                  <td style={{ textAlign: 'center', color: '#86868b' }}>1</td>
                  <td>💼 TRR GROUP (ทั้งหมดในระบบ)</td>
                  <td style={{ textAlign: 'center' }}>-</td>
                  <td style={{ textAlign: 'center' }}>{totalPlanned}</td>
                  <td style={{ textAlign: 'center' }}>{totalCompleted}</td>
                  <td style={{ textAlign: 'center', color: '#ff3b30' }}>{totalPlanned - totalCompleted}</td>
                  <td style={{ textAlign: 'center' }}>-</td>
                  <td style={{ textAlign: 'center' }}>-</td>
                  <td style={{ textAlign: 'center' }}>-</td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ color: getProgressColor(overallPct), fontWeight: 600 }}>{overallPct}%</span>
                  </td>
                  <td colSpan={columns.length} style={{ background: 'rgba(52, 199, 89, 0.05)', textAlign: 'center', fontSize: 11, color: '#248a3d', fontWeight: 600 }}>
                    {overallPct >= 100 ? '✅ เสร็จสิ้นโครงการ PM แล้ว' : '🔄 กำลังดำเนินการตามแผน'}
                  </td>
                </tr>

                {/* ── Grouped Sites Rows ── */}
                {groupedPlans.length === 0 ? (
                  <tr>
                    <td colSpan={10 + columns.length} style={{ textAlign: 'center', padding: 24, color: '#86868b' }}>
                      ไม่มีข้อมูลกำหนดการสำหรับปี {selectedYear + 543}
                    </td>
                  </tr>
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
                        <tr className="gantt-site-row" onClick={() => toggleSite(group.site)}>
                          <td style={{ textAlign: 'center' }}>{siteWbs}</td>
                          <td>
                            <span className="collapsible-icon" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                            🏢 {group.site}
                          </td>
                          <td style={{ textAlign: 'center' }}>{group.lead || '-'}</td>
                          <td style={{ textAlign: 'center' }}>{group.totalPlanned}</td>
                          <td style={{ textAlign: 'center' }}>{group.totalCompleted}</td>
                          <td style={{ textAlign: 'center', color: '#ff3b30' }}>{group.totalPlanned - group.totalCompleted}</td>
                          <td style={{ textAlign: 'center', fontSize: 9 }}>{group.startDate ? fmtDate(group.startDate) : '-'}</td>
                          <td style={{ textAlign: 'center', fontSize: 9 }}>{group.endDate ? fmtDate(group.endDate) : '-'}</td>
                          <td style={{ textAlign: 'center' }}>{siteDays}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{ color: '#248a3d', fontWeight: 600 }}>{sitePct}%</span>
                          </td>
                          {columns.map(col => renderGanttCell(siteDummyPlan, col, sitePct, true))}
                        </tr>

                        {isExpanded && group.plans.map((plan, planIdx) => {
                          const planPct = plan.plannedDeviceCount > 0 ? Math.round((plan.completedCount || 0) / plan.plannedDeviceCount * 100) : 0;
                          const planWbs = `${siteWbs}.${planIdx + 1}`;
                          
                          const pStartVal = plan.startDate ? new Date(plan.startDate) : null;
                          const pEndVal = plan.endDate ? new Date(plan.endDate) : null;
                          const pDays = (pStartVal && pEndVal) ? Math.max(1, Math.ceil((pEndVal.getTime() - pStartVal.getTime()) / 86400000)) : '-';

                          return (
                            <tr 
                              key={plan.id} 
                              className="gantt-dept-row gantt-row-interactive" 
                              onClick={() => navigate(`/pm/runs?planId=${plan.id}`)}
                            >
                              <td style={{ textAlign: 'center', color: '#86868b' }}>{planWbs}</td>
                              <td style={{ paddingLeft: '28px', color: '#1d1d1f' }}>
                                ↳ 📁 {plan.deptTask || 'ทั่วไป'}
                                {plan.deviceType && (
                                  <div style={{ fontSize: 10, color: '#0ea5e9', fontWeight: 600, marginTop: 2, paddingLeft: 18 }}>
                                    💻 {plan.deviceType}
                                  </div>
                                )}
                              </td>
                              <td style={{ textAlign: 'center' }}>{plan.lead || group.lead || '-'}</td>
                              <td style={{ textAlign: 'center' }}>{plan.plannedDeviceCount}</td>
                              <td style={{ textAlign: 'center' }}>{plan.completedCount || 0}</td>
                              <td style={{ textAlign: 'center', color: '#ff3b30' }}>{plan.plannedDeviceCount - (plan.completedCount || 0)}</td>
                              <td style={{ textAlign: 'center', fontSize: 9 }}>{pStartVal ? fmtDate(pStartVal) : '-'}</td>
                              <td style={{ textAlign: 'center', fontSize: 9 }}>{pEndVal ? fmtDate(pEndVal) : '-'}</td>
                              <td style={{ textAlign: 'center' }}>{pDays}</td>
                              <td style={{ textAlign: 'center' }}>
                                <span style={{ color: getProgressColor(planPct), fontWeight: 600 }}>{planPct}%</span>
                              </td>
                              {columns.map(col => renderGanttCell(plan, col, planPct))}
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Toast Notification ── */}
        {toast && <div className="pms-toast">{toast}</div>}
      </div>
    </>
  );
}
