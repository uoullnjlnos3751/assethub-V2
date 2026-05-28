import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, Chip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Grid, alpha, IconButton, Tooltip,
  FormControl, InputLabel, Select, MenuItem, Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions, Step, StepLabel, Stepper, Skeleton, Divider,
  Backdrop,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PrintIcon from '@mui/icons-material/Print';
import EditIcon from '@mui/icons-material/Edit';
import BusinessIcon from '@mui/icons-material/Business';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import GavelIcon from '@mui/icons-material/Gavel';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import { donationAPI } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

const statusConfig: Record<string, { label: string; color: 'warning' | 'success' | 'default' }> = {
  PENDING:   { label: 'รอส่งมอบ',    color: 'warning' },
  COMPLETED: { label: 'ส่งมอบแล้ว', color: 'success' },
  CANCELLED: { label: 'ยกเลิก',      color: 'default' },
};

// Workflow steps — maps status to active step index
const STEPS = ['สร้างเอกสาร', 'รอส่งมอบ', 'ส่งมอบแล้ว'];
const statusToStep: Record<string, number> = {
  PENDING:   1,
  COMPLETED: 2,
  CANCELLED: 0,
};

// ── Info Card ──────────────────────────────────────────────────────────────
interface InfoCardProps {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  color?: string;
}
function InfoCard({ icon, label, children, color = '#6366F1' }: InfoCardProps) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Box sx={{
            width: 32, height: 32, borderRadius: 1.5,
            bgcolor: alpha(color, 0.1), display: 'flex',
            alignItems: 'center', justifyContent: 'center', color, flexShrink: 0,
          }}>
            {icon}
          </Box>
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {label}
          </Typography>
        </Box>
        {children}
      </CardContent>
    </Card>
  );
}

// ── Lightbox Component ─────────────────────────────────────────────────────
interface LightboxProps {
  images: { src: string; caption?: string }[];
  index: number;
  open: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}
