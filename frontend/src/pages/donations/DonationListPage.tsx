import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, IconButton, Tooltip, alpha,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  TextField, InputAdornment, Skeleton, Stack,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import InboxIcon from '@mui/icons-material/Inbox';
import { donationAPI } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { formatDate } from '../../utils/dateUtils';


const statusConfig: Record<string, { label: string; color: 'warning' | 'success' | 'default' }> = {
  PENDING:   { label: 'รอส่งมอบ',    color: 'warning' },
  COMPLETED: { label: 'ส่งมอบแล้ว', color: 'success' },
  CANCELLED: { label: 'ยกเลิก',      color: 'default' },
};

const FILTERS = [
  { key: 'ALL',       label: 'ทั้งหมด' },
  { key: 'PENDING',   label: 'รอส่งมอบ' },
  { key: 'COMPLETED', label: 'ส่งมอบแล้ว' },
  { key: 'CANCELLED', label: 'ยกเลิก' },
];

// ── Stat card ──────────────────────────────────────────────────────────────
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
  bgColor: string;
  loading: boolean;
}
function StatCard({ icon, label, value, color, bgColor, loading }: StatCardProps) {
  return (
    <Card sx={{ flex: 1, minWidth: 0 }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{
          width: 44, height: 44, borderRadius: 2,
          bgcolor: bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color, flexShrink: 0,
        }}>
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={500}>{label}</Typography>
          {loading
            ? <Skeleton width={40} height={28} />
            : <Typography variant="h5" fontWeight={700} sx={{ color, lineHeight: 1.2 }}>{value}</Typography>
          }
        </Box>
      </CardContent>
    </Card>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function DonationListPage() {
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [deleteId, setDeleteId]   = useState<number | null>(null);
  const [search, setSearch]       = useState('');
  const [filter, setFilter]       = useState('ALL');
  const navigate = useNavigate();
  const toast    = useToast();

  const fetchDonations = async () => {
    try {
      const res = await donationAPI.list();
      setDonations(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDonations(); }, []);

  const handleDelete = async () => {
    if (deleteId === null) return;
    try {
      await donationAPI.delete(deleteId);
      toast.success('ลบรายการเรียบร้อย');
      setDeleteId(null);
      fetchDonations();
    } catch {
      toast.error('ไม่สามารถลบรายการได้');
    }
  };

  // Stats
  const stats = useMemo(() => ({
    total:     donations.length,
    pending:   donations.filter(d => d.status === 'PENDING').length,
    completed: donations.filter(d => d.status === 'COMPLETED').length,
  }), [donations]);

  // Filter + search
  const filtered = useMemo(() => {
    let list = donations;
    if (filter !== 'ALL') list = list.filter(d => d.status === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(d =>
        d.batchRef?.toLowerCase().includes(q) ||
        d.recipientName?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [donations, filter, search]);

  return (
    <Box>
      {/* ── Header ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>บริจาคทรัพย์สิน</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            จัดการการบริจาคทรัพย์สินที่ปลดระวางแล้วให้หน่วยงานภายนอก
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/donations/new')}
        >
          สร้างรายการบริจาค
        </Button>
      </Box>

      {/* ── Stat Cards ── */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <StatCard
          icon={<CardGiftcardIcon fontSize="small" />}
          label="รายการทั้งหมด"
          value={stats.total}
          color="#6366F1"
          bgColor={alpha('#6366F1', 0.1)}
          loading={loading}
        />
        <StatCard
          icon={<HourglassEmptyIcon fontSize="small" />}
          label="รอส่งมอบ"
          value={stats.pending}
          color="#d97706"
          bgColor={alpha('#f59e0b', 0.12)}
          loading={loading}
        />
        <StatCard
          icon={<CheckCircleOutlineIcon fontSize="small" />}
          label="ส่งมอบแล้ว"
          value={stats.completed}
          color="#059669"
          bgColor={alpha('#10B981', 0.1)}
          loading={loading}
        />
      </Stack>

      {/* ── Search + Filter ── */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ py: '12px !important', display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="ค้นหาเลขที่เอกสาร หรือหน่วยงานผู้รับ..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
            sx={{ width: 300 }}
          />
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {FILTERS.map(f => (
              <Chip
                key={f.key}
                label={f.label}
                size="small"
                onClick={() => setFilter(f.key)}
                variant={filter === f.key ? 'filled' : 'outlined'}
                color={filter === f.key ? 'primary' : 'default'}
                sx={{ cursor: 'pointer', fontWeight: filter === f.key ? 600 : 400 }}
              />
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* ── Table ── */}
      <Card>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>เลขที่เอกสาร</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>หน่วยงานผู้รับ</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>วันที่บริจาค</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>จำนวนรายการ</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>สถานะ</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="center">จัดการ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {/* Loading skeleton */}
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton variant="text" width={j === 5 ? 60 : '80%'} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  /* Empty state */
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Box sx={{ textAlign: 'center', py: 6 }}>
                        <InboxIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                        <Typography variant="body2" color="text.secondary" mb={2}>
                          {search || filter !== 'ALL'
                            ? 'ไม่พบรายการที่ตรงกับเงื่อนไข'
                            : 'ยังไม่มีรายการบริจาค'}
                        </Typography>
                        {!search && filter === 'ALL' && (
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<AddIcon />}
                            onClick={() => navigate('/donations/new')}
                          >
                            สร้างรายการแรก
                          </Button>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((d) => {
                    const sc = statusConfig[d.status] || { label: d.status, color: 'default' };
                    return (
                      <TableRow
                        key={d.id}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/donations/${d.id}`)}
                      >
                        <TableCell sx={{ fontWeight: 600, color: 'primary.dark' }}>{d.batchRef}</TableCell>
                        <TableCell>{d.recipientName}</TableCell>
                        <TableCell>{formatDate(d.donationDate)}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box sx={{
                              width: 6, height: 6, borderRadius: '50%',
                              bgcolor: 'primary.main', flexShrink: 0,
                            }} />
                            {d._count?.items || 0} รายการ
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip label={sc.label} color={sc.color} size="small" />
                        </TableCell>
                        <TableCell align="center" onClick={e => e.stopPropagation()}>
                          <Tooltip title="ดูรายละเอียด">
                            <IconButton size="small" onClick={() => navigate(`/donations/${d.id}`)}>
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="ลบ">
                            <IconButton size="small" color="error" onClick={() => setDeleteId(d.id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Footer count */}
          {!loading && filtered.length > 0 && (
            <Box sx={{ px: 2, py: 1.5, borderTop: '0.5px solid', borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary">
                แสดง {filtered.length} จาก {donations.length} รายการ
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* ── Delete Dialog ── */}
      <Dialog open={deleteId !== null} onClose={() => setDeleteId(null)}>
        <DialogTitle>ยืนยันการลบ</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ต้องการลบรายการบริจาคนี้ใช่หรือไม่? การดำเนินการนี้ไม่สามารถยกเลิกได้
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>ยกเลิก</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>ลบ</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
