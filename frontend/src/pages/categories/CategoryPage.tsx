import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Chip, CircularProgress, Alert, Card, CardContent, Grid, Divider,
  IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, useTheme, alpha,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import CategoryIcon from '@mui/icons-material/Category';
import { categoryAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useConfirm } from '../../contexts/ConfirmContext';

interface CategoryType {
  id: number;
  name: string;
  description: string | null;
  detailTable: string | null;
  isBorrowable: boolean;
  isAssignable: boolean;
  sortOrder: number;
  isActive: boolean;
}

interface Category {
  id: number;
  name: string;
  icon: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  types: CategoryType[];
  _count?: { assets: number };
}

const detailTableOptions = [
  { value: '', label: 'ไม่มีตาราง detail' },
  { value: 'computer_details', label: 'Computer Details' },
  { value: 'phone_details', label: 'Phone Details' },
  { value: 'monitor_details', label: 'Monitor Details' },
  { value: 'device_details', label: 'Device Details' },
  { value: 'network_device_details', label: 'Network Device Details' },
  { value: 'rack_details', label: 'Rack Details' },
  { value: 'printer_details', label: 'Printer Details' },
];

export default function CategoryPage() {
  const theme = useTheme();
  const toast = useToast();
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [catDialog, setCatDialog] = useState<{ open: boolean; category: Category | null }>({ open: false, category: null });
  const [typeDialog, setTypeDialog] = useState<{ open: boolean; categoryId: number; type: CategoryType | null }>({ open: false, categoryId: 0, type: null });
  const [catForm, setCatForm] = useState({ name: '', icon: '📁', description: '' });
  const [typeForm, setTypeForm] = useState({ name: '', description: '', detailTable: '', isBorrowable: true, isAssignable: true });
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const isAdmin = user?.role === 'IT_ADMIN' || user?.role === 'SUPERADMIN';

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await categoryAPI.all();
      setCategories(res.data || []);
    } catch {
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCatSave = async () => {
    if (!catForm.name.trim() || !catForm.icon.trim()) {
      setError('กรุณากรอกชื่อและไอคอน');
      return;
    }
    setProcessing(true);
    setError('');
    try {
      if (catDialog.category) {
        await categoryAPI.update(catDialog.category.id, catForm);
        toast.success('อัพเดทหมวดหมู่เรียบร้อย');
      } else {
        await categoryAPI.create(catForm);
        toast.success('สร้างหมวดหมู่เรียบร้อย');
      }
      setCatDialog({ open: false, category: null });
      setCatForm({ name: '', icon: '📁', description: '' });
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'เกิดข้อผิดพลาด');
    } finally {
      setProcessing(false);
    }
  };

  const handleTypeSave = async () => {
    if (!typeForm.name.trim()) {
      setError('กรุณากรอกชื่อประเภท');
      return;
    }
    setProcessing(true);
    setError('');
    try {
      if (typeDialog.type) {
        await categoryAPI.updateType(typeDialog.type.id, typeForm);
        toast.success('อัพเดทประเภทเรียบร้อย');
      } else {
        await categoryAPI.createType(typeDialog.categoryId, typeForm);
        toast.success('สร้างประเภทเรียบร้อย');
      }
      setTypeDialog({ open: false, categoryId: 0, type: null });
      setTypeForm({ name: '', description: '', detailTable: '', isBorrowable: true, isAssignable: true });
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'เกิดข้อผิดพลาด');
    } finally {
      setProcessing(false);
    }
  };

  const confirm = useConfirm();
  const handleDeleteCategory = async (id: number, name: string) => {
    if (!await confirm({
      title: 'ลบหมวดหมู่',
      target: name,
      detail: 'ประเภทย่อยทั้งหมดในหมวดนี้จะถูกลบไปด้วย',
    })) return;
    try {
      await categoryAPI.delete(id);
      toast.success('ลบหมวดหมู่เรียบร้อย');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'ไม่สามารถลบได้');
    }
  };

  const handleDeleteType = async (typeId: number, name: string) => {
    if (!await confirm({ title: 'ลบประเภทอุปกรณ์', target: name })) return;
    try {
      await categoryAPI.deleteType(typeId);
      toast.success('ลบประเภทเรียบร้อย');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'ไม่สามารถลบได้');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>จัดการหมวดหมู่ทรัพย์สิน</Typography>
          <Typography variant="body2" color="text.secondary">กำหนดหมวดหมู่และประเภทย่อยของทรัพย์สิน</Typography>
        </Box>
        {isAdmin && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setCatForm({ name: '', icon: '📁', description: '' }); setCatDialog({ open: true, category: null }); }}>
            เพิ่มหมวดหมู่
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Grid container spacing={3}>
        {categories.map((cat) => (
          <Grid item xs={12} key={cat.id}>
            <Card sx={{ borderLeft: `2px solid ${theme.palette.primary.main}`, bgcolor: alpha(theme.palette.primary.main, 0.015) }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="h3" sx={{ lineHeight: 1 }}>{cat.icon}</Typography>
                    <Box>
                      <Typography variant="h6" fontWeight={700}>{cat.name}</Typography>
                      {cat.description && (
                        <Typography variant="body2" color="text.secondary">{cat.description}</Typography>
                      )}
                    </Box>
                    <Chip
                      label={`${cat.types.length} ประเภท`}
                      size="small"
                      sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main, fontWeight: 600 }}
                    />
                    {cat._count?.assets !== undefined && (
                      <Chip
                        label={`${cat._count.assets} ทรัพย์สิน`}
                        size="small"
                        sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), color: theme.palette.success.main, fontWeight: 600 }}
                      />
                    )}
                  </Box>
                  {isAdmin && (
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Button
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => { setTypeForm({ name: '', description: '', detailTable: '', isBorrowable: true, isAssignable: true }); setTypeDialog({ open: true, categoryId: cat.id, type: null }); }}
                      >
                        เพิ่มประเภท
                      </Button>
                      <IconButton aria-label="แก้ไข" size="small" onClick={() => { setCatForm({ name: cat.name, icon: cat.icon, description: cat.description || '' }); setCatDialog({ open: true, category: cat }); }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      {user?.role === 'SUPERADMIN' && (
                        <IconButton aria-label="ลบ" size="small" color="error" onClick={() => handleDeleteCategory(cat.id, cat.name)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  )}
                </Box>

                <Divider sx={{ mb: 2 }} />

                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                        <TableCell sx={{ width: 40 }}><DragIndicatorIcon sx={{ fontSize: 16, color: 'text.disabled' }} /></TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>ชื่อประเภท</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>รายละเอียด</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>ตาราง Detail</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>ยืมได้</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>ใช้งานประจำ</TableCell>
                        {isAdmin && <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem', width: 100 }}>จัดการ</TableCell>}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {cat.types.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={isAdmin ? 7 : 6} align="center" sx={{ py: 2 }}>
                            <Typography variant="body2" color="text.secondary">ยังไม่มีประเภทย่อย</Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        cat.types.map((type) => (
                          <TableRow key={type.id} hover={!type.isActive} sx={{ opacity: type.isActive ? 1 : 0.5 }}>
                            <TableCell><DragIndicatorIcon sx={{ fontSize: 16, color: 'text.disabled' }} /></TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>{type.name}</TableCell>
                            <TableCell sx={{ fontSize: '0.85rem' }}>{type.description || '-'}</TableCell>
                            <TableCell sx={{ fontSize: '0.85rem' }}>
                              {type.detailTable ? (
                                <Chip label={type.detailTable.replace('_details', '').replace(/_/g, ' ')} size="small" variant="outlined" />
                              ) : '-'}
                            </TableCell>
                            <TableCell align="center">
                              <Chip label={type.isBorrowable ? '✅' : '❌'} size="small" variant="outlined" sx={{ minWidth: 40 }} />
                            </TableCell>
                            <TableCell align="center">
                              <Chip label={type.isAssignable ? '✅' : '❌'} size="small" variant="outlined" sx={{ minWidth: 40 }} />
                            </TableCell>
                            {isAdmin && (
                              <TableCell align="right">
                                <IconButton aria-label="แก้ไข" size="small" onClick={() => { setTypeForm({ name: type.name, description: type.description || '', detailTable: type.detailTable || '', isBorrowable: type.isBorrowable, isAssignable: type.isAssignable }); setTypeDialog({ open: true, categoryId: cat.id, type }); }}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                                {user?.role === 'SUPERADMIN' && (
                                  <IconButton aria-label="ลบ" size="small" color="error" onClick={() => handleDeleteType(type.id, type.name)}>
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {categories.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <CategoryIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">ยังไม่มีหมวดหมู่</Typography>
          <Typography variant="body2" color="text.secondary">คลิก "เพิ่มหมวดหมู่" เพื่อเริ่มต้น</Typography>
        </Box>
      )}

      {/* Category Dialog */}
      <Dialog open={catDialog.open} onClose={() => setCatDialog({ open: false, category: null })} maxWidth="xs" fullWidth>
        <DialogTitle>{catDialog.category ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่ใหม่'}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="ไอคอน" fullWidth value={catForm.icon} onChange={(e) => setCatForm((p) => ({ ...p, icon: e.target.value }))} sx={{ maxWidth: 100 }} helperText="เช่น 💻 📱 🖥️" />
              <TextField label="ชื่อหมวดหมู่ *" fullWidth required value={catForm.name} onChange={(e) => setCatForm((p) => ({ ...p, name: e.target.value }))} />
            </Box>
            <TextField label="รายละเอียด" fullWidth multiline rows={2} value={catForm.description} onChange={(e) => setCatForm((p) => ({ ...p, description: e.target.value }))} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCatDialog({ open: false, category: null })}>ยกเลิก</Button>
          <Button variant="contained" onClick={handleCatSave} disabled={processing}>
            {processing ? <CircularProgress size={20} /> : 'บันทึก'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Type Dialog */}
      <Dialog open={typeDialog.open} onClose={() => setTypeDialog({ open: false, categoryId: 0, type: null })} maxWidth="sm" fullWidth>
        <DialogTitle>{typeDialog.type ? 'แก้ไขประเภท' : 'เพิ่มประเภทย่อยใหม่'}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="ชื่อประเภท *" fullWidth required value={typeForm.name} onChange={(e) => setTypeForm((p) => ({ ...p, name: e.target.value }))} />
            <TextField label="รายละเอียด" fullWidth value={typeForm.description} onChange={(e) => setTypeForm((p) => ({ ...p, description: e.target.value }))} />
            <TextField label="ตาราง Detail" select fullWidth value={typeForm.detailTable} onChange={(e) => setTypeForm((p) => ({ ...p, detailTable: e.target.value }))} SelectProps={{ native: true }}>
              {detailTableOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </TextField>
            <Box sx={{ display: 'flex', gap: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <input type="checkbox" checked={typeForm.isBorrowable} onChange={(e) => setTypeForm((p) => ({ ...p, isBorrowable: e.target.checked }))} />
                <Typography variant="body2">ยืมได้</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <input type="checkbox" checked={typeForm.isAssignable} onChange={(e) => setTypeForm((p) => ({ ...p, isAssignable: e.target.checked }))} />
                <Typography variant="body2">ใช้งานประจำได้</Typography>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTypeDialog({ open: false, categoryId: 0, type: null })}>ยกเลิก</Button>
          <Button variant="contained" onClick={handleTypeSave} disabled={processing}>
            {processing ? <CircularProgress size={20} /> : 'บันทึก'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
