import React from 'react';
import { Box, Button, Card, Chip, IconButton, Tooltip, Typography, alpha, useTheme } from '@mui/material';
import ImageIcon from '@mui/icons-material/Image';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { Verified as VerifiedIcon } from '@mui/icons-material';
import PageviewIcon from '@mui/icons-material/Pageview';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import StatusChip from '../../../components/StatusChip';

interface AssetCardProps {
  asset: any;
  /** borrow = USER "available to borrow" grid (full-width borrow CTA). manage = admin browsing (view/menu actions). */
  variant: 'borrow' | 'manage';
  onView: (id: number) => void;
  onBorrow?: (id: number) => void;
  onMenu?: (e: React.MouseEvent<HTMLElement>, asset: any) => void;
}

/**
 * Shared asset summary card used by both the USER "available to borrow" grid
 * and the admin card/grid view — single source of truth so the two no longer
 * drift into visually inconsistent layouts.
 */
export default function AssetCard({ asset, variant, onView, onBorrow, onMenu }: AssetCardProps) {
  const theme = useTheme();

  return (
    <Card
      sx={{
        height: '100%', display: 'flex', flexDirection: 'column',
        position: 'relative', overflow: 'visible',
        '&:hover': { boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.12)}` },
      }}
    >
      <Box sx={{ display: 'flex', gap: 2, p: 3, pb: 1.5 }}>
        <Box
          sx={{
            width: 80, height: 80, borderRadius: 2, overflow: 'hidden',
            flexShrink: 0, bgcolor: alpha(theme.palette.grey[500], 0.08),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {asset.image ? (
            <Box component="img" src={asset.image} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <ImageIcon sx={{ fontSize: 32, color: theme.palette.grey[400] }} />
          )}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
            <Typography fontWeight={800} fontSize="1.1rem" color="text.primary" noWrap>{asset.assetCode}</Typography>
            <StatusChip status={asset.status} />
          </Box>
          {asset.assetName && (
            <Typography variant="body2" fontWeight={600} color="text.primary" noWrap sx={{ mt: 0.25 }}>
              {asset.assetName}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
            {[asset.type, asset.brand, asset.model].filter(Boolean).join(' · ')}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
            SN: {asset.serialNo}
          </Typography>
        </Box>
      </Box>

      {(asset.cpu || asset.ram || asset.storage1 || asset.osType) && (
        <Box sx={{ px: 3, pb: 2 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', bgcolor: alpha(theme.palette.grey[500], 0.04), borderRadius: 2, p: 1.5 }}>
            {asset.cpu && (
              <Box><Typography variant="caption" fontWeight={600} color="text.secondary">CPU</Typography><Typography variant="body2" fontWeight={600}>{asset.cpu}</Typography></Box>
            )}
            {asset.ram && (
              <Box><Typography variant="caption" fontWeight={600} color="text.secondary">RAM</Typography><Typography variant="body2" fontWeight={600}>{asset.ram}</Typography></Box>
            )}
            {asset.storage1 && (
              <Box><Typography variant="caption" fontWeight={600} color="text.secondary">Storage</Typography><Typography variant="body2" fontWeight={600}>{asset.storage1}</Typography></Box>
            )}
            {asset.osType && (
              <Box><Typography variant="caption" fontWeight={600} color="text.secondary">OS</Typography><Typography variant="body2" fontWeight={600}>{asset.osType}</Typography></Box>
            )}
          </Box>
        </Box>
      )}

      <Box sx={{ px: 3, pb: 2, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
        {(asset.location || asset.floor) && (
          <Chip
            icon={<LocationOnIcon sx={{ fontSize: 14 }} />}
            label={[asset.location, asset.floor && `ชั้น ${asset.floor}`].filter(Boolean).join(' ')}
            size="small" variant="outlined"
            sx={{ height: 24, '& .MuiChip-icon': { fontSize: 14, ml: 0.5 } }}
          />
        )}
        {asset.company && (
          <Chip label={asset.company} size="small" variant="outlined" sx={{ height: 24 }} />
        )}
        {asset.warrantyDaysLeft !== null && asset.warrantyDaysLeft !== undefined && (
          <Chip
            icon={<VerifiedIcon sx={{ fontSize: 14 }} />}
            label={asset.warrantyDaysLeft > 0 ? `รับประกัน ${asset.warrantyDaysLeft} วัน` : 'หมดประกัน'}
            size="small"
            variant="outlined"
            color={asset.warrantyDaysLeft > 90 ? 'success' : asset.warrantyDaysLeft > 0 ? 'warning' : 'error'}
            sx={{ height: 24, '& .MuiChip-icon': { fontSize: 14, ml: 0.5 } }}
          />
        )}
        {asset.ownerName && (
          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
            {asset.ownerName}
          </Typography>
        )}
      </Box>

      <Box sx={{ mt: 'auto', p: 2, pt: 0, display: 'flex', gap: 1 }}>
        {variant === 'borrow' ? (
          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={() => onBorrow?.(asset.id)}
            sx={{ borderRadius: 2, py: 1.5, fontWeight: 700, fontSize: '0.95rem', boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}` }}
          >
            ขอยืมอุปกรณ์
          </Button>
        ) : (
          <>
            <Button size="small" variant="outlined" startIcon={<PageviewIcon />} onClick={() => onView(asset.id)} sx={{ flex: 1, borderRadius: '8px' }}>
              เปิดดู
            </Button>
            <Tooltip title="จัดการเพิ่มเติม">
              <IconButton
                size="small"
                onClick={(e) => onMenu?.(e, asset)}
                sx={{
                  border: '1px solid', borderColor: 'divider', borderRadius: '8px',
                  color: 'text.secondary',
                }}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        )}
      </Box>
    </Card>
  );
}
