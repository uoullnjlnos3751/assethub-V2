import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, TextField, InputAdornment, Card, CardContent, Grid,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, Divider, CircularProgress, alpha, useTheme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AddIcon from '@mui/icons-material/Add';
import { borrowAPI } from '../../services/api';
import { formatDate } from '../../utils/dateUtils';
import StatusChip from '../../components/StatusChip';

interface RequestItem {
  id: number;
  itemStatus: string;
  dueDate?: string | null;
  asset?: { assetCode: string; assetName: string; brand?: string; model?: string; serialNo?: string } | null;
  inventoryItem?: { name: string } | null;
  quantity?: number;
}

interface BorrowReq {
  id: number;
  requestNo: string;
  status: string;
  purpose: string;
  createdAt: string;
  requester: { displayName?: string; adUsername: string; department?: string; company?: string };
  departmentId?: string;
  items: RequestItem[];
}

interface Stats {
  pending: number; pendingOverDay: number;
  activeItems: number; activeBorrowers: number;
  overdueItems: number; overdueAvgDays: number;
  dueTodayItems: number;
  returnedThisMonth: number; returnedOnTimePct: number | null;
}

function StatTile({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: string; tone?: 'default' | 'warning' | 'error' | 'success' }) {
  const theme = useTheme();
  const accent = {
    default: theme.palette.text.primary,
    warning: theme.palette.warning.main,
    error: theme.palette.error.main,
    success: theme.palette.success.main,
  }[tone || 'default'];
  return (
    <Grid item xs={6} sm={4} md={2.4}>
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary" gutterBottom noWrap>{label}</Typography>
          <Typography variant="h5" fontWeight={700} sx={{ color: accent }}>{value}</Typography>
          {sub && <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 0.5 }}>{sub}</Typography>}
        </CardContent>
      </Card>
    </Grid>
  );
}

/**
 * The "คำขอทั้งหมด" screen from the design handoff — every borrow request
 * regardless of status, in one table, with operational stat tiles above it.
 * The backend endpoint (GET /borrow/all-requests) already existed and was
 * already used by ApprovalQueuePage, just always filtered to status=Pending;
 * this page is the first place it's called unfiltered.
 */
