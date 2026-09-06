import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box, Button, Card, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, IconButton, Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip, Typography,
  Breadcrumbs, Link, alpha, useTheme,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import MenuItem from '@mui/material/MenuItem';
import { catalogAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useConfirm } from '../../contexts/ConfirmContext';

const fmtBaht = (v: number) => `฿${v.toLocaleString('th-TH', { maximumFractionDigits: 0 })}`;
const fmtSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** "CPU: Intel Core..." -> {label:'CPU', value:'Intel Core...'}; บรรทัดที่ไม่มี ':'
 *  ถือเป็นข้อความอิสระทั้งบรรทัด (label ว่าง) — ผู้ใช้พิมพ์สเปคแบบไหนมาก็ยังอ่านได้ */
function parseSpecs(specs?: string | null): { label: string; value: string }[] {
  if (!specs) return [];
  return specs.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
    const idx = line.indexOf(':');
    if (idx > 0 && idx < 32) {
      return { label: line.slice(0, idx).trim(), value: line.slice(idx + 1).trim() };
    }
    return { label: '', value: line.replace(/^[-•]\s*/, '') };
  });
}

/**
 * หน้ารายละเอียดสเปค — อิงหน้ารายละเอียดสินค้าของ advice.co.th ตามที่ผู้ใช้ขอ:
 * breadcrumb, รูป+ข้อมูลหลักสองคอลัมน์ด้านบน, ตารางสเปคแบบจัดกลุ่มด้านล่าง
 * ต่างจากของจริงตรงที่ไม่มีราคาตัดราคา/ตะกร้า/ผ่อนชำระ เพราะเป็นแคตตาล็อกอ้างอิง
 */
