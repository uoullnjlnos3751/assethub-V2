import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import {
  LayoutDashboard, Boxes, ShoppingCart, Wrench,
  CheckCircle2, Clock, Shield, ClipboardList,
  RotateCcw, ArrowUpRight, AlertTriangle,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { dashboardAPI, contractAPI, licenseAPI, presenceAPI } from '../services/api';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { KpiCard } from './dashboard/components/KpiCard';
import { OpsRoomCard } from './dashboard/components/OpsRoomCard';
import { CategoryDonutCard } from './dashboard/components/CategoryDonutCard';
import { QuickActionsPanel } from './dashboard/components/QuickActionsPanel';
import { AssetStatusBreakdownCard } from './dashboard/components/AssetStatusBreakdownCard';
import { LocationBreakdownCard } from './dashboard/components/LocationBreakdownCard';
import { WarrantyAlertsCard } from './dashboard/components/WarrantyAlertsCard';
import { ContractLicenseSummary } from './dashboard/components/ContractLicenseSummary';
import { ExternalAgentsSummaryCard } from './dashboard/components/ExternalAgentsSummaryCard';
import { CategoryUtilizationCard } from './dashboard/components/CategoryUtilizationCard';
import { AttentionQueue, AttentionItem } from './dashboard/components/AttentionQueue';
import { LifecycleStrip, Stage } from './dashboard/components/LifecycleStrip';
import { QuietStatusBar } from './dashboard/components/QuietStatusBar';
import { OutcomeStrip } from './dashboard/components/OutcomeStrip';
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
  const [moduleStatus, setModuleStatus] = useState<any>(null);
  const [categoryUtilization, setCategoryUtilization] = useState<any[]>([]);
  const [inventoryLowStock, setInventoryLowStock] = useState<any>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [outcome, setOutcome] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'IT_ADMIN' || user?.role === 'SUPERADMIN' || user?.role === 'VIEWER') {
      const year = new Date().getFullYear();

      /* ทุกก้อนของแดชบอร์ดมาในคำขอเดียว
       *
       * เดิมยิง 13 คำขอไปยัง /dashboard/* แล้วรอให้ครบก่อนวาด วัดจริงได้ 25
       * วินาที ตอนนี้ทุก query วิ่งพร้อมกันฝั่ง server เวลารวมจึงเท่ากับก้อนที่
       * ช้าที่สุด ไม่ใช่ผลบวก
       *
       * ก้อนที่ล้มจะมาเป็น null ไม่ลากทั้งหน้าลงไปด้วย — เดิมแต่ละก้อนมี
       * .catch() ของตัวเองอยู่แล้ว ที่นี่ย้ายไปทำฝั่ง server แทน
       */
      dashboardAPI.overview(year, 60)
        .then(({ data: d }) => {
          setAssetSummary(d.assets);
          setBorrowSummary(d.borrow);
          setPmSummary(d.pm);
          setProactiveAlerts(d.alerts);
          setDataHealth(d.health);
          setTrendData(d.trend);
          setActivityData(d.activity);
          setModuleStatus(d.modules);
          setCategoryUtilization(d.categories || []);
          setInventoryLowStock(d.inventory);
          setWarrantyData(d.warranty);
          setExternalAgentsSummary(d.agents?.available ? d.agents.data : null);
          setStages(d.stages || []);
          setOutcome(d.outcome);
        })
        .catch(() => {})
        .finally(() => setLoading(false));

      /* สัญญากับ License ยังแยกอยู่ เพราะเป็น endpoint ของโมดูลตัวเอง ไม่ใช่ของ
       * แดชบอร์ด และการ์ดซ่อนตัวเองเมื่อทั้งสองว่าง คำขอที่ล้มจึงไม่ต่างจาก
       * "ไม่มีข้อมูล" — ไม่ต้องรอ ไม่บล็อกการวาด */
      contractAPI.list({}).then(r => setContractList(r.data || [])).catch(() => {});
      licenseAPI.list({}).then(r => setLicenseList(r.data || [])).catch(() => {});
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


  /* คิวงาน — เฉพาะเรื่องที่มีจำนวนจริง เรื่องที่เป็นศูนย์ไม่ต้องกินพื้นที่
     ตัวหารของแต่ละเรื่องต่างกัน จึงต้องระบุไว้ ไม่งั้น 31 กับ 274 เทียบกันไม่ได้ */
  const agentTotal = externalAgentsSummary?.total || 0;
  const agentOffline = externalAgentsSummary?.offline || 0;
  const attention: AttentionItem[] = [
    {
      key: 'agent-offline', severity: 'crit',
      title: 'Agent ออฟไลน์',
      detail: 'ไม่ส่งข้อมูลเข้ามา สเปกและสุขภาพเครื่องหยุดอัปเดต',
      count: agentOffline, of: agentTotal, ofLabel: 'ของเครื่องที่ติดตั้ง',
      actionLabel: 'ตรวจสอบ', href: '/assets/agent-drift',
    },
    {
      key: 'outdated-os', severity: 'crit',
      title: 'ระบบปฏิบัติการล้าสมัย',
      detail: 'เสี่ยงต่อช่องโหว่ที่เวอร์ชันใหม่แพตช์ไปแล้ว',
      count: dataHealth?.outdatedOSCount || 0, of: total, ofLabel: 'ของทรัพย์สินทั้งหมด',
      actionLabel: 'ดูรายการ', href: '/assets',
    },
    {
      key: 'pm-overdue', severity: 'warn',
      title: 'PM เลยกำหนด',
      detail: 'งานที่พ้นวันสิ้นสุดแผนแล้วแต่ยังไม่ปิด',
      count: pmOverdue, of: pmTotal, ofLabel: 'ของแผนทั้งปี',
      actionLabel: 'เปิดคิว', href: '/pm/runs',
    },
    {
      key: 'borrow-overdue', severity: 'warn',
      title: 'ยืมเกินกำหนด',
      detail: 'ต้องติดตามผู้ยืม',
      count: borrowOverdue, of: borrowActive || 1, ofLabel: 'ของที่ยืมอยู่',
      actionLabel: 'ติดตาม', href: '/borrow/history',
    },
    {
      key: 'approvals', severity: 'info',
      title: 'คำขอยืมรออนุมัติ',
      detail: 'รอการตรวจสอบ',
      count: borrowPending, of: borrowSummary?.total || 1, ofLabel: 'ของคำขอทั้งหมด',
      actionLabel: 'อนุมัติ', href: '/borrow/approval-queue',
    },
    {
      key: 'upcoming-pm', severity: 'info',
      title: 'PM กำหนดสัปดาห์นี้',
      detail: 'เตรียมอุปกรณ์และแจ้งผู้ใช้ล่วงหน้า',
      count: proactiveAlerts?.upcomingPMs || 0, of: pmTotal, ofLabel: 'ของแผนทั้งปี',
      actionLabel: 'ดูตาราง', href: '/pm/schedule',
    },
    {
      key: 'missing-warranty', severity: 'info',
      title: 'ยังไม่มีวันหมดประกัน',
      detail: 'เป็นเหตุผลที่การ์ดใกล้หมดประกันว่างเปล่า — กรอกเป็นชุดได้จากหน้าทะเบียน',
      count: dataHealth?.missingWarranty || 0,
      of: dataHealth?.activeTotal || total, ofLabel: 'ของที่ยังไม่ปลดระวาง',
      actionLabel: 'กรอกข้อมูล', href: '/assets?warrantyStatus=none',
    },
    {
      key: 'low-stock', severity: 'warn',
      title: 'วัสดุใกล้หมด',
      detail: 'ต่ำกว่าจุดสั่งซื้อ',
      count: inventoryLowStock?.lowStockCount || 0,
      of: inventoryLowStock?.totalQuantity || 1, ofLabel: 'ของสต๊อกทั้งหมด',
      actionLabel: 'เติมสต๊อก', href: '/inventory',
    },
  ];

  /* โมดูลที่สุขภาพดีไม่ต้องได้การ์ด — ยุบเป็นบรรทัดเดียว
     ส่วนโมดูลที่ยังไม่มีข้อมูลแยกออกมา เพราะ "ยังไม่เริ่มใช้" ไม่ใช่ "ปกติ" */
  const quietOk = [
    moduleStatus?.assetRegistry && { label: 'ทะเบียนครบถ้วน', value: `${moduleStatus.assetRegistry.healthPct}%` },
    moduleStatus?.notifications && { label: 'แจ้งเตือนส่งสำเร็จ', value: `${moduleStatus.notifications.successPct}%` },
  ].filter(Boolean) as { label: string; value: string }[];
  const quietNotStarted = (stages || []).filter(st => !st.started).map(st => st.label);

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

      {/* ── Row 1: 4 KPI cards — เลือกเฉพาะตัวที่เปลี่ยนแปลงและมีความหมาย
              ตัวที่เคยเป็น "กำลังยืม" ถูกแทนด้วย OS ล้าสมัย เพราะโมดูลยืม-คืน
              เป็นศูนย์ทั้งปี ส่วน OS ล้าสมัยคือ 34% ของฟลีตที่ไม่เคยขึ้นหน้าแรก ── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 1.25, mb: 1.5 }}>
        <KpiCard
          icon={Boxes} label="ทรัพย์สิน IT ทั้งหมด" value={total}
          sub={`ใช้งานอยู่ ${(byStatus.find(s => s.status === 'InUse')?._count || 0)} · พร้อมใช้ ${available}`}
          accent={theme.palette.primary.main}
          onClick={() => navigate('/assets')}
        />
        <KpiCard
          icon={Shield} label="PM เสร็จแล้ว" value={`${pmPct}%`}
          sub={`${pmDone}/${pmTotal} แผนงาน${pmOverdue > 0 ? ` · เลยกำหนด ${pmOverdue}` : ''}`}
          accent={theme.palette.success.main}
          onClick={() => navigate('/pm/runs')}
        />
        <KpiCard
          icon={AlertTriangle} label="OS ล้าสมัย" value={dataHealth?.outdatedOSCount ?? 0}
          sub={total ? `${Math.round(((dataHealth?.outdatedOSCount || 0) / total) * 100)}% ของทรัพย์สินทั้งหมด` : ''}
          accent={theme.palette.error.main}
          onClick={() => navigate('/assets')}
        />
        <KpiCard
          icon={Wrench} label="งานซ่อมเปิดอยู่" value={maintenance}
          sub="อุปกรณ์ระหว่างซ่อมบำรุง"
          accent={theme.palette.warning.main}
          onClick={() => navigate('/assets?status=Maintenance')}
        />
      </Box>

      {/* ── วงจรชีวิต: ช่วงที่ยังไม่เริ่มบันทึกจะจางและเขียนบอกตรง ๆ ── */}
      <LifecycleStrip stages={stages} navigate={navigate} />

      {/* ── สิ่งที่ต้องลงมือ เรียงตามความเร่งด่วน ── */}
      <Box sx={{ mb: 1.5 }}>
        <AttentionQueue items={attention} navigate={navigate} />
      </Box>

      {/* ── ผลลัพธ์จากการตรวจ PM ── */}
      <OutcomeStrip outcome={outcome} year={new Date().getFullYear()} navigate={navigate} />

      {/* ── Row 2: IT Operations Room (live) + Donut ─────────────── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '7fr 5fr' }, gap: 1.25, mb: 1.5 }}>
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

      {/* ── Row 3: การ์ดรายละเอียดทั้งหมดในกริดเดียว ─────────────────
              เดิมแยกเป็นสองแถวตายตัว (ทางลัด+สัดส่วนหมวด+Agent แล้วค่อยรายละเอียด
              สถานะ/สถานที่/ประกัน) ทำให้แถวแรกเหลือช่องว่างเวลาไม่มีข้อมูล Agent
              และมีรอยต่อ mb ระหว่างสองแถวโดยไม่จำเป็น รวมเป็นกริด auto-fit เดียว
              การ์ดจะเรียงเต็มความกว้างเสมอไม่ว่าจะมีกี่ใบ เหมือนกริดของการ์ดในภาพ
              อ้างอิง — กราฟแนวโน้มยืม-คืนกับกิจกรรมล่าสุดยังไม่กลับมา ทั้งคู่เป็นศูนย์
              ตลอด 12 เดือนของปีนี้ โมดูลยืม-คืนไปปรากฏในแถบวงจรชีวิตแทน ── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 1.25, mb: 1.5 }}>
        <CategoryUtilizationCard categories={categoryUtilization} onNavigate={() => navigate('/assets')} />
        <ExternalAgentsSummaryCard summary={externalAgentsSummary} />
        <QuickActionsPanel onNavigate={navigate} />
        <AssetStatusBreakdownCard byStatus={byStatus} total={total} onNavigate={() => navigate('/assets')} />
        <LocationBreakdownCard byLocation={byLocation} total={total} onNavigate={() => navigate('/assets')} />
        <WarrantyAlertsCard warrantyData={warrantyData} navigate={navigate} />
      </Box>

      {/* ── ทุกอย่างที่ปกติ ยุบเหลือแถบเดียว ── */}
      <QuietStatusBar ok={quietOk} notStarted={quietNotStarted} />

      {/* ── Row 8: Executive Summary — Contract & License ─────── */}
      <ContractLicenseSummary contractList={contractList} licenseList={licenseList} navigate={navigate} />

    </Box>
  );
}
