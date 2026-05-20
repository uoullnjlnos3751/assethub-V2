import React, { useEffect, useState } from 'react';
import {
  Box, Button, Card, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, Grid, IconButton, InputLabel, MenuItem, Select, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, TextField,
  Tooltip, Typography, alpha, useTheme, TablePagination,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import { inventoryAPI } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import EmptyState from '../../components/EmptyState';

export default function InventoryPage() {
  const theme = useTheme();
  const toast = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<string[]>([]);

  // Dialogs
  const [formDialog, setFormDialog] = useState<{ open: boolean; edit: any | null }>({ open: false, edit: null });
  const [form, setForm] = useState({ name: '', category: 'Cable', brand: '', model: '', unit: 'เส้น', totalQuantity: 0, minStockLevel: 0, location: '', remark: '' });
  const [txnDialog, setTxnDialog] = useState<{ open: boolean; item: any; mode: 'checkin' | 'checkout' } | null>(null);
  const [txnQty, setTxnQty] = useState(1);
  const [txnNote, setTxnNote] = useState('');

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await inventoryAPI.list({ search, category: category || undefined, page: page + 1, limit: pageSize });
      setItems(res.data.data);
      setTotal(res.data.total);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, [page, pageSize, category]);

  useEffect(() => {
    inventoryAPI.categories().then((res) => setCategories(res.data || [])).catch(() => {});
  }, []);

  const handleSearch = () => { setPage(0); fetchItems(); };

  const openCreate = () => {
    setForm({ name: '', category: 'Cable', brand: '', model: '', unit: 'เส้น', totalQuantity: 0, minStockLevel: 0, location: '', remark: '' });
    setFormDialog({ open: true, edit: null });
  };

  const openEdit = (item: any) => {
    setForm({ name: item.name, category: item.category, brand: item.brand || '', model: item.model || '', unit: item.unit, totalQuantity: item.totalQuantity, minStockLevel: item.minStockLevel, location: item.location || '', remark: item.remark || '' });
    setFormDialog({ open: true, edit: item });
  };

  const handleFormSubmit = async () => {
    try {
      if (formDialog.edit) {
        await inventoryAPI.update(formDialog.edit.id, form);
        toast.success('แก้ไขรายการเรียบร้อย');
      } else {
        await inventoryAPI.create(form);
        toast.success('เพิ่มรายการเรียบร้อย');
      }
      setFormDialog({ open: false, edit: null });
      fetchItems();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'เกิดข้อผิดพลาด');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('ต้องการลบรายการนี้ใช่หรือไม่?')) return;
    try {
      await inventoryAPI.delete(id);
      toast.success('ลบรายการเรียบร้อย');
      fetchItems();
    } catch (err) { toast.error('ไม่สามารถลบรายการได้'); }
  };

  const openCheckin = (item: any) => {
    setTxnQty(1);
    setTxnNote('');
    setTxnDialog({ open: true, item, mode: 'checkin' });
  };

  const openCheckout = (item: any) => {
    setTxnQty(1);
    setTxnNote('');
    setTxnDialog({ open: true, item, mode: 'checkout' });
  };

  const handleTxnSubmit = async () => {
    if (!txnDialog) return;
    try {
      if (txnDialog.mode === 'checkin') {
        await inventoryAPI.checkin(txnDialog.item.id, { quantity: txnQty, note: txnNote });
        toast.success(`เพิ่มสต็อก ${txnQty} ${txnDialog.item.unit} เรียบร้อย`);
      } else {
        await inventoryAPI.checkout(txnDialog.item.id, { quantity: txnQty, note: txnNote });
        toast.success(`เบิก ${txnQty} ${txnDialog.item.unit} เรียบร้อย`);
      }
      setTxnDialog(null);
      fetchItems();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'เกิดข้อผิดพลาด');
    }
  };

  const getStockColor = (avail: number, min: number) => {
    if (avail <= 0) return 'error';
    if (avail <= min) return 'warning';
    return 'success';
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Inventory Management</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            จัดการ Cables, Consumables, Cartridges และของสิ้นเปลือง
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>เพิ่มรายการ</Button>
      </Box>

      <Card sx={{ p: 2.5, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <TextField fullWidth size="small" label="ค้นหา" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
          </Grid>
          <Grid item xs={6} sm={3} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>หมวดหมู่</InputLabel>
              <Select value={category} label="หมวดหมู่" onChange={(e) => { setCategory(e.target.value); setPage(0); }}>
                <MenuItem value="">ทั้งหมด</MenuItem>
                {categories.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} sm={3} md={2}>
            <Button fullWidth variant="contained" onClick={handleSearch}>ค้นหา</Button>
          </Grid>
        </Grid>
      </Card>

      {loading ? <LoadingSkeleton type="table" count={8} /> : items.length === 0 ? (
        <EmptyState title="ไม่มีรายการ" description="ยังไม่มีรายการวัสดุสิ้นเปลือง" secondaryActionLabel="เพิ่มรายการแรก" onSecondaryAction={openCreate} />
      ) : (
        <Card>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.04) }}>
                  <TableCell sx={{ fontWeight: 600 }}>ชื่อรายการ</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>หมวดหมู่</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>ยี่ห้อ/รุ่น</TableCell>
                  <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>ทั้งหมด</TableCell>
                  <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>คงเหลือ</TableCell>
                  <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>ขั้นต่ำ</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>หน่วย</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>สถานที่</TableCell>
                  <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>สถานะ</TableCell>
                  <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>จัดการ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{item.name}</TableCell>
                    <TableCell>
                      <Chip label={item.category} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>{(item.brand || item.model) ? `${item.brand || ''} ${item.model || ''}` : '-'}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{item.totalQuantity}</TableCell>
                    <TableCell sx={{ textAlign: 'center', fontWeight: 600 }}>{item.availableQuantity}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{item.minStockLevel}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell>{item.location || '-'}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Chip
                        label={item.availableQuantity <= 0 ? 'หมด' : item.availableQuantity <= item.minStockLevel ? 'ใกล้หมด' : 'ปกติ'}
                        color={getStockColor(item.availableQuantity, item.minStockLevel) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        <Tooltip title="เพิ่มสต็อก">
                          <IconButton size="small" color="success" onClick={() => openCheckin(item)}>
                            <AddCircleIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="เบิกออก">
                          <IconButton size="small" color="warning" onClick={() => openCheckout(item)}>
                            <RemoveCircleIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="แก้ไข">
                          <IconButton size="small" onClick={() => openEdit(item)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="ลบ">
                          <IconButton size="small" color="error" onClick={() => handleDelete(item.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination component="div" count={total} page={page} onPageChange={(_, p) => setPage(p)} rowsPerPage={pageSize} onRowsPerPageChange={(e) => { setPageSize(parseInt(e.target.value)); setPage(0); }} rowsPerPageOptions={[10, 25, 50]} />
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={formDialog.open} onClose={() => setFormDialog({ open: false, edit: null })} maxWidth="sm" fullWidth>
        <DialogTitle>{formDialog.edit ? 'แก้ไขรายการ' : 'เพิ่มรายการใหม่'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="ชื่อรายการ *" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small" required>
                <InputLabel>หมวดหมู่</InputLabel>
                <Select value={form.category} label="หมวดหมู่" onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                  {categories.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" label="ยี่ห้อ" value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" label="รุ่น" value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" label="หน่วยนับ *" value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} required helperText="เช่น เส้น, ชิ้น, ตลับ, ม้วน" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" label="จำนวนเริ่มต้น" type="number" value={form.totalQuantity} onChange={(e) => setForm((f) => ({ ...f, totalQuantity: parseInt(e.target.value) || 0 }))} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" label="จำนวนขั้นต่ำ (Min Stock)" type="number" value={form.minStockLevel} onChange={(e) => setForm((f) => ({ ...f, minStockLevel: parseInt(e.target.value) || 0 }))} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" label="สถานที่จัดเก็บ" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="หมายเหตุ" multiline rows={2} value={form.remark} onChange={(e) => setForm((f) => ({ ...f, remark: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormDialog({ open: false, edit: null })}>ยกเลิก</Button>
          <Button variant="contained" onClick={handleFormSubmit} disabled={!form.name.trim() || !form.category || !form.unit.trim()}>
            {formDialog.edit ? 'บันทึก' : 'เพิ่ม'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Check-in / Check-out Dialog */}
      <Dialog open={Boolean(txnDialog)} onClose={() => setTxnDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {txnDialog?.mode === 'checkin' ? 'เพิ่มสต็อก' : 'เบิกออก'} — {txnDialog?.item?.name}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              คงเหลือปัจจุบัน: <strong>{txnDialog?.item?.availableQuantity} {txnDialog?.item?.unit}</strong>
            </Typography>
            <TextField
              fullWidth size="small" label="จำนวน" type="number"
              value={txnQty} onChange={(e) => setTxnQty(Math.max(1, parseInt(e.target.value) || 1))}
              inputProps={{ min: 1 }}
            />
            <TextField
              fullWidth size="small" label="หมายเหตุ" multiline rows={2}
              value={txnNote} onChange={(e) => setTxnNote(e.target.value)}
              sx={{ mt: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTxnDialog(null)}>ยกเลิก</Button>
          <Button
            variant="contained"
            color={txnDialog?.mode === 'checkin' ? 'success' : 'warning'}
            onClick={handleTxnSubmit}
            disabled={txnQty < 1 || (txnDialog?.mode === 'checkout' && txnDialog && txnQty > txnDialog.item.availableQuantity)}
          >
            {txnDialog?.mode === 'checkin' ? 'เพิ่มสต็อก' : 'เบิกออก'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
