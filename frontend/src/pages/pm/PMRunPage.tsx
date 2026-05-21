import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { pmAPI, assetAPI } from '../../services/api';
import * as XLSX from 'xlsx';

/* ─────────────────────────────────────────────────────────────
   Types & Constants
───────────────────────────────────────────────────────────────── */
const DEFAULT_CHECKLIST = [
  { key: 'computer_name',      label: 'ตรวจสอบ Computer Name (ถูกต้องตามมาตรฐาน)', group: 'user', type: 'boolean' },
  { key: 'change_name',        label: 'เปลี่ยน Computer Name (ถ้าไม่ตรงมาตรฐาน)', group: 'user', type: 'boolean' },
  { key: 'ip_phone',           label: 'ตรวจสอบ IP Phone / หมายเลขโทรศัพท์ภายใน', group: 'user', type: 'boolean' },
  { key: 'windows_version',    label: 'ตรวจสอบ Windows Version และ Activate', group: 'os', type: 'boolean' },
  { key: 'windows_update',     label: 'ตรวจสอบ Windows Update (winver)', group: 'os', type: 'boolean' },
  { key: 'office_check',       label: 'ตรวจสอบ Microsoft Office & Activate', group: 'os', type: 'boolean' },
  { key: 'antivirus',          label: 'อัปเดต Antivirus (Virus Definition)', group: 'os', type: 'boolean' },
  { key: 'change_password',    label: 'เปลี่ยน Password Local Admin', group: 'security', type: 'boolean' },
  { key: 'usb_policy',         label: 'ตรวจสอบ USB Policy (Block/Allow)', group: 'security', type: 'boolean' },
  { key: 'glpi_agent',         label: 'ติดตั้ง/ตรวจสอบ GLPI Agent v1.6/1.7', group: 'agent', type: 'boolean' },
  { key: 'spiceworks',         label: 'ติดตั้ง Spiceworks Agent', group: 'agent', type: 'boolean' },
  { key: 'pc_audit',           label: 'PC Audit (บันทึก Hardware spec)', group: 'agent', type: 'boolean' },
  { key: 'hw_info',            label: 'HW Info (Serial No., Service Tag)', group: 'agent', type: 'boolean' },
  { key: 'cleaning',           label: 'ทำความสะอาดอุปกรณ์ (Cleaning Device)', group: 'hardware', type: 'boolean' },
  { key: 'printer',            label: 'ตรวจสอบ Printer Local', group: 'hardware', type: 'boolean' },
  { key: 'ups',                label: 'ตรวจสอบ UPS', group: 'hardware', type: 'boolean' },
  { key: 'monitor',            label: 'ตรวจสอบจอ Monitor (Monitor 1 & 2)', group: 'hardware', type: 'boolean' },
  { key: 'issue_note',         label: 'ปัญหาที่พบ / ข้อเสนอแนะ', group: 'result', type: 'text' },
  { key: 'satisfaction',       label: 'ความพึงพอใจผู้ใช้ (1–5 ดาว)', group: 'result', type: 'rating' },
  { key: 'staff_name',         label: 'เจ้าหน้าที่ผู้ทำ PM', group: 'result', type: 'text' },
];

const GROUP_INFO: Record<string, { label: string; icon: string }> = {
  user:     { label: 'ข้อมูลผู้ใช้และอุปกรณ์', icon: '👤' },
  os:       { label: 'ระบบปฏิบัติการ (OS) & Software', icon: '🪟' },
  security: { label: 'ความปลอดภัย (Security)', icon: '🔒' },
  agent:    { label: 'ติดตั้ง Agent / Tools', icon: '🛠' },
  hardware: { label: 'Hardware & Peripheral', icon: '🖥' },
  result:   { label: 'ผลการประเมิน', icon: '⭐' },
};

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
}

