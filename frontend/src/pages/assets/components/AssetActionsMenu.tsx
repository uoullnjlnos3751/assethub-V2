import React, { useState } from 'react';
import { IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import { UserCog, Wrench, PackageCheck, AlertTriangle, Recycle, QrCode, type LucideIcon } from 'lucide-react';

interface Action {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  danger?: boolean;
}

/**
 * Header gear button — click opens the same set of asset actions that used
 * to live in their own sidebar card, matching the reference ITAM's own
 * gear-icon dropdown (New request / Generate QR code / Convert to server /
 * Map related CIs) next to its Edit button. "แก้ไขข้อมูล" isn't repeated
 * here — the header already has its own dedicated Edit button beside this
 * one, same as the reference never lists Edit inside its own gear menu.
 */
export function AssetActionsMenu({ onTransfer, onReportRepair, onBorrow, onShowQR, onReportDamage, onProposeDisposal }: {
  onTransfer: () => void;
  onReportRepair: () => void;
  onBorrow: () => void;
  onShowQR: () => void;
  onReportDamage: () => void;
  onProposeDisposal: () => void;
}) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const close = () => setAnchorEl(null);

  const actions: Action[] = [
    { label: 'โอนย้ายผู้ครอบครอง', icon: UserCog, onClick: onTransfer },
    { label: 'แจ้งซ่อม', icon: Wrench, onClick: onReportRepair },
    { label: 'บันทึกยืมออกนอกสถานที่', icon: PackageCheck, onClick: onBorrow },
    { label: 'แสดง QR Code', icon: QrCode, onClick: onShowQR },
  ];
  const dangerActions: Action[] = [
    { label: 'แจ้งชำรุด / สูญหาย', icon: AlertTriangle, onClick: onReportDamage, danger: true },
    { label: 'เสนอตัดจำหน่าย', icon: Recycle, onClick: onProposeDisposal, danger: true },
  ];

  const item = (a: Action) => (
    <MenuItem
      key={a.label}
      onClick={() => { close(); a.onClick(); }}
      sx={{ py: 1.1, px: 1.75, color: a.danger ? 'error.main' : 'text.primary' }}
    >
      <ListItemIcon sx={{ minWidth: 34, color: a.danger ? 'error.main' : 'text.secondary' }}>
        <a.icon size={17} strokeWidth={2.1} />
      </ListItemIcon>
      <ListItemText primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 600 }}>
        {a.label}
      </ListItemText>
    </MenuItem>
  );

  return (
    <>
      <IconButton
        size="small"
        onClick={(e) => setAnchorEl(e.currentTarget)}
        aria-label="การดำเนินการเพิ่มเติม"
        sx={{
          border: (theme) => `1px solid ${theme.palette.divider}`,
          borderRadius: '10px', width: 34, height: 34,
        }}
      >
        <SettingsRoundedIcon sx={{ fontSize: 18 }} />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { mt: '6px', minWidth: 240, borderRadius: '12px' } } }}
      >
        {actions.map(item)}
        <Divider sx={{ my: 0.5 }} />
        {dangerActions.map(item)}
      </Menu>
    </>
  );
}
