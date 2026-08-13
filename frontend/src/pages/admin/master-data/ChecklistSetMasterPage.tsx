import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, TextField, Switch, Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, alpha, useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useToast } from '../../../contexts/ToastContext';
import { assetAPI } from '../../../services/api';
import ChecklistItemsDialog from './ChecklistItemsDialog';

interface ChecklistSet {
  id: number;
  docCode: string;
  name: string;
  appliesToCategories?: string | null;
  itemCount: number;
  categoryCount: number;
  avgTimeLabel?: string | null;
  revision: number;
  isActive: boolean;
}

const emptyForm = { docCode: '', name: '', appliesToCategories: '', itemCount: '', categoryCount: '', avgTimeLabel: '', revision: '1', isActive: true };
const accent = '#7c3aed';

export default function ChecklistSetMasterPage() {
  const theme = useTheme();
  const toast = useToast();
  const [items, setItems] = useState<ChecklistSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ChecklistSet | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<ChecklistSet | null>(null);
  const [itemsDialogSet, setItemsDialogSet] = useState<ChecklistSet | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await assetAPI.checklistSets();
      setItems(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditingItem(null); setForm(emptyForm); setError(''); setDialogOpen(true); };
  const openEdit = (item: ChecklistSet) => {
    setEditingItem(item);
    setForm({
      docCode: item.docCode, name: item.name,
      appliesToCategories: item.appliesToCategories || '',
      itemCount: String(item.itemCount), categoryCount: String(item.categoryCount),
      avgTimeLabel: item.avgTimeLabel || '', revision: String(item.revision),
      isActive: item.isActive,
    });
    setError(''); setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.docCode.trim()) { setError('กรุณาระบุรหัสเอกสาร'); return; }
    if (!form.name.trim()) { setError('กรุณาระบุชื่อชุด'); return; }
    setSaving(true); setError('');
    try {
      const data = {
        docCode: form.docCode.trim(), name: form.name.trim(),
        appliesToCategories: form.appliesToCategories.trim() || null,
        itemCount: parseInt(form.itemCount) || 0, categoryCount: parseInt(form.categoryCount) || 0,
        avgTimeLabel: form.avgTimeLabel.trim() || null, revision: parseInt(form.revision) || 1,
        isActive: form.isActive,
      };
      if (editingItem) {
        await assetAPI.updateChecklistSet(editingItem.id, data);
        toast.success('แก้ไขชุด Checklist สำเร็จ');
      } else {
        await assetAPI.createChecklistSet(data);
        toast.success('เพิ่มชุด Checklist สำเร็จ');
      }
      setDialogOpen(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'ไม่สามารถบันทึกได้');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: ChecklistSet) => {
    try {
      await assetAPI.deleteChecklistSet(item.id);
      setDeleteConfirm(null);
      load();
      toast.success('ลบชุด Checklist สำเร็จ');
    } catch (err: any) {
      setDeleteConfirm(null);
      toast.error(`❌ ${err.response?.data?.error || 'ไม่สามารถลบได้'}`);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, mb: 2.25 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: alpha(accent, 0.08), border: `1.5px solid ${alpha(accent, 0.3)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>📋</Box>
          <Box>
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: theme.palette.text.primary, lineHeight: 1.2 }}>ชุด Checklist ติดตั้ง</Typography>
            <Typography sx={{ fontSize: 11, color: theme.palette.text.disabled, mt: 0.25 }}>
              จัดการระดับชุดเอกสารที่นี่ — กด "หัวข้อ" ที่แต่ละแถวเพื่อจัดการรายการตรวจสอบ
            </Typography>
          </Box>
        </Box>
        <Button variant="contained" size="small" onClick={openCreate} sx={{ bgcolor: accent, '&:hover': { bgcolor: accent, filter: 'brightness(1.08)' } }}>
          ＋ เพิ่มชุด Checklist
        </Button>
      </Box>

      <TableContainer sx={{ bgcolor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: '12px' }}>
        {loading ? (
          <Box sx={{ py: 5, textAlign: 'center', color: accent, fontSize: 13 }}>⏳ กำลังโหลด...</Box>
        ) : items.length === 0 ? (
          <Box sx={{ py: 5, textAlign: 'center', color: theme.palette.text.disabled, fontSize: 13 }}>ยังไม่มีชุด Checklist</Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 40 }}>#</TableCell>
                <TableCell>รหัสเอกสาร</TableCell>
                <TableCell>ชื่อชุด</TableCell>
                <TableCell>ใช้กับหมวด</TableCell>
                <TableCell>หัวข้อ</TableCell>
                <TableCell>เวลาเฉลี่ย</TableCell>
                <TableCell>Rev.</TableCell>
                <TableCell>สถานะ</TableCell>
                <TableCell align="center" sx={{ width: 170 }}>จัดการ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item, idx) => (
                <TableRow key={item.id} hover>
                  <TableCell sx={{ color: theme.palette.text.disabled, fontSize: 11 }}>{idx + 1}</TableCell>
                  <TableCell>
                    <Box component="span" sx={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: theme.palette.info.dark, bgcolor: alpha(theme.palette.info.main, 0.08), px: '7px', py: '2px', borderRadius: '5px' }}>{item.docCode}</Box>
                  </TableCell>
                  <TableCell><Typography sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{item.name}</Typography></TableCell>
                  <TableCell><Typography sx={{ fontSize: 11, color: theme.palette.text.secondary }}>{item.appliesToCategories || '—'}</Typography></TableCell>
                  <TableCell><Typography sx={{ fontSize: 11 }}>{item.itemCount} หัวข้อ · {item.categoryCount} หมวด</Typography></TableCell>
                  <TableCell><Typography sx={{ fontSize: 11 }}>{item.avgTimeLabel || '—'}</Typography></TableCell>
                  <TableCell><Typography sx={{ fontSize: 11 }}>Rev.{item.revision}</Typography></TableCell>
                  <TableCell>
                    <Chip size="small" label={item.isActive !== false ? '● ใช้งาน' : '○ เลิกใช้'} sx={item.isActive !== false ? {
                      bgcolor: alpha(theme.palette.success.main, 0.1), color: theme.palette.success.dark, border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
                    } : {
                      bgcolor: theme.palette.background.default, color: theme.palette.text.disabled, border: `1px solid ${theme.palette.divider}`,
                    }} />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      <Button size="small" onClick={() => setItemsDialogSet(item)} sx={{ minWidth: 0, px: 1, fontSize: 10, fontWeight: 600, bgcolor: alpha(theme.palette.secondary.main, 0.08), color: theme.palette.secondary.dark, border: `1px solid ${alpha(theme.palette.secondary.main, 0.3)}`, '&:hover': { bgcolor: alpha(theme.palette.secondary.main, 0.15) } }}>📋 หัวข้อ</Button>
                      <Button size="small" onClick={() => openEdit(item)} sx={{ minWidth: 0, px: 1, fontSize: 10, fontWeight: 600, bgcolor: alpha(theme.palette.info.main, 0.08), color: theme.palette.info.dark, border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`, '&:hover': { bgcolor: alpha(theme.palette.info.main, 0.15) } }}>✏️</Button>
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
          <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{editingItem ? '✏️ แก้ไขชุด Checklist' : '➕ เพิ่มชุด Checklist'}</Typography>
          <IconButton size="small" onClick={() => setDialogOpen(false)}><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 0.5 }}>
            {error && (
              <Box sx={{ bgcolor: alpha(theme.palette.error.main, 0.06), border: `1px solid ${alpha(theme.palette.error.main, 0.25)}`, borderRadius: '8px', px: 1.5, py: 1, fontSize: 11, color: theme.palette.error.main }}>
                ⚠️ {error}
              </Box>
            )}
            <TextField autoFocus fullWidth size="small" label="รหัสเอกสาร *" placeholder="เช่น IT-WI-001" value={form.docCode} onChange={e => setForm(p => ({ ...p, docCode: e.target.value }))} />
            <TextField fullWidth size="small" label="ชื่อชุด *" placeholder="เช่น ติดตั้งคอมพิวเตอร์ใหม่ (โน้ตบุ๊ก / PC)" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            <TextField fullWidth size="small" label="ใช้กับหมวดทรัพย์สิน" placeholder="เช่น โน้ตบุ๊ก · คอมพิวเตอร์ตั้งโต๊ะ" value={form.appliesToCategories} onChange={e => setForm(p => ({ ...p, appliesToCategories: e.target.value }))} />
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <TextField fullWidth size="small" type="number" label="จำนวนหัวข้อ" value={form.itemCount} onChange={e => setForm(p => ({ ...p, itemCount: e.target.value }))} />
              <TextField fullWidth size="small" type="number" label="จำนวนหมวด" value={form.categoryCount} onChange={e => setForm(p => ({ ...p, categoryCount: e.target.value }))} />
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <TextField fullWidth size="small" label="เวลาเฉลี่ย" placeholder="เช่น 3ชม.10น." value={form.avgTimeLabel} onChange={e => setForm(p => ({ ...p, avgTimeLabel: e.target.value }))} />
              <TextField fullWidth size="small" type="number" label="Revision" value={form.revision} onChange={e => setForm(p => ({ ...p, revision: e.target.value }))} />
            </Box>
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
            ต้องการลบชุด <strong>"{deleteConfirm?.name}"</strong> ({deleteConfirm?.docCode}) ใช่หรือไม่?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>ยกเลิก</Button>
          <Button variant="contained" color="error" onClick={() => handleDelete(deleteConfirm!)}>🗑 ลบเลย</Button>
        </DialogActions>
      </Dialog>

      {itemsDialogSet && (
        <ChecklistItemsDialog
          setId={itemsDialogSet.id}
          setName={itemsDialogSet.name}
          open={Boolean(itemsDialogSet)}
          onClose={() => { setItemsDialogSet(null); load(); }}
        />
      )}
    </Box>
  );
}
