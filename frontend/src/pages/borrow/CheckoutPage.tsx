import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Chip, CircularProgress, Alert, Card, CardContent, CardActions, Grid, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import HandymanIcon from '@mui/icons-material/Handyman';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { borrowAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface Request {
  id: number;
  requestNo: string;
  requester: { displayName: string; adUsername: string };
  purpose: string;
  items: Array<{ id: number; asset: { assetCode: string; brand: string; model: string } }>;
  createdAt: string;
}

export default function CheckoutPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<{ open: boolean; request: Request | null }>({ open: false, request: null });
  const [detailDialog, setDetailDialog] = useState<{ open: boolean; request: Request | null }>({ open: false, request: null });
  const [receivedBy, setReceivedBy] = useState(user?.displayName || user?.adUsername || '');
  const [handoverNote, setHandoverNote] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = () => {
    setLoading(true);
    borrowAPI.allRequests({ status: 'Approved' })
      .then((res) => {
        setRequests(res.data.data || []);
        setFilteredRequests(res.data.data || []);
      })
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const filtered = requests.filter((r) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        r.requestNo.includes(searchLower) ||
        r.requester?.displayName?.toLowerCase().includes(searchLower) ||
        r.purpose.toLowerCase().includes(searchLower) ||
        r.items.some((item) => (item.asset?.assetCode || '').toLowerCase().includes(searchLower))
      );
    });
    setFilteredRequests(filtered);
  }, [searchTerm, requests]);

  const handleCheckout = async () => {
    if (!dialog.request) return;
    if (!receivedBy.trim()) {
      setError('กรุณากรอกชื่อผู้รับมอบ');
      return;
    }

    setProcessing(true);
    setError('');
    try {
      await borrowAPI.checkout(dialog.request.id, { receivedBy, handoverNote });
      setSuccess('ส่งมอบทรัพย์สินสำเร็จ');
      setDialog({ open: false, request: null });
      setReceivedBy('');
      setHandoverNote('');
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'เกิดข้อผิดพลาด');
    } finally {
      setProcessing(false);
    }
  };

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );

  return (
    <Box sx={{ pb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          ส่งมอบทรัพย์สิน (Check-out)
        </Typography>
        <Typography variant="body1" color="text.secondary">
          อนุมัติและส่งมอบทรัพย์สินให้แก่ผู้ยืม
        </Typography>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Statistics */}
      {requests.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  รอการส่งมอบ
                </Typography>
                <Typography variant="h5" fontWeight={700}>
                  {requests.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Search */}
      <Box sx={{ mb: 2 }}>
        <TextField
          label="ค้นหา"
          fullWidth
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <ClearIcon
                  sx={{ cursor: 'pointer' }}
                  onClick={() => setSearchTerm('')}
                />
              </InputAdornment>
            ),
          }}
          placeholder="ค้นหาด้วยเลขที่, ผู้ขอ, หรือวัตถุประสงค์"
        />
      </Box>

      {/* Requests Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'rgba(37, 99, 235, 0.05)' }}>
                <TableCell>เลขที่คำขอ</TableCell>
                <TableCell>ผู้ขอ</TableCell>
                <TableCell>วัตถุประสงค์</TableCell>
                <TableCell>จำนวนรายการ</TableCell>
                <TableCell>วันที่ขอ</TableCell>
                <TableCell align="right">การกระทำ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      {requests.length === 0 ? 'ไม่มีคำขอรอการส่งมอบ' : 'ไม่พบผลการค้นหา'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((request) => (
                  <TableRow key={request.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{request.requestNo}</TableCell>
                    <TableCell>{request.requester?.displayName || request.requester?.adUsername}</TableCell>
                    <TableCell>{request.purpose}</TableCell>
                    <TableCell>{request.items.length} รายการ</TableCell>
                    <TableCell>{new Date(request.createdAt).toLocaleDateString('th-TH')}</TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        startIcon={<VisibilityIcon />}
                        onClick={() => setDetailDialog({ open: true, request })}
                        sx={{ mr: 0.5 }}
                      >
                        ดู
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<HandymanIcon />}
                        onClick={() => setDialog({ open: true, request })}
                      >
                        ส่งมอบ
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Detail Dialog */}
      <Dialog
        open={detailDialog.open}
        onClose={() => setDetailDialog({ open: false, request: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>รายละเอียดคำขอ</DialogTitle>
        <DialogContent dividers>
          {detailDialog.request && (
            <Box sx={{ pt: 1 }}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  เลขที่คำขอ
                </Typography>
                <Typography fontWeight={600}>{detailDialog.request.requestNo}</Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  ผู้ขอ
                </Typography>
                <Typography>{detailDialog.request.requester?.displayName}</Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  วัตถุประสงค์
                </Typography>
                <Typography>{detailDialog.request.purpose}</Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                รายการที่ขอ:
              </Typography>
              {detailDialog.request.items.map((item) => (
                <Box
                  key={item.id}
                  sx={{
                    p: 1,
                    mb: 1,
                    backgroundColor: 'rgba(37, 99, 235, 0.05)',
                    borderRadius: 1,
                  }}
                >
                  <Typography fontWeight={600}>{item.asset?.assetCode}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.asset?.brand} {item.asset?.model}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog({ open: false, request: null })}>ปิด</Button>
        </DialogActions>
      </Dialog>

      {/* Checkout Dialog */}
      <Dialog open={dialog.open} onClose={() => setDialog({ open: false, request: null })} maxWidth="sm" fullWidth>
        <DialogTitle>ยืนยันการส่งมอบทรัพย์สิน</DialogTitle>
        <DialogContent dividers>
          {dialog.request && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                คำขอ: <strong>{dialog.request.requestNo}</strong> | ผู้ขอ: <strong>{dialog.request.requester?.displayName}</strong>
              </Typography>

              <TextField
                label="ชื่อผู้รับมอบ *"
                fullWidth
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
                error={receivedBy.trim() === '' && processing}
                helperText={receivedBy.trim() === '' && processing ? 'จำเป็นต้องกรอก' : ''}
                sx={{ mb: 2 }}
              />

              <TextField
                label="หมายเหตุการส่งมอบ"
                fullWidth
                multiline
                rows={3}
                value={handoverNote}
                onChange={(e) => setHandoverNote(e.target.value)}
                placeholder="เช่น ส่งมอบเรียบร้อย, สภาพปกติ"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog({ open: false, request: null })}>ยกเลิก</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleCheckout}
            disabled={processing || !receivedBy.trim()}
          >
            {processing ? <CircularProgress size={20} /> : 'ยืนยันส่งมอบ'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
