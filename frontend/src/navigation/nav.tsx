import React from 'react';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DevicesIcon from '@mui/icons-material/Devices';
import ComputerIcon from '@mui/icons-material/Computer';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import DesktopWindowsIcon from '@mui/icons-material/DesktopWindows';
import PrintIcon from '@mui/icons-material/Print';
import BadgeIcon from '@mui/icons-material/Badge';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import RouterIcon from '@mui/icons-material/Router';
import CableIcon from '@mui/icons-material/Cable';
import ScienceIcon from '@mui/icons-material/Science';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';
import NotificationsIcon from '@mui/icons-material/Notifications';
import HandymanIcon from '@mui/icons-material/Handyman';
import HistoryIcon from '@mui/icons-material/History';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import ExtensionIcon from '@mui/icons-material/Extension';
import AddBoxIcon from '@mui/icons-material/AddBox';
import ListAltIcon from '@mui/icons-material/ListAlt';
import CategoryIcon from '@mui/icons-material/Category';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import StoreIcon from '@mui/icons-material/Store';
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
import DatabaseIcon from '@mui/icons-material/Storage';

export interface NavItem {
  label: string;
  path?: string;
  icon?: React.ReactNode;
  roles?: string[];
  isHeader?: boolean;
}

export interface NavGroup {
  label: string;
  icon: React.ReactNode;
  children: NavItem[];
  roles?: string[];
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

export const adminNav: NavEntry[] = [
  { label: 'แดชบอร์ด', path: '/dashboard', icon: <DashboardIcon fontSize="small" /> },
  {
    label: 'ทะเบียนทรัพย์สิน IT',
    icon: <DevicesIcon fontSize="small" />,
    children: [
      { label: 'ทะเบียนทั้งหมด', path: '/assets', icon: <DevicesIcon fontSize="small" /> },
      { label: 'คอมพิวเตอร์', path: '/assets?typeGroup=computers', icon: <ComputerIcon fontSize="small" /> },
      { label: 'จอภาพ', path: '/assets?typeGroup=monitors', icon: <DesktopWindowsIcon fontSize="small" /> },
      { label: 'เครื่องพิมพ์', path: '/assets?typeGroup=printers', icon: <PrintIcon fontSize="small" /> },
      { label: 'อุปกรณ์เครือข่าย', path: '/assets?typeGroup=network', icon: <RouterIcon fontSize="small" /> },
      { label: 'อุปกรณ์สื่อสาร', path: '/assets?typeGroup=phonesTablets', icon: <PhoneAndroidIcon fontSize="small" /> },
      { label: 'อุปกรณ์ต่อพ่วง', path: '/assets?typeGroup=devices', icon: <DevicesIcon fontSize="small" /> },
      { label: 'Rack & Infra', path: '/assets?typeGroup=rack', icon: <HandymanIcon fontSize="small" /> },
      { label: 'รายการบริจาค', path: '/donations', icon: <HandymanIcon fontSize="small" /> },
    ],
  },
  {
    label: 'ระบบจัดการคลัง',
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
    children: [
      { label: 'ของพร้อมยืม', path: '/assets?status=Available', icon: <CheckCircleOutlineIcon fontSize="small" /> },
      { label: 'รออนุมัติ', path: '/borrow/approval-queue', icon: <CheckCircleIcon fontSize="small" /> },
      { label: 'ส่งมอบ (Check-out)', path: '/borrow/checkout', icon: <HandymanIcon fontSize="small" /> },
      { label: 'รับคืน (Return)', path: '/borrow/return', icon: <AssignmentReturnIcon fontSize="small" /> },
      { label: 'ขยายวัน (Extension)', path: '/borrow/extensions', icon: <ExtensionIcon fontSize="small" /> },
      { label: 'ยืมเกินกำหนด', path: '/borrow/overdue', icon: <ErrorIcon fontSize="small" /> },
      { label: 'ประวัติทั้งหมด', path: '/borrow/history', icon: <HistoryIcon fontSize="small" /> },
    ],
  },
  {
    label: 'ซ่อมบำรุง & PM',
    icon: <BuildCircleIcon fontSize="small" />,
    children: [
      { label: 'PM ทรัพย์สิน IT', isHeader: true },
      { label: 'ภาพรวม PM', path: '/pm', icon: <DashboardIcon fontSize="small" /> },
      { label: 'กำหนดการ PM', path: '/pm/schedule', icon: <CalendarTodayIcon fontSize="small" /> },
      { label: 'แผน PM', path: '/pm/plans', icon: <AssignmentIcon fontSize="small" /> },
      { label: 'ทำ PM ทรัพย์สิน', path: '/pm/runs', icon: <PlayArrowIcon fontSize="small" /> },
      { label: 'แผนผังชั้น PM', path: '/pm/floorplan', icon: <LocationOnIcon fontSize="small" /> },
      { label: 'Checklist Template', path: '/pm/templates', icon: <DescriptionIcon fontSize="small" /> },
      { label: 'PM SW/Hub Room', isHeader: true },
      { label: 'ภาพรวม Hub Room', path: '/pm/sw-hub', icon: <RouterIcon fontSize="small" /> },
      { label: 'แผน Hub Room', path: '/pm/sw-hub/plans', icon: <AssignmentIcon fontSize="small" /> },
      { label: 'ตรวจ Hub Room', path: '/pm/sw-hub/new', icon: <PlayArrowIcon fontSize="small" /> },
      { label: 'Template Hub Room', path: '/pm/sw-hub/template', icon: <DescriptionIcon fontSize="small" /> },
    ],
  },
  {
    label: 'รายงานระบบ',
    icon: <AssessmentIcon fontSize="small" />,
    children: [
      { label: 'รายงานทรัพย์สิน', path: '/reports/assets', icon: <InventoryIcon fontSize="small" /> },
      { label: 'รายงานยืม-คืน', path: '/reports/borrow', icon: <ReceiptLongIcon fontSize="small" /> },
      { label: 'รายงาน PM', path: '/reports/pm', icon: <AssessmentIcon fontSize="small" /> },
      { label: 'รายงานซ่อมบำรุง', path: '/reports/maintenance', icon: <BuildCircleIcon fontSize="small" /> },
      { label: 'ตรวจสอบทรัพย์สินพนักงาน', path: '/reports/user-clearance', icon: <BadgeIcon fontSize="small" /> },
    ],
  },
  {
    label: 'ตั้งค่าผู้ดูแลระบบ',
    icon: <SettingsIcon fontSize="small" />,
    roles: ['SUPERADMIN', 'IT_ADMIN'],
    children: [
      { label: 'เครื่องมือระบบ', isHeader: true },
      { label: 'นำเข้า/ส่งออก ข้อมูล', path: '/assets/import-export', icon: <ImportExportIcon fontSize="small" /> },
      { label: 'พิมพ์ QR สติ๊กเกอร์', path: '/assets/print-qr', icon: <PrintIcon fontSize="small" /> },
      { label: 'Flowchart ขั้นตอนระบบ', path: '/admin/flowcharts', icon: <AssessmentIcon fontSize="small" /> },
      { label: 'ข้อมูลหลัก', isHeader: true },
      { label: 'จัดการหมวดหมู่', path: '/categories', icon: <CategoryIcon fontSize="small" /> },
      { label: 'ประเภทอุปกรณ์', path: '/assets/device-types', icon: <DevicesIcon fontSize="small" /> },
      { label: 'ที่ตั้งทรัพย์สิน', path: '/assets/locations', icon: <LocationOnIcon fontSize="small" /> },
      { label: 'Vendor', path: '/assets/vendors', icon: <StoreIcon fontSize="small" /> },
      { label: 'สถานะทรัพย์สิน', path: '/assets/statuses', icon: <CheckCircleOutlineIcon fontSize="small" /> },
      { label: 'แผนก/บริษัท/ที่ตั้ง', path: '/admin/master-data', icon: <DomainIcon fontSize="small" />, roles: ['SUPERADMIN', 'IT_ADMIN'] },
      { label: 'ตั้งค่าระบบ', isHeader: true, roles: ['SUPERADMIN', 'IT_ADMIN'] },
      { label: 'ตั้งค่าระบบหลัก', path: '/admin/settings', icon: <SettingsIcon fontSize="small" />, roles: ['SUPERADMIN'] },
      { label: 'จัดการผู้ใช้งาน', path: '/admin/users', icon: <PeopleIcon fontSize="small" />, roles: ['SUPERADMIN'] },
      { label: 'จัดการ Backup', path: '/admin/backup', icon: <DatabaseIcon fontSize="small" />, roles: ['SUPERADMIN', 'IT_ADMIN'] },
      { label: 'ระบบ Logs', isHeader: true, roles: ['SUPERADMIN', 'IT_ADMIN'] },
      { label: 'Audit Log', path: '/admin/audit-log', icon: <ReceiptLongIcon fontSize="small" />, roles: ['IT_ADMIN', 'SUPERADMIN'] },
      { label: 'ประวัติแจ้งเตือน', path: '/admin/notification-logs', icon: <NotificationsIcon fontSize="small" />, roles: ['SUPERADMIN'] },
    ],
  },
];
