import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Button, Card, CardActionArea, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, Grid, MenuItem, Paper, TextField, Typography, alpha, useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import { catalogAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const fmtBaht = (v: number) => `฿${v.toLocaleString('th-TH', { maximumFractionDigits: 0 })}`;

const emptyForm = {
  name: '', jobRole: '', brand: '', model: '', specs: '', recommendedPrice: '', vendorName: '',
};

type SortKey = 'default' | 'priceAsc' | 'priceDesc' | 'nameAsc' | 'usageDesc';

/**
 * ศูนย์กลางสเปคอุปกรณ์ไอทีมาตรฐานต่อตำแหน่งงาน — USER ดูอย่างเดียว, IT_ADMIN/
 * SUPERADMIN เพิ่ม/แก้/ลบได้ (บังคับจริงที่ backend, ปุ่มแก้ที่นี่แค่ซ่อนไว้)
 *
 * หน้าตาอิงหน้าผลการค้นหาสินค้าของ advice.co.th ตามที่ผู้ใช้ขอ — แถบกรองซ้าย
 * + หัวข้อผลลัพธ์พร้อมตัวเรียง + การ์ดกริดขวา ต่างจากของจริงตรงที่ไม่มีราคา
 * ตัดราคา/ตะกร้า เพราะที่นี่เป็นแคตตาล็อกอ้างอิงภายใน ไม่ใช่ร้านขายของ
 */
export default function CatalogListPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = user?.role === 'IT_ADMIN' || user?.role === 'SUPERADMIN';
  const [searchParams, setSearchParams] = useSearchParams();

  const [items, setItems] = useState<any[]>([]);
  const [jobRoles, setJobRoles] = useState<string[]>([]);
  const [jobRoleFilter, setJobRoleFilter] = useState(searchParams.get('jobRole') || '');
  const [activeOnly, setActiveOnly] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('default');
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

  // แท็บตำแหน่งงานสะท้อนใน URL ได้ (?jobRole=...) เพื่อให้ลิงก์จากหน้ารายละเอียด
  // "ดูสเปคตำแหน่งงานเดียวกัน" กดแล้วกรองมาให้เลย
  const pickJobRole = (role: string) => {
    setJobRoleFilter(role);
    if (role) setSearchParams({ jobRole: role }); else setSearchParams({});
  };

  const shown = useMemo(() => {
    let rows = activeOnly ? items.filter(i => i.isActive) : items;
    rows = [...rows];
    switch (sort) {
      case 'priceAsc': rows.sort((a, b) => (Number(a.recommendedPrice) || 0) - (Number(b.recommendedPrice) || 0)); break;
      case 'priceDesc': rows.sort((a, b) => (Number(b.recommendedPrice) || 0) - (Number(a.recommendedPrice) || 0)); break;
      case 'nameAsc': rows.sort((a, b) => String(a.name).localeCompare(String(b.name), 'th')); break;
      case 'usageDesc': rows.sort((a, b) => (b._count?.assets || 0) - (a._count?.assets || 0)); break;
      default: break;
    }
    return rows;
  }, [items, activeOnly, sort]);

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
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5, flexWrap: 'wrap', gap: 2 }}>
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

      <Box sx={{ display: 'flex', gap: 2.5, alignItems: 'flex-start', flexDirection: { xs: 'column', md: 'row' } }}>
        {/* ── แถบกรองซ้าย ── */}
        <Paper variant="outlined" sx={{ width: { xs: '100%', md: 240 }, flex: 'none', p: 2, borderRadius: 3 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1 }}>ตำแหน่งงาน</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <FormControlLabel
              sx={{ ml: 0, '& .MuiFormControlLabel-label': { fontSize: 13 } }}
              control={<Checkbox size="small" checked={!jobRoleFilter} onChange={() => pickJobRole('')} />}
              label="ทุกตำแหน่งงาน"
            />
            {jobRoles.map(r => (
              <FormControlLabel
                key={r}
                sx={{ ml: 0, '& .MuiFormControlLabel-label': { fontSize: 13 } }}
                control={<Checkbox size="small" checked={jobRoleFilter === r} onChange={() => pickJobRole(jobRoleFilter === r ? '' : r)} />}
                label={r}
              />
            ))}
          </Box>

          <Box sx={{ borderTop: '1px solid', borderColor: 'divider', mt: 1.5, pt: 1.5 }}>
            <FormControlLabel
              sx={{ ml: 0, '& .MuiFormControlLabel-label': { fontSize: 13 } }}
              control={<Checkbox size="small" checked={activeOnly} onChange={e => setActiveOnly(e.target.checked)} />}
              label="เฉพาะที่ใช้งานอยู่"
            />
          </Box>
        </Paper>

        {/* ── ผลลัพธ์ ── */}
        <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
          <Paper variant="outlined" sx={{ p: '10px 16px', mb: 2, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <MenuBookRoundedIcon color="primary" />
              <Typography fontWeight={700}>
                {jobRoleFilter || 'สเปคทั้งหมด'} <Typography component="span" sx={{ color: 'text.secondary', fontWeight: 400, fontSize: 14 }}>({shown.length} รายการ)</Typography>
              </Typography>
            </Box>
            <Box sx={{ flex: 1 }} />
            <TextField
              size="small" placeholder="ค้นหาชื่อสเปค / ยี่ห้อ / รุ่น..."
              value={search} onChange={e => setSearch(e.target.value)}
              sx={{ minWidth: 220 }}
            />
            <TextField
              size="small" select label="เรียงตาม" value={sort}
              onChange={e => setSort(e.target.value as SortKey)}
              sx={{ minWidth: 170 }}
            >
              <MenuItem value="default">แนะนำ</MenuItem>
              <MenuItem value="priceAsc">ราคาต่ำสุด</MenuItem>
              <MenuItem value="priceDesc">ราคาสูงสุด</MenuItem>
              <MenuItem value="nameAsc">ชื่อสินค้า A-Z</MenuItem>
              <MenuItem value="usageDesc">ใช้งานมากที่สุด</MenuItem>
            </TextField>
          </Paper>

          {loading ? (
            <Typography sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>กำลังโหลด...</Typography>
          ) : shown.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
              <Typography>ไม่พบสเปคที่ตรงกับเงื่อนไข</Typography>
              {canEdit && items.length === 0 && <Typography sx={{ fontSize: 13, mt: 0.5 }}>กดปุ่ม "เพิ่มสเปคใหม่" ด้านบนเพื่อเริ่มต้น</Typography>}
            </Box>
          ) : (
            <Grid container spacing={2}>
              {shown.map(item => (
                <Grid item xs={12} sm={6} lg={4} key={item.id}>
                  <Card variant="outlined" sx={{
                    borderRadius: 3, height: '100%', position: 'relative', overflow: 'hidden',
                    transition: 'box-shadow .15s, transform .15s',
                    '&:hover': { boxShadow: theme.palette.mode === 'dark' ? '0 6px 20px rgba(0,0,0,.45)' : '0 6px 20px rgba(16,24,40,.1)', transform: 'translateY(-2px)' },
                  }}>
                    {!item.isActive && (
                      <Chip label="ปิดใช้งาน" size="small" sx={{
                        position: 'absolute', top: 10, left: 10, zIndex: 1, fontSize: 10, fontWeight: 700,
                        bgcolor: alpha(theme.palette.text.disabled, 0.85), color: '#fff',
                      }} />
                    )}
                    <CardActionArea onClick={() => navigate(`/catalog/${item.id}`)} sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                      <Box sx={{
                        height: 150, flex: 'none', bgcolor: alpha(theme.palette.text.primary, 0.03),
                        display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2,
                        borderBottom: '1px solid', borderColor: 'divider',
                      }}>
                        {item.imageUrl ? (
                          <Box component="img" src={item.imageUrl} alt={item.name} sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                        ) : (
                          <Inventory2RoundedIcon sx={{ fontSize: 52, color: alpha(theme.palette.text.primary, 0.16) }} />
                        )}
                      </Box>

                      <Box sx={{ p: 1.75, flex: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
                        <Typography sx={{ fontSize: 11, fontWeight: 800, color: theme.palette.primary.main, letterSpacing: '.03em' }}>
                          {(item.brand || 'GENERIC').toUpperCase()}
                        </Typography>
                        <Typography sx={{
                          fontWeight: 700, fontSize: 14.5, lineHeight: 1.35, mt: '2px',
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                          minHeight: '2.7em',
                        }}>
                          {item.name}
                        </Typography>
                        <Typography noWrap sx={{ fontSize: 12, color: 'text.secondary', mt: '2px' }}>
                          {item.model || '—'}
                        </Typography>

                        {item.jobRole && (
                          <Chip label={item.jobRole} size="small" sx={{ mt: 1, alignSelf: 'flex-start', fontSize: 10.5, height: 20 }} />
                        )}

                        <Box sx={{ flex: 1 }} />

                        {item.recommendedPrice != null && (
                          <Typography sx={{ fontSize: 19, fontWeight: 800, color: theme.palette.primary.main, mt: 1.25 }}>
                            {fmtBaht(Number(item.recommendedPrice))}
                          </Typography>
                        )}

                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1, pt: 1, borderTop: '1px dashed', borderColor: 'divider' }}>
                          <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                              <PeopleAltIcon sx={{ fontSize: 14 }} />
                              <Typography sx={{ fontSize: 11.5 }}>{item._count?.assets ?? 0} เครื่อง</Typography>
                            </Box>
                            {item._count?.documents > 0 && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                                <AttachFileIcon sx={{ fontSize: 13 }} />
                                <Typography sx={{ fontSize: 11.5 }}>{item._count.documents}</Typography>
                              </Box>
                            )}
                          </Box>
                          <Typography sx={{ fontSize: 12, fontWeight: 700, color: theme.palette.primary.main }}>
                            ดูรายละเอียด ›
                          </Typography>
                        </Box>
                      </Box>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </Box>

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
              <TextField fullWidth multiline rows={3} label="รายละเอียดสเปค" placeholder={'พิมพ์ทีละบรรทัด เช่น\nCPU: Intel Core Ultra 5\nRAM: 16GB'} value={form.specs} onChange={e => setForm(f => ({ ...f, specs: e.target.value }))} />
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