/* ─────────────────────────────────────────────────────────────
   Modal
───────────────────────────────────────────────────────────────── */
function Modal({ open, onClose, title, children, maxWidth = 640 }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; maxWidth?: number;
}) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth, boxShadow: '0 20px 60px rgba(0,0,0,.2)', overflow: 'hidden', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#94a3b8', padding: '2px 6px' }}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Stars
───────────────────────────────────────────────────────────────── */
function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} onClick={() => onChange(n)} style={{ fontSize: 24, cursor: 'pointer', color: n <= value ? '#f59e0b' : '#e2e8f0', transition: 'color .1s' }}>★</span>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main Page
───────────────────────────────────────────────────────────────── */
export default function PMRunPage() {
  const navigate = useNavigate();
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [plans, setPlans] = useState<any[]>([]);
  const [pmModal, setPMModal] = useState<{ open: boolean; run: any }>({ open: false, run: null });
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [exporting, setExporting] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2800); };

  const fetchData = () => {
    setLoading(true);
    Promise.all([pmAPI.runs(), pmAPI.plans()])
      .then(([r, p]) => { setRuns(r.data || []); setPlans(p.data || []); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  /* ── Filter ── */
  const filtered = runs.filter(r => {
    const q = search.toLowerCase();
    const matchQ = !q || (r.asset?.assetCode || '').toLowerCase().includes(q) || (r.asset?.ownerName || '').toLowerCase().includes(q) || (r.asset?.brand || '').toLowerCase().includes(q) || (r.asset?.model || '').toLowerCase().includes(q) || (r.asset?.serialNo || '').toLowerCase().includes(q);
    const matchStatus = !filterStatus || r.status === filterStatus;
    const matchPlan = !filterPlan || String(r.plan?.id) === filterPlan;
    return matchQ && matchStatus && matchPlan;
  });

  /* ── Open PM Checklist ── */
  const openPM = (run: any) => {
    // Pre-fill from existing answers if run is in progress
    const pre: Record<string, any> = {};
    (run.answers || []).forEach((a: any) => { pre[a.key || a.itemKey] = a.value; });
    setAnswers(pre);
    setPMModal({ open: true, run });
  };

  /* ── Get checklist items (template or default) ── */
  const getChecklistItems = (run: any) => {
    const items = run?.plan?.template?.templateItems;
    if (items?.length > 0) return items;
    return DEFAULT_CHECKLIST;
  };

  /* ── Save PM ── */
  const handleSave = async () => {
    const run = pmModal.run;
    if (!run) return;
    setSaving(true);
    try {
      const items = getChecklistItems(run);
      const answerList = items.map((item: any) => ({
        itemId: item.id,
        key: item.key,
        value: answers[item.key] !== undefined ? String(answers[item.key]) : '',
      }));
      await pmAPI.performRun(run.id, { answers: answerList });
      showToast(`✅ บันทึก PM สำหรับ ${run.asset?.assetCode} สำเร็จ`);
      setPMModal({ open: false, run: null });
      fetchData();
    } catch (err: any) {
      showToast(`❌ ${err.response?.data?.error || 'บันทึกไม่สำเร็จ'}`);
    } finally { setSaving(false); }
  };

  /* ── Export Excel ── */
  const handleExport = async () => {
    setExporting(true);
    try {
      const exportRows = filtered.map((r, idx) => {
        const row: any = {
          '#': idx + 1,
          'รหัสทรัพย์สิน': r.asset?.assetCode || '',
          'Serial No.': r.asset?.serialNo || '',
          'ยี่ห้อ': r.asset?.brand || '',
          'รุ่น': r.asset?.model || '',
          'ผู้ถือครอง': r.asset?.ownerName || '',
          'แผนก': r.asset?.department || r.plan?.deptTask || '',
          'Location': r.asset?.location || r.plan?.site || '',
          'แผน PM': r.plan?.deptTask || r.plan?.site || '',
          'สถานะ': r.status === 'COMPLETED' ? 'เสร็จแล้ว' : r.status === 'IN_PROGRESS' ? 'กำลังทำ' : 'รอดำเนินการ',
          'ผู้ทำ PM': r.performer?.displayName || '',
          'วันที่ PM': r.completedAt ? new Date(r.completedAt).toLocaleDateString('th-TH') : '',
        };
        // Flatten checklist answers
        (r.answers || []).forEach((a: any) => {
          row[a.label || a.key] = a.value;
        });
        return row;
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportRows);
      ws['!cols'] = Object.keys(exportRows[0] || {}).map(k => ({ wch: Math.max(k.length + 4, 14) }));
      XLSX.utils.book_append_sheet(wb, ws, 'PM Results');
      XLSX.writeFile(wb, `PM-Results-${new Date().toISOString().split('T')[0]}.xlsx`);
      showToast(`✅ Export สำเร็จ ${exportRows.length} รายการ`);
    } catch (err) {
      showToast('❌ Export ไม่สำเร็จ');
    } finally { setExporting(false); }
  };

  /* ── Stats ── */
  const done = runs.filter(r => r.status === 'COMPLETED').length;
  const pending = runs.filter(r => r.status === 'DRAFT').length;
  const inProgress = runs.filter(r => r.status === 'IN_PROGRESS').length;

  /* ── Checklist progress for current modal ── */
  const checkItems = pmModal.run ? getChecklistItems(pmModal.run) : [];
  const boolItems = checkItems.filter((i: any) => i.type === 'boolean');
  const answeredBool = boolItems.filter((i: any) => answers[i.key] !== undefined).length;
  const checkPct = boolItems.length > 0 ? Math.round(answeredBool / boolItems.length * 100) : 0;

  return (
    <>
      <style>{`
        .pmr-root { font-family: 'Sarabun', sans-serif; }
        .pmr-toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
          background: #0f172a; color: #fff; padding: 10px 20px; border-radius: 8px;
          font-size: 12px; z-index: 9999; box-shadow: 0 8px 24px rgba(0,0,0,.2);
          animation: pmrFadeUp .2s ease; pointer-events: none; white-space: nowrap; }
        @keyframes pmrFadeUp { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        .pmr-btn { display: inline-flex; align-items: center; gap: 5px; padding: 7px 14px; border-radius: 8px;
          font-size: 12px; font-weight: 600; cursor: pointer; font-family: 'Sarabun', sans-serif;
          transition: all .15s; border: 1px solid transparent; white-space: nowrap; }
        .pmr-btn-primary { background: #0ea5e9; border-color: #0284c7; color: #fff; }
        .pmr-btn-primary:hover { background: #0284c7; }
        .pmr-btn-success { background: #10b981; border-color: #059669; color: #fff; }
        .pmr-btn-success:hover { filter: brightness(1.08); }
        .pmr-btn-outline { background: #fff; border-color: #e2e8f0; color: #475569; }
        .pmr-btn-outline:hover { border-color: #0ea5e9; color: #0ea5e9; }
        .pmr-btn:disabled { opacity: .5; cursor: not-allowed; }
        .pmr-input { border: 1px solid #e2e8f0; border-radius: 8px; padding: 7px 10px;
          font-size: 12px; font-family: 'Sarabun', sans-serif; outline: none; color: #334155; background: #fff; }
        .pmr-input:focus { border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14,165,233,.1); }
        .pmr-select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; padding-right: 28px; cursor: pointer; }
        .pmr-row { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-bottom: 1px solid #f1f5f9; transition: background .1s; }
        .pmr-row:last-child { border-bottom: none; }
        .pmr-row:hover { background: #f8fafc; }
        .pmr-check-row { display: flex; align-items: flex-start; gap: 10px; padding: 10px 0; border-bottom: 1px solid #f8fafc; }
        .pmr-check-row:last-child { border-bottom: none; }
        .pmr-radio { padding: 4px 10px; border-radius: 99px; font-size: 11px; font-weight: 600;
          cursor: pointer; border: 1.5px solid #e2e8f0; background: #fff; color: #64748b;
          transition: all .15s; font-family: 'Sarabun', sans-serif; }
        .pmr-radio:hover { border-color: #0ea5e9; color: #0ea5e9; }
        .pmr-radio.sel-yes { background: #f0fdf4; border-color: #86efac; color: #16a34a; }
        .pmr-radio.sel-no  { background: #fff5f5; border-color: #fca5a5; color: #dc2626; }
        .pmr-radio.sel-na  { background: #f8fafc; border-color: #cbd5e1; color: #64748b; }
        .pmr-group-hd { padding: 8px 0 4px; font-size: 10px; font-weight: 700; color: #64748b;
          text-transform: uppercase; letter-spacing: .06em; display: flex; align-items: center; gap: 5px;
          margin-top: 8px; border-top: 1px solid #f1f5f9; }
      `}</style>

      <div className="pmr-root">

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f0fdf4', border: '1.5px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🔧</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>งาน PM (PM Workload)</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>ดำเนินการ PM ตาม Checklist และบันทึกผล</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="pmr-btn pmr-btn-outline" onClick={handleExport} disabled={exporting || filtered.length === 0}>
              {exporting ? '⏳' : '📥'} Export Excel
            </button>
            <button className="pmr-btn pmr-btn-primary" onClick={() => navigate('/pm/plans')}>📋 จัดการแผน</button>
          </div>
        </div>

        {/* ── Stats ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 10, marginBottom: 16 }}>
          {[
            { icon: '📦', label: 'ทั้งหมด', val: runs.length, color: '#0ea5e9' },
            { icon: '✅', label: 'เสร็จแล้ว', val: done, color: '#10b981' },
            { icon: '🔄', label: 'กำลังทำ', val: inProgress, color: '#8b5cf6' },
            { icon: '⏳', label: 'รอดำเนินการ', val: pending, color: '#f59e0b' },
            { icon: '📊', label: '% เสร็จ', val: runs.length > 0 ? `${Math.round(done / runs.length * 100)}%` : '0%', color: '#10b981' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Filter toolbar ── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 14px' }}>
          <input
            className="pmr-input"
            style={{ flex: 1, minWidth: 200,
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='m21 21-4.35-4.35'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat', backgroundPosition: '10px center', paddingLeft: 32,
            }}
            placeholder="ค้นหา รหัส / ชื่อผู้ใช้ / รุ่น..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className="pmr-input pmr-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">ทุกสถานะ</option>
            <option value="DRAFT">⏳ รอดำเนินการ</option>
            <option value="IN_PROGRESS">🔄 กำลังทำ</option>
            <option value="COMPLETED">✅ เสร็จแล้ว</option>
          </select>
          <select className="pmr-input pmr-select" value={filterPlan} onChange={e => setFilterPlan(e.target.value)}>
            <option value="">ทุกแผน</option>
            {plans.map(p => <option key={p.id} value={p.id}>{p.deptTask || p.site || `Plan #${p.id}`}</option>)}
          </select>
          <span style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>แสดง {filtered.length}/{runs.length}</span>
        </div>

        {/* ── Table ── */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#0ea5e9', fontSize: 13 }}>⏳ กำลังโหลด...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔧</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>ไม่พบรายการ PM</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>
                {runs.length === 0 ? 'ยังไม่มีงาน PM — ไปสร้างแผนและ Generate งานก่อน' : 'ลองปรับ filter หรือคำค้นหา'}
              </div>
              {runs.length === 0 && (
                <button className="pmr-btn pmr-btn-primary" style={{ marginTop: 12 }} onClick={() => navigate('/pm/plans')}>
                  📋 ไปสร้างแผน PM
                </button>
              )}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {['#', 'รหัสทรัพย์สิน', 'ยี่ห้อ / รุ่น', 'ผู้ถือครอง', 'แผนก / Location', 'แผน PM', 'สถานะ', 'วันที่เสร็จ', 'จัดการ'].map((h, i) => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: i === 8 ? 'center' : 'left', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.05em', whiteSpace: 'nowrap', width: i === 0 ? 40 : undefined }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, idx) => {
                  const isDone = r.status === 'COMPLETED';
                  const isInProgress = r.status === 'IN_PROGRESS';
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background .1s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f8fafc'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
                    >
                      <td style={{ padding: '10px 14px', color: '#cbd5e1', fontSize: 11 }}>{idx + 1}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <code style={{ fontSize: 11, fontWeight: 700, background: '#f0f9ff', padding: '2px 7px', borderRadius: 4, color: '#0369a1' }}>{r.asset?.assetCode || '—'}</code>
                        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{r.asset?.serialNo || ''}</div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{r.asset?.brand || '—'}</div>
                        <div style={{ fontSize: 10, color: '#94a3b8' }}>{r.asset?.model || ''}</div>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 11, color: '#475569' }}>{r.asset?.ownerName || '—'}</td>
                      <td style={{ padding: '10px 14px', fontSize: 11, color: '#475569' }}>
                        {r.asset?.department || r.plan?.deptTask || r.asset?.location || r.plan?.site || '—'}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontSize: 10, fontWeight: 600, background: '#f1f5f9', padding: '2px 8px', borderRadius: 5, color: '#64748b' }}>
                          {r.plan?.deptTask || r.plan?.site || `Plan #${r.plan?.id}`}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 9px', borderRadius: 99, fontSize: 10, fontWeight: 700,
                          ...(isDone ? { background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }
                            : isInProgress ? { background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe' }
                            : { background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a' }),
                        }}>
                          {isDone ? '✅ เสร็จแล้ว' : isInProgress ? '🔄 กำลังทำ' : '⏳ รอดำเนินการ'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 11, color: '#64748b' }}>
                        {r.completedAt ? new Date(r.completedAt).toLocaleDateString('th-TH') : '—'}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        {!isDone ? (
                          <button className="pmr-btn pmr-btn-success" style={{ padding: '5px 12px', fontSize: 11 }} onClick={() => openPM(r)}>
                            🔧 ทำ PM
                          </button>
                        ) : (
                          <button className="pmr-btn pmr-btn-outline" style={{ padding: '5px 12px', fontSize: 11 }} onClick={() => openPM(r)}>
                            👁 ดูผล
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── PM Checklist Modal ── */}
      <Modal open={pmModal.open} onClose={() => setPMModal({ open: false, run: null })} maxWidth={680}
        title={`🔧 PM: ${pmModal.run?.asset?.assetCode || ''} — ${pmModal.run?.asset?.brand || ''} ${pmModal.run?.asset?.model || ''}`}
      >
        {pmModal.run && (() => {
          const items = getChecklistItems(pmModal.run);
          const groups = Array.from(new Set(items.map((i: any) => i.group)));
          const isDoneRun = pmModal.run.status === 'COMPLETED';

          return (
            <>
              {/* Asset info bar */}
              <div style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9', padding: '10px 20px', display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {[
                  { lbl: 'ผู้ถือครอง', val: pmModal.run.asset?.ownerName || '—' },
                  { lbl: 'แผนก', val: pmModal.run.asset?.department || pmModal.run.plan?.deptTask || '—' },
                  { lbl: 'Location', val: pmModal.run.asset?.location || pmModal.run.plan?.site || '—' },
                  { lbl: 'Serial No.', val: pmModal.run.asset?.serialNo || '—' },
                ].map(i => (
                  <div key={i.lbl}>
                    <div style={{ fontSize: 9, color: '#94a3b8', marginBottom: 1 }}>{i.lbl}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#334155' }}>{i.val}</div>
                  </div>
                ))}
              </div>

              {/* Progress bar */}
              <div style={{ padding: '10px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>Checklist</span>
                <div style={{ flex: 1, background: '#f1f5f9', borderRadius: 99, height: 6, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 99, background: '#10b981', width: `${checkPct}%`, transition: 'width .3s' }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981', minWidth: 40 }}>{checkPct}%</span>
                <span style={{ fontSize: 10, color: '#94a3b8' }}>{answeredBool}/{boolItems.length}</span>
              </div>

              {/* Checklist items */}
              <div style={{ padding: '0 20px 12px' }}>
                {groups.map((group: any) => {
                  const groupItems = items.filter((i: any) => i.group === group);
                  const gi = GROUP_INFO[group] || { label: group, icon: '📌' };
                  return (
                    <div key={group}>
                      <div className="pmr-group-hd">{gi.icon} {gi.label}</div>
                      {groupItems.map((item: any, itemIdx: number) => (
                        <div key={item.key} className="pmr-check-row">
                          <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#f1f5f9', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#94a3b8', flexShrink: 0, marginTop: 2 }}>
                            {items.indexOf(item) + 1}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, color: '#334155', fontWeight: 500, marginBottom: item.type !== 'boolean' ? 6 : 0 }}>{item.label}</div>
                            {item.type === 'boolean' && (
                              <div style={{ display: 'flex', gap: 5, marginTop: 4 }}>
                                {[{ val: 'yes', lbl: '✓ ใช่' }, { val: 'no', lbl: '✗ ไม่' }, { val: 'na', lbl: '— N/A' }].map(opt => (
                                  <button key={opt.val}
                                    className={`pmr-radio ${answers[item.key] === opt.val ? `sel-${opt.val}` : ''}`}
                                    onClick={() => !isDoneRun && setAnswers(p => ({ ...p, [item.key]: opt.val }))}
                                    disabled={isDoneRun}
                                  >{opt.lbl}</button>
                                ))}
                              </div>
                            )}
                            {item.type === 'text' && (
                              <textarea disabled={isDoneRun} style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '7px 10px', fontSize: 11, fontFamily: 'Sarabun,sans-serif', minHeight: 60, resize: 'vertical', boxSizing: 'border-box', outline: 'none', color: '#334155', background: isDoneRun ? '#f8fafc' : '#fff' }}
                                placeholder={item.key === 'issue_note' ? 'บันทึกปัญหาที่พบ...' : 'ระบุ...'}
                                value={answers[item.key] || ''}
                                onChange={e => setAnswers(p => ({ ...p, [item.key]: e.target.value }))}
                              />
                            )}
                            {item.type === 'rating' && (
                              <StarRating value={parseInt(answers[item.key] || '0')} onChange={v => !isDoneRun && setAnswers(p => ({ ...p, [item.key]: String(v) }))} />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
                <button className="pmr-btn pmr-btn-outline" onClick={() => setPMModal({ open: false, run: null })}>ปิด</button>
                {!isDoneRun && (
                  <button className="pmr-btn pmr-btn-success" onClick={handleSave} disabled={saving}>
                    {saving ? '⏳ กำลังบันทึก...' : '💾 บันทึกผล PM'}
                  </button>
                )}
              </div>
            </>
          );
        })()}
      </Modal>

      {toast && <div className="pmr-toast">{toast}</div>}
    </>
  );
}
