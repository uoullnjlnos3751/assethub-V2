import React from 'react';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DevicesIcon from '@mui/icons-material/Devices';
import PrintIcon from '@mui/icons-material/Print';
import BadgeIcon from '@mui/icons-material/Badge';
import RouterIcon from '@mui/icons-material/Router';
import CableIcon from '@mui/icons-material/Cable';
import ScienceIcon from '@mui/icons-material/Science';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import SettingsIcon from '@mui/icons-material/Settings';
import HandymanIcon from '@mui/icons-material/Handyman';
import HistoryIcon from '@mui/icons-material/History';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import ExtensionIcon from '@mui/icons-material/Extension';
import AddBoxIcon from '@mui/icons-material/AddBox';
import ListAltIcon from '@mui/icons-material/ListAlt';
import CategoryIcon from '@mui/icons-material/Category';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ImportExportIcon from '@mui/icons-material/ImportExport';
import ErrorIcon from '@mui/icons-material/Error';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DescriptionIcon from '@mui/icons-material/Description';
import InventoryIcon from '@mui/icons-material/Inventory';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import DomainIcon from '@mui/icons-material/Domain';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import GavelIcon from '@mui/icons-material/Gavel';
import KeyIcon from '@mui/icons-material/Key';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import DeviceHubIcon from '@mui/icons-material/DeviceHub';

export interface NavItem {
  label: string;
  path?: string;
  icon?: React.ReactNode;
  roles?: string[];
  isHeader?: boolean;
  /** Section heading shown above this entry in the sidebar (data-driven, replaces the old getSectionLabel mapping) */
  section?: string;
}

export interface NavGroup {
  label: string;
  icon: React.ReactNode;
  children: NavItem[];
  roles?: string[];
  /** Section heading shown above this entry in the sidebar */
  section?: string;
}

export type NavEntry = NavItem | NavGroup;

export const userNavItems: NavItem[] = [
  { label: 'รายการของพร้อมยืม', path: '/assets?status=Available', icon: <CheckCircleOutlineIcon fontSize="small" /> },
  { label: 'ยืมทรัพย์สิน', path: '/borrow/new', icon: <AddBoxIcon fontSize="small" /> },
  { label: 'คำขอของฉัน', path: '/borrow/my-requests', icon: <ListAltIcon fontSize="small" /> },
  { label: 'รายการที่ยืม', path: '/borrow/my-items', icon: <ShoppingCartIcon fontSize="small" /> },
  { label: 'คำขอขยายวัน', path: '/borrow/my-extensions', icon: <ExtensionIcon fontSize="small" /> },
  { label: 'ประวัติการยืม', path: '/borrow/my-history', icon: <HistoryIcon fontSize="small" /> },
];

// ฝ่ายบุคคลที่รับฝากเครื่องคืนตอนพนักงานลาออก — เห็นเมนูเดียวเท่านั้น
// (ถ้าไม่มีรายการนี้ HR จะตกไปใช้ userNavItems แล้วได้เมนูยืม-คืนที่ไม่เกี่ยวข้อง)
export const custodyNavItems: NavItem[] = [
  { label: 'เครื่องที่รับฝาก', path: '/custody', icon: <AssignmentReturnIcon fontSize="small" /> },
];

