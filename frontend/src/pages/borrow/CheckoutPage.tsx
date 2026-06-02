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
  items: Array<{ 
    id: number; 
    quantity: number; 
    isQuantityBased: boolean; 
    asset?: { 
      id: number;
      assetCode: string | null; 
      assetName: string | null;
      serialNo: string | null;
      brand: string | null; 
      model: string | null; 
      type: string | null;
    }; 
    inventoryItem?: { 
      id: number; 
      name: string; 
      unit: string;
    } 
  }>;
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
        r.items.some((item) =>
          (item.asset?.assetCode || item.inventoryItem?.name || '').toLowerCase().includes(searchLower)
        )
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
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{request.items.length} รายการ</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={request.items.map(item => item.isQuantityBased ? item.inventoryItem?.name : `${item.asset?.brand || ''} ${item.asset?.model || ''}`.trim()).filter(Boolean).join(', ')}>
                        {request.items.map(item => item.isQuantityBased ? item.inventoryItem?.name : `${item.asset?.brand || ''} ${item.asset?.model || ''}`.trim()).filter(Boolean).join(', ')}
                      </Typography>
                    </TableCell>
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
                    p: 2,
                    mb: 1.5,
                    background: 'rgba(255, 255, 255, 0.9)',
                    border: '1px solid rgba(226, 232, 240, 0.8)',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-1px)',
                      boxShadow: '0 4px 12px rgba(0, 113, 227, 0.05)'
                    }
                  }}
                >
                  {item.isQuantityBased && item.inventoryItem ? (
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="body2" fontWeight={700} color="text.primary">
                          {item.inventoryItem.name}
                        </Typography>
                        <Chip 
                          label="วัสดุสิ้นเปลือง" 
                          size="small" 
                          sx={{ 
                            height: 18, 
                            fontSize: '0.65rem', 
                            fontWeight: 600, 
                            bgcolor: 'rgba(234, 88, 12, 0.08)', 
                            color: 'rgb(234, 88, 12)', 
                            border: '1px solid rgba(234, 88, 12, 0.15)' 
                          }} 
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        จำนวนที่ขอ: <strong>{item.quantity} {item.inventoryItem.unit}</strong>
                      </Typography>
                    </Box>
                  ) : (
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="body2" fontWeight={700} color="primary.main" sx={{ fontSize: '0.85rem' }}>
                          {item.asset?.assetCode || item.asset?.assetName || 'ไม่มีรหัสทรัพย์สิน'}
                        </Typography>
                        {item.asset?.type && (
                          <Chip 
                            label={item.asset.type} 
                            size="small" 
                            sx={{ 
                              height: 18, 
                              fontSize: '0.65rem', 
                              fontWeight: 600, 
                              bgcolor: 'rgba(0, 113, 227, 0.06)', 
                              color: '#0071e3', 
                              border: '1px solid rgba(0, 113, 227, 0.12)' 
                            }} 
                          />
                        )}
                      </Box>
                      
                      <Grid container spacing={1}>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary" display="block">ยี่ห้อ / รุ่น</Typography>
                          <Typography variant="body2" fontWeight={600} color="text.primary">
                            {item.asset?.brand || '—'} {item.asset?.model || '—'}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary" display="block">หมายเลขซีเรียล (S/N)</Typography>
                          <Typography variant="body2" fontWeight={600} color="text.primary" sx={{ fontFamily: 'monospace', letterSpacing: '0.02em' }}>
                            {item.asset?.serialNo || '—'}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Box>
                  )}
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
              <Box sx={{ p: 2, mb: 3, backgroundColor: 'rgba(0, 113, 227, 0.03)', border: '1px solid rgba(0, 113, 227, 0.1)', borderRadius: '10px' }}>
                <Typography variant="subtitle2" color="primary.main" fontWeight={700} sx={{ mb: 1.5, fontSize: '0.85rem' }}>
                  📄 รายละเอียดคำขอยืม {dialog.request.requestNo}
                </Typography>
                
                <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary" display="block">ผู้ขอ</Typography>
                    <Typography variant="body2" fontWeight={600}>{dialog.request.requester?.displayName || dialog.request.requester?.adUsername}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary" display="block">วันที่ขอ</Typography>
                    <Typography variant="body2" fontWeight={600}>{new Date(dialog.request.createdAt).toLocaleDateString('th-TH')}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary" display="block">วัตถุประสงค์</Typography>
                    <Typography variant="body2">{dialog.request.purpose || '—'}</Typography>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 1.5, borderColor: 'rgba(0, 113, 227, 0.08)' }} />

                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>รายการที่ต้องส่งมอบ</Typography>
                {dialog.request.items.map((item) => (
                  <Box
                    key={item.id}
                    sx={{
                      p: 2,
                      mb: 1.5,
                      background: 'rgba(255, 255, 255, 0.9)',
                      border: '1px solid rgba(226, 232, 240, 0.8)',
                      borderRadius: '12px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
                    }}
                  >
                    {item.isQuantityBased && item.inventoryItem ? (
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="body2" fontWeight={700} color="text.primary">
                            {item.inventoryItem.name}
                          </Typography>
                          <Chip 
                            label="วัสดุสิ้นเปลือง" 
                            size="small" 
                            sx={{ 
                              height: 18, 
                              fontSize: '0.65rem', 
                              fontWeight: 600, 
                              bgcolor: 'rgba(234, 88, 12, 0.08)', 
                              color: 'rgb(234, 88, 12)', 
                              border: '1px solid rgba(234, 88, 12, 0.15)' 
                            }} 
                          />
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          จำนวน: <strong>{item.quantity} {item.inventoryItem.unit}</strong>
                        </Typography>
                      </Box>
                    ) : (
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="body2" fontWeight={700} color="primary.main" sx={{ fontSize: '0.85rem' }}>
                            {item.asset?.assetCode || item.asset?.assetName || 'ไม่มีรหัสทรัพย์สิน'}
                          </Typography>
                          {item.asset?.type && (
                            <Chip 
                              label={item.asset.type} 
                              size="small" 
                              sx={{ 
                                height: 18, 
                                fontSize: '0.65rem', 
                                fontWeight: 600, 
                                bgcolor: 'rgba(0, 113, 227, 0.06)', 
                                color: '#0071e3', 
                                border: '1px solid rgba(0, 113, 227, 0.12)' 
                              }} 
                            />
                          )}
                        </Box>
                        
                        <Grid container spacing={1}>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="caption" color="text.secondary" display="block">ยี่ห้อ / รุ่น</Typography>
                            <Typography variant="body2" fontWeight={600} color="text.primary">
                              {item.asset?.brand || '—'} {item.asset?.model || '—'}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="caption" color="text.secondary" display="block">หมายเลขซีเรียล (S/N)</Typography>
                            <Typography variant="body2" fontWeight={600} color="text.primary" sx={{ fontFamily: 'monospace', letterSpacing: '0.02em' }}>
                              {item.asset?.serialNo || '—'}
                            </Typography>
                          </Grid>
                        </Grid>
                      </Box>
                    )}
                  </Box>
                ))}
              </Box>

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
