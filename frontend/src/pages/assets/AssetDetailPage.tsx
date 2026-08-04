import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CircularProgress,
  Card,
  CardContent,
  Chip,
  Typography,
  alpha,
  useTheme,
  Box,
  Grid,
  Button,
  Tabs,
  Tab,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import QrCodeIcon from '@mui/icons-material/QrCode';
import PrintIcon from '@mui/icons-material/Print';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import HistoryIcon from '@mui/icons-material/History';
import BuildIcon from '@mui/icons-material/Build';
import HandymanIcon from '@mui/icons-material/Handyman';
import LinkIcon from '@mui/icons-material/Link';
import PersonIcon from '@mui/icons-material/Person';
import QRCode from 'react-qr-code';
import { assetAPI } from '../../services/api';
import StatusChip from '../../components/StatusChip';
import MaintenanceTab from './MaintenanceTab';
import LinkedAssetsTab from './tabs/LinkedAssetsTab';
import { getTypeIconComponent } from './components/assetTypeIcon';
import { WarrantyBar } from './components/WarrantyBar';
import { LifecycleStepper } from './components/LifecycleStepper';
import { SpecTab } from './tabs/SpecTab';
import { HistoryTab } from './tabs/HistoryTab';
import { PMTab } from './tabs/PMTab';
import { DocumentsTab } from './tabs/DocumentsTab';

