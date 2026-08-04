import { Box, Typography, Card, CardContent, Chip, useTheme } from '@mui/material';
import { CheckCircle, AlertTriangle, Activity, Wifi, WifiOff } from 'lucide-react';

export function StatBox({ label, value, color, icon }: { label: string; value: number | string; color: string; icon: string }) {
  return (
    <Card sx={{ borderRadius: 2.5, border: '0.5px solid', borderColor: 'divider' }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>{label}</Typography>
            <Typography variant="h4" fontWeight={800} sx={{ color, lineHeight: 1.2, mt: 0.5 }}>{value}</Typography>
          </Box>
          <Box sx={{ fontSize: '1.8rem' }}>{icon}</Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export function StatusRow({ icon, label, status, message, latency }: { icon: React.ReactNode; label: string; status?: string; message?: string; latency?: number }) {
  const theme = useTheme();
  const isOk = status === 'ok';
  const isPending = !status;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, border: '0.5px solid', borderColor: 'divider', borderRadius: 2 }}>
      {isPending ? <Activity size={24} color={theme.palette.text.disabled} /> : isOk ? <CheckCircle size={24} color={theme.palette.success.main} /> : <AlertTriangle size={24} color={theme.palette.error.main} />}
      <Box sx={{ flex: 1 }}>
        <Typography variant="subtitle2" fontWeight={700}>{label}</Typography>
        <Typography variant="caption" color="text.secondary">
          {message || 'กำลังตรวจสอบ...'}
          {latency !== undefined && ` (${latency} ms)`}
        </Typography>
      </Box>
      <Chip
        label={isPending ? 'ตรวจสอบ...' : isOk ? 'ONLINE' : 'OFFLINE'}
        size="small"
        color={isPending ? 'default' : isOk ? 'success' : 'error'}
        icon={isPending ? undefined : isOk ? <Wifi size={14} /> : <WifiOff size={14} />}
      />
    </Box>
  );
}