// จัดโครงสร้างตาม ITAM lifecycle: ภาพรวม → ทะเบียน/คลัง → ยืม-คืน → ซ่อมบำรุง → จำหน่ายออก → รายงาน → ตั้งค่า
export const adminNav: NavEntry[] = [
  { label: 'แดชบอร์ด', path: '/dashboard', icon: <DashboardIcon fontSize="small" />, section: 'ภาพรวมระบบ' },
  {
    label: 'ทะเบียนทรัพย์สิน IT',
    icon: <DevicesIcon fontSize="small" />,
    section: 'จัดการทรัพย์สิน',
    children: [
      // The per-type shortcuts that used to sit here are now built-in views
      // on the registry page itself — see pages/assets/components/presetViews.ts.
      { label: 'ทะเบียนทั้งหมด', path: '/assets', icon: <DevicesIcon fontSize="small" /> },
      { label: 'นำเข้า/ส่งออก ข้อมูล', path: '/assets/import-export', icon: <ImportExportIcon fontSize="small" />, roles: ['SUPERADMIN', 'IT_ADMIN'] },
      { label: 'พิมพ์ QR สติ๊กเกอร์', path: '/assets/print-qr', icon: <PrintIcon fontSize="small" />, roles: ['SUPERADMIN', 'IT_ADMIN'] },
      { label: 'ตรวจสอบข้อมูลจาก Agent', path: '/assets/agent-drift', icon: <RouterIcon fontSize="small" />, roles: ['SUPERADMIN', 'IT_ADMIN'] },
    ],
  },
  {
    label: 'เครื่องใหม่ & ส่งมอบ',
    path: '/delivery',
    icon: <LocalShippingIcon fontSize="small" />,
    roles: ['SUPERADMIN', 'IT_ADMIN'],
  },
  {
    label: 'คลังวัสดุ',
    icon: <InventoryIcon fontSize="small" />,
    children: [
      { label: 'ภาพรวมคลังสินค้า', path: '/inventory', icon: <InventoryIcon fontSize="small" /> },
      { label: 'สายสัญญาณ', path: '/inventory?category=Cable', icon: <CableIcon fontSize="small" /> },
      { label: 'วัสดุสิ้นเปลือง', path: '/inventory?category=Consumable', icon: <ScienceIcon fontSize="small" /> },
    ],
  },
  {
    label: 'ระบบยืม-คืน',
    icon: <ShoppingCartIcon fontSize="small" />,
    section: 'Service Desk',
    children: [
      { label: 'คำขอทั้งหมด', path: '/borrow/all-requests', icon: <ListAltIcon fontSize="small" /> },
      { label: 'รออนุมัติ', path: '/borrow/approval-queue', icon: <CheckCircleIcon fontSize="small" /> },
      { label: 'ส่งมอบ (Check-out)', path: '/borrow/checkout', icon: <HandymanIcon fontSize="small" /> },
      { label: 'รับคืน (Return)', path: '/borrow/return', icon: <AssignmentReturnIcon fontSize="small" /> },
      { label: 'ขยายวัน (Extension)', path: '/borrow/extensions', icon: <ExtensionIcon fontSize="small" /> },
      { label: 'ยืมเกินกำหนด', path: '/borrow/overdue', icon: <ErrorIcon fontSize="small" /> },
      { label: 'ประวัติทั้งหมด', path: '/borrow/history', icon: <HistoryIcon fontSize="small" /> },
    ],
  },
  {
    label: 'PM ทรัพย์สิน',
    icon: <BuildCircleIcon fontSize="small" />,
    section: 'งานซ่อมบำรุง',
    children: [
      { label: 'ภาพรวม PM', path: '/pm', icon: <DashboardIcon fontSize="small" /> },
      { label: 'กำหนดการ PM', path: '/pm/schedule', icon: <CalendarTodayIcon fontSize="small" /> },
      { label: 'แผน PM', path: '/pm/plans', icon: <AssignmentIcon fontSize="small" /> },
      { label: 'ทำ PM ทรัพย์สิน', path: '/pm/runs', icon: <PlayArrowIcon fontSize="small" /> },
      { label: 'แผนผังชั้น PM', path: '/pm/floorplan', icon: <LocationOnIcon fontSize="small" /> },
      { label: 'สแกนหาเครื่อง', path: '/scan', icon: <QrCodeScannerIcon fontSize="small" /> },
      { label: 'Checklist Template', path: '/pm/templates', icon: <DescriptionIcon fontSize="small" /> },
      // ตู้ Switch/Hub เคยกาง 4 รายการที่ชื่อซ้ำกับด้านบนทุกบรรทัด (ภาพรวม/แผน/ตรวจ/Template)
      // ทั้งที่ทั้งกองมีการตรวจแค่ 6 ครั้ง ครั้งล่าสุด มิ.ย. 2569 — และหน้าทั้งสี่ลิงก์ถึงกัน
      // เองอยู่แล้วโดยมีหน้าภาพรวมเป็นศูนย์กลาง เมนูจึงเหลือทางเข้าเดียว
      { label: 'ตู้ Switch/Hub', path: '/pm/sw-hub', icon: <DeviceHubIcon fontSize="small" /> },
    ],
  },
  {
    label: 'จำหน่ายทรัพย์สินออก',
    icon: <DeleteSweepIcon fontSize="small" />,
    section: 'จำหน่ายทรัพย์สินออก',
    children: [
      { label: 'จำหน่ายออก/บริจาค', path: '/donations', icon: <VolunteerActivismIcon fontSize="small" /> },
      { label: 'บันทึกการจำหน่ายทรัพย์สิน', path: '/disposals', icon: <DeleteSweepIcon fontSize="small" /> },
    ],
  },
  {
    label: 'License & สัญญา',
    icon: <GavelIcon fontSize="small" />,
    section: 'License & สัญญา',
    children: [
      { label: 'Software License', path: '/licenses', icon: <KeyIcon fontSize="small" /> },
      { label: 'สัญญา & Warranty', path: '/contracts', icon: <GavelIcon fontSize="small" /> },
    ],
  },
  {
    label: 'รายงานระบบ',
    icon: <AssessmentIcon fontSize="small" />,
    section: 'สรุปและรายงาน',
    children: [
      { label: 'รายงานทรัพย์สิน', path: '/reports/assets', icon: <InventoryIcon fontSize="small" /> },
      { label: 'รายงานยืม-คืน', path: '/reports/borrow', icon: <ReceiptLongIcon fontSize="small" /> },
      { label: 'รายงาน PM', path: '/reports/pm', icon: <AssessmentIcon fontSize="small" /> },
      { label: 'รายงานซ่อมบำรุง', path: '/reports/maintenance', icon: <BuildCircleIcon fontSize="small" /> },
      { label: 'ตรวจสอบทรัพย์สินพนักงาน', path: '/reports/user-clearance', icon: <BadgeIcon fontSize="small" />, roles: ['SUPERADMIN', 'IT_ADMIN'] },
    ],
  },
  {
    label: 'ข้อมูลหลัก (Master Data)',
    icon: <CategoryIcon fontSize="small" />,
    section: 'ผู้ดูแลระบบ',
    roles: ['SUPERADMIN', 'IT_ADMIN'],
    children: [
      { label: 'จัดการหมวดหมู่', path: '/categories', icon: <CategoryIcon fontSize="small" /> },
      { label: 'ประเภท/สถานที่/ผู้จำหน่าย/สถานะ/บริษัท/แผนก', path: '/admin/master-data', icon: <DomainIcon fontSize="small" /> },
    ],
  },
  { label: 'ตั้งค่าระบบ', path: '/admin/settings', icon: <SettingsIcon fontSize="small" />, roles: ['SUPERADMIN', 'IT_ADMIN'] },
  { label: 'Flowchart ขั้นตอนระบบ', path: '/admin/flowcharts', icon: <AccountTreeIcon fontSize="small" />, roles: ['IT_ADMIN', 'SUPERADMIN'] },
];
