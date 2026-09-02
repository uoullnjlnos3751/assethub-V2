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
// ── Rail icons (rounded cut — reads better at 21px than the sharp default) ──
import SpaceDashboardRoundedIcon from '@mui/icons-material/SpaceDashboardRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded';
import BuildRoundedIcon from '@mui/icons-material/BuildRounded';
import RecyclingRoundedIcon from '@mui/icons-material/RecyclingRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';

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
  // ทุกคนเป็นหัวหน้างานของใครก็ได้ (ผูกด้วย managerId ไม่ใช่ role) จึงต้องอยู่ในเมนู
  // ของผู้ใช้ทั่วไป ไม่ใช่ adminNav — หน้านี้เองจะกรองให้เห็นแค่คำขอของลูกทีมตัวเอง
  { label: 'อนุมัติคำขอยืม (หัวหน้างาน)', path: '/borrow/supervisor-queue', icon: <CheckCircleIcon fontSize="small" /> },
  { label: 'รายการที่ยืม', path: '/borrow/my-items', icon: <ShoppingCartIcon fontSize="small" /> },
  { label: 'คำขอขยายวัน', path: '/borrow/my-extensions', icon: <ExtensionIcon fontSize="small" /> },
  { label: 'ประวัติการยืม', path: '/borrow/my-history', icon: <HistoryIcon fontSize="small" /> },
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
      { label: 'รออนุมัติ (IT Admin)', path: '/borrow/approval-queue', icon: <CheckCircleIcon fontSize="small" /> },
      // ผู้ใช้ role IT_ADMIN/SUPERADMIN บางคนก็เป็นหัวหน้างานของคนอื่นด้วย — ลิงก์นี้
      // ซ้ำกับที่อยู่ใน userNavItems เพราะ 2 กลุ่ม role เห็นเมนูคนละชุด (Layout.tsx)
      { label: 'รออนุมัติ (หัวหน้างาน)', path: '/borrow/supervisor-queue', icon: <CheckCircleIcon fontSize="small" /> },
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

// ── Icon rail ─────────────────────────────────────────────────────────────
// The rail is a *second view* of the same destinations as adminNav/userNavItems
// above — same paths, same role gates, regrouped so the sidebar never shows
// more than one module's worth of links at a time. adminNav stays the source
// for the mobile drawer, which still wants the full accordion.

/** A labelled block of links inside a rail module's flyout. */
export interface RailSection {
  /** Small uppercase divider above the links. Omit for the module's first block. */
  label?: string;
  items: NavItem[];
}

export interface RailModule {
  id: string;
  /** Two-line-max caption under the rail icon. Keep it to ~8 characters. */
  label: string;
  /** Heading at the top of the flyout — may be longer than `label`. */
  title: string;
  icon: React.ReactNode;
  roles?: string[];
  sections: RailSection[];
  /** Pushed to the foot of the rail, below the spacer. */
  atBottom?: boolean;
}

const ADMINS = ['SUPERADMIN', 'IT_ADMIN'];

