import React from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import { ShieldCheck } from 'lucide-react';
import { SectionCard } from '../../../components/SectionCard';
import { calcDepreciation, fmtBaht } from './assetFinance';

const fmtDate = (d?: string | Date | null) =>
  d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

/** Label row + gradient progress track + two footnotes, shared by both meters. */
function Meter({ title, right, rightColor, pct, gradient, footLeft, footRight }: {
  title: string; right: string; rightColor: string; pct: number;
  gradient: string; footLeft: string; footRight: string;
}) {
  const theme = useTheme();
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, fontSize: '0.78rem' }}>
        <Typography sx={{ fontSize: '0.78rem', color: theme.palette.text.secondary }}>{title}</Typography>
        <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: rightColor }}>{right}</Typography>
      </Box>
      <Box sx={{
        height: 7, borderRadius: '5px', mt: 0.9, overflow: 'hidden',
        bgcolor: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.12 : 0.08),
      }}>
        <Box sx={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: '100%', background: gradient, transition: 'width .4s' }} />
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mt: 0.75 }}>
        <Typography sx={{ fontSize: '0.7rem', color: theme.palette.text.disabled }}>{footLeft}</Typography>
        <Typography sx={{ fontSize: '0.7rem', color: theme.palette.text.disabled }}>{footRight}</Typography>
      </Box>
    </Box>
  );
}

export function AssetFinanceCard({ asset }: { asset: any }) {
  const theme = useTheme();
  const dep = calcDepreciation(asset);

  const start = asset.purchaseDate ? new Date(asset.purchaseDate) : null;
  const end = asset.warrantyEndDate ? new Date(asset.warrantyEndDate) : null;
  const hasWarranty = !!(start && end && end.getTime() > start.getTime());

  let warrantyPct = 0;
  let warrantyRight = '';
  let warrantyColor = theme.palette.success.main;
  if (hasWarranty) {
    const total = end!.getTime() - start!.getTime();
    const elapsed = Date.now() - start!.getTime();
    warrantyPct = Math.max(0, Math.min(100, (elapsed / total) * 100));
    const daysLeft = Math.round((end!.getTime() - Date.now()) / 86400000);
    if (daysLeft <= 0) {
      warrantyRight = 'หมดประกันแล้ว';
      warrantyColor = theme.palette.text.disabled;
    } else {
      const years = Math.floor(daysLeft / 365);
      const months = Math.floor((daysLeft % 365) / 30);
      warrantyRight = `เหลือ ${years > 0 ? `${years} ปี ` : ''}${months} เดือน`;
      warrantyColor = daysLeft < 90 ? theme.palette.warning.main : theme.palette.success.main;
    }
  }

  // Always rendered, even with neither meter available: the handoff keeps this
  // card beside the spec card at all times, and today only 8 of ~785 assets
  // carry a warranty date and none carry a useful-life, so returning null here
  // meant the layout almost never matched the design. Each half states plainly
  // what's missing instead.
  return (
    <SectionCard title="ประกัน · ค่าเสื่อมราคา" icon={ShieldCheck}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}>
        {hasWarranty ? (
          <Meter
            title="ระยะเวลารับประกัน"
            right={warrantyRight}
            rightColor={warrantyColor}
            pct={warrantyPct}
            gradient={`linear-gradient(90deg, ${theme.palette.success.main}, ${theme.palette.primary.main})`}
            footLeft={fmtDate(start)}
            footRight={fmtDate(end)}
          />
        ) : (
          <Typography sx={{ fontSize: '0.75rem', color: theme.palette.text.disabled }}>
            ยังไม่ได้บันทึกวันที่ซื้อหรือวันหมดประกัน
          </Typography>
        )}

        {dep ? (
          <Meter
            title={`ค่าเสื่อมราคา (อายุใช้งาน ${dep.lifeYears} ปี)`}
            right={`คงเหลือ ${fmtBaht(dep.bookValue)}`}
            rightColor={theme.palette.text.primary}
            pct={dep.pct * 100}
            gradient={`linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`}
            footLeft={`ราคาซื้อ ${fmtBaht(dep.cost)}`}
            footRight={`ตัดแล้ว ${fmtBaht(dep.accumulated)}`}
          />
        ) : (
          <Typography sx={{ fontSize: '0.75rem', color: theme.palette.text.disabled }}>
            ตั้งค่า “อายุการใช้งาน (ปี)” และ “มูลค่าจัดซื้อ” ในหน้าแก้ไข เพื่อให้ระบบคำนวณค่าเสื่อมราคาให้
          </Typography>
        )}

        {dep && (
          <Box sx={{
            display: 'flex', justifyContent: 'space-between', gap: 1,
            pt: 1.5, borderTop: `1px solid ${theme.palette.divider}`,
          }}>
            <Typography sx={{ fontSize: '0.73rem', color: theme.palette.text.secondary }}>
              ครบกำหนดตัดค่าเสื่อม
            </Typography>
            <Typography sx={{ fontSize: '0.73rem', fontWeight: 700, color: theme.palette.text.primary }}>
              {fmtDate(dep.endDate)}
              {dep.salvage > 0 ? ` · ราคาซาก ${fmtBaht(dep.salvage)}` : ''}
            </Typography>
          </Box>
        )}
      </Box>
    </SectionCard>
  );
}
