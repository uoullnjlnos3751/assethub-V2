import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { borrowAPI } from '../../services/api';
import {
  useTheme, useMediaQuery, Stepper, Step, StepLabel,
  Box, Typography, Card, Button, IconButton, Chip, TextField, InputAdornment,
  Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Snackbar, Alert, CircularProgress, alpha,
} from '@mui/material';
import StatusChip from '../../components/StatusChip';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import InboxIcon from '@mui/icons-material/Inbox';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import CancelIcon from '@mui/icons-material/Cancel';
import { formatDate } from '../../utils/dateUtils';

const TABS = [
  { label: 'รออนุมัติ', filter: 'Pending' },
  { label: 'อนุมัติแล้ว', filter: 'Approved' },
  { label: 'ส่งมอบแล้ว', filter: 'CheckedOut' },
  { label: 'คืนแล้ว', filter: 'Returned' },
  { label: 'ไม่อนุมัติ', filter: 'Rejected' },
  { label: 'ยกเลิก', filter: 'Cancelled' },
];

export default function MyRequestsPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [detailReq, setDetailReq] = useState<any>(null);
  const [toast, setToast] = useState('');
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; id: number | null }>({ open: false, id: null });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchRequests(); }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await borrowAPI.myRequests();
      setRequests(res.data.data || []);
    } catch { setRequests([]); }
    finally { setLoading(false); }
  };

  const handleCancel = async (id: number) => {
    setSubmitting(true);
    try {
      await borrowAPI.cancelRequest(id);
      showToast('✅ ยกเลิกคำขอเรียบร้อยแล้ว');
      setCancelDialog({ open: false, id: null });
      if (detailReq?.id === id) setDetailReq(null);
      fetchRequests();
    } catch (e: any) {
      showToast(`❌ ${e.response?.data?.error || 'ยกเลิกไม่สำเร็จ'}`);
    } finally { setSubmitting(false); }
  };

  const countBy = (s: string) => requests.filter(r => r.status === s).length;
  const filtered = requests
    .filter(r => r.status === TABS[activeTab].filter)
    .filter(r => {
      if (!searchTerm) return true;
      const s = searchTerm.toLowerCase();
      return r.requestNo?.toLowerCase().includes(s) || r.purpose?.toLowerCase().includes(s) ||
        r.items?.some((i: any) => i.asset?.assetCode?.toLowerCase().includes(s));
    });

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
        <CircularProgress size={32} sx={{ mb: 1 }} />
        <div>กำลังโหลด...</div>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ pb: 6, maxWidth: 1100, mx: 'auto' }}>
      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast('')} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <Alert severity={toast.startsWith('❌') ? 'error' : 'success'} onClose={() => setToast('')} sx={{ fontWeight: 600 }}>
          {toast}
        </Alert>
      </Snackbar>

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 1.5 }}>
        <Box>
          <Typography variant="h5" fontWeight={800} color="text.primary">คำขอยืมของฉัน</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>ติดตามสถานะคำขอยืมทรัพย์สิน</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/borrow/new')}>ยืมใหม่</Button>
      </Box>

      {/* Stat Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 1.5, mb: 3 }}>
        {[
          { label: 'รออนุมัติ',   count: countBy('Pending'),    color: theme.palette.warning.main, Icon: HourglassEmptyIcon },
          { label: 'อนุมัติแล้ว', count: countBy('Approved'),   color: theme.palette.info.main,    Icon: CheckCircleIcon },
          { label: 'ส่งมอบแล้ว',  count: countBy('CheckedOut'), color: theme.palette.success.main, Icon: Inventory2OutlinedIcon },
          { label: 'คืนแล้ว',     count: countBy('Returned'),   color: theme.palette.text.secondary, Icon: MoveToInboxIcon },
          { label: 'ไม่อนุมัติ',  count: countBy('Rejected'),   color: theme.palette.error.main,   Icon: CancelIcon },
        ].map(s => (
          <Card key={s.label} sx={{ p: '14px 16px', bgcolor: alpha(s.color, 0.06), border: `1px solid ${alpha(s.color, 0.2)}` }}>
            <s.Icon sx={{ fontSize: 20, color: s.color, mb: 0.5 }} />
            <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: s.color }}>{s.count}</Typography>
            <Typography sx={{ fontSize: '0.72rem', color: s.color, fontWeight: 600, opacity: 0.85 }}>{s.label}</Typography>
          </Card>
        ))}
      </Box>

      {/* Search */}
      <TextField
        fullWidth
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        placeholder="ค้นหาด้วยเลขที่คำขอ, วัตถุประสงค์, รหัสอุปกรณ์"
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment>,
          endAdornment: searchTerm && (
            <InputAdornment position="end">
              <IconButton size="small" onClick={() => setSearchTerm('')}><CloseIcon sx={{ fontSize: 16 }} /></IconButton>
            </InputAdornment>
          ),
        }}
      />

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2.5, borderBottom: `2px solid ${theme.palette.divider}`, minHeight: 44 }}
      >
        {TABS.map((t, i) => {
          const cnt = countBy(t.filter);
          return (
            <Tab
              key={t.label}
              sx={{ minHeight: 44, textTransform: 'none', fontWeight: activeTab === i ? 700 : 500 }}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  {t.label}
                  {cnt > 0 && (
                    <Box component="span" sx={{
                      bgcolor: activeTab === i ? alpha(theme.palette.primary.main, 0.12) : 'action.hover',
                      color: activeTab === i ? 'primary.main' : 'text.disabled',
                      borderRadius: '20px', px: 0.9, fontSize: '0.72rem', fontWeight: 700,
                    }}>
                      {cnt}
                    </Box>
                  )}
                </Box>
              }
            />
          );
        })}
      </Tabs>

      {/* Table */}
      {filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.disabled' }}>
          <InboxIcon sx={{ fontSize: 44, mb: 1.5, opacity: 0.5 }} />
          <Typography fontWeight={600}>ไม่มีรายการ</Typography>
        </Box>
      ) : (
        <Card sx={{ overflow: 'hidden' }}>
          {isMobile ? (
            /* Mobile: Card Layout */
            <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
              {filtered.map((r) => (
                <Card key={r.id} variant="outlined" sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>{r.requestNo}</Typography>
                    <StatusChip status={r.status} />
                  </Box>
                  {r.purpose && <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', mb: 0.75, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.purpose}</Typography>}
                  <Box sx={{ display: 'flex', gap: 1.5, fontSize: '0.78rem', color: 'text.secondary', mb: 1, flexWrap: 'wrap' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}><Inventory2Icon sx={{ fontSize: 14 }} /> {r.items?.length || 0} รายการ</Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}><CalendarTodayIcon sx={{ fontSize: 13 }} /> {formatDate(r.createdAt)}</Box>
                    {r.items?.[0]?.dueDate && <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}><AccessTimeIcon sx={{ fontSize: 13 }} /> คืน {formatDate(r.items[0].dueDate)}</Box>}
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button fullWidth size="small" variant="outlined" color="inherit" startIcon={<VisibilityIcon sx={{ fontSize: 16 }} />} onClick={() => setDetailReq(r)}>
                      ดูรายละเอียด
                    </Button>
                    {r.status === 'Pending' && (
                      <Button size="small" variant="outlined" color="error" startIcon={<CloseIcon sx={{ fontSize: 16 }} />} onClick={() => setCancelDialog({ open: true, id: r.id })}>
                        ยกเลิก
                      </Button>
                    )}
                  </Box>
                </Card>
              ))}
            </Box>
          ) : (
            /* Desktop: Table Layout */
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    {['เลขที่คำขอ', 'วัตถุประสงค์', 'รายการ', 'วันที่ขอ', 'กำหนดคืน', 'สถานะ', ''].map(h => (
                      <TableCell key={h} sx={{ fontWeight: 700, color: 'text.disabled', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id} hover>
                      <TableCell sx={{ fontWeight: 700 }}>{r.requestNo}</TableCell>
                      <TableCell sx={{ color: 'text.secondary', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.purpose || '-'}</TableCell>
                      <TableCell><Chip size="small" label={`${r.items?.length || 0} รายการ`} sx={{ fontWeight: 600 }} /></TableCell>
                      <TableCell sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>{formatDate(r.createdAt)}</TableCell>
                      <TableCell sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>{r.items?.[0]?.dueDate ? formatDate(r.items[0].dueDate) : '-'}</TableCell>
                      <TableCell><StatusChip status={r.status} /></TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', gap: 0.75, justifyContent: 'flex-end' }}>
                          <Button size="small" variant="outlined" color="inherit" onClick={() => setDetailReq(r)}>ดู</Button>
                          {r.status === 'Pending' && (
                            <Button size="small" variant="outlined" color="error" onClick={() => setCancelDialog({ open: true, id: r.id })}>ยกเลิก</Button>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Card>
      )}

      {/* Detail Modal */}
      <Dialog open={!!detailReq} onClose={() => setDetailReq(null)} maxWidth="sm" fullWidth>
        {detailReq && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography sx={{ fontWeight: 800, fontSize: '1.05rem' }}>{detailReq.requestNo}</Typography>
                <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>รายละเอียดคำขอยืม</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <StatusChip status={detailReq.status} />
                <IconButton size="small" onClick={() => setDetailReq(null)}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
              </Box>
            </DialogTitle>

            <DialogContent dividers>
              {/* Info */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2.5 }}>
                {[
                  { label: 'วัตถุประสงค์', value: detailReq.purpose || '-' },
                  { label: 'วันที่ขอ', value: new Date(detailReq.createdAt).toLocaleString('th-TH') },
                  { label: 'สถานที่', value: detailReq.location || '-' },
                  { label: 'หมายเหตุ', value: detailReq.note || '-' },
                ].map(f => (
                  <Box key={f.label}>
                    <Typography sx={{ fontSize: '0.72rem', color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.25 }}>{f.label}</Typography>
                    <Typography sx={{ fontSize: '0.88rem', color: 'text.primary', fontWeight: 500 }}>{f.value}</Typography>
                  </Box>
                ))}
              </Box>

              {/* Approver details */}
              {detailReq.approvals && detailReq.approvals.length > 0 && (
                <Box sx={{ p: '12px 16px', bgcolor: alpha(theme.palette.info.main, 0.06), border: `1px solid ${alpha(theme.palette.info.main, 0.25)}`, borderRadius: '10px', mb: 2 }}>
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'info.main', mb: 0.75 }}>ผู้อนุมัติ</Typography>
                  {detailReq.approvals.map((app: any) => {
                    const isApp = app.action === 'Approved';
                    return (
                      <Box key={app.id} sx={{ fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: 0.25, pb: 0.75, borderBottom: detailReq.approvals.length > 1 ? `1px dashed ${alpha(theme.palette.info.main, 0.25)}` : 'none', mb: 0.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box component="span" sx={{ fontWeight: 700 }}>{app.approver?.displayName || app.approver?.adUsername || '-'}</Box>
                          <Chip size="small" label={isApp ? 'อนุมัติ' : 'ไม่อนุมัติ'} color={isApp ? 'success' : 'error'} sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
                        </Box>
                        {app.note && <Box sx={{ fontSize: '0.78rem', color: 'text.secondary', fontStyle: 'italic', mt: 0.25 }}>"{app.note}"</Box>}
                        <Box sx={{ fontSize: '0.68rem', color: 'text.disabled', textAlign: 'right' }}>{new Date(app.actedAt).toLocaleString('th-TH')}</Box>
                      </Box>
                    );
                  })}
                </Box>
              )}

              {/* Rejected reason fallback */}
              {detailReq.status === 'Rejected' && (!detailReq.approvals || detailReq.approvals.length === 0) && (
                <Box sx={{ p: '12px 16px', bgcolor: alpha(theme.palette.error.main, 0.06), border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`, borderRadius: '10px', mb: 2 }}>
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'error.main', mb: 0.5 }}>เหตุผลการไม่อนุมัติ</Typography>
                  <Typography sx={{ fontSize: '0.88rem', color: 'error.dark' }}>ไม่ระบุเหตุผล</Typography>
                </Box>
              )}

              {/* Timeline Tracking */}
              <Box sx={{ mb: 2.5, p: '16px 20px', borderRadius: '12px', border: `1px solid ${theme.palette.divider}` }}>
                <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, mb: 2 }}>สถานะคำขอ</Typography>
                <Stepper activeStep={
                  detailReq.status === 'Pending' ? 1 :
                  detailReq.status === 'Approved' ? 2 :
                  detailReq.status === 'CheckedOut' ? 3 :
                  detailReq.status === 'Returned' ? 4 : 1
                } alternativeLabel>
                  <Step><StepLabel>สร้างคำขอ</StepLabel></Step>
                  <Step>
                    <StepLabel error={detailReq.status === 'Rejected'}>
                      {detailReq.status === 'Rejected' ? 'ไม่อนุมัติ' : 'รอ IT อนุมัติ'}
                    </StepLabel>
                  </Step>
                  <Step><StepLabel>เตรียมอุปกรณ์</StepLabel></Step>
                  <Step><StepLabel>กำลังใช้งาน</StepLabel></Step>
                </Stepper>
              </Box>

              {/* Items */}
              <Box sx={{ mb: 1 }}>
                <Typography sx={{ fontSize: '0.78rem', color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1.25 }}>
                  รายการที่ขอยืม ({detailReq.items?.length || 0})
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {detailReq.items?.map((item: any) => (
                    <Box key={item.id} sx={{ p: '12px 14px', bgcolor: 'action.hover', borderRadius: '10px', border: `1px solid ${theme.palette.divider}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1.25 }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        {item.isQuantityBased && item.inventoryItem ? (
                          <Box>
                            <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.inventoryItem.name}</Typography>
                            <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>จำนวน {item.quantity} {item.inventoryItem.unit}</Typography>
                          </Box>
                        ) : (
                          <Box>
                            <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>{item.asset?.assetCode || 'N/A'} {item.asset?.assetName ? `| ${item.asset.assetName}` : ''}</Typography>
                            <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              ประเภท: {item.asset?.type || '-'} · S/N: {item.asset?.serialNo || '-'} · {item.asset?.brand} {item.asset?.model}
                            </Typography>
                          </Box>
                        )}
                        <Typography sx={{ fontSize: '0.73rem', color: 'text.disabled', mt: 0.5 }}>
                          กำหนดคืน: {item.dueDate ? formatDate(item.dueDate) : '-'}
                        </Typography>
                      </Box>
                      <StatusChip status={item.itemStatus} />
                    </Box>
                  ))}
                </Box>
              </Box>
            </DialogContent>

            <DialogActions sx={{ p: 2.5, gap: 1 }}>
              {detailReq.status === 'Pending' && (
                <Button fullWidth variant="outlined" color="error" startIcon={<CloseIcon sx={{ fontSize: 16 }} />}
                  onClick={() => { setDetailReq(null); setCancelDialog({ open: true, id: detailReq.id }); }}>
                  ยกเลิกคำขอ
                </Button>
              )}
              <Button fullWidth variant="outlined" color="inherit" onClick={() => setDetailReq(null)}>ปิด</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Cancel Confirm Dialog */}
      <Dialog open={cancelDialog.open} onClose={() => setCancelDialog({ open: false, id: null })} maxWidth="xs" fullWidth>
        <DialogContent sx={{ textAlign: 'center', pt: 3.5 }}>
          <DeleteOutlineIcon sx={{ fontSize: 44, color: 'error.main', mb: 1 }} />
          <Typography variant="h6" sx={{ mb: 1 }}>ยืนยันการยกเลิก</Typography>
          <Typography color="text.secondary" sx={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
            คุณต้องการยกเลิกคำขอยืมนี้ใช่หรือไม่?<br />การดำเนินการนี้ไม่สามารถย้อนกลับได้
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button fullWidth variant="outlined" color="inherit" disabled={submitting} onClick={() => setCancelDialog({ open: false, id: null })}>ไม่ยกเลิก</Button>
          <Button fullWidth variant="contained" color="error" disabled={submitting} onClick={() => handleCancel(cancelDialog.id!)}>
            {submitting ? 'กำลังยกเลิก...' : 'ยืนยันยกเลิก'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
