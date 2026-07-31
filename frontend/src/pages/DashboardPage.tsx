import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, LinearProgress, Divider, alpha, useTheme, Chip,
} from '@mui/material';
import {
  BarChart, Bar, Cell, ResponsiveContainer, PieChart, Pie,
  Tooltip as RechartsTooltip, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import {
  LayoutDashboard, Boxes, ShoppingCart, Wrench, AlertTriangle,
  CheckCircle2, Clock, TrendingUp, Shield, ClipboardList, Zap,
  RotateCcw, FileText, PackageX, Activity, ArrowUpRight, BellRing,
  Key,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { dashboardAPI, contractAPI, licenseAPI } from '../services/api';
import LoadingSkeleton from '../components/LoadingSkeleton';

// ── Helpers ──────────────────────────────────────────────────────────────────
function now() {
  return new Date().toLocaleDateString('th-TH', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}
function pct(a: number, b: number) {
  return b > 0 ? Math.round((a / b) * 100) : 0;
}
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'เมื่อสักครู่';
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ชั่วโมงที่แล้ว`;
  const d = Math.floor(h / 24);
  return `${d} วันที่แล้ว`;
}
const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

// ── Sub-components ─────────────────────────────────────────────────────────

// Themed donut chart (Recharts)
function DonutChart({ segments, total }: { segments: { value: number; color: string; name?: string }[]; total: number }) {
  const theme = useTheme();
  return (
    <Box sx={{ width: 130, height: 130, position: 'relative', flexShrink: 0 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={segments}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={58}
            paddingAngle={2}
            dataKey="value"
            stroke="none"
          >
            {segments.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <RechartsTooltip
            contentStyle={{
              borderRadius: 8, border: 'none',
              background: theme.palette.background.paper,
              boxShadow: theme.shadows[4], fontSize: 12,
            }}
            itemStyle={{ color: theme.palette.text.primary, fontWeight: 500 }}
            formatter={(value: any) => [value, 'รายการ']}
          />
        </PieChart>
      </ResponsiveContainer>
      <Box sx={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
      }}>
        <Typography sx={{ fontSize: 18, fontWeight: 700, color: theme.palette.text.primary, lineHeight: 1 }}>
          {total}
        </Typography>
        <Typography sx={{ fontSize: 9, color: theme.palette.text.secondary, mt: 0.3 }}>รายการ</Typography>
      </Box>
    </Box>
  );
}

// KPI stat card (icon-in-circle, theme tokens, optional trend)
function KpiCard({ icon: Icon, label, value, sub, accent, trend, onClick }: {
  icon: LucideIcon; label: string; value: string | number; sub?: string;
  accent: string; trend?: { dir: 'up' | 'down'; text: string }; onClick?: () => void;
}) {
  const theme = useTheme();
  return (
    <Box onClick={onClick} sx={{
      background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
      border: '1px solid #e2e8f0',
      borderRadius: 4,
      p: 2.5,
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all .25s cubic-bezier(0.4, 0, 0.2, 1)',
      height: '100%',
      boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
      '&:hover': onClick ? {
        borderColor: accent,
        transform: 'translateY(-4px)',
        boxShadow: `0 12px 25px ${alpha(accent, 0.08)}`,
      } : {},
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Box sx={{
          width: 44, height: 44, borderRadius: 3,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: alpha(accent, 0.08),
        }}>
          <Icon size={22} strokeWidth={2.2} color={accent} />
        </Box>
        {trend && (
          <Chip
            size="small"
            icon={trend.dir === 'up'
              ? <TrendingUp size={13} color={theme.palette.success.main} />
              : <TrendingUp size={13} color={theme.palette.error.main} style={{ transform: 'rotate(180deg)' }} />}
            label={trend.text}
            sx={{
              height: 22, fontSize: '0.7rem', fontWeight: 700,
              bgcolor: alpha(trend.dir === 'up' ? theme.palette.success.main : theme.palette.error.main, 0.08),
              color: trend.dir === 'up' ? theme.palette.success.main : theme.palette.error.main,
              '& .MuiChip-icon': { marginLeft: '6px', mr: 0 },
            }}
          />
        )}
      </Box>
      <Typography sx={{ fontSize: 28, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
        {value}
      </Typography>
      <Typography sx={{ fontSize: '0.8rem', color: '#475569', mt: 0.75, fontWeight: 700 }}>
        {label}
      </Typography>
      {sub && <Typography sx={{ fontSize: '0.72rem', color: '#64748b', mt: 0.5, fontWeight: 500 }}>{sub}</Typography>}
    </Box>
  );
}

// Section card (themed)
function SectionCard({ title, icon: Icon, action, actionLabel, children }: {
  title: string; icon: LucideIcon; action?: () => void; actionLabel?: string; children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <Box sx={{
      bgcolor: theme.palette.background.paper,
      border: '1px solid #e2e8f0',
      borderRadius: 4,
      p: 2.5,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 4px 15px rgba(0,0,0,0.015)',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Icon size={18} strokeWidth={2.2} color={theme.palette.primary.main} />
          <Typography sx={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>{title}</Typography>
        </Box>
        {action && actionLabel && (
          <Box onClick={action} sx={{
            display: 'flex', alignItems: 'center', gap: 0.25,
            fontSize: '0.75rem', fontWeight: 700, color: theme.palette.primary.main, cursor: 'pointer',
            bgcolor: alpha(theme.palette.primary.main, 0.06),
            px: 1.25, py: 0.5, borderRadius: '999px',
            transition: 'all 0.2s',
            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.12) },
          }}>
            {actionLabel}
            <ArrowUpRight size={12} style={{ marginLeft: 2 }} />
          </Box>
        )}
      </Box>
      <Box sx={{ flex: 1, minHeight: 0 }}>{children}</Box>
    </Box>
  );
}

// ── Status config (theme-aware via getStatusMeta) ──────────────────────────
const STATUS_CFG: Record<string, { label: string; colorKey: 'success' | 'warning' | 'error' | 'info' | 'neutral' }> = {
  Available:   { label: 'พร้อมใช้งาน', colorKey: 'success' },
  Borrowed:    { label: 'กำลังยืม',    colorKey: 'warning' },
  InUse:       { label: 'ใช้งานประจำ', colorKey: 'info' },
  Maintenance: { label: 'ซ่อมบำรุง',  colorKey: 'error' },
  Retired:     { label: 'ปลดระวาง',   colorKey: 'neutral' },
  Lost:        { label: 'สูญหาย',     colorKey: 'error' },
};

function statusColor(theme: any, key: string): string {
    const cfg = STATUS_CFG[key] || { colorKey: 'neutral' };
    const map: Record<string, string> = {
      success: theme.palette.success.main,
      warning: theme.palette.warning.main,
      error: theme.palette.error.main,
      info: theme.palette.info?.main || '#0288d1',
      neutral: theme.palette.text.secondary,
    };
    return map[(cfg as any).colorKey] || theme.palette.text.secondary;
  }

const CAT_COLORS = ['#005ab4', '#964400', '#0a73e0', '#465f88', '#ba1a1a', '#bd5700', '#2e7d32'];

// ── Main Dashboard ──────────────────────────────────────────────────────────
export default function DashboardPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [assetSummary, setAssetSummary] = useState<any>(null);
  const [borrowSummary, setBorrowSummary] = useState<any>(null);
  const [pmSummary, setPmSummary] = useState<any>(null);
  const [proactiveAlerts, setProactiveAlerts] = useState<any>(null);
  const [dataHealth, setDataHealth] = useState<any>(null);
  const [warrantyData, setWarrantyData] = useState<any>(null);
  const [trendData, setTrendData] = useState<any>(null);
  const [activityData, setActivityData] = useState<any>(null);
  const [contractList, setContractList] = useState<any[]>([]);
  const [licenseList, setLicenseList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'IT_ADMIN' || user?.role === 'SUPERADMIN') {
      const year = new Date().getFullYear();
      Promise.all([
        dashboardAPI.assetSummary(),
        dashboardAPI.borrowSummary(),
        dashboardAPI.pmSummary(),
        dashboardAPI.proactiveAlerts(),
        dashboardAPI.dataHealth(),
        dashboardAPI.borrowTrend(year),
        dashboardAPI.recentActivity(),
      ])
        .then(([a, b, p, pa, dh, tr, ra]) => {
          setAssetSummary(a.data);
          setBorrowSummary(b.data);
          setPmSummary(p.data);
          setProactiveAlerts(pa.data);
          setDataHealth(dh.data);
          setTrendData(tr.data);
          setActivityData(ra.data);
        })
        .finally(() => setLoading(false));

      // Warranty แยกออกมา — ถ้า API ยังไม่พร้อมหรือ 404 ไม่ทำให้ Dashboard พัง
      dashboardAPI.warrantyExpiring(60)
        .then(w => setWarrantyData(w.data))
        .catch(() => setWarrantyData(null));

      // Contract & License summary (Phase 3) — non-blocking, fail silently
      contractAPI.list({}).then(r => setContractList(r.data || [])).catch(() => {});
      licenseAPI.list({}).then(r => setLicenseList(r.data || [])).catch(() => {});
    } else {
      setLoading(false);
    }
  }, [user]);

  if (loading) return <LoadingSkeleton type="page" />;

  // ── USER role — simple quick access ────────────────────────────────────
  if (user?.role === 'USER') {
    const quickLinks = [
      { icon: CheckCircle2, label: 'อุปกรณ์พร้อมยืม', path: '/assets?status=Available', color: theme.palette.success.main },
      { icon: ShoppingCart, label: 'ยืมทรัพย์สินใหม่', path: '/borrow/new', color: theme.palette.primary.main },
      { icon: ClipboardList, label: 'คำขอของฉัน', path: '/borrow/my-requests', color: theme.palette.warning.main },
      { icon: Boxes, label: 'รายการที่ยืม', path: '/borrow/my-items', color: theme.palette.info.main },
      { icon: Clock, label: 'คำขอขยายวัน', path: '/borrow/my-extensions', color: '#bd5700' },
      { icon: RotateCcw, label: 'ประวัติการยืม', path: '/borrow/my-history', color: theme.palette.text.secondary },
    ];
    return (
      <Box>
        <Box sx={{ mb: '20px' }}>
          <Typography sx={{ fontSize: 18, fontWeight: 600, color: theme.palette.text.primary, mb: '4px' }}>
            สวัสดี, {user?.displayName || user?.adUsername}
          </Typography>
          <Typography sx={{ fontSize: '0.8rem', color: theme.palette.text.secondary }}>
            ระบบบริหารจัดการทรัพย์สิน IT — {now()}
          </Typography>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: '10px' }}>
          {quickLinks.map(lnk => {
            const Icon = lnk.icon;
            return (
              <Box key={lnk.path} onClick={() => navigate(lnk.path)} sx={{
                bgcolor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
                p: 2, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 1.5,
                transition: 'all .2s ease',
                '&:hover': { borderColor: lnk.color, boxShadow: `0 0 0 3px ${alpha(lnk.color, 0.08)}` },
              }}>
                <Icon size={22} strokeWidth={2} color={lnk.color} />
                <Typography sx={{ fontSize: '0.82rem', fontWeight: 500, color: theme.palette.text.primary, flex: 1 }}>{lnk.label}</Typography>
                <ArrowUpRight size={16} color={theme.palette.text.disabled} />
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  }

  // ── ADMIN dashboard ─────────────────────────────────────────────────────
  const total = assetSummary?.total || 0;
  const byStatus: any[] = assetSummary?.byStatus || [];
  const byCategory: any[] = assetSummary?.byCategory || [];
  const byType: any[] = assetSummary?.byType || [];
  const byLocation: any[] = assetSummary?.byLocation || [];

  const available = byStatus.find(s => s.status === 'Available')?._count || 0;
  const maintenance = byStatus.find(s => s.status === 'Maintenance')?._count || 0;

  const pmTotal = pmSummary?.total || 0;
  const pmDone = pmSummary?.completed || 0;
  const pmPct = pct(pmDone, pmTotal);

  const borrowActive = borrowSummary?.activeItems || 0;
  const borrowPending = borrowSummary?.pendingApproval || 0;
  const borrowOverdue = borrowSummary?.overdue || 0;

  // Donut segments from byCategory (real data)
  const donutTotal = byCategory.reduce((s: number, c: any) => s + (c.assetCount ?? 0), 0) || total;
  const donutSegs = byCategory.slice(0, 6).map((c: any, i: number) => ({
    value: c.assetCount ?? 0,
    color: CAT_COLORS[i % CAT_COLORS.length],
    name: c.name,
  }));
  if (donutSegs.length === 0) donutSegs.push({ value: total, color: theme.palette.warning.main, name: 'อื่นๆ' });

  // Alerts list (from real proactive-alerts data)
  const alerts: { icon: LucideIcon; text: string; sub: string; colorKey: string }[] = [];
  if (proactiveAlerts) {
    if (proactiveAlerts.overdueItems > 0) alerts.push({ icon: Clock, text: `ยืมเกินกำหนด ${proactiveAlerts.overdueItems} รายการ`, sub: 'กรุณาติดตามผู้ยืม', colorKey: 'error' });
    if (proactiveAlerts.pendingApprovals > 0) alerts.push({ icon: ClipboardList, text: `รออนุมัติ ${proactiveAlerts.pendingApprovals} รายการ`, sub: 'คำขอยืมรอการตรวจสอบ', colorKey: 'warning' });
    if (proactiveAlerts.upcomingPMs > 0) alerts.push({ icon: Shield, text: `มีแผน PM ในสัปดาห์นี้ ${proactiveAlerts.upcomingPMs} รายการ`, sub: 'เตรียมความพร้อมการตรวจนับ', colorKey: 'warning' });
  }
  if (alerts.length === 0) {
    if (maintenance > 0) alerts.push({ icon: Wrench, text: `ส่งซ่อม ${maintenance} รายการ`, sub: 'อุปกรณ์อยู่ระหว่างซ่อม', colorKey: 'warning' });
    else alerts.push({ icon: CheckCircle2, text: 'ไม่มีการแจ้งเตือนด่วน', sub: 'ระบบทำงานปกติทุกส่วน', colorKey: 'success' });
  }

  // Trend chart data (real, 12 months from borrowTrend API)
  const trendMonths: any[] = trendData?.months || [];
  const chartData = trendMonths.map((m: any) => {
    const monthIdx = parseInt(String(m.month).split('-')[1], 10) - 1;
    return { name: TH_MONTHS[monthIdx] || m.month, ยืม: m.requests, อนุมัติ: m.approved, คืน: m.returned };
  });

  // Recent activity (real, merged requests + returns)
  type ActItem = { id: string; type: 'request' | 'return'; title: string; sub: string; user: string; time: string; status: string };
  const activity: ActItem[] = [];
  (activityData?.recentRequests || []).forEach((r: any) => {
    activity.push({
      id: 'req-' + r.id, type: 'request',
      title: r.requestNo || `คำขอ #${r.id}`,
      sub: r.purpose || 'คำขอยืมทรัพย์สิน',
      user: r.requester?.displayName || '—',
      time: r.createdAt, status: r.status,
    });
  });
  (activityData?.recentReturns || []).forEach((r: any) => {
    activity.push({
      id: 'ret-' + r.id, type: 'return',
      title: r.requestItem?.asset?.assetName || r.requestItem?.asset?.assetCode || 'คืนอุปกรณ์',
      sub: 'คืนอุปกรณ์',
      user: r.returner?.displayName || '—',
      time: r.returnedAt, status: 'Returned',
    });
  });
  activity.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  // Quick actions
  const quickActions = [
    { icon: Zap, label: 'เพิ่มทรัพย์สิน', path: '/assets/new', color: theme.palette.warning.main },
    { icon: CheckCircle2, label: 'รออนุมัติยืม', path: '/borrow/approval-queue', color: theme.palette.primary.main },
    { icon: ShoppingCart, label: 'ส่งมอบอุปกรณ์', path: '/borrow/checkout', color: theme.palette.success.main },
    { icon: RotateCcw, label: 'รับคืนอุปกรณ์', path: '/borrow/return', color: '#bd5700' },
    { icon: FileText, label: 'รายงานทรัพย์สิน', path: '/reports/assets', color: theme.palette.info.main },
    { icon: Shield, label: 'แผน PM', path: '/pm/plans', color: '#964400' },
  ];

  const alertCount = alerts.filter(a => a.colorKey !== 'success').length;

  return (
    <Box sx={{ pb: 3 }}>

      {/* ── Page header ─────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography sx={{ fontSize: '1.05rem', fontWeight: 600, color: theme.palette.text.primary, mb: '2px', display: 'flex', alignItems: 'center', gap: 1 }}>
            <LayoutDashboard size={18} color={theme.palette.primary.main} />
            Dashboard ภาพรวมระบบ
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: theme.palette.text.secondary }}>
            ข้อมูล ณ {now()}
          </Typography>
        </Box>
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 0.75,
          bgcolor: alpha(theme.palette.success.main, 0.10), color: theme.palette.success.main,
          fontSize: '0.72rem', fontWeight: 600, px: 1.25, py: 0.5,
          borderRadius: '999px', border: `1px solid ${alpha(theme.palette.success.main, 0.25)}`,
        }}>
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: theme.palette.success.main }} />
          Live
        </Box>
      </Box>

      {/* ── Proactive Alerts Bar ────────────────────────────────── */}
      {alertCount > 0 && (
        <Box sx={{ mb: 2, display: 'flex', gap: 1.5, overflowX: 'auto', pb: 0.5 }}>
          {alerts.filter(a => a.colorKey !== 'success').map((alert, i) => {
            const AlertIcon = alert.icon;
            const color = statusColor(theme, alert.colorKey === 'success' ? 'Available' : alert.colorKey === 'warning' ? 'Borrowed' : 'Lost');
            return (
              <Box key={i} sx={{
                minWidth: 280, flex: '0 0 auto',
                bgcolor: alpha(color, 0.10),
                border: `1px solid ${alpha(color, 0.25)}`,
                borderRadius: 2, p: 1.5,
                display: 'flex', alignItems: 'center', gap: 1.5,
              }}>
                <Box sx={{
                  width: 32, height: 32, borderRadius: 1.5,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  bgcolor: alpha(color, 0.15), flexShrink: 0,
                }}>
                  <AlertIcon size={18} color={color} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: theme.palette.text.primary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{alert.text}</Typography>
                  <Typography sx={{ fontSize: '0.72rem', color: theme.palette.text.secondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{alert.sub}</Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      {/* ── Row 1: 4 KPI cards (mockup-style) ────────────────────── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 1.5, mb: 2 }}>
        <KpiCard
          icon={Boxes} label="ทรัพย์สิน IT ทั้งหมด" value={total}
          sub={`พร้อมใช้ ${available} · ซ่อม ${maintenance}`}
          accent={theme.palette.primary.main}
          onClick={() => navigate('/assets')}
        />
        <KpiCard
          icon={ShoppingCart} label="กำลังยืม / รออนุมัติ" value={borrowActive}
          sub={`รออนุมัติ ${borrowPending} · เกินกำหนด ${borrowOverdue}`}
          accent={theme.palette.warning.main}
          onClick={() => navigate('/borrow/approval-queue')}
        />
        <KpiCard
          icon={Wrench} label="งานซ่อมเปิดอยู่" value={maintenance}
          sub="อุปกรณ์ระหว่างซ่อมบำรุง"
          accent={theme.palette.error.main}
          onClick={() => navigate('/assets?status=Maintenance')}
        />
        <KpiCard
          icon={Shield} label="PM เสร็จแล้ว" value={`${pmPct}%`}
          sub={`${pmDone}/${pmTotal} แผนงาน`}
          accent={theme.palette.success.main}
          onClick={() => navigate('/pm/runs')}
        />
      </Box>

      {/* ── Row 2: Donut + Trend bar chart ───────────────────────── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '5fr 7fr' }, gap: 1.5, mb: 2 }}>

        {/* Category donut */}
        <SectionCard title="สัดส่วนตามหมวดหมู่" icon={Boxes} action={() => navigate('/assets')} actionLabel={`${total} รายการ`}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, height: '100%' }}>
            <DonutChart segments={donutSegs} total={donutTotal} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {byCategory.slice(0, 6).map((c: any, i: number) => (
                <Box key={c.name || i} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: CAT_COLORS[i % CAT_COLORS.length], flexShrink: 0 }} />
                  <Typography sx={{ fontSize: '0.72rem', color: theme.palette.text.secondary, flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    {c.name || 'อื่นๆ'}
                  </Typography>
                  <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: theme.palette.text.primary, flexShrink: 0 }}>{c.assetCount ?? 0}</Typography>
                </Box>
              ))}
              {byCategory.length === 0 && (
                <Typography sx={{ fontSize: '0.72rem', color: theme.palette.text.secondary }}>ยังไม่มีข้อมูลหมวดหมู่</Typography>
              )}
            </Box>
          </Box>
        </SectionCard>

        {/* Borrow trend bar chart (real data) */}
        <SectionCard title={`แนวโน้มยืม-คืน ปี ${new Date().getFullYear()}`} icon={Activity} action={() => navigate('/reports/borrow')} actionLabel="รายงาน">
          <Box sx={{ height: 220, width: '100%' }}>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.5)} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: theme.palette.text.secondary }} axisLine={{ stroke: theme.palette.divider }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: theme.palette.text.secondary }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: 8, border: 'none', background: theme.palette.background.paper, boxShadow: theme.shadows[4], fontSize: 12 }}
                    labelStyle={{ color: theme.palette.text.primary, fontWeight: 600 }}
                    itemStyle={{ color: theme.palette.text.primary }}
                  />
                  <Bar dataKey="ยืม" fill={theme.palette.primary.main} radius={[3, 3, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="อนุมัติ" fill={theme.palette.success.main} radius={[3, 3, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="คืน" fill={theme.palette.warning.main} radius={[3, 3, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Typography sx={{ fontSize: '0.78rem', color: theme.palette.text.secondary }}>ยังไม่มีข้อมูล</Typography>
            )}
          </Box>
        </SectionCard>
      </Box>

      {/* ── Row 3: Recent activity + Quick actions ───────────────── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '8fr 4fr' }, gap: 1.5, mb: 2 }}>

        {/* Recent activity (real data) */}
        <SectionCard title="กิจกรรมล่าสุด" icon={Activity} action={() => navigate('/borrow/history')} actionLabel="ดูทั้งหมด">
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            {activity.length > 0 ? activity.slice(0, 6).map((a, i) => {
              const color = statusColor(theme, a.status);
              return (
                <React.Fragment key={a.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, py: 1 }}>
                    <Box sx={{
                      width: 32, height: 32, borderRadius: 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      bgcolor: alpha(color, 0.12), flexShrink: 0,
                    }}>
                      {a.type === 'return'
                        ? <RotateCcw size={15} color={color} />
                        : <ShoppingCart size={15} color={color} />}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: theme.palette.text.primary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {a.title}
                      </Typography>
                      <Typography sx={{ fontSize: '0.7rem', color: theme.palette.text.secondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {a.sub} · {a.user}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                      <Typography sx={{ fontSize: '0.68rem', color: theme.palette.text.secondary }}>{timeAgo(a.time)}</Typography>
                    </Box>
                  </Box>
                  {i < Math.min(activity.length, 6) - 1 && <Divider sx={{ borderColor: theme.palette.divider }} />}
                </React.Fragment>
              );
            }) : (
              <Typography sx={{ fontSize: '0.78rem', color: theme.palette.text.secondary, py: 2 }}>ยังไม่มีกิจกรรม</Typography>
            )}
          </Box>
        </SectionCard>

        {/* Quick actions panel (mockup-style solid primary) */}
        <Box sx={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: 4, p: 2.5, color: '#fff',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 8px 25px rgba(15, 23, 42, 0.15)',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Zap size={18} color="#f59e0b" strokeWidth={2.5} />
            <Typography sx={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff' }}>ทางลัดด่วน (Shortcuts)</Typography>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, flex: 1 }}>
            {quickActions.map(act => {
              const Icon = act.icon;
              return (
                <Box key={act.path} onClick={() => navigate(act.path)} sx={{
                  bgcolor: 'rgba(255,255,255,0.06)',
                  borderRadius: 3, p: 1.5, cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', gap: 0.75,
                  transition: 'all 0.2s ease-in-out',
                  border: '1px solid rgba(255,255,255,0.05)',
                  '&:hover': { 
                    bgcolor: 'rgba(255,255,255,0.12)', 
                    transform: 'translateY(-2px)',
                    borderColor: 'rgba(255,255,255,0.2)' 
                  },
                }}>
                  <Icon size={18} color="#fff" />
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{act.label}</Typography>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>

      {/* ── Row 4: Status breakdown + Location + Borrow + PM ─────── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 1.5, mb: 2 }}>

        {/* Asset status breakdown */}
        <SectionCard title="สรุปสถานะทรัพย์สิน" icon={CheckCircle2} action={() => navigate('/assets')} actionLabel="ดูทั้งหมด">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {byStatus.length > 0 ? byStatus.map((s: any) => {
              const cfg = STATUS_CFG[s.status] || { label: s.status, colorKey: 'neutral' };
              const color = statusColor(theme, s.status);
              const p = pct(s._count, total);
              return (
                <Box key={s.status}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.25 }}>
                    <Typography sx={{ fontSize: '0.72rem', color: theme.palette.text.secondary }}>{cfg.label}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: theme.palette.text.primary }}>{s._count}</Typography>
                      <Typography sx={{ fontSize: '0.68rem', color: theme.palette.text.disabled, minWidth: 28, textAlign: 'right' }}>{p}%</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ height: 4, borderRadius: 2, bgcolor: alpha(color, 0.12), overflow: 'hidden' }}>
                    <Box sx={{ height: '100%', width: `${p}%`, borderRadius: 2, bgcolor: color }} />
                  </Box>
                </Box>
              );
            }) : (
              <Typography sx={{ fontSize: '0.72rem', color: theme.palette.text.secondary, py: 1 }}>ยังไม่มีข้อมูล</Typography>
            )}
          </Box>
        </SectionCard>

        {/* Location breakdown */}
        <SectionCard title="ทรัพย์สินตามสถานที่ตั้ง" icon={Boxes} action={() => navigate('/assets')} actionLabel="แผนที่">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {byLocation.length > 0 ? byLocation.slice(0, 6).map((loc: any, i: number) => {
              const locName = loc.location || 'ไม่ระบุสถานที่';
              const locColor = CAT_COLORS[(i + 3) % CAT_COLORS.length];
              const p = pct(loc._count, total);
              return (
                <Box key={locName}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.25 }}>
                    <Typography sx={{ fontSize: '0.72rem', color: theme.palette.text.secondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>{locName}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: theme.palette.text.primary }}>{loc._count}</Typography>
                      <Typography sx={{ fontSize: '0.68rem', color: theme.palette.text.disabled, minWidth: 28, textAlign: 'right' }}>{p}%</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ height: 4, borderRadius: 2, bgcolor: alpha(locColor, 0.12), overflow: 'hidden' }}>
                    <Box sx={{ height: '100%', width: `${p}%`, borderRadius: 2, bgcolor: locColor }} />
                  </Box>
                </Box>
              );
            }) : (
              <Typography sx={{ fontSize: '0.72rem', color: theme.palette.text.secondary, py: 1 }}>ยังไม่มีข้อมูล</Typography>
            )}
          </Box>
        </SectionCard>

        {/* Borrow summary */}
        <SectionCard title="ระบบยืม-คืน" icon={ShoppingCart} action={() => navigate('/borrow/approval-queue')} actionLabel="จัดการ">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {[
              { label: 'กำลังยืม', value: borrowActive, status: 'Borrowed' },
              { label: 'รออนุมัติ', value: borrowPending, status: 'Borrowed' },
              { label: 'เกินกำหนด', value: borrowOverdue, status: 'Lost' },
            ].map(row => {
              const color = statusColor(theme, row.status);
              return (
                <Box key={row.label} sx={{
                  display: 'flex', alignItems: 'center', gap: 1,
                  p: '7px 10px', borderRadius: 1.5,
                  bgcolor: alpha(color, 0.06),
                }}>
                  <Typography sx={{ fontSize: '0.75rem', color: theme.palette.text.secondary, flex: 1 }}>{row.label}</Typography>
                  <Typography sx={{ fontSize: '1rem', fontWeight: 700, color }}>{row.value}</Typography>
                </Box>
              );
            })}
          </Box>
        </SectionCard>

        {/* PM summary */}
        <SectionCard title="PM ตรวจนับ" icon={Shield} action={() => navigate('/pm')} actionLabel="รายละเอียด">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 1.25 }}>
            {[
              { label: 'แผนงานทั้งหมด', value: pmTotal, color: theme.palette.text.secondary },
              { label: 'เสร็จสมบูรณ์', value: pmDone, color: theme.palette.success.main },
              { label: 'คงเหลือ', value: pmTotal - pmDone, color: theme.palette.warning.main },
            ].map(row => (
              <Box key={row.label} sx={{
                display: 'flex', alignItems: 'center', gap: 1,
                p: '7px 10px', borderRadius: 1.5,
                bgcolor: alpha(theme.palette.divider, 0.4),
              }}>
                <Typography sx={{ fontSize: '0.75rem', color: theme.palette.text.secondary, flex: 1 }}>{row.label}</Typography>
                <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: row.color }}>{row.value}</Typography>
              </Box>
            ))}
          </Box>
          <Box sx={{
            bgcolor: alpha(theme.palette.success.main, 0.06),
            border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
            borderRadius: 1.5, p: 1.25,
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography sx={{ fontSize: '0.72rem', color: theme.palette.text.secondary }}>ความคืบหน้า</Typography>
              <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: theme.palette.success.main }}>{pmPct}%</Typography>
            </Box>
            <LinearProgress variant="determinate" value={pmPct} sx={{
              height: 6, borderRadius: 3,
              bgcolor: alpha(theme.palette.success.main, 0.12),
              '& .MuiLinearProgress-bar': { borderRadius: 3, bgcolor: theme.palette.success.main },
            }} />
          </Box>
        </SectionCard>
      </Box>

      {/* ── Row 5: Data Health + Warranty ────────────────────────── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 1.5, mb: 2 }}>


        {/* Data Health */}
        <SectionCard title="ข้อมูลไม่สมบูรณ์" icon={AlertTriangle} action={() => navigate('/assets')} actionLabel="ตรวจสอบ">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {[
              { label: 'OS เก่า/เสี่ยง (Win 7, 8, 10)', value: dataHealth?.outdatedOSCount || 0, status: 'Lost', filter: 'search=windows' },
              { label: 'ไม่มี Serial No.', value: dataHealth?.missingSerial || 0, status: 'Lost', filter: 'serialNo=' },
              { label: 'ไม่ระบุสถานที่', value: dataHealth?.missingLocation || 0, status: 'Borrowed', filter: 'location=' },
              { label: 'ไม่ระบุบริษัท', value: dataHealth?.missingCompany || 0, status: 'Borrowed', filter: 'company=' },
              { label: 'ไม่ระบุประเภท', value: dataHealth?.missingType || 0, status: 'InUse', filter: 'type=' },
            ].map(row => {
              const color = statusColor(theme, row.status);
              return (
                <Box key={row.label} onClick={() => { if (row.value > 0) navigate(`/assets?${row.filter}`); }} sx={{
                  display: 'flex', alignItems: 'center', gap: 1,
                  p: '7px 10px', borderRadius: 1.5,
                  bgcolor: alpha(theme.palette.divider, 0.4),
                  cursor: row.value > 0 ? 'pointer' : 'default',
                  '&:hover': row.value > 0 ? { bgcolor: alpha(color, 0.08) } : {},
                }}>
                  <Typography sx={{ fontSize: '0.75rem', color: theme.palette.text.secondary, flex: 1 }}>{row.label}</Typography>
                  <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: row.value > 0 ? color : theme.palette.text.disabled }}>{row.value}</Typography>
                </Box>
              );
            })}
          </Box>
        </SectionCard>

        {/* Warranty alerts */}
        <SectionCard title={`ประกันใกล้หมดอายุ${warrantyData?.expiredCount > 0 ? ` · หมดแล้ว ${warrantyData.expiredCount}` : ''}`} icon={Shield} action={() => navigate('/reports/assets')} actionLabel="ดูรายงาน">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {warrantyData?.expiredCount > 0 && (
              <Box sx={{
                p: 1.25, borderRadius: 1.5,
                bgcolor: alpha(theme.palette.error.main, 0.08),
                border: `1px solid ${alpha(theme.palette.error.main, 0.25)}`,
                display: 'flex', gap: 1.25, alignItems: 'center',
              }}>
                <AlertTriangle size={18} color={theme.palette.error.main} />
                <Typography sx={{ fontSize: '0.75rem', color: theme.palette.error.main, fontWeight: 600 }}>
                  มีอุปกรณ์ {warrantyData.expiredCount} รายการที่ประกันหมดแล้ว กรุณาต่ออายุหรือตรวจสอบ
                </Typography>
              </Box>
            )}
            {warrantyData?.expiring?.slice(0, 4).map((item: any) => (
              <Box key={item.id} onClick={() => navigate(`/assets/${item.id}`)} sx={{
                display: 'flex', alignItems: 'center', gap: 1.25,
                p: '7px 10px', borderRadius: 1.5,
                border: `1px solid ${item.daysLeft <= 14 ? alpha(theme.palette.error.main, 0.25) : alpha(theme.palette.warning.main, 0.25)}`,
                bgcolor: item.daysLeft <= 14 ? alpha(theme.palette.error.main, 0.05) : alpha(theme.palette.warning.main, 0.05),
                cursor: 'pointer', '&:hover': { opacity: 0.85 },
              }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography noWrap sx={{ fontSize: '0.75rem', fontWeight: 600, color: theme.palette.text.primary }}>
                    {item.assetCode} — {item.brand} {item.model}
                  </Typography>
                  <Typography sx={{ fontSize: '0.68rem', color: theme.palette.text.secondary }}>
                    {item.category?.name} · หมดอายุ: {new Date(item.warrantyEndDate).toLocaleDateString('th-TH')}
                  </Typography>
                </Box>
                <Chip label={`${item.daysLeft} วัน`} size="small" sx={{
                  height: 20, fontSize: '0.68rem', fontWeight: 700,
                  bgcolor: item.daysLeft <= 7 ? alpha(theme.palette.error.main, 0.15)
                    : item.daysLeft <= 30 ? alpha(theme.palette.warning.main, 0.15)
                    : alpha(theme.palette.success.main, 0.15),
                  color: item.daysLeft <= 7 ? theme.palette.error.main
                    : item.daysLeft <= 30 ? theme.palette.warning.main
                    : theme.palette.success.main,
                }} />
              </Box>
            ))}
            {(!warrantyData || (warrantyData.expiring?.length === 0 && !warrantyData.expiredCount)) && (
              <Typography sx={{ fontSize: '0.75rem', color: theme.palette.text.secondary, py: 1 }}>ไม่มีอุปกรณ์ที่ประกันใกล้หมดอายุ</Typography>
            )}
          </Box>
        </SectionCard>
      </Box>

      {/* ── Row 6: Executive Summary — Contract & License ─────── */}
      {(contractList.length > 0 || licenseList.length > 0) && (() => {
        const dl = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
        const cExpired  = contractList.filter(c => c.endDate && dl(c.endDate) < 0).length;
        const cExp30    = contractList.filter(c => c.endDate && dl(c.endDate) >= 0 && dl(c.endDate) <= 30).length;
        const cExp90    = contractList.filter(c => c.endDate && dl(c.endDate) >= 0 && dl(c.endDate) <= 90).length;
        const totalSeats = licenseList.reduce((s, l) => s + (l.totalSeats || 0), 0);
        const usedSeats  = licenseList.reduce((s, l) => s + (l.usedSeats || 0), 0);
        const seatPct    = totalSeats > 0 ? Math.round((usedSeats / totalSeats) * 100) : 0;
        const seatColor  = seatPct >= 95 ? theme.palette.error.main : seatPct >= 80 ? theme.palette.warning.main : theme.palette.success.main;
        const lExpiring  = licenseList.filter(l => { if (!l.expiryDate) return false; const d = dl(l.expiryDate); return d >= 0 && d <= 90; }).length;
        const topContracts = [...contractList]
          .filter(c => c.endDate)
          .sort((a, b) => dl(a.endDate) - dl(b.endDate))
          .slice(0, 3);

        return (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 1.5, mb: 2 }}>

            {/* Contract panel */}
            <SectionCard title="สัญญา & Warranty" icon={FileText} action={() => navigate('/contracts')} actionLabel="จัดการสัญญา">
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, mb: 1.5 }}>
                {[
                  { label: 'สัญญาทั้งหมด',    value: contractList.length, color: theme.palette.primary.main },
                  { label: 'หมดอายุแล้ว',      value: cExpired,  color: theme.palette.error.dark },
                  { label: 'ใกล้หมด 30 วัน',   value: cExp30,    color: theme.palette.error.main },
                  { label: 'ใกล้หมด 90 วัน',   value: cExp90,    color: theme.palette.warning.main },
                ].map(s => (
                  <Box key={s.label} sx={{
                    p: '8px 12px', borderRadius: 1.5, bgcolor: alpha(s.color, 0.07),
                    border: `1px solid ${alpha(s.color, 0.2)}`,
                  }}>
                    <Typography sx={{ fontSize: '1.35rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</Typography>
                    <Typography sx={{ fontSize: '0.68rem', color: theme.palette.text.secondary, mt: 0.25 }}>{s.label}</Typography>
                  </Box>
                ))}
              </Box>
              {topContracts.length > 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: theme.palette.text.disabled, mb: 0.25, textTransform: 'uppercase', letterSpacing: 0.5 }}>ใกล้หมดอายุก่อน</Typography>
                  {topContracts.map(c => {
                    const days = dl(c.endDate);
                    const color = days < 0 ? theme.palette.error.dark : days <= 30 ? theme.palette.error.main : theme.palette.warning.main;
                    return (
                      <Box key={c.id} onClick={() => navigate('/contracts')} sx={{
                        display: 'flex', alignItems: 'center', gap: 1,
                        p: '6px 10px', borderRadius: 1.5, cursor: 'pointer',
                        bgcolor: alpha(color, 0.05), border: `1px solid ${alpha(color, 0.18)}`,
                        '&:hover': { bgcolor: alpha(color, 0.10) },
                      }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography noWrap sx={{ fontSize: '0.75rem', fontWeight: 600, color: theme.palette.text.primary }}>{c.title}</Typography>
                          <Typography sx={{ fontSize: '0.68rem', color: theme.palette.text.secondary }}>{c.vendor || '—'} · {c.endDate?.slice(0, 10)}</Typography>
                        </Box>
                        <Chip
                          size="small"
                          label={days < 0 ? 'หมดแล้ว' : `${days} วัน`}
                          sx={{ height: 20, fontSize: '0.67rem', fontWeight: 700, bgcolor: alpha(color, 0.15), color }}
                        />
                      </Box>
                    );
                  })}
                </Box>
              )}
            </SectionCard>

            {/* License panel */}
            <SectionCard title="Software License" icon={Key} action={() => navigate('/licenses')} actionLabel="จัดการ License">
              <Box sx={{ mb: 1.5, p: 1.5, borderRadius: 2, bgcolor: alpha(seatColor, 0.06), border: `1px solid ${alpha(seatColor, 0.2)}` }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
                  <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: theme.palette.text.primary }}>การใช้งาน Seats รวม</Typography>
                  <Typography sx={{ fontSize: '1.1rem', fontWeight: 800, color: seatColor }}>{seatPct}%</Typography>
                </Box>
                <LinearProgress variant="determinate" value={seatPct} sx={{
                  height: 7, borderRadius: 4,
                  bgcolor: alpha(seatColor, 0.12),
                  '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: seatColor },
                }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                  <Typography sx={{ fontSize: '0.68rem', color: theme.palette.text.secondary }}>ใช้ {usedSeats.toLocaleString()} จาก {totalSeats.toLocaleString()} seats</Typography>
                  <Typography sx={{ fontSize: '0.68rem', color: theme.palette.success.main, fontWeight: 600 }}>ว่าง {(totalSeats - usedSeats).toLocaleString()}</Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mb: 1.5 }}>
                {[
                  { label: 'License ทั้งหมด',    value: licenseList.length, color: theme.palette.primary.main },
                  { label: 'ใกล้หมดอายุ 90 วัน', value: lExpiring,          color: theme.palette.warning.main },
                  { label: 'Seats ว่าง',          value: totalSeats - usedSeats, color: theme.palette.success.main },
                ].map(s => (
                  <Box key={s.label} sx={{ p: '8px 10px', borderRadius: 1.5, bgcolor: alpha(s.color, 0.07), border: `1px solid ${alpha(s.color, 0.2)}`, textAlign: 'center' }}>
                    <Typography sx={{ fontSize: '1.25rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</Typography>
                    <Typography sx={{ fontSize: '0.63rem', color: theme.palette.text.secondary, mt: 0.25 }}>{s.label}</Typography>
                  </Box>
                ))}
              </Box>
              {licenseList.filter(l => l.totalSeats > 0 && (l.usedSeats || 0) / l.totalSeats >= 0.8).length > 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: theme.palette.text.disabled, mb: 0.25, textTransform: 'uppercase', letterSpacing: 0.5 }}>License ที่ใช้งานสูง (≥ 80%)</Typography>
                  {licenseList
                    .filter(l => l.totalSeats > 0 && (l.usedSeats || 0) / l.totalSeats >= 0.8)
                    .sort((a, b) => ((b.usedSeats || 0) / b.totalSeats) - ((a.usedSeats || 0) / a.totalSeats))
                    .slice(0, 3)
                    .map(l => {
                      const p = Math.round(((l.usedSeats || 0) / l.totalSeats) * 100);
                      const c = p >= 90 ? theme.palette.error.main : theme.palette.warning.main;
                      return (
                        <Box key={l.id} onClick={() => navigate('/licenses')} sx={{
                          display: 'flex', alignItems: 'center', gap: 1,
                          p: '6px 10px', borderRadius: 1.5, cursor: 'pointer',
                          bgcolor: alpha(c, 0.05), border: `1px solid ${alpha(c, 0.18)}`,
                          '&:hover': { bgcolor: alpha(c, 0.10) },
                        }}>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography noWrap sx={{ fontSize: '0.75rem', fontWeight: 600, color: theme.palette.text.primary }}>{l.name}</Typography>
                            <Typography sx={{ fontSize: '0.68rem', color: theme.palette.text.secondary }}>{l.usedSeats || 0}/{l.totalSeats} seats</Typography>
                          </Box>
                          <Chip size="small" label={`${p}%`} sx={{ height: 20, fontSize: '0.67rem', fontWeight: 700, bgcolor: alpha(c, 0.15), color: c }} />
                        </Box>
                      );
                    })}
                </Box>
              )}
            </SectionCard>

          </Box>
        );
      })()}

    </Box>
  );
}
