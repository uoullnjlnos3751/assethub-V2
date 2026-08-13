import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, alpha, useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useToast } from '../../../contexts/ToastContext';
import { assetAPI } from '../../../services/api';

interface ChecklistItem {
  id: number;
  setId: number;
  category: string;
  refCode: string;
  itemText: string;
  sortOrder: number;
}

const emptyForm = { category: '', refCode: '', itemText: '' };
const accent = '#7c3aed';

export default function ChecklistItemsDialog({
  setId, setName, open, onClose,
}: {
  setId: number; setName: string; open: boolean; onClose: () => void;
}) {
  const theme = useTheme();
  const toast = useToast();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<ChecklistItem | null>(null);
  const [addingCategory, setAddingCategory] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await assetAPI.checklistItems(setId);
      setItems(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (open) load(); }, [open, setId]);

  const categories = Array.from(new Set(items.map(i => i.category)));

  const openEdit = (item: ChecklistItem) => {
    setEditingItem(item);
    setForm({ category: item.category, refCode: item.refCode, itemText: item.itemText });
    setError('');
  };

  const openAdd = (category: string) => {
    setEditingItem(null);
    setForm({ category, refCode: '', itemText: '' });
    setError('');
    setAddingCategory(category);
  };

  const cancelEdit = () => { setEditingItem(null); setAddingCategory(''); setForm(emptyForm); setError(''); };

  const handleSave = async () => {
    if (!form.category.trim()) { setError('กรุณาระบุหมวด'); return; }
    if (!form.itemText.trim()) { setError('กรุณาระบุรายการตรวจสอบ'); return; }
    setSaving(true); setError('');
    try {
      const data = { category: form.category.trim(), refCode: form.refCode.trim(), itemText: form.itemText.trim() };
      if (editingItem) {
        await assetAPI.updateChecklistItem(setId, editingItem.id, data);
        toast.success('แก้ไขรายการสำเร็จ');
      } else {
        await assetAPI.createChecklistItem(setId, data);
        toast.success('เพิ่มรายการสำเร็จ');
      }
      cancelEdit();
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'ไม่สามารถบันทึกได้');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: ChecklistItem) => {
    try {
      await assetAPI.deleteChecklistItem(setId, item.id);
      setDeleteConfirm(null);
      load();
      toast.success('ลบรายการสำเร็จ');
    } catch (err: any) {
      setDeleteConfirm(null);
      toast.error(`❌ ${err.response?.data?.error || 'ไม่สามารถลบได้'}`);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography sx={{ fontSize: 14, fontWeight: 700 }}>📋 จัดการหัวข้อ — {setName}</Typography>
        <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ py: 4, textAlign: 'center', fontSize: 13, color: theme.palette.text.disabled }}>⏳ กำลังโหลด...</Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 0.5 }}>
            {categories.length === 0 && (
              <Typography sx={{ fontSize: 12, color: theme.palette.text.disabled, textAlign: 'center', py: 2 }}>
                ยังไม่มีหัวข้อในชุดนี้ — เพิ่มหมวดแรกด้านล่าง
              </Typography>
            )}
            {categories.map(cat => {
              const catItems = items.filter(i => i.category === cat);
              return (
                <Box key={cat} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: '10px', overflow: 'hidden' }}>
                  <Box sx={{ px: 1.5, py: 1, bgcolor: alpha(theme.palette.secondary.main, 0.05), display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>{cat}</Typography>
                    <Typography sx={{ fontSize: 11, color: theme.palette.text.disabled }}>{catItems.length} หัวข้อ</Typography>
                  </Box>
                  <TableContainer>
                    <Table size="small">
                      <TableBody>
                        {catItems.map(item => (
                          <TableRow key={item.id} hover>
                            <TableCell sx={{ width: 60 }}>
                              <Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: theme.palette.text.disabled }}>{item.refCode}</Typography>
                            </TableCell>
                            <TableCell><Typography sx={{ fontSize: 12.5 }}>{item.itemText}</Typography></TableCell>
                            <TableCell align="right" sx={{ width: 90 }}>
                              <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                                <Button size="small" onClick={() => openEdit(item)} sx={{ minWidth: 0, px: 0.75, fontSize: 10 }}>✏️</Button>
                                <Button size="small" color="error" onClick={() => setDeleteConfirm(item)} sx={{ minWidth: 0, px: 0.75, fontSize: 10 }}>🗑</Button>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <Box sx={{ px: 1.5, py: 0.75 }}>
                    <Button size="small" onClick={() => openAdd(cat)} sx={{ fontSize: 11, color: theme.palette.secondary.main }}>＋ เพิ่มหัวข้อในหมวดนี้</Button>
                  </Box>
                </Box>
              );
            })}

            <Box sx={{ borderTop: `1px dashed ${theme.palette.divider}`, pt: 1.5 }}>
              <Button size="small" variant="outlined" onClick={() => openAdd('')} sx={{ fontSize: 11 }}>＋ เพิ่มหมวดใหม่</Button>
            </Box>

            {(editingItem !== null || addingCategory !== '') && (
              <Box sx={{ border: `1px solid ${alpha(theme.palette.secondary.main, 0.3)}`, borderRadius: '10px', p: 1.5, bgcolor: alpha(theme.palette.secondary.main, 0.03) }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 1 }}>{editingItem ? '✏️ แก้ไขหัวข้อ' : '➕ เพิ่มหัวข้อ'}</Typography>
                {error && (
                  <Box sx={{ bgcolor: alpha(theme.palette.error.main, 0.06), border: `1px solid ${alpha(theme.palette.error.main, 0.25)}`, borderRadius: '8px', px: 1.5, py: 1, fontSize: 11, color: theme.palette.error.main, mb: 1 }}>
                    ⚠️ {error}
                  </Box>
                )}
                <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <TextField size="small" label="หมวด *" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} sx={{ flex: 2 }} />
                  <TextField size="small" label="อ้างอิง" placeholder="เช่น 2.2" value={form.refCode} onChange={e => setForm(p => ({ ...p, refCode: e.target.value }))} sx={{ flex: 1 }} />
                </Box>
                <TextField fullWidth size="small" label="รายการตรวจสอบ *" multiline minRows={2} value={form.itemText} onChange={e => setForm(p => ({ ...p, itemText: e.target.value }))} sx={{ mb: 1 }} />
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  <Button size="small" onClick={cancelEdit}>ยกเลิก</Button>
                  <Button size="small" variant="contained" onClick={handleSave} disabled={saving} sx={{ bgcolor: accent, '&:hover': { bgcolor: accent, filter: 'brightness(1.08)' } }}>
                    {saving ? '⏳' : '💾 บันทึก'}
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>ปิด</Button>
      </DialogActions>

      <Dialog open={Boolean(deleteConfirm)} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700 }}>🗑 ยืนยันการลบ</Typography>
          <IconButton size="small" onClick={() => setDeleteConfirm(null)}><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13 }}>ต้องการลบหัวข้อ <strong>"{deleteConfirm?.itemText}"</strong> ใช่หรือไม่?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>ยกเลิก</Button>
          <Button variant="contained" color="error" onClick={() => handleDelete(deleteConfirm!)}>🗑 ลบเลย</Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}
