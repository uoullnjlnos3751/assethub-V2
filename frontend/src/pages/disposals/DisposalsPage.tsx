import React, { useEffect, useState } from 'react';
import {
  Box, Button, Card, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, IconButton, MenuItem, Table, TableBody, TableCell,
  TableHead, TableRow, TextField, Tooltip, Typography, Autocomplete, alpha, useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { disposalAPI, assetAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const METHODS = ['DONATE', 'SELL', 'DESTROY', 'RETURN', 'TRANSFER'];
const METHOD_LABELS: Record<string, string> = {
  DONATE: 'บริจาค', SELL: 'ขาย', DESTROY: 'ทำลาย', RETURN: 'คืน Vendor', TRANSFER: 'โอนย้าย',
};
const METHOD_COLORS: Record<string, string> = {
  DONATE: 'success', SELL: 'info', DESTROY: 'error', RETURN: 'warning', TRANSFER: 'default',
};

const emptyForm = {
  asset: null as any,
  method: 'DONATE',
  disposalDate: new Date().toISOString().slice(0, 10),
  approvedBy: '', approvalRef: '', saleValue: '', recipientName: '', notes: '',
};

export default function DisposalsPage() {
  const theme = useTheme();
  const { user } = useAuth();
  const [disposals, setDisposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [methodFilter, setMethodFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [assetOptions, setAssetOptions] = useState<any[]>([]);
  const [assetSearch, setAssetSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await disposalAPI.list({ method: methodFilter || undefined });
      setDisposals(res.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [methodFilter]);

  useEffect(() => {
    const q = assetSearch.trim();
    if (q.length < 2) { setAssetOptions([]); return; }
    const timer = setTimeout(() => {
      assetAPI.list({ search: q, limit: 10 })
        .then(res => setAssetOptions(res.data?.data || []))
        .catch(() => setAssetOptions([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [assetSearch]);

  const openNew = () => { setForm(emptyForm); setAssetOptions([]); setAssetSearch(''); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.asset) return;
    await disposalAPI.create({
      assetId: form.asset.id,
      method: form.method,
      disposalDate: form.disposalDate,
      approvedBy: form.approvedBy || undefined,
      approvalRef: form.approvalRef || undefined,
      saleValue: form.saleValue ? parseFloat(form.saleValue) : undefined,
      recipientName: form.recipientName || undefined,
      notes: form.notes || undefined,
    });
    setDialogOpen(false);
    load();
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('ยกเลิกรายการจำหน่ายนี้? (ทรัพย์สินจะกลับเป็นสถานะพร้อมใช้งาน)')) return;
    await disposalAPI.delete(id);
    load();
  };

  const isSuperAdmin = user?.role === 'SUPERADMIN';

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>จำหน่ายทรัพย์สินออก</Typography>
          <Typography variant="body2" color="text.secondary">บันทึกการจำหน่ายทรัพย์สินออกจากระบบ (บริจาค / ขาย / ทำลาย / คืน Vendor / โอนย้าย)</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            select size="small" label="ตัวกรองวิธีจำหน่าย" value={methodFilter}
            onChange={e => setMethodFilter(e.target.value)} sx={{ minWidth: 160 }}
          >
            <MenuItem value="">ทั้งหมด</MenuItem>
            {METHODS.map(m => <MenuItem key={m} value={m}>{METHOD_LABELS[m]}</MenuItem>)}
          </TextField>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>บันทึกการจำหน่าย</Button>
        </Box>
      </Box>

      <Card sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.06) }}>
              {['ทรัพย์สิน', 'วิธีจำหน่าย', 'วันที่', 'ผู้อนุมัติ', 'ผู้รับ/มูลค่า', 'บันทึกโดย', ''].map(h => (
                <TableCell key={h} sx={{ fontWeight: 600, fontSize: '0.78rem', py: 1.5 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}>กำลังโหลด...</TableCell></TableRow>
            ) : disposals.length === 0 ? (
              <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>ไม่มีรายการจำหน่าย</TableCell></TableRow>
            ) : disposals.map(d => (
              <TableRow key={d.id} hover>
                <TableCell sx={{ fontWeight: 500 }}>
                  {d.asset?.assetName || d.asset?.assetCode || '—'}
                  <Typography variant="caption" color="text.secondary" display="block">{d.asset?.serialNo}</Typography>
                </TableCell>
                <TableCell><Chip size="small" color={METHOD_COLORS[d.method] as any} label={METHOD_LABELS[d.method] || d.method} /></TableCell>
                <TableCell>{d.disposalDate?.slice(0, 10)}</TableCell>
                <TableCell>{d.approvedBy || '—'}</TableCell>
                <TableCell>
                  {d.recipientName || '—'}
                  {d.saleValue ? <Typography variant="caption" color="text.secondary" display="block">{d.saleValue.toLocaleString()} บาท</Typography> : null}
                </TableCell>
                <TableCell>{d.createdBy?.displayName || d.createdBy?.adUsername || '—'}</TableCell>
                <TableCell>
                  {isSuperAdmin && (
                    <Tooltip title="ยกเลิกรายการ"><IconButton size="small" color="error" onClick={() => handleDelete(d.id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={700}>บันทึกการจำหน่ายทรัพย์สินออก</DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Autocomplete
                options={assetOptions}
                getOptionLabel={(o: any) => typeof o === 'string' ? o : `${o.assetCode || o.assetName || ''} · ${o.serialNo || ''}`}
                value={form.asset}
                onChange={(e, val) => setForm(f => ({ ...f, asset: val }))}
                inputValue={assetSearch}
                onInputChange={(e, val) => setAssetSearch(val)}
                isOptionEqualToValue={(o: any, v: any) => o.id === v.id}
                renderInput={(params) => <TextField {...params} label="ทรัพย์สิน * (พิมพ์เพื่อค้นหา)" />}
                noOptionsText={assetSearch.trim().length < 2 ? 'พิมพ์อย่างน้อย 2 ตัวอักษร' : 'ไม่พบทรัพย์สิน'}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth select label="วิธีจำหน่าย *" value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value }))}>
                {METHODS.map(m => <MenuItem key={m} value={m}>{METHOD_LABELS[m]}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth type="date" label="วันที่จำหน่าย *" InputLabelProps={{ shrink: true }} value={form.disposalDate} onChange={e => setForm(f => ({ ...f, disposalDate: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="ผู้อนุมัติ" value={form.approvedBy} onChange={e => setForm(f => ({ ...f, approvedBy: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="เลขที่อนุมัติ / เอกสาร" value={form.approvalRef} onChange={e => setForm(f => ({ ...f, approvalRef: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="ผู้รับ / ชื่อผู้ซื้อ" value={form.recipientName} onChange={e => setForm(f => ({ ...f, recipientName: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth type="number" label="มูลค่า (บาท)" value={form.saleValue} onChange={e => setForm(f => ({ ...f, saleValue: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline rows={2} label="หมายเหตุ" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>ยกเลิก</Button>
          <Button variant="contained" onClick={handleSave} disabled={!form.asset || !form.method || !form.disposalDate}>บันทึก</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
