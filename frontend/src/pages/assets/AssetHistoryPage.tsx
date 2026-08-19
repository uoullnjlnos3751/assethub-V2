import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TablePagination,
  Typography,
  TextField,
  MenuItem,
  alpha,
  useTheme,
} from '@mui/material';
import { Timeline, TimelineItem, TimelineSeparator, TimelineConnector, TimelineContent, TimelineOppositeContent, TimelineDot } from '@mui/lab';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useParams } from 'react-router-dom';
import { assetAPI } from '../../services/api';

const HISTORY_ICON: Record<string, string> = {
  'CREATE': '📝',
  'STATUS_CHANGE': '🔄',
  'OWNER_CHANGE': '👤',
  'LOCATION_CHANGE': '📍',
  'CHECKOUT': '📤',
  'RETURN': '📥',
  'GLPI_SYNC': '📡',
  'AGENT_SYNC': '📡',
  'CUSTODY_CHANGE': '📦',
  'MAINTENANCE': '🔧',
  'IMPORT': '📥',
};

const HISTORY_LABEL: Record<string, string> = {
  'CREATE': 'สร้างทรัพย์สิน',
  'STATUS_CHANGE': 'เปลี่ยนสถานะ',
  'OWNER_CHANGE': 'เปลี่ยนผู้ใช้งาน',
  'LOCATION_CHANGE': 'เปลี่ยนสถานที่',
  'CHECKOUT': 'ยืมทรัพย์สิน',
  'RETURN': 'คืนทรัพย์สิน',
  'GLPI_SYNC': 'ซิงค์จาก GLPI',
  'AGENT_SYNC': 'ซิงค์จาก Agent',
  'CUSTODY_CHANGE': 'เปลี่ยนจุดรับฝาก',
  'MAINTENANCE': 'บำรุงรักษา',
  'IMPORT': 'นำเข้าจากไฟล์',
};

interface HistoryRecord {
  id: number;
  assetId: number;
  actionType: string;
  fromStatus?: string;
  toStatus?: string;
  fromOwner?: string;
  toOwner?: string;
  fromLoc?: string;
  toLoc?: string;
  note?: string;
  createdAt: string;
  actor?: {
    id: number;
    displayName: string;
    email: string;
  };
}

export default function AssetHistoryPage() {
  const theme = useTheme();
  const { id } = useParams();
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [filterAction, setFilterAction] = useState('');

  useEffect(() => {
    if (id) {
      fetchHistory();
    }
  }, [id, page, rowsPerPage, filterAction]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await assetAPI.getAssetHistory(parseInt(id!), {
        limit: rowsPerPage,
        offset: page * rowsPerPage,
      });
      setHistory(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getActionColor = (actionType: string) => {
    if (actionType === 'CREATE') return 'success';
    if (actionType === 'STATUS_CHANGE') return 'info';
    if (actionType === 'OWNER_CHANGE' || actionType === 'LOCATION_CHANGE') return 'warning';
    if (actionType === 'CHECKOUT') return 'warning';
    if (actionType === 'RETURN') return 'success';
    if (actionType === 'GLPI_SYNC') return 'primary';
    return 'default';
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (loading && history.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Card sx={{
        background: alpha(theme.palette.background.paper, 0.65),
        border: `1px solid ${alpha(theme.palette.background.paper, 0.85)}`,
        backdropFilter: 'blur(20px)',
        borderRadius: '14px',
        boxShadow: `0 4px 24px ${alpha(theme.palette.secondary.main, 0.07)}, 0 1px 3px rgba(0, 0, 0, 0.04)`,
      }}>
        <CardContent sx={{ pb: 0 }}>
          <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
            <Typography variant="subtitle2" fontWeight={700} color="text.primary">
              📜 ประวัติการเปลี่ยนแปลง
            </Typography>
            <TextField
              select
              label="ประเภท"
              value={filterAction}
              onChange={(e) => {
                setFilterAction(e.target.value);
                setPage(0);
              }}
              size="small"
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="">ทั้งหมด</MenuItem>
              {Object.entries(HISTORY_LABEL).map(([key, label]) => (
                <MenuItem key={key} value={key}>{label}</MenuItem>
              ))}
            </TextField>
          </Box>

          {history.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
              ไม่มีประวัติการเปลี่ยนแปลง
            </Typography>
          ) : (
            <>
              <Timeline sx={{ p: 0, m: 0 }}>
                {history.map((record: HistoryRecord, index: number) => {
                  const icon = HISTORY_ICON[record.actionType] || '📋';
                  const label = HISTORY_LABEL[record.actionType] || record.actionType;
                  const details = [
                    record.fromStatus && record.toStatus ? `${record.fromStatus} → ${record.toStatus}` : null,
                    record.fromOwner && record.toOwner ? `${record.fromOwner} → ${record.toOwner}` : null,
                    record.fromLoc && record.toLoc ? `${record.fromLoc} → ${record.toLoc}` : null,
                  ].filter(Boolean);

                  return (
                    <TimelineItem key={record.id}>
                      <TimelineOppositeContent
                        sx={{ flex: 0.25, pl: 0, minWidth: '140px', display: { xs: 'none', sm: 'block' } }}
                      >
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 600 }}>
                          {formatDate(record.createdAt).split(' ').slice(0, 3).join(' ')}
                        </Typography>
                        <Typography variant="caption" color="text.disabled">
                          {formatDate(record.createdAt).split(' ').slice(3).join(' ')}
                        </Typography>
                      </TimelineOppositeContent>
                      <TimelineSeparator>
                        <TimelineDot
                          sx={{
                            bgcolor: getActionColor(record.actionType) + '.main',
                            boxShadow: 2,
                          }}
                        >
                          {icon}
                        </TimelineDot>
                        {index < history.length - 1 && <TimelineConnector />}
                      </TimelineSeparator>
                      <TimelineContent sx={{ pb: 2 }}>
                        <Card sx={{
                          bgcolor: alpha(theme.palette.secondary.main, 0.04),
                          border: `1px solid ${alpha(theme.palette.secondary.main, 0.08)}`,
                          borderRadius: '8px',
                        }}>
                          <CardContent sx={{ p: 1.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <Chip
                                label={label}
                                color={getActionColor(record.actionType) as any}
                                variant="filled"
                                size="small"
                                sx={{ fontWeight: 600, fontSize: '11px' }}
                              />
                              {record.actor && (
                                <Typography variant="caption" color="text.secondary">
                                  โดย {record.actor.displayName || record.actor.email}
                                </Typography>
                              )}
                            </Box>

                            {details.length > 0 && (
                              <Box sx={{ mb: 1 }}>
                                {details.map((detail, i) => (
                                  <Typography key={i} variant="body2" color="text.primary" sx={{ fontFamily: 'monospace', fontSize: '12px' }}>
                                    {detail}
                                  </Typography>
                                ))}
                              </Box>
                            )}

                            {record.note && (
                              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', fontSize: '12px' }}>
                                💬 {record.note}
                              </Typography>
                            )}
                          </CardContent>
                        </Card>
                      </TimelineContent>
                    </TimelineItem>
                  );
                })}
              </Timeline>

              {total > rowsPerPage && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <TablePagination
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    component="div"
                    count={total}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    labelRowsPerPage="แถวต่อหน้า"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} จาก ${count}`}
                  />
                </Box>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
