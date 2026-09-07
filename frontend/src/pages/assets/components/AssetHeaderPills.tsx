import React, { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { Target, MapPin, User } from 'lucide-react';
import { EditableStatusChip, EditableFact } from './EditableAssetFields';
import { assetAPI } from '../../../services/api';

/**
 * The three quick-fact "pill" buttons across the top of the profile header —
 * Status / Location / Owner — matching the reference ITAM's own header row.
 * Same editable machinery as the at-a-glance fact grid further down the page
 * (EditableStatusChip / EditableFact), just in the header's pill chrome
 * instead of the grid's plain label-over-value cells.
 */
export function AssetHeaderPills({ asset, canEdit, onQuickUpdate }: {
  asset: any;
  canEdit: boolean;
  onQuickUpdate?: (field: string, value: any) => Promise<void>;
}) {
  const [locationOptions, setLocationOptions] = useState<string[]>([]);
  useEffect(() => {
    if (!canEdit) return;
    assetAPI.locationOptions().then(res => setLocationOptions(res.data || [])).catch(() => {});
  }, [canEdit]);

  const locationSelectOptions = Array.from(new Set([...locationOptions, asset.location].filter(Boolean)));

  const searchOwners = (q: string) =>
    assetAPI.searchOwners(q).then(res => (res.data || []).map((u: any) => ({
      label: u.displayName || u.adUsername || '',
      value: u.displayName || u.adUsername || '',
      sub: [u.department, u.company].filter(Boolean).join(' · ') || undefined,
    })));

  return (
    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
      <EditableStatusChip
        status={asset.status}
        canEdit={canEdit}
        onChange={(v) => onQuickUpdate!('status', v)}
        variant="pill"
        pillIcon={Target}
        pillLabel="สถานะ"
      />
      <EditableFact
        label="สถานที่"
        value={asset.location}
        canEdit={canEdit}
        onChange={(v) => onQuickUpdate!('location', v)}
        options={locationSelectOptions}
        placeholderEmpty="ไม่ระบุสถานที่"
        variant="pill"
        pillIcon={MapPin}
      />
      <EditableFact
        label="ผู้ครอบครอง"
        value={asset.ownerName}
        canEdit={canEdit}
        onChange={(v) => onQuickUpdate!('ownerName', v)}
        searchFn={searchOwners}
        placeholderEmpty="ไม่มีผู้ครอบครอง"
        variant="pill"
        pillIcon={User}
      />
    </Box>
  );
}
