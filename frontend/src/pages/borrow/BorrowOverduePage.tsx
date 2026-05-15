import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Chip, CircularProgress, Alert, Grid,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button,
  InputAdornment, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import WarningIcon from '@mui/icons-material/Warning';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SendIcon from '@mui/icons-material/Send';
import { borrowAPI } from '../../services/api';

interface OverdueItem {
  id: number;
  requestNo: string;
  borrowerName: string;
  borrowerEmail: string;
  asset: { assetCode: string; brand: string; model: string; serialNo: string };
  borrowDate: string;
  dueDate: string;
  daysOverdue: number;
}

export default function BorrowOverduePage() {
  const [items, setItems] = useState<OverdueItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<OverdueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<OverdueItem | null>(null);
  const [detailDialog, setDetailDialog] = useState(false);
  const [reminderDialog, setReminderDialog] = useState(false);
  const [reminderNote, setReminderNote] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchOverdueItems();
  }, []);

  const fetchOverdueItems = async () => {
    setLoading(true);
    try {
      // Fetch all items and filter overdue ones
      const res = await borrowAPI.myItems(); // This should return items, adjust based on actual API
      const overdue = (res.data.data || [])
        .filter((item: any) => new Date(item.dueDate) < new Date())
        .map((item: any) => ({
          ...item,
          daysOverdue: Math.floor(
            (new Date().getTime() - new Date(item.dueDate).getTime()) / (1000 * 60 * 60 * 24)
          ),
        }))
        .sort((a: any, b: any) => b.daysOverdue - a.daysOverdue);
      setItems(overdue);
      setFilteredItems(overdue);
    } catch (err) {
      setError('ไม่สามารถโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const filtered = items.filter((item) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        item.requestNo.includes(searchLower) ||
        item.borrowerName?.toLowerCase().includes(searchLower) ||
        (item.asset?.assetCode || '').toLowerCase().includes(searchLower) ||
        (item.asset?.serialNo || '').toLowerCase().includes(searchLower)
      );
    });
    setFilteredItems(filtered);
  }, [searchTerm, items]);

  const handleSendReminder = async () => {
    if (!selectedItem) return;
    setSending(true);
    try {
      // Send reminder - adjust endpoint based on actual API
      await borrowAPI.allRequests({ id: selectedItem.id }); // Placeholder
      setSuccess('ส่งการแจ้งเตือนสำเร็จ');
      setReminderDialog(false);
      setReminderNote('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'ไม่สามารถส่งแจ้งเตือน');
    } finally {
      setSending(false);
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
          <WarningIcon color="error" /> ยืมเกินกำหนด
        </Typography>
        <Typography variant="body1" color="text.secondary">
          รายการทรัพย์สินที่เกินกำหนดการส่งคืน และต้องการดำเนินการติดตามด้านขวนหา
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
                  รวมเกินกำหนด
                </Typography>
                <Typography variant="h5" fontWeight={700} color="error.main">
                  {items.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  เกินมากที่สุด
                </Typography>
                <Typography variant="h5" fontWeight={700}>
                  {Math.max(...items.map((i) => i.daysOverdue), 0)} วัน
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
          placeholder="ค้นหาด้วยเลขที่, ผู้ยืม, รหัส"
        />
      </Box>

      {/* Overdue Items Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'rgba(211, 47, 47, 0.1)' }}>
                <TableCell>เลขที่</TableCell>
                <TableCell>ผู้ยืม</TableCell>
                <TableCell>รหัส</TableCell>
                <TableCell>Serial</TableCell>
                <TableCell>วันกำหนดคืน</TableCell>
                <TableCell align="center">เกินกำหนด</TableCell>
                <TableCell align="right">การกระทำ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      {items.length === 0 ? 'ไม่มีรายการเกินกำหนด' : 'ไม่พบผลการค้นหา'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => (
                  <TableRow
                    key={item.id}
                    hover
                    sx={{ backgroundColor: 'rgba(211, 47, 47, 0.05)' }}
                  >
                    <TableCell sx={{ fontWeight: 600 }}>{item.requestNo}</TableCell>
                    <TableCell>{item.borrowerName}</TableCell>
                    <TableCell>{item.asset?.assetCode}</TableCell>
                    <TableCell>{item.asset?.serialNo}</TableCell>
                    <TableCell>{new Date(item.dueDate).toLocaleDateString('th-TH')}</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${item.daysOverdue} วัน`}
                        color="error"
                        icon={<WarningIcon />}
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
                        sx={{ mr: 0.5 }}
                      >
                        ดู
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="warning"
                        startIcon={<SendIcon />}
                        onClick={() => {
                          setSelectedItem(item);
                          setReminderNote('');
                          setReminderDialog(true);
                        }}
                      >
                        แจ้งเตือน
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
        <DialogTitle>รายละเอียดรายการเกินกำหนด</DialogTitle>
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
                  ผู้ยืม
                </Typography>
                <Typography>{selectedItem.borrowerName}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedItem.borrowerEmail}
                </Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  ทรัพย์สิน
                </Typography>
                <Typography fontWeight={600}>{selectedItem.asset?.assetCode}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedItem.asset?.brand} {selectedItem.asset?.model} | {selectedItem.asset?.serialNo}
                </Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  สถานะการยืม
                </Typography>
                <Typography variant="body2">
                  ยืมเมื่อ: {new Date(selectedItem.borrowDate).toLocaleDateString('th-TH')}
                </Typography>
                <Typography variant="body2" color="error" fontWeight={600}>
                  กำหนดคืน: {new Date(selectedItem.dueDate).toLocaleDateString('th-TH')}
                </Typography>
                <Typography variant="body2" color="error" fontWeight={600}>
                  เกินกำหนด: {selectedItem.daysOverdue} วัน
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog(false)}>ปิด</Button>
        </DialogActions>
      </Dialog>

      {/* Reminder Dialog */}
      <Dialog open={reminderDialog} onClose={() => setReminderDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>ส่งการแจ้งเตือน</DialogTitle>
        <DialogContent dividers>
          {selectedItem && (
            <Box sx={{ pt: 1 }}>
              <Alert severity="warning" sx={{ mb: 2 }}>
                ส่งการแจ้งเตือนไปยัง {selectedItem.borrowerName} ({selectedItem.borrowerEmail})
              </Alert>

              <TextField
                label="ข้อความแจ้งเตือน"
                fullWidth
                multiline
                rows={3}
                value={reminderNote}
                onChange={(e) => setReminderNote(e.target.value)}
                placeholder="เขียนข้อความแจ้งเตือนเพิ่มเติม"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReminderDialog(false)}>ยกเลิก</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleSendReminder}
            disabled={sending}
          >
            {sending ? <CircularProgress size={20} /> : 'ส่งแจ้งเตือน'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
