import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Chip, CircularProgress, Card, CardContent, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Button, Grid, InputAdornment, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import { borrowAPI } from '../../services/api';
import { formatDate } from '../../utils/dateUtils';


interface HistoryRecord {
  id: number;
  requestNo: string;
  requester: { displayName: string; adUsername: string };
  department: string;
  purpose: string;
  status: 'pending' | 'approved' | 'rejected' | 'checked_out' | 'returned';
  items: Array<{
    asset?: { assetCode: string; brand: string; model: string; serialNo: string } | null;
    assetCode?: string;
    brand?: string;
    model?: string;
    serialNo?: string;
    inventoryItem?: { id: number; name: string; unit: string } | null;
    quantity?: number;
    isQuantityBased?: boolean;
    condition?: string;
    returns?: Array<{
      receiverName?: string;
      returnedAt?: string;
      returner?: { displayName: string; adUsername: string };
    }>;
  }>;
  createdAt: string;
  approvedAt?: string;
  checkedOutAt?: string;
  returnedAt?: string;
  totalItems: number;
}

const getStatusColor = (status: string) => {
  const colors: Record<string, any> = {
    pending: { color: 'warning', label: 'รออนุมัติ' },
    approved: { color: 'info', label: 'อนุมัติแล้ว' },
    rejected: { color: 'error', label: 'ปฏิเสธ' },
    checked_out: { color: 'success', label: 'ส่งมอบแล้ว' },
    returned: { color: 'default', label: 'ส่งคืนแล้ว' },
  };
  return colors[status] || { color: 'default', label: status };
};