function Lightbox({ images, index, open, onClose, onPrev, onNext }: LightboxProps) {
  if (!open || images.length === 0) return null;
  const current = images[index];
  return (
    <Backdrop open={open} sx={{ zIndex: 9999, bgcolor: 'rgba(0,0,0,0.92)', flexDirection: 'column' }} onClick={onClose}>
      {/* Close button */}
      <IconButton
        onClick={onClose}
        sx={{ position: 'absolute', top: 16, right: 16, color: '#fff', bgcolor: alpha('#fff', 0.1), '&:hover': { bgcolor: alpha('#fff', 0.2) } }}
      >
        <CloseIcon />
      </IconButton>

      {/* Counter */}
      <Typography variant="body2" sx={{ color: alpha('#fff', 0.6), position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)' }}>
        {index + 1} / {images.length}
      </Typography>

      {/* Nav arrows */}
      {images.length > 1 && (
        <>
          <IconButton
            onClick={e => { e.stopPropagation(); onPrev(); }}
            sx={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#fff', bgcolor: alpha('#fff', 0.1), '&:hover': { bgcolor: alpha('#fff', 0.2) } }}
          >
            <ChevronLeftIcon />
          </IconButton>
          <IconButton
            onClick={e => { e.stopPropagation(); onNext(); }}
            sx={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: '#fff', bgcolor: alpha('#fff', 0.1), '&:hover': { bgcolor: alpha('#fff', 0.2) } }}
          >
            <ChevronRightIcon />
          </IconButton>
        </>
      )}

      {/* Image */}
      <Box
        component="img"
        src={current?.src}
        alt={current?.caption || 'Donation evidence'}
        onClick={e => e.stopPropagation()}
        sx={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: 2, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
      />

      {/* Caption */}
      {current?.caption && (
        <Typography variant="body2" sx={{ color: alpha('#fff', 0.8), mt: 2, textAlign: 'center' }}>
          {current.caption}
        </Typography>
      )}
    </Backdrop>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function DonationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [donation, setDonation] = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [status, setStatus]     = useState('');
  const [editDialog, setEditDialog] = useState(false);
  const [uploading, setUploading]   = useState(false);
  const navigate = useNavigate();
  const toast    = useToast();
  const batchFileRef = useRef<HTMLInputElement>(null);
  const itemFileRefs = useRef<Record<number, HTMLInputElement | null>>({});

  // Lightbox state
  const [lightboxOpen, setLightboxOpen]   = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxImages, setLightboxImages] = useState<{ src: string; caption?: string }[]>([]);

  const openLightbox = (images: { src: string; caption?: string }[], startIndex: number) => {
    setLightboxImages(images);
    setLightboxIndex(startIndex);
    setLightboxOpen(true);
  };

  const fetchDonation = async () => {
    try {
      const res = await donationAPI.get(Number(id));
      setDonation(res.data.data);
      setStatus(res.data.data.status);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDonation(); }, [id]);

  const handleStatusUpdate = async () => {
    try {
      await donationAPI.update(Number(id), { status });
      toast.success('อัปเดตสถานะเรียบร้อย');
      setEditDialog(false);
      fetchDonation();
    } catch {
      toast.error('ไม่สามารถอัปเดตสถานะได้');
    }
  };

  // ── Image handlers ──
  const handleBatchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await donationAPI.uploadImage(Number(id), file);
      }
      toast.success(`อัพโหลด ${files.length} รูปเรียบร้อย`);
      fetchDonation();
    } catch {
      toast.error('ไม่สามารถอัพโหลดรูปภาพได้');
    } finally {
      setUploading(false);
      if (batchFileRef.current) batchFileRef.current.value = '';
    }
  };

  const handleBatchDelete = async (imageId: number) => {
    try {
      await donationAPI.deleteImage(Number(id), imageId);
      toast.success('ลบรูปภาพเรียบร้อย');
      fetchDonation();
    } catch {
      toast.error('ไม่สามารถลบรูปภาพได้');
    }
  };

  const handleItemUpload = async (itemId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await donationAPI.uploadItemImage(Number(id), itemId, file);
      toast.success('อัพโหลดรูปรายการเรียบร้อย');
      fetchDonation();
    } catch {
      toast.error('ไม่สามารถอัพโหลดรูปภาพได้');
    } finally {
      setUploading(false);
    }
  };

  const handleItemDelete = async (itemId: number) => {
    try {
      await donationAPI.deleteItemImage(Number(id), itemId);
      toast.success('ลบรูปรายการเรียบร้อย');
      fetchDonation();
    } catch {
      toast.error('ไม่สามารถลบรูปภาพได้');
    }
  };

  const handlePrint = () => window.print();

  // ── Loading skeleton ──
  if (loading) {
    return (
      <Box>
        <Skeleton variant="rectangular" height={44} width={300} sx={{ mb: 3, borderRadius: 1 }} />
        <Skeleton variant="rectangular" height={80} sx={{ mb: 3, borderRadius: 2 }} />
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[1, 2, 3, 4].map(i => <Grid item xs={6} md={3} key={i}><Skeleton variant="rectangular" height={100} sx={{ borderRadius: 2 }} /></Grid>)}
        </Grid>
        <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
      </Box>
    );
  }

  if (!donation) return <Typography>ไม่พบข้อมูล</Typography>;

  const sc         = statusConfig[donation.status] || { label: donation.status, color: 'default' };
  const activeStep = statusToStep[donation.status] ?? 0;
  const totalValue = donation.items.reduce((sum: number, item: any) => sum + (item.asset?.purchasePrice || 0), 0);
  const isCancelled = donation.status === 'CANCELLED';

  // Prepare lightbox-ready batch images
  const batchImages = (donation.images || []).map((img: any) => ({
    src: img.image,
    caption: img.caption || undefined,
    id: img.id,
  }));

  return (
    <Box>
      {/* ── Header (web only) ── */}
      <Box className="no-print" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/donations')}>กลับ</Button>
          <Box>
            <Typography variant="h4" fontWeight={700}>รายละเอียดการบริจาค</Typography>
            <Typography variant="body2" color="text.secondary">{donation.batchRef}</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button variant="outlined" startIcon={<EditIcon />} onClick={() => setEditDialog(true)}>
            เปลี่ยนสถานะ
          </Button>
          <Button variant="contained" startIcon={<PrintIcon />} onClick={handlePrint}>
            พิมพ์รายงาน
          </Button>
        </Box>
      </Box>

      {/* ── Status Stepper (web only) ── */}
      {!isCancelled && (
        <Card className="no-print" sx={{ mb: 3 }}>
          <CardContent sx={{ py: '20px !important' }}>
            <Stepper activeStep={activeStep} alternativeLabel>
              {STEPS.map((label) => (
                <Step key={label}>
                  <StepLabel
                    sx={{
                      '& .MuiStepLabel-label': { fontSize: '0.8rem', fontWeight: 500 },
                      '& .MuiStepIcon-root.Mui-active': { color: 'primary.main' },
                      '& .MuiStepIcon-root.Mui-completed': { color: 'success.main' },
                    }}
                  >
                    {label}
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
          </CardContent>
        </Card>
      )}

      {isCancelled && (
        <Box className="no-print" sx={{ mb: 3, p: 1.5, bgcolor: alpha('#EF4444', 0.06), border: '1px solid', borderColor: alpha('#EF4444', 0.2), borderRadius: 2 }}>
          <Typography variant="body2" color="error.main" fontWeight={500}>
            ⚠️ รายการนี้ถูกยกเลิกแล้ว
          </Typography>
        </Box>
      )}

      {/* ── Info Cards (web only) ── */}
      <Grid container spacing={2} sx={{ mb: 3 }} className="no-print">
        {/* Recipient */}
        <Grid item xs={12} sm={6} md={3}>
          <InfoCard icon={<BusinessIcon sx={{ fontSize: 18 }} />} label="หน่วยงานผู้รับ" color="#6366F1">
            <Typography variant="body1" fontWeight={600}>{donation.recipientName}</Typography>
            {donation.recipientAddress && <Typography variant="body2" color="text.secondary">{donation.recipientAddress}</Typography>}
            {donation.recipientContact && <Typography variant="caption" color="text.secondary">ผู้ติดต่อ: {donation.recipientContact}</Typography>}
            {donation.recipientPhone && <Typography variant="caption" color="text.secondary" display="block">โทร: {donation.recipientPhone}</Typography>}
          </InfoCard>
        </Grid>
        {/* Date */}
        <Grid item xs={6} sm={3} md={3}>
          <InfoCard icon={<CalendarTodayIcon sx={{ fontSize: 18 }} />} label="วันที่บริจาค" color="#f59e0b">
            <Typography variant="body1" fontWeight={600}>
              {new Date(donation.donationDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
            </Typography>
          </InfoCard>
        </Grid>
        {/* Approval */}
        <Grid item xs={6} sm={3} md={3}>
          <InfoCard icon={<GavelIcon sx={{ fontSize: 18 }} />} label="เลขที่หนังสืออนุมัติ" color="#10B981">
            <Typography variant="body1" fontWeight={600}>{donation.approvalRef || '—'}</Typography>
          </InfoCard>
        </Grid>
        {/* Total value */}
        <Grid item xs={12} sm={6} md={3}>
          <InfoCard icon={<AccountBalanceWalletIcon sx={{ fontSize: 18 }} />} label="มูลค่ารวม" color="#EF4444">
            <Typography variant="body1" fontWeight={700} color="error.dark">
              {totalValue.toLocaleString()} บาท
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {donation.items.length} รายการ &nbsp;|&nbsp; <Chip label={sc.label} color={sc.color} size="small" sx={{ height: 18, fontSize: '0.7rem' }} />
            </Typography>
          </InfoCard>
        </Grid>
      </Grid>

      {/* ══════════════════════════════════════════════════════════════
           Evidence Photo Gallery (Batch-level)
         ══════════════════════════════════════════════════════════════ */}
      <Card className="no-print" sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{
                width: 32, height: 32, borderRadius: 1.5,
                bgcolor: alpha('#8B5CF6', 0.1), display: 'flex',
                alignItems: 'center', justifyContent: 'center', color: '#8B5CF6',
              }}>
                <PhotoLibraryIcon sx={{ fontSize: 18 }} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={600}>หลักฐานรูปภาพ</Typography>
                <Typography variant="caption" color="text.secondary">
                  รูปภาพบันทึกการส่งมอบอุปกรณ์ ({batchImages.length} รูป)
                </Typography>
              </Box>
            </Box>
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddPhotoAlternateIcon />}
              onClick={() => batchFileRef.current?.click()}
              disabled={uploading}
              sx={{ borderColor: alpha('#8B5CF6', 0.3), color: '#8B5CF6', '&:hover': { borderColor: '#8B5CF6', bgcolor: alpha('#8B5CF6', 0.04) } }}
            >
              {uploading ? 'กำลังอัพโหลด...' : 'เพิ่มรูป'}
            </Button>
            <input
              ref={batchFileRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={handleBatchUpload}
            />
          </Box>

          {batchImages.length === 0 ? (
            <Box sx={{
              py: 5, display: 'flex', flexDirection: 'column', alignItems: 'center',
              border: '2px dashed', borderColor: alpha('#8B5CF6', 0.2), borderRadius: 2,
              bgcolor: alpha('#8B5CF6', 0.02), cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': { borderColor: alpha('#8B5CF6', 0.4), bgcolor: alpha('#8B5CF6', 0.04) },
            }}
              onClick={() => batchFileRef.current?.click()}
            >
              <AddPhotoAlternateIcon sx={{ fontSize: 40, color: alpha('#8B5CF6', 0.3), mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                คลิกหรือลากไฟล์เพื่อเพิ่มรูปหลักฐาน
              </Typography>
              <Typography variant="caption" color="text.disabled">
                รองรับ JPG, PNG (สูงสุด 5MB ต่อรูป)
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              {batchImages.map((img: any, i: number) => (
                <Box
                  key={img.id}
                  sx={{
                    position: 'relative', width: 120, height: 120, borderRadius: 2,
                    overflow: 'hidden', border: '1px solid', borderColor: 'divider',
                    cursor: 'pointer', transition: 'all 0.2s',
                    '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.15)', transform: 'translateY(-2px)' },
                    '&:hover .delete-btn': { opacity: 1 },
                  }}
                >
                  <Box
                    component="img"
                    src={img.src}
                    alt={img.caption || `Evidence ${i + 1}`}
                    onClick={() => openLightbox(batchImages, i)}
                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <Tooltip title="ลบรูปภาพ">
                    <IconButton
                      className="delete-btn"
                      size="small"
                      onClick={(e) => { e.stopPropagation(); handleBatchDelete(img.id); }}
                      sx={{
                        position: 'absolute', top: 4, right: 4,
                        bgcolor: 'rgba(0,0,0,0.6)', color: '#fff',
                        opacity: 0, transition: 'opacity 0.2s',
                        '&:hover': { bgcolor: 'error.main' },
                        width: 24, height: 24,
                      }}
                    >
                      <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                  {img.caption && (
                    <Box sx={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      bgcolor: 'rgba(0,0,0,0.5)', px: 0.75, py: 0.25,
                    }}>
                      <Typography variant="caption" sx={{ color: '#fff', fontSize: '0.65rem' }} noWrap>
                        {img.caption}
                      </Typography>
                    </Box>
                  )}
                </Box>
              ))}

              {/* Add more button */}
              <Box
                onClick={() => batchFileRef.current?.click()}
                sx={{
                  width: 120, height: 120, borderRadius: 2,
                  border: '2px dashed', borderColor: alpha('#8B5CF6', 0.25),
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'all 0.2s',
                  '&:hover': { borderColor: '#8B5CF6', bgcolor: alpha('#8B5CF6', 0.04) },
                }}
              >
                <AddPhotoAlternateIcon sx={{ fontSize: 24, color: alpha('#8B5CF6', 0.4), mb: 0.5 }} />
                <Typography variant="caption" color="text.disabled">เพิ่มรูป</Typography>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* ── Document Card (print-friendly) ── */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: { xs: 2, md: 4 } }}>
          {/* Print-only header */}
          <Box className="print-only" sx={{ display: 'none', '@media print': { display: 'block' }, textAlign: 'center', mb: 4, pb: 3, borderBottom: '2px solid #333' }}>
            <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>บันทึกการส่งมอบทรัพย์สิน</Typography>
            <Typography variant="body2" color="text.secondary">เลขที่: {donation.batchRef}</Typography>
          </Box>

          {/* Web-only section label */}
          <Box className="no-print" sx={{ mb: 3 }}>
            <Typography variant="h6" fontWeight={600}>
              รายการทรัพย์สินที่ส่งมอบ
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {donation.items.length} รายการ — มูลค่ารวม {totalValue.toLocaleString()} บาท
            </Typography>
          </Box>

          {/* Print-only info grid */}
          <Grid container spacing={2} sx={{ mb: 4, display: 'none', '@media print': { display: 'flex' } }}>
            <Grid item xs={6}>
              <Typography variant="caption" fontWeight={600} display="block">หน่วยงานผู้รับ</Typography>
              <Typography variant="body1" fontWeight={600}>{donation.recipientName}</Typography>
              {donation.recipientAddress && <Typography variant="body2">{donation.recipientAddress}</Typography>}
              {donation.recipientContact && <Typography variant="body2">ผู้ติดต่อ: {donation.recipientContact}</Typography>}
              {donation.recipientPhone   && <Typography variant="body2">โทร: {donation.recipientPhone}</Typography>}
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" fontWeight={600} display="block">วันที่บริจาค</Typography>
              <Typography variant="body1" fontWeight={600}>{new Date(donation.donationDate).toLocaleDateString('th-TH')}</Typography>
              {donation.approvalRef && (
                <>
                  <Typography variant="caption" fontWeight={600} display="block" sx={{ mt: 1 }}>เลขที่อนุมัติ</Typography>
                  <Typography variant="body2">{donation.approvalRef}</Typography>
                </>
              )}
            </Grid>
          </Grid>

          {/* Items Table */}
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: alpha('#000', 0.04) }}>
                  <TableCell sx={{ fontWeight: 600 }}>ลำดับ</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>เลขครุภัณฑ์</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>ชื่อทรัพย์สิน</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Serial No.</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>ยี่ห้อ/รุ่น</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>ราคาทุน</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>สภาพ</TableCell>
                  <TableCell className="no-print" sx={{ fontWeight: 600, width: 80 }}>📷</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>หมายเหตุ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {donation.items.map((item: any, i: number) => (
                  <TableRow key={item.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>{item.asset?.assetCode || '—'}</TableCell>
                    <TableCell>{item.asset?.assetName || '—'}</TableCell>
                    <TableCell>{item.asset?.serialNo || '—'}</TableCell>
                    <TableCell>{[item.asset?.brand, item.asset?.model].filter(Boolean).join(' ') || '—'}</TableCell>
                    <TableCell>{item.asset?.purchasePrice ? `${item.asset.purchasePrice.toLocaleString()} บาท` : '—'}</TableCell>
                    <TableCell>{item.condition || '—'}</TableCell>
                    <TableCell className="no-print">
                      {item.image ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Box
                            component="img"
                            src={item.image}
                            alt={`Item ${item.id}`}
                            onClick={() => openLightbox([{ src: item.image, caption: `${item.asset?.assetName || item.asset?.assetCode || ''} — สภาพอุปกรณ์` }], 0)}
                            sx={{
                              width: 36, height: 36, borderRadius: 1, objectFit: 'cover',
                              cursor: 'pointer', border: '1px solid', borderColor: 'divider',
                              transition: 'all 0.2s', '&:hover': { boxShadow: '0 2px 8px rgba(0,0,0,0.15)' },
                            }}
                          />
                          <Tooltip title="ลบรูป">
                            <IconButton
                              size="small"
                              onClick={() => handleItemDelete(item.id)}
                              sx={{ width: 20, height: 20, color: 'text.disabled', '&:hover': { color: 'error.main' } }}
                            >
                              <DeleteOutlineIcon sx={{ fontSize: 12 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      ) : (
                        <>
                          <Tooltip title="เพิ่มรูปสภาพอุปกรณ์">
                            <IconButton
                              size="small"
                              onClick={() => itemFileRefs.current[item.id]?.click()}
                              sx={{ color: 'text.disabled', '&:hover': { color: '#8B5CF6' } }}
                            >
                              <PhotoCameraIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                          <input
                            ref={el => { itemFileRefs.current[item.id] = el; }}
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={(e) => handleItemUpload(item.id, e)}
                          />
                        </>
                      )}
                    </TableCell>
                    <TableCell>{item.notes || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Total */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, pt: 2, borderTop: '1px solid #e0e0e0' }}>
            <Typography variant="subtitle1" fontWeight={700}>
              มูลค่ารวม: {totalValue.toLocaleString()} บาท
            </Typography>
          </Box>

          {/* Notes */}
          {donation.notes && (
            <Box sx={{ mt: 3, p: 2, bgcolor: alpha('#000', 0.02), borderRadius: 1, border: '0.5px solid', borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>หมายเหตุ</Typography>
              <Typography variant="body2">{donation.notes}</Typography>
            </Box>
          )}

          {/* Signature section */}
          <Grid container spacing={6} sx={{ mt: 6, mb: 2 }}>
            <Grid item xs={6}>
              <Box sx={{ textAlign: 'center' }}>
                <Divider sx={{ mb: 6 }} />
                <Typography variant="body2" fontWeight={500}>ผู้ส่งมอบ</Typography>
                <Typography variant="body2">({donation.createdBy?.displayName || ''})</Typography>
                <Typography variant="caption" color="text.secondary">วันที่ ......... / ......... / .........</Typography>
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Box sx={{ textAlign: 'center' }}>
                <Divider sx={{ mb: 6 }} />
                <Typography variant="body2" fontWeight={500}>ผู้รับ</Typography>
                <Typography variant="body2">({donation.recipientName})</Typography>
                <Typography variant="caption" color="text.secondary">วันที่ ......... / ......... / .........</Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* ── Lightbox ── */}
      <Lightbox
        images={lightboxImages}
        index={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onPrev={() => setLightboxIndex(prev => (prev - 1 + lightboxImages.length) % lightboxImages.length)}
        onNext={() => setLightboxIndex(prev => (prev + 1) % lightboxImages.length)}
      />

      {/* ── Status Edit Dialog ── */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>เปลี่ยนสถานะรายการบริจาค</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            เลขที่ <strong>{donation.batchRef}</strong> — เลือกสถานะใหม่
          </DialogContentText>
          <FormControl fullWidth size="small">
            <InputLabel>สถานะ</InputLabel>
            <Select value={status} label="สถานะ" onChange={e => setStatus(e.target.value)}>
              <MenuItem value="PENDING">⏳ รอส่งมอบ</MenuItem>
              <MenuItem value="COMPLETED">✅ ส่งมอบแล้ว</MenuItem>
              <MenuItem value="CANCELLED">❌ ยกเลิก</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>ยกเลิก</Button>
          <Button variant="contained" onClick={handleStatusUpdate}>บันทึก</Button>
        </DialogActions>
      </Dialog>

      {/* ── Print CSS ── */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; }
        }
      `}</style>
    </Box>
  );
}
