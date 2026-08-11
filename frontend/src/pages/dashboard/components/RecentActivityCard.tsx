import React from 'react';
import { Box, Typography, Divider, alpha, useTheme } from '@mui/material';
import { Activity, RotateCcw, ShoppingCart } from 'lucide-react';
import { SectionCard } from './SectionCard';
import { statusColor, timeAgo } from '../dashboardHelpers';

type ActItem = { id: string; type: 'request' | 'return'; title: string; sub: string; user: string; time: string; status: string };

export function RecentActivityCard({ activityData, onNavigate }: { activityData: any; onNavigate: () => void }) {
  const theme = useTheme();

  const activity: ActItem[] = [];
  (activityData?.recentRequests || []).forEach((r: any) => {
    activity.push({
      id: 'req-' + r.id, type: 'request',
      title: r.requestNo || `คำขอ #${r.id}`,
      sub: r.purpose || 'คำขอยืมทรัพย์สิน',
      user: r.requester?.displayName || '—',
      time: r.createdAt, status: r.status,
    });
  });
  (activityData?.recentReturns || []).forEach((r: any) => {
    activity.push({
      id: 'ret-' + r.id, type: 'return',
      title: r.requestItem?.asset?.assetName || r.requestItem?.asset?.assetCode || 'คืนอุปกรณ์',
      sub: 'คืนอุปกรณ์',
      user: r.returner?.displayName || '—',
      time: r.returnedAt, status: 'Returned',
    });
  });
  activity.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  return (
    <SectionCard title="กิจกรรมล่าสุด" icon={Activity} action={onNavigate} actionLabel="ดูทั้งหมด">
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        {activity.length > 0 ? activity.slice(0, 6).map((a, i) => {
          const color = statusColor(theme, a.status);
          return (
            <React.Fragment key={a.id}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, py: 1 }}>
                <Box sx={{
                  width: 32, height: 32, borderRadius: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  bgcolor: alpha(color, 0.12), flexShrink: 0,
                }}>
                  {a.type === 'return'
                    ? <RotateCcw size={15} color={color} />
                    : <ShoppingCart size={15} color={color} />}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: theme.palette.text.primary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {a.title}
                  </Typography>
                  <Typography sx={{ fontSize: '0.7rem', color: theme.palette.text.secondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {a.sub} · {a.user}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                  <Typography sx={{ fontSize: '0.68rem', color: theme.palette.text.secondary }}>{timeAgo(a.time)}</Typography>
                </Box>
              </Box>
              {i < Math.min(activity.length, 6) - 1 && <Divider sx={{ borderColor: theme.palette.divider }} />}
            </React.Fragment>
          );
        }) : (
          <Typography sx={{ fontSize: '0.78rem', color: theme.palette.text.secondary, py: 2 }}>ยังไม่มีกิจกรรม</Typography>
        )}
      </Box>
    </SectionCard>
  );
}
