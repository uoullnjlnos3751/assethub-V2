import React from 'react';
import { Box, Typography, LinearProgress, alpha, useTheme } from '@mui/material';
import { Activity, Database, ShoppingCart, Shield, Bell, type LucideIcon } from 'lucide-react';
import { SectionCard } from './SectionCard';

interface ModuleStatus {
  assetRegistry: { healthPct: number };
  borrow: { overdueItems: number };
  pm: { total: number; done: number; pct: number };
  notifications: { sent: number; total: number; successPct: number };
}

function StatusRow({ icon: Icon, label, sub, pct, color }: {
  icon: LucideIcon; label: string; sub: string; pct: number; color: string;
}) {
  const theme = useTheme();
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, py: 0.9 }}>
      <Box sx={{
        width: 28, height: 28, borderRadius: '8px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        bgcolor: alpha(color, theme.palette.mode === 'dark' ? 0.2 : 0.1),
      }}>
        <Icon size={14} strokeWidth={2.3} color={color} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1 }}>
          <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: theme.palette.text.primary }}>{label}</Typography>
          <Typography sx={{ fontSize: '0.78rem', fontWeight: 800, color, fontFamily: 'ui-monospace, "SF Mono", Consolas, monospace' }}>{pct}%</Typography>
        </Box>
        <LinearProgress variant="determinate" value={Math.min(100, Math.max(0, pct))} sx={{
          height: 5, borderRadius: 999, mt: 0.5, mb: 0.25,
          bgcolor: alpha(color, theme.palette.mode === 'dark' ? 0.18 : 0.12),
          '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 999 },
        }} />
        <Typography sx={{ fontSize: '0.68rem', color: theme.palette.text.disabled }}>{sub}</Typography>
      </Box>
    </Box>
  );
}

export function ModuleStatusCard({ moduleStatus }: { moduleStatus: ModuleStatus | null }) {
  const theme = useTheme();
  if (!moduleStatus) return null;

  const { assetRegistry, borrow, pm, notifications } = moduleStatus;

  return (
    <SectionCard title="สถานะการทำงานของระบบ" icon={Activity}>
      <Box>
        <StatusRow
          icon={Database} label="ทะเบียนทรัพย์สิน"
          sub="ความสมบูรณ์ของข้อมูล (S/N + ที่ตั้ง)"
          pct={assetRegistry.healthPct} color={theme.palette.primary.main}
        />
        <StatusRow
          icon={Shield} label="แผน PM ปีนี้"
          sub={`${pm.done}/${pm.total} แผนงานเสร็จสิ้น`}
          pct={pm.pct} color={theme.palette.success.main}
        />
        <StatusRow
          icon={Bell} label="การแจ้งเตือน"
          sub={`ส่งสำเร็จ ${notifications.sent}/${notifications.total} ครั้ง`}
          pct={notifications.successPct} color={theme.palette.secondary.main}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, py: 0.9 }}>
          <Box sx={{
            width: 28, height: 28, borderRadius: '8px', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: alpha(borrow.overdueItems > 0 ? theme.palette.error.main : theme.palette.success.main, theme.palette.mode === 'dark' ? 0.2 : 0.1),
          }}>
            <ShoppingCart size={14} strokeWidth={2.3} color={borrow.overdueItems > 0 ? theme.palette.error.main : theme.palette.success.main} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: theme.palette.text.primary }}>ยืม-คืน</Typography>
            <Typography sx={{ fontSize: '0.68rem', color: theme.palette.text.disabled }}>
              {borrow.overdueItems > 0 ? `เกินกำหนดคืน ${borrow.overdueItems} รายการ` : 'ไม่มีรายการเกินกำหนดคืน'}
            </Typography>
          </Box>
        </Box>
      </Box>
    </SectionCard>
  );
}
