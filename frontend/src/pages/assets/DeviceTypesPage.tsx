import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, TextField, Switch, Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, alpha, useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { assetAPI } from '../../services/api';

const emptyForm = { name: '', description: '', isActive: true };

/* ─────────────────────────────────────────────────────────────────
   Main Page
───────────────────────────────────────────────────────────────── */
export default function DeviceTypesPage() {
  const theme = useTheme();
  const [types, setTypes] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [editingType, setEditingType] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');

  /* ── Data ── */
  const fetchTypes = async () => {
    setLoading(true);
    try {
      const res = await assetAPI.deviceTypes();
      const data = res.data || [];
      setTypes(data);
      setFiltered(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTypes(); }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(q
      ? types.filter(t =>
          (t.name || '').toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q)
        )
      : types
    );
  }, [search, types]);

  /* ── Toast ── */
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  /* ── Dialog ── */
  const openCreate = () => {
    setEditingType(null);
    setForm(emptyForm);
    setError('');
    setDialogOpen(true);
  };

  const openEdit = (type: any) => {
    setEditingType(type);
    setForm({ name: type.name || '', description: type.description || '', isActive: type.isActive ?? true });
    setError('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const name = form.name.trim();
    if (!name) { setError('กรุณาระบุประเภทอุปกรณ์'); return; }
    setSaving(true); setError('');
    try {
      const data = { name, description: form.description.trim() || null, isActive: form.isActive };
      if (editingType) {
        await assetAPI.updateDeviceType(editingType.id, data);
        showToast(`✅ แก้ไข "${name}" สำเร็จ`);
      } else {
        await assetAPI.createDeviceType(data);
        showToast(`✅ เพิ่ม "${name}" สำเร็จ`);
      }
      setDialogOpen(false);
      fetchTypes();
    } catch (err: any) {
      setError(err.response?.data?.error || 'ไม่สามารถบันทึกประเภทอุปกรณ์ได้');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (type: any) => {
    try {
      await assetAPI.deleteDeviceType(type.id);
      setDeleteConfirm(null);
      fetchTypes();
      showToast(`🗑 ลบ "${type.name}" สำเร็จ`);
    } catch (err: any) {
      setDeleteConfirm(null);
      showToast(`❌ ${err.response?.data?.error || 'ไม่สามารถลบประเภทได้'}`);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const res = await assetAPI.importDeviceTypesFromAssets();
      await fetchTypes();
      showToast(`✅ นำเข้าสำเร็จ ${res.data?.imported ?? ''} รายการ`);
    } catch (err: any) {
      showToast(`❌ ${err.response?.data?.error || 'นำเข้าไม่สำเร็จ'}`);
    } finally {
      setImporting(false);
    }
  };

  const activeCount   = types.filter(t => t.isActive !== false).length;
  const inactiveCount = types.length - activeCount;
  const accentColor   = theme.palette.primary.main;

  const stats = [
    { icon: '📦', val: types.length,   lbl: 'ทั้งหมด',    color: accentColor },
    { icon: '✅', val: activeCount,     lbl: 'ใช้งาน',    color: theme.palette.success.main },
    ...(inactiveCount > 0 ? [{ icon: '🔒', val: inactiveCount, lbl: 'ปิดใช้งาน', color: theme.palette.text.disabled }] : []),
  ];

  return (
    <Box>
      {/* ── Page Header ── */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, mb: 2.25 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 40, height: 40, borderRadius: '10px',
            bgcolor: alpha(accentColor, 0.08), border: `1.5px solid ${alpha(accentColor, 0.25)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
          }}>🖥️</Box>
          <Box>
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: theme.palette.text.primary }}>🖥️ ประเภทอุปกรณ์ (Device Types)</Typography>
            <Typography sx={{ fontSize: 11, color: theme.palette.text.disabled, mt: 0.25 }}>
              จัดการรายการประเภทสำหรับใช้ในฟอร์มทรัพย์สินและตัวกรองทะเบียน
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button variant="outlined" size="small" onClick={handleImport} disabled={importing}>
            {importing ? '⏳' : '🔄'} นำเข้าจากทรัพย์สิน
          </Button>
          <Button variant="contained" size="small" onClick={openCreate}>＋ เพิ่มประเภท</Button>
        </Box>
      </Box>

      {/* ── Stats ── */}
      <Box sx={{ display: 'flex', gap: 1.25, mb: 2, flexWrap: 'wrap' }}>
        {stats.map(s => (
          <Box key={s.lbl} sx={{
            display: 'flex', alignItems: 'center', gap: 1.25,
            px: 2, py: 1.25, bgcolor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`,
            borderRadius: '10px', minWidth: 100,
          }}>
            <Typography sx={{ fontSize: 22 }}>{s.icon}</Typography>
            <Box>
              <Typography sx={{ fontSize: 20, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.val}</Typography>
              <Typography sx={{ fontSize: 10, color: theme.palette.text.disabled }}>{s.lbl}</Typography>
            </Box>
          </Box>
        ))}
      </Box>

      {/* ── Toolbar / Search ── */}
      <Box sx={{ display: 'flex', gap: 1, mb: 1.75, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          size="small"
          sx={{ flex: 1, minWidth: 180 }}
          placeholder="ค้นหาประเภทอุปกรณ์..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <Typography sx={{ fontSize: 11, color: theme.palette.text.disabled }}>
          แสดง {filtered.length}/{types.length}
        </Typography>
      </Box>

      {/* ── Table ── */}
      <TableContainer sx={{ bgcolor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: '12px' }}>
        {loading ? (
          <Box sx={{ py: 5, textAlign: 'center', color: accentColor, fontSize: 13 }}>⏳ กำลังโหลด...</Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ py: 5, textAlign: 'center', color: theme.palette.text.disabled, fontSize: 13 }}>
            {search ? `ไม่พบ "${search}"` : 'ยังไม่มีประเภทอุปกรณ์'}<br />
            <Box component="span" sx={{ fontSize: 11 }}>กดปุ่ม "+ เพิ่มประเภท" เพื่อเริ่มต้น</Box>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                {['#', 'ประเภทอุปกรณ์', 'รายละเอียด', 'ทรัพย์สิน', 'สถานะ', 'จัดการ'].map((h, i) => (
                  <TableCell key={h} align={i === 5 ? 'center' : 'left'} sx={{ width: i === 0 ? 40 : i === 5 ? 120 : undefined, whiteSpace: 'nowrap' }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((t, idx) => (
                <TableRow key={t.id} hover>
                  <TableCell sx={{ color: theme.palette.text.disabled, fontSize: 11 }}>{idx + 1}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{
                        width: 28, height: 28, borderRadius: '7px',
                        bgcolor: alpha(accentColor, 0.08), border: `1px solid ${alpha(accentColor, 0.15)}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, flexShrink: 0,
                      }}>🖥️</Box>
                      <Typography sx={{ fontWeight: 600, color: theme.palette.text.primary, fontSize: '0.8rem' }}>{t.name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ color: theme.palette.text.secondary, fontSize: 11, maxWidth: 280 }}>
                    <Box component="span" sx={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.description || <Box component="span" sx={{ color: theme.palette.text.disabled }}>—</Box>}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {t.assetCount != null ? (
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontSize: 11, fontWeight: 600, color: theme.palette.text.secondary }}>
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: accentColor, display: 'inline-block' }} />
                        {t.assetCount} รายการ
                      </Box>
                    ) : <Box component="span" sx={{ color: theme.palette.text.disabled }}>—</Box>}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={t.isActive !== false ? '● ใช้งาน' : '○ ปิด'}
                      sx={t.isActive !== false ? {
                        bgcolor: alpha(theme.palette.success.main, 0.1), color: theme.palette.success.dark, border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
                      } : {
                        bgcolor: theme.palette.background.default, color: theme.palette.text.disabled, border: `1px solid ${theme.palette.divider}`,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      <Button
                        size="small" onClick={() => openEdit(t)}
                        sx={{
                          minWidth: 0, px: 1, fontSize: 10, fontWeight: 600,
                          bgcolor: alpha(theme.palette.info.main, 0.08), color: theme.palette.info.dark,
                          border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`,
                          '&:hover': { bgcolor: alpha(theme.palette.info.main, 0.15) },
                        }}
                      >✏️ แก้ไข</Button>
                      <Button
                        size="small" onClick={() => setDeleteConfirm(t)}
                        sx={{
                          minWidth: 0, px: 1, fontSize: 10, fontWeight: 600,
                          bgcolor: alpha(theme.palette.error.main, 0.06), color: theme.palette.error.main,
                          border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
                          '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.12) },
                        }}
                      >🗑</Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      {/* ── Row count ── */}
      {types.length > 0 && (
        <Typography sx={{ fontSize: 10, color: theme.palette.text.disabled, mt: 1, textAlign: 'right' }}>
          {filtered.length} รายการ {search && `(กรอง "${search}")`}
        </Typography>
      )}

      {/* ── Create / Edit Modal ── */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
            {editingType ? '✏️ แก้ไขประเภทอุปกรณ์' : '➕ เพิ่มประเภทอุปกรณ์'}
          </Typography>
          <IconButton size="small" onClick={() => setDialogOpen(false)}><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 0.5 }}>
            {error && (
              <Box sx={{ bgcolor: alpha(theme.palette.error.main, 0.06), border: `1px solid ${alpha(theme.palette.error.main, 0.25)}`, borderRadius: '8px', px: 1.5, py: 1, fontSize: 11, color: theme.palette.error.main }}>
                ⚠️ {error}
              </Box>
            )}
            <TextField
              autoFocus
              fullWidth size="small"
              label="ประเภทอุปกรณ์ *"
              placeholder="เช่น Computer, Monitor, Printer..."
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
            <TextField
              fullWidth multiline minRows={3} size="small"
              label="รายละเอียด"
              placeholder="รายละเอียดเพิ่มเติม (ไม่บังคับ)"
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.5 }}>
              <Typography sx={{ fontSize: 12, color: theme.palette.text.primary, fontWeight: 500 }}>เปิดใช้งาน</Typography>
              <Switch checked={form.isActive} onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))} />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>ยกเลิก</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ minWidth: 80 }}>
            {saving ? '⏳ กำลังบันทึก...' : '💾 บันทึก'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Confirm Modal ── */}
      <Dialog open={Boolean(deleteConfirm)} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700 }}>🗑 ยืนยันการลบ</Typography>
          <IconButton size="small" onClick={() => setDeleteConfirm(null)}><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, color: theme.palette.text.primary, mb: 0.75 }}>
            ต้องการลบประเภท <strong>"{deleteConfirm?.name}"</strong> ใช่หรือไม่?
          </Typography>
          <Typography sx={{ fontSize: 11, color: theme.palette.text.disabled }}>
            การลบไม่สามารถย้อนกลับได้ และอาจกระทบข้อมูลทรัพย์สินที่เชื่อมอยู่
            {deleteConfirm?.assetCount > 0 && (
              <Box component="span" sx={{ color: theme.palette.error.main, fontWeight: 600 }}>
                {' '}({deleteConfirm.assetCount} รายการกำลังใช้ประเภทนี้)
              </Box>
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>ยกเลิก</Button>
          <Button variant="contained" color="error" onClick={() => handleDelete(deleteConfirm)}>🗑 ลบเลย</Button>
        </DialogActions>
      </Dialog>

      {/* ── Toast ── */}
      {toast && (
        <Box sx={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          bgcolor: theme.palette.text.primary, color: theme.palette.background.paper, px: 2.5, py: 1.25, borderRadius: '8px',
          fontSize: 12, zIndex: 9999, boxShadow: '0 8px 24px rgba(0,0,0,.2)', pointerEvents: 'none',
        }}>
          {toast}
        </Box>
      )}
    </Box>
  );
}
