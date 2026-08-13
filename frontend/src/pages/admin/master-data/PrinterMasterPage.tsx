import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, TextField, Select, MenuItem, Switch, Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, alpha, useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useToast } from '../../../contexts/ToastContext';
import { assetAPI } from '../../../services/api';

interface Printer {
  id: number;
  floorArea: string;
  brandModel: string;
  serialNo?: string | null;
  ipAddress?: string | null;
  driver?: string | null;
  pinNote?: string | null;
  status: string;
  isActive: boolean;
}

const emptyForm = { floorArea: '', brandModel: '', serialNo: '', ipAddress: '', driver: '', pinNote: '', status: 'active', isActive: true };
const accent = '#0891b2';

export default function PrinterMasterPage() {
  const theme = useTheme();
  const toast = useToast();
  const [items, setItems] = useState<Printer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Printer | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<Printer | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await assetAPI.printers();
      setItems(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter(i => {
    const q = search.toLowerCase();
    return !q || i.floorArea.toLowerCase().includes(q) || i.brandModel.toLowerCase().includes(q) || (i.ipAddress || '').includes(q);
  });

  const openCreate = () => { setEditingItem(null); setForm(emptyForm); setError(''); setDialogOpen(true); };
  const openEdit = (item: Printer) => {
    setEditingItem(item);
    setForm({
      floorArea: item.floorArea, brandModel: item.brandModel,
      serialNo: item.serialNo || '', ipAddress: item.ipAddress || '',
      driver: item.driver || '', pinNote: item.pinNote || '',
      status: item.status, isActive: item.isActive,
    });
    setError(''); setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.floorArea.trim()) { setError('กรุณาระบุชั้น/พื้นที่'); return; }
    if (!form.brandModel.trim()) { setError('กรุณาระบุยี่ห้อ/รุ่น'); return; }
    setSaving(true); setError('');
    try {
      const data = {
        floorArea: form.floorArea.trim(), brandModel: form.brandModel.trim(),
        serialNo: form.serialNo.trim() || null, ipAddress: form.ipAddress.trim() || null,
        driver: form.driver.trim() || null, pinNote: form.pinNote.trim() || null,
        status: form.status, isActive: form.isActive,
      };
      if (editingItem) {
        await assetAPI.updatePrinter(editingItem.id, data);
        toast.success('แก้ไขเครื่องพิมพ์สำเร็จ');
      } else {
        await assetAPI.createPrinter(data);
        toast.success('เพิ่มเครื่องพิมพ์สำเร็จ');
      }
      setDialogOpen(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'ไม่สามารถบันทึกได้');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: Printer) => {
    try {
      await assetAPI.deletePrinter(item.id);
      setDeleteConfirm(null);
      load();
      toast.success('ลบเครื่องพิมพ์สำเร็จ');
    } catch (err: any) {
      setDeleteConfirm(null);
      toast.error(`❌ ${err.response?.data?.error || 'ไม่สามารถลบได้'}`);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, mb: 2.25 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: alpha(accent, 0.08), border: `1.5px solid ${alpha(accent, 0.3)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🖨️</Box>
          <Box>
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: theme.palette.text.primary, lineHeight: 1.2 }}>เครื่องพิมพ์ตามพื้นที่</Typography>
            <Typography sx={{ fontSize: 11, color: theme.palette.text.disabled, mt: 0.25 }}>ใช้ในขั้นตอน Setup เครื่องใหม่ (IT-WI-001 ข้อ 6)</Typography>
          </Box>
        </Box>
        <Button variant="contained" size="small" onClick={openCreate} sx={{ bgcolor: accent, '&:hover': { bgcolor: accent, filter: 'brightness(1.08)' } }}>
          ＋ เพิ่มเครื่องพิมพ์
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, mb: 1.75, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField size="small" sx={{ flex: 1, minWidth: 180 }} placeholder="ค้นหาชั้น/พื้นที่/ยี่ห้อ/IP..." value={search} onChange={e => setSearch(e.target.value)} />
        <Typography sx={{ fontSize: 11, color: theme.palette.text.disabled }}>แสดง {filtered.length}/{items.length}</Typography>
      </Box>

      <TableContainer sx={{ bgcolor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: '12px' }}>
        {loading ? (
          <Box sx={{ py: 5, textAlign: 'center', color: accent, fontSize: 13 }}>⏳ กำลังโหลด...</Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ py: 5, textAlign: 'center', color: theme.palette.text.disabled, fontSize: 13 }}>
            {search ? `ไม่พบ "${search}"` : 'ยังไม่มีเครื่องพิมพ์'}
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 40 }}>#</TableCell>
                <TableCell>ชั้น/พื้นที่</TableCell>
                <TableCell>ยี่ห้อ/รุ่น</TableCell>
                <TableCell>Serial Number</TableCell>
                <TableCell>IP Address</TableCell>
                <TableCell>สถานะ</TableCell>
                <TableCell align="center" sx={{ width: 110 }}>จัดการ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((item, idx) => (
                <TableRow key={item.id} hover>
                  <TableCell sx={{ color: theme.palette.text.disabled, fontSize: 11 }}>{idx + 1}</TableCell>
                  <TableCell><Typography sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{item.floorArea}</Typography></TableCell>
                  <TableCell><Typography sx={{ fontSize: '0.8rem', color: theme.palette.text.secondary }}>{item.brandModel}</Typography></TableCell>
                  <TableCell><Typography sx={{ fontSize: 11, fontFamily: 'monospace' }}>{item.serialNo || '—'}</Typography></TableCell>
                  <TableCell><Typography sx={{ fontSize: 11, fontFamily: 'monospace' }}>{item.ipAddress || '—'}</Typography></TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={item.status === 'maintenance' ? 'ซ่อมบำรุง' : item.isActive !== false ? '● ใช้งาน' : '○ ปิด'}
                      sx={item.status === 'maintenance' ? {
                        bgcolor: alpha(theme.palette.warning.main, 0.1), color: theme.palette.warning.dark, border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
                      } : item.isActive !== false ? {
                        bgcolor: alpha(theme.palette.success.main, 0.1), color: theme.palette.success.dark, border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
                      } : {
                        bgcolor: theme.palette.background.default, color: theme.palette.text.disabled, border: `1px solid ${theme.palette.divider}`,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      <Button size="small" onClick={() => openEdit(item)} sx={{ minWidth: 0, px: 1, fontSize: 10, fontWeight: 600, bgcolor: alpha(theme.palette.info.main, 0.08), color: theme.palette.info.dark, border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`, '&:hover': { bgcolor: alpha(theme.palette.info.main, 0.15) } }}>✏️ แก้ไข</Button>
                      <Button size="small" onClick={() => setDeleteConfirm(item)} sx={{ minWidth: 0, px: 1, fontSize: 10, fontWeight: 600, bgcolor: alpha(theme.palette.error.main, 0.06), color: theme.palette.error.main, border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`, '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.12) } }}>🗑</Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{editingItem ? '✏️ แก้ไขเครื่องพิมพ์' : '➕ เพิ่มเครื่องพิมพ์'}</Typography>
          <IconButton size="small" onClick={() => setDialogOpen(false)}><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 0.5 }}>
            {error && (
              <Box sx={{ bgcolor: alpha(theme.palette.error.main, 0.06), border: `1px solid ${alpha(theme.palette.error.main, 0.25)}`, borderRadius: '8px', px: 1.5, py: 1, fontSize: 11, color: theme.palette.error.main }}>
                ⚠️ {error}
              </Box>
            )}
            <TextField autoFocus fullWidth size="small" label="ชั้น/พื้นที่ *" placeholder="เช่น ชั้น 22" value={form.floorArea} onChange={e => setForm(p => ({ ...p, floorArea: e.target.value }))} />
            <TextField fullWidth size="small" label="ยี่ห้อ/รุ่น *" placeholder="เช่น Canon imageFORCE C5140" value={form.brandModel} onChange={e => setForm(p => ({ ...p, brandModel: e.target.value }))} />
            <TextField fullWidth size="small" label="Serial Number" value={form.serialNo} onChange={e => setForm(p => ({ ...p, serialNo: e.target.value }))} />
            <TextField fullWidth size="small" label="IP Address" placeholder="เช่น 10.100.22.5" value={form.ipAddress} onChange={e => setForm(p => ({ ...p, ipAddress: e.target.value }))} />
            <TextField fullWidth size="small" label="ไดรเวอร์" value={form.driver} onChange={e => setForm(p => ({ ...p, driver: e.target.value }))} />
            <TextField fullWidth size="small" label="หมายเหตุ PIN" placeholder="เช่น ใช้เลข 4-5 ตัวท้ายรหัสพนักงาน" value={form.pinNote} onChange={e => setForm(p => ({ ...p, pinNote: e.target.value }))} />
            <Select fullWidth size="small" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as string }))}>
              <MenuItem value="active">ใช้งานปกติ</MenuItem>
              <MenuItem value="maintenance">ซ่อมบำรุง</MenuItem>
            </Select>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.5 }}>
              <Typography sx={{ fontSize: 12, color: theme.palette.text.primary, fontWeight: 500 }}>เปิดใช้งาน</Typography>
              <Switch checked={form.isActive} onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))} />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>ยกเลิก</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ minWidth: 80, bgcolor: accent, '&:hover': { bgcolor: accent, filter: 'brightness(1.08)' } }}>
            {saving ? '⏳ กำลังบันทึก...' : '💾 บันทึก'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteConfirm)} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700 }}>🗑 ยืนยันการลบ</Typography>
          <IconButton size="small" onClick={() => setDeleteConfirm(null)}><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, color: theme.palette.text.primary }}>
            ต้องการลบเครื่องพิมพ์ <strong>"{deleteConfirm?.brandModel}"</strong> ({deleteConfirm?.floorArea}) ใช่หรือไม่?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>ยกเลิก</Button>
          <Button variant="contained" color="error" onClick={() => handleDelete(deleteConfirm!)}>🗑 ลบเลย</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
