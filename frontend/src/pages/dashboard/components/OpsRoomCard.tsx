import React from 'react';
import { Box, Typography, Avatar, alpha, useTheme } from '@mui/material';
import { ShoppingCart, Wrench, PackageSearch, Users, type LucideIcon } from 'lucide-react';
import { SectionCard } from './SectionCard';

interface OnlinePerson {
  userId: number;
  displayName: string | null;
  adUsername: string;
  role: string;
  avatarUrl?: string | null;
  activity: string;
  zone: 'borrow' | 'pm' | 'inventory' | null;
}

interface Desk {
  key: 'borrow' | 'pm' | 'inventory';
  label: string;
  icon: LucideIcon;
  metric: string;
  alertLevel: 'ok' | 'warn' | 'error';
}

function DeskBay({ desk, people, accent }: { desk: Desk; people: OnlinePerson[]; accent: string }) {
  const theme = useTheme();
  const Icon = desk.icon;
  const occupied = people.length > 0;
  return (
    <Box sx={{
      flex: 1, minWidth: 0, borderRadius: '14px', p: 1.75,
      bgcolor: occupied ? alpha(accent, theme.palette.mode === 'dark' ? 0.1 : 0.05) : alpha(theme.palette.text.primary, 0.02),
      border: `1px dashed ${occupied ? alpha(accent, 0.4) : theme.palette.divider}`,
      display: 'flex', flexDirection: 'column', gap: 1,
      transition: 'all .3s ease',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <Box sx={{
          width: 26, height: 26, borderRadius: '8px', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: alpha(accent, theme.palette.mode === 'dark' ? 0.22 : 0.12),
        }}>
          <Icon size={14} strokeWidth={2.3} color={accent} />
        </Box>
        <Typography sx={{ fontSize: '0.78rem', fontWeight: 800, color: theme.palette.text.primary, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {desk.label}
        </Typography>
      </Box>

      <Box sx={{ minHeight: 40, display: 'flex', flexWrap: 'wrap', gap: 0.75, alignContent: 'flex-start' }}>
        {occupied ? people.map((p, i) => {
          const initial = (p.displayName || p.adUsername || '?').charAt(0).toUpperCase();
          return (
            <Box key={p.userId} sx={{ position: 'relative', animation: `deskFloat 3s ease-in-out ${i * 0.4}s infinite` }} title={`${p.displayName || p.adUsername} · ${p.activity}`}>
              <Avatar src={p.avatarUrl || undefined} sx={{ width: 26, height: 26, fontSize: '0.65rem', fontWeight: 700, bgcolor: accent, border: `2px solid ${theme.palette.background.paper}` }}>
                {!p.avatarUrl && initial}
              </Avatar>
              <Box sx={{
                position: 'absolute', bottom: -1, right: -1, width: 7, height: 7, borderRadius: '50%',
                bgcolor: theme.palette.success.main, border: `1.5px solid ${theme.palette.background.paper}`,
              }} />
            </Box>
          );
        }) : (
          <Typography sx={{ fontSize: '0.68rem', color: theme.palette.text.disabled, fontStyle: 'italic', py: 0.5 }}>
            ไม่มีใครอยู่ที่โต๊ะนี้
          </Typography>
        )}
      </Box>

      <Typography sx={{
        fontSize: '0.7rem', fontWeight: 700, mt: 'auto', pt: 0.5,
        color: desk.alertLevel === 'error' ? theme.palette.error.main : desk.alertLevel === 'warn' ? theme.palette.warning.main : theme.palette.text.secondary,
      }}>
        {desk.metric}
      </Typography>
    </Box>
  );
}

export function OpsRoomCard({ onlineNow, borrowActive, borrowPending, pmDone, pmTotal, pmPct, lowStockCount }: {
  onlineNow: OnlinePerson[];
  borrowActive: number; borrowPending: number;
  pmDone: number; pmTotal: number; pmPct: number;
  lowStockCount: number;
}) {
  const theme = useTheme();

  const desks: Desk[] = [
    { key: 'borrow', label: 'โต๊ะยืม-คืน', icon: ShoppingCart, metric: `กำลังยืม ${borrowActive} · รออนุมัติ ${borrowPending}`, alertLevel: borrowPending > 0 ? 'warn' : 'ok' },
    { key: 'pm', label: 'โต๊ะ PM', icon: Wrench, metric: `เสร็จแล้ว ${pmDone}/${pmTotal} (${pmPct}%)`, alertLevel: 'ok' },
    { key: 'inventory', label: 'คลังวัสดุ', icon: PackageSearch, metric: lowStockCount > 0 ? `ใกล้หมด ${lowStockCount} รายการ` : 'สต๊อกปกติ', alertLevel: lowStockCount > 0 ? 'error' : 'ok' },
  ];

  const others = onlineNow.filter(p => !p.zone);

  return (
    <Box sx={{
      '@keyframes deskFloat': {
        '0%, 100%': { transform: 'translateY(0)' },
        '50%': { transform: 'translateY(-3px)' },
      },
      '@keyframes ringPulse': {
        '0%': { boxShadow: `0 0 0 0 ${alpha(theme.palette.success.main, 0.45)}` },
        '70%': { boxShadow: `0 0 0 10px ${alpha(theme.palette.success.main, 0)}` },
        '100%': { boxShadow: `0 0 0 0 ${alpha(theme.palette.success.main, 0)}` },
      },
    }}>
      <SectionCard title="ห้องปฏิบัติการ IT (สด)" icon={Users}>
        <Box sx={{ height: 480, display: 'flex', flexDirection: 'column', gap: 1.5 }}>

          {/* Center reception — total online headcount */}
          <Box sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5,
            borderRadius: '14px', py: 2,
            bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.06),
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          }}>
            <Box sx={{
              width: 44, height: 44, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              bgcolor: theme.palette.success.main, color: '#fff',
              fontWeight: 800, fontSize: '1.05rem',
              animation: onlineNow.length > 0 ? 'ringPulse 2.2s infinite' : 'none',
            }}>
              {onlineNow.length}
            </Box>
            <Box>
              <Typography sx={{ fontSize: '0.82rem', fontWeight: 800, color: theme.palette.text.primary }}>
                ออนไลน์ตอนนี้
              </Typography>
              <Typography sx={{ fontSize: '0.68rem', color: theme.palette.text.secondary }}>
                ทั่วทั้งระบบ · อัปเดตทุก 15 วินาที
              </Typography>
            </Box>
          </Box>

          {/* Desks */}
          <Box sx={{ display: 'flex', gap: 1.25, flex: 1, flexWrap: 'wrap' }}>
            {desks.map(d => (
              <DeskBay
                key={d.key}
                desk={d}
                people={onlineNow.filter(p => p.zone === d.key)}
                accent={d.key === 'borrow' ? theme.palette.warning.main : d.key === 'pm' ? theme.palette.success.main : theme.palette.secondary.main}
              />
            ))}
          </Box>

          {/* Hallway — everyone else online but not in a tracked zone */}
          {others.length > 0 && (
            <Box sx={{
              borderRadius: '14px', p: 1.5,
              border: `1px dashed ${theme.palette.divider}`,
              display: 'flex', alignItems: 'center', gap: 1,
            }}>
              <Typography sx={{ fontSize: '0.7rem', color: theme.palette.text.disabled, fontWeight: 700, mr: 0.5 }}>
                ทางเดิน
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {others.map((p, i) => {
                  const initial = (p.displayName || p.adUsername || '?').charAt(0).toUpperCase();
                  return (
                    <Avatar key={p.userId} src={p.avatarUrl || undefined} title={`${p.displayName || p.adUsername} · ${p.activity}`} sx={{
                      width: 24, height: 24, fontSize: '0.6rem', fontWeight: 700,
                      bgcolor: theme.palette.text.disabled,
                      animation: `deskFloat 3s ease-in-out ${i * 0.4}s infinite`,
                    }}>
                      {!p.avatarUrl && initial}
                    </Avatar>
                  );
                })}
              </Box>
            </Box>
          )}
        </Box>
      </SectionCard>
    </Box>
  );
}
