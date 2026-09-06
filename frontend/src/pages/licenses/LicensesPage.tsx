import React, { useEffect, useState } from 'react';
import {
  Box, Button, Card, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, IconButton, LinearProgress, MenuItem, Table, TableBody, TableCell,
  TableHead, TableRow, TextField, Tooltip, Typography, alpha, useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { licenseAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useConfirm } from '../../contexts/ConfirmContext';

const LICENSE_TYPES = ['PERPETUAL', 'SUBSCRIPTION', 'OEM', 'VOLUME'];
const TYPE_LABELS: Record<string, string> = {
  PERPETUAL: 'Perpetual', SUBSCRIPTION: 'Subscription', OEM: 'OEM', VOLUME: 'Volume',
};

function daysUntil(dateStr?: string) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function SeatBar({ used, total }: { used: number; total: number }) {
  const pct = total > 0 ? (used / total) * 100 : 0;
  const color = pct >= 95 ? 'error' : pct >= 80 ? 'warning' : 'primary';
  return (
    <Box sx={{ minWidth: 100 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
        <Typography variant="caption">{used}/{total}</Typography>
        <Typography variant="caption" color="text.secondary">{Math.round(pct)}%</Typography>
      </Box>
      <LinearProgress variant="determinate" value={pct} color={color} sx={{ height: 5, borderRadius: 3 }} />
    </Box>
  );
}

const emptyForm = {
  name: '', vendor: '', licenseType: 'SUBSCRIPTION', totalSeats: '1',
  licenseKey: '', purchaseDate: '', expiryDate: '', purchasePrice: '', poNumber: '', notes: '',
};

export default function LicensesPage() {
  const theme = useTheme();
  const { user } = useAuth();
  const [licenses, setLicenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expiringSoon, setExpiringSoon] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    try {
      const res = await licenseAPI.list({ expiringSoon: expiringSoon || undefined });
      setLicenses(res.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [expiringSoon]);

  const openNew = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (l: any) => {
    setEditing(l);
    setForm({
      name: l.name, vendor: l.vendor || '', licenseType: l.licenseType,
      totalSeats: l.totalSeats.toString(), licenseKey: l.licenseKey || '',
      purchaseDate: l.purchaseDate?.slice(0, 10) || '',
      expiryDate: l.expiryDate?.slice(0, 10) || '',
      purchasePrice: l.purchasePrice?.toString() || '',
      poNumber: l.poNumber || '', notes: l.notes || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      ...form,
      totalSeats: parseInt(form.totalSeats) || 1,
      purchasePrice: form.purchasePrice ? parseFloat(form.purchasePrice) : undefined,
      purchaseDate: form.purchaseDate || undefined,
      expiryDate: form.expiryDate || undefined,
    };
    if (editing) await licenseAPI.update(editing.id, payload);
    else await licenseAPI.create(payload);
    setDialogOpen(false);
    load();
  };

  const confirm = useConfirm();
  const handleDelete = async (id: number, label?: string) => {
    if (!await confirm({ title: 'ลบ License', target: label })) return;
    await licenseAPI.delete(id);
    load();
  };

  const isSuperAdmin = user?.role === 'SUPERADMIN';
  const totalSeats = licenses.reduce((s, l) => s + l.totalSeats, 0);
  const usedSeats  = licenses.reduce((s, l) => s + (l.usedSeats || 0), 0);
  const expiringCount = licenses.filter(l => { const d = daysUntil(l.expiryDate); return d !== null && d >= 0 && d <= 90; }).length;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Software License</Typography>
          <Typography variant="body2" color="text.secondary">จัดการสิทธิ์การใช้งานซอฟต์แวร์และจำนวน seat</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            variant={expiringSoon ? 'contained' : 'outlined'}
            color="warning" size="small"
            startIcon={<WarningAmberIcon />}
            onClick={() => setExpiringSoon(!expiringSoon)}
          >
            ใกล้หมดอายุ
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>เพิ่ม License</Button>
        </Box>
      </Box>

      {/* Summary */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'License ทั้งหมด', value: licenses.length, color: theme.palette.primary.main },
          { label: 'Seats รวม', value: totalSeats, color: theme.palette.info.main },
          { label: 'Seats ใช้งาน', value: usedSeats, color: theme.palette.success.main },
          { label: 'ใกล้หมดอายุ 90 วัน', value: expiringCount, color: theme.palette.warning.main },
        ].map(s => (
          <Grid item xs={6} sm={3} key={s.label}>
            <Card sx={{ p: 2, borderLeft: `4px solid ${s.color}`, borderRadius: 2 }}>
              <Typography variant="h4" fontWeight={700} sx={{ color: s.color }}>{s.value}</Typography>
              <Typography variant="caption" color="text.secondary">{s.label}</Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.06) }}>
              {['ชื่อซอฟต์แวร์', 'Vendor', 'ประเภท', 'การใช้งาน (Seats)', 'วันหมดอายุ', ''].map(h => (
                <TableCell key={h} sx={{ fontWeight: 600, fontSize: '0.78rem', py: 1.5 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}>กำลังโหลด...</TableCell></TableRow>
            ) : licenses.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>ไม่มี License</TableCell></TableRow>
            ) : licenses.map(l => {
              const days = daysUntil(l.expiryDate);
              const expiryChipColor = days === null ? 'default' : days < 0 ? 'error' : days <= 30 ? 'error' : days <= 90 ? 'warning' : 'success';
              const expiryLabel = days === null ? 'ไม่มีวันหมด' : days < 0 ? 'หมดแล้ว' : `${days} วัน`;
              return (
                <TableRow key={l.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{l.name}</TableCell>
                  <TableCell>{l.vendor || '—'}</TableCell>
                  <TableCell><Chip size="small" label={TYPE_LABELS[l.licenseType] || l.licenseType} variant="outlined" /></TableCell>
                  <TableCell><SeatBar used={l.usedSeats || 0} total={l.totalSeats} /></TableCell>
                  <TableCell>
                    {l.expiryDate
                      ? <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="caption">{l.expiryDate.slice(0, 10)}</Typography>
                          <Chip size="small" color={expiryChipColor as any} label={expiryLabel} />
                        </Box>
                      : <Chip size="small" label="ไม่มีวันหมด" variant="outlined" />
                    }
                  </TableCell>
                  <TableCell>
                    <Tooltip title="แก้ไข"><IconButton aria-label="แก้ไข" size="small" onClick={() => openEdit(l)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                    {isSuperAdmin && (
                      <Tooltip title="ลบ"><IconButton aria-label="ลบ" size="small" color="error" onClick={() => handleDelete(l.id, l.name || l.licenseKey)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={700}>{editing ? 'แก้ไข License' : 'เพิ่ม License ใหม่'}</DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField fullWidth label="ชื่อซอฟต์แวร์ *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Vendor" value={form.vendor} onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth select label="ประเภท *" value={form.licenseType} onChange={e => setForm(f => ({ ...f, licenseType: e.target.value }))}>
                {LICENSE_TYPES.map(t => <MenuItem key={t} value={t}>{TYPE_LABELS[t]}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth type="number" label="จำนวน Seats *" value={form.totalSeats} onChange={e => setForm(f => ({ ...f, totalSeats: e.target.value }))} inputProps={{ min: 1 }} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth type="number" label="ราคา (บาท)" value={form.purchasePrice} onChange={e => setForm(f => ({ ...f, purchasePrice: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth type="date" label="วันที่ซื้อ" InputLabelProps={{ shrink: true }} value={form.purchaseDate} onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth type="date" label="วันหมดอายุ" InputLabelProps={{ shrink: true }} value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="License Key / Serial" value={form.licenseKey} onChange={e => setForm(f => ({ ...f, licenseKey: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline rows={2} label="หมายเหตุ" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>ยกเลิก</Button>
          <Button variant="contained" onClick={handleSave} disabled={!form.name}>บันทึก</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
