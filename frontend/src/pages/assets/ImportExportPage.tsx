import React, { useState } from 'react';
import { Box, Typography, Button, Select, MenuItem, alpha, useTheme } from '@mui/material';
import ImportAssetsButton from '../../components/ImportAssetsButton';
import { assetAPI } from '../../services/api';

// xlsx ~419 KB โหลดตอนกดส่งออกจริงเท่านั้น ไม่ใช่ตอนเปิดหน้า
const loadXlsx = () => import('xlsx');

/* ─────────────────────────────────────────────────────────────────
   Export columns - synced with backend export headers
   Format: [fieldName, displayLabel]
───────────────────────────────────────────────────────────────── */
const exportColumns = [
  ['id', 'ID'],
  ['assetCode', 'เลขครุภัณฑ์'],
  ['assetName', 'ชื่อทรัพย์สิน'],
  ['serialNo', 'Serial No.'],
  ['type', 'ประเภท'],
  ['categoryId', 'หมวดหมู่'],
  ['status', 'สถานะ'],
  ['brand', 'ยี่ห้อ'],
  ['model', 'รุ่น'],
  ['company', 'Company'],
  ['ownerName', 'ผู้ถือครอง'],
  ['departmentId', 'แผนก'],
  ['location', 'ที่ตั้ง'],
  ['floor', 'ชั้น'],
  ['oldAssetCode', 'รหัสทรัพย์สินเดิม'],
  ['domainName', 'Domain Name'],
  ['poNumber', 'PO No.'],
  ['poDate', 'PO Date'],
  ['prNumber', 'PR No.'],
  ['purchaseDate', 'วันที่จัดซื้อ'],
  ['warrantyEndDate', 'วันหมดประกัน'],
  ['purchasePrice', 'ราคาจัดซื้อ'],
  ['vendor', 'Vendor'],
  ['budget', 'งบประมาณ'],
  ['remark', 'หมายเหตุ'],
  ['createdAt', 'วันที่สร้าง'],
  ['updatedAt', 'วันที่แก้ไขล่าสุด'],
  // Computer details
  ['cpu', 'CPU'],
  ['cpuGeneration', 'Generation'],
  ['gpu', 'GPU'],
  ['ram', 'RAM'],
  ['ramDetail', 'RAM Detail'],
  ['memoryType', 'Memory Type'],
  ['ramOnboard', 'RAM Onboard'],
  ['ramType', 'RAM Type'],
  ['ramSpeed', 'RAM Speed'],
  ['ramMaxSupported', 'Maximum Supported'],
  ['ramAvailableSlots', 'Available Slots'],
  ['ramUpgradeable', 'Upgradeable'],
  ['ramSlot1', 'RAM Slot1'],
  ['ramSlot2', 'RAM Slot2'],
  ['storage1', 'Storage 1'],
  ['storage2', 'Storage 2'],
  ['osType', 'OS'],
  ['osVersion', 'Windows Version'],
  ['windowsLicense', 'Windows License'],
  ['officeLicense', 'MS Office'],
  ['antivirusStatus', 'Antivirus'],
  ['snComputer', 'S/N Computer'],
] as const;

const formatDate = (value: unknown, format: 'iso' | 'thai' = 'iso') => {
  if (!value) return '';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  if (format === 'thai') {
    // Format: DD/MM/YYYY (Thai)
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear() + 543; // Convert to Buddhist Era
    return `${day}/${month}/${year}`;
  }
  return date.toISOString().split('T')[0];
};

const buildRows = (assets: any[], dateFormat: 'iso' | 'thai' = 'iso') => assets.map((asset) => {
  const row: Record<string, any> = {};
  exportColumns.forEach(([field, label]) => {
    let value = asset[field] ?? '';

    // Handle special field mappings
    if (field === 'categoryId') {
      value = asset.category?.name || '';
    } else if (field === 'purchaseDate' || field === 'poDate') {
      value = formatDate(value, dateFormat);
    } else if (field === 'createdAt' || field === 'updatedAt') {
      value = formatDate(value, dateFormat);
    }

    row[label] = value;
  });
  return row;
});

