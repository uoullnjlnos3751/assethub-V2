import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import {
  LayoutDashboard, Boxes, ShoppingCart, Wrench,
  CheckCircle2, Clock, Shield, ClipboardList,
  RotateCcw, ArrowUpRight,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { dashboardAPI, contractAPI, licenseAPI, presenceAPI } from '../services/api';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { KpiCard } from './dashboard/components/KpiCard';
import { OpsRoomCard } from './dashboard/components/OpsRoomCard';
import { ProactiveAlertsBar } from './dashboard/components/ProactiveAlertsBar';
import { CategoryDonutCard } from './dashboard/components/CategoryDonutCard';
import { BorrowTrendCard } from './dashboard/components/BorrowTrendCard';
import { RecentActivityCard } from './dashboard/components/RecentActivityCard';
import { QuickActionsPanel } from './dashboard/components/QuickActionsPanel';
import { AssetStatusBreakdownCard } from './dashboard/components/AssetStatusBreakdownCard';
import { LocationBreakdownCard } from './dashboard/components/LocationBreakdownCard';
import { BorrowSummaryCard } from './dashboard/components/BorrowSummaryCard';
import { PMSummaryCard } from './dashboard/components/PMSummaryCard';
import { DataHealthCard } from './dashboard/components/DataHealthCard';
import { WarrantyAlertsCard } from './dashboard/components/WarrantyAlertsCard';
import { ContractLicenseSummary } from './dashboard/components/ContractLicenseSummary';
import { ModuleStatusCard } from './dashboard/components/ModuleStatusCard';
import { ExternalAgentsSummaryCard } from './dashboard/components/ExternalAgentsSummaryCard';
import { CustodySummaryCard, CustodySummaryEntry } from './dashboard/components/CustodySummaryCard';
import { CategoryUtilizationCard } from './dashboard/components/CategoryUtilizationCard';
import { now, pct } from './dashboard/dashboardHelpers';

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
  const [onlineNow, setOnlineNow] = useState<any[]>([]);
  const [externalAgentsSummary, setExternalAgentsSummary] = useState<any>(null);
  const [custodySummary, setCustodySummary] = useState<{ data: CustodySummaryEntry[]; total: number }>({ data: [], total: 0 });
  const [moduleStatus, setModuleStatus] = useState<any>(null);
  const [categoryUtilization, setCategoryUtilization] = useState<any[]>([]);
  const [inventoryLowStock, setInventoryLowStock] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'IT_ADMIN' || user?.role === 'SUPERADMIN' || user?.role === 'VIEWER') {
      const year = new Date().getFullYear();
      Promise.all([
        dashboardAPI.assetSummary(),
        dashboardAPI.borrowSummary(),
        dashboardAPI.pmSummary(),
        dashboardAPI.proactiveAlerts(),
        dashboardAPI.dataHealth(),
        dashboardAPI.borrowTrend(year),
        dashboardAPI.recentActivity(),
        dashboardAPI.moduleStatus(),
        dashboardAPI.categoryUtilization(),
        dashboardAPI.inventoryLowStock(),
      ])
        .then(([a, b, p, pa, dh, tr, ra, ms, cu, ls]) => {
          setAssetSummary(a.data);
          setBorrowSummary(b.data);
          setPmSummary(p.data);
          setProactiveAlerts(pa.data);
          setDataHealth(dh.data);
          setTrendData(tr.data);
          setActivityData(ra.data);
          setModuleStatus(ms.data);
          setCategoryUtilization(cu.data || []);
          setInventoryLowStock(ls.data);
        })
        .finally(() => setLoading(false));

      // Warranty แยกออกมา — ถ้า API ยังไม่พร้อมหรือ 404 ไม่ทำให้ Dashboard พัง
      dashboardAPI.warrantyExpiring(60)
        .then(w => setWarrantyData(w.data))
        .catch(() => setWarrantyData(null));

      // Contract & License summary (Phase 3) — non-blocking, fail silently
      contractAPI.list({}).then(r => setContractList(r.data || [])).catch(() => {});
      licenseAPI.list({}).then(r => setLicenseList(r.data || [])).catch(() => {});

      // External agent summary — separate service, non-blocking so a slow/
      // unreachable agent server never delays the rest of the dashboard.
      dashboardAPI.externalAgentsSummary()
        .then(r => setExternalAgentsSummary(r.data?.available ? r.data.data : null))
        .catch(() => setExternalAgentsSummary(null));

      // Devices parked at HR / other drop-off points — the card hides itself
      // when the count is zero, so a failed call is the same as "nothing there".
      dashboardAPI.custodySummary()
        .then(r => setCustodySummary({ data: r.data?.data || [], total: r.data?.total || 0 }))
        .catch(() => setCustodySummary({ data: [], total: 0 }));
    } else {
      setLoading(false);
    }
  }, [user]);

  // Team presence — refreshed on its own faster cadence than the rest of the
  // dashboard data, since "who's online" is only useful if it's actually current.
  useEffect(() => {
    if (!(user?.role === 'IT_ADMIN' || user?.role === 'SUPERADMIN' || user?.role === 'VIEWER')) return;
    const load = () => { presenceAPI.online().then(r => setOnlineNow(r.data || [])).catch(() => {}); };
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
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
  const pmOverdue = pmSummary?.overdue || 0;

  // Monitoring Wall summary numbers
  const openWork = borrowPending + maintenance;
  const overSla = borrowOverdue + pmOverdue;
  const todayStr = new Date().toDateString();
  const closedToday = (activityData?.recentReturns || []).filter(
    (r: any) => r.returnedAt && new Date(r.returnedAt).toDateString() === todayStr
  ).length;

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

      <ProactiveAlertsBar alerts={alerts} />

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

      {/* ── Row 2: IT Operations Room (live) + Donut ─────────────── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '7fr 5fr' }, gap: 1.5, mb: 2 }}>
        <OpsRoomCard
          onlineNow={onlineNow}
          currentUserId={user?.id}
          borrowActive={borrowActive} borrowPending={borrowPending}
          pmDone={pmDone} pmTotal={pmTotal} pmPct={pmPct}
          lowStockCount={inventoryLowStock?.lowStockCount || 0}
          assetsTotal={total} openWork={openWork} overSla={overSla} closedToday={closedToday}
          onNavigateReports={() => navigate('/reports')}
        />
        <CategoryDonutCard byCategory={byCategory} total={total} onNavigate={() => navigate('/assets')} />
      </Box>

      {/* ── Row 3: Trend bar chart ───────────────────────────────── */}
      <Box sx={{ mb: 2 }}>
        <BorrowTrendCard trendData={trendData} onNavigate={() => navigate('/reports/borrow')} />
      </Box>

      {/* ── Row 4: Recent activity + Quick actions ───────────────── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '8fr 4fr' }, gap: 1.5, mb: 2 }}>
        <RecentActivityCard activityData={activityData} onNavigate={() => navigate('/borrow/history')} />
        <QuickActionsPanel onNavigate={navigate} />
      </Box>

      {/* ── Row 5: Status breakdown + Location + Borrow + PM ─────── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 1.5, mb: 2 }}>
        <AssetStatusBreakdownCard byStatus={byStatus} total={total} onNavigate={() => navigate('/assets')} />
        <LocationBreakdownCard byLocation={byLocation} total={total} onNavigate={() => navigate('/assets')} />
        <BorrowSummaryCard borrowActive={borrowActive} borrowPending={borrowPending} borrowOverdue={borrowOverdue} onNavigate={() => navigate('/borrow/approval-queue')} />
        <PMSummaryCard pmTotal={pmTotal} pmDone={pmDone} pmPct={pmPct} onNavigate={() => navigate('/pm')} />
      </Box>

      {/* ── Row 6: Module status + Category utilization + External agents ── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: externalAgentsSummary ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)' }, gap: 1.5, mb: 2 }}>
        <ModuleStatusCard moduleStatus={moduleStatus} />
        <CategoryUtilizationCard categories={categoryUtilization} onNavigate={() => navigate('/assets')} />
        <ExternalAgentsSummaryCard summary={externalAgentsSummary} />
      </Box>

      {/* ── Row 7: Data Health + Warranty + Custody ──────────────── */}
      {/* CustodySummaryCard renders null while nothing is held, so the row
          stays two-up until HR actually starts checking devices in. */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: custodySummary.total > 0 ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)' }, gap: 1.5, mb: 2 }}>
        <DataHealthCard dataHealth={dataHealth} navigate={navigate} />
        <WarrantyAlertsCard warrantyData={warrantyData} navigate={navigate} />
        <CustodySummaryCard
          entries={custodySummary.data}
          total={custodySummary.total}
          onNavigate={(code) => navigate(`/assets?custodyHolder=${code}`)}
        />
      </Box>

      {/* ── Row 8: Executive Summary — Contract & License ─────── */}
      <ContractLicenseSummary contractList={contractList} licenseList={licenseList} navigate={navigate} />

    </Box>
  );
}
