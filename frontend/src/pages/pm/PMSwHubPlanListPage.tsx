import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { pmSwHubPlanService, PMSwHubPlan, pmSwHubTemplateService } from '../../services/pmSwHub';
import { formatDate } from '../../utils/dateUtils';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { Modal } from './components/Modal';


function fmtDate(d: string | Date | null) {
  if (!d) return '—';
  return formatDate(d);
}

function periodLabel(period: string) {
  if (period === 'Monthly') return 'รายเดือน';
  if (period === 'Quarterly') return 'รายไตรมาส';
  if (period === 'Annual') return 'รายปี';
  return period || '—';
}

function invalidDateRange(startDate: string, endDate: string) {
  return Boolean(startDate && endDate && new Date(startDate) > new Date(endDate));
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
export default function PMSwHubPlanListPage() {
  const currentYear = new Date().getFullYear();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<PMSwHubPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterYear, setFilterYear] = useState(currentYear); // Dynamic default
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [exporting, setExporting] = useState(false);

  // Gantt Chart View States
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [timeOffset, setTimeOffset] = useState(0);
  const [pmStartDate, setPmStartDate] = useState<string>('');

  const initialForm = {
    year: currentYear,
    floor: '',
    period: 'Monthly',
    startDate: '',
    endDate: '',
    technician: '',
    templateId: '' as string | number,
  };
  const [form, setForm] = useState(initialForm);
  const [templates, setTemplates] = useState<import('../../services/pmSwHub').PMSwHubTemplate[]>([]);

  const openCreateModal = () => {
    setEditingPlanId(null);
    setForm({ ...initialForm, year: filterYear });
    setModalOpen(true);
  };

  const handleEditPlan = (plan: PMSwHubPlan) => {
    setEditingPlanId(plan.id);
    setForm({
      year: plan.year,
      floor: plan.floor,
      period: plan.period,
      startDate: plan.startDate ? new Date(plan.startDate).toISOString().split('T')[0] : '',
      endDate: plan.endDate ? new Date(plan.endDate).toISOString().split('T')[0] : '',
      technician: plan.technician || '',
      templateId: plan.templateId ?? '',
    });
    setModalOpen(true);
  };

  // Load templates for the dropdown
  useEffect(() => {
    pmSwHubTemplateService.getAll()
      .then(res => setTemplates(res))
      .catch(() => {});
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2800); };

  const fetchPlans = () => {
    setLoading(true);
    pmSwHubPlanService.getAll()
      .then(res => {
        setPlans(res);
        
        // Find earliest start date to default PM Start Date for the selected year
        const validPlansForYear = res.filter((p: any) => p.startDate && p.year === filterYear);
        if (validPlansForYear.length > 0) {
          const minTime = Math.min(...validPlansForYear.map((p: any) => new Date(p.startDate).getTime()));
          const minDateStr = new Date(minTime).toISOString().split('T')[0];
          setPmStartDate(minDateStr);
        } else {
          setPmStartDate(`${filterYear}-01-01`);
        }
        setTimeOffset(0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPlans();
  }, [filterYear]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.floor) { showToast('⚠️ กรุณาเลือกชั้น / ห้องที่ต้องตรวจ'); return; }
    if (!form.startDate || !form.endDate) { showToast('⚠️ กรุณากำหนดวันเริ่มและวันสิ้นสุด'); return; }
    if (invalidDateRange(form.startDate, form.endDate)) { showToast('⚠️ วันที่สิ้นสุดน้อยกว่าวันที่เริ่มไม่ได้'); return; }

    setSaving(true);
    try {
    const payload = {
        ...form,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
        templateId: form.templateId ? Number(form.templateId) : null,
      };

      if (editingPlanId) {
        await pmSwHubPlanService.update(editingPlanId, payload);
        showToast('✅ อัปเดตแผนงานสำเร็จ');
      } else {
        await pmSwHubPlanService.create(payload);
        showToast('✅ บันทึกแผนงานสำเร็จ');
      }
      
      setModalOpen(false);
      setForm(initialForm);
      fetchPlans();
    } catch (err) {
      showToast('❌ บันทึกแผนไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('ยืนยันการลบแผน PM SW/Hub Room นี้?')) return;
    setSaving(true);
    try {
      await pmSwHubPlanService.delete(id);
      showToast('✅ ลบแผนสำเร็จ');
      fetchPlans();
    } catch (err) {
      showToast('❌ ลบแผนไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const yearOptions = Array.from(new Set([
    2024, 2025, 2026, 2027,
    ...plans.map((p) => p.year),
  ])).sort();

  const filtered = plans.filter((plan) => {
    const q = search.toLowerCase();
    const matchYear = plan.year === filterYear;
    const matchQ = !q || plan.floor.toLowerCase().includes(q) || plan.technician?.toLowerCase().includes(q) || plan.period.toLowerCase().includes(q);
    return matchYear && matchQ;
  });

  const stats = useMemo(() => {
    const scoped = plans.filter((plan) => plan.year === filterYear);
    const completed = scoped.filter((plan) => plan.status === 'Completed').length;
    const active = scoped.filter((plan) => plan.status !== 'Completed').length;
    const monthly = scoped.filter((plan) => plan.period === 'Monthly').length;
    return { total: scoped.length, completed, active, monthly };
  }, [plans, filterYear]);

  // Generate Gantt Columns based on viewMode
  const columns = useMemo(() => {
    const cols = [];
    const baseDate = pmStartDate ? new Date(pmStartDate) : new Date(filterYear, 0, 1);
    
    if (viewMode === 'monthly') {
      const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
      months.forEach((m, i) => {
        cols.push({
          label: m,
          start: new Date(filterYear, i, 1, 0, 0, 0, 0),
          end: new Date(filterYear, i + 1, 0, 23, 59, 59, 999)
        });
      });
    } else if (viewMode === 'weekly') {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + (timeOffset * 7));
      let current = getMonday(d);
      for (let i = 0; i < 12; i++) {
        const next = new Date(current);
        next.setDate(current.getDate() + 6);
        next.setHours(23, 59, 59, 999);
        cols.push({
          label: `W${getCalendarWeek(current)}`,
          subLabel: formatThaiMonthDay(current),
          start: new Date(current),
          end: next
        });
        current.setDate(current.getDate() + 7);
      }
    } else { // daily
      const d = new Date(baseDate);
      d.setDate(d.getDate() + timeOffset);
      let current = new Date(d);
      current.setHours(0, 0, 0, 0);
      for (let i = 0; i < 21; i++) {
        const next = new Date(current);
        next.setHours(23, 59, 59, 999);
        cols.push({
          label: current.getDate().toString(),
          subLabel: formatThaiMonthDay(current),
          start: new Date(current),
          end: next,
          isWeekend: current.getDay() === 0 || current.getDay() === 6
        });
        current.setDate(current.getDate() + 1);
      }
    }
    return cols;
  }, [viewMode, filterYear, timeOffset, pmStartDate]);

  const visiblePeriodLabel = useMemo(() => {
    if (columns.length === 0) return '';
    const start = columns[0].start;
    const end = columns[columns.length - 1].end;
    const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    
    if (viewMode === 'monthly') return `ม.ค. - ธ.ค. ${filterYear + 543}`;
    
    const startMonth = months[start.getMonth()];
    const endMonth = months[end.getMonth()];
    
    if (startMonth === endMonth) {
      return `${startMonth} ${start.getFullYear() + 543}`;
    } else {
      return `${startMonth} - ${endMonth} ${start.getFullYear() + 543}`;
    }
  }, [columns, viewMode, filterYear]);

  // Excel Export Handler
  const handleExportExcel = async () => {
    try {
      setExporting(true);
      
      // 1. Fetch template items to use as headers
      const template = await pmSwHubTemplateService.getActive();
      const templateItems = template?.items || [];
      
      const dataRows: any[] = [];
      
      // Title
      dataRows.push([`รายงานแผนงานและสรุปผลตรวจ PM SW/Hub Room ประจำปี ${filterYear + 543}`]);
      dataRows.push([`ช่วงเวลาที่แสดงผล: ${visiblePeriodLabel}`]);
      dataRows.push([]);

      // Headers
      const headers = ['ลำดับ', 'พื้นที่ / ห้อง', 'รอบการตรวจ', 'ผู้รับผิดชอบ', 'วันที่เริ่ม', 'วันที่สิ้นสุด', 'สถานะ'];
      
      // Add Gantt headers
      columns.forEach(col => {
        headers.push(`${col.label} ${col.subLabel ? `(${col.subLabel})` : ''}`);
      });
      
      // Add Checklist headers
      templateItems.forEach(item => {
        headers.push(`[${item.group}] ${item.label}`);
      });
      
      dataRows.push(headers);

      // Data
      filtered.forEach((plan, idx) => {
        const row = [
          idx + 1,
          plan.floor,
          periodLabel(plan.period),
          plan.technician || '-',
          fmtDate(plan.startDate),
          fmtDate(plan.endDate),
          plan.status === 'Completed' ? 'เสร็จสิ้น' : 'รอดำเนินการ'
        ];

        // Fill Gantt cols
        const pStart = plan.startDate ? new Date(plan.startDate) : null;
        const pEnd = plan.endDate ? new Date(plan.endDate) : null;
        columns.forEach(col => {
          const isActive = pStart && pEnd && pStart <= col.end && pEnd >= col.start;
          row.push(isActive ? (plan.status === 'Completed' ? '✓' : '●') : '');
        });

        // Fill Checklist results from the latest record (swHubs)
        const swHubs = (plan as any).swHubs;
        let latestRecord = null;
        
        if (Array.isArray(swHubs) && swHubs.length > 0) {
          latestRecord = [...swHubs].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        }
        
        templateItems.forEach(tItem => {
          if (!latestRecord || !Array.isArray(latestRecord.items)) {
            row.push('-');
          } else {
            const rItem = latestRecord.items.find((i: any) => i.checkItem === tItem.label);
            if (!rItem) {
              row.push('-');
            } else {
              row.push(rItem.status === 'pass' ? 'ผ่าน (✓)' : rItem.status === 'fail' ? 'ไม่ผ่าน (✗)' : 'N/A');
            }
          }
        });

        dataRows.push(row);
      });

      if (!XLSX || !XLSX.utils) {
        throw new Error('XLSX library is not properly loaded');
      }

      const ws = XLSX.utils.aoa_to_sheet(dataRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "PM_Report");
      
      XLSX.writeFile(wb, `Detailed_PM_SW_Hub_Report_${filterYear + 543}.xlsx`);
      showToast('🚀 ส่งออกรายงานละเอียดสำเร็จ!');
    } catch (err: any) {
      console.error('Excel Export Error:', err);
      showToast(`❌ ไม่สามารถสร้างรายงานได้: ${err.message || 'Unknown error'}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <style>{`
        .pmp-root { font-family: 'Sarabun', sans-serif; }
        .pmp-toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
          background: #0f172a; color: #fff; padding: 10px 20px; border-radius: 8px;
          font-size: 12px; z-index: 9999; box-shadow: 0 8px 24px rgba(0,0,0,.2);
          animation: pmpFadeUp .2s ease; pointer-events: none; }
        @keyframes pmpFadeUp { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        .pmp-btn { display: inline-flex; align-items: center; gap: 5px; padding: 7px 14px; border-radius: 8px;
          font-size: 12px; font-weight: 600; cursor: pointer; font-family: 'Sarabun', sans-serif;
          transition: all .15s; border: 1px solid transparent; white-space: nowrap; }
        .pmp-btn-primary { background: #0ea5e9; border-color: #0284c7; color: #fff; }
        .pmp-btn-primary:hover { background: #0284c7; }
        .pmp-btn-outline { background: #fff; border-color: #e2e8f0; color: #475569; }
        .pmp-btn-outline:hover { border-color: #0ea5e9; color: #0ea5e9; }
        .pmp-btn-danger { background: #fff; border-color: #fecaca; color: #ef4444; }
        .pmp-btn:disabled { opacity: .5; cursor: not-allowed; }
        .pmp-input { width: 100%; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px;
          font-size: 12px; font-family: 'Sarabun', sans-serif; outline: none; color: #334155;
          box-sizing: border-box; background: #fff; }
        .pmp-input:focus { border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14,165,233,.1); }
        .pmp-select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; padding-right: 30px; cursor: pointer; }
        .pmp-label { font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 4px; display: block; }
        .pmp-plan-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; transition: box-shadow .15s; }
        .pmp-plan-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.08); }
        .pmp-flow-step { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px; min-width: 150px; flex: 1; }
        .pmp-flow-step strong { display: block; font-size: 12px; color: #0f172a; margin-bottom: 2px; }
        .pmp-flow-step span { display: block; font-size: 10px; color: #64748b; line-height: 1.45; }
        
        .gantt-table { width: 100%; min-width: 600; border-collapse: collapse; font-size: 12px; }
        .gantt-table th, .gantt-table td { border-bottom: 1px solid #f1f5f9; padding: 8px 4px; }
        .gantt-bar { height: 16px; width: 100%; border-radius: 4px; transition: all 0.2s; }

        @media print {
          .no-print { display: none !important; }
          .pmp-root { padding: 0 !important; width: 100% !important; }
          .gantt-table { font-size: 10px !important; }
          .gantt-bar { border: 1px solid #ddd !important; }
          .pmp-plan-card { break-inside: avoid; border: 1px solid #eee !important; margin-bottom: 10px !important; }
          body { background: #fff !important; }
        }
      `}</style>

      <div className="pmp-root">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f0f9ff', border: '1.5px solid #bae6fd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🖧</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>แผน PM SW/Hub Room</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>วางแผนรอบตรวจห้อง Network / Hub Room — ปี {filterYear + 543}</div>
            </div>
          </div>
          <div className="no-print" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="pmp-btn pmp-btn-outline" onClick={handleExportExcel} disabled={exporting}>
              📥 {exporting ? 'กำลังสร้าง Excel...' : 'Excel Report'}
            </button>
            <button className="pmp-btn pmp-btn-outline" onClick={() => window.print()}>
              🖨️ PDF / Print
            </button>
            <select className="pmp-input pmp-select" style={{ width: 110 }} value={filterYear} onChange={e => setFilterYear(+e.target.value)}>
              {yearOptions.map(y => <option key={y} value={y}>ปี {y + 543}</option>)}
            </select>
            <button className="pmp-btn pmp-btn-outline" onClick={() => navigate('/pm/sw-hub')}>📊 Dashboard</button>
            <button className="pmp-btn pmp-btn-primary" onClick={openCreateModal}>＋ สร้างแผน SW/Hub</button>
          </div>
        </div>

        <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10, marginBottom: 18 }}>
          {[
            { icon: '📋', label: 'แผนทั้งหมด', val: stats.total, color: '#0ea5e9' },
            { icon: '🔄', label: 'กำลังดำเนินการ', val: stats.active, color: '#f59e0b' },
            { icon: '✅', label: 'เสร็จแล้ว', val: stats.completed, color: '#10b981' },
            { icon: '📅', label: 'รอบรายเดือน', val: stats.monthly, color: '#8b5cf6' },
          ].map((s) => (
            <div key={s.label} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22 }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Gantt Chart Matrix ── */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 20px', marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
              📊 ตารางแผนงานประจำปี {filterYear + 543} (Gantt Chart)
              {visiblePeriodLabel && (
                <span style={{ marginLeft: 8, color: '#0ea5e9', fontSize: 13 }}>
                  [{visiblePeriodLabel}]
                </span>
              )}
            </div>
            
            <div className="no-print" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ background: '#f1f5f9', padding: 2, borderRadius: 8, display: 'flex', gap: 2 }}>
                {(['daily', 'weekly', 'monthly'] as const).map(mode => (
                  <button 
                    key={mode}
                    onClick={() => { setViewMode(mode); setTimeOffset(0); }}
                    style={{
                      border: 'none', padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer',
                      background: viewMode === mode ? '#fff' : 'transparent',
                      color: viewMode === mode ? '#0ea5e9' : '#64748b',
                      boxShadow: viewMode === mode ? '0 1px 3px rgba(0,0,0,.1)' : 'none'
                    }}
                  >
                    {mode === 'daily' ? 'รายวัน' : mode === 'weekly' ? 'รายสัปดาห์' : 'รายเดือน'}
                  </button>
                ))}
              </div>
              
              <div style={{ display: 'flex', gap: 4 }}>
                <button 
                  className="pmp-btn pmp-btn-outline" 
                  style={{ padding: '4px 8px', fontSize: 10 }} 
                  onClick={() => {
                    if (viewMode === 'monthly') {
                      setFilterYear(prev => prev - 1);
                    } else {
                      setTimeOffset(prev => prev - (viewMode === 'weekly' ? 1 : 7));
                    }
                  }}
                >
                  ◀
                </button>
                <button 
                  className="pmp-btn pmp-btn-outline" 
                  style={{ padding: '4px 8px', fontSize: 10 }} 
                  onClick={() => {
                    setTimeOffset(0);
                    if (viewMode === 'monthly') {
                      setFilterYear(new Date().getFullYear());
                    }
                  }}
                >
                  ปัจจุบัน
                </button>
                <button 
                  className="pmp-btn pmp-btn-outline" 
                  style={{ padding: '4px 8px', fontSize: 10 }} 
                  onClick={() => {
                    if (viewMode === 'monthly') {
                      setFilterYear(prev => prev + 1);
                    } else {
                      setTimeOffset(prev => prev + (viewMode === 'weekly' ? 1 : 7));
                    }
                  }}
                >
                  ▶
                </button>
              </div>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="gantt-table">
              <thead>
                <tr>
                  <th style={{ width: 100, textAlign: 'left', color: '#64748b' }}>แผน / พื้นที่</th>
                  <th style={{ width: 60, textAlign: 'center', color: '#64748b' }}>รอบ</th>
                  <th style={{ width: 120, textAlign: 'left', color: '#64748b' }}>ผู้รับผิดชอบ</th>
                  <th style={{ width: 130, textAlign: 'left', color: '#64748b' }}>กำหนดการ</th>
                  {columns.map((col) => (
                    <th key={col.start.getTime()} style={{ textAlign: 'center', color: '#94a3b8', fontSize: 9, minWidth: viewMode === 'daily' ? 30 : 60 }}>
                      {col.label}<br />
                      {col.subLabel && <span style={{ fontWeight: 400, fontSize: 8 }}>{col.subLabel.split(' ')[0]}</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? filtered.map(plan => {
                  const pStart = plan.startDate ? new Date(plan.startDate) : null;
                  const pEnd = plan.endDate ? new Date(plan.endDate) : null;
                  return (
                    <tr key={plan.id}>
                      <td style={{ fontWeight: 600, color: '#334155' }}>
                        <span style={{ fontSize: 10, background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, marginRight: 6 }}>{plan.floor}</span>
                      </td>
                      <td style={{ textAlign: 'center', fontSize: 10, color: '#64748b' }}>{periodLabel(plan.period)}</td>
                      <td style={{ fontSize: 11, color: '#475569' }}>
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 90, display: 'block' }}>{plan.technician || '-'}</span>
                      </td>
                      <td style={{ fontSize: 10, color: '#64748b' }}>
                        <div style={{ fontWeight: 600, color: '#334155' }}>{fmtDate(plan.startDate)}</div>
                        <div style={{ fontSize: 9 }}>ถึง {fmtDate(plan.endDate)}</div>
                      </td>
                      {columns.map(col => {
                        const isActive = pStart && pEnd && pStart <= col.end && pEnd >= col.start;
                        return (
                          <td key={col.start.getTime()} style={{ textAlign: 'center', background: col.isWeekend ? 'rgba(0,0,0,0.02)' : 'transparent' }}>
                            <div className="gantt-bar" style={{
                              background: isActive ? (plan.status === 'Completed' ? '#10b981' : '#0ea5e9') : 'transparent',
                              border: isActive ? 'none' : '1px dashed #e2e8f0',
                              opacity: isActive ? 1 : 0.3
                            }} title={isActive ? `${fmtDate(plan.startDate)} - ${fmtDate(plan.endDate)}` : ''}></div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={10 + columns.length} style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>ไม่มีแผนงานในช่วงเวลานี้</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="no-print" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
          {[
            { title: '1. เลือกพื้นที่', detail: 'กำหนดชั้น / Hub Room ที่ต้องตรวจ', tone: '#0ea5e9' },
            { title: '2. กำหนดรอบ', detail: 'Monthly, Quarterly หรือ Annual', tone: '#8b5cf6' },
            { title: '3. ตรวจหน้างาน', detail: 'เปิด checklist และบันทึกผลตรวจ', tone: '#f59e0b' },
            { title: '4. ติดตามปัญหา', detail: 'ดู Fail / Open issue ใน Dashboard', tone: '#10b981' },
          ].map((step) => (
            <div key={step.title} className="pmp-flow-step" style={{ borderTop: `3px solid ${step.tone}` }}>
              <strong>{step.title}</strong>
              <span>{step.detail}</span>
            </div>
          ))}
        </div>

        <div className="no-print" style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            className="pmp-input"
            placeholder="ค้นหาชั้น / ผู้รับผิดชอบ / รอบตรวจ..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: 320 }}
          />
          <span style={{ fontSize: 12, color: '#94a3b8' }}>แสดง {filtered.length}/{plans.filter(p => p.year === filterYear).length} แผน</span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#0ea5e9' }}>⏳ กำลังโหลด...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🖧</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#475569' }}>ยังไม่มีแผน PM SW/Hub ปี {filterYear + 543}</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4, marginBottom: 16 }}>เริ่มจากสร้างแผนตามชั้นและรอบตรวจ</div>
            <button className="pmp-btn pmp-btn-primary" onClick={openCreateModal}>＋ สร้างแผนแรก</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 14 }}>
            {filtered.map((plan) => {
              const isDone = plan.status === 'Completed';
              return (
                <div className="pmp-plan-card" key={plan.id}>
                  <div style={{ height: 4, background: isDone ? '#10b981' : '#0ea5e9' }} />
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f0f9ff', border: '1px solid #bae6fd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                          🖧
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{plan.floor}</div>
                          <div style={{ fontSize: 10, color: '#64748b', fontWeight: 500, marginTop: 1 }}>ปี {plan.year + 543} · {periodLabel(plan.period)}</div>
                        </div>
                      </div>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', padding: '2px 9px', borderRadius: 99, fontSize: 10, fontWeight: 700,
                        ...(isDone ? { background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' } : { background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd' }),
                      }}>
                        {isDone ? '✅ เสร็จสิ้น' : '🔄 รอดำเนินการ'}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
                      {[
                        { lbl: '📅 เริ่ม', val: fmtDate(plan.startDate) },
                        { lbl: '🏁 สิ้นสุด', val: fmtDate(plan.endDate) },
                        { lbl: '👤 ผู้รับผิดชอบ', val: plan.technician || '—' },
                        { lbl: '🔁 รอบ', val: periodLabel(plan.period) },
                      ].map((item) => (
                        <div key={item.lbl} style={{ background: '#f8fafc', borderRadius: 6, padding: '5px 8px' }}>
                          <div style={{ fontSize: 9, color: '#94a3b8' }}>{item.lbl}</div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: '#334155' }}>{item.val}</div>
                        </div>
                      ))}
                      <div style={{ gridColumn: '1 / span 2', background: '#f8fafc', borderRadius: 6, padding: '5px 8px' }}>
                        <div style={{ fontSize: 9, color: '#94a3b8' }}>📋 PM Template (Checklist)</div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: 4 }}>
                          {plan.template ? (
                            <><span style={{ color: '#10b981' }}>✓</span> {plan.template.name}</>
                          ) : (
                            <span style={{ color: '#94a3b8', fontWeight: 400 }}>— ใช้ Template เริ่มต้น —</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="no-print" style={{ display: 'flex', gap: 6 }}>
                      {!isDone ? (
                        <button
                          className="pmp-btn pmp-btn-primary"
                          style={{ flex: 1, justifyContent: 'center' }}
                          onClick={() => navigate(`/pm/sw-hub/new?planId=${plan.id}&floor=${plan.floor.replace('F', '')}&period=${plan.period}`)}
                        >
                          🔧 ตรวจ SW/Hub
                        </button>
                      ) : (
                        <button
                          className="pmp-btn pmp-btn-outline"
                          style={{ flex: 1, justifyContent: 'center', borderColor: '#10b981', color: '#10b981' }}
                          onClick={() => navigate(`/pm/sw-hub/new?planId=${plan.id}&floor=${plan.floor.replace('F', '')}&period=${plan.period}`)}
                        >
                          ✏️ แก้ไขผลตรวจ
                        </button>
                      )}
                      
                      <button className="pmp-btn pmp-btn-outline" onClick={() => handleEditPlan(plan)} title="แก้ไขข้อมูลแผน">✏️</button>
                      <button className="pmp-btn pmp-btn-danger" onClick={() => handleDelete(plan.id)} disabled={saving} title="ลบแผน">🗑️</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          maxWidth={560}
          title={editingPlanId ? '📋 แก้ไขแผน PM SW/Hub Room' : '📋 สร้างแผน PM SW/Hub Room'}
        >
          <form onSubmit={handleSave}>
            <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="pmp-label">ปีที่วางแผน</label>
                <select className="pmp-input pmp-select" value={form.year} onChange={e => setForm(p => ({ ...p, year: +e.target.value }))}>
                  {yearOptions.map(y => <option key={y} value={y}>พ.ศ. {y + 543} ({y})</option>)}
                </select>
              </div>
              <div>
                <label className="pmp-label">ชั้น / Hub Room *</label>
                <select className="pmp-input pmp-select" value={form.floor} onChange={e => setForm(p => ({ ...p, floor: e.target.value }))}>
                  <option value="">-- เลือกชั้น --</option>
                  {['F22', 'F23', 'F24', 'F25', 'F26', 'F27'].map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="pmp-label">รอบตรวจ</label>
                <select className="pmp-input pmp-select" value={form.period} onChange={e => setForm(p => ({ ...p, period: e.target.value }))}>
                  <option value="Monthly">รายเดือน (Monthly)</option>
                  <option value="Quarterly">รายไตรมาส (Quarterly)</option>
                  <option value="Annual">รายปี (Annual)</option>
                </select>
              </div>
              <div>
                <label className="pmp-label">ผู้รับผิดชอบ</label>
                <input className="pmp-input" value={form.technician} placeholder="ชื่อผู้รับผิดชอบ" onChange={e => setForm(p => ({ ...p, technician: e.target.value }))} />
              </div>
              <div>
                <label className="pmp-label">วันที่เริ่ม *</label>
                <DatePicker
                  format="DD/MM/YYYY"
                  value={form.startDate ? dayjs(form.startDate) : null}
                  onChange={(newVal) => setForm(p => ({ ...p, startDate: newVal ? newVal.format('YYYY-MM-DD') : '' }))}
                  slotProps={{ textField: { size: 'small', fullWidth: true, sx: { bgcolor: '#fff', borderRadius: '6px' } } }}
                />
              </div>
              <div>
                <label className="pmp-label">วันที่สิ้นสุด *</label>
                <DatePicker
                  format="DD/MM/YYYY"
                  value={form.endDate ? dayjs(form.endDate) : null}
                  onChange={(newVal) => setForm(p => ({ ...p, endDate: newVal ? newVal.format('YYYY-MM-DD') : '' }))}
                  slotProps={{ textField: { size: 'small', fullWidth: true, sx: { bgcolor: '#fff', borderRadius: '6px' } } }}
                />
              </div>
              <div style={{ gridColumn: '1 / span 2' }}>
                <label className="pmp-label">📋 PM Template (Checklist)</label>
                <select
                  className="pmp-input pmp-select"
                  value={form.templateId}
                  onChange={e => setForm(p => ({ ...p, templateId: e.target.value }))}
                >
                  <option value="">— ไม่ระบุ / ใช้ Template ที่ Active อยู่ —</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.isActive ? '✓ ' : ''}{t.name}
                      {t.isActive ? ' (Active)' : ''}
                    </option>
                  ))}
                </select>
                <div style={{ marginTop: 5, fontSize: 10, color: '#94a3b8' }}>
                  {form.templateId
                    ? `เลือก: ${templates.find(t => String(t.id) === String(form.templateId))?.name || '—'} · ${templates.find(t => String(t.id) === String(form.templateId))?.items?.length ?? 0} รายการ`
                    : 'หากไม่เลือก จะใช้ Template ที่ Active อยู่ขณะตรวจ'}
                </div>
              </div>
              {form.startDate && form.endDate && (
                <div style={{ gridColumn: '1 / span 2', background: invalidDateRange(form.startDate, form.endDate) ? '#fff5f5' : '#f0f9ff', border: `1px solid ${invalidDateRange(form.startDate, form.endDate) ? '#fecaca' : '#bae6fd'}`, borderRadius: 8, padding: '8px 12px', fontSize: 11, color: invalidDateRange(form.startDate, form.endDate) ? '#dc2626' : '#0369a1' }}>
                  {invalidDateRange(form.startDate, form.endDate) ? '⚠️ วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่ม' : `📅 ระยะเวลา ${Math.round((new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / 86400000)} วัน`}
                </div>
              )}
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="pmp-btn pmp-btn-outline" onClick={() => setModalOpen(false)}>ยกเลิก</button>
              <button type="submit" className="pmp-btn pmp-btn-primary" disabled={saving}>{saving ? '⏳ กำลังบันทึก...' : '✅ บันทึกแผน'}</button>
            </div>
          </form>
        </Modal>

        {toast && <div className="pmp-toast">{toast}</div>}
      </div>
    </>
  );
}
