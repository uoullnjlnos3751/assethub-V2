import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel, Chip, CircularProgress, Alert,
  Card, CardContent, Grid, Divider, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { borrowAPI } from '../../services/api';

const conditions = [
  { value: 'Normal', label: 'ปกติ' },
  { value: 'Damaged', label: 'เสียหาย' },
  { value: 'Repairing', label: 'ส่งซ่อม' },
  { value: 'AccessoryIncomplete', label: 'อุปกรณ์เสริมไม่ครบ' },
];

interface BorrowItem {
  id: number;
  requestNo: string;
  requesterName: string;
  assetCode: string;
  serialNo: string;
  brand: string;
  model: string;
  borrowDate: string;
  dueDate: string;
  itemStatus: 'active' | 'returned';
}

export default function ReturnPage() {
  const [items, setItems] = useState<BorrowItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<BorrowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<{ open: boolean; item: BorrowItem | null }>({ open: false, item: null });
  const [detailDialog, setDetailDialog] = useState<{ open: boolean; item: BorrowItem | null }>({ open: false, item: null });
  const [condition, setCondition] = useState('Normal');
  const [damageNote, setDamageNote] = useState('');
  const [accessoriesNote, setAccessoriesNote] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await borrowAPI.allRequests({ limit: 200 });
      const allItems = res.data.data
        .flatMap((r: any) =>
          (r.items || [])
            .filter((i: any) => ['CheckedOut', 'PartiallyReturned'].includes(i.itemStatus))
            .map((i: any) => ({
              ...i,
              requestNo: r.requestNo,
              requesterName: r.requester?.displayName,
              assetCode: i.asset?.assetCode,
              serialNo: i.asset?.serialNo,
              brand: i.asset?.brand,
              model: i.asset?.model,
            }))
        )
        .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      setItems(allItems);
      setFilteredItems(allItems);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const filtered = items.filter((item) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        item.requestNo.includes(searchLower) ||
        item.requesterName?.toLowerCase().includes(searchLower) ||
        item.assetCode?.toLowerCase().includes(searchLower) ||
        item.serialNo?.toLowerCase().includes(searchLower)
      );
    });
    setFilteredItems(filtered);
  }, [searchTerm, items]);

  const handleReturn = async () => {
    if (!dialog.item) return;
    if (!condition) {
      setError('กรุณาเลือกสภาพเครื่อง');
      return;
    }

    setProcessing(true);
    setError('');
    try {
      await borrowAPI.returnItem(dialog.item.id, { condition, damageNote, accessoriesNote });
      setSuccess('คืนทรัพย์สินสำเร็จ');
      setDialog({ open: false, item: null });
      setCondition('Normal');
      setDamageNote('');
      setAccessoriesNote('');
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'เกิดข้อผิดพลาด');
    } finally {
      setProcessing(false);
    }
  };

  const overdueItems = items.filter((i) => new Date(i.dueDate) < new Date());

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
          รับคืนทรัพย์สิน
        </Typography>
        <Typography variant="body1" color="text.secondary">
          บันทึกการคืนทรัพย์สินและสภาพการใช้งาน
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
      {items.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  รอการคืน
                </Typography>
                <Typography variant="h5" fontWeight={700}>
                  {items.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  เกินกำหนดคืน
                </Typography>
                <Typography variant="h5" fontWeight={700} color="error.main">
                  {overdueItems.length}
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
          placeholder="ค้นหาด้วยเลขที่คำขอ, ผู้ยืม, รหัส"
        />
      </Box>

      {/* Items Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'rgba(37, 99, 235, 0.05)' }}>
                <TableCell>เลขที่คำขอ</TableCell>
                <TableCell>ผู้ยืม</TableCell>
                <TableCell>รหัส</TableCell>
                <TableCell>Serial</TableCell>
                <TableCell>วันยืม</TableCell>
                <TableCell>ก กำหนดคืน</TableCell>
                <TableCell>สถานะ</TableCell>
                <TableCell align="right">การกระทำ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      {items.length === 0 ? 'ไม่มีรายการรอการคืน' : 'ไม่พบผลการค้นหา'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => {
                  const isOverdue = new Date(item.dueDate) < new Date();
                  return (
                    <TableRow
                      key={item.id}
                      hover
                      sx={{
                        backgroundColor: isOverdue ? 'rgba(211, 47, 47, 0.05)' : 'inherit',
                      }}
                    >
                      <TableCell sx={{ fontWeight: 600 }}>{item.requestNo}</TableCell>
                      <TableCell>{item.requesterName}</TableCell>
                      <TableCell>{item.assetCode}</TableCell>
                      <TableCell>{item.serialNo}</TableCell>
                      <TableCell>{new Date(item.borrowDate).toLocaleDateString('th-TH')}</TableCell>
                      <TableCell
                        sx={{
                          color: isOverdue ? 'error.main' : 'inherit',
                          fontWeight: isOverdue ? 600 : 'inherit',
                        }}
                      >
                        {new Date(item.dueDate).toLocaleDateString('th-TH')}
                        {isOverdue && ' ⚠️'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={item.itemStatus === 'active' ? 'ยังยืม' : 'ส่งคืนแล้ว'}
                          color={item.itemStatus === 'active' ? 'warning' : 'success'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          startIcon={<VisibilityIcon />}
                          onClick={() => setDetailDialog({ open: true, item })}
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
                            setDialog({ open: true, item });
                            setCondition('Normal');
                          }}
                        >
                          คืน
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Detail Dialog */}
      <Dialog
        open={detailDialog.open}
        onClose={() => setDetailDialog({ open: false, item: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>รายละเอียดการยืม</DialogTitle>
        <DialogContent dividers>
          {detailDialog.item && (
            <Box sx={{ pt: 1 }}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  เลขที่คำขอ
                </Typography>
                <Typography fontWeight={600}>{detailDialog.item.requestNo}</Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  ผู้ยืม
                </Typography>
                <Typography>{detailDialog.item.requesterName}</Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  ทรัพย์สิน
                </Typography>
                <Typography fontWeight={600}>{detailDialog.item.assetCode}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {detailDialog.item.brand} {detailDialog.item.model} | {detailDialog.item.serialNo}
                </Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  วันที่ยืม
                </Typography>
                <Typography>
                  {new Date(detailDialog.item.borrowDate).toLocaleDateString('th-TH')}
                </Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  กำหนดคืน
                </Typography>
                <Typography
                  color={
                    new Date(detailDialog.item.dueDate) < new Date() ? 'error' : 'inherit'
                  }
                  fontWeight={
                    new Date(detailDialog.item.dueDate) < new Date() ? 600 : 'inherit'
                  }
                >
                  {new Date(detailDialog.item.dueDate).toLocaleDateString('th-TH')}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog({ open: false, item: null })}>ปิด</Button>
        </DialogActions>
      </Dialog>

      {/* Return Dialog */}
      <Dialog
        open={dialog.open}
        onClose={() => setDialog({ open: false, item: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>บันทึกการคืนทรัพย์สิน</DialogTitle>
        <DialogContent dividers>
          {dialog.item && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {dialog.item.assetCode} | {dialog.item.brand} {dialog.item.model}
              </Typography>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>สภาพเครื่อง *</InputLabel>
                <Select
                  value={condition}
                  label="สภาพเครื่อง *"
                  onChange={(e) => {
                    setCondition(e.target.value);
                    setDamageNote('');
                    setAccessoriesNote('');
                  }}
                >
                  {conditions.map((c) => (
                    <MenuItem key={c.value} value={c.value}>
                      {c.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {(condition === 'Damaged' || condition === 'Repairing') && (
                <TextField
                  label="รายละเอียดความเสียหาย"
                  fullWidth
                  multiline
                  rows={2}
                  value={damageNote}
                  onChange={(e) => setDamageNote(e.target.value)}
                  placeholder="บรรยายสภาพเสียหาย"
                  sx={{ mb: 2 }}
                />
              )}

              {condition === 'AccessoryIncomplete' && (
                <TextField
                  label="อุปกรณ์เสริมที่ไม่ครบ"
                  fullWidth
                  multiline
                  rows={2}
                  value={accessoriesNote}
                  onChange={(e) => setAccessoriesNote(e.target.value)}
                  placeholder="ระบุอุปกรณ์ที่ไม่มา"
                />
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog({ open: false, item: null })}>ยกเลิก</Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleReturn}
            disabled={processing || !condition}
          >
            {processing ? <CircularProgress size={20} /> : 'ยืนยันการคืน'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
