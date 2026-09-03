import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CircularProgress,
  Typography,
  alpha,
  useTheme,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import QRCode from 'react-qr-code';
import { assetAPI, maintenanceAPI } from '../../services/api';
import MaintenanceTab from './MaintenanceTab';
import LinkedAssetsTab from './tabs/LinkedAssetsTab';
import { SpecTab } from './tabs/SpecTab';
import { HistoryTab } from './tabs/HistoryTab';
import { PMTab } from './tabs/PMTab';
import { DocumentsTab } from './tabs/DocumentsTab';
import { AssetOverviewCard } from './components/AssetOverviewCard';
import { AssetFinanceCard } from './components/AssetFinanceCard';
import { AssetTimeline } from './components/AssetTimeline';
import { AssetConnectionHistoryCard } from './components/AssetConnectionHistoryCard';
import { AssetActionsPanel } from './components/AssetActionsPanel';
import { AssetInsightTiles } from './components/AssetInsightTiles';
import { AssetSpecMiniCard } from './components/AssetSpecMiniCard';
import { AssetLiveStatusCard } from './components/AssetLiveStatusCard';
import { AssetServiceHistoryCard } from './components/AssetServiceHistoryCard';
import { AssetDocumentsRail } from './components/AssetDocumentsRail';
import { PillTabBar } from '../../components/PillTabBar';

// Fields the inline-edit chips are allowed to resend on a quick-update PUT —
// the backend's PUT /assets/:id validates the "required" set (assetName/
// type/brand/serialNo/departmentId) on every request, even ones only meant
// to touch one field, so a quick-update payload has to carry the asset's
// current value for everything else in this list too. Mirrors the backend's
// own ALLOWED_ASSET_FIELDS (assets.ts) minus id/createdAt/updatedAt/age
// (never resent) and the *RefId/assignedToUserId FK columns — those are
// deliberately left out of the payload so the backend's own resolver reruns
// off whichever free-text field changed; resending a stale FK would suppress
// that resolution and leave it pointed at the previous owner/department/location.
const ASSET_WRITABLE_FIELDS = [
  'assetCode', 'assetName', 'serialNo', 'type', 'brand', 'model', 'cpu', 'ram',
  'osVersion', 'windowsLicense', 'officeLicense', 'antivirusStatus', 'vendor',
  'poNumber', 'prNumber', 'purchaseDate', 'purchasePrice', 'warrantyEndDate', 'ownerName', 'departmentId',
  'location', 'status', 'remark', 'company', 'cpuGeneration', 'domainName',
  'floor', 'poDate', 'ramDetail', 'gpu', 'osType', 'ramSlot1', 'ramSlot2',
  'snComputer', 'storage1', 'storage2',
  'oldAssetCode', 'accountingCode', 'budget', 'image', 'categoryId', 'catalogItemId',
  'memoryType', 'ramOnboard', 'ramType', 'ramSpeed', 'ramMaxSupported', 'ramAvailableSlots', 'ramUpgradeable',
] as const;

const TABS = [
  { value: 'overview', label: 'ภาพรวม' },
  { value: 'spec', label: 'สเปก & ซอฟต์แวร์' },
  { value: 'pm', label: 'PM' },
  { value: 'repairs', label: 'ประวัติการซ่อม' },
  { value: 'documents', label: 'ไฟล์แนบ' },
  { value: 'history', label: 'บันทึกกิจกรรม' },
  { value: 'linked', label: 'อุปกรณ์ที่เชื่อมโยง' },
];

