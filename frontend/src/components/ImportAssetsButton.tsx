import React, { useRef, useState } from 'react';
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, Alert, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { assetAPI } from '../services/api';

interface ImportedAsset {
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
  ownerName?: string;
  departmentId?: string;
  location?: string;
  floor?: string;
  company?: string;
  status?: string;
  remark?: string;
}

export default function ImportAssetsButton() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewData, setPreviewData] = useState<ImportedAsset[]>([]);
  const [fileName, setFileName] = useState('');
  const [encoding, setEncoding] = useState('UTF-8');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setSelectedFile(file);
    setError('');
    setPreviewData([]);
    setLoading(true);

    const processFile = (enc: string) => {
      const reader = new FileReader();
      
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        reader.onload = (e) => {
          try {
            const data = e.target?.result as ArrayBuffer;
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];
            
            console.log('Raw Excel Data (first row):', jsonData[0]);

            const mapped = jsonData.map((row: any) => {
              const item = {
                assetCode: String(row['รหัสทรัพย์สิน'] || row['assetCode'] || row['New Comname'] || row['Asset Code'] || '').trim(),
                serialNo: String(row['Serial No.'] || row['serialNo'] || row['Serial Number'] || row['S/N Computer'] || '').trim(),
                type: row['ประเภทอุปกรณ์'] || row['ประเภท'] || row['type'] || row['Type PC/Notebook'] || row['Type'],
                brand: row['ยี่ห้อ (Brand)'] || row['ยี่ห้อ'] || row['brand'] || row['Brand'],
                model: row['รุ่น (Model)'] || row['รุ่น'] || row['model'] || row['Model'],
                cpu: row['CPU'] || row['cpu'],
                cpuGeneration: row['Generation'] || row['Gen'] || row['cpuGeneration'],
                ram: row['RAM'] || row['ram'] || row['Ram'],
                ramDetail: row['RAM Detail'] || row['ramDetail'],
                storage1: row['Storage 1'] || row['storage1'] || row['SSD'] || row['HD'],
                storage2: row['Storage 2'] || row['storage2'],
                ramSlot1: row['RAM Slot 1'] || row['ramSlot1'],
                ramSlot2: row['RAM Slot 2'] || row['ramSlot2'],
                gpu: row['GPU'] || row['gpu'],
                 osType: row['OS Type'] || row['osType'] || row['OS'],
                 snComputer: row['S/N Computer'] || row['snComputer'],

                osVersion: row['OS Version'] || row['osVersion'] || row['Windows'],
                windowsLicense: row['Windows License'] || row['windowsLicense'] || row['Window License No.'],
                officeLicense: row['Office License'] || row['officeLicense'] || row['Office License No.'] || row['MS Office'],
                antivirusStatus: row['Antivirus Status'] || row['antivirusStatus'] || row['Antivirus'],
                domainName: row['Domain Name'] || row['domainName'],
                vendor: row['Vendor'] || row['vendor'],
                poNumber: row['PO Number'] || row['poNumber'] || row['PO No.'],
                poDate: row['PO Date'] || row['poDate'],
                prNumber: row['PR Number'] || row['prNumber'] || row['PR No.'],
                purchaseDate: row['วันที่ซื้อ'] || row['วันซื้อ'] || row['purchaseDate'] || row['PO Date'],
                ownerName: row['ผู้ถือครอง'] || row['เจ้าของ'] || row['ownerName'] || row['Name'] || row['User Owner'],
                departmentId: row['แผนก'] || row['departmentId'] || row['Dep.'],
                location: row['Location'] || row['สถานที่'] || row['location'],
                floor: row['Floor'] || row['ชั้น'] || row['floor'],
                company: row['Company'] || row['บริษัท'] || row['company'],
                status: row['สถานะ'] || row['status'] || 'Available',
                remark: row['หมายเหตุ'] || row['remark'] || row['Remark'],
              };
              return item;
            });
            
            console.log('Mapped Excel Data (count):', mapped.length);
            setPreviewData(mapped.filter(a => a.assetCode || a.serialNo));
            setOpen(true);
          } catch (err) {
            console.error('Excel processing error:', err);
            setError('ไม่สามารถอ่านไฟล์ Excel ได้');
          } finally {
            setLoading(false);
          }
        };
        reader.readAsArrayBuffer(file);
      } else if (file.name.endsWith('.csv')) {
        reader.onload = (e) => {
          try {
            let csv = e.target?.result as string;
            console.log('CSV Raw Snippet:', csv.substring(0, 100));
            
            // Handle UTF-8 BOM
            if (csv.charCodeAt(0) === 0xFEFF) {
              csv = csv.substr(1);
            }
            Papa.parse(csv, {
              header: true,
              skipEmptyLines: true,
              complete: (results: Papa.ParseResult<any>) => {
                console.log('PapaParse Headers:', results.meta.fields);
                
                const mapped = (results.data as any[])
                  .map((row: any) => ({
                    assetCode: String(row['รหัสทรัพย์สิน'] || row['assetCode'] || row['New Comname'] || row['Asset Code'] || '').trim(),
                    serialNo: String(row['Serial No.'] || row['serialNo'] || row['Serial Number'] || row['S/N Computer'] || '').trim(),
                    type: row['ประเภทอุปกรณ์'] || row['ประเภท'] || row['type'] || row['Type PC/Notebook'] || row['Type'],
                    brand: row['ยี่ห้อ (Brand)'] || row['ยี่ห้อ'] || row['brand'] || row['Brand'],
                    model: row['รุ่น (Model)'] || row['รุ่น'] || row['model'] || row['Model'],
                    cpu: row['CPU'] || row['cpu'],
                    cpuGeneration: row['Generation'] || row['Gen'] || row['cpuGeneration'],
                    ram: row['RAM'] || row['ram'] || row['Ram'],
                    ramDetail: row['RAM Detail'] || row['ramDetail'],
                    storage1: row['Storage 1'] || row['storage1'] || row['SSD'] || row['HD'],
                    storage2: row['Storage 2'] || row['storage2'],
                    ramSlot1: row['RAM Slot 1'] || row['ramSlot1'],
                    ramSlot2: row['RAM Slot 2'] || row['ramSlot2'],
                    gpu: row['GPU'] || row['gpu'],
                    osType: row['OS Type'] || row['osType'] || row['OS'],
                    snComputer: row['S/N Computer'] || row['snComputer'],
                    osVersion: row['OS Version'] || row['osVersion'] || row['Windows'],
                    windowsLicense: row['Windows License'] || row['windowsLicense'] || row['Window License No.'],
                    officeLicense: row['Office License'] || row['officeLicense'] || row['Office License No.'] || row['MS Office'],
                    antivirusStatus: row['Antivirus Status'] || row['antivirusStatus'] || row['Antivirus'],
                    domainName: row['Domain Name'] || row['domainName'],
                    vendor: row['Vendor'] || row['vendor'],
                    poNumber: row['PO Number'] || row['poNumber'] || row['PO No.'],
                    poDate: row['PO Date'] || row['poDate'],
                    prNumber: row['PR Number'] || row['prNumber'] || row['PR No.'],
                    purchaseDate: row['วันที่ซื้อ'] || row['วันซื้อ'] || row['purchaseDate'] || row['PO Date'],
                    ownerName: row['ผู้ถือครอง'] || row['เจ้าของ'] || row['ownerName'] || row['Name'] || row['User Owner'],
                    departmentId: row['แผนก'] || row['departmentId'] || row['Dep.'],
                    location: row['Location'] || row['สถานที่'] || row['location'],
                    floor: row['Floor'] || row['ชั้น'] || row['floor'],
                    company: row['Company'] || row['บริษัท'] || row['company'],
                    status: row['สถานะ'] || row['status'] || 'Available',
                    remark: row['หมายเหตุ'] || row['remark'] || row['Remark'],
                  }));
                
                console.log('Mapped CSV Data (count):', mapped.length);
                const valid = mapped.filter(a => a.assetCode || a.serialNo);
                console.log('Valid rows:', valid.length);
                
                if (valid.length === 0) {
                  setError('ไม่พบข้อมูลรหัสทรัพย์สินในไฟล์ กรุณาตรวจสอบหัวตาราง (Headers)');
                }
                
                setPreviewData(valid);
                setOpen(true);
              },
              error: (err: Error) => {
                console.error('PapaParse error:', err);
                setError('ไม่สามารถอ่านไฟล์ CSV ได้');
              },
            });
          } finally {
            setLoading(false);
          }
        };
        reader.readAsText(file, enc);
      }
    };

    processFile(encoding);
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    
    setLoading(true);
    setError('');
    try {
      console.log('--- STARTING IMPORT ---');
      const res = await assetAPI.importAssets(selectedFile);
      const { success, errors, total } = res.data;
      
      console.log('--- IMPORT FINISHED ---', { success, errors, total });

      if (success > 0) {
        setError(`✓ นำเข้าสำเร็จ: ${success} รายการ, ล้มเหลว ${errors} รายการ จากทั้งหมด ${total} รายการ`);
        setTimeout(() => {
          setOpen(false);
          window.location.reload();
        }, 3000);
      } else {
        setError(`นำเข้าไม่สำเร็จ: ข้อมูลอาจซ้ำหรือไม่ถูกต้อง`);
      }
    } catch (err: any) {
      console.error('Overall import error:', err);
      setError(err.response?.data?.error || err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      <Button
        variant="outlined"
        startIcon={loading ? <CircularProgress size={20} /> : <Upload size={20} />}
        onClick={() => fileInputRef.current?.click()}
        disabled={loading}
      >
        นำเข้า
      </Button>

      <Dialog open={open} onClose={() => !loading && setOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          ตรวจสอบข้อมูล - {fileName} ({previewData.length} รายการ)
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert 
              severity={error.includes('✓') ? 'success' : 'error'} 
              sx={{ mb: 2 }}
            >
              {error}
            </Alert>
          )}
          
          {previewData.length > 0 && (
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell>รหัสทรัพย์สิน</TableCell>
                    <TableCell>Serial No.</TableCell>
                    <TableCell>ประเภท</TableCell>
                    <TableCell>ยี่ห้อ</TableCell>
                    <TableCell>รุ่น</TableCell>
                    <TableCell>เจ้าของ</TableCell>
                    <TableCell>สถานะ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {previewData.slice(0, 10).map((asset, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{asset.assetCode}</TableCell>
                      <TableCell>{asset.serialNo}</TableCell>
                      <TableCell>{asset.type}</TableCell>
                      <TableCell>{asset.brand}</TableCell>
                      <TableCell>{asset.model}</TableCell>
                      <TableCell>{asset.ownerName}</TableCell>
                      <TableCell>{asset.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          {previewData.length > 10 && (
            <Alert severity="info" sx={{ mt: 2 }}>
              แสดง 10 จาก {previewData.length} รายการ
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={loading}>ยกเลิก</Button>
          <Button 
            onClick={handleImport} 
            variant="contained" 
            disabled={loading || previewData.length === 0}
          >
            {loading ? <CircularProgress size={20} /> : 'นำเข้า'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
