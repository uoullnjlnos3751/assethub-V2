import React from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import { Zap, UserCog, Wrench, PackageCheck, Pencil, AlertTriangle, Recycle, QrCode, type LucideIcon } from 'lucide-react';
import { SectionCard } from '../../../components/SectionCard';

interface Action {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  tone?: 'default' | 'primary' | 'danger';
}

function ActionRow({ action }: { action: Action }) {
  const theme = useTheme();
  const Icon = action.icon;
  const tone = action.tone || 'default';
  const accent =
    tone === 'primary' ? theme.palette.primary.main
      : tone === 'danger' ? theme.palette.error.main
        : theme.palette.text.secondary;

  return (
    <Box
      onClick={action.onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); action.onClick(); } }}
      sx={{
        display: 'flex', alignItems: 'center', gap: 1.25,
        px: 1.5, py: 1.15, borderRadius: '11px', cursor: 'pointer',
        border: `1px solid ${tone === 'primary' ? alpha(theme.palette.primary.main, 0.35) : theme.palette.divider}`,
        bgcolor: tone === 'primary' ? alpha(theme.palette.primary.main, 0.07) : 'transparent',
        color: tone === 'danger' ? theme.palette.error.main : theme.palette.text.primary,
        transition: 'all .18s',
        '&:hover': {
          bgcolor: alpha(tone === 'danger' ? theme.palette.error.main : theme.palette.primary.main, 0.1),
          borderColor: alpha(tone === 'danger' ? theme.palette.error.main : theme.palette.primary.main, 0.4),
        },
        '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
      }}
    >
      <Icon size={15} strokeWidth={2.2} color={accent} />
      <Typography sx={{ fontSize: '0.8rem', fontWeight: 600 }}>{action.label}</Typography>
    </Box>
  );
}

export function AssetActionsPanel({ onEdit, onTransfer, onReportRepair, onBorrow, onShowQR, onReportDamage, onProposeDisposal }: {
  onEdit: () => void;
  onTransfer: () => void;
  onReportRepair: () => void;
  onBorrow: () => void;
  /** QR lives here rather than the header — the handoff's header carries only
   *  back / print-label / transfer, and print-label already covers the sticker. */
  onShowQR: () => void;
  onReportDamage: () => void;
  onProposeDisposal: () => void;
}) {
  const actions: Action[] = [
    { label: 'โอนย้ายผู้ครอบครอง', icon: UserCog, onClick: onTransfer, tone: 'primary' },
    { label: 'แจ้งซ่อม', icon: Wrench, onClick: onReportRepair },
    { label: 'บันทึกยืมออกนอกสถานที่', icon: PackageCheck, onClick: onBorrow },
    { label: 'แก้ไขข้อมูล', icon: Pencil, onClick: onEdit },
    { label: 'แสดง QR Code', icon: QrCode, onClick: onShowQR },
    { label: 'แจ้งชำรุด / สูญหาย', icon: AlertTriangle, onClick: onReportDamage, tone: 'danger' },
    { label: 'เสนอตัดจำหน่าย', icon: Recycle, onClick: onProposeDisposal, tone: 'danger' },
  ];

  return (
    <SectionCard title="การดำเนินการ" icon={Zap}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.85 }}>
        {actions.map(a => <ActionRow key={a.label} action={a} />)}
      </Box>
    </SectionCard>
  );
}
