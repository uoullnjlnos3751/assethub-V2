import React from 'react';
import { Box, Typography, Chip, LinearProgress, alpha, useTheme } from '@mui/material';
import { FileText, Key } from 'lucide-react';
import { SectionCard } from './SectionCard';

export function ContractLicenseSummary({ contractList, licenseList, navigate }: {
  contractList: any[];
  licenseList: any[];
  navigate: (path: string) => void;
}) {
  const theme = useTheme();

  if (contractList.length === 0 && licenseList.length === 0) return null;

  const dl = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  const cExpired  = contractList.filter(c => c.endDate && dl(c.endDate) < 0).length;
  const cExp30    = contractList.filter(c => c.endDate && dl(c.endDate) >= 0 && dl(c.endDate) <= 30).length;
  const cExp90    = contractList.filter(c => c.endDate && dl(c.endDate) >= 0 && dl(c.endDate) <= 90).length;
  const totalSeats = licenseList.reduce((s, l) => s + (l.totalSeats || 0), 0);
  const usedSeats  = licenseList.reduce((s, l) => s + (l.usedSeats || 0), 0);
  const seatPct    = totalSeats > 0 ? Math.round((usedSeats / totalSeats) * 100) : 0;
  const seatColor  = seatPct >= 95 ? theme.palette.error.main : seatPct >= 80 ? theme.palette.warning.main : theme.palette.success.main;
  const lExpiring  = licenseList.filter(l => { if (!l.expiryDate) return false; const d = dl(l.expiryDate); return d >= 0 && d <= 90; }).length;
  const topContracts = [...contractList]
    .filter(c => c.endDate)
    .sort((a, b) => dl(a.endDate) - dl(b.endDate))
    .slice(0, 3);

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 1.5, mb: 2 }}>

      {/* Contract panel */}
      <SectionCard title="สัญญา & Warranty" icon={FileText} action={() => navigate('/contracts')} actionLabel="จัดการสัญญา">
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, mb: 1.5 }}>
          {[
            { label: 'สัญญาทั้งหมด',    value: contractList.length, color: theme.palette.primary.main },
            { label: 'หมดอายุแล้ว',      value: cExpired,  color: theme.palette.error.dark },
            { label: 'ใกล้หมด 30 วัน',   value: cExp30,    color: theme.palette.error.main },
            { label: 'ใกล้หมด 90 วัน',   value: cExp90,    color: theme.palette.warning.main },
          ].map(s => (
            <Box key={s.label} sx={{
              p: '8px 12px', borderRadius: 1.5, bgcolor: alpha(s.color, 0.07),
              border: `1px solid ${alpha(s.color, 0.2)}`,
            }}>
              <Typography sx={{ fontSize: '1.35rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</Typography>
              <Typography sx={{ fontSize: '0.68rem', color: theme.palette.text.secondary, mt: 0.25 }}>{s.label}</Typography>
            </Box>
          ))}
        </Box>
        {topContracts.length > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: theme.palette.text.disabled, mb: 0.25, textTransform: 'uppercase', letterSpacing: 0.5 }}>ใกล้หมดอายุก่อน</Typography>
            {topContracts.map(c => {
              const days = dl(c.endDate);
              const color = days < 0 ? theme.palette.error.dark : days <= 30 ? theme.palette.error.main : theme.palette.warning.main;
              return (
                <Box key={c.id} onClick={() => navigate('/contracts')} sx={{
                  display: 'flex', alignItems: 'center', gap: 1,
                  p: '6px 10px', borderRadius: 1.5, cursor: 'pointer',
                  bgcolor: alpha(color, 0.05), border: `1px solid ${alpha(color, 0.18)}`,
                  '&:hover': { bgcolor: alpha(color, 0.10) },
                }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography noWrap sx={{ fontSize: '0.75rem', fontWeight: 600, color: theme.palette.text.primary }}>{c.title}</Typography>
                    <Typography sx={{ fontSize: '0.68rem', color: theme.palette.text.secondary }}>{c.vendor || '—'} · {c.endDate?.slice(0, 10)}</Typography>
                  </Box>
                  <Chip
                    size="small"
                    label={days < 0 ? 'หมดแล้ว' : `${days} วัน`}
                    sx={{ height: 20, fontSize: '0.67rem', fontWeight: 700, bgcolor: alpha(color, 0.15), color }}
                  />
                </Box>
              );
            })}
          </Box>
        )}
      </SectionCard>

      {/* License panel */}
      <SectionCard title="Software License" icon={Key} action={() => navigate('/licenses')} actionLabel="จัดการ License">
        <Box sx={{ mb: 1.5, p: 1.5, borderRadius: 2, bgcolor: alpha(seatColor, 0.06), border: `1px solid ${alpha(seatColor, 0.2)}` }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
            <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: theme.palette.text.primary }}>การใช้งาน Seats รวม</Typography>
            <Typography sx={{ fontSize: '1.1rem', fontWeight: 800, color: seatColor }}>{seatPct}%</Typography>
          </Box>
          <LinearProgress variant="determinate" value={seatPct} sx={{
            height: 7, borderRadius: 4,
            bgcolor: alpha(seatColor, 0.12),
            '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: seatColor },
          }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
            <Typography sx={{ fontSize: '0.68rem', color: theme.palette.text.secondary }}>ใช้ {usedSeats.toLocaleString()} จาก {totalSeats.toLocaleString()} seats</Typography>
            <Typography sx={{ fontSize: '0.68rem', color: theme.palette.success.main, fontWeight: 600 }}>ว่าง {(totalSeats - usedSeats).toLocaleString()}</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mb: 1.5 }}>
          {[
            { label: 'License ทั้งหมด',    value: licenseList.length, color: theme.palette.primary.main },
            { label: 'ใกล้หมดอายุ 90 วัน', value: lExpiring,          color: theme.palette.warning.main },
            { label: 'Seats ว่าง',          value: totalSeats - usedSeats, color: theme.palette.success.main },
          ].map(s => (
            <Box key={s.label} sx={{ p: '8px 10px', borderRadius: 1.5, bgcolor: alpha(s.color, 0.07), border: `1px solid ${alpha(s.color, 0.2)}`, textAlign: 'center' }}>
              <Typography sx={{ fontSize: '1.25rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</Typography>
              <Typography sx={{ fontSize: '0.63rem', color: theme.palette.text.secondary, mt: 0.25 }}>{s.label}</Typography>
            </Box>
          ))}
        </Box>
        {licenseList.filter(l => l.totalSeats > 0 && (l.usedSeats || 0) / l.totalSeats >= 0.8).length > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: theme.palette.text.disabled, mb: 0.25, textTransform: 'uppercase', letterSpacing: 0.5 }}>License ที่ใช้งานสูง (≥ 80%)</Typography>
            {licenseList
              .filter(l => l.totalSeats > 0 && (l.usedSeats || 0) / l.totalSeats >= 0.8)
              .sort((a, b) => ((b.usedSeats || 0) / b.totalSeats) - ((a.usedSeats || 0) / a.totalSeats))
              .slice(0, 3)
              .map(l => {
                const p = Math.round(((l.usedSeats || 0) / l.totalSeats) * 100);
                const c = p >= 90 ? theme.palette.error.main : theme.palette.warning.main;
                return (
                  <Box key={l.id} onClick={() => navigate('/licenses')} sx={{
                    display: 'flex', alignItems: 'center', gap: 1,
                    p: '6px 10px', borderRadius: 1.5, cursor: 'pointer',
                    bgcolor: alpha(c, 0.05), border: `1px solid ${alpha(c, 0.18)}`,
                    '&:hover': { bgcolor: alpha(c, 0.10) },
                  }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography noWrap sx={{ fontSize: '0.75rem', fontWeight: 600, color: theme.palette.text.primary }}>{l.name}</Typography>
                      <Typography sx={{ fontSize: '0.68rem', color: theme.palette.text.secondary }}>{l.usedSeats || 0}/{l.totalSeats} seats</Typography>
                    </Box>
                    <Chip size="small" label={`${p}%`} sx={{ height: 20, fontSize: '0.67rem', fontWeight: 700, bgcolor: alpha(c, 0.15), color: c }} />
                  </Box>
                );
              })}
          </Box>
        )}
      </SectionCard>

    </Box>
  );
}