export default function CatalogDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const { user } = useAuth();
  const canEdit = user?.role === 'IT_ADMIN' || user?.role === 'SUPERADMIN';
  const canDelete = user?.role === 'SUPERADMIN';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [item, setItem] = useState<any>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [itemRes, assetsRes] = await Promise.all([
        catalogAPI.get(parseInt(id)),
        catalogAPI.assets(parseInt(id)),
      ]);
      setItem(itemRes.data);
      setAssets(assetsRes.data || []);
    } catch {
      setItem(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const openEdit = () => {
    setForm({
      name: item.name, jobRole: item.jobRole || '', brand: item.brand || '', model: item.model || '',
      specs: item.specs || '', recommendedPrice: item.recommendedPrice != null ? String(item.recommendedPrice) : '',
      vendorName: item.vendorName || '', isActive: item.isActive,
    });
    setError('');
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('ต้องระบุชื่อสเปค'); return; }
    setSaving(true);
    setError('');
    try {
      await catalogAPI.update(item.id, {
        ...form,
        recommendedPrice: form.recommendedPrice ? parseFloat(form.recommendedPrice) : null,
      });
      setEditOpen(false);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const confirm = useConfirm();
  const handleDelete = async () => {
    if (!item) return;
    if (!await confirm({
      title: 'ลบสเปคออกจากแคตตาล็อก',
      target: item.name,
      detail: `ทรัพย์สินที่ผูกไว้ ${item._count?.assets ?? 0} เครื่องจะไม่ถูกลบ แต่จะหลุดการผูกกับสเปคนี้`,
    })) return;
    await catalogAPI.delete(item.id);
    navigate('/catalog');
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !item) return;
    const file = e.target.files[0];
    if (file.size > 10 * 1024 * 1024) { alert('ขนาดไฟล์ต้องไม่เกิน 10MB'); e.target.value = ''; return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await catalogAPI.uploadDocument(item.id, fd);
      await load();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'อัปโหลดไม่สำเร็จ');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteDoc = async (docId: number) => {
    if (!item) return;
    if (!await confirm({ title: 'ลบเอกสารแนบ', target: item.documents?.find((d: any) => d.id === docId)?.fileName })) return;
    await catalogAPI.deleteDocument(item.id, docId);
    await load();
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !item) return;
    const file = e.target.files[0];
    if (file.size > 10 * 1024 * 1024) { alert('ขนาดไฟล์ต้องไม่เกิน 10MB'); e.target.value = ''; return; }
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      await catalogAPI.uploadImage(item.id, fd);
      await load();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'อัปโหลดรูปไม่สำเร็จ');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleDeleteImage = async () => {
    if (!item) return;
    if (!await confirm({ title: 'ลบรูปสินค้า', target: item.name })) return;
    await catalogAPI.deleteImage(item.id);
    await load();
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  }
  if (!item) {
    return <Typography sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>ไม่พบรายการในแคตตาล็อก</Typography>;
  }

  const specRows = parseSpecs(item.specs);
  const highlights = specRows.slice(0, 5);

  return (
    <Box sx={{ pb: 5 }}>
      <Breadcrumbs sx={{ fontSize: 13, mb: 2 }}>
        <Link component={RouterLink} to="/catalog" underline="hover" color="inherit">แคตตาล็อกอุปกรณ์มาตรฐาน</Link>
        {item.jobRole && (
          <Link component={RouterLink} to={`/catalog?jobRole=${encodeURIComponent(item.jobRole)}`} underline="hover" color="inherit">
            {item.jobRole}
          </Link>
        )}
        <Typography sx={{ fontSize: 13, color: 'text.primary' }}>{item.name}</Typography>
      </Breadcrumbs>

      {/* ── ส่วนหัว: รูป + ข้อมูลหลัก ── */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card variant="outlined" sx={{ borderRadius: 3, p: 2, position: 'relative' }}>
            {!item.isActive && (
              <Chip label="ปิดใช้งาน" size="small" sx={{
                position: 'absolute', top: 14, left: 14, zIndex: 1, fontWeight: 700,
                bgcolor: alpha(theme.palette.text.disabled, 0.85), color: '#fff',
              }} />
            )}
            <Box sx={{
              height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center',
              bgcolor: alpha(theme.palette.text.primary, 0.03), borderRadius: 2, p: 2, position: 'relative',
            }}>
              {item.imageUrl ? (
                <Box component="img" src={item.imageUrl} alt={item.name} sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              ) : (
                <Inventory2RoundedIcon sx={{ fontSize: 96, color: alpha(theme.palette.text.primary, 0.15) }} />
              )}
            </Box>
            {canEdit && (
              <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                <Button
                  fullWidth size="small" variant="outlined" startIcon={uploadingImage ? <CircularProgress size={14} /> : <AddPhotoAlternateIcon sx={{ fontSize: 16 }} />}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                >
                  {item.imageUrl ? 'เปลี่ยนรูป' : 'เพิ่มรูปสินค้า'}
                </Button>
                {item.imageUrl && (
                  <Button size="small" color="error" variant="outlined" onClick={handleDeleteImage} sx={{ minWidth: 0, px: 1.5 }}>
                    <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                  </Button>
                )}
                <input ref={fileInputRef} type="file" hidden accept="image/*" onChange={handleUploadImage} />
              </Box>
            )}
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 800, color: 'primary.main', letterSpacing: '.03em' }}>
                {(item.brand || 'GENERIC').toUpperCase()}
              </Typography>
              <Typography variant="h5" fontWeight={800} sx={{ lineHeight: 1.3, mt: '2px' }}>{item.name}</Typography>
              {item.model && <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: '2px' }}>รหัสรุ่น: {item.model}</Typography>}
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
              <Button variant="outlined" color="inherit" startIcon={<ArrowBackIcon sx={{ fontSize: 16 }} />} onClick={() => navigate('/catalog')} size="small">
                กลับ
              </Button>
              {canEdit && (
                <Button variant="outlined" startIcon={<EditIcon sx={{ fontSize: 16 }} />} onClick={openEdit} size="small">แก้ไข</Button>
              )}
              {canDelete && (
                <Button variant="outlined" color="error" startIcon={<DeleteIcon sx={{ fontSize: 16 }} />} onClick={handleDelete} size="small">ลบ</Button>
              )}
            </Box>
          </Box>

          <Box sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>ราคาที่แนะนำ</Typography>
            <Typography sx={{ fontSize: 30, fontWeight: 800, color: 'primary.main', lineHeight: 1.3 }}>
              {item.recommendedPrice != null ? fmtBaht(Number(item.recommendedPrice)) : '—'}
            </Typography>
            {item.vendorName && (
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: '2px' }}>อ้างอิงราคาจาก: {item.vendorName}</Typography>
            )}
          </Box>

          {item.jobRole && (
            <Chip label={`เหมาะสำหรับ: ${item.jobRole}`} size="small" sx={{ mt: 1.5, fontWeight: 600 }} />
          )}

          {highlights.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1 }}>รายละเอียดเด่น</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6 }}>
                {highlights.map((h, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75 }}>
                    <CheckCircleRoundedIcon sx={{ fontSize: 15, color: 'success.main', mt: '2px', flexShrink: 0 }} />
                    <Typography sx={{ fontSize: 13.5 }}>
                      {h.label ? <b>{h.label}: </b> : null}{h.value}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Grid>
      </Grid>

      {/* ── รายละเอียด + ผู้ใช้งาน (ซ้าย) / เอกสาร (ขวา) ── */}
      <Grid container spacing={3} sx={{ mt: 0.5 }}>
        <Grid item xs={12} md={8}>
          {specRows.length > 0 && (
            <Card variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', mb: 3 }}>
              <Typography sx={{ fontWeight: 700, p: 2, pb: 1 }}>ข้อมูลจำเพาะทั้งหมด</Typography>
              <Table size="small">
                <TableBody>
                  {specRows.map((r, i) => (
                    <TableRow key={i} sx={{ '&:nth-of-type(odd)': { bgcolor: alpha(theme.palette.text.primary, 0.02) } }}>
                      <TableCell sx={{ width: '32%', fontSize: 12.5, color: 'text.secondary', fontWeight: 600, verticalAlign: 'top' }}>
                        {r.label || '—'}
                      </TableCell>
                      <TableCell sx={{ fontSize: 13 }}>{r.value}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          <Card variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <Typography sx={{ fontWeight: 700, p: 2, pb: 1 }}>
              รายชื่อผู้ใช้งานปัจจุบัน ({assets.length} เครื่อง)
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.06) }}>
                  {['ทรัพย์สิน', 'ผู้ครอบครอง', 'แผนก', 'สถานะ'].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 600, fontSize: '0.78rem' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {assets.length === 0 ? (
                  <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>ยังไม่มีทรัพย์สินที่ผูกกับสเปคนี้</TableCell></TableRow>
                ) : assets.map(a => (
                  <TableRow key={a.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/assets/${a.id}`)}>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600, fontSize: 13 }}>{a.assetCode || a.assetName}</Typography>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{[a.brand, a.model].filter(Boolean).join(' ')}</Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize: 13 }}>{a.ownerName || '—'}</TableCell>
                    <TableCell sx={{ fontSize: 13 }}>{a.departmentId || '—'}</TableCell>
                    <TableCell sx={{ fontSize: 13 }}>{a.status || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </Grid>

        {/* เอกสารอ้างอิง */}
        <Grid item xs={12} md={4}>
          <Card variant="outlined" sx={{ borderRadius: 3, p: 2, position: { md: 'sticky' }, top: { md: '80px' } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <AttachFileIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              <Typography fontWeight={700}>เอกสารอ้างอิง (PO / ใบเสนอราคา)</Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.85 }}>
              {(item.documents || []).map((doc: any) => (
                <Box key={doc.id} sx={{
                  display: 'flex', alignItems: 'center', gap: 1, p: 1, borderRadius: '10px',
                  border: `1px solid ${theme.palette.divider}`,
                }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography noWrap title={doc.fileName} sx={{ fontSize: 12.5, fontWeight: 600 }}>{doc.fileName}</Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
                      {fmtSize(doc.fileSize)} · {new Date(doc.createdAt).toLocaleDateString('th-TH')}
                    </Typography>
                  </Box>
                  <Tooltip title="ดาวน์โหลด">
                    <IconButton size="small" onClick={() => catalogAPI.downloadDocument(item.id, doc.id)}>
                      <DownloadIcon sx={{ fontSize: 16 }} color="primary" />
                    </IconButton>
                  </Tooltip>
                  {canEdit && (
                    <Tooltip title="ลบ">
                      <IconButton size="small" onClick={() => handleDeleteDoc(doc.id)}>
                        <DeleteOutlineIcon sx={{ fontSize: 16 }} color="error" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              ))}

              {canEdit && (
                <Box component="label" sx={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
                  p: 1.5, borderRadius: '10px', cursor: uploading ? 'default' : 'pointer',
                  border: `1px dashed ${theme.palette.divider}`, color: 'text.secondary', fontSize: 13,
                  '&:hover': uploading ? {} : { borderColor: 'primary.main', color: 'primary.main' },
                }}>
                  {uploading ? <CircularProgress size={14} /> : null}
                  {uploading ? 'กำลังอัปโหลด...' : 'คลิกเพื่อแนบเอกสาร'}
                  <input type="file" hidden disabled={uploading}
                    accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx"
                    onChange={handleUpload} />
                </Box>
              )}
              {(item.documents || []).length === 0 && !canEdit && (
                <Typography sx={{ fontSize: 12.5, color: 'text.disabled', textAlign: 'center', py: 1 }}>ยังไม่มีเอกสารแนบ</Typography>
              )}
            </Box>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={700}>แก้ไขสเปค</DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          {form && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField fullWidth label="ชื่อสเปค *" value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="ตำแหน่งงาน" value={form.jobRole} onChange={e => setForm((f: any) => ({ ...f, jobRole: e.target.value }))} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="ราคาที่แนะนำ (บาท)" type="number" value={form.recommendedPrice} onChange={e => setForm((f: any) => ({ ...f, recommendedPrice: e.target.value }))} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="ยี่ห้อ" value={form.brand} onChange={e => setForm((f: any) => ({ ...f, brand: e.target.value }))} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="รุ่น" value={form.model} onChange={e => setForm((f: any) => ({ ...f, model: e.target.value }))} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="ผู้จำหน่าย (Vendor)" value={form.vendorName} onChange={e => setForm((f: any) => ({ ...f, vendorName: e.target.value }))} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth multiline rows={4} label="รายละเอียดสเปค" placeholder={'พิมพ์ทีละบรรทัด เช่น\nCPU: Intel Core Ultra 5\nRAM: 16GB'} value={form.specs} onChange={e => setForm((f: any) => ({ ...f, specs: e.target.value }))} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth select label="สถานะ" value={form.isActive ? '1' : '0'} onChange={e => setForm((f: any) => ({ ...f, isActive: e.target.value === '1' }))}>
                  <MenuItem value="1">ใช้งานอยู่</MenuItem>
                  <MenuItem value="0">ปิดใช้งาน</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          )}
          {error && <Typography sx={{ color: 'error.main', fontSize: 13, mt: 1.5 }}>{error}</Typography>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditOpen(false)} disabled={saving}>ยกเลิก</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !form?.name?.trim()}>
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
