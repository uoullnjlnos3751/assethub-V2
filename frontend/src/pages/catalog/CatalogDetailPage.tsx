import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Button, Card, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, IconButton, MenuItem, Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip, Typography,
  alpha, useTheme,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { catalogAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const fmtBaht = (v: number) => `฿${v.toLocaleString('th-TH', { maximumFractionDigits: 0 })}`;
const fmtSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export default function CatalogDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const { user } = useAuth();
  const canEdit = user?.role === 'IT_ADMIN' || user?.role === 'SUPERADMIN';
  const canDelete = user?.role === 'SUPERADMIN';

  const [item, setItem] = useState<any>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

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

  const handleDelete = async () => {
    if (!item) return;
    if (!window.confirm(`ลบสเปค "${item.name}" ออกจากแคตตาล็อก? ทรัพย์สินที่เคยผูกไว้ (${item._count?.assets ?? 0} เครื่อง) จะไม่ถูกลบ แต่จะหลุดการผูก`)) return;
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
    if (!item || !window.confirm('ลบเอกสารนี้?')) return;
    await catalogAPI.deleteDocument(item.id, docId);
    await load();
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  }
  if (!item) {
    return <Typography sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>ไม่พบรายการในแคตตาล็อก</Typography>;
  }

  return (
    <Box sx={{ pb: 5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: '0.75rem', color: theme.palette.text.disabled }}>
            แคตตาล็อกอุปกรณ์มาตรฐาน / {item.name}
          </Typography>
          <Typography sx={{ fontSize: '1.4rem', fontWeight: 800, lineHeight: 1.25 }}>{item.name}</Typography>
        </Box>
        <Button variant="outlined" color="inherit" startIcon={<ArrowBackIcon sx={{ fontSize: 16 }} />} onClick={() => navigate('/catalog')} size="small">
          กลับ
        </Button>
        {canEdit && (
          <Button variant="outlined" startIcon={<EditIcon sx={{ fontSize: 16 }} />} onClick={openEdit} size="small">
            แก้ไข
          </Button>
        )}
        {canDelete && (
          <Button variant="outlined" color="error" startIcon={<DeleteIcon sx={{ fontSize: 16 }} />} onClick={handleDelete} size="small">
            ลบ
          </Button>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexDirection: { xs: 'column', lg: 'row' } }}>
        <Box sx={{ flex: 1, minWidth: 0, width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* สเปคหลัก */}
          <Card variant="outlined" sx={{ borderRadius: 3, p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              {item.jobRole && <Chip label={item.jobRole} size="small" />}
              {!item.isActive && <Chip label="ปิดใช้งาน" size="small" variant="outlined" />}
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>ยี่ห้อ</Typography>
                <Typography fontWeight={700}>{item.brand || '—'}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>รุ่น</Typography>
                <Typography fontWeight={700}>{item.model || '—'}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>ราคาที่แนะนำ</Typography>
                <Typography fontWeight={700} color="primary.main">
                  {item.recommendedPrice != null ? fmtBaht(Number(item.recommendedPrice)) : '—'}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>ผู้จำหน่าย (Vendor)</Typography>
                <Typography fontWeight={700}>{item.vendorName || '—'}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>รายละเอียดสเปค</Typography>
                <Typography sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}>{item.specs || '—'}</Typography>
              </Grid>
            </Grid>
          </Card>

          {/* ผู้ใช้งานปัจจุบัน */}
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
        </Box>

        {/* เอกสารอ้างอิง */}
        <Box sx={{ width: { xs: '100%', lg: 340 }, flex: 'none' }}>
          <Card variant="outlined" sx={{ borderRadius: 3, p: 2 }}>
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
        </Box>
      </Box>

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
                <TextField fullWidth multiline rows={3} label="รายละเอียดสเปค" value={form.specs} onChange={e => setForm((f: any) => ({ ...f, specs: e.target.value }))} />
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