/* ─── Main Page ───────────────────────────────────────────────── */
export default function AssetDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('spec');
  const [showQR, setShowQR] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [similarAssets, setSimilarAssets] = useState<any[]>([]);

  const [glpiSpec, setGlpiSpec] = useState<any>(null);
  const [loadingGLPI, setLoadingGLPI] = useState(false);
  const [syncingGLPI, setSyncingGLPI] = useState(false);
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

  // favorite check
  useEffect(() => {
    try {
      const favs: number[] = JSON.parse(localStorage.getItem('assethub.favoriteAssets') || '[]');
      setIsFavorite(favs.includes(parseInt(id!)));
    } catch { setIsFavorite(false); }
  }, [id]);

  // load similar assets
  useEffect(() => {
    if (!asset?.categoryId) return;
    assetAPI.list({ categoryId: asset.categoryId, limit: 5 })
      .then((res) => setSimilarAssets((res.data.data || []).filter((a: any) => a.id !== asset.id)))
      .catch(() => {});
  }, [asset]);

  /* Warranty calculation */
  const warrantyDaysLeft = useMemo(() => {
    if (!asset?.warrantyEndDate) return null;
    return Math.max(0, Math.round((new Date(asset.warrantyEndDate).getTime() - Date.now()) / 86400000));
  }, [asset]);

  const totalBorrows = asset?.pmRuns?.length ?? 0;
  const completedPMs = asset?.pmRuns?.filter((r: any) => r.status === 'COMPLETED').length ?? 0;

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <CircularProgress size={32} />
    </Box>
  );
  if (!asset) return <Box sx={{ p: 4, textAlign: 'center' }}><Typography color="text.secondary">ไม่พบทรัพย์สิน</Typography></Box>;

  const TypeIcon = getTypeIconComponent(asset.type);
  const historyCount = asset.assetHistory?.length ?? 0;

  const toggleFavorite = () => {
    try {
      const favs: number[] = JSON.parse(localStorage.getItem('assethub.favoriteAssets') || '[]');
      const idNum = parseInt(id!);
      if (isFavorite) {
        localStorage.setItem('assethub.favoriteAssets', JSON.stringify(favs.filter(f => f !== idNum)));
        setIsFavorite(false);
      } else {
        localStorage.setItem('assethub.favoriteAssets', JSON.stringify([idNum, ...favs]));
        setIsFavorite(true);
      }
    } catch { /* ignore */ }
  };

  return (
    <Box sx={{ pb: 5 }}>
      {/* Hero card */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ p: '20px 24px !important' }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={9}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
                <Avatar sx={{
                  width: 52,
                  height: 52,
                  borderRadius: '14px',
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  flexShrink: 0
                }}>
                  <TypeIcon sx={{ fontSize: 26 }} />
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 0.5 }}>
                    <Typography variant="h6" fontWeight={700} color="text.primary" sx={{ lineHeight: 1.2 }}>
                      {asset.brand} {asset.model}
                    </Typography>
                    <StatusChip status={asset.status} />
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 1 }}>
                    <Chip label={asset.assetCode} size="small" variant="outlined" color="primary" sx={{ height: 20, fontFamily: 'monospace', fontWeight: 700 }} />
                    {asset.assetName && (
                      <Chip label={asset.assetName} size="small" sx={{ height: 20, bgcolor: (t) => alpha(t.palette.primary.main, 0.1), color: 'primary.dark', fontWeight: 600 }} />
                    )}
                    {asset.type && (
                      <Typography variant="caption" color="text.secondary">{asset.type}</Typography>
                    )}
                    {asset.location && (
                      <Typography variant="caption" color="text.secondary">
                        · {asset.location}{asset.floor ? ` ชั้น ${asset.floor}` : ''}
                      </Typography>
                    )}
                    {asset.departmentId && (
                      <Typography variant="caption" color="text.secondary">
                        · แผนก {asset.departmentId}
                      </Typography>
                    )}
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    {asset.age != null && (
                      <Chip label={`อายุ ${asset.age} ปี`} size="small" sx={{ height: 18, bgcolor: (t) => alpha(t.palette.warning.main, 0.12), color: 'warning.dark', fontWeight: 600, fontSize: '10px' }} />
                    )}
                    {asset.serialNo && (
                      <Typography variant="caption" color="text.disabled">S/N: {asset.serialNo}</Typography>
                    )}
                    {asset.ownerName && (
                      <Typography variant="caption" color="primary.main" sx={{ ml: 1, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <PersonIcon sx={{ fontSize: 14 }} /> {asset.ownerName}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={3} sx={{ textAlign: { xs: 'left', md: 'right' }, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              {asset.purchasePrice != null && (
                <Box>
                  <Typography variant="h5" fontWeight={800} color="primary.main">
                    ฿{Number(asset.purchasePrice).toLocaleString('th-TH')}
                  </Typography>
                  <Typography variant="caption" color="text.disabled" display="block">ราคาซื้อ</Typography>
                </Box>
              )}
            </Grid>
          </Grid>

          {/* Action buttons */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Button variant="outlined" startIcon={<EditIcon sx={{ fontSize: 16 }} />} onClick={() => navigate(`/assets/${id}/edit`)} size="small" sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}>
              แก้ไข
            </Button>
            <Button
              variant={isFavorite ? 'contained' : 'outlined'}
              startIcon={isFavorite ? <StarIcon sx={{ fontSize: 16 }} /> : <StarBorderIcon sx={{ fontSize: 16 }} />}
              onClick={toggleFavorite}
              size="small"
              sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}
            >
              ดาวโปรด
            </Button>
            <Button variant="outlined" color="warning" startIcon={<QrCodeIcon sx={{ fontSize: 16 }} />} onClick={() => setShowQR(true)} size="small" sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}>
              QR Code
            </Button>
            <Button variant="outlined" startIcon={<PrintIcon sx={{ fontSize: 16 }} />} onClick={() => navigate(`/assets/print-qr?ids=${id}`)} size="small" sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}>
              พิมพ์สติ๊กเกอร์
            </Button>
            <Button variant="outlined" color="inherit" startIcon={<ArrowBackIcon sx={{ fontSize: 16 }} />} onClick={() => navigate('/assets')} size="small" sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600, ml: { sm: 'auto' } }}>
              กลับรายการ
            </Button>
          </Box>
        </CardContent>
      </Card>

      <LifecycleStepper asset={asset} />

      {/* Quick stats strip */}
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        <Grid item xs={6} sm={3}>
          <Card sx={{ textAlign: 'center', p: 1 }}>
            <CardContent sx={{ py: '12px !important' }}>
              <Typography variant="h6" fontWeight={800} color="text.primary" sx={{ lineHeight: 1 }}>
                {historyCount}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px', mt: 0.5, display: 'block' }}>
                ประวัติการเปลี่ยนแปลง
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ textAlign: 'center', p: 1 }}>
            <CardContent sx={{ py: '12px !important' }}>
              <Typography variant="h6" fontWeight={800} color="secondary.main" sx={{ lineHeight: 1 }}>
                {totalBorrows}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px', mt: 0.5, display: 'block' }}>
                บันทึก PM
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ textAlign: 'center', p: 1 }}>
            <CardContent sx={{ py: '12px !important' }}>
              <Typography variant="h6" fontWeight={800} color="success.main" sx={{ lineHeight: 1 }}>
                {completedPMs}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px', mt: 0.5, display: 'block' }}>
                PM เสร็จแล้ว
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ textAlign: 'center', p: 1 }}>
            <CardContent sx={{ py: '12px !important' }}>
              <Typography
                variant="h6"
                fontWeight={800}
                sx={{
                  lineHeight: 1,
                  color: warrantyDaysLeft === 0 ? 'error.main' : warrantyDaysLeft != null && warrantyDaysLeft < 180 ? 'warning.main' : 'primary.main'
                }}
              >
                {warrantyDaysLeft != null ? warrantyDaysLeft.toLocaleString('th-TH') : '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px', mt: 0.5, display: 'block' }}>
                วันหมดประกัน
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Warranty bar */}
      <WarrantyBar purchaseDate={asset.purchaseDate} warrantyEndDate={asset.warrantyEndDate} />

      {/* Tabs navigation */}
      <Tabs
        value={activeTab}
        onChange={(_, val) => setActiveTab(val)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          mb: 2,
          borderBottom: 1,
          borderColor: 'divider',
          '& .MuiTab-root': {
            fontWeight: 700,
            fontSize: '0.8125rem',
            minHeight: 44,
          }
        }}
      >
        <Tab value="spec" icon={<InfoOutlinedIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="สเปก" />
        <Tab value="history" icon={<HistoryIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="ประวัติ" />
        <Tab value="pm" icon={<BuildIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="PM" />
        <Tab value="documents" icon={<InsertDriveFileIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="เอกสาร" />
        <Tab value="repairs" icon={<HandymanIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="ประวัติการซ่อม" />
        <Tab value="linked" icon={<LinkIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="อุปกรณ์ที่เชื่อมโยง" />
      </Tabs>

      {/* Tab panels */}
      {activeTab === 'spec' && (
        <SpecTab
          asset={asset}
          glpiSpec={glpiSpec}
          loadingGLPI={loadingGLPI}
          syncingGLPI={syncingGLPI}
          onSync={handleGLPISync}
        />
      )}
      {activeTab === 'history' && <HistoryTab asset={asset} />}
      {activeTab === 'pm' && <PMTab asset={asset} />}
      {activeTab === 'documents' && (
        <DocumentsTab
          asset={asset}
          onReload={() => {
            assetAPI.get(parseInt(id!)).then(res => setAsset(res.data));
          }}
        />
      )}
      {activeTab === 'repairs' && (
        <MaintenanceTab
          assetId={asset.id}
          onUpdate={() => {
            assetAPI.get(parseInt(id!)).then(res => setAsset(res.data));
          }}
        />
      )}
      {activeTab === 'linked' && <LinkedAssetsTab asset={asset} />}

      {/* Similar assets */}
      {similarAssets.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <Box sx={{ width: 3, height: 14, borderRadius: '2px', bgcolor: 'primary.main' }} />
            <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '.06em' }}>
              ทรัพย์สินใกล้เคียงในหมวดหมู่เดียวกัน
            </Typography>
          </Box>
          <Grid container spacing={1}>
            {similarAssets.slice(0, 4).map((a: any) => (
              <Grid item xs={12} key={a.id}>
                <Box
                  onClick={() => navigate(`/assets/${a.id}`)}
                  sx={{
                    cursor: 'pointer',
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: (t) => alpha(t.palette.primary.main, 0.03),
                    border: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 2,
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: (t) => alpha(t.palette.primary.main, 0.06),
                      borderColor: 'primary.main',
                      transform: 'translateY(-2px)',
                    }
                  }}
                >
                  <Box>
                    <Typography variant="body2" fontWeight={700} color="text.primary">
                      {a.assetCode}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {a.brand} {a.model} · {a.serialNo}
                    </Typography>
                  </Box>
                  <StatusChip status={a.status} />
                </Box>
              </Grid>
            ))}
          </Grid>
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