/* ─── Main Page ───────────────────────────────────────────────── */
export default function AssetDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showQR, setShowQR] = useState(false);
  const [maintenance, setMaintenance] = useState<any[]>([]);

  const [glpiSpec, setGlpiSpec] = useState<any>(null);
  const [loadingGLPI, setLoadingGLPI] = useState(false);
  const [syncingGLPI, setSyncingGLPI] = useState(false);
  const [externalAgent, setExternalAgent] = useState<any>(null);
  const [agentSpec, setAgentSpec] = useState<Record<string, string | null> | null>(null);
  const [loadingExternalAgent, setLoadingExternalAgent] = useState(false);
  const [linkHistory, setLinkHistory] = useState<any[]>([]);
  const [loadingLinkHistory, setLoadingLinkHistory] = useState(false);
  const [showConnectionHistory, setShowConnectionHistory] = useState(false);
  const [syncingAgent, setSyncingAgent] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' | 'info' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    if (id) {
      setLoading(true);
      setGlpiSpec(null); // Clear previous spec when navigating
      assetAPI.get(parseInt(id))
        .then((res) => setAsset(res.data))
        .finally(() => setLoading(false));
    }
  }, [id]);

  // Maintenance records power the timeline, the service-history table and the
  // repair-cost tiles, none of which live in the ประวัติการซ่อม tab — so fetch
  // them at page level rather than leaving them owned by MaintenanceTab.
  const loadMaintenance = (assetId: number) =>
    maintenanceAPI.getByAsset(assetId)
      .then((res) => setMaintenance(Array.isArray(res.data) ? res.data : (res.data?.data || [])))
      .catch(() => setMaintenance([]));

  useEffect(() => {
    if (!id) return;
    loadMaintenance(parseInt(id));
  }, [id]);

  useEffect(() => {
    if (!asset || !id || asset.id !== parseInt(id)) return;
    const t = (asset.type || '').toLowerCase();
    const cat = (asset.category?.name || '').toLowerCase();
    const isComputer = ['notebook', 'laptop', 'macbook', 'pc desktop', 'desktop', 'workstation', 'all-in-one', 'mini pc', 'thin client', 'computer'].some(k => t.includes(k)) || cat === 'คอมพิวเตอร์' || t === 'pc';

    if (isComputer && asset.serialNo) {
      setLoadingGLPI(true);
      assetAPI.getGLPISpec(parseInt(id))
        .then((res) => {
          setGlpiSpec(res.data);
        })
        .catch((err) => {
          console.warn('Failed to fetch GLPI spec:', err);
        })
        .finally(() => {
          setLoadingGLPI(false);
        });
    }
  }, [asset?.id, asset?.serialNo, id]);

  // Live status (battery, CPU/RAM load, online state) from the separate
  // external monitoring agent — same "is this a computer" gate as GLPI,
  // since only computers run the agent. IT_ADMIN/SUPERADMIN only on the
  // backend, so this silently stays empty for other roles rather than erroring.
  useEffect(() => {
    if (!asset || !id || asset.id !== parseInt(id)) return;
    const t = (asset.type || '').toLowerCase();
    const cat = (asset.category?.name || '').toLowerCase();
    const isComputer = ['notebook', 'laptop', 'macbook', 'pc desktop', 'desktop', 'workstation', 'all-in-one', 'mini pc', 'thin client', 'computer'].some(k => t.includes(k)) || cat === 'คอมพิวเตอร์' || t === 'pc';

    if (isComputer) {
      setLoadingExternalAgent(true);
      assetAPI.externalAgent(parseInt(id))
        .then((res) => {
          setExternalAgent(res.data?.available ? res.data.data : null);
          setAgentSpec(res.data?.available ? res.data.spec : null);
        })
        .catch(() => { setExternalAgent(null); setAgentSpec(null); })
        .finally(() => setLoadingExternalAgent(false));
    } else {
      setExternalAgent(null);
      setAgentSpec(null);
    }
  }, [asset?.id, id]);

  // Notebook↔Monitor connection history — only computers and monitors ever
  // appear on either side of an AssetLink, so gate the fetch to those (same
  // "is this a computer" style check as GLPI/agent above, plus a monitor check
  // since a monitor's own detail page also needs to see its notebook history).
  useEffect(() => {
    if (!asset || !id || asset.id !== parseInt(id)) return;
    const t = (asset.type || '').toLowerCase();
    const cat = (asset.category?.name || '').toLowerCase();
    const isComputer = ['notebook', 'laptop', 'macbook', 'pc desktop', 'desktop', 'workstation', 'all-in-one', 'mini pc', 'thin client', 'computer'].some(k => t.includes(k)) || cat === 'คอมพิวเตอร์' || t === 'pc';
    const isMonitor = t.includes('monitor');
    setShowConnectionHistory(isComputer || isMonitor);

    if (isComputer || isMonitor) {
      setLoadingLinkHistory(true);
      assetAPI.linkHistory(parseInt(id))
        .then((res) => setLinkHistory(Array.isArray(res.data) ? res.data : []))
        .catch(() => setLinkHistory([]))
        .finally(() => setLoadingLinkHistory(false));
    } else {
      setLinkHistory([]);
    }
  }, [asset?.id, asset?.type, id]);

  // Apply the agent's reading to the asset — one field, or every differing one.
  const handleAgentSync = async (field?: string, label?: string) => {
    if (!id) return;
    const confirmMsg = field
      ? `อัปเดต "${label}" ของทรัพย์สินนี้ตามข้อมูลจากระบบ Agent หรือไม่?`
      : 'อัปเดตทุกช่องที่ไม่ตรงกันตามข้อมูลจากระบบ Agent หรือไม่? (ค่าเดิมจะถูกเขียนทับ)';
    if (!window.confirm(confirmMsg)) return;

    setSyncingAgent(true);
    try {
      const res = await assetAPI.agentSync(parseInt(id), field);
      setToast({ open: true, message: res.data?.message || 'อัปเดตตาม Agent เรียบร้อย', severity: 'success' });
      const fresh = await assetAPI.get(parseInt(id));
      setAsset(fresh.data);
    } catch (err: any) {
      setToast({
        open: true,
        message: err.response?.data?.error || 'ไม่สามารถอัปเดตข้อมูลจากระบบ Agent ได้',
        severity: 'error',
      });
    } finally {
      setSyncingAgent(false);
    }
  };

  const handleGLPISync = async (field?: string, label?: string) => {
    if (!id || !asset) return;

    const confirmMsg = field
      ? `คุณต้องการอัปเดต "${label}" ของทรัพย์สินนี้ตามข้อมูลใน GLPI หรือไม่?`
      : 'ปรับปรุงสเปคของเครื่องนี้ตาม GLPI?\n\nจะเติมเฉพาะช่องที่ว่าง และช่องที่ GLPI ให้ข้อมูลละเอียดกว่าเท่านั้น — ค่าที่ขัดกันจะไม่ถูกแตะ ต้องกดรับทีละช่องเอง';

    if (!window.confirm(confirmMsg)) return;

    setSyncingGLPI(true);
    try {
      const syncRes = await assetAPI.syncGLPI(parseInt(id), field);
      setToast({
        open: true,
        // The server says how many fields it actually wrote — a flat success
        // message hid the case where nothing changed at all.
        message: syncRes.data?.message || 'อัปเดตตาม GLPI เรียบร้อยแล้ว',
        severity: syncRes.data?.updated === 0 ? 'info' : 'success',
      });
      // Reload asset and refetch spec
      const res = await assetAPI.get(parseInt(id));
      setAsset(res.data);
      const specRes = await assetAPI.getGLPISpec(parseInt(id));
      setGlpiSpec(specRes.data);
    } catch (err: any) {
      setToast({
        open: true,
        message: err.response?.data?.message || 'ไม่สามารถอัปเดตข้อมูลจาก GLPI ได้',
        severity: 'error'
      });
    } finally {
      setSyncingGLPI(false);
    }
  };

  // recent view tracking
  useEffect(() => {
    if (!id) return;
    try {
      const key = 'assethub.recentAssets';
      const recent: number[] = JSON.parse(localStorage.getItem(key) || '[]');
      const updated = [parseInt(id), ...recent.filter(r => r !== parseInt(id))].slice(0, 10);
      localStorage.setItem(key, JSON.stringify(updated));
    } catch { /* ignore */ }
  }, [id]);

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <CircularProgress size={32} />
    </Box>
  );
  if (!asset) return <Box sx={{ p: 4, textAlign: 'center' }}><Typography color="text.secondary">ไม่พบทรัพย์สิน</Typography></Box>;

  const reloadAsset = () => assetAPI.get(parseInt(id!)).then(res => setAsset(res.data));

  // One field at a time from a header/Fact chip (see EditableAssetFields).
  // Reloads via GET afterward rather than trusting the PUT response directly
  // — the PUT handler returns the bare `prisma.asset.update()` row with none
  // of the relations (category/assetHistory/pmRuns/documents) the GET
  // include pulls in, and several cards on this page read those.
  // ส่วนใหญ่เป็น text แต่ catalogItemId เป็น FK ตัวเลข/null ล้วน (ดู EditableCatalogChip) —
  // เลยรับ any แทนที่จะบังคับ string เหมือน field อื่น
  const handleQuickUpdate = async (field: string, value: any) => {
    if (!id || !asset) return;
    const payload: Record<string, any> = {};
    for (const key of ASSET_WRITABLE_FIELDS) {
      if (asset[key] !== undefined) payload[key] = asset[key];
    }
    payload[field] = value;
    await assetAPI.update(parseInt(id), payload);
    await reloadAsset();
  };

  const goRepairs = () => {
    setActiveTab('repairs');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Box sx={{ pb: 5 }}>
      {/* Page header — breadcrumb + title, then the handoff's three actions */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: '0.75rem', color: theme.palette.text.disabled }}>
            รายการทรัพย์สิน / {asset.assetCode || asset.assetName}
          </Typography>
          <Typography sx={{ fontSize: '1.4rem', fontWeight: 800, color: theme.palette.text.primary, lineHeight: 1.25 }}>
            {[asset.brand, asset.model].filter(Boolean).join(' ') || asset.assetName || asset.assetCode}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          color="inherit"
          startIcon={<ArrowBackIcon sx={{ fontSize: 16 }} />}
          onClick={() => navigate('/assets')}
          size="small"
          sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}
        >
          กลับรายการ
        </Button>
        <Button
          variant="outlined"
          startIcon={<PrintIcon sx={{ fontSize: 16 }} />}
          onClick={() => navigate(`/assets/print-qr?ids=${id}`)}
          size="small"
          sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}
        >
          พิมพ์สติ๊กเกอร์
        </Button>
        <Button
          variant="contained"
          onClick={() => navigate(`/assets/${id}/edit`)}
          size="small"
          sx={{
            borderRadius: '10px', textTransform: 'none', fontWeight: 700,
            background: `linear-gradient(120deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            boxShadow: 'none',
            '&:hover': { boxShadow: 'none', filter: 'brightness(1.05)' },
          }}
        >
          โอนย้าย / จ่ายใหม่
        </Button>
      </Box>

      <PillTabBar tabs={TABS} value={activeTab} onChange={setActiveTab} />

      {activeTab === 'overview' ? (
        /* Two-column shell — main content beside the context rail */
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexDirection: { xs: 'column', lg: 'row' } }}>
          {/* ── Main column ─────────────────────────────────── */}
          <Box sx={{ flex: 1, minWidth: 0, width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <AssetOverviewCard asset={asset} onQuickUpdate={handleQuickUpdate} />

            {/* Spec beside finance, as in the handoff. auto-fit keeps them side
                by side when there's room and stacks them when there isn't —
                including when AssetFinanceCard hides itself for want of data.
                Live agent health moved to the context rail (below) — it's a
                "does this need attention" signal, not a spec, so it belongs
                with the rest of the at-a-glance sidebar, not buried a scroll
                down in the main column. */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 2, alignItems: 'stretch' }}>
              <AssetSpecMiniCard asset={asset} glpiSpec={glpiSpec} />
              <AssetFinanceCard asset={asset} />
            </Box>

            <AssetServiceHistoryCard asset={asset} maintenance={maintenance} onSeeAll={goRepairs} />

            {/* Summary tiles sit below the service table, matching the handoff */}
            <AssetInsightTiles asset={asset} maintenance={maintenance} />
          </Box>

          {/* ── Context rail ────────────────────────────────── */}
          {/* The rail as a whole is deliberately not sticky: with timeline +
              documents stacked below, it runs taller than the viewport, and a
              sticky block taller than its viewport pins its overflow
              off-screen where it can't be scrolled to. Actions is the
              exception — on its own it's well under viewport height, it's
              what someone comes to this page to actually DO, and it used to
              sit dead last after timeline+documents, so reaching it meant
              scrolling past everything else first. Leading the rail AND
              staying pinned as the page scrolls means it's never more than a
              glance away. */}
          <Box sx={{
            width: { xs: '100%', lg: 340 },
            flex: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}>
            <Box sx={{ position: 'sticky', top: '66px', zIndex: 1 }}>
              <AssetActionsPanel
                onEdit={() => navigate(`/assets/${id}/edit`)}
                onTransfer={() => navigate(`/assets/${id}/edit`)}
                onReportRepair={goRepairs}
                onBorrow={() => navigate('/borrow/new')}
                onShowQR={() => setShowQR(true)}
                onReportDamage={() => navigate(`/assets/${id}/edit`)}
                onProposeDisposal={() => navigate('/disposals')}
              />
            </Box>
            <AssetLiveStatusCard loading={loadingExternalAgent} agent={externalAgent} />
            <AssetTimeline asset={asset} maintenance={maintenance} />
            {showConnectionHistory && (
              <AssetConnectionHistoryCard loading={loadingLinkHistory} history={linkHistory} />
            )}
            <AssetDocumentsRail asset={asset} onReload={reloadAsset} />
          </Box>
        </Box>
      ) : (
        <Box>
          {activeTab === 'spec' && (
            <SpecTab
              asset={asset}
              glpiSpec={glpiSpec}
              loadingGLPI={loadingGLPI}
              syncingGLPI={syncingGLPI}
              onSync={handleGLPISync}
              agent={externalAgent}
              agentSpec={agentSpec ?? undefined}
              syncingAgent={syncingAgent}
              onAgentSync={handleAgentSync}
            />
          )}
          {activeTab === 'pm' && <PMTab asset={asset} />}
          {activeTab === 'repairs' && (
            <MaintenanceTab
              assetId={asset.id}
              onUpdate={() => {
                reloadAsset();
                loadMaintenance(asset.id);
              }}
            />
          )}
          {activeTab === 'documents' && <DocumentsTab asset={asset} onReload={reloadAsset} />}
          {activeTab === 'history' && <HistoryTab asset={asset} />}
          {activeTab === 'linked' && <LinkedAssetsTab asset={asset} />}
        </Box>
      )}

      {/* QR Modal */}
      <Dialog open={showQR} onClose={() => setShowQR(false)} maxWidth="xs" fullWidth sx={{ '& .MuiDialog-paper': { p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          QR Code — {asset.assetCode}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2 }}>
          <Box sx={{
            p: 1.5,
            bgcolor: '#fff',
            border: '1.5px solid #e5e7eb',
            borderRadius: '10px',
            display: 'inline-block',
            mb: 2,
          }}>
            <QRCode
              value={`${window.location.origin}/assets/${asset.id}`}
              size={160}
              level="M"
            />
          </Box>
          <Typography variant="body2" fontWeight={700} color="text.primary" align="center">
            {[asset.brand, asset.model].filter(Boolean).join(' ') || asset.assetName}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
            S/N: {asset.serialNo}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 0.5 }}>
          <Button variant="outlined" startIcon={<PrintIcon sx={{ fontSize: 16 }} />} onClick={() => { setShowQR(false); navigate(`/assets/print-qr?ids=${id}`); }} size="small" sx={{ borderRadius: '10px', fontWeight: 600 }}>
            พิมพ์สติ๊กเกอร์
          </Button>
          <Button variant="contained" onClick={() => setShowQR(false)} size="small" sx={{ borderRadius: '10px', fontWeight: 600 }}>
            ปิด
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={() => setToast(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setToast(prev => ({ ...prev, open: false }))}
          severity={toast.severity}
          sx={{ width: '100%', borderRadius: '10px', fontWeight: 600 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