export const adminRail: RailModule[] = [
  {
    id: 'home',
    label: 'ภาพรวม',
    title: 'ภาพรวมระบบ',
    icon: <SpaceDashboardRoundedIcon />,
    sections: [
      { items: [{ label: 'แดชบอร์ด', path: '/dashboard', icon: <DashboardIcon fontSize="small" /> }] },
    ],
  },
  {
    id: 'assets',
    label: 'ทรัพย์สิน',
    title: 'ทรัพย์สินและคลัง',
    icon: <Inventory2RoundedIcon />,
    sections: [
      {
        label: 'ทะเบียน',
        items: [
          { label: 'ทะเบียนทั้งหมด', path: '/assets', icon: <DevicesIcon fontSize="small" /> },
          { label: 'นำเข้า/ส่งออก ข้อมูล', path: '/assets/import-export', icon: <ImportExportIcon fontSize="small" />, roles: ADMINS },
          { label: 'พิมพ์ QR สติ๊กเกอร์', path: '/assets/print-qr', icon: <PrintIcon fontSize="small" />, roles: ADMINS },
          { label: 'ตรวจสอบข้อมูลจาก Agent', path: '/assets/agent-drift', icon: <RouterIcon fontSize="small" />, roles: ADMINS },
          // /categories deliberately lives only under ตั้งค่า → ข้อมูลหลัก. Listing
          // it in two modules would make the pinned flyout jump modules when you
          // open it, because a path resolves to exactly one rail slot.
        ],
      },
      {
        label: 'คลังวัสดุ',
        items: [
          { label: 'ภาพรวมคลังสินค้า', path: '/inventory', icon: <InventoryIcon fontSize="small" /> },
          { label: 'สายสัญญาณ', path: '/inventory?category=Cable', icon: <CableIcon fontSize="small" /> },
          { label: 'วัสดุสิ้นเปลือง', path: '/inventory?category=Consumable', icon: <ScienceIcon fontSize="small" /> },
        ],
      },
      {
        label: 'รับเข้า',
        items: [
          { label: 'เครื่องใหม่ & ส่งมอบ', path: '/delivery', icon: <LocalShippingIcon fontSize="small" />, roles: ADMINS },
        ],
      },
    ],
  },
  {
    id: 'service',
    label: 'ยืม-คืน',
    title: 'ระบบยืม-คืน',
    icon: <SwapHorizRoundedIcon />,
    sections: [
      {
        label: 'คำขอ',
        items: [
          { label: 'คำขอทั้งหมด', path: '/borrow/all-requests', icon: <ListAltIcon fontSize="small" /> },
          { label: 'รออนุมัติ (หัวหน้างาน)', path: '/borrow/supervisor-queue', icon: <CheckCircleIcon fontSize="small" /> },
          { label: 'รออนุมัติ (IT Admin)', path: '/borrow/approval-queue', icon: <CheckCircleIcon fontSize="small" /> },
        ],
      },
      {
        label: 'หน้างาน',
        items: [
          { label: 'ส่งมอบ (Check-out)', path: '/borrow/checkout', icon: <HandymanIcon fontSize="small" /> },
          { label: 'รับคืน (Return)', path: '/borrow/return', icon: <AssignmentReturnIcon fontSize="small" /> },
          { label: 'ขยายวัน (Extension)', path: '/borrow/extensions', icon: <ExtensionIcon fontSize="small" /> },
          { label: 'ยืมเกินกำหนด', path: '/borrow/overdue', icon: <ErrorIcon fontSize="small" /> },
          { label: 'ประวัติทั้งหมด', path: '/borrow/history', icon: <HistoryIcon fontSize="small" /> },
        ],
      },
    ],
  },
  {
    id: 'pm',
    label: 'PM',
    title: 'งานซ่อมบำรุง (PM)',
    icon: <BuildRoundedIcon />,
    sections: [
      {
        label: 'PM ทรัพย์สิน',
        items: [
          { label: 'ภาพรวม PM', path: '/pm', icon: <DashboardIcon fontSize="small" /> },
          { label: 'กำหนดการ PM', path: '/pm/schedule', icon: <CalendarTodayIcon fontSize="small" /> },
          { label: 'แผน PM', path: '/pm/plans', icon: <AssignmentIcon fontSize="small" /> },
          { label: 'ทำ PM ทรัพย์สิน', path: '/pm/runs', icon: <PlayArrowIcon fontSize="small" /> },
          { label: 'Checklist Template', path: '/pm/templates', icon: <DescriptionIcon fontSize="small" /> },
        ],
      },
      {
        label: 'หน้างาน',
        items: [
          { label: 'แผนผังชั้น PM', path: '/pm/floorplan', icon: <LocationOnIcon fontSize="small" /> },
          { label: 'ตู้ Switch/Hub', path: '/pm/sw-hub', icon: <DeviceHubIcon fontSize="small" /> },
          { label: 'สแกนหาเครื่อง', path: '/scan', icon: <QrCodeScannerIcon fontSize="small" /> },
        ],
      },
    ],
  },
  {
    id: 'lifecycle',
    // "จำหน่ายออก" and "License & สัญญา" were two sidebar sections holding four
    // links between them; both are end-of-life paperwork for an asset, so they
    // share one rail slot.
    label: 'ปลายทาง',
    title: 'ปลายทางทรัพย์สิน',
    icon: <RecyclingRoundedIcon />,
    sections: [
      {
        label: 'จำหน่ายออก',
        items: [
          { label: 'จำหน่ายออก/บริจาค', path: '/donations', icon: <VolunteerActivismIcon fontSize="small" /> },
          { label: 'บันทึกการจำหน่ายทรัพย์สิน', path: '/disposals', icon: <DeleteSweepIcon fontSize="small" /> },
        ],
      },
      {
        label: 'License & สัญญา',
        items: [
          { label: 'Software License', path: '/licenses', icon: <KeyIcon fontSize="small" /> },
          { label: 'สัญญา & Warranty', path: '/contracts', icon: <GavelIcon fontSize="small" /> },
        ],
      },
    ],
  },
  {
    id: 'reports',
    label: 'รายงาน',
    title: 'สรุปและรายงาน',
    icon: <InsightsRoundedIcon />,
    sections: [
      {
        items: [
          { label: 'รายงานทรัพย์สิน', path: '/reports/assets', icon: <InventoryIcon fontSize="small" /> },
          { label: 'รายงานยืม-คืน', path: '/reports/borrow', icon: <ReceiptLongIcon fontSize="small" /> },
          { label: 'รายงาน PM', path: '/reports/pm', icon: <AssessmentIcon fontSize="small" /> },
          { label: 'รายงานซ่อมบำรุง', path: '/reports/maintenance', icon: <BuildCircleIcon fontSize="small" /> },
          { label: 'ตรวจสอบทรัพย์สินพนักงาน', path: '/reports/user-clearance', icon: <BadgeIcon fontSize="small" />, roles: ADMINS },
        ],
      },
    ],
  },
  {
    id: 'admin',
    label: 'ตั้งค่า',
    title: 'ผู้ดูแลระบบ',
    icon: <SettingsRoundedIcon />,
    roles: ADMINS,
    atBottom: true,
    sections: [
      {
        label: 'ข้อมูลหลัก',
        items: [
          { label: 'ประเภท/สถานที่/ผู้จำหน่าย/สถานะ', path: '/admin/master-data', icon: <DomainIcon fontSize="small" /> },
          { label: 'จัดการหมวดหมู่', path: '/categories', icon: <CategoryIcon fontSize="small" /> },
        ],
      },
      {
        label: 'ระบบ',
        items: [
          { label: 'ตั้งค่าระบบ', path: '/admin/settings', icon: <SettingsIcon fontSize="small" /> },
          { label: 'Flowchart ขั้นตอนระบบ', path: '/admin/flowcharts', icon: <AccountTreeIcon fontSize="small" /> },
        ],
      },
    ],
  },
];