export default function AllRequestsPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const [requests, setRequests] = useState<BorrowReq[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [detail, setDetail] = useState<BorrowReq | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      borrowAPI.allRequests({ limit: 300 }),
      borrowAPI.stats(),
    ])
      .then(([reqRes, statsRes]) => {
        setRequests(reqRes.data.data || []);
        setStats(statsRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter(r => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.requestNo.toLowerCase().includes(q) ||
        r.requester?.displayName?.toLowerCase().includes(q) ||
        r.requester?.adUsername?.toLowerCase().includes(q) ||
        r.purpose?.toLowerCase().includes(q)
      );
    });
  }, [requests, search, statusFilter]);

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of requests) c[r.status] = (c[r.status] || 0) + 1;
    return c;
  }, [requests]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>คำขอยืม-คืนทั้งหมด</Typography>
          <Typography variant="body1" color="text.secondary">ภาพรวมคำขอยืมทุกสถานะในระบบ</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/borrow/new')} sx={{ borderRadius: 2 }}>
          สร้างคำขอยืม
        </Button>
      </Box>

      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <StatTile label="คำขอรออนุมัติ" value={stats.pending} tone={stats.pendingOverDay > 0 ? 'warning' : 'default'}
            sub={stats.pendingOverDay > 0 ? `รอเกิน 1 วันทำการ ${stats.pendingOverDay} คำขอ` : undefined} />
          <StatTile label="กำลังยืมอยู่" value={stats.activeItems} sub={`ผู้ยืม ${stats.activeBorrowers} คน`} />
          <StatTile label="เกินกำหนดคืน" value={stats.overdueItems} tone={stats.overdueItems > 0 ? 'error' : 'default'}
            sub={stats.overdueItems > 0 ? `เกินเฉลี่ย ${stats.overdueAvgDays} วัน` : undefined} />
          <StatTile label="ครบกำหนดวันนี้" value={stats.dueTodayItems} tone={stats.dueTodayItems > 0 ? 'warning' : 'default'} />
          <StatTile label="รับคืนเดือนนี้" value={stats.returnedThisMonth}
            sub={stats.returnedOnTimePct != null ? `คืนตรงกำหนด ${stats.returnedOnTimePct}%` : undefined} />
        </Grid>
      )}

      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="ค้นหาเลขที่คำขอ / ผู้ยืม / วัตถุประสงค์"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 280, flex: 1 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
            endAdornment: search && (
              <InputAdornment position="end">
                <ClearIcon fontSize="small" sx={{ cursor: 'pointer' }} onClick={() => setSearch('')} />
              </InputAdornment>
            ),
          }}
        />
        {[
          { label: 'ทั้งหมด', value: null },
          { label: 'รออนุมัติ', value: 'Pending' },
          { label: 'จ่ายแล้ว', value: 'CheckedOut' },
          { label: 'คืนบางส่วน', value: 'PartiallyReturned' },
          { label: 'คืนแล้ว', value: 'Returned' },
        ].map(f => (
          <Box
            key={f.label}
            onClick={() => setStatusFilter(f.value)}
            sx={{
              px: 1.5, py: 0.75, borderRadius: '999px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
              border: `1px solid ${statusFilter === f.value ? theme.palette.primary.main : theme.palette.divider}`,
              bgcolor: statusFilter === f.value ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
              color: statusFilter === f.value ? theme.palette.primary.main : theme.palette.text.secondary,
              whiteSpace: 'nowrap',
            }}
          >
            {f.label}{f.value && statusCounts[f.value] ? ` (${statusCounts[f.value]})` : ''}
          </Box>
        ))}
      </Box>

      <Card>
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>
                <TableCell>เลขที่คำขอ</TableCell>
                <TableCell>ทรัพย์สิน</TableCell>
                <TableCell>ผู้ยืม / แผนก</TableCell>
                <TableCell>บริษัท</TableCell>
                <TableCell>วันที่ขอ</TableCell>
                <TableCell>กำหนดคืน</TableCell>
                <TableCell>สถานะ</TableCell>
                <TableCell align="right">ดำเนินการ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">ไม่พบคำขอที่ตรงเงื่อนไข</Typography>
                  </TableCell>
                </TableRow>
              ) : filtered.map(r => {
                const firstItem = r.items[0];
                const dueDate = r.items.map(i => i.dueDate).filter(Boolean).sort()[0];
                return (
                  <TableRow key={r.id} hover sx={{ cursor: 'pointer' }} onClick={() => setDetail(r)}>
                    <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{r.requestNo}</TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                        {firstItem?.asset ? (firstItem.asset.assetName || firstItem.asset.assetCode) : firstItem?.inventoryItem?.name || '-'}
                        {r.items.length > 1 ? ` +${r.items.length - 1}` : ''}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{r.requester?.displayName || r.requester?.adUsername}</Typography>
                      <Typography variant="caption" color="text.secondary">{r.requester?.department || r.departmentId || '-'}</Typography>
                    </TableCell>
                    <TableCell>{r.requester?.company || '-'}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(r.createdAt)}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{dueDate ? formatDate(dueDate) : '-'}</TableCell>
                    <TableCell><StatusChip status={r.status} /></TableCell>
                    <TableCell align="right">
                      <Button size="small" startIcon={<VisibilityIcon />} onClick={(e) => { e.stopPropagation(); setDetail(r); }}>
                        ดู
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog open={!!detail} onClose={() => setDetail(null)} maxWidth="sm" fullWidth>
        <DialogTitle>รายละเอียดคำขอ {detail?.requestNo}</DialogTitle>
        <DialogContent dividers>
          {detail && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  {detail.requester?.displayName || detail.requester?.adUsername} · {detail.requester?.department || detail.departmentId || '-'}
                </Typography>
                <StatusChip status={detail.status} />
              </Box>
              <Typography variant="subtitle2" color="text.secondary">วัตถุประสงค์</Typography>
              <Typography sx={{ mb: 2 }}>{detail.purpose || '-'}</Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>รายการที่ขอยืม</Typography>
              {detail.items.map(item => (
                <Box key={item.id} sx={{
                  p: 1.5, mb: 1, borderRadius: 2,
                  bgcolor: alpha(theme.palette.primary.main, 0.05),
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1,
                }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography fontWeight={600} noWrap>
                      {item.asset ? (item.asset.assetName || item.asset.assetCode) : `${item.inventoryItem?.name} × ${item.quantity}`}
                    </Typography>
                    {item.dueDate && (
                      <Typography variant="caption" color="text.secondary">กำหนดคืน {formatDate(item.dueDate)}</Typography>
                    )}
                  </Box>
                  <StatusChip status={item.itemStatus} />
                </Box>
              ))}
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                {detail.status === 'Pending' && (
                  <Button variant="contained" onClick={() => navigate('/borrow/approval-queue')}>ไปที่คิวอนุมัติ</Button>
                )}
                {detail.status === 'Approved' && (
                  <Button variant="contained" onClick={() => navigate('/borrow/checkout')}>ไปที่หน้าจ่ายของ</Button>
                )}
                {(detail.status === 'CheckedOut' || detail.status === 'PartiallyReturned') && (
                  <Button variant="contained" onClick={() => navigate('/borrow/return')}>ไปที่หน้ารับคืน</Button>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
