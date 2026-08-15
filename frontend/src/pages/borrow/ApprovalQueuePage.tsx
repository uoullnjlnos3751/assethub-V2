import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Chip, CircularProgress, Alert, Card, CardContent, Grid, Divider, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, InputAdornment, useMediaQuery, useTheme, alpha
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import VisibilityIcon from '@mui/icons-material/Visibility';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { borrowAPI } from '../../services/api';
import { formatDate } from '../../utils/dateUtils';

interface QueueStats {
  pending: number; pendingOverDay: number;
  approvedToday: number; rejectedThisMonth: number;
  avgApprovalHours: number | null;
}

// Real policy text from BUSINESS-RULES.md §2 — not decorative copy.
const APPROVAL_RULES = [
  'อนุมัติขั้นเดียวโดย IT Admin — ไม่มีขั้นตามมูลค่าและไม่มีสายบังคับบัญชา',
  'ต้องอนุมัติภายใน 1 วันทำการ เกินแล้วระบบเตือน IT Admin ทุกเช้า 09:00',
  'ปฏิเสธคำขอต้องระบุเหตุผลเสมอ ระบบแจ้งผู้ขอทันที',
  'หัวหน้าผู้ขอได้รับสำเนาอีเมลเพื่อรับทราบ ไม่ต้องกดอนุมัติ',
];

interface Request {
  id: number;
  requestNo: string;
  requester: { displayName: string; adUsername: string; department?: string; company?: string };
  department: string;
  departmentId?: string;
  purpose: string;
  items: Array<{
    id: number;
    asset?: { assetCode: string; assetName: string; type: string; deviceType?: string; brand: string; model: string; serialNo: string; company?: string; cpuGeneration?: string; ramDetail?: string; gpu?: string };
    inventoryItem?: { name: string };
    quantity?: number;
  }>;
  createdAt: string;
}

