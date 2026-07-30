import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { pmSwHubService, PMSwHub, PMSwHubItem } from '../../services/pmSwHub';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatDate } from '../../utils/dateUtils';

const FLOORS = [22, 23, 24, 25, 26, 27];

function fmtDate(d: string | null | Date) {
  if (!d) return '—';
  return formatDate(d as string);
}

function statusTone(status: string) {
  return status === 'Pass'
    ? { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0', label: 'ผ่าน' }
    : { bg: '#fff5f5', color: '#dc2626', border: '#fecaca', label: 'พบปัญหา' };
}

/* ─── Floor status per latest record ─── */
interface FloorStatus {
  floor: number;
  status: 'pass' | 'fail' | 'none';
  passCount: number;
  failCount: number;
  lastDate: string | null;
  lastTechnician: string | null;
  record: PMSwHub | null;
}

/* ─── PDF Print helper ─── */
function printRecordReport(record: PMSwHub) {
  const thaiDate = (d: string) => {
    const dt = new Date(d);
    return dt.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const passItems = record.items.filter(i => i.status === 'pass');
  const failItems = record.items.filter(i => i.status === 'fail');
  const naItems = record.items.filter(i => i.status === 'na');

  const rows = record.items.map((item, idx) => {
    const statusLabel = item.status === 'pass' ? '✓ ผ่าน' : item.status === 'fail' ? '✗ ไม่ผ่าน' : '— N/A';
    const statusColor = item.status === 'pass' ? '#16a34a' : item.status === 'fail' ? '#dc2626' : '#64748b';
    return `
      <tr style="border-bottom:1px solid #f1f5f9; page-break-inside:avoid;">
        <td style="padding:7px 10px; font-size:11px; color:#64748b; text-align:center; border-right:1px solid #f1f5f9;">${idx + 1}</td>
        <td style="padding:7px 10px; font-size:11px; color:#475569; border-right:1px solid #f1f5f9;">${item.category}</td>
        <td style="padding:7px 10px; font-size:11px; color:#0f172a;">${item.checkItem}</td>
        <td style="padding:7px 10px; font-size:11px; color:${statusColor}; font-weight:700; text-align:center; border-left:1px solid #f1f5f9;">${statusLabel}</td>
        <td style="padding:7px 10px; font-size:11px; color:#64748b; border-left:1px solid #f1f5f9;">${item.note || ''}</td>
      </tr>`;
  }).join('');

  const overallColor = record.status === 'Pass' ? '#16a34a' : '#dc2626';
  const overallLabel = record.status === 'Pass' ? '✓ ผ่านการตรวจ' : '✗ พบปัญหา';

  const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8"/>
  <title>PM Report ${record.formId}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Sarabun', 'Tahoma', sans-serif; color: #1e293b; font-size: 13px; background: #fff; }
    .page { max-width: 800px; margin: 0 auto; padding: 32px 28px; }
    .header-bar { background: linear-gradient(135deg, #1e3a5f 0%, #0ea5e9 100%); padding: 20px 28px; border-radius: 12px; color: #fff; margin-bottom: 22px; display: flex; justify-content: space-between; align-items: flex-start; }
    .company-logo { font-size: 22px; font-weight: 900; letter-spacing: -0.5px; }
    .company-sub { font-size: 11px; opacity: 0.75; margin-top: 3px; }
    .form-title { text-align: right; }
    .form-title h1 { font-size: 16px; font-weight: 800; }
    .form-title .form-id { font-size: 12px; opacity: 0.8; margin-top: 4px; font-family: monospace; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 12px; margin-bottom: 18px; }
    .meta-item { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; background: #f8fafc; }
    .meta-label { font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 3px; }
    .meta-value { font-size: 13px; font-weight: 700; color: #0f172a; }
    .summary-bar { display: flex; gap: 12px; margin-bottom: 18px; }
    .sum-box { flex: 1; border-radius: 10px; padding: 12px 16px; text-align: center; border: 1.5px solid; }
    .sum-num { font-size: 26px; font-weight: 900; }
    .sum-label { font-size: 10px; margin-top: 2px; }
    .overall-badge { border-radius: 10px; padding: 14px 24px; color: ${overallColor}; background: ${record.status === 'Pass' ? '#f0fdf4' : '#fff5f5'}; border: 2px solid ${record.status === 'Pass' ? '#bbf7d0' : '#fecaca'}; text-align: center; font-size: 18px; font-weight: 900; }
    .section-title { font-size: 12px; font-weight: 800; color: #334155; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
    .section-title::after { content: ''; flex: 1; height: 1px; background: #e2e8f0; }
    table { width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
    thead tr { background: #f8fafc; }
    thead th { padding: 9px 10px; font-size: 10px; font-weight: 700; color: #64748b; text-align: left; text-transform: uppercase; letter-spacing: .05em; border-bottom: 1.5px solid #e2e8f0; }
    .remark-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; background: #fffbeb; margin-top: 16px; min-height: 50px; }
    .sign-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; }
    .sign-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; text-align: center; min-height: 80px; }
    .sign-label { font-size: 11px; font-weight: 700; color: #64748b; margin-bottom: 8px; }
    .sign-line { border-top: 1px solid #94a3b8; margin-top: 40px; padding-top: 6px; font-size: 10px; color: #94a3b8; }
    .footer { margin-top: 22px; padding-top: 14px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { padding: 16px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
<div class="page">
  <!-- Header -->
  <div class="header-bar">
    <div>
      <div class="company-logo">🖧 ITAM</div>
      <div class="company-sub">ระบบบริหารจัดการทรัพย์สิน IT</div>
    </div>
    <div class="form-title">
      <h1>ใบรายงานผลตรวจ PM SW/Hub Room</h1>
      <div class="form-id">${record.formId}</div>
    </div>
  </div>

  <!-- Meta info -->
  <div class="meta-grid">
    <div class="meta-item">
      <div class="meta-label">ชั้น (Floor)</div>
      <div class="meta-value">${record.floor}</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">วันที่ตรวจ</div>
      <div class="meta-value">${thaiDate(record.date)}</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">ผู้ตรวจสอบ</div>
      <div class="meta-value">${record.technician || '—'}</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">รอบการ PM</div>
      <div class="meta-value">${record.period}</div>
    </div>
  </div>

  <!-- Summary -->
  <div class="summary-bar">
    <div class="sum-box" style="border-color:#bbf7d0; background:#f0fdf4; color:#16a34a;">
      <div class="sum-num">${passItems.length}</div>
      <div class="sum-label">ผ่าน</div>
    </div>
    <div class="sum-box" style="border-color:#fecaca; background:#fff5f5; color:#dc2626;">
      <div class="sum-num">${failItems.length}</div>
      <div class="sum-label">ไม่ผ่าน</div>
    </div>
    <div class="sum-box" style="border-color:#e2e8f0; background:#f8fafc; color:#64748b;">
      <div class="sum-num">${naItems.length}</div>
      <div class="sum-label">N/A</div>
    </div>
    <div class="sum-box" style="border-color:#bae6fd; background:#f0f9ff; color:#0369a1;">
      <div class="sum-num">${record.items.length}</div>
      <div class="sum-label">รายการทั้งหมด</div>
    </div>
    <div class="overall-badge" style="flex:2;">
      ${overallLabel}
    </div>
  </div>

  <!-- Checklist Table -->
  <div class="section-title">📋 รายการตรวจสอบ</div>
  <table>
    <thead>
      <tr>
        <th style="width:36px; text-align:center;">#</th>
        <th style="width:180px;">หมวดหมู่</th>
        <th>รายการตรวจ</th>
        <th style="width:90px; text-align:center;">ผล</th>
        <th style="width:140px;">หมายเหตุ</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <!-- Remark -->
  ${record.remark ? `
  <div style="margin-top:16px;">
    <div class="section-title">📝 หมายเหตุรวม</div>
    <div class="remark-box">${record.remark}</div>
  </div>` : ''}

  <!-- Signature -->
  <div class="sign-row">
    <div class="sign-box">
      <div class="sign-label">ผู้ตรวจสอบ (Technician)</div>
      <div class="sign-line">${record.technician || '......................................'}<br>ลงชื่อ / วันที่</div>
    </div>
    <div class="sign-box">
      <div class="sign-label">ผู้ตรวจรับ / หัวหน้า (Supervisor)</div>
      <div class="sign-line">......................................<br>ลงชื่อ / วันที่</div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <span>พิมพ์เมื่อ: ${new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
    <span>ITAM — PM SW/Hub Room Report</span>
  </div>

  <!-- Print button (no print) -->
  <div class="no-print" style="margin-top:20px; text-align:center;">
    <button onclick="window.print()" style="padding:10px 28px; background:#0ea5e9; color:#fff; border:none; border-radius:8px; font-size:14px; cursor:pointer; font-weight:700;">🖨️ พิมพ์ PDF</button>
    <button onclick="window.close()" style="padding:10px 20px; background:#f1f5f9; color:#475569; border:none; border-radius:8px; font-size:14px; cursor:pointer; margin-left:10px;">✕ ปิด</button>
  </div>
</div>
<script>
  // Auto-trigger print on load (optional, user can comment out)
  // window.onload = () => window.print();
</script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=900,height=700');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

/* ─────────────────────────────────────────────────────────────
   Main Component
───────────────────────────────────────────────────────────── */
export default function PMSwHubDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<PMSwHub[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const year = new Date().getFullYear();

  useEffect(() => {
    pmSwHubService.getAll()
      .then((res) => { setData(res); setError(''); })
      .catch(() => setError('โหลดข้อมูล PM SW/Hub Room ไม่สำเร็จ'))
      .finally(() => setLoading(false));
  }, []);

  /* ─── Stats ─── */
  const stats = useMemo(() => {
    let passed = 0, failed = 0, openIssues = 0, issueCount = 0;
    data.forEach((record) => {
      if (record.status === 'Pass') passed++;
      if (record.status === 'Fail') failed++;
      (record.items || []).forEach((item) => {
        if (item.status === 'fail') issueCount++;
        if (item.resolveStatus === 'open') openIssues++;
      });
    });
    const passRate = data.length > 0 ? Math.round((passed / data.length) * 100) : 0;
    return { total: data.length, passed, failed, issueCount, openIssues, passRate };
  }, [data]);

  /* ─── Floor Map ─── */
  const floorMap = useMemo((): FloorStatus[] => {
    return FLOORS.map(floorNum => {
      const floorStr = `F${floorNum}`;
      const floorRecords = data
        .filter(r => r.floor === floorStr)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      if (floorRecords.length === 0) {
        return { floor: floorNum, status: 'none', passCount: 0, failCount: 0, lastDate: null, lastTechnician: null, record: null };
      }
      const latest = floorRecords[0];
      const passCount = latest.items.filter(i => i.status === 'pass').length;
      const failCount = latest.items.filter(i => i.status === 'fail').length;
      return {
        floor: floorNum,
        status: latest.status === 'Pass' ? 'pass' : 'fail',
        passCount,
        failCount,
        lastDate: latest.date,
        lastTechnician: latest.technician,
        record: latest,
      };
    });
  }, [data]);

  const [showAllIssues, setShowAllIssues] = useState(false);

  /* ─── Chart ─── */
  const chartData = useMemo(() => {
    const months: Record<string, { name: string; pass: number; fail: number }> = {};
    [...data]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .forEach((record) => {
        const dt = new Date(record.date);
        const key = `${dt.getFullYear()}-${dt.getMonth()}`;
        if (!months[key]) {
          const monthsThai = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
          months[key] = { 
            name: `${monthsThai[dt.getMonth()]} ${dt.getFullYear() + 543}`, 
            pass: 0, 
            fail: 0 
          };
        }
        if (record.status === 'Pass') months[key].pass++;
        if (record.status === 'Fail') months[key].fail++;
      });
    return Object.values(months).slice(-6);
  }, [data]);

  /* ─── Open Issues ─── */
  const openIssues = useMemo(() => {
    const list: (PMSwHubItem & { formId: string; floor: string; date: string })[] = [];
    data.forEach((record) => {
      (record.items || []).forEach((item) => {
        if (item.resolveStatus === 'open') list.push({ ...item, formId: record.formId, floor: record.floor, date: record.date });
      });
    });
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data]);

  /* ─── Selected floor records ─── */
  const selectedFloorRecords = useMemo(() => {
    if (!selectedFloor) return [];
    return data
      .filter(r => r.floor === `F${selectedFloor}`)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [data, selectedFloor]);

  const latestRecords = useMemo(() =>
    [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6)
  , [data]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, gap: 10, color: '#0ea5e9', fontSize: 14 }}>
        ⏳ กำลังโหลดข้อมูล PM SW/Hub Room...
      </div>
    );
  }

  const floorStatusStyle = (status: FloorStatus['status'], isSelected: boolean) => {
    if (status === 'pass') return {
      bg: isSelected ? '#dcfce7' : '#f0fdf4',
      border: isSelected ? '#16a34a' : '#bbf7d0',
      titleColor: '#15803d',
      badgeBg: '#16a34a',
      badgeText: '✓ ผ่าน',
      icon: '✅',
      glow: isSelected ? '0 0 0 3px rgba(22,163,74,0.2)' : 'none',
    };
    if (status === 'fail') return {
      bg: isSelected ? '#fee2e2' : '#fff5f5',
      border: isSelected ? '#dc2626' : '#fecaca',
      titleColor: '#b91c1c',
      badgeBg: '#dc2626',
      badgeText: '✗ พบปัญหา',
      icon: '⚠️',
      glow: isSelected ? '0 0 0 3px rgba(220,38,38,0.2)' : 'none',
    };
    return {
      bg: isSelected ? '#f1f5f9' : '#f8fafc',
      border: isSelected ? '#94a3b8' : '#e2e8f0',
      titleColor: '#475569',
      badgeBg: '#94a3b8',
      badgeText: 'ยังไม่ตรวจ',
      icon: '⬜',
      glow: isSelected ? '0 0 0 3px rgba(148,163,184,0.2)' : 'none',
    };
  };

  return (
    <>
      <style>{`
        .pmd-root { font-family: 'Sarabun', sans-serif; }
        .pmd-btn { display:inline-flex;align-items:center;gap:5px;padding:7px 14px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;font-family:'Sarabun',sans-serif;transition:all .15s;border:1px solid transparent;white-space:nowrap; }
        .pmd-btn-primary { background:#0ea5e9;border-color:#0284c7;color:#fff; }
        .pmd-btn-primary:hover { background:#0284c7; }
        .pmd-btn-outline { background:#fff;border-color:#e2e8f0;color:#475569; }
        .pmd-btn-outline:hover { border-color:#0ea5e9;color:#0ea5e9; }
        .pmd-btn-pdf { background:#fff;border-color:#fca5a5;color:#dc2626; }
        .pmd-btn-pdf:hover { background:#fff5f5; }
        .pmd-card { background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden; }
        .pmd-table { width:100%;border-collapse:collapse;font-size:12px; }
        .pmd-table th { padding:10px 14px;text-align:left;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;background:#f8fafc;border-bottom:1px solid #e2e8f0;white-space:nowrap; }
        .pmd-table td { padding:10px 14px;border-bottom:1px solid #f1f5f9;color:#334155; }
        .pmd-table tr:hover td { background:#f8fafc; }
        .pmd-layout { display:grid;grid-template-columns:minmax(0,1.2fr) minmax(320px,.8fr);gap:18px;align-items:start; }
        @media (max-width:960px) { .pmd-layout { grid-template-columns:1fr; } }
        .floor-card { border-radius:12px;padding:16px;cursor:pointer;transition:all .2s;border:2px solid; }
        .floor-card:hover { transform:translateY(-2px); }
        .floor-progress { height:6px;border-radius:99px;background:#e2e8f0;overflow:hidden;margin-top:8px; }
        .floor-progress-bar { height:100%;border-radius:99px; }
        .floor-detail-panel { border-radius:12px;padding:18px;border:1px solid #e2e8f0;background:#fff;animation:fadeUp .2s ease; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .legend-item { display:flex;align-items:center;gap:6px;font-size:11px;color:#475569; }
        .legend-dot { width:10px;height:10px;border-radius:50%; }
      `}</style>

      <div className="pmd-root">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f0f9ff', border: '1.5px solid #bae6fd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🖧</div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}>PM SW/Hub Room</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>ศูนย์ติดตามการตรวจห้อง Network / Hub Room ปี {year + 543}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="pmd-btn pmd-btn-outline" onClick={() => navigate('/pm')}>🛡 PM ทรัพย์สิน</button>
            <button className="pmd-btn pmd-btn-outline" onClick={() => navigate('/pm/sw-hub/template')}>⚙️ Template</button>
            <button className="pmd-btn pmd-btn-outline" onClick={() => navigate('/pm/sw-hub/plans')}>📋 แผน SW/Hub</button>
            <button className="pmd-btn pmd-btn-primary" onClick={() => navigate('/pm/sw-hub/new')}>＋ ตรวจ SW/Hub Room</button>
          </div>
        </div>

        {error && (
          <div className="pmd-card" style={{ padding: '12px 16px', marginBottom: 18, background: '#fff5f5', borderColor: '#fecaca', color: '#dc2626', fontSize: 12, fontWeight: 700 }}>
            ⚠️ {error}
          </div>
        )}

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginBottom: 18 }}>
          {[
            { icon: '📋', label: 'บันทึกทั้งหมด', val: stats.total, color: '#0ea5e9', bg: '#f0f9ff', border: '#bae6fd' },
            { icon: '✅', label: 'ผ่าน', val: stats.passed, color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0' },
            { icon: '⚠️', label: 'พบปัญหา', val: stats.failed, color: '#ef4444', bg: '#fff5f5', border: '#fecaca' },
            { icon: '🛠', label: 'ปัญหาค้างแก้', val: stats.openIssues, color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
            { icon: '📊', label: 'อัตราผ่าน', val: `${stats.passRate}%`, color: stats.passRate >= 90 ? '#10b981' : '#f59e0b', bg: '#f8fafc', border: '#e2e8f0' },
          ].map((s) => (
            <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 26 }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════
            FLOOR MAP VISUAL (Feature 4)
        ═══════════════════════════════════════════════ */}
        <div className="pmd-card" style={{ marginBottom: 18 }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>🏢 แผนผังสถานะ Hub Room รายชั้น</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>สถานะจากการตรวจล่าสุดของแต่ละชั้น — คลิกเพื่อดูรายละเอียด</div>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div className="legend-item"><div className="legend-dot" style={{ background: '#16a34a' }} /> ผ่าน</div>
              <div className="legend-item"><div className="legend-dot" style={{ background: '#dc2626' }} /> พบปัญหา</div>
              <div className="legend-item"><div className="legend-dot" style={{ background: '#cbd5e1' }} /> ยังไม่ตรวจ</div>
            </div>
          </div>
          <div style={{ padding: '16px 18px' }}>
            {/* Floor cards grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 16 }}>
              {floorMap.map(f => {
                const isSelected = selectedFloor === f.floor;
                const s = floorStatusStyle(f.status, isSelected);
                const total = f.passCount + f.failCount;
                const passPct = total > 0 ? Math.round((f.passCount / total) * 100) : 0;

                return (
                  <div
                    key={f.floor}
                    className="floor-card"
                    style={{ background: s.bg, borderColor: s.border, boxShadow: s.glow }}
                    onClick={() => setSelectedFloor(isSelected ? null : f.floor)}
                  >
                    {/* Floor number + status icon */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>Floor</div>
                        <div style={{ fontSize: 28, fontWeight: 900, color: s.titleColor, lineHeight: 1 }}>{f.floor}</div>
                        {f.floor === 27 && (
                          <span style={{ fontSize: 9, background: '#fef08a', color: '#854d0e', border: '1px solid #fde047', borderRadius: 4, padding: '1px 5px', fontWeight: 700 }}>Critical</span>
                        )}
                      </div>
                      <div style={{ fontSize: 22 }}>{s.icon}</div>
                    </div>

                    {/* Progress bar (pass/fail ratio) */}
                    {f.status !== 'none' && total > 0 && (
                      <>
                        <div className="floor-progress">
                          <div className="floor-progress-bar" style={{ width: `${passPct}%`, background: f.status === 'pass' ? '#10b981' : '#ef4444' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: '#64748b' }}>
                          <span>✓ {f.passCount}</span>
                          <span style={{ color: '#94a3b8' }}>{passPct}%</span>
                          <span style={{ color: '#ef4444' }}>✗ {f.failCount}</span>
                        </div>
                      </>
                    )}

                    {/* Status badge */}
                    <div style={{ marginTop: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: s.badgeBg, borderRadius: 99, padding: '2px 8px' }}>
                        {s.badgeText}
                      </span>
                    </div>

                    {/* Last date */}
                    {f.lastDate && (
                      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 5 }}>
                        ตรวจล่าสุด: {fmtDate(f.lastDate)}
                      </div>
                    )}
                    {f.status === 'none' && (
                      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 8 }}>
                        ยังไม่มีบันทึกการตรวจ
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Selected floor detail panel */}
            {selectedFloor && (
              <div className="floor-detail-panel">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                    📂 ประวัติการตรวจ — Floor {selectedFloor}
                    <span style={{ fontSize: 11, fontWeight: 400, color: '#94a3b8', marginLeft: 8 }}>5 รายการล่าสุด</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="pmd-btn pmd-btn-outline" style={{ fontSize: 11 }}
                      onClick={() => navigate(`/pm/sw-hub/new?floor=F${selectedFloor}`)}>
                      ＋ ตรวจชั้น {selectedFloor}
                    </button>
                    <button className="pmd-btn pmd-btn-outline" style={{ fontSize: 11 }} onClick={() => setSelectedFloor(null)}>
                      ✕ ปิด
                    </button>
                  </div>
                </div>

                {selectedFloorRecords.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8', fontSize: 12 }}>
                    ยังไม่มีบันทึกการตรวจสำหรับชั้นนี้
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="pmd-table">
                      <thead>
                        <tr>
                          {['Form ID', 'ผู้ตรวจ', 'รอบ', 'วันที่', 'ผ่าน', 'ไม่ผ่าน', 'สถานะ', 'PDF'].map(h => <th key={h}>{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {selectedFloorRecords.map(record => {
                          const tone = statusTone(record.status);
                          const pCount = record.items.filter(i => i.status === 'pass').length;
                          const fCount = record.items.filter(i => i.status === 'fail').length;
                          return (
                            <tr key={record.id}>
                              <td style={{ fontWeight: 600 }}>
                                <a href="#!" onClick={e => { e.preventDefault(); navigate(`/pm/sw-hub/new?recordId=${record.id}`); }}
                                  style={{ color: '#0ea5e9', textDecoration: 'none' }}>
                                  {record.formId}
                                </a>
                              </td>
                              <td>{record.technician || '—'}</td>
                              <td>{record.period}</td>
                              <td>{fmtDate(record.date)}</td>
                              <td><span style={{ color: '#16a34a', fontWeight: 700 }}>{pCount}</span></td>
                              <td><span style={{ color: fCount > 0 ? '#dc2626' : '#94a3b8', fontWeight: 700 }}>{fCount}</span></td>
                              <td>
                                <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 9px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: tone.bg, color: tone.color, border: `1px solid ${tone.border}` }}>
                                  {tone.label}
                                </span>
                              </td>
                              <td>
                                {/* ═══ PDF EXPORT BUTTON (Feature 5) ═══ */}
                                <button
                                  className="pmd-btn pmd-btn-pdf"
                                  style={{ padding: '4px 10px', fontSize: 11 }}
                                  title="ส่งออกใบรายงาน PDF"
                                  onClick={() => printRecordReport(record)}
                                >
                                  🖨️ PDF
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {/* END FLOOR MAP */}

        {/* Chart + Issues */}
        <div className="pmd-layout">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Chart */}
            <div className="pmd-card" style={{ padding: '14px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>แนวโน้มผลตรวจรายเดือน</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>Pass / Fail</div>
              </div>
              <div style={{ height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="swPass" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="swFail" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.24} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={8} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(15,23,42,.12)', fontSize: 12 }} />
                    <Area type="monotone" dataKey="pass" name="ผ่าน" stroke="#10b981" strokeWidth={2} fill="url(#swPass)" />
                    <Area type="monotone" dataKey="fail" name="พบปัญหา" stroke="#ef4444" strokeWidth={2} fill="url(#swFail)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Latest Records */}
            <div className="pmd-card">
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>บันทึกตรวจล่าสุด</div>
                <button className="pmd-btn pmd-btn-outline" onClick={() => navigate('/pm/sw-hub/new')}>＋ เพิ่มบันทึก</button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="pmd-table">
                  <thead>
                    <tr>{['Form ID', 'ชั้น', 'รอบ', 'ผู้ตรวจ', 'วันที่', 'สถานะ', 'PDF'].map(h => <th key={h}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {latestRecords.length > 0 ? latestRecords.map((record) => {
                      const tone = statusTone(record.status);
                      return (
                        <tr key={record.id}>
                          <td style={{ fontWeight: 600 }}>
                            <a href="#!" onClick={e => { e.preventDefault(); navigate(`/pm/sw-hub/new?recordId=${record.id}`); }}
                              style={{ color: '#0ea5e9', textDecoration: 'none', cursor: 'pointer' }}>
                              {record.formId}
                            </a>
                          </td>
                          <td>
                            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0ea5e9', fontWeight: 700, padding: 0, fontSize: 12 }}
                              onClick={() => setSelectedFloor(parseInt(record.floor.replace('F', '')))}>
                              {record.floor}
                            </button>
                          </td>
                          <td>{record.period}</td>
                          <td>{record.technician || '—'}</td>
                          <td>{fmtDate(record.date)}</td>
                          <td>
                            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 9px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: tone.bg, color: tone.color, border: `1px solid ${tone.border}` }}>
                              {tone.label}
                            </span>
                          </td>
                          <td>
                            <button className="pmd-btn pmd-btn-pdf" style={{ padding: '4px 10px', fontSize: 11 }}
                              onClick={() => printRecordReport(record)}>
                              🖨️ PDF
                            </button>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr><td colSpan={7} style={{ textAlign: 'center', color: '#94a3b8', padding: 36 }}>ยังไม่มีบันทึกตรวจ SW/Hub Room</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Open Issues */}
          <div className="pmd-card">
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>ปัญหาที่รอแก้ไข</div>
              <span style={{ fontSize: 10, background: '#fffbeb', color: '#b45309', padding: '2px 8px', borderRadius: 99, border: '1px solid #fde68a', fontWeight: 700 }}>
                {openIssues.length} รายการ
              </span>
            </div>
            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {openIssues.length > 0 ? (showAllIssues ? openIssues : openIssues.slice(0, 8)).map((issue) => (
                <div key={issue.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px', background: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>{issue.checkItem}</div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1px 6px', borderRadius: 6, whiteSpace: 'nowrap' }}>
                      {issue.category}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.5 }}>{issue.note || 'ไม่มีหมายเหตุเพิ่มเติม'}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 8 }}>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0ea5e9', fontSize: 10, padding: 0 }}
                      onClick={() => setSelectedFloor(parseInt(issue.floor.replace('F', '')))}>
                      {issue.floor}
                    </button>
                    {' '}· {fmtDate(issue.date)} · {issue.formId}
                  </div>
                </div>
              )) : (
                <div style={{ textAlign: 'center', padding: '36px 12px', color: '#64748b', fontSize: 12 }}>
                  ✅ ไม่มีปัญหาค้างแก้ไขในรอบนี้
                </div>
              )}
              {openIssues.length > 8 && (
                <button
                  type="button"
                  onClick={() => setShowAllIssues(p => !p)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', color: '#0ea5e9', fontSize: 11, fontWeight: 700, alignSelf: 'center', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4
                  }}
                >
                  {showAllIssues ? '🔼 แสดงน้อยลง' : `🔽 แสดงทั้งหมด (${openIssues.length} รายการ)`}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
