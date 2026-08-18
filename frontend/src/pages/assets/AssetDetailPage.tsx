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
import { AssetActionsPanel } from './components/AssetActionsPanel';
import { AssetInsightTiles } from './components/AssetInsightTiles';
import { AssetSpecMiniCard } from './components/AssetSpecMiniCard';
import { AssetLiveStatusCard } from './components/AssetLiveStatusCard';
import { AssetServiceHistoryCard } from './components/AssetServiceHistoryCard';
import { AssetDocumentsRail } from './components/AssetDocumentsRail';
import { PillTabBar } from '../../components/PillTabBar';

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
      : 'คุณต้องการอัปเดตรายละเอียดฮาร์ดแวร์ทั้งหมดของทรัพย์สินนี้ตามข้อมูลใน GLPI หรือไม่? (ค่าเดิมในระบบจะถูกเขียนทับ)';

    if (!window.confirm(confirmMsg)) return;

    setSyncingGLPI(true);
    try {
      await assetAPI.syncGLPI(parseInt(id), field);
      setToast({
        open: true,
        message: field ? `อัปเดต "${label}" ตาม GLPI เรียบร้อยแล้ว` : 'อัปเดตรายละเอียดฮาร์ดแวร์ตาม GLPI เรียบร้อยแล้ว',
        severity: 'success'
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
            <AssetOverviewCard asset={asset} />

            {/* Spec beside finance, as in the handoff. auto-fit keeps them side
                by side when there's room and stacks them when there isn't —
                including when AssetFinanceCard hides itself for want of data. */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 2, alignItems: 'stretch' }}>
              <AssetSpecMiniCard asset={asset} glpiSpec={glpiSpec} />
              <AssetLiveStatusCard loading={loadingExternalAgent} agent={externalAgent} />
              <AssetFinanceCard asset={asset} />
            </Box>

            <AssetServiceHistoryCard asset={asset} maintenance={maintenance} onSeeAll={goRepairs} />

            {/* Summary tiles sit below the service table, matching the handoff */}
            <AssetInsightTiles asset={asset} maintenance={maintenance} />
          </Box>

          {/* ── Context rail ────────────────────────────────── */}
          {/* Deliberately not sticky: with timeline + documents + actions
              stacked, the rail is taller than the viewport, and a sticky block
              taller than its viewport pins its overflow off-screen where it
              can't be scrolled to. */}
          <Box sx={{
            width: { xs: '100%', lg: 340 },
            flex: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}>
            <AssetTimeline asset={asset} maintenance={maintenance} />
            <AssetDocumentsRail asset={asset} onReload={reloadAsset} />
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
