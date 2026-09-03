import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Card, CardActionArea, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, MenuItem, TextField, Typography, useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { catalogAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const fmtBaht = (v: number) => `฿${v.toLocaleString('th-TH', { maximumFractionDigits: 0 })}`;

const emptyForm = {
  name: '', jobRole: '', brand: '', model: '', specs: '', recommendedPrice: '', vendorName: '',
};

/**
 * ศูนย์กลางสเปคอุปกรณ์ไอทีมาตรฐานต่อตำแหน่งงาน — USER ดูอย่างเดียว, IT_ADMIN/
 * SUPERADMIN เพิ่ม/แก้/ลบได้ (บังคับจริงที่ backend, ปุ่มแก้ที่นี่แค่ซ่อนไว้)
 */
export default function CatalogListPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = user?.role === 'IT_ADMIN' || user?.role === 'SUPERADMIN';

  const [items, setItems] = useState<any[]>([]);
  const [jobRoles, setJobRoles] = useState<string[]>([]);
  const [jobRoleFilter, setJobRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await catalogAPI.list({ jobRole: jobRoleFilter || undefined, q: search || undefined });
      setItems(res.data || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    catalogAPI.jobRoles().then(res => setJobRoles(res.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobRoleFilter, search]);

  const openNew = () => { setForm(emptyForm); setError(''); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('ต้องระบุชื่อสเปค'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await catalogAPI.create({
        ...form,
        recommendedPrice: form.recommendedPrice ? parseFloat(form.recommendedPrice) : undefined,
      });
      setDialogOpen(false);
      navigate(`/catalog/${res.data.id}`);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>แคตตาล็อกอุปกรณ์มาตรฐาน</Typography>
          <Typography variant="body2" color="text.secondary">
            สเปคอุปกรณ์ไอทีที่แนะนำต่อตำแหน่งงาน ใช้อ้างอิงก่อนขอจัดซื้อของใหม่
          </Typography>
        </Box>
        {canEdit && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>เพิ่มสเปคใหม่</Button>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          size="small" placeholder="ค้นหาชื่อสเปค / ยี่ห้อ / รุ่น..."
          value={search} onChange={e => setSearch(e.target.value)}
          sx={{ minWidth: 260 }}
        />
        <TextField
          size="small" select label="ตำแหน่งงาน" value={jobRoleFilter}
          onChange={e => setJobRoleFilter(e.target.value)}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">ทุกตำแหน่งงาน</MenuItem>
          {jobRoles.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
        </TextField>
      </Box>

      {loading ? (
        <Typography sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>กำลังโหลด...</Typography>
      ) : items.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
          <Typography>ยังไม่มีสเปคในแคตตาล็อก</Typography>
          {canEdit && <Typography sx={{ fontSize: 13, mt: 0.5 }}>กดปุ่ม "เพิ่มสเปคใหม่" ด้านบนเพื่อเริ่มต้น</Typography>}
        </Box>
      ) : (
        <Grid container spacing={2}>
          {items.map(item => (
            <Grid item xs={12} sm={6} md={4} key={item.id}>
              <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
                <CardActionArea onClick={() => navigate(`/catalog/${item.id}`)} sx={{ p: 2, height: '100%' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography fontWeight={700} noWrap>{item.name}</Typography>
                      {item.jobRole && (
                        <Chip size="small" label={item.jobRole} sx={{ mt: 0.5, fontSize: 11 }} />
                      )}
                    </Box>
                    {!item.isActive && <Chip size="small" label="ปิดใช้งาน" color="default" variant="outlined" sx={{ fontSize: 10 }} />}
                  </Box>

                  <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 1 }}>
                    {[item.brand, item.model].filter(Boolean).join(' ') || 'ไม่ระบุยี่ห้อ/รุ่น'}
                  </Typography>

                  {item.recommendedPrice != null && (
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: theme.palette.primary.main, mt: 1 }}>
                      {fmtBaht(Number(item.recommendedPrice))}
                    </Typography>
                  )}

                  <Box sx={{ display: 'flex', gap: 1.5, mt: 1.5, alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                      <PeopleAltIcon sx={{ fontSize: 15 }} />
                      <Typography sx={{ fontSize: 12 }}>
                        ใช้งานอยู่ {item._count?.assets ?? 0} เครื่อง
                      </Typography>
                    </Box>
                    {item._count?.documents > 0 && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                        <AttachFileIcon sx={{ fontSize: 14 }} />
                        <Typography sx={{ fontSize: 12 }}>{item._count.documents}</Typography>
                      </Box>
                    )}
                  </Box>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={700}>เพิ่มสเปคใหม่</DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField fullWidth label="ชื่อสเปค *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="ตำแหน่งงาน" placeholder="เช่น พนักงานบัญชี" value={form.jobRole} onChange={e => setForm(f => ({ ...f, jobRole: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="ราคาที่แนะนำ (บาท)" type="number" value={form.recommendedPrice} onChange={e => setForm(f => ({ ...f, recommendedPrice: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="ยี่ห้อ" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="รุ่น" value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="ผู้จำหน่าย (Vendor)" value={form.vendorName} onChange={e => setForm(f => ({ ...f, vendorName: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline rows={3} label="รายละเอียดสเปค" value={form.specs} onChange={e => setForm(f => ({ ...f, specs: e.target.value }))} />
            </Grid>
          </Grid>
          {error && <Typography sx={{ color: 'error.main', fontSize: 13, mt: 1.5 }}>{error}</Typography>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>ยกเลิก</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !form.name.trim()}>
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
