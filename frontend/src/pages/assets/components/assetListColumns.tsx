import React from 'react';
import { Box, Tooltip, Typography, alpha } from '@mui/material';
import { GridColDef } from '@mui/x-data-grid';
import ImageOffIcon from '@mui/icons-material/ImageNotSupported';
import StatusChip from '../../../components/StatusChip';
import { formatDate, formatDateTime } from '../assetListConfig';

const textColumn = (field: string, headerName: string, width = 140): GridColDef => ({
  field,
  headerName,
  width,
});

/* ─── Static DataGrid column definitions, keyed by field name.
   Built once at module load — none of these depend on component state,
   so unlike the "actions" column (which needs user/navigate/theme/handleMenuOpen
   from the page), this can be a plain constant instead of a per-render hook. ── */
export const assetColumnMap: Record<string, GridColDef> = {
  id: textColumn('id', 'ID', 90),
  hasImage: {
    field: 'hasImage',
    headerName: 'รูป',
    width: 50,
    sortable: false,
    filterable: false,
    renderCell: ({ row }) => (
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        {row.image ? (
          <Box
            component="img"
            src={row.image}
            alt=""
            sx={{
              width: 28,
              height: 28,
              borderRadius: 1.5,
              objectFit: 'cover',
              boxShadow: (theme) => `0 0 0 1px ${alpha(theme.palette.success.main, 0.3)}`,
            }}
          />
        ) : (
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: 1.5,
              bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: (theme) => theme.palette.grey[400],
            }}
          >
            <ImageOffIcon fontSize="small" sx={{ fontSize: 16 }} />
          </Box>
        )}
      </Box>
    ),
  },
  assetCode: textColumn('assetCode', 'เลขครุภัณฑ์', 140),
  assetName: {
    ...textColumn('assetName', 'ชื่อทรัพย์สิน', 180),
    renderCell: ({ row }) => {
      const isConsumable = ['toner', 'ink', 'cartridge', 'battery', 'adapter', 'charger', 'consumable'].some(t => row.type?.toLowerCase().includes(t));
      const lowStock = isConsumable && row.consumableDetail && row.consumableDetail.stockQuantity <= row.consumableDetail.minimumStock;

      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" noWrap sx={{ fontWeight: lowStock ? 700 : 400 }}>
            {row.assetName}
          </Typography>
          {lowStock && (
            <Tooltip title={`สต็อกใกล้หมด: ${row.consumableDetail.stockQuantity} (Min: ${row.consumableDetail.minimumStock})`}>
              <Box component="span" sx={{ color: 'error.main', fontSize: 14, lineHeight: 1 }}>⚠</Box>
            </Tooltip>
          )}
        </Box>
      );
    }
  },
  serialNo: textColumn('serialNo', 'Serial No.', 140),
  type: textColumn('type', 'ประเภท', 120),
  brand: textColumn('brand', 'ยี่ห้อ', 120),
  model: textColumn('model', 'รุ่น', 150),
  cpu: textColumn('cpu', 'CPU', 130),
  cpuGeneration: textColumn('cpuGeneration', 'Generation', 120),
  ram: textColumn('ram', 'RAM', 110),
  ramDetail: textColumn('ramDetail', 'RAM Detail', 150),
  ramSlot1: textColumn('ramSlot1', 'RAM Slot1', 130),
  ramSlot2: textColumn('ramSlot2', 'RAM Slot2', 130),
  storage1: textColumn('storage1', 'Storage 1', 130),
  storage2: textColumn('storage2', 'Storage 2', 130),
  osType: textColumn('osType', 'OS', 110),
  snComputer: textColumn('snComputer', 'S/N Computer', 150),
  osVersion: textColumn('osVersion', 'Windows', 160),
  windowsLicense: textColumn('windowsLicense', 'Windows License', 160),
  officeLicense: textColumn('officeLicense', 'MS Office', 150),
  antivirusStatus: textColumn('antivirusStatus', 'Antivirus', 140),
  domainName: textColumn('domainName', 'Domain Name', 150),
  vendor: textColumn('vendor', 'Vendor', 150),
  poNumber: textColumn('poNumber', 'PO No.', 130),
  poDate: {
    ...textColumn('poDate', 'PO Date', 130),
    renderCell: ({ value }) => formatDate(value),
  },
  prNumber: textColumn('prNumber', 'PR No.', 130),
  purchaseDate: {
    ...textColumn('purchaseDate', 'วันที่ซื้อ', 130),
    renderCell: ({ value }) => formatDate(value),
  },
  age: textColumn('age', 'อายุ (ปี)', 110),
  ownerName: textColumn('ownerName', 'ผู้ถือครอง', 170),
  departmentId: textColumn('departmentId', 'แผนก', 130),
  location: textColumn('location', 'สถานที่ติดตั้ง/อาคาร', 160),
  floor: textColumn('floor', 'ชั้น', 90),
  company: textColumn('company', 'บริษัท', 130),
  oldAssetCode: textColumn('oldAssetCode', 'Computer Name เดิม', 150),
  gpu: textColumn('gpu', 'GPU', 120),
  budget: textColumn('budget', 'งบประมาณ', 130),
  status: {
    field: 'status',
    headerName: 'สถานะ',
    width: 140,
    renderCell: ({ value }) => <StatusChip status={value} />,
  },
  remark: textColumn('remark', 'หมายเหตุ', 220),
  createdAt: {
    ...textColumn('createdAt', 'วันที่สร้าง', 170),
    renderCell: ({ value }) => formatDateTime(value),
  },
  updatedAt: {
    ...textColumn('updatedAt', 'วันที่แก้ไขล่าสุด', 170),
    renderCell: ({ value }) => formatDateTime(value),
  },
};
