import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Chip, Grid, CircularProgress, Button,
  Alert, Divider, Tabs, Tab, alpha, useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ReturnIcon from '@mui/icons-material/AssignmentReturn';
import VisibilityIcon from '@mui/icons-material/Visibility';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { borrowAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import StatusChip from '../../components/StatusChip';
import EmptyState from '../../components/EmptyState';
import LoadingSkeleton from '../../components/LoadingSkeleton';

export default function MyItemsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
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

  if (loading) return <LoadingSkeleton type="cards" count={5} />;

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
          { label: 'ทั้งหมด', value: requests.length, icon: '📋', color: theme.palette.primary.main },
          { label: 'รออนุมัติ', value: countBy('Pending'), icon: '⏳', color: theme.palette.warning.main },
          { label: 'อนุมัติแล้ว', value: countBy('Approved'), icon: '✅', color: theme.palette.info.main },
          { label: 'กำลังยืม', value: countBy('CheckedOut'), icon: '📦', color: theme.palette.success.main },
          { label: 'คืนแล้ว', value: countBy('Returned'), icon: '📥', color: theme.palette.grey[500] },
        ].map((s) => (
          <Grid item xs={6} sm={4} md key={s.label}>
            <Card sx={{ border: `1px solid ${alpha(s.color, 0.15)}`, '&:hover': { borderColor: alpha(s.color, 0.3) } }}>
              <CardContent sx={{ py: 2, px: 2.5, textAlign: 'center' }}>
                <Typography variant="h3" sx={{ mb: 0.5 }}>{s.icon}</Typography>
                <Typography variant="h4" fontWeight={800} color={s.color}>{s.value}</Typography>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>{s.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} variant="scrollable" scrollButtons="auto">
          {tabs.map((t, i) => (
            <Tab key={t} label={`${t} (${i === 0 ? requests.length : countBy(tabFilters[i])})`} sx={{ fontWeight: 600 }} />
          ))}
        </Tabs>
      </Box>

      {filtered.length === 0 ? (
        <EmptyState
          title="ไม่มีรายการในสถานะนี้"
          description="เริ่มต้นยืมทรัพย์สินใหม่หรือเปลี่ยนตัวกรอง"
          actionLabel="ยืมทรัพย์สินใหม่"
          onAction={() => navigate('/borrow/new')}
        />
      ) : (
        <Grid container spacing={2.5}>
          {filtered.map((req) => (
            <Grid item xs={12} key={req.id}>
              <Card sx={{ borderLeft: `4px solid ${
                req.status === 'Pending' ? theme.palette.warning.main :
                req.status === 'Approved' ? theme.palette.info.main :
                req.status === 'CheckedOut' ? theme.palette.success.main :
                req.status === 'Returned' ? theme.palette.grey[400] : theme.palette.error.main
              }` }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                        <Typography fontWeight={800} fontSize="1.1rem">{req.requestNo}</Typography>
                        <StatusChip status={req.status} />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {req.purpose || 'ไม่มีวัตถุประสงค์'}
                      </Typography>
                    </Box>
                    {req.status === 'Approved' && (
                      <Chip icon={<HourglassEmptyIcon />} label="รอการส่งมอบ" color="info" size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                    )}
                    {req.status === 'Pending' && (
                      <Chip icon={<HourglassEmptyIcon />} label="รอIT Admin อนุมัติ" color="warning" size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                    )}
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Grid container spacing={1.5}>
                    {req.items?.map((item: any) => (
                      <Grid item xs={12} sm={6} md={4} key={item.id}>
                        <Box sx={{
                          p: 2, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, bgcolor: '#F8FAFC',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1.5,
                          transition: 'all 0.2s',
                          '&:hover': { borderColor: theme.palette.primary.main, bgcolor: '#FFFFFF' },
                        }}>
                          <Box sx={{ flex: 1 }}>
                            <Typography fontWeight={700} fontSize="0.95rem">{item.asset?.assetCode || 'N/A'}</Typography>
                            <Typography variant="caption" color="text.secondary">{item.asset?.brand || ''} {item.asset?.model || ''}</Typography>
                            {item.dueDate && (
                              <Typography variant="caption" display="block" color={new Date(item.dueDate) < new Date() ? 'error.main' : 'text.secondary'} fontWeight={600}>
                                คืนภายใน: {new Date(item.dueDate).toLocaleDateString('th-TH')}
                              </Typography>
                            )}
                          </Box>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, alignItems: 'flex-end' }}>
                            <StatusChip status={item.itemStatus} />
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <Button size="small" variant="outlined" startIcon={<VisibilityIcon />}
                                onClick={() => navigate(`/assets/${item.assetId}`)} sx={{ fontSize: '0.75rem' }}>
                                ดู
                              </Button>
                              {item.itemStatus === 'CheckedOut' && (
                                <Button size="small" variant="contained" color="error" startIcon={<ReturnIcon />}
                                  onClick={() => navigate(`/borrow/return?itemId=${item.id}`)} sx={{ fontSize: '0.75rem' }}>
                                  คืน
                                </Button>
                              )}
                            </Box>
                          </Box>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>

                  <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        ขอเมื่อ: {new Date(req.createdAt).toLocaleString('th-TH')}
                        {req.approvals?.length > 0 && ` · ${req.approvals[0].action === 'Rejected' ? 'ปฏิเสธเมื่อ' : 'อนุมัติเมื่อ'}: ${new Date(req.approvals[0].actedAt).toLocaleString('th-TH')}`}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {req.status === 'CheckedOut' && req.items?.some((i: any) => i.itemStatus === 'CheckedOut') && (
                          <Button size="small" variant="contained" color="error" startIcon={<ReturnIcon />}
                            onClick={() => navigate(`/borrow/return?requestId=${req.id}`)}>
                            ส่งคืนทั้งหมด
                          </Button>
                        )}
                      </Box>
                    </Box>
                    {req.status === 'Rejected' && (
                      <Box sx={{ p: 2, bgcolor: alpha(theme.palette.error.main, 0.05), borderRadius: 2, border: `1px solid ${alpha(theme.palette.error.main, 0.15)}` }}>
                        <Typography variant="caption" fontWeight={700} color="error.main" display="block" sx={{ mb: 0.5 }}>เหตุผลการไม่อนุมัติ</Typography>
                        <Typography variant="body2" color="error.dark" sx={{ whiteSpace: 'pre-wrap' }}>
                          {req.approvals?.find((a: any) => a.action === 'Rejected')?.note || req.note || 'ไม่ระบุเหตุผล'}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
