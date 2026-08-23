import React from 'react';
import ComputerIcon from '@mui/icons-material/Computer';
import DesktopWindowsIcon from '@mui/icons-material/DesktopWindows';
import DevicesIcon from '@mui/icons-material/Devices';
import PrintIcon from '@mui/icons-material/Print';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import RouterIcon from '@mui/icons-material/Router';
import HandymanIcon from '@mui/icons-material/Handyman';

export type ColumnConfig = {
  field: string;
  label: string;
  visible: boolean;
};

export const COLUMN_PREF_KEY = 'assethub.assetList.columns.v3';
export const VIEW_MODE_KEY = 'assethub.assetList.viewMode';
export const DENSITY_KEY = 'assethub.assetList.density';

export const defaultColumnConfig: ColumnConfig[] = [
  { field: 'hasImage', label: 'รูป', visible: true },
  { field: 'assetName', label: 'ชื่อทรัพย์สิน', visible: true },
  { field: 'serialNo', label: 'Serial No.', visible: true },
  { field: 'type', label: 'ประเภท', visible: true },
  { field: 'brand', label: 'ยี่ห้อ', visible: true },
  { field: 'model', label: 'รุ่น', visible: true },
  { field: 'status', label: 'สถานะ', visible: true },
  { field: 'ownerName', label: 'ผู้ถือครอง', visible: true },
  { field: 'departmentId', label: 'แผนก', visible: true },
  { field: 'location', label: 'สถานที่ติดตั้ง/อาคาร', visible: true },
  { field: 'floor', label: 'ชั้น', visible: true },
  { field: 'id', label: 'ID', visible: false },
  { field: 'assetCode', label: 'เลขครุภัณฑ์', visible: false },
  { field: 'company', label: 'Company', visible: false },
  { field: 'oldAssetCode', label: 'รหัสทรัพย์สินเดิม', visible: false },
  { field: 'domainName', label: 'Domain Name', visible: false },
  { field: 'osType', label: 'OS', visible: false },
  { field: 'osVersion', label: 'Windows Version', visible: false },
  { field: 'windowsLicense', label: 'Windows License', visible: false },
  { field: 'officeLicense', label: 'MS Office', visible: false },
  { field: 'antivirusStatus', label: 'Antivirus', visible: false },
  { field: 'cpu', label: 'CPU', visible: false },
  { field: 'cpuGeneration', label: 'Generation', visible: false },
  { field: 'gpu', label: 'GPU', visible: false },
  { field: 'ram', label: 'RAM', visible: false },
  { field: 'ramDetail', label: 'RAM Detail', visible: false },
  { field: 'ramSlot1', label: 'RAM Slot1', visible: false },
  { field: 'ramSlot2', label: 'RAM Slot2', visible: false },
  { field: 'storage1', label: 'Storage 1', visible: false },
  { field: 'storage2', label: 'Storage 2', visible: false },
  { field: 'snComputer', label: 'S/N Computer', visible: false },
  { field: 'budget', label: 'งบประมาณ', visible: false },
  { field: 'prNumber', label: 'PR No.', visible: false },
  { field: 'poDate', label: 'PO Date', visible: false },
  { field: 'poNumber', label: 'PO No.', visible: false },
  { field: 'vendor', label: 'Vendor', visible: false },
  { field: 'purchaseDate', label: 'วันที่จัดซื้อ', visible: false },
  { field: 'age', label: 'อายุ (ปี)', visible: false },
  { field: 'remark', label: 'หมายเหตุ', visible: false },
  { field: 'createdAt', label: 'วันที่สร้าง', visible: false },
  { field: 'updatedAt', label: 'วันที่แก้ไขล่าสุด', visible: false },
];