export default function BorrowHistoryPage() {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<HistoryRecord | null>(null);
  const [detailDialog, setDetailDialog] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await borrowAPI.history({ limit: 500 });
      setRecords(res.data.data || []);
      setFilteredRecords(res.data.data || []);
    } catch (err) {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = records;

    if (filterStatus !== 'all') {
      filtered = filtered.filter((r) => r.status === filterStatus);
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.requestNo.includes(searchLower) ||
          r.requester?.displayName?.toLowerCase().includes(searchLower) ||
          r.purpose.toLowerCase().includes(searchLower) ||
          r.items.some(
            (item) =>
              (item.assetCode || item.asset?.assetCode || '').toLowerCase().includes(searchLower) ||
              (item.serialNo || item.asset?.serialNo || '').toLowerCase().includes(searchLower) ||
              (item.inventoryItem?.name || '').toLowerCase().includes(searchLower)
          )
      );
    }

    setFilteredRecords(filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  }, [searchTerm, filterStatus, records]);

  const statusStats = {
    pending: records.filter((r) => r.status === 'pending').length,
    approved: records.filter((r) => r.status === 'approved').length,
    rejected: records.filter((r) => r.status === 'rejected').length,
    checked_out: records.filter((r) => r.status === 'checked_out').length,
    returned: records.filter((r) => r.status === 'returned').length,
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
          ประวัติการยืมทั้งหมด
        </Typography>
        <Typography variant="body1" color="text.secondary">
          ดูประวัติการยืมและส่งคืนทรัพย์สินทั้งหมด
        </Typography>
      </Box>

      {/* Statistics */}
      {records.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card
              sx={{
                cursor: 'pointer',
                backgroundColor: filterStatus === 'all' ? 'rgba(37, 99, 235, 0.1)' : 'inherit',
              }}
              onClick={() => setFilterStatus('all')}
            >
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  ทั้งหมด
                </Typography>
                <Typography variant="h5" fontWeight={700}>
                  {records.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {[
            { key: 'pending', label: 'รออนุมัติ' },
            { key: 'approved', label: 'อนุมัติ' },
            { key: 'checked_out', label: 'ส่งมอบ' },
            { key: 'returned', label: 'ส่งคืน' },
          ].map((stat) => (
            <Grid
              item
              xs={12}
              sm={6}
              md={2.4}
              key={stat.key}
              onClick={() => setFilterStatus(stat.key)}
            >
              <Card
                sx={{
                  cursor: 'pointer',
                  backgroundColor:
                    filterStatus === stat.key ? 'rgba(37, 99, 235, 0.1)' : 'inherit',
                }}
              >
                <CardContent>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {stat.label}
                  </Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {statusStats[stat.key as keyof typeof statusStats]}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
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

      {/* History Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'rgba(37, 99, 235, 0.05)' }}>
                <TableCell>เลขที่คำขอ</TableCell>
                <TableCell>ผู้ขอ</TableCell>
                <TableCell>แผนก</TableCell>
                <TableCell>วัตถุประสงค์</TableCell>
                <TableCell align="center">จำนวน</TableCell>
                <TableCell>สถานะ</TableCell>
                <TableCell>ผู้รับคืน</TableCell>
                <TableCell>วันที่ขอ</TableCell>
                <TableCell align="right">การกระทำ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      {records.length === 0 ? 'ไม่มีประวัติการยืม' : 'ไม่พบผลการค้นหา'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((record) => {
                  const statusInfo = getStatusColor(record.status);
                  const receivers = record.items
                    .flatMap(item => item.returns || [])
                    .map(ret => ret.receiverName || ret.returner?.displayName || ret.returner?.adUsername)
                    .filter(Boolean);
                  const uniqueReceivers = [...new Set(receivers)];
                  const receiverDisplay = uniqueReceivers.length > 0 ? uniqueReceivers.join(', ') : '-';

                  return (
                    <TableRow key={record.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{record.requestNo}</TableCell>
                      <TableCell>{record.requester?.displayName || record.requester?.adUsername}</TableCell>
                      <TableCell>{record.department || '-'}</TableCell>
                      <TableCell>{record.purpose}</TableCell>
                      <TableCell align="center">{record.totalItems} รายการ</TableCell>
                      <TableCell>
                        <Chip label={statusInfo.label} color={statusInfo.color} size="small" />
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.85rem' }}>{receiverDisplay}</TableCell>
                      <TableCell>{formatDate(record.createdAt)}</TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          startIcon={<VisibilityIcon />}
                          onClick={() => {
                            setSelectedRecord(record);
                            setDetailDialog(true);
                          }}
                          sx={{ mr: 0.5 }}
                        >
                          ดู
                        </Button>
                        <Button size="small" startIcon={<DownloadIcon />}>
                          ส่งออก
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
      <Dialog open={detailDialog} onClose={() => setDetailDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>รายละเอียดประวัติการยืม</DialogTitle>
        <DialogContent dividers>
          {selectedRecord && (
            <Box sx={{ pt: 1 }}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  เลขที่คำขอ
                </Typography>
                <Typography fontWeight={600}>{selectedRecord.requestNo}</Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  ผู้ขอ
                </Typography>
                <Typography>{selectedRecord.requester?.displayName}</Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  สถานะ
                </Typography>
                <Chip
                  label={getStatusColor(selectedRecord.status).label}
                  color={getStatusColor(selectedRecord.status).color}
                />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  วัตถุประสงค์
                </Typography>
                <Typography>{selectedRecord.purpose}</Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                รายการที่ยืม:
              </Typography>
              {selectedRecord.items.map((item, index) => (
                <Box
                  key={index}
                  sx={{
                    p: 1.5,
                    mb: 1,
                    backgroundColor: 'rgba(37, 99, 235, 0.05)',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  {item.isQuantityBased && item.inventoryItem ? (
                    <Box sx={{ mb: 0.5 }}>
                      <Typography fontWeight={600}>{item.inventoryItem.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        จำนวน: {item.quantity} {item.inventoryItem.unit}
                      </Typography>
                    </Box>
                  ) : (
                    <>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                        <Typography fontWeight={600}>{item.asset?.assetCode || item.assetCode}</Typography>
                        {item.condition && (
                          <Chip label={item.condition} size="small" color={item.condition === 'Normal' ? 'success' : 'warning'} />
                        )}
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {item.asset?.serialNo || item.serialNo} | {item.asset?.brand || item.brand} {item.asset?.model || item.model}
                      </Typography>
                    </>
                  )}
                  {item.returns && item.returns.length > 0 && (
                    <Box sx={{ mt: 1, pt: 1, borderTop: '1px dashed', borderColor: 'divider' }}>
                      {item.returns.map((ret, rIdx) => (
                        <Box key={rIdx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            📥 ผู้รับคืน: <strong>{ret.receiverName || ret.returner?.displayName || ret.returner?.adUsername || '-'}</strong>
                          </Typography>
                          {ret.returnedAt && (
                            <Typography variant="caption" color="text.secondary">
                              {formatDate(ret.returnedAt)}
                            </Typography>
                          )}
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              ))}

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                {selectedRecord.createdAt && (
                  <>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        วันที่ขอ
                      </Typography>
                      <Typography variant="body2">
                        {new Date(selectedRecord.createdAt).toLocaleString('th-TH')}
                      </Typography>
                    </Box>
                  </>
                )}
                {selectedRecord.approvedAt && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      วันที่อนุมัติ
                    </Typography>
                    <Typography variant="body2">
                      {new Date(selectedRecord.approvedAt).toLocaleString('th-TH')}
                    </Typography>
                  </Box>
                )}
                {selectedRecord.checkedOutAt && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      วันที่ส่งมอบ
                    </Typography>
                    <Typography variant="body2">
                      {new Date(selectedRecord.checkedOutAt).toLocaleString('th-TH')}
                    </Typography>
                  </Box>
                )}
                {selectedRecord.returnedAt && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      วันที่ส่งคืน
                    </Typography>
                    <Typography variant="body2">
                      {new Date(selectedRecord.returnedAt).toLocaleString('th-TH')}
                    </Typography>
                  </Box>
                )}
              </Box>
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
