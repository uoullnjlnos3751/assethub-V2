import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Chip, Grid, CircularProgress, Button,
  Alert, Divider, Tabs, Tab,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ReturnIcon from '@mui/icons-material/AssignmentReturn';
import VisibilityIcon from '@mui/icons-material/Visibility';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { borrowAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const statusMeta: Record<string, { color: 'warning' | 'info' | 'success' | 'default' | 'error'; label: string }> = {
  Pending: { color: 'warning', label: 'รออนุมัติ' },
  Approved: { color: 'info', label: 'อนุมัติแล้ว' },
  CheckedOut: { color: 'success', label: 'กำลังยืม' },
  PartiallyReturned: { color: 'warning', label: 'คืนบางส่วน' },
  Returned: { color: 'default', label: 'คืนแล้ว' },
  Rejected: { color: 'error', label: 'ปฏิเสธ' },
};

export default function MyItemsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);

  const tabs = ['ทั้งหมด', 'รออนุมัติ', 'อนุมัติแล้ว', 'กำลังยืม', 'คืนแล้ว'];
  const tabFilters = ['', 'Pending', 'Approved', 'CheckedOut', 'Returned'];

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await borrowAPI.myRequests({ limit: 100 });
      setRequests(res.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'ไม่สามารถโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const filtered = requests.filter((r) => {
    if (!tabFilters[activeTab]) return true;
    return r.status === tabFilters[activeTab];
  });

  const countBy = (s: string) => requests.filter((r) => r.status === s).length;

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ pb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>รายการที่กำลังยืม</Typography>
          <Typography variant="body2" color="text.secondary">ติดตามสถานะคำขอยืมและจัดการส่งคืน</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/borrow/new')}>ยืมใหม่</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'ทั้งหมด', value: requests.length, color: 'primary' as const },
          { label: 'รออนุมัติ', value: countBy('Pending'), color: 'warning' as const },
          { label: 'อนุมัติแล้ว', value: countBy('Approved'), color: 'info' as const },
          { label: 'กำลังยืม', value: countBy('CheckedOut'), color: 'success' as const },
          { label: 'คืนแล้ว', value: countBy('Returned'), color: 'default' as const },
        ].map((s) => (
          <Grid item xs={6} sm={4} md key={s.label}>
            <Card><CardContent sx={{ py: 1.5, px: 2, textAlign: 'center' }}>
              <Typography variant="h5" fontWeight={800} color={`${s.color}.main`}>{s.value}</Typography>
              <Typography variant="caption" color="text.secondary">{s.label}</Typography>
            </CardContent></Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} variant="scrollable" scrollButtons="auto">
          {tabs.map((t, i) => <Tab key={t} label={`${t} (${i === 0 ? requests.length : countBy(tabFilters[i])})`} />)}
        </Tabs>
      </Box>

      {filtered.length === 0 ? (
        <Card><CardContent sx={{ textAlign: 'center', py: 6 }}>
          <Typography color="text.secondary" gutterBottom>ไม่มีรายการในสถานะนี้</Typography>
          <Button variant="contained" sx={{ mt: 2 }} onClick={() => navigate('/borrow/new')}>ยืมทรัพย์สินใหม่</Button>
        </CardContent></Card>
      ) : (
        <Grid container spacing={2}>
          {filtered.map((req) => {
            const mainStatus = statusMeta[req.status] || { color: 'default' as const, label: req.status };
            return (
              <Grid item xs={12} key={req.id}>
                <Card sx={{ borderLeft: `4px solid ${
                  req.status === 'Pending' ? '#F59E0B' :
                  req.status === 'Approved' ? '#3B82F6' :
                  req.status === 'CheckedOut' ? '#10B981' :
                  req.status === 'Returned' ? '#6B7280' : '#EF4444'
                }` }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1, flexWrap: 'wrap', gap: 1 }}>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography fontWeight={800} fontSize="1rem">{req.requestNo}</Typography>
                          <Chip label={mainStatus.label} color={mainStatus.color} size="small" />
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {user?.displayName || user?.adUsername} — {req.purpose || 'ไม่มีวัตถุประสงค์'}
                        </Typography>
                      </Box>
                      {req.status === 'Approved' && (
                        <Chip icon={<HourglassEmptyIcon />} label="รอการส่งมอบ" color="info" size="small" variant="outlined" />
                      )}
                      {req.status === 'Pending' && (
                        <Chip icon={<HourglassEmptyIcon />} label="รอIT Admin อนุมัติ" color="warning" size="small" variant="outlined" />
                      )}
                    </Box>

                    <Divider sx={{ my: 1.5 }} />

                    <Grid container spacing={1}>
                      {req.items?.map((item: any) => {
                        const itemStatusMeta = statusMeta[item.itemStatus] || { color: 'default' as const, label: item.itemStatus };
                        return (
                          <Grid item xs={12} sm={6} md={4} key={item.id}>
                            <Box sx={{
                              p: 1.5, borderRadius: 1, border: '1px solid #E5E7EB', bgcolor: '#F9FAFB',
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1,
                            }}>
                              <Box sx={{ flex: 1 }}>
                                <Typography fontWeight={700} fontSize="0.9rem">{item.asset?.assetCode || 'N/A'}</Typography>
                                <Typography variant="caption" color="text.secondary">{item.asset?.brand || ''} {item.asset?.model || ''}</Typography>
                                {item.dueDate && (
                                  <Typography variant="caption" display="block" color={new Date(item.dueDate) < new Date() ? 'error' : 'text.secondary'}>
                                    คืนภายใน: {new Date(item.dueDate).toLocaleDateString('th-TH')}
                                  </Typography>
                                )}
                              </Box>
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'flex-end' }}>
                                <Chip label={itemStatusMeta.label} color={itemStatusMeta.color} size="small" />
                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                  <Button size="small" variant="outlined" startIcon={<VisibilityIcon />}
                                    onClick={() => navigate(`/assets/${item.assetId}`)} sx={{ fontSize: '0.65rem' }}>
                                    ดู
                                  </Button>
                                  {item.itemStatus === 'CheckedOut' && (
                                    <Button size="small" variant="contained" color="error" startIcon={<ReturnIcon />}
                                      onClick={() => navigate(`/borrow/return?itemId=${item.id}`)} sx={{ fontSize: '0.65rem' }}>
                                      คืน
                                    </Button>
                                  )}
                                </Box>
                              </Box>
                            </Box>
                          </Grid>
                        );
                      })}
                    </Grid>

                    <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        ขอเมื่อ: {new Date(req.createdAt).toLocaleString('th-TH')}
                        {req.approvals?.length > 0 && ` · อนุมัติเมื่อ: ${new Date(req.approvals[0].actedAt).toLocaleString('th-TH')}`}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {req.status === 'Pending' && (
                          <Button size="small" variant="outlined" color="primary" startIcon={<VisibilityIcon />}
                            onClick={() => navigate(`/borrow/my-requests`)} sx={{ fontSize: '0.7rem' }}>
                            ดูสถานะ
                          </Button>
                        )}
                        {req.status === 'CheckedOut' && req.items?.some((i: any) => i.itemStatus === 'CheckedOut') && (
                          <Button size="small" variant="contained" color="error" startIcon={<ReturnIcon />}
                            onClick={() => navigate(`/borrow/return?requestId=${req.id}`)} sx={{ fontSize: '0.7rem' }}>
                            ส่งคืนทั้งหมด
                          </Button>
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
}
