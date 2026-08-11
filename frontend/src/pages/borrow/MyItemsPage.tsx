import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { borrowAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../utils/dateUtils';
import {
  Box, Typography, Card, Button, IconButton, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Snackbar, Alert, CircularProgress, Pagination, alpha, useTheme, useMediaQuery,
} from '@mui/material';
import StatusChip from '../../components/StatusChip';
import AddIcon from '@mui/icons-material/Add';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import InboxIcon from '@mui/icons-material/Inbox';
import AssignmentIcon from '@mui/icons-material/Assignment';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import VisibilityIcon from '@mui/icons-material/Visibility';
import MoreTimeIcon from '@mui/icons-material/MoreTime';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HistoryIcon from '@mui/icons-material/History';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SendIcon from '@mui/icons-material/Send';

function getDaysLeft(dueDate: string | null): number | null {
  if (!dueDate) return null;
  return Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86400000);
}

function DueBar({ dueDate }: { dueDate: string }) {
  const theme = useTheme();
  const days = getDaysLeft(dueDate);
  if (days === null) return null;
  const total = 30;
  const pct = Math.max(0, Math.min(100, (days / total) * 100));
  const color = days < 0 ? theme.palette.error.main : days <= 3 ? theme.palette.warning.main : days <= 7 ? theme.palette.warning.light : theme.palette.success.main;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
      <Box sx={{ flex: 1, height: 6, bgcolor: 'action.hover', borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ width: `${pct}%`, height: '100%', bgcolor: color, borderRadius: 3 }} />
      </Box>
      <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color, whiteSpace: 'nowrap' }}>
        {days < 0 ? `เกิน ${Math.abs(days)} วัน` : `เหลือ ${days} วัน`}
      </Typography>
    </Box>
  );
}

const TABS = [
  { label: 'กำลังยืม',    filter: 'CheckedOut' },
  { label: 'รออนุมัติ',   filter: 'Pending' },
  { label: 'อนุมัติแล้ว', filter: 'Approved' },
  { label: 'ทั้งหมด',     filter: '' },
  { label: 'ประวัติ',     filter: 'Returned' },
];

const PER_PAGE = 10;

