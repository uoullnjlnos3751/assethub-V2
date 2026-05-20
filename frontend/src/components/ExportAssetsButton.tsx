import React, { useState } from 'react';
import { Button, Menu, MenuItem, CircularProgress, Alert } from '@mui/material';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { assetAPI } from '../services/api';

interface Asset {
  id: number;
  assetCode: string;
  serialNo: string;
  type: string;
  brand: string;
  model: string;
  cpu?: string;
  cpuGeneration?: string;
  ram?: string;
  ramDetail?: string;
  storage1?: string;
  storage2?: string;
  ramSlot1?: string;
  ramSlot2?: string;
  gpu?: string;
   osType?: string;
   snComputer?: string;
   osVersion?: string;

  windowsLicense?: string;
  officeLicense?: string;
  antivirusStatus?: string;
  domainName?: string;
  vendor?: string;
  poNumber?: string;
  poDate?: string;
  prNumber?: string;
  purchaseDate?: string;
  age?: number;
  ownerName?: string;
  departmentId?: string;
  location?: string;
  floor?: string;
  company?: string;
  status: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

export default function ExportAssetsButton() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const fetchAllAssets = async () => {
    try {
      const res = await assetAPI.list({ limit: 10000 });
      return res.data.data || [];
    } catch (err) {
      throw new Error('ไม่สามารถดาวน์โหลดข้อมูลได้');
    }
  };

  const exportToExcel = async (type?: string, typeName?: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await assetAPI.exportAssets(type);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const fileName = type ? `assets-${type}-${new Date().toISOString().split('T')[0]}.xlsx` : `assets-all-${new Date().toISOString().split('T')[0]}.xlsx`;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      handleClose();
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = async () => {
    setLoading(true);
    setError('');
    try {
      const assets = await fetchAllAssets();
      
      const data = assets.map((asset: Asset) => ({
        'รหัสทรัพย์สิน': asset.assetCode,
        'Serial No.': asset.serialNo,
        'ประเภท': asset.type,
        'ยี่ห้อ': asset.brand,
        'รุ่น': asset.model,
        'CPU': asset.cpu,
        'Gen': asset.cpuGeneration,
        'RAM': asset.ram,
        'RAM Detail': asset.ramDetail,
        'Storage 1': asset.storage1,
        'Storage 2': asset.storage2,
        'RAM Slot 1': asset.ramSlot1,
        'RAM Slot 2': asset.ramSlot2,
        'GPU': asset.gpu,
         'OS Type': asset.osType,
         'S/N Computer': asset.snComputer,

        'OS Version': asset.osVersion,
        'Windows License': asset.windowsLicense,
        'Office License': asset.officeLicense,
        'Antivirus Status': asset.antivirusStatus,
        'Domain Name': asset.domainName,
        'Vendor': asset.vendor,
        'PO Number': asset.poNumber,
        'PO Date': asset.poDate ? new Date(asset.poDate).toLocaleDateString('th-TH') : '',
        'PR Number': asset.prNumber,
        'วันซื้อ': asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString('th-TH') : '',
        'อายุการใช้งาน': asset.age,
        'เจ้าของ': asset.ownerName,
        'แผนก': asset.departmentId,
        'สถานที่': asset.location,
        'ชั้น': asset.floor,
        'บริษัท': asset.company,
        'สถานะ': asset.status,
        'หมายเหตุ': asset.remark,
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const csv = XLSX.utils.sheet_to_csv(ws, { FS: ',', blankrows: false });
      
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `assets-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      handleClose();
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Button
        variant="outlined"
        startIcon={loading ? <CircularProgress size={20} /> : <Download size={20} />}
        onClick={handleClick}
        disabled={loading}
      >
        ส่งออก
      </Button>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
        <MenuItem onClick={() => exportToExcel()} disabled={loading}>
          📊 ส่งออกทั้งหมด
        </MenuItem>
        <MenuItem onClick={() => exportToExcel('computers', 'Computers')} disabled={loading}>
          💻 ส่งออกเฉพาะ Computers
        </MenuItem>
        <MenuItem onClick={() => exportToExcel('monitors', 'Monitors')} disabled={loading}>
          🖥️ ส่งออกเฉพาะ Monitors
        </MenuItem>
        <MenuItem onClick={() => exportToExcel('devices', 'Devices')} disabled={loading}>
          ⌨️ ส่งออกเฉพาะ Devices
        </MenuItem>
        <MenuItem onClick={() => exportToExcel('printers', 'Printers')} disabled={loading}>
          🖨️ ส่งออกเฉพาะ Printers
        </MenuItem>
        <MenuItem onClick={() => exportToExcel('phonesTablets', 'Phones/Tablets')} disabled={loading}>
          📱 ส่งออกเฉพาะ Phones / Tablets
        </MenuItem>
        <MenuItem onClick={() => exportToExcel('network', 'Network Devices')} disabled={loading}>
          🛜 ส่งออกเฉพาะ Network Devices
        </MenuItem>
        <MenuItem onClick={exportToCSV} disabled={loading}>
          📄 ส่งออกทั้งหมด (CSV)
        </MenuItem>
      </Menu>
    </>
  );
}