export default function ApprovalQueuePage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<{ open: boolean; request: Request | null; action: 'approve' | 'reject' | null }>({
    open: false,
    request: null,
    action: null,
  });
  const [detailDialog, setDetailDialog] = useState<{ open: boolean; request: Request | null }>({ open: false, request: null });
  const [note, setNote] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState<QueueStats | null>(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await borrowAPI.allRequests({ status: 'Pending', limit: 200 });
      setRequests(res.data.data || []);
      setFilteredRequests(res.data.data || []);
    } catch (err) {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    borrowAPI.stats().then(res => setStats(res.data)).catch(() => setStats(null));
  }, []);

  useEffect(() => {
    const filtered = requests.filter((r) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        r.requestNo.includes(searchLower) ||
        r.requester?.displayName?.toLowerCase().includes(searchLower) ||
        r.purpose.toLowerCase().includes(searchLower) ||
        r.items.some((item) => item.asset?.assetCode?.toLowerCase().includes(searchLower))
      );
    });
    setFilteredRequests(filtered);
  }, [searchTerm, requests]);

  const handleAction = async () => {
    if (!dialog.request || !dialog.action) return;
    setProcessing(true);
    setError('');

    try {
      await borrowAPI.approve(dialog.request.id, {
        action: dialog.action === 'approve' ? 'Approved' : 'Rejected',
        note,
      });
      setSuccess(dialog.action === 'approve' ? 'อนุมัติคำขอสำเร็จ' : 'ปฏิเสธคำขอสำเร็จ');
      setDialog({ open: false, request: null, action: null });
      setNote('');
      fetchData();
      // The 4 stat cards (pending-over-1-day, approved today, etc.) come from
      // a separate endpoint fetched once on mount — without this they kept
      // showing pre-action numbers after every approve/reject.
      borrowAPI.stats().then(res => setStats(res.data)).catch(() => {});
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
          อนุมัติคำขอยืม
        </Typography>
        <Typography variant="body1" color="text.secondary">
          ตรวจสอบและอนุมัติคำขอยืมทรัพย์สิน
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
      {stats && (
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={6} sm={4} md={2.4}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom noWrap>รอการอนุมัติ</Typography>
                <Typography variant="h5" fontWeight={700} color={stats.pendingOverDay > 0 ? 'warning.main' : 'text.primary'}>
                  {stats.pending}
                </Typography>
                {stats.pendingOverDay > 0 && (
                  <Typography variant="caption" color="warning.main" display="block">เกิน 1 วันทำการ {stats.pendingOverDay} คำขอ</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={4} md={2.4}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom noWrap>อนุมัติวันนี้</Typography>
                <Typography variant="h5" fontWeight={700} color="success.main">{stats.approvedToday}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={4} md={2.4}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom noWrap>ปฏิเสธเดือนนี้</Typography>
                <Typography variant="h5" fontWeight={700} color="error.main">{stats.rejectedThisMonth}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={4} md={2.4}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom noWrap>เวลาเฉลี่ยดำเนินการ</Typography>
                <Typography variant="h5" fontWeight={700}>
                  {stats.avgApprovalHours != null ? `${stats.avgApprovalHours} ชม.` : '—'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Approval rules — real policy from BUSINESS-RULES.md, informational only */}
      <Card sx={{ mb: 3, bgcolor: alpha(theme.palette.info.main, 0.06), border: `1px solid ${alpha(theme.palette.info.main, 0.2)}` }}>
        <CardContent sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
          <InfoOutlinedIcon color="info" fontSize="small" sx={{ mt: 0.25 }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>กฎที่ระบบบังคับใช้</Typography>
            <Box component="ul" sx={{ m: 0, pl: 2.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {APPROVAL_RULES.map((rule) => (
                <Typography component="li" key={rule} variant="body2" color="text.secondary">{rule}</Typography>
              ))}
            </Box>
          </Box>
        </CardContent>
      </Card>

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

      {/* Requests List/Table */}
      {isMobile ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filteredRequests.length === 0 ? (
            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
              {requests.length === 0 ? 'ไม่มีคำขอรอการอนุมัติ' : 'ไม่พบผลการค้นหา'}
            </Typography>
          ) : (
            filteredRequests.map((request) => (
              <Card key={request.id} sx={{ borderRadius: 3 }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="body2" fontWeight={700} color="primary.main">
                      {request.requestNo}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(request.createdAt)}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 2 }}>
                    <Typography variant="body2">
                      <strong>ผู้ขอ:</strong> {request.requester?.displayName || request.requester?.adUsername}
                    </Typography>
                    <Typography variant="body2">
                      <strong>แผนก:</strong> {(request.requester as any)?.department || request.departmentId || '-'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      <strong>วัตถุประสงค์:</strong> {request.purpose}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>จำนวน:</strong> {request.items.length} รายการ
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      size="small"
                      startIcon={<VisibilityIcon />}
                      onClick={() => setDetailDialog({ open: true, request })}
                      variant="outlined"
                      sx={{ flex: 1, borderRadius: 2 }}
                    >
                      ดู
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      startIcon={<CheckCircleIcon />}
                      onClick={() => {
                        setDialog({ open: true, request, action: 'approve' });
                        setNote('');
                      }}
                      sx={{ flex: 1, borderRadius: 2 }}
                    >
                      อนุมัติ
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<CancelIcon />}
                      onClick={() => {
                        setDialog({ open: true, request, action: 'reject' });
                        setNote('');
                      }}
                      sx={{ flex: 1, borderRadius: 2 }}
                    >
                      ปฏิเสธ
                    </Button>
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
                  <TableCell>แผนก</TableCell>
                  <TableCell>บริษัท</TableCell>
                  <TableCell>วัตถุประสงค์</TableCell>
                  <TableCell>จำนวนรายการ</TableCell>
                  <TableCell>วันที่ขอ</TableCell>
                  <TableCell align="right">การกระทำ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        {requests.length === 0 ? 'ไม่มีคำขอรอการอนุมัติ' : 'ไม่พบผลการค้นหา'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map((request) => (
                    <TableRow key={request.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{request.requestNo}</TableCell>
                      <TableCell>{request.requester?.displayName || request.requester?.adUsername}</TableCell>
                      <TableCell>{(request.requester as any)?.department || request.departmentId || '-'}</TableCell>
                      <TableCell>{(request.requester as any)?.company || '-'}</TableCell>
                      <TableCell>{request.purpose}</TableCell>
                      <TableCell>{request.items.length} รายการ</TableCell>
                      <TableCell>{formatDate(request.createdAt)}</TableCell>
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
                          color="success"
                          startIcon={<CheckCircleIcon />}
                          onClick={() => {
                            setDialog({ open: true, request, action: 'approve' });
                            setNote('');
                          }}
                          sx={{ mr: 0.5 }}
                        >
                          อนุมัติ
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={<CancelIcon />}
                          onClick={() => {
                            setDialog({ open: true, request, action: 'reject' });
                            setNote('');
                          }}
                        >
                          ปฏิเสธ
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

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
                <Typography>{detailDialog.request.requester?.displayName || detailDialog.request.requester?.adUsername}</Typography>
              </Box>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    แผนก
                  </Typography>
                  <Typography>{(detailDialog.request.requester as any)?.department || detailDialog.request.departmentId || '-'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    บริษัท
                  </Typography>
                  <Typography>{(detailDialog.request.requester as any)?.company || '-'}</Typography>
                </Grid>
              </Grid>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  วัตถุประสงค์
                </Typography>
                <Typography>{detailDialog.request.purpose}</Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                รายการที่ขอยืม:
              </Typography>
              {detailDialog.request.items.map((item) => (
                <Box
                  key={item.id}
                  sx={{
                    p: 1.5,
                    mb: 1.5,
                    backgroundColor: alpha(theme.palette.primary.main, 0.05),
                    borderRadius: 2,
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
                  }}
                >
                  <Typography fontWeight={600} color="primary.main" gutterBottom sx={{ fontSize: '0.95rem' }}>
                    {item.asset 
                      ? item.asset.assetName || item.asset.assetCode || '-'
                      : item.inventoryItem 
                        ? `${item.inventoryItem.name} (จำนวน ${item.quantity})`
                        : '-'
                    }
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        <strong>ประเภท (Type):</strong> {item.asset?.deviceType || item.asset?.type || '-'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        <strong>ยี่ห้อ/รุ่น (Brand/Model):</strong> {`${item.asset?.brand || ''} ${item.asset?.model || ''}`.trim() || '-'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        <strong>เลขเครื่อง (Serial No):</strong> {item.asset?.serialNo || '-'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        <strong>บริษัท (Company):</strong> {item.asset?.company || '-'}
                      </Typography>
                    </Grid>
                    {item.asset?.cpuGeneration && (
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          <strong>CPU:</strong> {item.asset?.cpuGeneration}
                        </Typography>
                      </Grid>
                    )}
                    {item.asset?.ramDetail && (
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          <strong>RAM:</strong> {item.asset?.ramDetail}
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </Box>
              ))}

              <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  ขอเมื่อ: {new Date(detailDialog.request.createdAt).toLocaleString('th-TH')}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog({ open: false, request: null })}>ปิด</Button>
        </DialogActions>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={dialog.open} onClose={() => setDialog({ open: false, request: null, action: null })} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialog.action === 'approve' ? 'ยืนยันการอนุมัติ' : 'ยืนยันการปฏิเสธ'}
        </DialogTitle>
        <DialogContent dividers>
          {dialog.request && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                คำขอ: <strong>{dialog.request.requestNo}</strong> | ผู้ขอ: <strong>{dialog.request.requester?.displayName}</strong>
              </Typography>

              <TextField
                label="หมายเหตุ"
                fullWidth
                multiline
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  dialog.action === 'approve'
                    ? 'เพิ่มหมายเหตุเพื่ออนุมัติ (ถ้ามี)'
                    : 'ระบุเหตุผลการปฏิเสธ'
                }
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog({ open: false, request: null, action: null })}>ยกเลิก</Button>
          <Button
            variant="contained"
            color={dialog.action === 'approve' ? 'success' : 'error'}
            onClick={handleAction}
            disabled={processing}
            startIcon={dialog.action === 'approve' ? <CheckCircleIcon /> : <CancelIcon />}
          >
            {processing ? (
              <CircularProgress size={20} />
            ) : dialog.action === 'approve' ? (
              'ยืนยันอนุมัติ'
            ) : (
              'ยืนยันปฏิเสธ'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
