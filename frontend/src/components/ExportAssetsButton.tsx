import React, { useState } from 'react';
import { Button, Menu, MenuItem, CircularProgress, Alert } from '@mui/material';
import { Download } from 'lucide-react';
import { assetAPI } from '../services/api';

// xlsx ~419 KB โหลดตอนกดส่งออกจริงเท่านั้น ไม่ใช่ตอนเปิดหน้า
const loadXlsx = () => import('xlsx');

interface Asset {
  id: number; assetCode: string; serialNo: string; type: string; brand: string; model: string;
  cpu?: string; cpuGeneration?: string; ram?: string; ramDetail?: string; storage1?: string;
  storage2?: string; ramSlot1?: string; ramSlot2?: string; gpu?: string; osType?: string;
  snComputer?: string; osVersion?: string; windowsLicense?: string; officeLicense?: string;
  antivirusStatus?: string; domainName?: string; vendor?: string; poNumber?: string;
  poDate?: string; prNumber?: string; purchaseDate?: string; age?: number; ownerName?: string;
  departmentId?: string; location?: string; floor?: string; company?: string; status: string;
  remark?: string; createdAt: string; updatedAt: string;
}

interface Props {
  filterParams?: Record<string, string>;
}

export default function ExportAssetsButton({ filterParams }: Props) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const fetchAllAssets = async () => {
    try {
      const res = await assetAPI.list({ limit: 10000, ...filterParams });
      return res.data.data || [];
    } catch { throw new Error('ไม่สามารถดาวน์โหลดข้อมูลได้'); }
  };

  const exportToExcel = async (type?: string, typeName?: string) => {
    setLoading(true); setError('');
    try {
      const response = await assetAPI.exportAssets(type, type ? undefined : filterParams);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const fileName = type ? `assets-${type}-${new Date().toISOString().split('T')[0]}.xlsx` : `assets-all-${new Date().toISOString().split('T')[0]}.xlsx`;
      link.setAttribute('download', fileName);
      document.body.appendChild(link); link.click(); link.remove();
      handleClose();
    } catch (err: any) { setError(err.message || 'เกิดข้อผิดพลาด'); } finally { setLoading(false); }
  };

  const exportFiltered = async () => {
    setLoading(true); setError('');
    try {
      const response = await assetAPI.exportAssets(undefined, filterParams);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `assets-filtered-${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link); link.click(); link.remove();
      handleClose();
    } catch (err: any) { setError(err.message || 'เกิดข้อผิดพลาด'); } finally { setLoading(false); }
  };

  const exportToCSV = async () => {
    setLoading(true); setError('');
    try {
      const response = await assetAPI.exportCSV();
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `assets-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      handleClose();
    } catch (err: any) { setError(err.message || 'เกิดข้อผิดพลาด'); } finally { setLoading(false); }
  };

  return (
    <>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Button variant="outlined" startIcon={loading ? <CircularProgress size={20} /> : <Download size={20} />}
        onClick={handleClick} disabled={loading}>ส่งออก</Button>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
        {filterParams && Object.keys(filterParams).length > 0 && (
          <MenuItem onClick={exportFiltered} disabled={loading}>📊 ส่งออกตามเงื่อนไขที่กรอง</MenuItem>
        )}
        <MenuItem onClick={() => exportToExcel()} disabled={loading}>📊 ส่งออกทั้งหมด</MenuItem>
        <MenuItem onClick={() => exportToExcel('computers')} disabled={loading}>💻 ส่งออกเฉพาะ Computers</MenuItem>
        <MenuItem onClick={() => exportToExcel('monitors')} disabled={loading}>🖥️ ส่งออกเฉพาะ Monitors</MenuItem>
        <MenuItem onClick={() => exportToExcel('devices')} disabled={loading}>⌨️ ส่งออกเฉพาะ Devices</MenuItem>
        <MenuItem onClick={() => exportToExcel('printers')} disabled={loading}>🖨️ ส่งออกเฉพาะ Printers</MenuItem>
        <MenuItem onClick={() => exportToExcel('phonesTablets')} disabled={loading}>📱 ส่งออกเฉพาะ Phones / Tablets</MenuItem>
        <MenuItem onClick={() => exportToExcel('network')} disabled={loading}>🛜 ส่งออกเฉพาะ Network Devices</MenuItem>
        <MenuItem onClick={exportToCSV} disabled={loading}>📄 ส่งออกทั้งหมด (CSV)</MenuItem>
      </Menu>
    </>
  );
}