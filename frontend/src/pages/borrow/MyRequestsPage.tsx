import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Button, Alert, Chip,
  CircularProgress, Grid, Divider, Dialog, DialogTitle, DialogContent, DialogActions,
  Tabs, Tab, TextField, InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AddIcon from '@mui/icons-material/Add';
import { borrowAPI } from '../../services/api';

const statusMeta: Record<string, { color: 'warning' | 'success' | 'error' | 'info' | 'primary' | 'default'; label: string }> = {
  Pending: { color: 'warning', label: 'รออนุมัติ' },
  Approved: { color: 'info', label: 'อนุมัติแล้ว' },
  Rejected: { color: 'error', label: 'ปฏิเสธ' },
  CheckedOut: { color: 'success', label: 'ส่งมอบแล้ว' },
  PartiallyReturned: { color: 'primary', label: 'คืนบางส่วน' },
  Returned: { color: 'default', label: 'คืนแล้ว' },
};

const tabStatuses = ['Pending', 'Approved', 'CheckedOut', 'Returned'];

export default function MyRequestsPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [openDetail, setOpenDetail] = useState(false);

  useEffect(() => { fetchRequests(); }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await borrowAPI.myRequests();
      setRequests(res.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'ไม่สามารถโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = requests
    .filter((r) => r.status === tabStatuses[activeTab])
    .filter((r) => {
      if (!searchTerm) return true;
      const s = searchTerm.toLowerCase();
      return r.requestNo?.toLowerCase().includes(s) || r.purpose?.toLowerCase().includes(s) ||
        r.items?.some((i: any) => i.asset?.assetCode?.toLowerCase().includes(s));
    });

  const countByStatus = (s: string) => requests.filter((r) => r.status === s).length;

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ pb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>คำขอยืมของฉัน</Typography>
          <Typography variant="body1" color="text.secondary">ติดตามสถานะและรายละเอียดของคำขอยืมทรัพย์สิน</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/borrow/new')}>ยืมใหม่</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { status: 'Pending', label: 'รออนุมัติ', color: 'warning' as const },
          { status: 'Approved', label: 'อนุมัติแล้ว', color: 'info' as const },
          { status: 'CheckedOut', label: 'ส่งมอบแล้ว', color: 'success' as const },
          { status: 'Returned', label: 'คืนแล้ว', color: 'default' as const },
        ].map((s) => (
          <Grid item xs={6} md={3} key={s.status}>
            <Card><CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>{s.label}</Typography>
              <Typography variant="h5" fontWeight={700} color={`${s.color}.main`}>{countByStatus(s.status)}</Typography>
            </CardContent></Card>
          </Grid>
        ))}
      </Grid>

      <TextField label="ค้นหา" fullWidth size="small" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
        InputProps={{
          startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
          endAdornment: searchTerm ? <InputAdornment position="end"><ClearIcon sx={{ cursor: 'pointer' }} onClick={() => setSearchTerm('')} /></InputAdornment> : null,
        }}
        placeholder="ค้นหาด้วยเลขที่คำขอหรือวัตถุประสงค์" sx={{ mb: 2 }}
      />

      <Box sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label={`รออนุมัติ (${countByStatus('Pending')})`} />
          <Tab label={`อนุมัติแล้ว (${countByStatus('Approved')})`} />
          <Tab label={`ส่งมอบแล้ว (${countByStatus('CheckedOut')})`} />
          <Tab label={`คืนแล้ว (${countByStatus('Returned')})`} />
        </Tabs>
      </Box>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, color: '#9CA3AF' }}>เลขที่คำขอ</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#9CA3AF' }}>วัตถุประสงค์</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#9CA3AF' }}>รายการ</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#9CA3AF' }}>วันที่ขอ</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#9CA3AF' }}>สถานะ</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#9CA3AF' }} align="right">การกระทำ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRequests.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}><Typography color="text.secondary">ไม่มีรายการ</Typography></TableCell></TableRow>
              ) : (
                filteredRequests.map((r) => {
                  const meta = statusMeta[r.status] || { color: 'default' as const, label: r.status };
                  return (
                    <TableRow key={r.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{r.requestNo}</TableCell>
                      <TableCell>{r.purpose || '-'}</TableCell>
                      <TableCell>{r.items?.length || 0} รายการ</TableCell>
                      <TableCell>{new Date(r.createdAt).toLocaleDateString('th-TH')}</TableCell>
                      <TableCell><Chip label={meta.label} color={meta.color} size="small" /></TableCell>
                      <TableCell align="right">
                        <Button size="small" startIcon={<VisibilityIcon />} onClick={() => { setSelectedRequest(r); setOpenDetail(true); }}>ดู</Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog open={openDetail} onClose={() => setOpenDetail(false)} maxWidth="sm" fullWidth>
        <DialogTitle>รายละเอียดคำขอยืม</DialogTitle>
        <DialogContent dividers>
          {selectedRequest && (
            <Box sx={{ pt: 1 }}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">เลขที่คำขอ</Typography>
                <Typography fontWeight={600}>{selectedRequest.requestNo}</Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">สถานะ</Typography>
                <Chip label={statusMeta[selectedRequest.status]?.label || selectedRequest.status} color={(statusMeta[selectedRequest.status]?.color as any) || 'default'} />
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">วัตถุประสงค์</Typography>
                <Typography>{selectedRequest.purpose || '-'}</Typography>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>รายการที่ขอยืม:</Typography>
              {selectedRequest.items?.map((item: any) => (
                <Box key={item.id} sx={{ p: 1.5, mb: 1, bgcolor: '#FEF9F5', borderRadius: 2, border: '1px solid #F0E6DE' }}>
                  <Typography fontWeight={600}>{item.asset?.assetCode || 'N/A'}</Typography>
                  <Typography variant="caption" color="text.secondary">{item.asset?.serialNo || ''} | {item.asset?.brand || ''} {item.asset?.model || ''}</Typography>
                </Box>
              ))}
              <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #F0E6DE' }}>
                <Typography variant="caption" color="text.secondary" display="block">ขอเมื่อ: {new Date(selectedRequest.createdAt).toLocaleString('th-TH')}</Typography>
                {selectedRequest.approvals?.length > 0 && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    อนุมัติเมื่อ: {new Date(selectedRequest.approvals[0].actedAt).toLocaleString('th-TH')}
                  </Typography>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setOpenDetail(false)}>ปิด</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
