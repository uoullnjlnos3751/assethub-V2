import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import TableChartIcon from '@mui/icons-material/TableChart';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import * as XLSX from 'xlsx';
import ImportAssetsButton from '../../components/ImportAssetsButton';
import { assetAPI } from '../../services/api';

const exportColumns = [
  ['assetCode', 'รหัสทรัพย์สิน'],
  ['serialNo', 'Serial Number'],
  ['type', 'ประเภทอุปกรณ์'],
  ['brand', 'ยี่ห้อ (Brand)'],
  ['model', 'รุ่น (Model)'],
  ['company', 'Company'],
  ['oldAssetCode', 'Computer Name เดิม'],
  ['ownerName', 'ผู้ถือครอง'],
  ['departmentId', 'แผนก'],
  ['location', 'Location'],
  ['floor', 'Floor'],
  ['status', 'สถานะ'],
  ['domainName', 'Domain Name'],
  ['osType', 'OS'],
   ['osVersion', 'Windows'],
   ['officeLicense', 'MS Office'],

  ['antivirusStatus', 'Antivirus'],
  ['cpu', 'CPU'],
  ['cpuGeneration', 'Generation'],
  ['gpu', 'GPU'],
  ['ram', 'RAM'],
  ['ramSlot1', 'RAM Slot1'],
  ['ramSlot2', 'RAM Slot2'],
  ['storage1', 'Storage 1'],
  ['storage2', 'Storage 2'],
  ['prNumber', 'PR No.'],
  ['budget', 'งบประมาณ'],
  ['poDate', 'PO Date'],
  ['poNumber', 'PO No.'],
  ['vendor', 'Vendor'],
  ['purchaseDate', 'วันที่ซื้อ'],
  ['age', 'อายุ (ปี)'],
  ['remark', 'หมายเหตุ'],
] as const;

const formatDate = (value: unknown) => {
  if (!value) return '';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString().split('T')[0];
};

const buildRows = (assets: any[]) => assets.map((asset) => {
  const row: Record<string, any> = {};
  exportColumns.forEach(([field, label]) => {
    row[label] = field === 'purchaseDate' || field === 'poDate' ? formatDate(asset[field]) : asset[field] ?? '';
  });
  return row;
});

const writeWorkbook = (sheetsData: Record<string, Record<string, any>[]>, fileName: string) => {
  const wb = XLSX.utils.book_new();
  const emptyRow = Object.fromEntries(exportColumns.map(([, label]) => [label, '']));
  
  for (const [sheetName, rows] of Object.entries(sheetsData)) {
    // If empty, put one empty object with all headers so headers still show up
    const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [emptyRow]);
    ws['!cols'] = exportColumns.map(([, label]) => ({ wch: Math.max(label.length + 4, 14) }));
    
    // Excel sheet names cannot exceed 31 chars and cannot contain certain chars
    let safeName = sheetName.replace(/[\\/*?:\[\]]/g, '').substring(0, 31);
    if (!safeName) safeName = 'Sheet';
    
    // Ensure unique name if trimmed
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

export default function ImportExportPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchAllAssets = async () => {
    const res = await assetAPI.list({ limit: 10000 });
    return res.data.data || [];
  };

  const exportExcel = async () => {
    setLoading(true);
    setError('');
    try {
      const assets = await fetchAllAssets();
      const rows = buildRows(assets);
      
      const sheetsData: Record<string, Record<string, any>[]> = {};
      rows.forEach((row, index) => {
        const type = assets[index].type || 'Other';
        if (!sheetsData[type]) sheetsData[type] = [];
        sheetsData[type].push(row);
      });
      
      if (Object.keys(sheetsData).length === 0) sheetsData['Assets'] = [];
      
      writeWorkbook(sheetsData, `assets-${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถส่งออกข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = async () => {
    setLoading(true);
    setError('');
    try {
      const assets = await fetchAllAssets();
      const rows = buildRows(assets);
      const emptyRow = Object.fromEntries(exportColumns.map(([, label]) => [label, '']));
      
      const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [emptyRow]);
      const csv = XLSX.utils.sheet_to_csv(ws, { FS: ',', blankrows: false });
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `assets-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถส่งออกข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await assetAPI.deviceTypes();
      const types = res.data.map((t: any) => t.name);
      if (types.length === 0) types.push('Computer', 'Monitor');
      
      const emptyRow = Object.fromEntries(exportColumns.map(([, label]) => [label, '']));
      const sheetsData: Record<string, Record<string, any>[]> = {};
      types.forEach((type: string) => {
        // Pre-fill type in the template to make it easier for users
        const rowWithType = { ...emptyRow, 'ประเภทอุปกรณ์': type };
        sheetsData[type] = [rowWithType];
      });
      
      writeWorkbook(sheetsData, 'asset-import-template.xlsx');
    } catch (err: any) {
      setError('ไม่สามารถดาวน์โหลด Template ได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={2} sx={{ mb: 2.5 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>นำเข้า/ส่งออก (Import/Export)</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            ศูนย์รวมการนำเข้าและส่งออกข้อมูลทะเบียนทรัพย์สินทั้งหมด
          </Typography>
        </Box>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={4}>
          <Card variant="outlined" sx={{ height: '100%', borderRadius: 2 }}>
            <CardContent>
              <Stack spacing={2}>
                <FileUploadIcon color="primary" />
                <Box>
                  <Typography variant="h6" fontWeight={700}>นำเข้าทรัพย์สิน</Typography>
                  <Typography variant="body2" color="text.secondary">รองรับไฟล์ Excel และ CSV เพื่อนำเข้าข้อมูลทรัพย์สินหลายรายการ</Typography>
                </Box>
                <Box><ImportAssetsButton /></Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card variant="outlined" sx={{ height: '100%', borderRadius: 2 }}>
            <CardContent>
              <Stack spacing={2}>
                <FileDownloadIcon color="primary" />
                <Box>
                  <Typography variant="h6" fontWeight={700}>ส่งออกข้อมูลทั้งหมด</Typography>
                  <Typography variant="body2" color="text.secondary">ส่งออกข้อมูลทรัพย์สินแบบครบทุกฟิลด์สำหรับรายงานหรือสำรองข้อมูล</Typography>
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Button variant="contained" startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <DownloadIcon />} onClick={exportExcel} disabled={loading}>Excel</Button>
                  <Button variant="outlined" startIcon={<TableChartIcon />} onClick={exportCsv} disabled={loading}>CSV</Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card variant="outlined" sx={{ height: '100%', borderRadius: 2 }}>
            <CardContent>
              <Stack spacing={2}>
                <TableChartIcon color="primary" />
                <Box>
                  <Typography variant="h6" fontWeight={700}>Template นำเข้า</Typography>
                  <Typography variant="body2" color="text.secondary">ดาวน์โหลดแบบฟอร์มคอลัมน์มาตรฐานก่อนกรอกข้อมูลเพื่อนำเข้า</Typography>
                </Box>
                <Box>
                  <Button variant="outlined" startIcon={<DownloadIcon />} onClick={downloadTemplate}>ดาวน์โหลด Template</Button>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
