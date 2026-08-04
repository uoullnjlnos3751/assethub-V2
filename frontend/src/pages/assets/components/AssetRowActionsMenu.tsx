import React from 'react';
import { Box, Menu, MenuItem } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PageviewIcon from '@mui/icons-material/Pageview';
import PrintIcon from '@mui/icons-material/Print';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import TableViewIcon from '@mui/icons-material/TableView';
import ExportAssetsButton from '../../../components/ExportAssetsButton';
import ImportAssetsButton from '../../../components/ImportAssetsButton';

/* ─── Per-row "จัดการเพิ่มเติม" menu, and the mobile header's overflow menu ── */
export default function AssetRowActionsMenu({
  anchorEl,
  row,
  onClose,
  user,
  isAvailableOnlyView,
  navigate,
  onDelete,
  onOpenColumnDialog,
}: {
  anchorEl: null | HTMLElement;
  row: any;
  onClose: () => void;
  user: any;
  isAvailableOnlyView: boolean;
  navigate: (path: string) => void;
  onDelete: (id: number) => void;
  onOpenColumnDialog: () => void;
}) {
  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onClose}
      PaperProps={{
        sx: { minWidth: 160, mt: 1, boxShadow: 3 }
      }}
    >
      {row && (
        row.isHeaderMenu ? (
          <Box>
            <MenuItem key="import" sx={{ p: 0 }}><Box sx={{ width: '100%', px: 2, py: 1 }}><ImportAssetsButton /></Box></MenuItem>
            <MenuItem key="export" sx={{ p: 0 }}><Box sx={{ width: '100%', px: 2, py: 1 }}><ExportAssetsButton /></Box></MenuItem>
            <MenuItem key="columns" onClick={() => { onClose(); onOpenColumnDialog(); }}>
              <TableViewIcon sx={{ mr: 1, fontSize: 20, color: 'text.secondary' }} /> จัดคอลัมน์ตาราง
            </MenuItem>
          </Box>
        ) : (
        <>
          {/* USER view on Available page — friendly actions */}
          {user?.role === 'USER' && isAvailableOnlyView && (
            <>
              <MenuItem onClick={() => { onClose(); navigate(`/assets/${row.id}`); }}>
                <PageviewIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} /> ดูรายละเอียด
              </MenuItem>
              {row.status === 'Available' && (
                <MenuItem onClick={() => { onClose(); navigate(`/borrow/new?assetId=${row.id}`); }}>
                  <ShoppingCartIcon fontSize="small" sx={{ mr: 1, color: 'success.main' }} /> ยืมอุปกรณ์
                </MenuItem>
              )}
            </>
          )}
          {/* Admin Actions — only on non-user pages */}
          {(user?.role === 'IT_ADMIN' || user?.role === 'SUPERADMIN') && !isAvailableOnlyView && (
            <>
              <MenuItem onClick={() => { onClose(); navigate(`/assets/${row.id}`); }}>
                <PageviewIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} /> ดูรายละเอียด
              </MenuItem>
              <MenuItem onClick={() => { onClose(); navigate(`/assets/${row.id}/edit`); }}>
                <EditIcon fontSize="small" sx={{ mr: 1, color: 'info.main' }} /> แก้ไขข้อมูล
              </MenuItem>
              {user?.role === 'IT_ADMIN' && (
                <MenuItem onClick={() => { onClose(); navigate(`/borrow/checkout?assetId=${row.id}`); }}>
                  <ShoppingCartIcon fontSize="small" sx={{ mr: 1, color: 'warning.main' }} /> ส่งมอบ/Check-out
                </MenuItem>
              )}
              <MenuItem onClick={() => { onClose(); navigate(`/assets/print-qr?ids=${row.id}`); }}>
                <PrintIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} /> พิมพ์ QR Code
              </MenuItem>
              {user?.role === 'SUPERADMIN' && (
                <MenuItem onClick={() => { onClose(); onDelete(row.id); }} sx={{ color: 'error.main' }}>
                  <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> ลบทรัพย์สิน
                </MenuItem>
              )}
            </>
          )}
        </>
        )
      )}
    </Menu>
  );
}
