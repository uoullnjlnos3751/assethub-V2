import React from 'react';
import { Box, Button, Divider, Drawer, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import StatusChip from '../../../components/StatusChip';
import { formatDate } from '../assetListConfig';

/* ─── Quick-view drawer — preview an asset without leaving the list (single click on a table row) ── */
export default function AssetQuickViewDrawer({ open, asset, onClose, onViewFull }: {
  open: boolean;
  asset: any;
  onClose: () => void;
  onViewFull: (id: number) => void;
}) {
  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 420 } } }}>
      {asset && (
        <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" fontWeight={800} noWrap>{asset.assetCode}</Typography>
              <Typography variant="body2" color="text.secondary" noWrap>{asset.assetName}</Typography>
            </Box>
            <IconButton aria-label="ปิด" onClick={onClose}><CloseIcon /></IconButton>
          </Box>
          <StatusChip status={asset.status} sx={{ alignSelf: 'flex-start', mb: 2 }} />
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, flex: 1, overflowY: 'auto' }}>
            {([
              ['ประเภท', asset.type],
              ['ยี่ห้อ/รุ่น', [asset.brand, asset.model].filter(Boolean).join(' ')],
              ['Serial No.', asset.serialNo],
              ['ผู้ถือครอง', asset.ownerName],
              ['แผนก', asset.departmentId],
              ['สถานที่', [asset.location, asset.floor && `ชั้น ${asset.floor}`].filter(Boolean).join(' ')],
              ['บริษัท', asset.company],
              ['CPU', asset.cpu],
              ['RAM', asset.ram],
              ['Storage', asset.storage1],
              ['OS', asset.osType],
              ['Vendor', asset.vendor],
              ['วันที่ซื้อ', formatDate(asset.purchaseDate)],
            ] as [string, string | undefined][]).filter(([, v]) => v).map(([label, value]) => (
              <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>{label}</Typography>
                <Typography variant="body2" fontWeight={600} sx={{ textAlign: 'right' }}>{value}</Typography>
              </Box>
            ))}
          </Box>
          <Button variant="contained" fullWidth sx={{ mt: 2, borderRadius: '10px' }} onClick={() => onViewFull(asset.id)}>
            ดูรายละเอียดเต็ม
          </Button>
        </Box>
      )}
    </Drawer>
  );
}
