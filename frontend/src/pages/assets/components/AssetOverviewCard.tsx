import React from 'react';
import { Box, Typography, Chip, alpha, useTheme } from '@mui/material';
import StatusChip from '../../../components/StatusChip';
import { getTypeIconComponent } from './assetTypeIcon';
import { calcDepreciation, fmtBaht } from './assetFinance';

const fmtDate = (d?: string | Date | null) =>
  d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

/** One cell of the at-a-glance grid: small label over a bold value, optional sub-line.
 * Flat — no border/background box — so the grid reads as plain paired text
 * rather than a wall of cards, matching the design handoff. */
function Fact({ label, value, sub, mono, accent }: {
  label: string; value: React.ReactNode; sub?: string | null; mono?: boolean; accent?: boolean;
}) {
  const theme = useTheme();
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontSize: '0.69rem', color: theme.palette.text.secondary, lineHeight: 1.4 }}>
        {label}
      </Typography>
      <Typography sx={{
        fontSize: '0.86rem', fontWeight: 700, mt: '2px',
        color: accent ? theme.palette.primary.main : theme.palette.text.primary,
        fontFamily: mono ? 'monospace' : undefined,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {value ?? '—'}
      </Typography>
      {sub && (
        <Typography noWrap sx={{ fontSize: '0.7rem', color: theme.palette.text.disabled }}>{sub}</Typography>
      )}
    </Box>
  );
}

export function AssetOverviewCard({ asset }: { asset: any }) {
  const theme = useTheme();
  const TypeIcon = getTypeIconComponent(asset.type);
  const dep = calcDepreciation(asset);

  const warrantyEnd = asset.warrantyEndDate ? new Date(asset.warrantyEndDate) : null;
  const inWarranty = warrantyEnd ? warrantyEnd.getTime() > Date.now() : null;

  const vendorPo = [asset.vendor, asset.poNumber].filter(Boolean).join(' · ') || '—';

  return (
    <Box sx={{
      bgcolor: theme.palette.background.paper,
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: '16px',
      p: 2.5,
      boxShadow: theme.palette.mode === 'dark' ? '0 6px 18px rgba(0,0,0,0.35)' : '0 6px 18px rgba(16,24,40,.06)',
    }}>
      {/* Identity row */}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
        {asset.image ? (
          <Box
            component="img"
            src={asset.image}
            alt={asset.assetCode}
            sx={{
              width: 74, height: 74, flex: 'none', borderRadius: '16px', objectFit: 'cover',
              border: `1px solid ${theme.palette.divider}`,
            }}
          />
        ) : (
          <Box sx={{
            width: 74, height: 74, flex: 'none', borderRadius: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.18 : 0.1),
            border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
            color: theme.palette.primary.main,
          }}>
            <TypeIcon sx={{ fontSize: 34 }} />
          </Box>
        )}

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography sx={{
              fontSize: '1.2rem', fontWeight: 800, color: theme.palette.primary.main,
              fontFamily: 'monospace', letterSpacing: '-0.01em',
            }}>
              {asset.assetCode || asset.assetName || '—'}
            </Typography>
            <StatusChip status={asset.status} />
            {inWarranty !== null && (
              <Chip
                label={inWarranty ? 'ในประกัน' : 'หมดประกันแล้ว'}
                size="small"
                sx={{
                  height: 22, fontSize: '0.7rem', fontWeight: 700,
                  bgcolor: alpha(inWarranty ? theme.palette.success.main : theme.palette.text.disabled, 0.14),
                  color: inWarranty ? theme.palette.success.main : theme.palette.text.secondary,
                  border: `1px solid ${alpha(inWarranty ? theme.palette.success.main : theme.palette.text.disabled, 0.35)}`,
                }}
              />
            )}
          </Box>
          <Typography sx={{ fontSize: '0.95rem', mt: '2px', color: theme.palette.text.primary }}>
            {[asset.brand, asset.model].filter(Boolean).join(' ') || '—'}
          </Typography>
          <Typography sx={{ fontSize: '0.73rem', color: theme.palette.text.disabled, mt: '1px' }}>
            {asset.type || '—'}
            {asset.category?.name ? ` · ${asset.category.name}` : ''}
            {asset.company ? ` · ${asset.company}` : ''}
          </Typography>
        </Box>
      </Box>

      {/* At-a-glance facts */}
      {/* auto-fit rather than fixed viewport breakpoints: this card sits in a
          flex column between the app nav and the context rail, so its own width
          is far narrower than the viewport — a viewport-driven 4-up grid
          truncated every value at desktop sizes. */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        rowGap: 2, columnGap: 1.25,
        mt: 2.5,
      }}>
        <Fact label="Serial Number" value={asset.serialNo} mono />
        <Fact label="ผู้ครอบครอง" value={asset.ownerName} />
        <Fact label="แผนก" value={asset.departmentId} />
        <Fact
          label="สถานที่"
          value={asset.location}
          sub={asset.floor ? `ชั้น ${asset.floor}` : null}
        />
        <Fact
          label="วันลงทะเบียน"
          value={fmtDate(asset.receivedDate || asset.purchaseDate || asset.createdAt)}
          sub={asset.age != null ? `อายุ ${asset.age} ปี` : null}
        />
        <Fact label="ผู้ขาย / PO" value={vendorPo} />
        <Fact
          label="ราคาซื้อ"
          value={asset.purchasePrice != null ? fmtBaht(Number(asset.purchasePrice)) : '—'}
          sub={asset.budgetCode || null}
          mono accent
        />
        <Fact
          label="มูลค่าคงเหลือ"
          value={dep ? fmtBaht(dep.bookValue) : '—'}
          sub={dep ? (dep.fullyDepreciated ? 'ตัดค่าเสื่อมครบแล้ว' : `ตัดแล้ว ${Math.round(dep.pct * 100)}%`) : 'ยังไม่ได้ตั้งอายุใช้งาน'}
          mono accent
        />
        <Fact
          label="วันหมดประกัน"
          value={fmtDate(asset.warrantyEndDate)}
          sub={warrantyEnd && inWarranty
            ? `เหลือ ${Math.max(0, Math.round((warrantyEnd.getTime() - Date.now()) / 86400000)).toLocaleString('th-TH')} วัน`
            : null}
        />
      </Box>
    </Box>
  );
}
