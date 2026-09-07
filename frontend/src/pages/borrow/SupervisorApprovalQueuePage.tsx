import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  CircularProgress, Alert, Card, CardContent, Grid, useMediaQuery, useTheme, alpha,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { borrowAPI } from '../../services/api';
import { formatDate } from '../../utils/dateUtils';
import SearchIcon from '@mui/icons-material/Search';
import EmptyState from '../../components/EmptyState';

interface Request {
  id: number;
  requestNo: string;
  requester: { id: number; displayName: string; adUsername: string; department?: string; company?: string };
  purpose: string;
  items: Array<{
    id: number;
    asset?: { assetCode: string; assetName: string; brand: string; model: string; serialNo: string };
    inventoryItem?: { name: string };
    quantity?: number;
  }>;
  createdAt: string;
}

// หน้านี้เห็นเฉพาะคำขอของลูกทีมโดยตรง (managerId ผูกไว้ที่ตัวเอง) ที่ยังรอ
// อนุมัติขั้นหัวหน้างาน — ผ่านขั้นนี้แล้วจะเด้งไปคิว IT Admin ต่อ ไม่ใช่จบที่นี่
export default function SupervisorApprovalQueuePage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<{ open: boolean; request: Request | null; action: 'approve' | 'reject' | null }>({
    open: false, request: null, action: null,
  });
  const [detailDialog, setDetailDialog] = useState<{ open: boolean; request: Request | null }>({ open: false, request: null });
  const [note, setNote] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');

  /* คิวนี้ยาวได้ไม่จำกัด (ดึงมา 200 รายการในครั้งเดียว) แต่เดิมไม่มีทางหา
     คำขอใบใดใบหนึ่งนอกจากเลื่อนดู — กรองในหน้าเว็บได้เลยเพราะข้อมูลอยู่ครบแล้ว */
  const filtered = requests.filter(r => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [r.requestNo, r.requester?.displayName, r.requester?.adUsername, r.purpose]
      .some(v => (v || '').toLowerCase().includes(q));
  });

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await borrowAPI.supervisorQueue({ limit: 200 });
      setRequests(res.data.data || []);
    } catch (err) {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAction = async () => {
    if (!dialog.request || !dialog.action) return;
    setProcessing(true);
    setError('');
    try {
      await borrowAPI.supervisorApprove(dialog.request.id, {
        action: dialog.action === 'approve' ? 'Approved' : 'Rejected',
        note,
      });
      setSuccess(dialog.action === 'approve' ? 'อนุมัติคำขอสำเร็จ ส่งต่อให้ IT Admin ดำเนินการแล้ว' : 'ปฏิเสธคำขอสำเร็จ');
      setDialog({ open: false, request: null, action: null });
      setNote('');
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'เกิดข้อผิดพลาด');
    } finally {
      setProcessing(false);
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
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>อนุมัติคำขอยืม (หัวหน้างาน)</Typography>
        <Typography variant="body1" color="text.secondary">
          คำขอยืมของลูกทีมที่รอการอนุมัติจากคุณ ก่อนส่งต่อให้ IT Admin จ่ายของ
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <TextField
        size="small"
        fullWidth
        placeholder="ค้นหาเลขที่คำขอ ผู้ขอ หรือวัตถุประสงค์..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        InputProps={{ startAdornment: <SearchIcon sx={{ fontSize: 18, mr: 1, opacity: 0.5 }} /> }}
        sx={{ mb: 2, maxWidth: 420 }}
      />

      {isMobile ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filtered.length === 0 ? (
            <EmptyState
              filtered={!!search.trim()}
              onClearFilter={() => setSearch('')}
              title={search.trim() ? undefined : 'ไม่มีคำขอรอการอนุมัติ'}
              description={search.trim() ? undefined : 'เมื่อลูกทีมส่งคำขอยืม รายการจะมาแสดงที่นี่'}
            />
          ) : (
            filtered.map((request) => (
              <Card key={request.id} sx={{ borderRadius: 3 }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="body2" fontWeight={700} color="primary.main">{request.requestNo}</Typography>
                    <Typography variant="caption" color="text.secondary">{formatDate(request.createdAt)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 2 }}>
                    <Typography variant="body2"><strong>ผู้ขอ:</strong> {request.requester?.displayName || request.requester?.adUsername}</Typography>
                    <Typography variant="body2" color="text.secondary"><strong>วัตถุประสงค์:</strong> {request.purpose}</Typography>
                    <Typography variant="body2" color="text.secondary"><strong>จำนวน:</strong> {request.items.length} รายการ</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button size="small" startIcon={<VisibilityIcon />} onClick={() => setDetailDialog({ open: true, request })} variant="outlined" sx={{ flex: 1, borderRadius: 2 }}>ดู</Button>
                    <Button size="small" variant="contained" color="success" startIcon={<CheckCircleIcon />} onClick={() => { setDialog({ open: true, request, action: 'approve' }); setNote(''); }} sx={{ flex: 1, borderRadius: 2 }}>อนุมัติ</Button>
                    <Button size="small" variant="outlined" color="error" startIcon={<CancelIcon />} onClick={() => { setDialog({ open: true, request, action: 'reject' }); setNote(''); }} sx={{ flex: 1, borderRadius: 2 }}>ปฏิเสธ</Button>
                  </Box>
                </CardContent>
              </Card>
            ))
          )}
        </Box>
      ) : (
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>
                  <TableCell>เลขที่คำขอ</TableCell>
                  <TableCell>ผู้ขอ</TableCell>
                  <TableCell>วัตถุประสงค์</TableCell>
                  <TableCell>จำนวนรายการ</TableCell>
                  <TableCell>วันที่ขอ</TableCell>
                  <TableCell align="right">การกระทำ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ border: 0 }}>
                      <EmptyState
                        filtered={!!search.trim()}
                        onClearFilter={() => setSearch('')}
                        title={search.trim() ? undefined : 'ไม่มีคำขอรอการอนุมัติ'}
                        description={search.trim() ? undefined : 'เมื่อลูกทีมส่งคำขอยืม รายการจะมาแสดงที่นี่'}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((request) => (
                    <TableRow key={request.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{request.requestNo}</TableCell>
                      <TableCell>{request.requester?.displayName || request.requester?.adUsername}</TableCell>
                      <TableCell>{request.purpose}</TableCell>
                      <TableCell>{request.items.length} รายการ</TableCell>
                      <TableCell>{formatDate(request.createdAt)}</TableCell>
                      <TableCell align="right">
                        <Button size="small" startIcon={<VisibilityIcon />} onClick={() => setDetailDialog({ open: true, request })} sx={{ mr: 0.5 }}>ดู</Button>
                        <Button size="small" variant="contained" color="success" startIcon={<CheckCircleIcon />} onClick={() => { setDialog({ open: true, request, action: 'approve' }); setNote(''); }} sx={{ mr: 0.5 }}>อนุมัติ</Button>
                        <Button size="small" variant="outlined" color="error" startIcon={<CancelIcon />} onClick={() => { setDialog({ open: true, request, action: 'reject' }); setNote(''); }}>ปฏิเสธ</Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      <Dialog open={detailDialog.open} onClose={() => setDetailDialog({ open: false, request: null })} maxWidth="sm" fullWidth>
        <DialogTitle>รายละเอียดคำขอ</DialogTitle>
        <DialogContent dividers>
          {detailDialog.request && (
            <Box sx={{ pt: 1 }}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>เลขที่คำขอ</Typography>
                <Typography fontWeight={600}>{detailDialog.request.requestNo}</Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>ผู้ขอ</Typography>
                <Typography>{detailDialog.request.requester?.displayName || detailDialog.request.requester?.adUsername}</Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>วัตถุประสงค์</Typography>
                <Typography>{detailDialog.request.purpose}</Typography>
              </Box>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>รายการที่ขอยืม:</Typography>
              {detailDialog.request.items.map((item) => (
                <Box key={item.id} sx={{ p: 1.5, mb: 1.5, backgroundColor: alpha(theme.palette.primary.main, 0.05), borderRadius: 2, border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}` }}>
                  <Typography fontWeight={600} color="primary.main" sx={{ fontSize: '0.95rem' }}>
                    {item.asset ? (item.asset.assetName || item.asset.assetCode || '-') : item.inventoryItem ? `${item.inventoryItem.name} (จำนวน ${item.quantity})` : '-'}
                  </Typography>
                  <Grid container spacing={1} sx={{ mt: 0.5 }}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        <strong>ยี่ห้อ/รุ่น:</strong> {`${item.asset?.brand || ''} ${item.asset?.model || ''}`.trim() || '-'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        <strong>เลขเครื่อง:</strong> {item.asset?.serialNo || '-'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog({ open: false, request: null })}>ปิด</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dialog.open} onClose={() => setDialog({ open: false, request: null, action: null })} maxWidth="sm" fullWidth>
        <DialogTitle>{dialog.action === 'approve' ? 'ยืนยันการอนุมัติ' : 'ยืนยันการปฏิเสธ'}</DialogTitle>
        <DialogContent dividers>
          {dialog.request && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                คำขอ: <strong>{dialog.request.requestNo}</strong> | ผู้ขอ: <strong>{dialog.request.requester?.displayName}</strong>
              </Typography>
              {dialog.action === 'approve' && (
                <Alert severity="info" sx={{ mb: 2 }}>อนุมัติแล้วคำขอนี้จะถูกส่งต่อให้ IT Admin ดำเนินการจ่ายของ</Alert>
              )}
              <TextField
                label="หมายเหตุ" fullWidth multiline rows={3} value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={dialog.action === 'approve' ? 'เพิ่มหมายเหตุเพื่ออนุมัติ (ถ้ามี)' : 'ระบุเหตุผลการปฏิเสธ'}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog({ open: false, request: null, action: null })}>ยกเลิก</Button>
          <Button
            variant="contained" color={dialog.action === 'approve' ? 'success' : 'error'}
            onClick={handleAction} disabled={processing}
            startIcon={dialog.action === 'approve' ? <CheckCircleIcon /> : <CancelIcon />}
          >
            {processing ? <CircularProgress size={20} /> : dialog.action === 'approve' ? 'ยืนยันอนุมัติ' : 'ยืนยันปฏิเสธ'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
