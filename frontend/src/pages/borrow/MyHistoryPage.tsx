import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Chip, CircularProgress, Card, CardContent, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Button, Grid, InputAdornment, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { borrowAPI } from '../../services/api';

interface HistoryItem {
  id: number;
  requestNo: string;
  assetCode: string;
  serialNo: string;
  brand: string;
  model: string;
  borrowDate: string;
  dueDate: string;
  returnDate?: string;
  condition?: string;
  damageNotes?: string;
  daysKept: number;
}

export default function MyHistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [detailDialog, setDetailDialog] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await borrowAPI.myHistory();
      const history = (res.data.data || res.data || [])
        .map((item: any) => ({
          ...item,
          assetCode: item.asset?.assetCode,
          serialNo: item.asset?.serialNo,
          brand: item.asset?.brand,
          model: item.asset?.model,
          requestNo: item.request?.requestNo,
          daysKept: Math.floor(
            (new Date(item.returnDate || new Date()).getTime() - new Date(item.borrowDate).getTime()) / (1000 * 60 * 60 * 24)
          ),
        }))
        .sort((a: any, b: any) => new Date(b.borrowDate).getTime() - new Date(a.borrowDate).getTime());
      setItems(history);
      setFilteredItems(history);
    } catch (err) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const filtered = items.filter((item) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        item.assetCode?.toLowerCase().includes(searchLower) ||
        item.serialNo?.toLowerCase().includes(searchLower) ||
        item.brand?.toLowerCase().includes(searchLower) ||
        item.model?.toLowerCase().includes(searchLower) ||
        item.requestNo?.includes(searchLower)
      );
    });
    setFilteredItems(filtered);
  }, [searchTerm, items]);

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
          ประวัติการยืมของฉัน
        </Typography>
        <Typography variant="body1" color="text.secondary">
          ดูรายการทรัพย์สินที่เคยยืมและส่งคืนแล้ว
        </Typography>
      </Box>

      {/* Statistics */}
      {items.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  ทั้งหมด
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
                  เฉลี่ยระยะเวลาการยืม
                </Typography>
                <Typography variant="h5" fontWeight={700}>
                  {items.length > 0
                    ? Math.round(items.reduce((acc, item) => acc + item.daysKept, 0) / items.length)
                    : 0}{' '}
                  วัน
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  สภาพปกติ
                </Typography>
                <Typography variant="h5" fontWeight={700} color="success.main">
                  {items.filter((i) => i.condition === 'Normal' || !i.condition).length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  มีความเสียหาย
                </Typography>
                <Typography variant="h5" fontWeight={700} color="error.main">
                  {items.filter((i) => i.condition && i.condition !== 'Normal').length}
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
          placeholder="ค้นหาด้วยรหัส, Serial, ยี่ห้อ"
        />
      </Box>

      {/* History Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'rgba(37, 99, 235, 0.05)' }}>
                <TableCell>รหัส</TableCell>
                <TableCell>Serial</TableCell>
                <TableCell>ยี่ห้อ/รุ่น</TableCell>
                <TableCell>วันที่ยืม</TableCell>
                <TableCell>วันที่คืน</TableCell>
                <TableCell align="center">จำนวนวัน</TableCell>
                <TableCell>สภาพตอนคืน</TableCell>
                <TableCell align="right">การกระทำ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      {items.length === 0 ? 'ยังไม่มีประวัติการยืม' : 'ไม่พบผลการค้นหา'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{item.assetCode}</TableCell>
                    <TableCell>{item.serialNo}</TableCell>
                    <TableCell>
                      {item.brand} {item.model}
                    </TableCell>
                    <TableCell>{new Date(item.borrowDate).toLocaleDateString('th-TH')}</TableCell>
                    <TableCell>
                      {item.returnDate
                        ? new Date(item.returnDate).toLocaleDateString('th-TH')
                        : '-'}
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={`${item.daysKept} วัน`} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={
                          item.condition === 'Damaged'
                            ? 'เสียหาย'
                            : item.condition === 'Repairing'
                            ? 'ส่งซ่อม'
                            : item.condition === 'AccessoryIncomplete'
                            ? 'อุปกรณ์ไม่ครบ'
                            : 'ปกติ'
                        }
                        color={
                          item.condition === 'Normal' || !item.condition
                            ? 'success'
                            : 'warning'
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        startIcon={<VisibilityIcon />}
                        onClick={() => {
                          setSelectedItem(item);
                          setDetailDialog(true);
                        }}
                      >
                        ดู
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
      <Dialog open={detailDialog} onClose={() => setDetailDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>รายละเอียดการยืม</DialogTitle>
        <DialogContent dividers>
          {selectedItem && (
            <Box sx={{ pt: 1 }}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  เลขที่คำขอ
                </Typography>
                <Typography fontWeight={600}>{selectedItem.requestNo}</Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  ทรัพย์สิน
                </Typography>
                <Typography fontWeight={600}>{selectedItem.assetCode}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedItem.brand} {selectedItem.model} | {selectedItem.serialNo}
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    วันที่ยืม
                  </Typography>
                  <Typography>
                    {new Date(selectedItem.borrowDate).toLocaleDateString('th-TH')}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    วันที่คืน
                  </Typography>
                  <Typography>
                    {selectedItem.returnDate
                      ? new Date(selectedItem.returnDate).toLocaleDateString('th-TH')
                      : '-'}
                  </Typography>
                </Grid>
              </Grid>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    ระยะเวลา
                  </Typography>
                  <Typography fontWeight={600}>{selectedItem.daysKept} วัน</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    สภาพตอนคืน
                  </Typography>
                  <Chip
                    label={
                      selectedItem.condition === 'Damaged'
                        ? 'เสียหาย'
                        : selectedItem.condition === 'Repairing'
                        ? 'ส่งซ่อม'
                        : 'ปกติ'
                    }
                    color={
                      selectedItem.condition === 'Normal' || !selectedItem.condition
                        ? 'success'
                        : 'warning'
                    }
                    size="small"
                  />
                </Grid>
              </Grid>

              {selectedItem.damageNotes && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    หมายเหตุ
                  </Typography>
                  <Typography variant="body2">{selectedItem.damageNotes}</Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog(false)}>ปิด</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