export default function MyItemsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState('');
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; id: number | null }>({ open: false, id: null });
  const [extDialog, setExtDialog] = useState<{ open: boolean; req: any | null }>({ open: false, req: null });
  const [extDays, setExtDays] = useState('3');
  const [extReason, setExtReason] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [expandedReq, setExpandedReq] = useState<number | null>(null);
  const isAdmin = user?.role && ['IT_ADMIN', 'SUPERADMIN'].includes(user.role);

  const showToast = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await borrowAPI.myRequests({ limit: 500 });
      setRequests(res.data.data || []);
    } catch (e: any) {
      setError(e.response?.data?.error || 'โหลดข้อมูลไม่สำเร็จ');
      setRequests([]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCancel = async (id: number) => {
    setSubmitting(true);
    try {
      await borrowAPI.cancelRequest(id);
      showToast('✅ ยกเลิกคำขอเรียบร้อยแล้ว');
      setCancelDialog({ open: false, id: null });
      fetchData();
    } catch (e: any) {
      showToast(`❌ ${e.response?.data?.error || 'ยกเลิกไม่สำเร็จ'}`);
    } finally { setSubmitting(false); }
  };

  const handleExtend = async () => {
    if (!extDialog.req) return;
    const days = parseInt(extDays);
    if (!days || days < 1) { showToast('⚠ ระบุจำนวนวันให้ถูกต้อง'); return; }
    if (!extReason.trim()) { showToast('⚠ กรุณาระบุเหตุผล'); return; }
    setSubmitting(true);
    try {
      const req = extDialog.req;
      const itemIds = req.items?.filter((i: any) => i.itemStatus === 'CheckedOut').map((i: any) => i.id) || [];
      if (itemIds.length === 0) { showToast('⚠ ไม่มีรายการที่ยืมอยู่'); return; }
      await borrowAPI.createExtension({ requestId: req.id, itemIds, extraDays: days, reason: extReason });
      showToast('✅ ส่งคำขอต่อเวลาเรียบร้อย รอ IT Admin อนุมัติ');
      setExtDialog({ open: false, req: null });
      setExtDays('3'); setExtReason('');
      fetchData();
    } catch (e: any) {
      showToast(`❌ ${e.response?.data?.error || 'เกิดข้อผิดพลาด'}`);
    } finally { setSubmitting(false); }
  };

  const countBy = useCallback((s: string) => requests.filter(r => r.status === s).length, [requests]);

  const overdueCount = useMemo(() =>
    requests.filter(r => r.status === 'CheckedOut' && r.items?.some((i: any) => {
      const d = getDaysLeft(i.dueDate);
      return i.itemStatus === 'CheckedOut' && d !== null && d < 0;
    })).length, [requests]);

  const filtered = useMemo(() => {
    let result = requests.filter(r => !TABS[activeTab].filter || r.status === TABS[activeTab].filter);
    result.sort((a, b) => {
      const aHasOverdue = a.items?.some((i: any) => { const d = getDaysLeft(i.dueDate); return i.itemStatus === 'CheckedOut' && d !== null && d < 0; });
      const bHasOverdue = b.items?.some((i: any) => { const d = getDaysLeft(i.dueDate); return i.itemStatus === 'CheckedOut' && d !== null && d < 0; });
      if (aHasOverdue && !bHasOverdue) return -1;
      if (!aHasOverdue && bHasOverdue) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return result;
  }, [requests, activeTab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
        <CircularProgress size={32} sx={{ mb: 1 }} />
        <div>กำลังโหลด...</div>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', pb: 6 }}>
      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast('')} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <Alert severity={toast.startsWith('❌') ? 'error' : toast.startsWith('⚠') ? 'warning' : 'success'} onClose={() => setToast('')} sx={{ fontWeight: 600 }}>
          {toast}
        </Alert>
      </Snackbar>

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
        <Box>
          <Typography variant="h5" fontWeight={800} color="text.primary">รายการของฉัน</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>ติดตามสถานะยืม-คืน ส่งคืน หรือขอต่อเวลา</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/borrow/new')}>
          ยืมใหม่
        </Button>
      </Box>

      {/* Error */}
      {error && (
        <Alert severity="error" icon={<ErrorOutlineIcon />} sx={{ mb: 2.5, borderRadius: '12px' }}
          action={<Button color="error" size="small" startIcon={<RefreshIcon />} onClick={fetchData}>ลองใหม่</Button>}>
          <Box sx={{ fontWeight: 700 }}>เกิดข้อผิดพลาด</Box>
          <Box sx={{ fontSize: '0.82rem' }}>{error}</Box>
        </Alert>
      )}

      {/* Summary cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(150px, 1fr))', gap: 1.5, mb: 2.5 }}>
        {[
          { label: 'กำลังยืม',  value: countBy('CheckedOut'), Icon: Inventory2Icon,     color: theme.palette.success.main },
          { label: 'เกินกำหนด', value: overdueCount,          Icon: ErrorIcon,          color: theme.palette.error.main },
          { label: 'รออนุมัติ', value: countBy('Pending'),    Icon: HourglassEmptyIcon, color: theme.palette.warning.main },
          { label: 'คืนแล้ว',   value: countBy('Returned'),   Icon: MoveToInboxIcon,    color: theme.palette.text.secondary },
        ].map(s => (
          <Card key={s.label} sx={{ p: isMobile ? 1.5 : '14px 16px', display: 'flex', alignItems: 'center', gap: isMobile ? 1 : 1.5 }}>
            <Box sx={{ width: isMobile ? 32 : 40, height: isMobile ? 32 : 40, borderRadius: '10px', bgcolor: alpha(s.color, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
              <s.Icon sx={{ fontSize: isMobile ? 18 : 22 }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: isMobile ? '1.3rem' : '1.5rem', fontWeight: 800, color: s.color, lineHeight: 1.2 }}>{s.value}</Typography>
              <Typography sx={{ fontSize: '0.72rem', color: 'text.disabled', fontWeight: 600 }}>{s.label}</Typography>
            </Box>
          </Card>
        ))}
      </Box>

      {/* Tabs */}
      <Box sx={{ display: 'flex', gap: 0.5, bgcolor: 'action.hover', borderRadius: '12px', p: 0.5, mb: 2.5, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {TABS.map((t, i) => {
          const cnt = i === 3 ? requests.length : countBy(t.filter);
          const active = activeTab === i;
          return (
            <Box
              key={t.label}
              component="button"
              onClick={() => { setActiveTab(i); setPage(1); setExpandedReq(null); }}
              sx={{
                flex: 1, border: 'none', p: isMobile ? '10px 12px' : '8px 14px', cursor: 'pointer', borderRadius: '10px', whiteSpace: 'nowrap',
                fontWeight: active ? 700 : 600, fontSize: '0.85rem', fontFamily: 'inherit',
                bgcolor: active ? 'background.paper' : 'transparent',
                color: active ? 'primary.main' : 'text.secondary',
                boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s',
              }}>
              {t.label}
              {cnt > 0 && <Box component="span" sx={{ ml: 0.5, opacity: 0.7, fontSize: '0.75rem' }}>({cnt})</Box>}
            </Box>
          );
        })}
      </Box>

      {/* Content */}
      {paged.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 10, px: 2.5, color: 'text.disabled' }}>
          {activeTab === 0 ? <InboxIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} /> : <AssignmentIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />}
          <Typography sx={{ fontWeight: 600, fontSize: '1rem', mb: 0.5 }}>ไม่มีรายการในสถานะนี้</Typography>
          <Typography sx={{ fontSize: '0.85rem', mb: 2.5, color: 'text.secondary' }}>
            {activeTab === 0 ? 'คุณยังไม่มีรายการที่กำลังยืมอยู่ ไปยืมอุปกรณ์กันเลย!' : 'ไม่มีประวัติรายการในสถานะนี้'}
          </Typography>
          <Button variant="contained" onClick={() => navigate('/borrow/new')}>เริ่มยืมอุปกรณ์</Button>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {paged.map((req) => {
            const checkedOutItems = (req.items || []).filter((i: any) => i.itemStatus === 'CheckedOut');
            const hasOverdue = checkedOutItems.some((i: any) => { const d = getDaysLeft(i.dueDate); return d !== null && d < 0; });
            const hasUrgent = checkedOutItems.some((i: any) => { const d = getDaysLeft(i.dueDate); return d !== null && d >= 0 && d <= 3; });
            const pendingExt = req.extensions?.find((e: any) => e.status === 'Pending');
            const isExpanded = expandedReq === req.id;
            const borderColor = hasOverdue ? theme.palette.error.main : hasUrgent ? theme.palette.warning.main : theme.palette.divider;

            return (
              <Card key={req.id} sx={{
                borderRadius: '14px',
                border: `1px solid ${borderColor}`,
                borderLeft: `3px solid ${borderColor}`,
                overflow: 'hidden', transition: 'all 0.15s',
                cursor: 'pointer',
              }} onClick={() => setExpandedReq(isExpanded ? null : req.id)}>
                {/* Compact header */}
                <Box sx={{ p: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1.25 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flexWrap: 'wrap' }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{req.requestNo}</Typography>
                    <StatusChip status={req.status} />
                    {hasOverdue && <Typography sx={{ color: 'error.main', fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 0.25 }}><ErrorIcon sx={{ fontSize: 14 }} /> เกินกำหนด</Typography>}
                    {hasUrgent && !hasOverdue && <Typography sx={{ color: 'warning.main', fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 0.25 }}><WarningAmberIcon sx={{ fontSize: 14 }} /> ใกล้ครบกำหนด</Typography>}
                    {pendingExt && <Typography sx={{ color: 'warning.main', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 0.25 }}><HourglassEmptyIcon sx={{ fontSize: 13 }} /> รออนุมัติต่อเวลา</Typography>}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
                    <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled' }}>{formatDate(req.createdAt)}</Typography>
                    <ExpandMoreIcon sx={{ fontSize: 18, color: 'text.disabled', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none' }} />
                  </Box>
                </Box>

                {/* Expanded detail */}
                {isExpanded && (
                  <Box sx={{ borderTop: `1px solid ${theme.palette.divider}` }} onClick={e => e.stopPropagation()}>
                    {/* Purpose */}
                    <Box sx={{ p: '12px 18px', bgcolor: 'action.hover', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 1 : 2.5, flexWrap: 'wrap', borderBottom: `1px solid ${theme.palette.divider}`, fontSize: '0.85rem' }}>
                      <Box><Box component="span" sx={{ color: 'text.disabled' }}>วัตถุประสงค์: </Box><Box component="span" sx={{ fontWeight: 600 }}>{req.purpose || '-'}</Box></Box>
                      {checkedOutItems.length > 0 && checkedOutItems[0]?.dueDate && (
                        <Box><Box component="span" sx={{ color: 'text.disabled' }}>กำหนดคืน: </Box><Box component="span" sx={{ fontWeight: 700, color: hasOverdue ? 'error.main' : 'text.primary' }}>{formatDate(checkedOutItems[0].dueDate)}</Box></Box>
                      )}
                    </Box>

                    {/* Items */}
                    <Box sx={{ p: '12px 18px', display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                      {(req.items || []).map((item: any) => {
                        const isCheckedOut = item.itemStatus === 'CheckedOut';
                        const daysLeft = getDaysLeft(item.dueDate);
                        const isOverdue = isCheckedOut && daysLeft !== null && daysLeft < 0;
                        const isUrgent = isCheckedOut && daysLeft !== null && daysLeft >= 0 && daysLeft <= 3;

                        return (
                          <Box key={item.id} sx={{
                            p: '12px 14px', borderRadius: '10px',
                            border: `1px solid ${isOverdue ? alpha(theme.palette.error.main, 0.4) : isUrgent ? alpha(theme.palette.warning.main, 0.4) : theme.palette.divider}`,
                            bgcolor: isOverdue ? alpha(theme.palette.error.main, 0.06) : isUrgent ? alpha(theme.palette.warning.main, 0.06) : 'action.hover',
                          }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1 }}>
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>
                                  {item.asset?.assetName || item.inventoryItem?.name || item.asset?.assetCode || `Item #${item.id}`}
                                </Typography>
                                <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.125 }}>
                                  {item.asset?.assetCode && <Box component="span" sx={{ fontFamily: 'monospace' }}>{item.asset.assetCode}</Box>}
                                  {item.asset?.brand && <span> · {item.asset.brand} {item.asset.model}</span>}
                                  {item.isQuantityBased && <span>จำนวน {item.quantity} {item.inventoryItem?.unit}</span>}
                                </Typography>
                              </Box>
                              <StatusChip status={item.itemStatus} />
                            </Box>

                            {/* Due date bar */}
                            {isCheckedOut && item.dueDate && <DueBar dueDate={item.dueDate} />}

                            {/* Actions */}
                            <Box sx={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(120px, auto))', gap: 1, mt: 1.5 }}>
                              {!item.isQuantityBased && item.assetId && (
                                <Button size="small" variant="outlined" color="inherit" startIcon={<VisibilityIcon sx={{ fontSize: 16 }} />}
                                  onClick={() => navigate('/assets/' + item.assetId)}>
                                  ดูรายละเอียด
                                </Button>
                              )}
                              {isCheckedOut && (
                                <>
                                  <Button size="small" variant="outlined" color="info" startIcon={<MoreTimeIcon sx={{ fontSize: 16 }} />}
                                    disabled={!!pendingExt}
                                    title="ขยายวันยืม"
                                    onClick={() => { setExtDialog({ open: true, req }); setExtDays('3'); setExtReason(''); }}>
                                    ขอต่อเวลา
                                  </Button>
                                  {isAdmin && (
                                    <Button size="small" variant="outlined" color="error" startIcon={<AssignmentReturnIcon sx={{ fontSize: 16 }} />}
                                      title="ดำเนินการคืน (IT)"
                                      onClick={() => navigate(`/borrow/return?itemId=${item.id}`)}>
                                      คืน (IT)
                                    </Button>
                                  )}
                                </>
                              )}
                              {item.itemStatus === 'Returned' && item.returnDate && (
                                <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled', py: '5px', textAlign: isMobile ? 'center' : 'left', display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: isMobile ? 'center' : 'flex-start' }}>
                                  <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} /> คืนแล้ว {formatDate(item.returnDate)}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>

                    {/* Extension history */}
                    {req.extensions && req.extensions.length > 0 && (
                      <Box sx={{ mx: 2.25, mb: 1.5, p: '10px 14px', bgcolor: 'action.hover', borderRadius: '10px', border: `1px solid ${theme.palette.divider}` }}>
                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary', mb: 0.75, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <HistoryIcon sx={{ fontSize: 14 }} /> ประวัติขอต่อเวลา
                        </Typography>
                        {req.extensions.map((ext: any) => {
                          const dotColor = ext.status === 'Approved' ? theme.palette.success.main : ext.status === 'Pending' ? theme.palette.warning.main : theme.palette.error.main;
                          return (
                            <Box key={ext.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: '3px', fontSize: '0.78rem', borderBottom: `1px dashed ${theme.palette.divider}` }}>
                              <Box sx={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, bgcolor: dotColor }} />
                              <span>ขอต่อ +{ext.items?.[0]?.extraDays || 0} วัน</span>
                              {ext.status === 'Approved' && <Box component="span" sx={{ color: 'success.main', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.25 }}><CheckCircleIcon sx={{ fontSize: 13 }} /> อนุมัติ</Box>}
                              {ext.status === 'Pending' && <Box component="span" sx={{ color: 'warning.main', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.25 }}><HourglassEmptyIcon sx={{ fontSize: 13 }} /> รออนุมัติ</Box>}
                              {ext.status === 'Rejected' && <Box component="span" sx={{ color: 'error.main', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.25 }}><ErrorOutlineIcon sx={{ fontSize: 13 }} /> ปฏิเสธ</Box>}
                              <Typography component="span" sx={{ fontSize: '0.7rem', color: 'text.disabled' }}>({formatDate(ext.createdAt)})</Typography>
                            </Box>
                          );
                        })}
                      </Box>
                    )}

                    {/* Footer actions */}
                    <Box sx={{ p: '12px 18px', borderTop: `1px solid ${theme.palette.divider}`, display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 1.25, flexWrap: 'wrap' }}>
                      {req.status === 'Pending' && (
                        <Button size="small" variant="outlined" color="error" startIcon={<CloseIcon sx={{ fontSize: 16 }} />}
                          onClick={() => setCancelDialog({ open: true, id: req.id })}
                          sx={{ flex: isMobile ? 1 : undefined }}>
                          ยกเลิกคำขอ
                        </Button>
                      )}
                      {req.status === 'CheckedOut' && checkedOutItems.length > 0 && isAdmin && (
                        <Button size="small" variant="outlined" color="error" startIcon={<AssignmentReturnIcon sx={{ fontSize: 16 }} />}
                          onClick={() => navigate(`/borrow/return?requestId=${req.id}`)}
                          sx={{ flex: isMobile ? 1 : undefined }}>
                          คืนทั้งหมด ({checkedOutItems.length} รายการ)
                        </Button>
                      )}
                      {req.approvals?.[0] && (
                        <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled', py: '6px', textAlign: isMobile ? 'center' : 'left', width: isMobile ? '100%' : 'auto' }}>
                          {req.approvals[0].action === 'Rejected' ? 'ปฏิเสธ' : 'อนุมัติ'} โดย {req.approvals[0].approver?.displayName || req.approvals[0].approver?.adUsername || 'ระบบ'} เมื่อ {formatDate(req.approvals[0].actedAt)}
                        </Typography>
                      )}
                    </Box>

                    {/* Rejected reason */}
                    {req.status === 'Rejected' && req.approvals?.find((a: any) => a.action === 'Rejected') && (
                      <Box sx={{ mx: 2.25, mb: 1.5, p: '10px 14px', bgcolor: alpha(theme.palette.error.main, 0.06), border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`, borderRadius: '8px' }}>
                        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'error.main' }}>เหตุผลที่ไม่อนุมัติ</Typography>
                        <Typography sx={{ fontSize: '0.82rem', color: 'error.dark' }}>
                          {req.approvals.find((a: any) => a.action === 'Rejected')?.note || 'ไม่ระบุเหตุผล'}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                )}
              </Card>
            );
          })}
        </Box>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination count={totalPages} page={safePage} onChange={(_, p) => setPage(p)} shape="rounded" color="primary" />
        </Box>
      )}

      {/* Cancel Dialog */}
      <Dialog open={cancelDialog.open} onClose={() => setCancelDialog({ open: false, id: null })} maxWidth="xs" fullWidth>
        <DialogContent sx={{ textAlign: 'center', pt: 3.5 }}>
          <DeleteOutlineIcon sx={{ fontSize: 44, color: 'error.main', mb: 1 }} />
          <Typography variant="h6" sx={{ mb: 1 }}>ยืนยันยกเลิก</Typography>
          <Typography color="text.secondary" sx={{ fontSize: '0.85rem' }}>
            ยกเลิกคำขอยืมนี้? การดำเนินการนี้ไม่สามารถย้อนกลับได้
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button fullWidth variant="outlined" color="inherit" disabled={submitting} onClick={() => setCancelDialog({ open: false, id: null })}>กลับ</Button>
          <Button fullWidth variant="contained" color="error" disabled={submitting} onClick={() => handleCancel(cancelDialog.id!)}>
            {submitting ? 'กำลังยกเลิก...' : 'ยืนยัน'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Extension Dialog */}
      <Dialog open={extDialog.open} onClose={() => setExtDialog({ open: false, req: null })} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MoreTimeIcon color="primary" /> ขอต่อเวลา
        </DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" sx={{ fontSize: '0.82rem', mb: 2 }}>
            คำขอ: <Box component="strong" sx={{ color: 'text.primary' }}>{extDialog.req?.requestNo}</Box>
          </Typography>

          {extDialog.req && (
            <Box sx={{ mb: 2, p: '10px 14px', bgcolor: 'action.hover', borderRadius: '8px', border: `1px solid ${theme.palette.divider}` }}>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary', mb: 0.75, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Inventory2Icon sx={{ fontSize: 14 }} /> รายการที่ขอต่อ:
              </Typography>
              {extDialog.req.items?.filter((i: any) => i.itemStatus === 'CheckedOut').map((item: any) => (
                <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: '4px', borderBottom: `1px dashed ${theme.palette.divider}`, fontSize: '0.82rem' }}>
                  <span>{item.asset?.assetName || item.asset?.assetCode || item.inventoryItem?.name || `Item #${item.id}`}</span>
                  {item.dueDate && <Typography component="span" sx={{ color: 'text.secondary', fontSize: '0.72rem' }}>กำหนด {formatDate(item.dueDate)}</Typography>}
                </Box>
              ))}
            </Box>
          )}

          <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: 'text.secondary', mb: 0.75 }}>จำนวนวันที่ขอต่อ</Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            {[3, 7, 14].map(d => (
              <Chip
                key={d}
                label={`${d} วัน`}
                onClick={() => setExtDays(String(d))}
                color={extDays === String(d) ? 'primary' : 'default'}
                variant={extDays === String(d) ? 'filled' : 'outlined'}
                sx={{ flex: 1, fontWeight: 700 }}
              />
            ))}
          </Box>
          <TextField
            fullWidth size="small" type="number" inputProps={{ min: 1, max: 30 }}
            value={extDays} onChange={e => setExtDays(e.target.value)}
            placeholder="ระบุจำนวนวัน (1-30)"
            sx={{ mb: 2 }}
          />

          <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: 'text.secondary', mb: 0.75 }}>เหตุผลที่ขอต่อ *</Typography>
          <TextField
            fullWidth multiline rows={3}
            value={extReason} onChange={e => setExtReason(e.target.value)}
            placeholder="ระบุเหตุผล เช่น งานยังไม่เสร็จ ต้องใช้ต่อ"
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button fullWidth variant="outlined" color="inherit" disabled={submitting} onClick={() => setExtDialog({ open: false, req: null })}>ยกเลิก</Button>
          <Button fullWidth variant="contained" disabled={submitting} startIcon={submitting ? undefined : <SendIcon sx={{ fontSize: 16 }} />} onClick={handleExtend}>
            {submitting ? 'กำลังส่ง...' : 'ส่งคำขอ'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
