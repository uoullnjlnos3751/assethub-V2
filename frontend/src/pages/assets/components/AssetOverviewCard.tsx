import React, { useEffect, useState } from 'react';
import { Box, Typography, Chip, alpha, useTheme } from '@mui/material';
import { getTypeIconComponent } from './assetTypeIcon';
import { calcDepreciation, fmtBaht } from './assetFinance';
import { EditableStatusChip, EditableFact, EditableCatalogChip } from './EditableAssetFields';
import { useAuth } from '../../../contexts/AuthContext';
import { assetAPI } from '../../../services/api';

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
        wordBreak: 'break-word',
      }}>
        {value ?? '—'}
      </Typography>
      {sub && (
        <Typography noWrap sx={{ fontSize: '0.7rem', color: theme.palette.text.disabled }}>{sub}</Typography>
      )}
    </Box>
  );
}

interface AssetOverviewCardProps {
  asset: any;
  /** Applies one field's new value and reloads the asset. Omit to render every chip read-only (e.g. no role check done yet).
   *  value is usually a string, except catalogItemId which is a number|null FK — see EditableCatalogChip. */
  onQuickUpdate?: (field: string, value: any) => Promise<void>;
}

export function AssetOverviewCard({ asset, onQuickUpdate }: AssetOverviewCardProps) {
  const theme = useTheme();
  const { user } = useAuth();
  const TypeIcon = getTypeIconComponent(asset.type);
  const dep = calcDepreciation(asset);
  const canEdit = !!onQuickUpdate && (user?.role === 'IT_ADMIN' || user?.role === 'SUPERADMIN');

  // Master-data option lists for the department/location pickers — fetched
  // once, only for roles that can actually open an editor with them.
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const [locationOptions, setLocationOptions] = useState<string[]>([]);
  useEffect(() => {
    if (!canEdit) return;
    assetAPI.departmentOptions().then(res => setDepartmentOptions(res.data || [])).catch(() => {});
    assetAPI.locationOptions().then(res => setLocationOptions(res.data || [])).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEdit]);

  const departmentSelectOptions = Array.from(new Set([...departmentOptions, asset.departmentId].filter(Boolean)));
  const locationSelectOptions = Array.from(new Set([...locationOptions, asset.location].filter(Boolean)));

  const searchOwners = (q: string) =>
    assetAPI.searchOwners(q).then(res => (res.data || []).map((u: any) => ({
      label: u.displayName || u.adUsername || '',
      value: u.displayName || u.adUsername || '',
      sub: [u.department, u.company].filter(Boolean).join(' · ') || undefined,
    })));

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
            <EditableStatusChip
              status={asset.status}
              canEdit={canEdit}
              onChange={(v) => onQuickUpdate!('status', v)}
            />
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
            <EditableCatalogChip
              catalogItem={asset.catalogItem || null}
              canEdit={canEdit}
              onChange={(catalogItemId) => onQuickUpdate!('catalogItemId', catalogItemId)}
            />
          </Box>
          <Typography sx={{ fontSize: '0.95rem', mt: '2px', color: theme.palette.text.primary }}>
            {[asset.brand, asset.model].filter(Boolean).join(' ') || '—'}
          </Typography>
          <Typography sx={{ fontSize: '0.73rem', color: theme.palette.text.disabled, mt: '1px' }}>
            {asset.type || '—'}
            {asset.category?.name ? ` · ${asset.category.name}` : ''}
            {asset.company ? ` · ${asset.company}` : ''}
          </Typography>
          {warrantyEnd && (
            <Typography sx={{ fontSize: '0.73rem', color: theme.palette.text.disabled, mt: '1px' }}>
              {inWarranty ? 'ประกันถึง' : 'ประกันหมดอายุ'} {fmtDate(warrantyEnd)}
              {inWarranty ? ` · เหลือ ${Math.max(0, Math.round((warrantyEnd.getTime() - Date.now()) / 86400000)).toLocaleString('th-TH')} วัน` : ''}
            </Typography>
          )}
        </Box>
      </Box>

      {/* At-a-glance facts — kept to exactly 8 cells (2 rows of 4, per the
          design handoff) by moving warranty expiry up into the identity block
          above instead of adding it as a 9th, lopsided cell here. Fixed column
          counts rather than auto-fit: auto-fit sizes columns off the card's
          own width, which can land on 3 or 5-up instead of 4 and scramble the
          Serial/Owner/Dept/Location · Date/Vendor/Price/Value grouping. */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
        rowGap: 2, columnGap: 1.25,
        mt: 2.5,
      }}>
        <Fact label="Serial Number" value={asset.serialNo} mono />
        <EditableFact
          label="ผู้ครอบครอง"
          value={asset.ownerName}
          canEdit={canEdit}
          onChange={(v) => onQuickUpdate!('ownerName', v)}
          searchFn={searchOwners}
          placeholderEmpty="ไม่มีผู้ครอบครอง"
        />
        <EditableFact
          label="แผนก"
          value={asset.departmentId}
          canEdit={canEdit}
          onChange={(v) => onQuickUpdate!('departmentId', v)}
          options={departmentSelectOptions}
          required
        />
        <EditableFact
          label="สถานที่"
          value={asset.location}
          sub={asset.floor ? `ชั้น ${asset.floor}` : null}
          canEdit={canEdit}
          onChange={(v) => onQuickUpdate!('location', v)}
          options={locationSelectOptions}
          placeholderEmpty="ไม่ระบุสถานที่"
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
      </Box>
    </Box>
  );
}
