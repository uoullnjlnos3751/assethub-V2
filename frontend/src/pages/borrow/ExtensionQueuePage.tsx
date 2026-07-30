import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Chip, CircularProgress, Alert, Card, CardContent, Grid, Divider, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ExtensionIcon from '@mui/icons-material/Extension';
import { borrowAPI } from '../../services/api';
import { formatDate } from '../../utils/dateUtils';


interface Extension {
  id: number;
  requestNo: string;
  requester: { displayName: string; adUsername: string };
  assetCode: string;
  brand: string;
  model: string;
  serialNo: string;
  currentDueDate: string;
  requestedExtraDays: number;
  reason: string;
  status: string;
  decisionNote: string | null;
  decidedBy: string | null;
  createdAt: string;
}

export default function ExtensionQueuePage() {
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [filteredExtensions, setFilteredExtensions] = useState<Extension[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<{ open: boolean; extension: Extension | null; action: 'approve' | 'reject' | null }>({
    open: false,
    extension: null,
    action: null,
  });
  const [detailDialog, setDetailDialog] = useState<{ open: boolean; extension: Extension | null }>({
    open: false,
    extension: null,
  });
  const [note, setNote] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await borrowAPI.extensions();
      const raw = Array.isArray(res.data) ? res.data : (res.data.data || []);
      
      const mapped: Extension[] = raw.map((ext: any) => {
        const item = ext.items?.[0];
        return {
          id: ext.id,
          requestNo: ext.request?.requestNo || '',
          requester: ext.request?.requester || { displayName: 'N/A', adUsername: '' },
          assetCode: item?.requestItem?.asset?.assetCode || '',
          brand: item?.requestItem?.asset?.brand || '',
          model: item?.requestItem?.asset?.model || '',
          serialNo: item?.requestItem?.asset?.serialNo || '',
          currentDueDate: item?.oldDueDate || '',
          requestedExtraDays: item?.extraDays || ext.items?.[0]?.extraDays || 0,
          reason: ext.reason || '',
          status: ext.status || '',
          decisionNote: ext.decisionNote || null,
          decidedBy: ext.decidedBy || null,
          createdAt: ext.createdAt,
        };
      });

      setExtensions(mapped);
      setFilteredExtensions(mapped);
    } catch (err) {
      setExtensions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const filtered = extensions.filter((ext) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        ext.requestNo.includes(searchLower) ||
        ext.requester?.displayName?.toLowerCase().includes(searchLower) ||
        ext.assetCode?.toLowerCase().includes(searchLower) ||
        ext.reason?.toLowerCase().includes(searchLower)
      );
    });
    setFilteredExtensions(filtered);
  }, [searchTerm, extensions]);

  const handleAction = async () => {
    if (!dialog.extension || !dialog.action) return;
    setProcessing(true);
    setError('');

    try {
      await borrowAPI.approveExtension(dialog.extension.id, {
        action: dialog.action === 'approve' ? 'Approved' : 'Rejected',
        note,
      });
      setSuccess(
        dialog.action === 'approve' ? 'อนุมัติขยายวันสำเร็จ' : 'ปฏิเสธคำขอขยายวัน'
      );
      setDialog({ open: false, extension: null, action: null });
      setNote('');
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
        <Typography variant="h4" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ExtensionIcon /> ขอขยายวันยืม
        </Typography>
        <Typography variant="body1" color="text.secondary">
          พิจารณาและอนุมัติคำขอขยายวันการยืมทรัพย์สิน
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
      {extensions.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  รอการอนุมัติ
                </Typography>
                <Typography variant="h5" fontWeight={700}>
                  {extensions.length}
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
          placeholder="ค้นหาด้วยเลขที่, ผู้ขอ, รหัส"
        />
      </Box>

      {/* Extensions Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'rgba(37, 99, 235, 0.05)' }}>
                <TableCell>คำขอที่</TableCell>
                <TableCell>ผู้ขอ</TableCell>
                <TableCell>รหัส</TableCell>
                <TableCell>Serial</TableCell>
                <TableCell>วันก ำหนด<br/>เดิม</TableCell>
                <TableCell align="center">ขอเพิ่ม<br/>(วัน)</TableCell>
                <TableCell>เหตุผล</TableCell>
                <TableCell align="right">การกระทำ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredExtensions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      {extensions.length === 0 ? 'ไม่มีคำขอขยายวัน' : 'ไม่พบผลการค้นหา'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredExtensions.map((ext) => (
                  <TableRow key={ext.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{ext.requestNo}</TableCell>
                    <TableCell>{ext.requester?.displayName || ext.requester?.adUsername}</TableCell>
                    <TableCell>{ext.assetCode}</TableCell>
                    <TableCell>{ext.serialNo}</TableCell>
                    <TableCell>{formatDate(ext.currentDueDate)}</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`+${ext.requestedExtraDays}`}
                        color="primary"
                        variant="outlined"
                        size="small"
                      />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 150 }}>
                      <Typography variant="body2">{ext.reason}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        startIcon={<VisibilityIcon />}
                        onClick={() => setDetailDialog({ open: true, extension: ext })}
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
                          setDialog({ open: true, extension: ext, action: 'approve' });
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
                          setDialog({ open: true, extension: ext, action: 'reject' });
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

      {/* Detail Dialog */}
      <Dialog
        open={detailDialog.open}
        onClose={() => setDetailDialog({ open: false, extension: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>รายละเอียดคำขอขยายวัน</DialogTitle>
        <DialogContent dividers>
          {detailDialog.extension && (
            <Box sx={{ pt: 1 }}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  เลขที่คำขอ
                </Typography>
                <Typography fontWeight={600}>{detailDialog.extension.requestNo}</Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  ผู้ขอ
                </Typography>
                <Typography>{detailDialog.extension.requester?.displayName}</Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  ทรัพย์สิน
                </Typography>
                <Typography fontWeight={600}>{detailDialog.extension.assetCode}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {detailDialog.extension.brand} {detailDialog.extension.model} |{' '}
                  {detailDialog.extension.serialNo}
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  วันกำหนดคืนเดิม
                </Typography>
                <Typography>
                  {formatDate(detailDialog.extension.currentDueDate)}
                </Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  ขอเพิ่มเติม
                </Typography>
                <Chip label={`${detailDialog.extension.requestedExtraDays} วัน`} color="primary" />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  วันกำหนดคืนใหม่ (หากอนุมัติ)
                </Typography>
                <Typography fontWeight={600}>
                  {new Date(
                    new Date(detailDialog.extension.currentDueDate).getTime() +
                      detailDialog.extension.requestedExtraDays * 24 * 60 * 60 * 1000
                  ).toLocaleDateString('th-TH')}
                </Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  เหตุผล
                </Typography>
                <Typography>{detailDialog.extension.reason}</Typography>
              </Box>

              <Box sx={{ pt: 2, borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  ขอเมื่อ: {new Date(detailDialog.extension.createdAt).toLocaleString('th-TH')}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog({ open: false, extension: null })}>ปิด</Button>
        </DialogActions>
      </Dialog>

      {/* Action Dialog */}
      <Dialog
        open={dialog.open}
        onClose={() => setDialog({ open: false, extension: null, action: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {dialog.action === 'approve' ? (
            <>
              <CheckCircleIcon color="success" /> ยืนยันการอนุมัติ
            </>
          ) : (
            <>
              <CancelIcon color="error" /> ยืนยันการปฏิเสธ
            </>
          )}
        </DialogTitle>
        <DialogContent dividers>
          {dialog.extension && (
            <Box sx={{ pt: 1 }}>
              <Box sx={{ mb: 2, p: 2, bgcolor: '#F8FAFC', borderRadius: 2 }}>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  คำขอ: <strong>{dialog.extension.requestNo}</strong>
                </Typography>
                <Typography variant="body2">
                  ผู้ขอ: <strong>{dialog.extension.requester?.displayName}</strong>
                </Typography>
                <Typography variant="body2">
                  ทรัพย์สิน: <strong>{dialog.extension.assetCode}</strong> {dialog.extension.brand} {dialog.extension.model}
                </Typography>
              </Box>

              <Typography variant="body2" sx={{ mb: 2 }}>
                ขอขยายเวลา:{' '}
                <Chip
                  label={`+${dialog.extension.requestedExtraDays} วัน`}
                  color="primary"
                  size="small"
                />
                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  (กำหนดคืนเดิม: {formatDate(dialog.extension.currentDueDate)})
                </Typography>
              </Typography>

              {dialog.action === 'reject' ? (
                <TextField
                  label="เหตุผลการไม่อนุมัติ *"
                  fullWidth
                  multiline
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  error={note.trim() === ''}
                  helperText="กรุณาระบุเหตุผลการไม่อนุมัติ เพื่อให้ผู้ขอรับทราบ"
                  placeholder="เช่น ทรัพย์สินมีความจำเป็นต้องใช้งานต่อ, ไม่สามารถขยายเวลาได้เนื่องจาก..."
                  sx={{ mb: 1 }}
                />
              ) : (
                <TextField
                  label="หมายเหตุ (ถ้ามี)"
                  fullWidth
                  multiline
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="เพิ่มหมายเหตุสำหรับอนุมัติ"
                />
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog({ open: false, extension: null, action: null })}>
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            color={dialog.action === 'approve' ? 'success' : 'error'}
            onClick={handleAction}
            disabled={processing || (dialog.action === 'reject' && note.trim() === '')}
          >
            {processing ? (
              <CircularProgress size={20} />
            ) : dialog.action === 'approve' ? (
              'ยืนยันอนุมัติ'
            ) : (
              'ยืนยันไม่อนุมัติ'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
