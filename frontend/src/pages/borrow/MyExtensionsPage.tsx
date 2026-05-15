import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Chip, Grid, CircularProgress,
  Alert, alpha, useTheme, Divider,
} from '@mui/material';
import { motion } from 'framer-motion';
import ExtensionIcon from '@mui/icons-material/Extension';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import { borrowAPI } from '../../services/api';
import StatusChip from '../../components/StatusChip';
import EmptyState from '../../components/EmptyState';

interface MyExtension {
  id: number;
  requestNo: string;
  status: string;
  reason: string;
  decisionNote: string | null;
  createdAt: string;
  decidedAt: string | null;
  items: Array<{
    requestItem: {
      asset: { assetCode: string; brand: string; model: string };
      dueDate: string;
    };
    oldDueDate: string;
    requestedDueDate: string;
    extraDays: number;
  }>;
}

export default function MyExtensionsPage() {
  const theme = useTheme();
  const [extensions, setExtensions] = useState<MyExtension[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    borrowAPI.myExtensions()
      .then((res) => {
        const raw = res.data || [];
        const mapped = raw.map((ext: any) => ({
          id: ext.id,
          requestNo: ext.request?.requestNo || '',
          status: ext.status,
          reason: ext.reason,
          decisionNote: ext.decisionNote,
          createdAt: ext.createdAt,
          decidedAt: ext.decidedAt,
          items: ext.items || [],
        }));
        setExtensions(mapped);
      })
      .catch(() => setExtensions([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ pb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ExtensionIcon /> คำขอขยายวันของฉัน
        </Typography>
        <Typography variant="body1" color="text.secondary">ติดตามสถานะคำขอขยายวันยืมทรัพย์สิน</Typography>
      </Box>

      {extensions.length === 0 ? (
        <EmptyState
          title="ไม่มีคำขอขยายวัน"
          description="คุณยังไม่ได้ส่งคำขอขยายวันยืมทรัพย์สิน"
        />
      ) : (
        <Grid container spacing={2.5}>
          {extensions.map((ext) => {
            const item = ext.items?.[0];
            const isPending = ext.status === 'Pending';
            const isApproved = ext.status === 'Approved';
            const isRejected = ext.status === 'Rejected';

            return (
              <Grid item xs={12} key={ext.id}>
                <Card sx={{
                  borderLeft: `4px solid ${isPending ? theme.palette.warning.main : isApproved ? theme.palette.success.main : theme.palette.error.main}`,
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                          <Typography fontWeight={700}>{ext.requestNo}</Typography>
                          <StatusChip status={ext.status} />
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          ขอเมื่อ: {new Date(ext.createdAt).toLocaleString('th-TH')}
                          {ext.decidedAt && ` · ตอบกลับเมื่อ: ${new Date(ext.decidedAt).toLocaleString('th-TH')}`}
                        </Typography>
                      </Box>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    {item && (
                      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: 2 }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>ทรัพย์สิน</Typography>
                          <Typography fontWeight={600}>{item.requestItem?.asset?.assetCode}</Typography>
                          <Typography variant="body2" color="text.secondary">{item.requestItem?.asset?.brand} {item.requestItem?.asset?.model}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>กำหนดคืนเดิม</Typography>
                          <Typography fontWeight={600}>{new Date(item.oldDueDate).toLocaleDateString('th-TH')}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>ขอขยาย</Typography>
                          <Typography fontWeight={600} color="primary.main">+{item.extraDays} วัน</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>กำหนดคืนใหม่</Typography>
                          <Typography fontWeight={600} color={isApproved ? 'success.main' : 'text.secondary'}>
                            {new Date(item.requestedDueDate).toLocaleDateString('th-TH')}
                          </Typography>
                        </Box>
                      </Box>
                    )}

                    <Box sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.03), borderRadius: 2, mb: 2 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>เหตุผลที่ขอ</Typography>
                      <Typography variant="body2">{ext.reason}</Typography>
                    </Box>

                    {isRejected && ext.decisionNote && (
                      <Box sx={{ p: 2, bgcolor: alpha(theme.palette.error.main, 0.05), borderRadius: 2, border: `1px solid ${alpha(theme.palette.error.main, 0.15)}` }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <CancelIcon fontSize="small" color="error" />
                          <Typography variant="caption" fontWeight={700} color="error.main">ไม่อนุมัติ - ข้อความจาก IT Admin</Typography>
                        </Box>
                        <Typography variant="body2" color="error.dark" sx={{ whiteSpace: 'pre-wrap' }}>
                          {ext.decisionNote}
                        </Typography>
                      </Box>
                    )}

                    {isRejected && !ext.decisionNote && (
                      <Box sx={{ p: 2, bgcolor: alpha(theme.palette.error.main, 0.05), borderRadius: 2, border: `1px solid ${alpha(theme.palette.error.main, 0.15)}` }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CancelIcon fontSize="small" color="error" />
                          <Typography variant="body2" color="error.dark" fontWeight={600}>คำขอไม่ได้รับการอนุมัติ</Typography>
                        </Box>
                      </Box>
                    )}

                    {isApproved && ext.decisionNote && (
                      <Box sx={{ p: 2, bgcolor: alpha(theme.palette.success.main, 0.05), borderRadius: 2, border: `1px solid ${alpha(theme.palette.success.main, 0.15)}` }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <CheckCircleIcon fontSize="small" color="success" />
                          <Typography variant="caption" fontWeight={700} color="success.main">อนุมัติ - หมายเหตุ</Typography>
                        </Box>
                        <Typography variant="body2" color="success.dark">
                          {ext.decisionNote}
                        </Typography>
                      </Box>
                    )}

                    {isPending && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, bgcolor: alpha(theme.palette.warning.main, 0.05), borderRadius: 2 }}>
                        <HourglassEmptyIcon fontSize="small" color="warning" />
                        <Typography variant="body2" color="warning.dark" fontWeight={600}>รออนุมัติจาก IT Admin</Typography>
                      </Box>
                    )}
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
