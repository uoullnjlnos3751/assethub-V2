import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { pmAPI } from '../../services/api';
import * as XLSX from 'xlsx';

// Helper to format date
function fmtDate(d: string | null) {
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
  // Set to nearest Thursday: current date + 4 - current day number
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  // Get first day of year
  const yearStart = new Date(d.getFullYear(), 0, 1);
  // Calculate full weeks
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
        
        // Find earliest start date to default PM Start Date
        const validPlans = plansList.filter((p: any) => p.startDate);
        if (validPlans.length > 0) {
          const minTime = Math.min(...validPlans.map((p: any) => new Date(p.startDate).getTime()));
          // Format as YYYY-MM-DD
          const minDateStr = new Date(minTime).toISOString().split('T')[0];
          setPmStartDate(minDateStr);
        } else {
          setPmStartDate(new Date().toISOString().split('T')[0]);
        }
      })
      .catch(err => console.error('Error fetching PM plans:', err))
      .finally(() => setLoading(false));
  }, [selectedYear]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, gap: 10, color: '#0ea5e9', fontSize: 14 }}>
        ⏳ กำลังโหลดกำหนดการ PM...
      </div>
    );
  }

  // Filter plans by selected Lead and Search Term
  const filteredPlans = plans.filter(p => {
    const matchesLead = selectedLead === 'ALL' || p.lead === selectedLead;
    const isDept = Boolean(p.deptTask);
    const label = (isDept ? p.deptTask : p.site) || '';
    const matchesSearch = label.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesLead && matchesSearch;
  });

  // Unique leads list for the dropdown
  const uniqueLeads = Array.from(new Set(plans.map((p: any) => p.lead).filter(Boolean))) as string[];

  // Calculate total machines and completed machines
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

  // Generate 8 weeks starting from the user-selected or auto-detected PM Start Date + offset
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

  // Progress color selector
  const getProgressColor = (pct: number) => {
    if (pct >= 100) return '#10b981';
    if (pct >= 50) return '#0ea5e9';
    if (pct >= 20) return '#f59e0b';
    return '#ef4444';
  };

  // Excel Export Handler
  const handleExportExcel = () => {
    try {
      setExporting(true);
      const dataRows: any[] = [];

      // Title & Settings Headers
      dataRows.push(['รายงานกำหนดการ PM (PM Schedule)']);
      dataRows.push([`ปีโครงการ: ${selectedYear + 543}`, `หัวหน้าโครงการ: ${selectedLead === 'ALL' ? 'ทั้งหมด' : selectedLead}`, `วันเริ่ม PM: ${pmStartDate || '—'}`]);
      dataRows.push([]); // blank line spacer
      
      // Table Header Row
      const tableHeaders = ['WBS', 'แผนก / Task', 'จำนวนเครื่องทั้งหมด', 'เสร็จแล้ว', 'ความสำเร็จ (%)', 'สถานะ'];
      weeks.forEach(w => {
        tableHeaders.push(`${w.label} (${w.subLabel})`);
      });
      dataRows.push(tableHeaders);

      // Summary Row (WBS 1)
      const summaryRow = [
        '1',
        'TRR Corp (ทั้งหมด)',
        totalPlanned,
        totalCompleted,
        `${overallPct}%`,
        overallPct >= 100 ? 'เสร็จสิ้นแล้ว' : 'กำลังดำเนินการ'
      ];
      weeks.forEach(() => {
        summaryRow.push(overallPct >= 100 ? 'เสร็จสิ้นแล้ว' : 'กำลังดำเนินการ');
      });
      dataRows.push(summaryRow);

      // Individual Rows (WBS 1.1, 1.2, ...)
      filteredPlans.forEach((plan, idx) => {
        const isDept = Boolean(plan.deptTask);
        const label = isDept ? plan.deptTask : plan.site;
        const pct = plan.plannedDeviceCount > 0 ? Math.round((plan.completedCount || 0) / plan.plannedDeviceCount * 100) : 0;
        
        const startVal = plan.startDate ? new Date(plan.startDate) : null;
        const endVal = plan.endDate ? new Date(plan.endDate) : null;

        const row = [
          `1.${idx + 1}`,
          label || 'ทั่วไป',
          plan.plannedDeviceCount,
          plan.completedCount || 0,
          `${pct}%`,
          pct >= 100 ? 'เสร็จสิ้น' : pct > 0 ? 'กำลังดำเนินการ' : 'รอตรวจนับ'
        ];

        weeks.forEach(w => {
          const covers = startVal && endVal && startVal <= w.end && endVal >= w.start;
          if (covers) {
            if (pct >= 100) {
              row.push('เสร็จสิ้น (✓)');
            } else if (pct > 0) {
              row.push('กำลังดำเนินการ (⏳)');
            } else {
              row.push('ตามแผน (📅)');
            }
          } else {
            row.push('');
          }
        });

        dataRows.push(row);
      });

      // Generate spreadsheet
      const ws = XLSX.utils.aoa_to_sheet(dataRows);
      
      // Auto width formatting
      const colWidths = tableHeaders.map((_, colIdx) => {
        let maxLen = 10;
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
      
      XLSX.writeFile(wb, `PM_Schedule_${selectedYear + 543}.xlsx`);
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
        .pms-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.05); margin-bottom: 16px; }
        .pms-header { padding: 14px 18px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; gap: 10px; background: linear-gradient(135deg, #f8fafc 0%, #fff 100%); }
        .pms-input { width: 100%; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; font-size: 12px; font-family: 'Sarabun', sans-serif; outline: none; background: #fff; box-sizing: border-box; }
        .pms-input:focus { border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14,165,233,.1); }
        .pms-select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; padding-right: 30px; cursor: pointer; }
        .pms-label { font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 4px; display: block; }
        
        .pms-stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-bottom: 16px; }
        .pms-stat-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 1px 3px rgba(0,0,0,.05); }
        .pms-stat-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; }
        .pms-toast { position: fixed; bottom: 24px; right: 24px; background: #0f172a; color: #fff; padding: 12px 20px; border-radius: 8px; font-size: 13px; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,.15); z-index: 9999; animation: slideIn 0.2s ease-out; }

        .gantt-table { border-collapse: collapse; font-size: 11px; width: 100%; }
        .gantt-table th, .gantt-table td { border: 1px solid #e2e8f0; padding: 8px 12px; white-space: nowrap; vertical-align: middle; }
        .gantt-table thead th { background: #f8fafc; font-weight: 700; color: #475569; text-align: center; }
        .gantt-progress-wrap { background: #f1f5f9; border-radius: 99px; height: 6px; overflow: hidden; width: 70px; display: inline-block; }
        .gantt-progress-bar { height: 100%; border-radius: 99px; transition: width .3s; }
        .gantt-cell-fill-done { background: rgba(16, 185, 129, 0.25); color: #16a34a; font-weight: bold; text-align: center; font-size: 11px; }
        .gantt-cell-fill-pending { background: rgba(14, 165, 233, 0.25); color: #0ea5e9; font-weight: bold; text-align: center; font-size: 11px; }
        .gantt-cell-fill-scheduled { background: rgba(245, 158, 11, 0.20); color: #d97706; font-weight: bold; text-align: center; font-size: 11px; }
        .gantt-cell-empty { background: transparent; }
        
        .pms-btn { display: inline-flex; align-items: center; gap: 5px; padding: 7px 14px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: 'Sarabun', sans-serif; transition: all .15s; border: 1px solid transparent; white-space: nowrap; }
        .pms-btn-outline { background: #fff; border-color: #e2e8f0; color: #475569; }
        .pms-btn-outline:hover { border-color: #0ea5e9; color: #0ea5e9; }
        .gantt-row-interactive { cursor: pointer; transition: background .15s; }
        .gantt-row-interactive:hover { background: #f8fafc !important; }

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
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f5f3ff', border: '1.5px solid #ddd6fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📅</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>กำหนดการ PM (PM Schedule)</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>แผนการทำ PM แยกตามแผนก / สัปดาห์ — ปี {selectedYear + 543}</div>
            </div>
          </div>
          <div className="no-print" style={{ display: 'flex', gap: 8 }}>
            <button className="pms-btn pms-btn-outline" onClick={handleExportExcel} disabled={exporting}>
              📥 {exporting ? 'กำลังส่งออก...' : 'ส่งออก Excel'}
            </button>
            <button className="pms-btn pms-btn-outline" onClick={() => window.print()}>
              🖨️ พิมพ์รายงาน
            </button>
            <button className="pms-btn pms-btn-outline" onClick={() => navigate('/pm')} style={{ background: '#f1f5f9' }}>
              📊 กลับหน้า Dashboard
            </button>
          </div>
        </div>

        {/* ── Status Cards Grid ── */}
        <div className="pms-stat-grid no-print">
          <div className="pms-stat-card">
            <div>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>🟢 เสร็จสิ้นแล้ว</div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4, color: '#16a34a' }}>{completedPlansCount} แผน</div>
            </div>
            <div className="pms-stat-icon" style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', color: '#16a34a' }}>✓</div>
          </div>
          <div className="pms-stat-card">
            <div>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>🔵 กำลังดำเนินการ</div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4, color: '#0ea5e9' }}>{activePlansCount} แผน</div>
            </div>
            <div className="pms-stat-icon" style={{ background: '#f0f9ff', border: '1.5px solid #e0f2fe', color: '#0ea5e9' }}>⏳</div>
          </div>
          <div className="pms-stat-card">
            <div>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>🟡 รอตรวจนับ / ตามแผน</div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4, color: '#d97706' }}>{pendingPlansCount} แผน</div>
            </div>
            <div className="pms-stat-icon" style={{ background: '#fffbeb', border: '1.5px solid #fef3c7', color: '#d97706' }}>📅</div>
          </div>
        </div>

        {/* ── Top Inputs Panel ── */}
        <div className="pms-card no-print">
          <div style={{ padding: '14px 18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <div>
              <label className="pms-label">วันเริ่ม PM</label>
              <input type="date" className="pms-input" value={pmStartDate} onChange={e => { setPmStartDate(e.target.value); setWeekOffset(0); }} />
            </div>
            <div>
              <label className="pms-label">หัวหน้าโครงการ</label>
              <select className="pms-input pms-select" value={selectedLead} onChange={e => setSelectedLead(e.target.value)}>
                <option value="ALL">ทั้งหมด (All Leads)</option>
                {uniqueLeads.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="pms-label">ค้นหา แผนก / Site</label>
              <input
                type="text"
                className="pms-input"
                placeholder="พิมพ์ชื่อแผนก หรือ Site..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <label className="pms-label">จำนวนเครื่องทั้งหมด</label>
              <input type="text" className="pms-input" style={{ background: '#f8fafc', color: '#64748b' }} value={totalPlanned} readOnly />
            </div>
          </div>
        </div>

        {/* ── Gantt Chart Card ── */}
        <div className="pms-card">
          <div className="pms-header" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16 }}>📊</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>PM Gantt Chart — แผนรายสัปดาห์</div>
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>
                  Week {weeks[0]?.label.replace('W','')}–{weeks[weeks.length-1]?.label.replace('W','')} ({weeks[0]?.subLabel} – {weeks[weeks.length-1]?.subLabel} {selectedYear + 543})
                </div>
              </div>
            </div>

            <div className="no-print" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button className="pms-btn pms-btn-outline" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => setWeekOffset(prev => prev - 1)}>
                ◀ ย้อนกลับ
              </button>
              <button className="pms-btn pms-btn-outline" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => setWeekOffset(0)} disabled={weekOffset === 0}>
                ↺ วันแรก
              </button>
              <button className="pms-btn pms-btn-outline" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => setWeekOffset(prev => prev + 1)}>
                ถัดไป ▶
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto', padding: 0 }}>
            <table className="gantt-table">
              <thead>
                <tr>
                  <th style={{ width: 50, textAlign: 'center' }}>WBS</th>
                  <th style={{ minWidth: 180, textAlign: 'left' }}>แผนก / Task</th>
                  <th style={{ width: 60, textAlign: 'center' }}>เครื่อง</th>
                  <th style={{ width: 60, textAlign: 'center' }}>เสร็จ</th>
                  <th style={{ width: 120, textAlign: 'center' }}>% Done</th>
                  {weeks.map(w => (
                    <th key={w.label} style={{ width: 80, textAlign: 'center' }}>
                      {w.label}<br />
                      <span style={{ fontSize: 9, fontWeight: 400, color: '#94a3b8' }}>{w.subLabel}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* ── Summary Row (WBS 1) ── */}
                <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                  <td style={{ textAlign: 'center' }}>1</td>
                  <td>TRR Corp (ทั้งหมด)</td>
                  <td style={{ textAlign: 'center' }}>{totalPlanned}</td>
                  <td style={{ textAlign: 'center' }}>{totalCompleted}</td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <div className="gantt-progress-wrap">
                        <div className="gantt-progress-bar" style={{ width: `${overallPct}%`, background: getProgressColor(overallPct) }} />
                      </div>
                      <span style={{ color: getProgressColor(overallPct), minWidth: 30, textAlign: 'right' }}>{overallPct}%</span>
                    </div>
                  </td>
                  <td colSpan={weeks.length} style={{ background: 'rgba(14,165,233,.08)', textAlign: 'center', fontSize: 10, color: '#0ea5e9', fontWeight: 600 }}>
                    {overallPct >= 100 ? '✅ เสร็จสิ้นแล้ว' : '🔄 กำลังดำเนินการ'}
                  </td>
                </tr>

                {/* ── Individual Plan Rows (WBS 1.1, 1.2, ...) ── */}
                {filteredPlans.length === 0 ? (
                  <tr>
                    <td colSpan={5 + weeks.length} style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>
                      ยังไม่มีแผน PM สำหรับเงื่อนไขการค้นหา
                    </td>
                  </tr>
                ) : (
                  filteredPlans.map((plan, idx) => {
                    const isDept = Boolean(plan.deptTask);
                    const label = isDept ? plan.deptTask : plan.site;
                    const pct = plan.plannedDeviceCount > 0 ? Math.round((plan.completedCount || 0) / plan.plannedDeviceCount * 100) : 0;
                    
                    const startVal = plan.startDate ? new Date(plan.startDate) : null;
                    const endVal = plan.endDate ? new Date(plan.endDate) : null;

                    return (
                      <tr key={plan.id} className="gantt-row-interactive" onClick={() => navigate(`/pm/runs?planId=${plan.id}`)} title="คลิกเพื่อทำ PM Checklist สำหรับแผนนี้">
                        <td style={{ textAlign: 'center', color: '#94a3b8' }}>1.{idx + 1}</td>
                        <td style={{ fontWeight: 600 }}>{label || 'ทั่วไป'}</td>
                        <td style={{ textAlign: 'center' }}>{plan.plannedDeviceCount}</td>
                        <td style={{ textAlign: 'center' }}>{plan.completedCount || 0}</td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            <div className="gantt-progress-wrap">
                              <div className="gantt-progress-bar" style={{ width: `${pct}%`, background: getProgressColor(pct) }} />
                            </div>
                            <span style={{ color: getProgressColor(pct), minWidth: 30, textAlign: 'right' }}>{pct}%</span>
                          </div>
                        </td>
                        {weeks.map(w => {
                          // Check if plan schedule covers this week
                          const covers = startVal && endVal && startVal <= w.end && endVal >= w.start;
                          if (covers) {
                            if (pct >= 100) {
                              return <td key={w.label} className="gantt-cell-fill-done">✓</td>;
                            } else if (pct > 0) {
                              return <td key={w.label} className="gantt-cell-fill-pending">⏳</td>;
                            } else {
                              return <td key={w.label} className="gantt-cell-fill-scheduled">📅</td>;
                            }
                          }
                          return <td key={w.label} className="gantt-cell-empty"></td>;
                        })}
                      </tr>
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