// Grouping used only for the column-picker dialog (search/quick-toggle) — does NOT
// affect actual table column order, which stays driven by columnConfig's array order.
export const COLUMN_CATEGORIES: Record<string, string> = {
  hasImage: 'พื้นฐาน', assetName: 'พื้นฐาน', serialNo: 'พื้นฐาน', type: 'พื้นฐาน', brand: 'พื้นฐาน', model: 'พื้นฐาน',
  status: 'พื้นฐาน', id: 'พื้นฐาน', assetCode: 'พื้นฐาน', company: 'พื้นฐาน', oldAssetCode: 'พื้นฐาน',
  ownerName: 'องค์กร/ตำแหน่ง', departmentId: 'องค์กร/ตำแหน่ง', location: 'องค์กร/ตำแหน่ง', floor: 'องค์กร/ตำแหน่ง',
  domainName: 'ซอฟต์แวร์', osType: 'ซอฟต์แวร์', osVersion: 'ซอฟต์แวร์', windowsLicense: 'ซอฟต์แวร์', officeLicense: 'ซอฟต์แวร์', antivirusStatus: 'ซอฟต์แวร์',
  cpu: 'ฮาร์ดแวร์', cpuGeneration: 'ฮาร์ดแวร์', gpu: 'ฮาร์ดแวร์', ram: 'ฮาร์ดแวร์', ramDetail: 'ฮาร์ดแวร์', ramSlot1: 'ฮาร์ดแวร์', ramSlot2: 'ฮาร์ดแวร์', storage1: 'ฮาร์ดแวร์', storage2: 'ฮาร์ดแวร์', snComputer: 'ฮาร์ดแวร์',
  budget: 'จัดซื้อ', prNumber: 'จัดซื้อ', poDate: 'จัดซื้อ', poNumber: 'จัดซื้อ', vendor: 'จัดซื้อ', purchaseDate: 'จัดซื้อ', age: 'จัดซื้อ',
  remark: 'อื่นๆ', createdAt: 'อื่นๆ', updatedAt: 'อื่นๆ',
};

export const statusLabels: Record<string, string> = {
  Available: 'พร้อมใช้งาน',
  Borrowed: 'กำลังยืม',
  InUse: 'ใช้งานประจำ',
  Maintenance: 'ซ่อมบำรุง',
  Retired: 'ปลดระวาง',
  Lost: 'สูญหาย',
};

export const warrantyStatusLabels: Record<string, string> = {
  active: 'ยังไม่หมดประกัน',
  expiringSoon: 'ใกล้หมดประกัน (30 วัน)',
  expired: 'หมดประกันแล้ว',
  none: 'ไม่มีประกัน',
};

export const columnDefaultsByField = new Map(defaultColumnConfig.map((config) => [config.field, config]));

export const typeGroupLabels: Record<string, string> = {
  computers: 'คอมพิวเตอร์',
  monitors: 'จอภาพ',
  devices: 'อุปกรณ์ต่อพ่วง',
  printers: 'เครื่องพิมพ์',
  phonesTablets: 'อุปกรณ์สื่อสาร',
  network: 'อุปกรณ์เครือข่าย',
  rack: 'Rack & Infrastructure',
};

export const typeGroupIcons: Record<string, React.ReactNode> = {
  computers: <ComputerIcon fontSize="small" />,
  monitors: <DesktopWindowsIcon fontSize="small" />,
  devices: <DevicesIcon fontSize="small" />,
  printers: <PrintIcon fontSize="small" />,
  phonesTablets: <PhoneAndroidIcon fontSize="small" />,
  network: <RouterIcon fontSize="small" />,
  rack: <HandymanIcon fontSize="small" />,
};

export const typeGroupDescriptions: Record<string, string> = {
  computers: 'คอมพิวเตอร์ตั้งโต๊ะ โน๊ตบุ๊ค และอุปกรณ์ประมวลผล',
  monitors: 'จอภาพทุกประเภทสำหรับการทำงาน',
  devices: 'อุปกรณ์ต่อพ่วง เมาส์ คีย์บอร์ด เว็บแคม ไมค์ ลำโพง',
  printers: 'เครื่องพิมพ์ทุกประเภท',
  phonesTablets: 'สมาร์ทโฟน แท็บเล็ต และอุปกรณ์สื่อสาร',
  network: 'อุปกรณ์เครือข่าย สวิตช์ เราเตอร์ ไฟร์วอลล์',
  rack: 'แร็คเซิร์ฟเวอร์ PDU UPS และโครงสร้างพื้นฐาน',
};

export const formatDate = (value: unknown) => {
  if (!value) return '';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('th-TH');
};

export const formatDateTime = (value: unknown) => {
  if (!value) return '';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('th-TH');
};

export const loadColumnConfig = () => {
  try {
    const saved = localStorage.getItem(COLUMN_PREF_KEY);
    if (!saved) return defaultColumnConfig;
    const parsed = JSON.parse(saved) as ColumnConfig[];
    const known = new Set(defaultColumnConfig.map((c) => c.field));
    const savedFields = new Set(parsed.map((c) => c.field));
    const orderedSaved = parsed
      .filter((c) => known.has(c.field))
      .map((c) => ({ ...columnDefaultsByField.get(c.field)!, visible: c.visible }));
    const missing = defaultColumnConfig.filter((c) => !savedFields.has(c.field));
    return [...orderedSaved, ...missing];
  } catch {
    return defaultColumnConfig;
  }
};
