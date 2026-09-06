import React, { useEffect, useState } from 'react';
import {
  Box, Button, Card, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, IconButton, MenuItem, Table, TableBody, TableCell, TableHead, TableRow,
  TextField, Tooltip, Typography, alpha, useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { contractAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useConfirm } from '../../contexts/ConfirmContext';

const CONTRACT_TYPES = ['WARRANTY', 'MA', 'LEASE', 'INSURANCE', 'SUPPORT'];
const TYPE_LABELS: Record<string, string> = {
  WARRANTY: 'ประกัน/Warranty', MA: 'สัญญา MA', LEASE: 'เช่า',
  INSURANCE: 'ประกันภัย', SUPPORT: 'Support',
};

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function ExpiryChip({ endDate }: { endDate: string }) {
  const days = daysUntil(endDate);
  const label = days < 0 ? 'หมดอายุแล้ว' : days === 0 ? 'วันนี้' : `${days} วัน`;
  const color = days < 0 ? 'error' : days <= 30 ? 'error' : days <= 90 ? 'warning' : 'success';
  return <Chip size="small" color={color} label={label} />;
}

const emptyForm = {
  title: '', contractNo: '', contractType: 'WARRANTY', vendor: '',
  startDate: '', endDate: '', value: '', poNumber: '', notes: '',
};

export default function ContractsPage() {
  const theme = useTheme();
  const { user } = useAuth();
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [expiringSoon, setExpiringSoon] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    try {
      const res = await contractAPI.list({ type: typeFilter || undefined, expiringSoon: expiringSoon || undefined });
      setContracts(res.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [typeFilter, expiringSoon]);

  const openNew = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (c: any) => {
    setEditing(c);
    setForm({
      title: c.title, contractNo: c.contractNo || '', contractType: c.contractType,
      vendor: c.vendor || '', startDate: c.startDate?.slice(0, 10) || '',
      endDate: c.endDate?.slice(0, 10) || '', value: c.value?.toString() || '',
      poNumber: c.poNumber || '', notes: c.notes || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const payload = { ...form, value: form.value ? parseFloat(form.value) : undefined };
    if (editing) await contractAPI.update(editing.id, payload);
    else await contractAPI.create(payload);
    setDialogOpen(false);
    load();
  };

  const confirm = useConfirm();
  const handleDelete = async (id: number, label?: string) => {
    if (!await confirm({ title: 'ลบสัญญา', target: label })) return;
    await contractAPI.delete(id);
    load();
  };

  const isSuperAdmin = user?.role === 'SUPERADMIN';

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>สัญญา & Warranty</Typography>
          <Typography variant="body2" color="text.secondary">ติดตามสัญญา MA, ประกัน, เช่า และวันหมดอายุ</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            select size="small" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            label="ประเภท" sx={{ minWidth: 150 }}
          >
            <MenuItem value="">ทั้งหมด</MenuItem>
            {CONTRACT_TYPES.map(t => <MenuItem key={t} value={t}>{TYPE_LABELS[t]}</MenuItem>)}
          </TextField>
          <Button
            variant={expiringSoon ? 'contained' : 'outlined'}
            color="warning" size="small"
            startIcon={<WarningAmberIcon />}
            onClick={() => setExpiringSoon(!expiringSoon)}
          >
            ใกล้หมดอายุ (90 วัน)
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>เพิ่มสัญญา</Button>
        </Box>
      </Box>

      {/* Summary cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'สัญญาทั้งหมด', value: contracts.length, color: theme.palette.primary.main },
          { label: 'ใกล้หมด 30 วัน', value: contracts.filter(c => { const d = daysUntil(c.endDate); return d >= 0 && d <= 30; }).length, color: theme.palette.error.main },
          { label: 'ใกล้หมด 90 วัน', value: contracts.filter(c => { const d = daysUntil(c.endDate); return d >= 0 && d <= 90; }).length, color: theme.palette.warning.main },
          { label: 'หมดอายุแล้ว', value: contracts.filter(c => daysUntil(c.endDate) < 0).length, color: theme.palette.error.dark },
        ].map(s => (
          <Grid item xs={6} sm={3} key={s.label}>
            <Card sx={{ p: 2, borderLeft: `4px solid ${s.color}`, borderRadius: 2 }}>
              <Typography variant="h4" fontWeight={700} sx={{ color: s.color }}>{s.value}</Typography>
              <Typography variant="caption" color="text.secondary">{s.label}</Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Table */}
      <Card sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.06) }}>
              {['ชื่อสัญญา', 'เลขที่สัญญา', 'ประเภท', 'Vendor', 'วันเริ่ม', 'วันสิ้นสุด', 'วันที่เหลือ', 'มูลค่า', ''].map(h => (
                <TableCell key={h} sx={{ fontWeight: 600, fontSize: '0.78rem', py: 1.5 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={9} align="center" sx={{ py: 4 }}>กำลังโหลด...</TableCell></TableRow>
            ) : contracts.length === 0 ? (
              <TableRow><TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>ไม่มีสัญญา</TableCell></TableRow>
            ) : contracts.map(c => (
              <TableRow key={c.id} hover>
                <TableCell sx={{ fontWeight: 500 }}>{c.title}</TableCell>
                <TableCell>{c.contractNo || '—'}</TableCell>
                <TableCell><Chip size="small" label={TYPE_LABELS[c.contractType] || c.contractType} variant="outlined" /></TableCell>
                <TableCell>{c.vendor || '—'}</TableCell>
                <TableCell>{c.startDate?.slice(0, 10)}</TableCell>
                <TableCell>{c.endDate?.slice(0, 10)}</TableCell>
                <TableCell><ExpiryChip endDate={c.endDate} /></TableCell>
                <TableCell>{c.value ? c.value.toLocaleString('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }) : '—'}</TableCell>
                <TableCell>
                  <Tooltip title="แก้ไข"><IconButton aria-label="แก้ไข" size="small" onClick={() => openEdit(c)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                  {isSuperAdmin && (
                    <Tooltip title="ลบ"><IconButton aria-label="ลบ" size="small" color="error" onClick={() => handleDelete(c.id, c.contractNo || c.name)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={700}>{editing ? 'แก้ไขสัญญา' : 'เพิ่มสัญญาใหม่'}</DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField fullWidth label="ชื่อสัญญา *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="เลขที่สัญญา" value={form.contractNo} onChange={e => setForm(f => ({ ...f, contractNo: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth select label="ประเภท *" value={form.contractType} onChange={e => setForm(f => ({ ...f, contractType: e.target.value }))}>
                {CONTRACT_TYPES.map(t => <MenuItem key={t} value={t}>{TYPE_LABELS[t]}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Vendor" value={form.vendor} onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="เลข PO" value={form.poNumber} onChange={e => setForm(f => ({ ...f, poNumber: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth type="date" label="วันเริ่มต้น *" InputLabelProps={{ shrink: true }} value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth type="date" label="วันสิ้นสุด *" InputLabelProps={{ shrink: true }} value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth type="number" label="มูลค่าสัญญา (บาท)" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline rows={2} label="หมายเหตุ" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>ยกเลิก</Button>
          <Button variant="contained" onClick={handleSave} disabled={!form.title || !form.startDate || !form.endDate}>บันทึก</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
