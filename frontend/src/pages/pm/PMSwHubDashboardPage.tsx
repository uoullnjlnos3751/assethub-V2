import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Chip,
  Alert,
  LinearProgress,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import HubIcon from '@mui/icons-material/Hub';
import ShieldIcon from '@mui/icons-material/Shield';
import SettingsIcon from '@mui/icons-material/Settings';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import BuildIcon from '@mui/icons-material/Build';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import BusinessIcon from '@mui/icons-material/Business';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import CloseIcon from '@mui/icons-material/Close';
import PrintIcon from '@mui/icons-material/Print';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { pmSwHubService, PMSwHub, PMSwHubItem } from '../../services/pmSwHub';
import { formatDate } from '../../utils/dateUtils';

const FLOORS = [22, 23, 24, 25, 26, 27];

function fmtDate(d: string | null | Date) {
  if (!d) return '—';
  return formatDate(d as string);
}

function statusTone(status: string): { color: 'success' | 'error'; label: string } {
  return status === 'Pass' ? { color: 'success', label: 'ผ่าน' } : { color: 'error', label: 'พบปัญหา' };
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

/* ─── PDF Print helper ───
   Generates a standalone, self-contained HTML document opened in its own
   window for printing — this is not part of the React tree the app
   renders, so it deliberately stays plain HTML/inline-CSS rather than MUI;
   there's nothing to "retheme" here since it's a portable print artifact,
   not a themed screen. */
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
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, gap: 1.25, color: 'primary.main', fontSize: 14 }}>
        กำลังโหลดข้อมูล PM SW/Hub Room...
      </Box>
    );
  }

  const floorStatusTone = (status: FloorStatus['status']): { color: 'success' | 'error' | 'default'; Icon: React.ElementType; label: string } => {
    if (status === 'pass') return { color: 'success', Icon: CheckCircleIcon, label: 'ผ่าน' };
    if (status === 'fail') return { color: 'error', Icon: WarningAmberIcon, label: 'พบปัญหา' };
    return { color: 'default', Icon: RadioButtonUncheckedIcon, label: 'ยังไม่ตรวจ' };
  };

  const kpis: { Icon: React.ElementType; label: string; val: number | string; color: 'info' | 'success' | 'error' | 'warning' }[] = [
    { Icon: AssignmentIcon, label: 'บันทึกทั้งหมด', val: stats.total, color: 'info' },
    { Icon: CheckCircleIcon, label: 'ผ่าน', val: stats.passed, color: 'success' },
    { Icon: WarningAmberIcon, label: 'พบปัญหา', val: stats.failed, color: 'error' },
    { Icon: BuildIcon, label: 'ปัญหาค้างแก้', val: stats.openIssues, color: 'warning' },
    { Icon: TrendingUpIcon, label: 'อัตราผ่าน', val: `${stats.passRate}%`, color: stats.passRate >= 90 ? 'success' : 'warning' },
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, mb: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: 2.5, bgcolor: (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.16 : 0.08), border: '1px solid', borderColor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HubIcon color="primary" />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 17, fontWeight: 800 }}>PM SW/Hub Room</Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.25 }}>ศูนย์ติดตามการตรวจห้อง Network / Hub Room ปี {year + 543}</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button variant="outlined" startIcon={<ShieldIcon />} onClick={() => navigate('/pm')}>PM ทรัพย์สิน</Button>
          <Button variant="outlined" startIcon={<SettingsIcon />} onClick={() => navigate('/pm/sw-hub/template')}>Template</Button>
          <Button variant="outlined" startIcon={<AssignmentIcon />} onClick={() => navigate('/pm/sw-hub/plans')}>แผน SW/Hub</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/pm/sw-hub/new')}>ตรวจ SW/Hub Room</Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2.5 }}>{error}</Alert>}

      {/* KPI Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 1.5, mb: 2.5 }}>
        {kpis.map((s) => (
          <Card key={s.label} variant="outlined" sx={{ p: '14px 16px', display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: (t) => alpha(t.palette[s.color].main, t.palette.mode === 'dark' ? 0.16 : 0.08), borderColor: `${s.color}.main` }}>
            <s.Icon sx={{ fontSize: 26, color: `${s.color}.main` }} />
            <Box>
              <Typography sx={{ fontSize: 24, fontWeight: 800, color: `${s.color}.main`, lineHeight: 1 }}>{s.val}</Typography>
              <Typography sx={{ fontSize: 10, color: 'text.secondary', mt: 0.25 }}>{s.label}</Typography>
            </Box>
          </Card>
        ))}
      </Box>

      {/* ═══ FLOOR MAP VISUAL ═══ */}
      <Card variant="outlined" sx={{ mb: 2.5 }}>
        <Box sx={{ p: '14px 18px', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 0.75 }}><BusinessIcon sx={{ fontSize: 16 }} /> แผนผังสถานะ Hub Room รายชั้น</Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.25 }}>สถานะจากการตรวจล่าสุดของแต่ละชั้น — คลิกเพื่อดูรายละเอียด</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: 11, color: 'text.secondary' }}><Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'success.main' }} /> ผ่าน</Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: 11, color: 'text.secondary' }}><Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'error.main' }} /> พบปัญหา</Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: 11, color: 'text.secondary' }}><Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'text.disabled' }} /> ยังไม่ตรวจ</Box>
          </Box>
        </Box>
        <Box sx={{ p: '16px 18px' }}>
          {/* Floor cards grid */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 1.5, mb: 2 }}>
            {floorMap.map(f => {
              const isSelected = selectedFloor === f.floor;
              const tone = floorStatusTone(f.status);
              const total = f.passCount + f.failCount;
              const passPct = total > 0 ? Math.round((f.passCount / total) * 100) : 0;

              return (
                <Card
                  key={f.floor}
                  variant="outlined"
                  onClick={() => setSelectedFloor(isSelected ? null : f.floor)}
                  sx={{
                    p: 2, cursor: 'pointer', transition: 'all .2s',
                    bgcolor: (t) => tone.color === 'default' ? 'action.hover' : alpha(t.palette[tone.color].main, isSelected ? 0.16 : 0.08),
                    borderColor: tone.color === 'default' ? 'divider' : `${tone.color}.main`,
                    borderWidth: isSelected ? 2 : 1,
                    '&:hover': { transform: 'translateY(-2px)' },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>Floor</Typography>
                      <Typography sx={{ fontSize: 28, fontWeight: 900, color: tone.color === 'default' ? 'text.secondary' : `${tone.color}.main`, lineHeight: 1 }}>{f.floor}</Typography>
                      {f.floor === 27 && (
                        <Chip size="small" label="Critical" color="warning" sx={{ height: 16, fontSize: 9, fontWeight: 700, mt: 0.5 }} />
                      )}
                    </Box>
                    <tone.Icon sx={{ fontSize: 22, color: tone.color === 'default' ? 'text.disabled' : `${tone.color}.main` }} />
                  </Box>

                  {f.status !== 'none' && total > 0 && (
                    <>
                      <LinearProgress variant="determinate" value={passPct} color={f.status === 'pass' ? 'success' : 'error'} sx={{ height: 6, borderRadius: 99, mt: 1 }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.75, fontSize: 10, color: 'text.secondary' }}>
                        <span>✓ {f.passCount}</span>
                        <Box component="span" sx={{ color: 'text.disabled' }}>{passPct}%</Box>
                        <Box component="span" sx={{ color: 'error.main' }}>✗ {f.failCount}</Box>
                      </Box>
                    </>
                  )}

                  <Box sx={{ mt: 1 }}>
                    <Chip size="small" label={tone.label} color={tone.color === 'default' ? undefined : tone.color} sx={{ fontSize: 10, fontWeight: 700, height: 20 }} />
                  </Box>

                  {f.lastDate && (
                    <Typography sx={{ fontSize: 10, color: 'text.secondary', mt: 0.75 }}>
                      ตรวจล่าสุด: {fmtDate(f.lastDate)}
                    </Typography>
                  )}
                  {f.status === 'none' && (
                    <Typography sx={{ fontSize: 10, color: 'text.secondary', mt: 1 }}>
                      ยังไม่มีบันทึกการตรวจ
                    </Typography>
                  )}
                </Card>
              );
            })}
          </Box>

          {/* Selected floor detail panel */}
          {selectedFloor && (
            <Paper variant="outlined" sx={{ p: 2.25 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.75, flexWrap: 'wrap', gap: 1 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <FolderOpenIcon sx={{ fontSize: 16 }} /> ประวัติการตรวจ — Floor {selectedFloor}
                  <Box component="span" sx={{ fontSize: 11, fontWeight: 400, color: 'text.secondary', ml: 1 }}>5 รายการล่าสุด</Box>
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => navigate(`/pm/sw-hub/new?floor=F${selectedFloor}`)}>
                    ตรวจชั้น {selectedFloor}
                  </Button>
                  <Button size="small" variant="outlined" startIcon={<CloseIcon />} onClick={() => setSelectedFloor(null)}>ปิด</Button>
                </Box>
              </Box>

              {selectedFloorRecords.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 3, color: 'text.secondary', fontSize: 12 }}>
                  ยังไม่มีบันทึกการตรวจสำหรับชั้นนี้
                </Box>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
                        {['Form ID', 'ผู้ตรวจ', 'รอบ', 'วันที่', 'ผ่าน', 'ไม่ผ่าน', 'สถานะ', 'PDF'].map(h => <TableCell key={h} sx={{ fontSize: 10, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>{h}</TableCell>)}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedFloorRecords.map(record => {
                        const tone = statusTone(record.status);
                        const pCount = record.items.filter(i => i.status === 'pass').length;
                        const fCount = record.items.filter(i => i.status === 'fail').length;
                        return (
                          <TableRow key={record.id} hover>
                            <TableCell sx={{ fontWeight: 600 }}>
                              <Box component="span" sx={{ color: 'primary.main', cursor: 'pointer' }} onClick={() => navigate(`/pm/sw-hub/new?recordId=${record.id}`)}>
                                {record.formId}
                              </Box>
                            </TableCell>
                            <TableCell>{record.technician || '—'}</TableCell>
                            <TableCell>{record.period}</TableCell>
                            <TableCell>{fmtDate(record.date)}</TableCell>
                            <TableCell><Box component="span" sx={{ color: 'success.main', fontWeight: 700 }}>{pCount}</Box></TableCell>
                            <TableCell><Box component="span" sx={{ color: fCount > 0 ? 'error.main' : 'text.disabled', fontWeight: 700 }}>{fCount}</Box></TableCell>
                            <TableCell><Chip size="small" label={tone.label} color={tone.color} sx={{ fontSize: 10, fontWeight: 700, height: 20 }} /></TableCell>
                            <TableCell>
                              <Button size="small" variant="outlined" color="error" startIcon={<PrintIcon sx={{ fontSize: 14 }} />} onClick={() => printRecordReport(record)}>
                                PDF
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          )}
        </Box>
      </Card>
      {/* END FLOOR MAP */}

      {/* Chart + Issues */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0,1.2fr) minmax(320px,.8fr)' }, gap: 2.25, alignItems: 'start' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}>
          {/* Chart */}
          <Card variant="outlined" sx={{ p: '14px 18px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.75 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 800 }}>แนวโน้มผลตรวจรายเดือน</Typography>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Pass / Fail</Typography>
            </Box>
            <Box sx={{ height: 250 }}>
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
            </Box>
          </Card>

          {/* Latest Records */}
          <Card variant="outlined">
            <Box sx={{ p: '14px 18px', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 800 }}>บันทึกตรวจล่าสุด</Typography>
              <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => navigate('/pm/sw-hub/new')}>เพิ่มบันทึก</Button>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    {['Form ID', 'ชั้น', 'รอบ', 'ผู้ตรวจ', 'วันที่', 'สถานะ', 'PDF'].map(h => <TableCell key={h} sx={{ fontSize: 10, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>{h}</TableCell>)}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {latestRecords.length > 0 ? latestRecords.map((record) => {
                    const tone = statusTone(record.status);
                    return (
                      <TableRow key={record.id} hover>
                        <TableCell sx={{ fontWeight: 600 }}>
                          <Box component="span" sx={{ color: 'primary.main', cursor: 'pointer' }} onClick={() => navigate(`/pm/sw-hub/new?recordId=${record.id}`)}>
                            {record.formId}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box component="span" sx={{ color: 'primary.main', fontWeight: 700, cursor: 'pointer' }} onClick={() => setSelectedFloor(parseInt(record.floor.replace('F', '')))}>
                            {record.floor}
                          </Box>
                        </TableCell>
                        <TableCell>{record.period}</TableCell>
                        <TableCell>{record.technician || '—'}</TableCell>
                        <TableCell>{fmtDate(record.date)}</TableCell>
                        <TableCell><Chip size="small" label={tone.label} color={tone.color} sx={{ fontSize: 10, fontWeight: 700, height: 20 }} /></TableCell>
                        <TableCell>
                          <Button size="small" variant="outlined" color="error" startIcon={<PrintIcon sx={{ fontSize: 14 }} />} onClick={() => printRecordReport(record)}>
                            PDF
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  }) : (
                    <TableRow><TableCell colSpan={7} sx={{ textAlign: 'center', color: 'text.secondary', py: 4.5 }}>ยังไม่มีบันทึกตรวจ SW/Hub Room</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Box>

        {/* Open Issues */}
        <Card variant="outlined">
          <Box sx={{ p: '14px 18px', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography sx={{ fontSize: 13, fontWeight: 800 }}>ปัญหาที่รอแก้ไข</Typography>
            <Chip size="small" label={`${openIssues.length} รายการ`} color="warning" variant="outlined" sx={{ fontWeight: 700 }} />
          </Box>
          <Box sx={{ p: 1.75, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {openIssues.length > 0 ? (showAllIssues ? openIssues : openIssues.slice(0, 8)).map((issue) => (
              <Paper key={issue.id} variant="outlined" sx={{ p: '12px 14px' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 0.75 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 800 }}>{issue.checkItem}</Typography>
                  <Chip size="small" label={issue.category} variant="outlined" sx={{ fontSize: 10, fontWeight: 700, height: 20, whiteSpace: 'nowrap' }} />
                </Box>
                <Typography sx={{ fontSize: 11, color: 'text.secondary', lineHeight: 1.5 }}>{issue.note || 'ไม่มีหมายเหตุเพิ่มเติม'}</Typography>
                <Box sx={{ fontSize: 10, color: 'text.secondary', mt: 1 }}>
                  <Box component="span" sx={{ color: 'primary.main', cursor: 'pointer' }} onClick={() => setSelectedFloor(parseInt(issue.floor.replace('F', '')))}>
                    {issue.floor}
                  </Box>
                  {' '}· {fmtDate(issue.date)} · {issue.formId}
                </Box>
              </Paper>
            )) : (
              <Box sx={{ textAlign: 'center', py: 4.5, px: 1.5, color: 'text.secondary', fontSize: 12 }}>
                ไม่มีปัญหาค้างแก้ไขในรอบนี้
              </Box>
            )}
            {openIssues.length > 8 && (
              <Button
                size="small"
                onClick={() => setShowAllIssues(p => !p)}
                startIcon={showAllIssues ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                sx={{ alignSelf: 'center', mt: 0.5 }}
              >
                {showAllIssues ? 'แสดงน้อยลง' : `แสดงทั้งหมด (${openIssues.length} รายการ)`}
              </Button>
            )}
          </Box>
        </Card>
      </Box>
    </Box>
  );
}
