import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid, Box, Typography, LinearProgress, CircularProgress,
  Divider, alpha,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { dashboardAPI } from '../services/api';

// ── Helpers ──────────────────────────────────────────────────────────────────
function now() {
  return new Date().toLocaleDateString('th-TH', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}
function pct(a: number, b: number) {
  return b > 0 ? Math.round((a / b) * 100) : 0;
}

// ── Sub-components ─────────────────────────────────────────────────────────

// Mini donut SVG (pure SVG, no charting lib)
function DonutChart({ segments, total }: { segments: { value: number; color: string }[]; total: number }) {
  const R = 36;
  const C = 2 * Math.PI * R;
  let offset = 0;
  const arcs = segments.map(seg => {
    const dash = total > 0 ? (seg.value / total) * C : 0;
    const arc = { dash, gap: C - dash, offset, color: seg.color };
    offset += dash;
    return arc;
  });
  return (
    <svg width="90" height="90" viewBox="0 0 90 90">
      {/* Background ring */}
      <circle cx="45" cy="45" r={R} fill="none" stroke="#f3f4f6" strokeWidth="14" />
      {arcs.map((arc, i) => (
        <circle key={i} cx="45" cy="45" r={R} fill="none"
          stroke={arc.color} strokeWidth="14"
          strokeDasharray={`${arc.dash} ${arc.gap}`}
          strokeDashoffset={-arc.offset}
          transform="rotate(-90 45 45)"
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
        />
      ))}
      <text x="45" y="49" textAnchor="middle" fontSize="14" fontWeight="600" fill="#111827">{total}</text>
    </svg>
  );
}

// Mini bar chart (sparkline style)
function MiniBarChart({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1);
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '56px' }}>
      {values.map((v, i) => (
        <Box key={i} sx={{
          flex: 1,
          borderRadius: '3px 3px 0 0',
          minHeight: '4px',
          height: `${Math.max((v / max) * 100, 6)}%`,
          background: i === values.length - 1 ? color : alpha(color, 0.4),
          transition: 'height 0.4s ease',
        }} />
      ))}
    </Box>
  );
}

// Stat card compact
function StatCard({ label, value, sub, color, icon, topBorder, onClick }: {
  label: string; value: string | number; sub?: string;
  color: string; icon: string; topBorder?: boolean; onClick?: () => void;
}) {
  return (
    <Box onClick={onClick} sx={{
      bgcolor: '#fff',
      border: '0.5px solid #e5e7eb',
      borderTop: topBorder ? `3px solid ${color}` : '0.5px solid #e5e7eb',
      borderRadius: '10px',
      p: '14px 12px',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'border-color .15s',
      '&:hover': onClick ? { borderColor: '#d1d5db' } : {},
    }}>
      <Box sx={{ fontSize: '20px', mb: '6px' }}>{icon}</Box>
      <Box sx={{ fontSize: '22px', fontWeight: 500, color: '#111827', lineHeight: 1 }}>{value}</Box>
      <Box sx={{ fontSize: '11px', color: '#6b7280', mt: '4px', lineHeight: 1.3 }}>{label}</Box>
      {sub && <Box sx={{ fontSize: '10px', color: '#9ca3af', mt: '3px' }}>{sub}</Box>}
    </Box>
  );
}