const writeWorkbook = async (sheetsData: Record<string, Record<string, any>[]>, fileName: string) => {
  const XLSX = await loadXlsx();
  const wb = XLSX.utils.book_new();
  const emptyRow = Object.fromEntries(exportColumns.map(([, label]) => [label, '']));
  for (const [sheetName, rows] of Object.entries(sheetsData)) {
    const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [emptyRow]);
    ws['!cols'] = exportColumns.map(([, label]) => ({ wch: Math.max(label.length + 4, 14) }));
    let safeName = sheetName.replace(/[\\/*?:[\]]/g, '').substring(0, 31);
    if (!safeName) safeName = 'Sheet';
    let finalName = safeName;
    let counter = 1;
    while (wb.SheetNames.includes(finalName)) {
      finalName = `${safeName.substring(0, 28)}_${counter}`;
      counter++;
    }
    XLSX.utils.book_append_sheet(wb, ws, finalName);
  }
  XLSX.writeFile(wb, fileName);
};

/* ─────────────────────────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────────────────────────── */
function ActionCard({
  icon, color, title, desc, children, badge,
}: {
  icon: string; color: string; title: string; desc: string;
  children: React.ReactNode; badge?: string;
}) {
  const theme = useTheme();
  return (
    <Box sx={{
      bgcolor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: '14px',
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
    }}>
      {/* Card header stripe */}
      <Box sx={{ height: '4px', bgcolor: color }} />
      <Box sx={{ p: 2.5, flex: 1, display: 'flex', flexDirection: 'column', gap: 1.75 }}>
        {/* Icon + title */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
          <Box sx={{
            width: 42, height: 42, borderRadius: '10px',
            bgcolor: alpha(color, 0.1), border: `1.5px solid ${alpha(color, 0.3)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, flexShrink: 0,
          }}>{icon}</Box>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: theme.palette.text.primary }}>{title}</Typography>
              {badge && (
                <Box component="span" sx={{
                  fontSize: 9, fontWeight: 700, px: '7px', py: '2px',
                  borderRadius: '99px', bgcolor: alpha(color, 0.1), color,
                }}>{badge}</Box>
              )}
            </Box>
            <Typography sx={{ fontSize: 11, color: theme.palette.text.secondary, mt: 0.5, lineHeight: 1.5 }}>{desc}</Typography>
          </Box>
        </Box>
        {/* Actions */}
        <Box sx={{ mt: 'auto' }}>{children}</Box>
      </Box>
    </Box>
  );
}

function ActionBtn({
  icon, label, onClick, disabled, variant = 'outline', color = '#0891b2',
}: {
  icon: string; label: string; onClick: () => void;
  disabled?: boolean; variant?: 'solid' | 'outline'; color?: string;
}) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      variant={variant === 'solid' ? 'contained' : 'outlined'}
      size="small"
      startIcon={<span>{icon}</span>}
      sx={variant === 'solid' ? {
        bgcolor: color, borderColor: color, '&:hover': { bgcolor: color, filter: 'brightness(1.08)' },
      } : {
        color, borderColor: alpha(color, 0.4), '&:hover': { borderColor: color, bgcolor: alpha(color, 0.06) },
      }}
    >
      {label}
    </Button>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Main
───────────────────────────────────────────────────────────────── */
export default function ImportExportPage() {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [progress, setProgress] = useState('');
  const [dateFormat, setDateFormat] = useState<'iso' | 'thai'>('iso');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchAllAssets = async () => {
    const res = await assetAPI.list({ limit: 10000 });
    return res.data.data || [];
  };

  const exportExcel = async () => {
    setLoading(true); setError(''); setProgress('กำลังดึงข้อมูลทรัพย์สิน...');
    try {
      const assets = await fetchAllAssets();
      setProgress(`กำลัง build ${assets.length} รายการ...`);
      const rows = buildRows(assets, dateFormat);

      const sheetsData: Record<string, Record<string, any>[]> = {};
      rows.forEach((row, index) => {
        const type = assets[index].type || 'Other';
        if (!sheetsData[type]) sheetsData[type] = [];
        sheetsData[type].push(row);
        // Show progress every 500 rows
        if ((index + 1) % 500 === 0) {
          setProgress(`กำลัง build ${index + 1} / ${assets.length} รายการ...`);
        }
      });
      if (Object.keys(sheetsData).length === 0) sheetsData['Assets'] = [];
      setProgress(`กำลังเขียนไฟล์ Excel...`);
      writeWorkbook(sheetsData, `assets-${new Date().toISOString().split('T')[0]}.xlsx`);
      showToast(`✅ ส่งออก Excel สำเร็จ ${assets.length} รายการ`);
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถส่งออกข้อมูลได้');
    } finally {
      setLoading(false); setProgress('');
    }
  };

  const exportCsv = async () => {
    setLoading(true); setError(''); setProgress('กำลัง export CSV...');
    try {
      setProgress('กำลังเรียก API...');
      const response = await assetAPI.exportCSV();
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `assets-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast(`✅ ส่งออก CSV สำเร็จ`);
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถส่งออกข้อมูลได้');
    } finally {
      setLoading(false); setProgress('');
    }
  };

  const downloadTemplate = async () => {
    setLoading(true); setError('');
    try {
      const res = await assetAPI.deviceTypes();
      const types = res.data.map((t: any) => t.name);
      if (types.length === 0) types.push('Computer', 'Monitor');

      // Create sample row with realistic data
      const sampleRow = Object.fromEntries(exportColumns.map(([field, label]) => {
        const sampleData: Record<string, string> = {
          'ID': '1',
          'เลขครุภัณฑ์': 'ASSET-2025-001',
          'ชื่อทรัพย์สิน': 'Lenovo ThinkPad X1',
          'Serial No.': 'SN123456789',
          'ประเภท': 'Computer',
          'หมวดหมู่': 'Notebook',
          'สถานะ': 'InUse',
          'ยี่ห้อ': 'Lenovo',
          'รุ่น': 'ThinkPad X1 Carbon',
          'Company': 'Company A',
          'ผู้ถือครอง': 'John Doe',
          'แผนก': 'IT',
          'Location': 'Office Building',
          'ชั้น': '5',
          'รหัสทรัพย์สินเดิม': 'OLD-CODE-123',
          'Domain Name': 'LAPTOP-001',
          'PO No.': 'PO-2025-001',
          'PO Date': '2025-01-15',
          'PR No.': 'PR-2025-001',
          'วันที่จัดซื้อ': '2025-01-20',
          'วันหมดประกัน': '2028-01-20',
          'ราคาจัดซื้อ': '45000',
          'Vendor': 'Lenovo Official',
          'งบประมาณ': '50000',
          'หมายเหตุ': 'Business notebook',
          'วันที่สร้าง': '2025-01-25',
          'วันที่แก้ไขล่าสุด': '2025-01-25',
          'CPU': 'Intel Core i7',
          'Generation': '12th Gen',
          'GPU': 'Intel Iris Xe',
          'RAM': '16GB',
          'RAM Detail': 'DDR5 5600MHz',
          'Memory Type': 'Slot',
          'RAM Onboard': '0 GB',
          'RAM Type': 'DDR5',
          'RAM Speed': '5600 MHz',
          'Maximum Supported': '64 GB',
          'Available Slots': '1',
          'Upgradeable': 'Yes',
          'RAM Slot1': '8GB',
          'RAM Slot2': '8GB',
          'Storage 1': '512GB SSD',
          'Storage 2': '-',
          'OS': 'Windows',
          'Windows Version': 'Windows 11 Pro',
          'Windows License': 'XXXXX-XXXXX-XXXXX-XXXXX',
          'MS Office': 'Microsoft 365',
          'Antivirus': 'Windows Defender',
          'S/N Computer': 'SN123456789',
        };
        return [label, sampleData[label] || ''];
      }));

      const emptyRow = Object.fromEntries(exportColumns.map(([, label]) => [label, '']));
      const sheetsData: Record<string, Record<string, any>[]> = {};
      types.forEach((type: string) => {
        // Add sample row first, then empty template
        sheetsData[type] = [
          { ...sampleRow, 'ประเภท': type },
          { ...emptyRow, 'ประเภท': type }
        ];
      });
      writeWorkbook(sheetsData, 'asset-import-template.xlsx');
      showToast('✅ ดาวน์โหลด Template สำเร็จ (มีตัวอย่างข้อมูล)');
    } catch {
      setError('ไม่สามารถดาวน์โหลด Template ได้');
    } finally {
      setLoading(false);
    }
  };

  const totalCols = exportColumns.length;

  return (
    <Box>
      {/* ── Page header ── */}
      <Box sx={{ mb: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <Box sx={{
            width: 40, height: 40, borderRadius: '10px',
            bgcolor: alpha(theme.palette.primary.main, 0.08), border: `1.5px solid ${alpha(theme.palette.primary.main, 0.25)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
          }}>📊</Box>
          <Box>
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: theme.palette.text.primary }}>นำเข้า / ส่งออก (Import / Export)</Typography>
            <Typography sx={{ fontSize: 11, color: theme.palette.text.disabled }}>ศูนย์รวมการนำเข้าและส่งออกข้อมูลทะเบียนทรัพย์สินทั้งหมด</Typography>
          </Box>
        </Box>
      </Box>

      {/* ── Error banner ── */}
      {error && (
        <Box sx={{
          bgcolor: alpha(theme.palette.error.main, 0.06), border: `1px solid ${alpha(theme.palette.error.main, 0.25)}`, borderRadius: '10px',
          px: 1.75, py: 1.25, fontSize: 12, color: theme.palette.error.main, mb: 2,
          display: 'flex', alignItems: 'center', gap: 1,
        }}>
          ⚠️ {error}
          <Box component="button" onClick={() => setError('')} sx={{ ml: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: theme.palette.error.main, fontSize: 13 }}>✕</Box>
        </Box>
      )}

      {/* ── Progress ── */}
      {progress && (
        <Box sx={{
          bgcolor: alpha(theme.palette.info.main, 0.06), border: `1px solid ${alpha(theme.palette.info.main, 0.25)}`, borderRadius: '10px',
          px: 1.75, py: 1.25, fontSize: 12, color: theme.palette.info.dark, mb: 2,
          display: 'flex', alignItems: 'center', gap: 1,
        }}>
          <Box component="span" sx={{ display: 'inline-block' }}>⏳</Box> {progress}
        </Box>
      )}

      {/* ── 3-column action cards ── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 2, mb: 3 }}>

        {/* Import */}
        <ActionCard
          icon="📥" color={theme.palette.primary.main}
          title="นำเข้าทรัพย์สิน"
          badge="IMPORT"
          desc="รองรับไฟล์ Excel (.xlsx) และ CSV เพื่อนำเข้าข้อมูลทรัพย์สินหลายรายการพร้อมกัน"
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <ImportAssetsButton />
            <Box sx={{ fontSize: 10, color: theme.palette.text.disabled, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              💡 ใช้ Template ด้านขวาเพื่อเตรียมข้อมูลให้ถูกต้อง
            </Box>
          </Box>
        </ActionCard>

        {/* Export */}
        <ActionCard
          icon="📤" color={theme.palette.success.main}
          title="ส่งออกข้อมูลทั้งหมด"
          badge="EXPORT"
          desc={`ส่งออกข้อมูลทรัพย์สินครบ ${totalCols} ฟิลด์ แยก Sheet ตามประเภทอุปกรณ์ สำหรับรายงานหรือสำรองข้อมูล`}
        >
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <ActionBtn
              icon="📊" label="Excel (.xlsx)"
              variant="solid" color={theme.palette.success.main}
              onClick={exportExcel} disabled={loading}
            />
            <ActionBtn
              icon="📄" label="CSV"
              onClick={exportCsv} disabled={loading}
            />
          </Box>
        </ActionCard>

        {/* Template */}
        <ActionCard
          icon="📋" color={theme.palette.secondary.main}
          title="Template นำเข้า"
          badge="TEMPLATE"
          desc="ดาวน์โหลดแบบฟอร์มคอลัมน์มาตรฐานพร้อม Sheet แยกตามประเภทอุปกรณ์ที่มีในระบบ"
        >
          <ActionBtn
            icon="⬇️" label="ดาวน์โหลด Template"
            variant="solid" color={theme.palette.secondary.main}
            onClick={downloadTemplate} disabled={loading}
          />
        </ActionCard>
      </Box>

      {/* ── Export Options ── */}
      <Box sx={{
        bgcolor: theme.palette.background.default, border: `1px solid ${theme.palette.divider}`, borderRadius: '10px',
        px: 1.75, py: 1.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
      }}>
        <Typography sx={{ fontSize: 12, fontWeight: 600, color: theme.palette.text.primary }}>⚙️ ตัวเลือกการส่งออก:</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography component="label" sx={{ fontSize: 11, color: theme.palette.text.secondary }}>รูปแบบวันที่:</Typography>
          <Select
            value={dateFormat}
            onChange={(e) => setDateFormat(e.target.value as 'iso' | 'thai')}
            disabled={loading}
            size="small"
            sx={{ fontSize: 11, '& .MuiSelect-select': { py: 0.5 } }}
          >
            <MenuItem value="iso">ISO (YYYY-MM-DD)</MenuItem>
            <MenuItem value="thai">วันไทย (DD/MM/YYYY ค.ศ.)</MenuItem>
          </Select>
        </Box>
      </Box>

      {/* ── Supported columns ── */}
      <Box sx={{ bgcolor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: '12px', overflow: 'hidden' }}>
        <Box sx={{
          bgcolor: theme.palette.background.default, borderBottom: `1px solid ${theme.palette.divider}`,
          px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.25,
        }}>
          <Box component="span" sx={{ fontSize: 14 }}>📑</Box>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: theme.palette.text.primary }}>คอลัมน์ที่รองรับในการนำเข้า/ส่งออก</Typography>
          <Box component="span" sx={{
            ml: 'auto', fontSize: 10, fontWeight: 700, px: '9px', py: '2px',
            borderRadius: '99px', bgcolor: alpha(theme.palette.info.main, 0.08), color: theme.palette.info.dark, border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`,
          }}>{totalCols} คอลัมน์</Box>
        </Box>
        <Box sx={{ p: '14px 16px' }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {exportColumns.map(([field, label]) => (
              <Box key={field} title={`field: ${field}`} sx={{
                display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1, py: '2px',
                bgcolor: theme.palette.background.default, border: `1px solid ${theme.palette.divider}`, borderRadius: '5px',
                fontSize: 10, fontFamily: 'monospace',
              }}>
                <Box component="span" sx={{ color: theme.palette.text.disabled }}>{field}</Box>
                <Box component="span" sx={{ color: theme.palette.text.disabled }}>→</Box>
                <Box component="span" sx={{ color: theme.palette.text.secondary, fontFamily: 'Sarabun, sans-serif' }}>{label}</Box>
              </Box>
            ))}
          </Box>
        </Box>
        <Box sx={{
          bgcolor: alpha(theme.palette.warning.main, 0.08), borderTop: `1px solid ${alpha(theme.palette.warning.main, 0.25)}`,
          px: 2, py: 1.25, fontSize: 11, color: theme.palette.warning.dark,
          display: 'flex', alignItems: 'flex-start', gap: 0.75,
        }}>
          <Box component="span">⚠️</Box>
          <Box component="span">
            <strong>หมายเหตุ:</strong> ไฟล์ที่นำเข้าต้องมีคอลัมน์ <Box component="code" sx={{ bgcolor: alpha(theme.palette.warning.main, 0.15), px: '5px', py: '1px', borderRadius: '4px' }}>รหัสทรัพย์สิน</Box> เสมอ
            · ข้อมูลที่มีรหัสซ้ำจะถูก<strong>อัปเดต</strong> ข้อมูลที่ไม่มีรหัสจะถูก<strong>สร้างใหม่</strong>
            · วันที่ให้ใช้รูปแบบ YYYY-MM-DD
          </Box>
        </Box>
      </Box>

      {/* Toast */}
      {toast && (
        <Box sx={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          bgcolor: theme.palette.text.primary, color: theme.palette.background.paper, px: 2.5, py: 1.25, borderRadius: '8px',
          fontSize: 12, zIndex: 9999, boxShadow: '0 8px 24px rgba(0,0,0,.2)', pointerEvents: 'none',
        }}>
          {toast}
        </Box>
      )}
    </Box>
  );
}
