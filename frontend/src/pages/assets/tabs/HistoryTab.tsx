import React from 'react';
import { Card, Typography, Box, Avatar, alpha, useTheme } from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from '@mui/lab';
import HistoryIcon from '@mui/icons-material/History';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import EditNoteIcon from '@mui/icons-material/EditNote';
import PersonIcon from '@mui/icons-material/Person';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';

/* ─── History helpers ─────────────────────────────────────────── */
const HISTORY_LABEL: Record<string, string> = {
  CREATE: 'เพิ่มทรัพย์สินเข้าระบบ', STATUS_CHANGE: 'เปลี่ยนสถานะ',
  OWNER_CHANGE: 'เปลี่ยนผู้ถือครอง', LOCATION_CHANGE: 'เปลี่ยนสถานที่',
  CHECKOUT: 'ส่งมอบอุปกรณ์ Check-out', RETURN: 'คืนอุปกรณ์',
};

const HISTORY_ICON: Record<string, React.ElementType> = {
  CREATE: AddCircleIcon, STATUS_CHANGE: EditNoteIcon, OWNER_CHANGE: PersonIcon,
  LOCATION_CHANGE: LocationOnIcon, CHECKOUT: ShoppingCartIcon, RETURN: AssignmentReturnIcon,
};

/* ─── History tab (MUI Lab Timeline) ──────────────────────────── */
export function HistoryTab({ asset }: { asset: any }) {
  const theme = useTheme();
  const history = asset.assetHistory || [];
  if (history.length === 0) return (
    <Card sx={{ p: 4, textAlign: 'center' }}>
      <Typography variant="body2" color="text.secondary">ไม่มีประวัติการเปลี่ยนแปลง</Typography>
    </Card>
  );

  return (
    <Card sx={{ p: 2.5 }}>
      <Timeline sx={{ p: 0, m: 0 }}>
        {history.map((h: any, i: number) => {
          const ActionIcon = HISTORY_ICON[h.actionType] || HistoryIcon;
          const label = HISTORY_LABEL[h.actionType] || h.actionType;
          const detail = [h.fromStatus, h.toStatus, h.fromOwner, h.toOwner, h.fromLoc, h.toLoc, h.note].filter(Boolean).join(' → ');

          let dotColor: any = 'grey';
          if (h.actionType === 'CREATE') dotColor = 'primary';
          else if (h.actionType === 'STATUS_CHANGE') dotColor = 'info';
          else if (h.actionType === 'CHECKOUT') dotColor = 'warning';
          else if (h.actionType === 'RETURN') dotColor = 'success';

          return (
            <TimelineItem key={h.id ?? i}>
              <TimelineOppositeContent sx={{ flex: 0.2, pl: 0, minWidth: '100px', display: { xs: 'none', sm: 'block' } }}>
                <Typography variant="caption" color="text.secondary">
                  {new Date(h.createdAt).toLocaleDateString('th-TH')}
                </Typography>
                <Typography variant="caption" display="block" color="text.disabled">
                  {new Date(h.createdAt).toLocaleTimeString('th-TH')}
                </Typography>
              </TimelineOppositeContent>
              <TimelineSeparator>
                <TimelineDot color={dotColor} variant="outlined" sx={{ p: '6px' }}>
                  <ActionIcon sx={{ fontSize: 14 }} />
                </TimelineDot>
                {i < history.length - 1 && <TimelineConnector sx={{ bgcolor: theme.palette.divider }} />}
              </TimelineSeparator>
              <TimelineContent sx={{ pb: 3, pr: 0 }}>
                <Typography variant="body2" fontWeight={700} color="text.primary">
                  {label}
                </Typography>
                {detail && (
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25, lineHeight: 1.5, bgcolor: alpha(theme.palette.text.secondary, 0.06), p: 1, borderRadius: 1 }}>
                    {detail}
                  </Typography>
                )}
                <Box sx={{ display: { xs: 'flex', sm: 'none' }, gap: 1, alignItems: 'center', mt: 0.5, flexWrap: 'wrap' }}>
                  <Typography variant="caption" color="text.disabled">
                    {new Date(h.createdAt).toLocaleString('th-TH')}
                  </Typography>
                </Box>
                {h.actor && (
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                    <Avatar sx={{ width: 18, height: 18, fontSize: '8px', fontWeight: 700, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
                      {String(h.actor.displayName || h.actor.email || 'U').substring(0, 2).toUpperCase()}
                    </Avatar>
                    <Typography variant="caption" color="text.secondary">
                      โดย {h.actor.displayName || h.actor.email}
                    </Typography>
                  </Box>
                )}
              </TimelineContent>
            </TimelineItem>
          );
        })}
      </Timeline>
    </Card>
  );
}