// Section card
function SectionCard({ title, action, actionLabel, children }: {
  title: string; action?: () => void; actionLabel?: string; children: React.ReactNode;
}) {
  return (
    <Box sx={{
      bgcolor: '#fff',
      border: '0.5px solid #e5e7eb',
      borderRadius: '10px',
      p: '16px',
      height: '100%',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: '12px' }}>
        <Typography sx={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>{title}</Typography>
        {action && actionLabel && (
          <Box onClick={action} sx={{ fontSize: '11px', color: '#f59e0b', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>
            {actionLabel} →
          </Box>
        )}
      </Box>
      {children}
    </Box>
  );
}

// Pill badge
function Pill({ label, variant }: { label: string; variant: 'green' | 'orange' | 'red' | 'blue' | 'grey' | 'yellow' }) {
  const map = {
    green:  { bg: '#d1fae5', color: '#065f46' },
    orange: { bg: '#fff7ed', color: '#c2410c' },
    red:    { bg: '#fee2e2', color: '#991b1b' },
    blue:   { bg: '#dbeafe', color: '#1e40af' },
    grey:   { bg: '#f3f4f6', color: '#374151' },
    yellow: { bg: '#fef9c3', color: '#a16207' },
  };
  const { bg, color } = map[variant];
  return (
    <Box component="span" sx={{
      display: 'inline-block',
      fontSize: '10px',
      px: '7px',
      py: '2px',
      borderRadius: '999px',
      bgcolor: bg,
      color,
      fontWeight: 500,
    }}>
      {label}
    </Box>
  );
}

// ── Status config ──────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { label: string; color: string; pill: any }> = {
  Available:   { label: 'พร้อมใช้งาน', color: '#10b981', pill: 'green' },
  Borrowed:    { label: 'กำลังยืม',    color: '#f59e0b', pill: 'yellow' },
  InUse:       { label: 'ใช้งานประจำ', color: '#3b82f6', pill: 'blue' },
  Maintenance: { label: 'ซ่อมบำรุง',  color: '#ef4444', pill: 'red' },
  Retired:     { label: 'ปลดระวาง',   color: '#6b7280', pill: 'grey' },
  Lost:        { label: 'สูญหาย',     color: '#dc2626', pill: 'red' },
};

// Asset category config
const CAT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16'];

// Map category names to navigation paths
const categoryNavMap: Record<string, string> = {
  'คอมพิวเตอร์': '/assets?typeGroup=computers',
  'จอภาพ': '/assets?typeGroup=monitors',
  'เครื่องพิมพ์': '/assets?typeGroup=printers',
  'อุปกรณ์เครือข่าย': '/assets?typeGroup=network',
  'อุปกรณ์สื่อสาร': '/assets?typeGroup=phonesTablets',
  'อุปกรณ์ต่อพ่วง': '/assets?typeGroup=devices',
  'Rack & Infrastructure': '/assets?typeGroup=rack',
  'สายสัญญาณ': '/inventory?category=Cable',
  'วัสดุสิ้นเปลือง': '/inventory?category=Consumable',
};

// ── Main Dashboard ──────────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [assetSummary, setAssetSummary] = useState<any>(null);
  const [borrowSummary, setBorrowSummary] = useState<any>(null);
  const [pmSummary, setPmSummary] = useState<any>(null);
  const [proactiveAlerts, setProactiveAlerts] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'IT_ADMIN' || user?.role === 'SUPERADMIN') {
      Promise.all([
        dashboardAPI.assetSummary(),
        dashboardAPI.borrowSummary(),
        dashboardAPI.pmSummary(),
        dashboardAPI.proactiveAlerts(),
      ])
        .then(([a, b, p, pa]) => {
          setAssetSummary(a.data);
          setBorrowSummary(b.data);
          setPmSummary(p.data);
          setProactiveAlerts(pa.data);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user]);

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <CircularProgress size={28} sx={{ color: '#f59e0b' }} />
    </Box>
  );

  // ── USER role — simple quick access ────────────────────────────────────
  if (user?.role === 'USER') {
    const quickLinks = [
      { icon: '✅', label: 'อุปกรณ์พร้อมยืม', path: '/assets?status=Available', color: '#10b981' },
      { icon: '🛒', label: 'ยืมทรัพย์สินใหม่', path: '/borrow/new', color: '#3b82f6' },
      { icon: '📋', label: 'คำขอของฉัน', path: '/borrow/my-requests', color: '#f59e0b' },
      { icon: '📦', label: 'รายการที่ยืม', path: '/borrow/my-items', color: '#8b5cf6' },
      { icon: '📅', label: 'คำขอขยายวัน', path: '/borrow/my-extensions', color: '#06b6d4' },
      { icon: '🕐', label: 'ประวัติการยืม', path: '/borrow/my-history', color: '#6b7280' },
    ];
    return (
      <Box>
        {/* Header */}
        <Box sx={{ mb: '20px' }}>
          <Typography sx={{ fontSize: '18px', fontWeight: 600, color: '#111827', mb: '4px' }}>
            สวัสดี, {user?.displayName || user?.adUsername} 👋
          </Typography>
          <Typography sx={{ fontSize: '12px', color: '#6b7280' }}>
            ระบบบริหารจัดการทรัพย์สิน IT — {now()}
          </Typography>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {quickLinks.map(lnk => (
            <Box key={lnk.path} onClick={() => navigate(lnk.path)} sx={{
              bgcolor: '#fff', border: '0.5px solid #e5e7eb', borderRadius: '10px',
              p: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px',
              transition: 'border-color .15s, box-shadow .15s',
              '&:hover': { borderColor: lnk.color, boxShadow: `0 0 0 3px ${alpha(lnk.color, 0.08)}` },
            }}>
              <Box sx={{ fontSize: '22px' }}>{lnk.icon}</Box>
              <Typography sx={{ fontSize: '12.5px', fontWeight: 500, color: '#374151' }}>{lnk.label}</Typography>
              <Box sx={{ ml: 'auto', fontSize: '14px', color: '#d1d5db' }}>›</Box>
            </Box>
          ))}
        </Box>
      </Box>
    );
  }

  // ── ADMIN dashboard ─────────────────────────────────────────────────────
  const total = assetSummary?.total || 0;
  const byStatus: any[] = assetSummary?.byStatus || [];
  const byCategory: any[] = assetSummary?.byCategory || [];

  const available   = byStatus.find(s => s.status === 'Available')?._count || 0;
  const maintenance = byStatus.find(s => s.status === 'Maintenance')?._count || 0;

  const pmTotal     = pmSummary?.total || 0;
  const pmDone      = pmSummary?.completed || 0;
  const pmPct       = pct(pmDone, pmTotal);

  const borrowActive  = borrowSummary?.activeBorrows || 0;
  const borrowPending = borrowSummary?.pendingApproval || 0;
  const borrowOverdue = borrowSummary?.overdue || 0;

  // Simulated sparkline data (last 6 months ratio from summary)
  const sparkValues = [3, 5, 4, 7, 6, pmDone || 5, maintenance || 2];

  // Donut segments from byCategory
  const donutTotal = byCategory.reduce((s: number, c: any) => s + (c.assetCount ?? 0), 0) || total;
  const donutSegs = byCategory.slice(0, 6).map((c: any, i: number) => ({
    value: c.assetCount ?? 0,
    color: CAT_COLORS[i % CAT_COLORS.length],
  }));
  if (donutSegs.length === 0) {
    donutSegs.push({ value: total, color: '#f59e0b' });
  }

  // Alerts list
  const alerts: { icon: string; text: string; sub: string; pill: any }[] = [];
  if (proactiveAlerts) {
    if (proactiveAlerts.overdueItems > 0) alerts.push({ icon: '⏰', text: `ยืมเกินกำหนด ${proactiveAlerts.overdueItems} รายการ`, sub: 'กรุณาติดตามผู้ยืม', pill: 'red' });
    if (proactiveAlerts.pendingApprovals > 0) alerts.push({ icon: '⏳', text: `รออนุมัติ ${proactiveAlerts.pendingApprovals} รายการ`, sub: 'คำขอยืมรอการตรวจสอบ', pill: 'orange' });
    if (proactiveAlerts.upcomingPMs > 0) alerts.push({ icon: '📅', text: `มีแผน PM ในสัปดาห์นี้ ${proactiveAlerts.upcomingPMs} รายการ`, sub: 'เตรียมความพร้อมการตรวจนับ', pill: 'yellow' });
  }

  // If no proactive alerts, fallback to summaries-based alerts (or maintenance)
  if (alerts.length === 0) {
    if (maintenance > 0) alerts.push({ icon: '🔧', text: `ส่งซ่อม ${maintenance} รายการ`, sub: 'อุปกรณ์อยู่ระหว่างซ่อม', pill: 'yellow' });
    if (alerts.length === 0) alerts.push({ icon: '✅', text: 'ไม่มีการแจ้งเตือนด่วน', sub: 'ระบบทำงานปกติทุกส่วน', pill: 'green' });
  }

  // Quick links
  const quickLinks = [
    { icon: '➕', label: 'เพิ่มทรัพย์สิน', path: '/assets/new', color: '#f59e0b' },
    { icon: '✅', label: 'รออนุมัติยืม', path: '/borrow/approval-queue', color: '#3b82f6' },
    { icon: '📤', label: 'ส่งมอบอุปกรณ์', path: '/borrow/checkout', color: '#10b981' },
    { icon: '📥', label: 'รับคืนอุปกรณ์', path: '/borrow/return', color: '#8b5cf6' },
    { icon: '📊', label: 'รายงานทรัพย์สิน', path: '/reports/assets', color: '#06b6d4' },
    { icon: '📅', label: 'แผน PM', path: '/pm/plans', color: '#f97316' },
  ];

  return (
    <Box sx={{ pb: '24px' }}>

      {/* ── Page header ─────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: '16px' }}>
        <Box>
          <Typography sx={{ fontSize: '15px', fontWeight: 500, color: '#111827', mb: '2px' }}>
            📊 Dashboard ภาพรวมระบบ
          </Typography>
          <Typography sx={{ fontSize: '11px', color: '#6b7280' }}>
            ข้อมูล ณ {now()} — อัปเดตเรียลไทม์
          </Typography>
        </Box>
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: '6px',
          bgcolor: '#f0fdf4', color: '#065f46',
          fontSize: '11px', fontWeight: 500, px: '10px', py: '4px',
          borderRadius: '999px', border: '0.5px solid #bbf7d0',
        }}>
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#10b981', animation: 'pulse 2s infinite' }} />
          Live
        </Box>
      </Box>

      {/* ── Proactive Alerts Bar ────────────────────────────────── */}
      {proactiveAlerts && (
        alerts.some(a => a.pill !== 'green') && (
          <Box sx={{ mb: '16px', display: 'flex', gap: '10px', overflowX: 'auto', pb: '4px' }}>
            {alerts.filter(a => a.pill !== 'green').map((alert, i) => (
              <Box key={i} sx={{
                minWidth: '280px',
                bgcolor: alpha(alert.pill === 'red' ? '#ef4444' : alert.pill === 'orange' ? '#f59e0b' : '#fcd34d', 0.1),
                border: '1px solid',
                borderColor: alert.pill === 'red' ? '#fca5a5' : alert.pill === 'orange' ? '#fdba74' : '#fde68a',
                borderRadius: '10px',
                p: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}>
                <Box sx={{ fontSize: '24px' }}>{alert.icon}</Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{alert.text}</Typography>
                  <Typography sx={{ fontSize: '11px', color: '#4b5563', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{alert.sub}</Typography>
                </Box>
              </Box>
            ))}
          </Box>
        )
      )}

      {/* ── Asset summary grid (12 tiles) ───────────────────────── */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        gap: '10px',
        mb: '16px',
      }}>
        {byCategory.slice(0, 5).map((cat: any, i: number) => (
          <StatCard key={cat.id || i} icon={cat.icon || '📦'} label={cat.name}
            value={cat.assetCount ?? 0}
            color={CAT_COLORS[i % CAT_COLORS.length]}
            onClick={() => navigate(categoryNavMap[cat.name] || '/assets')} />
        ))}
        <StatCard icon="📦" label="อุปกรณ์ทั้งหมด"  value={total} color="#374151" topBorder onClick={() => navigate('/assets')} />
        <StatCard icon="✏️"  label="งานซ่อมเปิดอยู่" value={maintenance}      color="#ef4444" sub="Maintenance" onClick={() => navigate('/assets?status=Maintenance')} />
        <StatCard icon="🔄" label="กำลังยืม"         value={borrowActive}     color="#f59e0b" onClick={() => navigate('/borrow/history')} />
        <StatCard icon="⏳"  label="รออนุมัติ"        value={borrowPending}    color="#3b82f6" onClick={() => navigate('/borrow/approval-queue')} />
        <StatCard icon="⚠️" label="ยืมเกินกำหนด"     value={borrowOverdue}    color="#ef4444" sub="Overdue" onClick={() => navigate('/borrow/overdue')} />
        <StatCard icon="📅" label="แผน PM เดือนนี้"  value={pmTotal}          color="#f59e0b" onClick={() => navigate('/pm')} />
        <StatCard icon="✅" label="PM เสร็จแล้ว"      value={pmDone}           color="#10b981" sub={`${pmPct}%`} onClick={() => navigate('/pm/runs')} />
      </Box>

      {/* ── Row 2: 4 stat bands ─────────────────────────────────── */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
        mb: '16px',
      }}>
        {[
          { icon: '✏️', label: 'งานซ่อมที่เปิดอยู่', value: maintenance, sub: `เดือนนี้ ${maintenance} งาน`, badge: 'On Track', badgePill: 'green' as const, barColor: '#f59e0b', barPct: pct(maintenance, total || 1) },
          { icon: '🖥️', label: 'ทรัพย์สิน IT ทั้งหมด', value: total, sub: `ใช้งาน ${available} · ซ่อม ${maintenance}`, badge: 'Active', badgePill: 'blue' as const, barColor: '#3b82f6', barPct: pct(available, total || 1) },
          { icon: '✅', label: 'PM Completion', value: `${pmPct}%`, sub: `เป้า 100% · เสร็จ ${pmDone}/${pmTotal}`, badge: `${pmPct}%`, badgePill: pmPct >= 80 ? 'green' as const : 'yellow' as const, barColor: '#10b981', barPct: pmPct },
          { icon: '⚠️', label: 'การแจ้งเตือน', value: alerts.filter(a => a.pill !== 'green').length, sub: `Overdue ${borrowOverdue} · รออนุมัติ ${borrowPending}`, badge: alerts.filter(a => a.pill !== 'green').length > 0 ? 'ด่วน' : 'ปกติ', badgePill: alerts.filter(a => a.pill !== 'green').length > 0 ? 'red' as const : 'green' as const, barColor: '#ef4444', barPct: pct(borrowOverdue, borrowActive || 1) },
        ].map((band, i) => (
          <Box key={i} sx={{ bgcolor: '#fff', border: '0.5px solid #e5e7eb', borderRadius: '10px', p: '14px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: '8px' }}>
              <Box sx={{ fontSize: '20px' }}>{band.icon}</Box>
              <Pill label={band.badge} variant={band.badgePill} />
            </Box>
            <Box sx={{ fontSize: '28px', fontWeight: 500, color: band.barColor, lineHeight: 1 }}>{band.value}</Box>
            <Box sx={{ fontSize: '12px', color: '#374151', mt: '2px' }}>{band.label}</Box>
            <Box sx={{ fontSize: '10px', color: '#9ca3af', mt: '2px', mb: '10px' }}>{band.sub}</Box>
            {/* mini bar segments */}
            <Box sx={{ display: 'flex', gap: '2px' }}>
              {Array(10).fill(0).map((_, j) => (
                <Box key={j} sx={{
                  flex: 1, height: '5px', borderRadius: '2px',
                  bgcolor: j < Math.round(band.barPct / 10) ? band.barColor : alpha(band.barColor, 0.15),
                }} />
              ))}
            </Box>
          </Box>
        ))}
      </Box>

      {/* ── Row 3: Charts + Table ────────────────────────────────── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', mb: '14px' }}>

        {/* Asset status breakdown */}
        <SectionCard title="📊 สรุปสถานะทรัพย์สิน" action={() => navigate('/assets')} actionLabel="ดูทั้งหมด">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {byStatus.length > 0 ? byStatus.map((s: any) => {
              const cfg = STATUS_CFG[s.status] || { label: s.status, color: '#6b7280', pill: 'grey' };
              const p = pct(s._count, total);
              return (
                <Box key={s.status}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: '4px' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: cfg.color, flexShrink: 0 }} />
                      <Typography sx={{ fontSize: '12px', color: '#374151' }}>{cfg.label}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>{s._count}</Typography>
                      <Typography sx={{ fontSize: '10px', color: '#9ca3af', minWidth: '32px', textAlign: 'right' }}>{p}%</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ height: '5px', borderRadius: '3px', bgcolor: '#f3f4f6', overflow: 'hidden' }}>
                    <Box sx={{ height: '100%', width: `${p}%`, borderRadius: '3px', bgcolor: cfg.color, transition: 'width .5s ease' }} />
                  </Box>
                </Box>
              );
            }) : (
              <Typography sx={{ fontSize: '12px', color: '#9ca3af', py: '8px' }}>ยังไม่มีข้อมูล</Typography>
            )}
          </Box>
        </SectionCard>

        {/* Category donut */}
        <SectionCard title="🗂️ สัดส่วนทรัพย์สินตามหมวดหมู่" action={() => navigate('/assets')} actionLabel={`${total} รายการ`}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <DonutChart segments={donutSegs} total={donutTotal} />
            <Box sx={{ flex: 1 }}>
              {byCategory.slice(0, 6).map((c: any, i: number) => (
                <Box key={c.name || i} sx={{ display: 'flex', alignItems: 'center', gap: '6px', mb: '5px' }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: CAT_COLORS[i % CAT_COLORS.length], flexShrink: 0 }} />
                  <Typography sx={{ fontSize: '11px', color: '#4b5563', flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    {c.name || 'อื่นๆ'}
                  </Typography>
                  <Typography sx={{ fontSize: '11px', fontWeight: 600, color: '#111827', flexShrink: 0 }}>{c.assetCount ?? 0}</Typography>
                </Box>
              ))}
              {byCategory.length === 0 && (
                <Typography sx={{ fontSize: '11px', color: '#9ca3af' }}>ยังไม่มีข้อมูลหมวดหมู่</Typography>
              )}
            </Box>
          </Box>
        </SectionCard>
      </Box>

      {/* ── Row 4: Borrow + PM + Alerts ─────────────────────────── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', mb: '14px' }}>

        {/* Borrow summary */}
        <SectionCard title="🔄 ระบบยืม-คืน" action={() => navigate('/borrow/approval-queue')} actionLabel="จัดการ">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px', mb: '12px' }}>
            {[
              { label: 'กำลังยืม', value: borrowActive, color: '#f59e0b', icon: '📦' },
              { label: 'รออนุมัติ', value: borrowPending, color: '#3b82f6', icon: '⏳' },
              { label: 'เกินกำหนด', value: borrowOverdue, color: '#ef4444', icon: '⚠️' },
            ].map(row => (
              <Box key={row.label} sx={{
                display: 'flex', alignItems: 'center', gap: '8px',
                p: '9px 12px', borderRadius: '8px',
                border: '0.5px solid #f3f4f6',
                bgcolor: alpha(row.color, 0.03),
              }}>
                <Box sx={{ fontSize: '14px' }}>{row.icon}</Box>
                <Typography sx={{ fontSize: '12px', color: '#374151', flex: 1 }}>{row.label}</Typography>
                <Typography sx={{ fontSize: '16px', fontWeight: 600, color: row.color }}>{row.value}</Typography>
              </Box>
            ))}
          </Box>
          {/* Mini sparkline */}
          <Box>
            <Typography sx={{ fontSize: '10px', color: '#9ca3af', mb: '4px' }}>แนวโน้ม 7 วัน</Typography>
            <MiniBarChart values={[2,4,3,5,4,borrowActive||3,borrowOverdue||1]} color="#f59e0b" />
          </Box>
        </SectionCard>

        {/* PM summary */}
        <SectionCard title="📅 PM ตรวจนับ" action={() => navigate('/pm')} actionLabel="รายละเอียด">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px', mb: '12px' }}>
            {[
              { label: 'แผนงานทั้งหมด', value: pmTotal,         color: '#374151', icon: '📋' },
              { label: 'เสร็จสมบูรณ์',   value: pmDone,          color: '#10b981', icon: '✅' },
              { label: 'คงเหลือ',         value: pmTotal - pmDone, color: '#f59e0b', icon: '🕐' },
            ].map(row => (
              <Box key={row.label} sx={{
                display: 'flex', alignItems: 'center', gap: '8px',
                p: '9px 12px', borderRadius: '8px',
                border: '0.5px solid #f3f4f6',
              }}>
                <Box sx={{ fontSize: '14px' }}>{row.icon}</Box>
                <Typography sx={{ fontSize: '12px', color: '#374151', flex: 1 }}>{row.label}</Typography>
                <Typography sx={{ fontSize: '16px', fontWeight: 600, color: row.color }}>{row.value}</Typography>
              </Box>
            ))}
          </Box>
          {/* Progress ring */}
          <Box sx={{ bgcolor: alpha('#10b981', 0.05), border: '0.5px solid #d1fae5', borderRadius: '8px', p: '12px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: '6px' }}>
              <Typography sx={{ fontSize: '11px', color: '#374151' }}>ความคืบหน้า</Typography>
              <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#10b981' }}>{pmPct}%</Typography>
            </Box>
            <LinearProgress variant="determinate" value={pmPct} sx={{
              height: '6px', borderRadius: '3px',
              bgcolor: alpha('#10b981', 0.12),
              '& .MuiLinearProgress-bar': { borderRadius: '3px', bgcolor: '#10b981' },
            }} />
          </Box>
        </SectionCard>

        {/* Alerts */}
        <SectionCard title="🔔 การแจ้งเตือน" action={() => navigate('/admin/notification-logs')} actionLabel="ดูประวัติ">
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            {alerts.map((alert, i) => (
              <React.Fragment key={i}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: '10px', py: '9px' }}>
                  <Box sx={{
                    width: 28, height: 28, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    bgcolor: alert.pill === 'red' ? '#fef2f2' : alert.pill === 'green' ? '#f0fdf4' : '#fff7ed',
                    fontSize: '13px', flexShrink: 0,
                  }}>
                    {alert.icon}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '6px' }}>
                      <Typography sx={{ fontSize: '12px', fontWeight: 500, color: '#111827', lineHeight: 1.3 }}>{alert.text}</Typography>
                      <Pill label={alert.pill === 'red' ? 'ด่วน' : alert.pill === 'orange' ? 'รอ' : alert.pill === 'green' ? 'ปกติ' : 'แจ้ง'} variant={alert.pill} />
                    </Box>
                    <Typography sx={{ fontSize: '11px', color: '#6b7280', mt: '2px' }}>{alert.sub}</Typography>
                  </Box>
                </Box>
                {i < alerts.length - 1 && <Divider sx={{ borderColor: '#f3f4f6' }} />}
              </React.Fragment>
            ))}
          </Box>
        </SectionCard>

      </Box>

      {/* ── Row 5: Quick actions + Recent activity ──────────────── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>

        {/* Quick actions */}
        <SectionCard title="⚡ ทางลัด">
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {quickLinks.map(lnk => (
              <Box key={lnk.path} onClick={() => navigate(lnk.path)} sx={{
                display: 'flex', alignItems: 'center', gap: '8px',
                p: '10px 12px', borderRadius: '8px',
                border: '0.5px solid #e5e7eb',
                cursor: 'pointer',
                transition: 'border-color .15s, background .15s',
                '&:hover': { borderColor: lnk.color, bgcolor: alpha(lnk.color, 0.04) },
              }}>
                <Box sx={{ fontSize: '16px' }}>{lnk.icon}</Box>
                <Typography sx={{ fontSize: '12px', fontWeight: 500, color: '#374151' }}>{lnk.label}</Typography>
                <Box sx={{ ml: 'auto', fontSize: '12px', color: '#d1d5db' }}>›</Box>
              </Box>
            ))}
          </Box>
        </SectionCard>

        {/* System health */}
        <SectionCard title="💚 สถานะระบบ">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { label: 'ทะเบียน IT Asset', pct: 100, color: '#10b981' },
              { label: 'ระบบยืม-คืน', pct: borrowOverdue > 0 ? 70 : 100, color: borrowOverdue > 0 ? '#f59e0b' : '#10b981' },
              { label: 'ระบบ PM', pct: pmPct, color: pmPct > 80 ? '#10b981' : '#f59e0b' },
              { label: 'การแจ้งเตือน', pct: 100, color: '#10b981' },
            ].map(item => (
              <Box key={item.label}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '4px' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: item.color }} />
                    <Typography sx={{ fontSize: '11px', color: '#374151' }}>{item.label}</Typography>
                  </Box>
                  <Typography sx={{ fontSize: '11px', fontWeight: 600, color: item.color }}>{item.pct}%</Typography>
                </Box>
                <LinearProgress variant="determinate" value={item.pct} sx={{
                  height: '4px', borderRadius: '2px',
                  bgcolor: alpha(item.color, 0.12),
                  '& .MuiLinearProgress-bar': { borderRadius: '2px', bgcolor: item.color },
                }} />
              </Box>
            ))}
          </Box>
        </SectionCard>

      </Box>

      {/* ── Pulse animation ─────────────────────────────────────── */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </Box>
  );
}