/** Rail for USER — the seven self-service links, split by "ทำรายการ" vs "ติดตาม". */
export const userRail: RailModule[] = [
  {
    id: 'borrow',
    label: 'ยืมของ',
    title: 'ยืมทรัพย์สิน',
    icon: <SwapHorizRoundedIcon />,
    sections: [
      {
        items: [
          { label: 'รายการของพร้อมยืม', path: '/assets?status=Available', icon: <CheckCircleOutlineIcon fontSize="small" /> },
          { label: 'ยืมทรัพย์สิน', path: '/borrow/new', icon: <AddBoxIcon fontSize="small" /> },
        ],
      },
    ],
  },
  {
    id: 'mine',
    label: 'ของฉัน',
    title: 'รายการของฉัน',
    icon: <Inventory2RoundedIcon />,
    sections: [
      {
        items: [
          { label: 'คำขอของฉัน', path: '/borrow/my-requests', icon: <ListAltIcon fontSize="small" /> },
          { label: 'รายการที่ยืม', path: '/borrow/my-items', icon: <ShoppingCartIcon fontSize="small" /> },
          { label: 'คำขอขยายวัน', path: '/borrow/my-extensions', icon: <ExtensionIcon fontSize="small" /> },
          { label: 'ประวัติการยืม', path: '/borrow/my-history', icon: <HistoryIcon fontSize="small" /> },
        ],
      },
    ],
  },
  {
    // Anyone can be someone's manager (it hangs off AppUser.managerId, not off a
    // role), so this rail slot ships to every USER — the page itself shows an
    // empty queue to people who have no direct reports.
    id: 'approve',
    label: 'อนุมัติ',
    title: 'อนุมัติคำขอยืม',
    icon: <CheckCircleIcon />,
    sections: [
      {
        items: [
          { label: 'คำขอรออนุมัติ (หัวหน้างาน)', path: '/borrow/supervisor-queue', icon: <CheckCircleIcon fontSize="small" /> },
        ],
      },
    ],
  },
];

/** Rail for VIEWER — read-only executive access. */
export const viewerRail: RailModule[] = [
  {
    id: 'home',
    label: 'ภาพรวม',
    title: 'ภาพรวมระบบ',
    icon: <SpaceDashboardRoundedIcon />,
    sections: [{ items: [{ label: 'แดชบอร์ด', path: '/dashboard', icon: <DashboardIcon fontSize="small" /> }] }],
  },
  {
    id: 'reports',
    label: 'รายงาน',
    title: 'สรุปและรายงาน',
    icon: <InsightsRoundedIcon />,
    sections: [
      {
        items: [
          { label: 'รายงานทรัพย์สิน', path: '/reports/assets', icon: <InventoryIcon fontSize="small" /> },
          { label: 'รายงานยืม-คืน', path: '/reports/borrow', icon: <ReceiptLongIcon fontSize="small" /> },
          { label: 'รายงาน PM', path: '/reports/pm', icon: <AssessmentIcon fontSize="small" /> },
          { label: 'รายงานซ่อมบำรุง', path: '/reports/maintenance', icon: <BuildCircleIcon fontSize="small" /> },
        ],
      },
    ],
  },
  {
    id: 'lifecycle',
    label: 'สัญญา',
    title: 'License & สัญญา',
    icon: <RecyclingRoundedIcon />,
    sections: [
      {
        items: [
          { label: 'Software License', path: '/licenses', icon: <KeyIcon fontSize="small" /> },
          { label: 'สัญญา & Warranty', path: '/contracts', icon: <GavelIcon fontSize="small" /> },
        ],
      },
    ],
  },
];
