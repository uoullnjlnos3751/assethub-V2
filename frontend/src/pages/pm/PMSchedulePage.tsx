import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { pmAPI } from '../../services/api';
import * as XLSX from 'xlsx';

// Helper to format date
function fmtDate(d: string | Date | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
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
  const [selectedYear] = useState<number>(new Date().getFullYear());
  
  // Interactive filters
  const [pmStartDate, setPmStartDate] = useState<string>('');
  const [selectedLead, setSelectedLead] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [weekOffset, setWeekOffset] = useState<number>(0);

  // Group Expanded State
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
        
        // Expand all sites by default
        const initialExpanded: Record<string, boolean> = {};
        plansList.forEach((p: any) => {
          if (p.site) initialExpanded[p.site] = true;
        });
        setExpandedSites(initialExpanded);
        
        // Find earliest start date to default PM Start Date
        const validPlans = plansList.filter((p: any) => p.startDate);
        if (validPlans.length > 0) {
          const minTime = Math.min(...validPlans.map((p: any) => new Date(p.startDate).getTime()));
          const minDateStr = new Date(minTime).toISOString().split('T')[0];
          setPmStartDate(minDateStr);
        } else {
          setPmStartDate(new Date().toISOString().split('T')[0]);
        }
      })
      .catch(err => console.error('Error fetching PM plans:', err))
      .finally(() => setLoading(false));
  }, [selectedYear]);

  // Filter plans by selected Lead and Search Term
  const filteredPlans = plans.filter(p => {
    const matchesLead = selectedLead === 'ALL' || p.lead === selectedLead;
    const label = p.deptTask || '';
    const matchesSearch = label.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.site || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (p.company || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesLead && matchesSearch;
  });

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

  // Generate 8 weeks starting from PM Start Date + offset
  const generateWeeks = () => {
    const weeks = [];
    const baseDate = pmStartDate ? new Date(pmStartDate) : new Date();
    baseDate.setDate(baseDate.getDate() + (weekOffset * 7));
    let current = getMonday(baseDate);

    for (let i = 0; i < 8; i++) {
      const next = new Date(current);
      next.setDate(current.getDate() + 6);
      weeks.push({
        start: new Date(current),
        end: next,
        label: `W${getCalendarWeek(current)}`,
        subLabel: formatThaiMonthDay(current),
      });
      current.setDate(current.getDate() + 7);
    }
    return weeks;
  };

  const weeks = generateWeeks();

  const getProgressColor = (pct: number) => {
    if (pct >= 100) return '#10b981';
    if (pct >= 50) return '#0ea5e9';
    if (pct >= 20) return '#f59e0b';
    return '#ef4444';
  };

  // Render Gantt Chart Cell (Continuous blocks logic)
  const renderGanttCell = (plan: any, w: any, pct: number, isHeaderRow: boolean = false) => {
    const startVal = plan.startDate ? new Date(plan.startDate) : null;
    const endVal = plan.endDate ? new Date(plan.endDate) : null;
    
    if (!startVal || !endVal) return <td key={w.label} className="gantt-cell-empty"></td>;

    const covers = startVal <= w.end && endVal >= w.start;
    if (!covers) return <td key={w.label} className="gantt-cell-empty"></td>;

    // Check if start/end of the plan is within this week to set border-radius
    const isStart = startVal >= w.start && startVal <= w.end;
    const isEnd = endVal >= w.start && endVal <= w.end;

    let barClass = 'gantt-bar-block';
    let statusIcon = '📅';

    if (pct >= 100) {
      barClass += isHeaderRow ? ' gantt-bar-done-light' : ' gantt-bar-done';
      statusIcon = '✓';
    } else if (pct > 0) {
      barClass += isHeaderRow ? ' gantt-bar-pending-light' : ' gantt-bar-pending';
      statusIcon = '⏳';
    } else {
      barClass += isHeaderRow ? ' gantt-bar-scheduled-light' : ' gantt-bar-scheduled';
      statusIcon = '📅';
    }

    const radiusStyle: React.CSSProperties = {
      borderTopLeftRadius: isStart ? '6px' : '0px',
      borderBottomLeftRadius: isStart ? '6px' : '0px',
      borderTopRightRadius: isEnd ? '6px' : '0px',
      borderBottomRightRadius: isEnd ? '6px' : '0px',
      marginLeft: isStart ? '4px' : '0px',
      marginRight: isEnd ? '4px' : '0px',
      opacity: isHeaderRow ? 0.75 : 1
    };

    return (
      <td 
        key={w.label} 
        style={{ padding: '6px 0px', borderLeft: isStart ? '1px solid #cbd5e1' : 'none', borderRight: isEnd ? '1px solid #cbd5e1' : 'none' }}
        title={`${plan.deptTask || plan.site || 'แผนงาน'}: ${pct}% (${fmtDate(plan.startDate)} - ${fmtDate(plan.endDate)})`}
      >
        <div className={barClass} style={radiusStyle}>
          {isStart || isEnd || pct >= 100 ? statusIcon : ''}
        </div>
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
      const tableHeaders = ['WBS', 'บริษัท / แผนกงาน', 'จำนวนเครื่องทั้งหมด', 'เสร็จแล้ว', 'ความสำเร็จ (%)', 'สถานะ'];
      weeks.forEach(w => {
        tableHeaders.push(`${w.label} (${w.subLabel})`);
      });
      dataRows.push(tableHeaders);

      // Overall Summary Row (WBS 1)
      const summaryRow = [
        '1',
        'TRR GROUP (ทั้งหมด)',
        totalPlanned,
        totalCompleted,
        `${overallPct}%`,
        overallPct >= 100 ? 'เสร็จสิ้นแล้ว' : 'กำลังดำเนินการ'
      ];
      weeks.forEach(() => {
        summaryRow.push(overallPct >= 100 ? 'เสร็จสิ้นแล้ว' : 'กำลังดำเนินการ');
      });
      dataRows.push(summaryRow);

      // Grouped Rows (Hierarchy Level 1 = Site, Level 2 = Dept)
      groupedPlans.forEach((group, groupIdx) => {
        const sitePct = group.totalPlanned > 0 ? Math.round(group.totalCompleted / group.totalPlanned * 100) : 0;
        
        // 1. Write Company summary row (WBS 1.1, 1.2, ...)
        const siteWbs = `1.${groupIdx + 1}`;
        const siteRow = [
          siteWbs,
          `🏢 ${group.site}`,
          group.totalPlanned,
          group.totalCompleted,
          `${sitePct}%`,
          sitePct >= 100 ? 'เสร็จสิ้น' : sitePct > 0 ? 'กำลังดำเนินการ' : 'รอตรวจนับ'
        ];

        // Fill Gantt columns for Site Row
        weeks.forEach(w => {
          const covers = group.startDate && group.endDate && group.startDate <= w.end && group.endDate >= w.start;
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
          
          const planRow = [
            planWbs,
            `   ↳ 📁 ${plan.deptTask || 'ทั่วไป'}`,
            plan.plannedDeviceCount,
            plan.completedCount || 0,
            `${planPct}%`,
            planPct >= 100 ? 'เสร็จสิ้น' : planPct > 0 ? 'กำลังดำเนินการ' : 'รอตรวจนับ'
          ];

          // Fill Gantt columns for Dept Row
          weeks.forEach(w => {
            const startVal = plan.startDate ? new Date(plan.startDate) : null;
            const endVal = plan.endDate ? new Date(plan.endDate) : null;
            const covers = startVal && endVal && startVal <= w.end && endVal >= w.start;
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
        .pms-root { font-family: 'Sarabun', sans-serif; color: #0f172a; }
        .pms-card { background: #fff; border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.05); margin-bottom: 16px; }
        .pms-header { padding: 14px 18px; border-bottom: 1px solid #cbd5e1; display: flex; align-items: center; gap: 10px; background: linear-gradient(135deg, #f8fafc 0%, #fff 100%); }
        .pms-input { width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 10px; font-size: 12px; font-family: 'Sarabun', sans-serif; outline: none; background: #fff; box-sizing: border-box; }
        .pms-input:focus { border-color: #16a34a; box-shadow: 0 0 0 3px rgba(22, 163, 74, .1); }
        .pms-select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; padding-right: 30px; cursor: pointer; }
        .pms-label { font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 4px; display: block; }
        
        .pms-stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-bottom: 16px; }
        .pms-stat-card { background: #fff; border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 1px 3px rgba(0,0,0,.05); }
        .pms-stat-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; }
        .pms-toast { position: fixed; bottom: 24px; right: 24px; background: #0f172a; color: #fff; padding: 12px 20px; border-radius: 8px; font-size: 13px; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,.15); z-index: 9999; animation: slideIn 0.2s ease-out; }

        /* Excel Planner Table Styles */
        .gantt-table { border-collapse: collapse; font-size: 11px; width: 100%; border: 2px solid #cbd5e1; }
        .gantt-table th, .gantt-table td { border: 1px solid #cbd5e1; padding: 8px 12px; white-space: nowrap; vertical-align: middle; }
        .gantt-table thead th { background: #1e293b; font-weight: 700; color: #ffffff; text-align: center; font-size: 11px; }
        
        .gantt-progress-wrap { background: #e2e8f0; border-radius: 99px; height: 7px; overflow: hidden; width: 70px; display: inline-block; }
        .gantt-progress-bar { height: 100%; border-radius: 99px; transition: width .3s; }
        
        /* Gantt Blocks */
        .gantt-bar-block { height: 20px; display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: bold; font-size: 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); transition: all 0.2s; }
        .gantt-bar-block:hover { transform: scaleY(1.1); filter: brightness(1.05); cursor: pointer; }
        
        .gantt-bar-done { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
        .gantt-bar-pending { background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); }
        .gantt-bar-scheduled { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
        
        .gantt-bar-done-light { background: linear-gradient(135deg, #a7f3d0 0%, #6ee7b7 100%); color: #065f46; }
        .gantt-bar-pending-light { background: linear-gradient(135deg, #bae6fd 0%, #7dd3fc 100%); color: #075985; }
        .gantt-bar-scheduled-light { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); color: #92400e; }

        .gantt-cell-empty { background: transparent; }
        
        /* Hierarchical Rows styling */
        .gantt-site-row { background: #f0fdf4 !important; font-weight: 700; color: #15803d; border-bottom: 2px solid #cbd5e1; cursor: pointer; }
        .gantt-site-row:hover { background: #dcfce7 !important; }
        .gantt-dept-row { background: #ffffff; }
        .gantt-dept-row:hover { background: #f8fafc; }
        
        .pms-btn { display: inline-flex; align-items: center; gap: 5px; padding: 7px 14px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: 'Sarabun', sans-serif; transition: all .15s; border: 1px solid transparent; white-space: nowrap; }
        .pms-btn-outline { background: #fff; border-color: #cbd5e1; color: #475569; }
        .pms-btn-outline:hover { border-color: #16a34a; color: #16a34a; }
        
        .gantt-row-interactive { cursor: pointer; transition: background .15s; }
        .gantt-row-interactive:hover { background: #f8fafc !important; }

        .collapsible-icon { display: inline-block; width: 14px; font-size: 10px; margin-right: 6px; color: #16a34a; transition: transform 0.2s; }

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
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f0fdf4', border: '1.5px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📅</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>กำหนดการ PM (PM Schedule Planner)</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>แผนจัดโครงการ PM รายสัปดาห์ จำแนกรายบริษัทและแผนกย่อย — ปี {selectedYear + 543}</div>
            </div>
          </div>
          <div className="no-print" style={{ display: 'flex', gap: 8 }}>
            <button 
              className="pms-btn" 
              onClick={handleExportExcel} 
              disabled={exporting}
              style={{
                background: '#16a34a',
                color: '#ffffff',
                boxShadow: '0 2px 6px rgba(22, 163, 74, 0.15)'
              }}
            >
              📥 {exporting ? 'กำลังส่งออก...' : 'ส่งออก Excel Planner'}
            </button>
            <button className="pms-btn pms-btn-outline" onClick={() => window.print()}>
              🖨️ พิมพ์แผนงาน
            </button>
            <button className="pms-btn pms-btn-outline" onClick={() => navigate('/pm')} style={{ background: '#f1f5f9' }}>
              📊 Dashboard
            </button>
          </div>
        </div>

        {/* ── Status Cards Grid ── */}
        <div className="pms-stat-grid no-print">
          <div className="pms-stat-card" style={{ borderLeft: '4px solid #10b981' }}>
            <div>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>🟢 เสร็จสิ้นแผนงาน</div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4, color: '#16a34a' }}>{completedPlansCount} แผนก</div>
            </div>
            <div className="pms-stat-icon" style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', color: '#16a34a' }}>✓</div>
          </div>
          <div className="pms-stat-card" style={{ borderLeft: '4px solid #0ea5e9' }}>
            <div>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>🔵 กำลังดำเนินการตรวจ</div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4, color: '#0ea5e9' }}>{activePlansCount} แผนก</div>
            </div>
            <div className="pms-stat-icon" style={{ background: '#f0f9ff', border: '1.5px solid #e0f2fe', color: '#0ea5e9' }}>⏳</div>
          </div>
          <div className="pms-stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
            <div>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>🟡 รอดำเนินการตามแผน</div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4, color: '#d97706' }}>{pendingPlansCount} แผนก</div>
            </div>
            <div className="pms-stat-icon" style={{ background: '#fffbeb', border: '1.5px solid #fef3c7', color: '#d97706' }}>📅</div>
          </div>
        </div>

        {/* ── Top Inputs Panel ── */}
        <div className="pms-card no-print">
          <div style={{ padding: '14px 18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <div>
              <label className="pms-label">วันที่เริ่มโครงการ PM</label>
              <input type="date" className="pms-input" value={pmStartDate} onChange={e => { setPmStartDate(e.target.value); setWeekOffset(0); }} />
            </div>
            <div>
              <label className="pms-label">ผู้ดูแล/หัวหน้างาน (Lead)</label>
              <select className="pms-input pms-select" value={selectedLead} onChange={e => setSelectedLead(e.target.value)}>
                <option value="ALL">ผู้ดูแลทั้งหมด</option>
                {uniqueLeads.map(l => <option key={l} value={l}>{l}</option>)}
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
            <div>
              <label className="pms-label">จำนวนเครื่อง PM ทั้งหมด</label>
              <input type="text" className="pms-input" style={{ background: '#f8fafc', color: '#64748b', fontWeight: 700 }} value={totalPlanned} readOnly />
            </div>
          </div>
        </div>

        {/* ── Gantt Chart Card ── */}
        <div className="pms-card">
          <div className="pms-header" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>📊</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>Gantt Chart แผนการตรวจ PM รายสัปดาห์</div>
                <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>
                  สัปดาห์ {weeks[0]?.label.replace('W','')} ถึง {weeks[weeks.length-1]?.label.replace('W','')} ({weeks[0]?.subLabel} – {weeks[weeks.length-1]?.subLabel} {selectedYear + 543})
                </div>
              </div>
            </div>

            <div className="no-print" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button className="pms-btn pms-btn-outline" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => setWeekOffset(prev => prev - 1)}>
                ◀ สัปดาห์ก่อนหน้า
              </button>
              <button className="pms-btn pms-btn-outline" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => setWeekOffset(0)} disabled={weekOffset === 0}>
                ↺ สัปดาห์เริ่มต้น
              </button>
              <button className="pms-btn pms-btn-outline" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => setWeekOffset(prev => prev + 1)}>
                สัปดาห์ถัดไป ▶
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto', padding: 0 }}>
            <table className="gantt-table">
              <thead>
                <tr>
                  <th style={{ width: 60, textAlign: 'center' }}>WBS</th>
                  <th style={{ minWidth: 220, textAlign: 'left' }}>บริษัท / แผนกงาน</th>
                  <th style={{ width: 60, textAlign: 'center' }}>แผน (เครื่อง)</th>
                  <th style={{ width: 60, textAlign: 'center' }}>เสร็จ (เครื่อง)</th>
                  <th style={{ width: 130, textAlign: 'center' }}>ความคืบหน้า (%)</th>
                  {weeks.map(w => (
                    <th key={w.label} style={{ width: 85, textAlign: 'center' }}>
                      {w.label}<br />
                      <span style={{ fontSize: 9, fontWeight: 400, color: '#cbd5e1' }}>{w.subLabel}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* ── Level 0: Total Summary Row ── */}
                <tr style={{ background: '#f8fafc', fontWeight: 800 }}>
                  <td style={{ textAlign: 'center', color: '#64748b' }}>1</td>
                  <td>💼 TRR GROUP (ทั้งหมดในระบบ)</td>
                  <td style={{ textAlign: 'center' }}>{totalPlanned}</td>
                  <td style={{ textAlign: 'center' }}>{totalCompleted}</td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <div className="gantt-progress-wrap">
                        <div className="gantt-progress-bar" style={{ width: `${overallPct}%`, background: getProgressColor(overallPct) }} />
                      </div>
                      <span style={{ color: getProgressColor(overallPct), minWidth: 32, textAlign: 'right' }}>{overallPct}%</span>
                    </div>
                  </td>
                  <td colSpan={weeks.length} style={{ background: 'rgba(22, 163, 74, 0.05)', textAlign: 'center', fontSize: 10, color: '#15803d', fontWeight: 700 }}>
                    {overallPct >= 100 ? '✅ เสร็จสิ้นโครงการ PM แล้ว' : '🔄 กำลังขับเคลื่อนงานตามแผน'}
                  </td>
                </tr>

                {/* ── Grouped Sites Rows ── */}
                {groupedPlans.length === 0 ? (
                  <tr>
                    <td colSpan={5 + weeks.length} style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>
                      ไม่มีข้อมูลกำหนดการตามคำค้นหา
                    </td>
                  </tr>
                ) : (
                  groupedPlans.map((group, groupIdx) => {
                    const sitePct = group.totalPlanned > 0 ? Math.round(group.totalCompleted / group.totalPlanned * 100) : 0;
                    const isExpanded = expandedSites[group.site] !== false;
                    const siteWbs = `1.${groupIdx + 1}`;

                    // Create dummy plan for site overview chart drawing
                    const siteDummyPlan = {
                      startDate: group.startDate,
                      endDate: group.endDate,
                      site: group.site,
                      deptTask: 'ภาพรวม'
                    };

                    return (
                      <React.Fragment key={group.site}>
                        {/* ── Hierarchy Level 1: Site Summary Row ── */}
                        <tr className="gantt-site-row" onClick={() => toggleSite(group.site)}>
                          <td style={{ textAlign: 'center' }}>{siteWbs}</td>
                          <td>
                            <span className="collapsible-icon">{isExpanded ? '▼' : '▶'}</span>
                            🏢 {group.site}
                          </td>
                          <td style={{ textAlign: 'center' }}>{group.totalPlanned}</td>
                          <td style={{ textAlign: 'center' }}>{group.totalCompleted}</td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                              <div className="gantt-progress-wrap" style={{ background: '#d1fae5' }}>
                                <div className="gantt-progress-bar" style={{ width: `${sitePct}%`, background: '#10b981' }} />
                              </div>
                              <span style={{ color: '#047857', minWidth: 32, textAlign: 'right' }}>{sitePct}%</span>
                            </div>
                          </td>
                          {weeks.map(w => renderGanttCell(siteDummyPlan, w, sitePct, true))}
                        </tr>

                        {/* ── Hierarchy Level 2: Department Rows under this Site ── */}
                        {isExpanded && group.plans.map((plan, planIdx) => {
                          const planPct = plan.plannedDeviceCount > 0 ? Math.round((plan.completedCount || 0) / plan.plannedDeviceCount * 100) : 0;
                          const planWbs = `${siteWbs}.${planIdx + 1}`;

                          return (
                            <tr 
                              key={plan.id} 
                              className="gantt-dept-row gantt-row-interactive" 
                              onClick={() => navigate(`/pm/runs?planId=${plan.id}`)}
                              title="คลิกเพื่อเข้าไปทำ PM Checklist"
                            >
                              <td style={{ textAlign: 'center', color: '#94a3b8' }}>{planWbs}</td>
                              <td style={{ paddingLeft: '28px', color: '#334155' }}>
                                ↳ 📁 {plan.deptTask || 'ทั่วไป'}
                              </td>
                              <td style={{ textAlign: 'center' }}>{plan.plannedDeviceCount}</td>
                              <td style={{ textAlign: 'center' }}>{plan.completedCount || 0}</td>
                              <td style={{ textAlign: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                  <div className="gantt-progress-wrap">
                                    <div className="gantt-progress-bar" style={{ width: `${planPct}%`, background: getProgressColor(planPct) }} />
                                  </div>
                                  <span style={{ color: getProgressColor(planPct), minWidth: 32, textAlign: 'right' }}>{planPct}%</span>
                                </div>
                              </td>
                              {weeks.map(w => renderGanttCell(plan, w, planPct))}
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
