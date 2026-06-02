import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar, Box, CssBaseline, Drawer, IconButton, List, ListItem, ListItemButton,
  ListItemIcon, ListItemText, Toolbar, Typography, Button, Avatar, Menu, MenuItem,
  Divider, Collapse, alpha, useTheme, Badge, TextField, InputAdornment, Tooltip
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DevicesIcon from '@mui/icons-material/Devices';
import ComputerIcon from '@mui/icons-material/Computer';
import DesktopWindowsIcon from '@mui/icons-material/DesktopWindows';
import PrintIcon from '@mui/icons-material/Print';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import RouterIcon from '@mui/icons-material/Router';
import CableIcon from '@mui/icons-material/Cable';
import ScienceIcon from '@mui/icons-material/Science';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';
import NotificationsIcon from '@mui/icons-material/Notifications';
import LogoutIcon from '@mui/icons-material/Logout';
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
import CategoryManagementIcon from '@mui/icons-material/Category';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import DomainIcon from '@mui/icons-material/Domain';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { useAuth } from '../contexts/AuthContext';
import { useAppTheme } from '../contexts/ThemeContext';
import Breadcrumbs from '../components/Breadcrumbs';
import PageTransition from '../components/PageTransition';
import QRScannerModal from '../components/QRScannerModal';
import { notificationAPI } from '../services/api';

// ── Sidebar width matching ITSM HTML (210px) ───────────────────────────────
const drawerWidth = 220;
const appBarHeight = 50;

interface NavItem {
  label: string;
  path?: string;
  icon?: React.ReactNode;
  roles?: string[];
  isHeader?: boolean;
}

interface NavGroup {
  label: string;
  icon: React.ReactNode;
  children: NavItem[];
  roles?: string[];
}

type NavEntry = NavItem | NavGroup;

// ── Nav data (unchanged) ─────────────────────────────────────────────────
const userNavItems: NavItem[] = [
  { label: 'รายการของพร้อมยืม', path: '/assets?status=Available', icon: <CheckCircleOutlineIcon fontSize="small" /> },
  { label: 'ยืมทรัพย์สิน', path: '/borrow/new', icon: <AddBoxIcon fontSize="small" /> },
  { label: 'คำขอของฉัน', path: '/borrow/my-requests', icon: <ListAltIcon fontSize="small" /> },
  { label: 'รายการที่ยืม', path: '/borrow/my-items', icon: <ShoppingCartIcon fontSize="small" /> },
  { label: 'คำขอขยายวัน', path: '/borrow/my-extensions', icon: <ExtensionIcon fontSize="small" /> },
  { label: 'ประวัติการยืม', path: '/borrow/my-history', icon: <HistoryIcon fontSize="small" /> },
];

const adminNav: NavEntry[] = [
  { label: 'แดชบอร์ด', path: '/dashboard', icon: <DashboardIcon fontSize="small" /> },
  {
    label: 'ทะเบียนทรัพย์สิน',
    icon: <DevicesIcon fontSize="small" />,
    children: [
      { label: 'ทะเบียน IT Asset', path: '/assets', icon: <DevicesIcon fontSize="small" /> },
      { label: 'คอมพิวเตอร์', path: '/assets?typeGroup=computers', icon: <ComputerIcon fontSize="small" /> },
      { label: 'จอภาพ', path: '/assets?typeGroup=monitors', icon: <DesktopWindowsIcon fontSize="small" /> },
      { label: 'เครื่องพิมพ์', path: '/assets?typeGroup=printers', icon: <PrintIcon fontSize="small" /> },
      { label: 'อุปกรณ์เครือข่าย', path: '/assets?typeGroup=network', icon: <RouterIcon fontSize="small" /> },
      { label: 'อุปกรณ์สื่อสาร', path: '/assets?typeGroup=phonesTablets', icon: <PhoneAndroidIcon fontSize="small" /> },
      { label: 'อุปกรณ์ต่อพ่วง', path: '/assets?typeGroup=devices', icon: <DevicesIcon fontSize="small" /> },
      { label: 'Rack & Infrastructure', path: '/assets?typeGroup=rack', icon: <HandymanIcon fontSize="small" /> },
    ],
  },
  {
    label: 'จัดการคลัง',
    icon: <InventoryIcon fontSize="small" />,
    children: [
      { label: 'ภาพรวมคลังสินค้า', path: '/inventory', icon: <InventoryIcon fontSize="small" /> },
      { label: 'สายสัญญาณ', path: '/inventory?category=Cable', icon: <CableIcon fontSize="small" /> },
      { label: 'วัสดุสิ้นเปลือง', path: '/inventory?category=Consumable', icon: <ScienceIcon fontSize="small" /> },
    ],
  },
  {
    label: 'เครื่องมือ',
    icon: <ImportExportIcon fontSize="small" />,
    children: [
      { label: 'นำเข้า/ส่งออก', path: '/assets/import-export', icon: <ImportExportIcon fontSize="small" /> },
      { label: 'พิมพ์ QR สติ๊กเกอร์', path: '/assets/print-qr', icon: <PrintIcon fontSize="small" /> },
      { label: 'บริจาคทรัพย์สิน', path: '/donations', icon: <HandymanIcon fontSize="small" /> },
    ],
  },
  {
    label: 'ยืม-คืน',
    icon: <ShoppingCartIcon fontSize="small" />,
    children: [
      { label: 'รายการของพร้อมยืม', path: '/assets?status=Available', icon: <CheckCircleOutlineIcon fontSize="small" /> },
      { label: 'รออนุมัติ', path: '/borrow/approval-queue', icon: <CheckCircleIcon fontSize="small" /> },
      { label: 'ส่งมอบ (Check-out)', path: '/borrow/checkout', icon: <HandymanIcon fontSize="small" /> },
      { label: 'รับคืน (Return)', path: '/borrow/return', icon: <AssignmentReturnIcon fontSize="small" /> },
      { label: 'ยืมเกินกำหนด (Overdue)', path: '/borrow/overdue', icon: <ErrorIcon fontSize="small" /> },
      { label: 'ประวัติยืมทั้งหมด', path: '/borrow/history', icon: <HistoryIcon fontSize="small" /> },
      { label: 'ขยายวัน (Extension)', path: '/borrow/extensions', icon: <ExtensionIcon fontSize="small" /> },
    ],
  },
  {
    label: 'PM ตรวจนับ',
    icon: <BuildCircleIcon fontSize="small" />,
    children: [
      { label: 'PM Dashboard', path: '/pm', icon: <DashboardIcon fontSize="small" /> },
      { label: 'แผน PM', path: '/pm/plans', icon: <AssignmentIcon fontSize="small" /> },
      { label: 'ทำ PM (Checklist)', path: '/pm/runs', icon: <PlayArrowIcon fontSize="small" /> },
      { label: 'กำหนดการ PM (Gantt)', path: '/pm/schedule', icon: <CalendarTodayIcon fontSize="small" /> },
      { label: 'PM Template', path: '/pm/templates', icon: <DescriptionIcon fontSize="small" /> },
    ],
  },
  {
    label: 'รายงาน',
    icon: <AssessmentIcon fontSize="small" />,
    children: [
      { label: 'รายงานทรัพย์สิน', path: '/reports/assets', icon: <InventoryIcon fontSize="small" /> },
      { label: 'รายงานยืม-คืน', path: '/reports/borrow', icon: <ReceiptLongIcon fontSize="small" /> },
      { label: 'รายงาน PM', path: '/reports/pm', icon: <AssessmentIcon fontSize="small" /> },
      { label: 'รายงานประวัติซ่อมบำรุง', path: '/reports/maintenance', icon: <BuildCircleIcon fontSize="small" /> },
    ],
  },
  {
    label: 'ตั้งค่าระบบ',
    icon: <SettingsIcon fontSize="small" />,
    roles: ['SUPERADMIN', 'IT_ADMIN'],
    children: [
      { label: 'ข้อมูลตั้งต้นทรัพย์สิน', isHeader: true },
      { label: 'ประเภทอุปกรณ์ (Device Types)', path: '/assets/device-types', icon: <CategoryIcon fontSize="small" /> },
      { label: 'สถานที่ตั้ง (Location & Company)', path: '/assets/locations', icon: <LocationOnIcon fontSize="small" /> },
      { label: 'ผู้จำหน่าย (Vendor)', path: '/assets/vendors', icon: <StoreIcon fontSize="small" /> },
      { label: 'สถานะอุปกรณ์ (Asset Status)', path: '/assets/statuses', icon: <CheckCircleOutlineIcon fontSize="small" /> },
      { label: 'จัดการหมวดหมู่ (Categories)', path: '/categories', icon: <CategoryManagementIcon fontSize="small" /> },
      
      { label: 'การตั้งค่า & ความปลอดภัย', isHeader: true, roles: ['SUPERADMIN', 'IT_ADMIN'] },
      { label: 'ตั้งค่าระบบหลัก', path: '/admin/settings', icon: <SettingsIcon fontSize="small" />, roles: ['SUPERADMIN'] },
      { label: 'จัดการผู้ใช้', path: '/admin/users', icon: <PeopleIcon fontSize="small" />, roles: ['SUPERADMIN'] },
      { label: 'จัดการบริษัท', path: '/admin/companies', icon: <DomainIcon fontSize="small" />, roles: ['SUPERADMIN', 'IT_ADMIN'] },
      
      { label: 'ระบบ Log การทำงาน', isHeader: true, roles: ['SUPERADMIN', 'IT_ADMIN'] },
      { label: 'ประวัติแจ้งเตือน', path: '/admin/notification-logs', icon: <NotificationsIcon fontSize="small" />, roles: ['SUPERADMIN'] },
      { label: 'Audit Log', path: '/admin/audit-log', icon: <ReceiptLongIcon fontSize="small" />, roles: ['IT_ADMIN', 'SUPERADMIN'] },
    ],
  },
];

// ── Section label component ──────────────────────────────────────────────
function SidebarSection({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      variant="caption"
      sx={{
        display: 'block',
        px: '20px',
        pt: '14px',
        pb: '4px',
        fontSize: '10px',
        fontWeight: 500,
        color: '#9ca3af',
        textTransform: 'uppercase',
        letterSpacing: '0.07em',
        lineHeight: 1,
      }}
    >
      {children}
    </Typography>
  );
}

export default function Layout() {
  const theme = useTheme();
  const { mode, toggleColorMode } = useAppTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [qrOpen, setQrOpen] = useState(false);
  const [anchorElNotif, setAnchorElNotif] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const { user, logout, systemSettings } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/assets?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const isAdmin = user?.role === 'IT_ADMIN' || user?.role === 'SUPERADMIN';

  const filteredNav = isAdmin
    ? adminNav.filter(entry => {
        if (entry.roles) return entry.roles.includes(user?.role || '');
        return true;
      })
    : userNavItems;

  const isActive = (path: string) =>
    location.pathname === path ||
    (path !== '/' && location.pathname.startsWith(path + '?')) ||
    (path !== '/' && location.pathname.startsWith(path + '/'));

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  useEffect(() => {
    const newOpen: Record<string, boolean> = {};
    if (isAdmin) {
      adminNav.forEach(entry => {
        if ('children' in entry) {
          const anyActive = entry.children.some(child => location.pathname + location.search === child.path);
          if (anyActive) newOpen[entry.label] = true;
        }
      });
    }
    if (Object.keys(newOpen).length > 0) {
      setOpenGroups(prev => ({ ...prev, ...newOpen }));
    }
  }, [location.pathname, location.search]);

  const fetchNotifications = async () => {
    try {
      const res = await notificationAPI.getAll();
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 60000); // Check every minute
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleNotificationClick = async (notif: any) => {
    try {
      if (!notif.isRead) {
        await notificationAPI.markAsRead(notif.id);
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
      }
      setAnchorElNotif(null);
      if (notif.link) {
        navigate(notif.link);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {}
  };

  // ── Section grouping for sidebar visual clarity ─────────────────────
  const getSectionLabel = (label: string): string | null => {
    if (label === 'แดชบอร์ด') return 'ภาพรวม';
    if (label === 'ทะเบียนทรัพย์สิน') return 'จัดการทรัพย์สิน';
    if (label === 'จัดการคลัง') return null;
    if (label === 'เครื่องมือ') return null;
    if (label === 'ยืม-คืน') return 'Service Desk';
    if (label === 'PM ตรวจนับ') return null;
    if (label === 'รายงาน') return 'รายงาน';
    if (label === 'ตั้งค่าระบบ') return 'ผู้ดูแลระบบ';
    return null;
  };

  const renderNav = () => {
    const items: React.ReactNode[] = [];
    let prevSection = '';

    filteredNav.forEach((entry) => {
      const sectionLabel = 'children' in entry
        ? getSectionLabel((entry as NavGroup).label)
        : getSectionLabel((entry as NavItem).label);

      if (sectionLabel && sectionLabel !== prevSection) {
        items.push(<SidebarSection key={`sec-${sectionLabel}`}>{sectionLabel}</SidebarSection>);
        prevSection = sectionLabel;
      }

      if ('children' in entry) {
        const group = entry as NavGroup;
        const isOpen = openGroups[group.label] ?? false;
        items.push(
          <React.Fragment key={group.label}>
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => toggleGroup(group.label)}
                sx={{
                  borderRadius: '7px',
                  mx: '8px',
                  py: '7px',
                  px: '12px',
                  my: '1px',
                  '&:hover': { bgcolor: '#f9fafb' },
                }}
              >
                <ListItemIcon sx={{ minWidth: 30, color: isOpen ? '#f59e0b' : '#6b7280' }}>
                  {group.icon}
                </ListItemIcon>
                <ListItemText
                  primary={group.label}
                  primaryTypographyProps={{
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    color: isOpen ? '#111827' : '#374151',
                  }}
                />
                {isOpen
                  ? <ExpandLess sx={{ fontSize: 16, color: '#9ca3af' }} />
                  : <ExpandMore sx={{ fontSize: 16, color: '#9ca3af' }} />}
              </ListItemButton>
            </ListItem>

            <Collapse in={isOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding sx={{ mb: 0.5 }}>
                {(() => {
                  let headerCount = 0;
                  return group.children
                    .filter((child) => {
                      if (child.roles) return child.roles.includes(user?.role || '');
                      return true;
                    })
                    .map((child, idx) => {
                      if (child.isHeader) {
                        headerCount++;
                        return (
                          <Box key={`header-${child.label}`} sx={{ width: '100%' }}>
                            {headerCount > 1 && (
                              <Divider sx={{ mx: '16px', my: '6px', borderColor: '#f3f4f6' }} />
                            )}
                            <Typography
                              variant="caption"
                              sx={{
                                display: 'block',
                                pl: '24px',
                                pt: '8px',
                                pb: '3px',
                                fontSize: '9px',
                                fontWeight: 700,
                                color: '#9ca3af',
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                                lineHeight: 1,
                              }}
                            >
                              {child.label}
                            </Typography>
                          </Box>
                        );
                      }

                      const active = location.pathname + location.search === child.path;
                      const pathKey = child.path || `item-${child.label}`;
                      return (
                        <ListItem key={pathKey} disablePadding>
                          <ListItemButton
                            selected={active}
                            onClick={() => { navigate(child.path || '/'); setMobileOpen(false); }}
                            sx={{
                              pl: '24px',
                              pr: '12px',
                              py: '6.5px',
                              mx: '8px',
                              my: '1px',
                              borderRadius: '7px',
                              '&.Mui-selected': {
                                bgcolor: theme.palette.mode === 'dark' ? 'rgba(0, 113, 227, 0.15)' : 'rgba(0, 113, 227, 0.08)',
                                color: theme.palette.primary.main,
                                '&:hover': { bgcolor: theme.palette.mode === 'dark' ? 'rgba(0, 113, 227, 0.25)' : 'rgba(0, 113, 227, 0.12)' },
                              },
                              '&:hover': { bgcolor: theme.palette.mode === 'dark' ? '#2d2d2f' : '#f5f5f7' },
                            }}
                          >
                            <ListItemIcon sx={{ minWidth: 24, color: active ? theme.palette.primary.main : theme.palette.text.secondary }}>
                              {child.icon ? React.cloneElement(child.icon as React.ReactElement, { sx: { fontSize: 13 } }) : null}
                            </ListItemIcon>
                            <ListItemText
                              primary={child.label}
                              primaryTypographyProps={{
                                fontSize: '0.76rem',
                                fontWeight: active ? 600 : 400,
                                color: active ? theme.palette.primary.main : theme.palette.text.primary,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            />
                          </ListItemButton>
                        </ListItem>
                      );
                    });
                })()}
              </List>
            </Collapse>
          </React.Fragment>
        );
      } else {
        const item = entry as NavItem;
        const active = isActive(item.path || '');
        items.push(
          <ListItem key={item.path || item.label} disablePadding>
            <ListItemButton
              selected={active}
              onClick={() => { navigate(item.path || ''); setMobileOpen(false); }}
              sx={{
                borderRadius: '7px',
                mx: '8px',
                py: '7px',
                px: '12px',
                my: '1px',
                '&.Mui-selected': {
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(0, 113, 227, 0.15)' : 'rgba(0, 113, 227, 0.08)',
                  color: theme.palette.primary.main,
                  '&:hover': { bgcolor: theme.palette.mode === 'dark' ? 'rgba(0, 113, 227, 0.25)' : 'rgba(0, 113, 227, 0.12)' },
                },
                '&:hover': { bgcolor: theme.palette.mode === 'dark' ? '#2d2d2f' : '#f5f5f7' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 30, color: active ? theme.palette.primary.main : theme.palette.text.secondary }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontSize: '0.8125rem',
                  fontWeight: active ? 600 : 500,
                  color: active ? theme.palette.primary.main : theme.palette.text.primary,
                }}
              />
            </ListItemButton>
          </ListItem>
        );
      }
    });

    return <List disablePadding sx={{ pt: 0.5, pb: 2 }}>{items}</List>;
  };

  // ── Sidebar content ────────────────────────────────────────────────────
  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#ffffff' }}>
      {/* Logo / Brand */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        px: '14px',
        height: `${appBarHeight}px`,
        borderBottom: '0.5px solid #e5e7eb',
        flexShrink: 0,
      }}>
        {systemSettings?.logoUrl ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, overflow: 'hidden', borderRadius: '8px', flexShrink: 0 }}>
            <img src={systemSettings.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </Box>
        ) : (
          <Box sx={{
            width: 34,
            height: 34,
            borderRadius: '8px',
            background: '#f59e0b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 600,
            fontSize: '13px',
            color: '#fff',
            flexShrink: 0,
            letterSpacing: '-0.02em',
          }}>
            {(systemSettings?.systemName || 'IT').substring(0, 2).toUpperCase()}
          </Box>
        )}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography noWrap sx={{ fontSize: '13px', fontWeight: 600, color: '#111827', lineHeight: 1.2 }}>
            {systemSettings?.systemName || 'IT Asset Pro'}
          </Typography>
          <Typography noWrap sx={{ fontSize: '10px', color: '#6b7280', lineHeight: 1 }}>
            {systemSettings?.organizationName || 'ระบบจัดการ IT ครบวงจร'}
          </Typography>
        </Box>
      </Box>

      {/* Nav */}
      <Box sx={{ overflowY: 'auto', flexGrow: 1 }}>
        {renderNav()}
      </Box>

      {/* User block at bottom — like HTML .sb-user */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        px: '14px',
        py: '10px',
        borderTop: '0.5px solid #e5e7eb',
        mt: 'auto',
      }}>
        <Avatar sx={{
          width: 32,
          height: 32,
          background: 'linear-gradient(135deg, #f59e0b, #8b5cf6)',
          fontSize: '11px',
          fontWeight: 500,
          flexShrink: 0,
          border: 'none',
          boxShadow: 'none',
        }}>
          {user?.displayName?.charAt(0) || 'U'}
        </Avatar>
        <Box sx={{ overflow: 'hidden', flex: 1 }}>
          <Typography noWrap sx={{ fontSize: '12px', fontWeight: 500, color: '#111827', lineHeight: 1.3 }}>
            {user?.displayName || user?.adUsername}
          </Typography>
          <Typography sx={{ fontSize: '10px', color: '#f59e0b', lineHeight: 1 }}>
            {user?.role === 'SUPERADMIN' ? 'Super Admin' : user?.role === 'IT_ADMIN' ? 'IT Admin' : 'User'}
          </Typography>
        </Box>
        <IconButton
          size="small"
          onClick={() => { logout(); navigate('/login'); }}
          sx={{ color: '#9ca3af', p: '4px', '&:hover': { color: '#ef4444', bgcolor: '#fef2f2' } }}
          title="ออกจากระบบ"
        >
          <LogoutIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', position: 'relative', bgcolor: '#f5f6fa' }}>
      <CssBaseline />

      {/* ── AppBar / Topbar ──────────────────────────────────────────── */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          zIndex: (t) => t.zIndex.drawer + 1,
          height: `${appBarHeight}px`,
        }}
      >
        <Toolbar
          sx={{
            minHeight: `${appBarHeight}px !important`,
            height: `${appBarHeight}px`,
            px: { xs: 2, md: '20px' },
            gap: '12px',
          }}
        >
          {/* Mobile hamburger */}
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen(!mobileOpen)}
            sx={{ mr: 1, display: { md: 'none' }, color: '#374151' }}
          >
            <MenuIcon sx={{ fontSize: 20 }} />
          </IconButton>

           {/* Page title area */}
           <Box>
             <Typography
               sx={{
                 fontWeight: 600,
                 color: '#111827',
                 fontSize: '15px',
                 lineHeight: 1.2,
               }}
             >
               {systemSettings?.systemName || 'ระบบบริหารทรัพย์สิน IT'}
             </Typography>
           </Box>

           {/* Global Search Bar */}
           <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', px: 2 }}>
             <form onSubmit={handleSearch} style={{ width: '100%', maxWidth: '400px', position: 'relative' }}>
               <TextField
                 fullWidth
                 size="small"
                 variant="outlined"
                 placeholder="ค้นหาทรัพย์สิน..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 sx={{
                   '& .MuiOutlinedInput-root': {
                     borderRadius: '8px',
                     bgcolor: alpha('#ffffff', 0.8),
                     backdropFilter: 'blur(4px)',
                     '& fieldset': { borderColor: '#e5e7eb' },
                     '&:hover fieldset': { borderColor: '#d1d5db' },
                   },
                 }}
                 InputProps={{
                   startAdornment: (
                     <InputAdornment position="start">
                       <SearchIcon sx={{ color: '#9ca3af', fontSize: 20 }} />
                     </InputAdornment>
                   ),
                 }}
               />
             </form>
           </Box>

           {/* Right side: notification + user */}
           <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

            {/* QR Scanner Button (Mobile Friendly) */}
            <IconButton
              size="small"
              onClick={() => setQrOpen(true)}
              sx={{
                width: 32,
                height: 32,
                borderRadius: '7px',
                border: '0.5px solid #e5e7eb',
                color: '#6b7280',
                display: { xs: 'flex', md: 'flex' }, // Show on all sizes or just mobile
                '&:hover': { bgcolor: '#f9fafb', color: '#2563eb', borderColor: '#bfdbfe' },
              }}
            >
              <QrCodeScannerIcon sx={{ fontSize: 18 }} />
            </IconButton>

            {/* Dark Mode Toggle */}
            <Tooltip title={mode === 'dark' ? 'โหมดสว่าง' : 'โหมดมืด'}>
              <IconButton
                size="small"
                onClick={toggleColorMode}
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '7px',
                  border: '0.5px solid #e5e7eb',
                  color: '#6b7280',
                  '&:hover': { bgcolor: '#f9fafb', color: '#f59e0b', borderColor: '#fde68a' },
                }}
              >
                {mode === 'dark' ? <LightModeIcon sx={{ fontSize: 18 }} /> : <DarkModeIcon sx={{ fontSize: 18 }} />}
              </IconButton>
            </Tooltip>

            {/* Notification bell */}
            <IconButton
              size="small"
              onClick={(e) => setAnchorElNotif(e.currentTarget)}
              sx={{
                width: 32,
                height: 32,
                borderRadius: '7px',
                border: '0.5px solid #e5e7eb',
                color: '#6b7280',
                '&:hover': { bgcolor: '#f9fafb' },
              }}
            >
              <Badge badgeContent={notifications.filter(n => !n.isRead).length} color="error" sx={{ '& .MuiBadge-badge': { fontSize: '10px', height: 16, minWidth: 16 } }}>
                <NotificationsIcon sx={{ fontSize: 16 }} />
              </Badge>
            </IconButton>

            {/* Notification Menu */}
            <Menu
              anchorEl={anchorElNotif}
              open={Boolean(anchorElNotif)}
              onClose={() => setAnchorElNotif(null)}
              PaperProps={{
                elevation: 3,
                sx: { 
                  width: 350, 
                  maxHeight: 450,
                  mt: 1, 
                  borderRadius: '12px',
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                }
              }}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6' }}>
                <Typography variant="subtitle1" fontWeight={700}>การแจ้งเตือน</Typography>
                {notifications.some(n => !n.isRead) && (
                  <Button size="small" onClick={handleMarkAllRead} sx={{ fontSize: '0.75rem' }}>
                    อ่านทั้งหมด
                  </Button>
                )}
              </Box>
              <List sx={{ p: 0 }}>
                {notifications.length === 0 ? (
                  <ListItem>
                    <ListItemText primary="ไม่มีการแจ้งเตือน" sx={{ textAlign: 'center', color: 'text.secondary', py: 3 }} />
                  </ListItem>
                ) : (
                  notifications.map(notif => (
                    <ListItemButton 
                      key={notif.id} 
                      onClick={() => handleNotificationClick(notif)}
                      sx={{ 
                        borderBottom: '1px solid #f3f4f6',
                        bgcolor: notif.isRead ? 'transparent' : '#f0f9ff',
                        '&:hover': { bgcolor: '#f9fafb' }
                      }}
                    >
                      <ListItemText 
                        primary={notif.title}
                        secondary={
                          <React.Fragment>
                            <Typography variant="caption" sx={{ display: 'block', whiteSpace: 'pre-line', mb: 0.5 }}>
                              {notif.message}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(notif.createdAt).toLocaleString('th-TH')}
                            </Typography>
                          </React.Fragment>
                        }
                        primaryTypographyProps={{ 
                          variant: 'subtitle2', 
                          fontWeight: notif.isRead ? 500 : 700,
                          color: notif.isRead ? 'text.primary' : '#0369a1'
                        }}
                      />
                    </ListItemButton>
                  ))
                )}
              </List>
            </Menu>

            {/* User button */}
            <Button
              variant="text"
              onClick={(e) => setAnchorEl(e.currentTarget)}
              startIcon={
                <Avatar
                  src={user?.avatarUrl || undefined}
                  sx={{
                    width: 22,
                    height: 22,
                    fontSize: '10px',
                    bgcolor: '#4f46e5',
                    color: '#fff',
                    fontWeight: 500,
                    border: 'none',
                    boxShadow: 'none',
                  }}
                >
                  {!user?.avatarUrl && (user?.displayName?.charAt(0) || 'U')}
                </Avatar>
              }
              sx={{
                borderRadius: '7px',
                px: '10px',
                py: '5px',
                height: 32,
                color: '#111827',
                fontSize: '12px',
                fontWeight: 500,
                border: '0.5px solid #e5e7eb',
                bgcolor: '#ffffff',
                '&:hover': { bgcolor: '#f9fafb' },
                '& .MuiButton-startIcon': { mr: '6px' },
              }}
            >
              {user?.displayName || user?.adUsername}
            </Button>

            {/* User dropdown */}
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              PaperProps={{
                sx: {
                  mt: '4px',
                  minWidth: 200,
                  borderRadius: '8px',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.1)',
                  border: '0.5px solid #e5e7eb',
                  p: '4px',
                },
              }}
            >
              <Box sx={{ px: '12px', py: '10px', borderBottom: '0.5px solid #f3f4f6', mb: '4px' }}>
                <Typography sx={{ fontWeight: 600, fontSize: '13px', color: '#111827', lineHeight: 1.3 }}>
                  {user?.displayName}
                </Typography>
                <Typography sx={{ fontSize: '11px', color: '#6b7280', mt: '2px' }}>
                  {user?.role === 'SUPERADMIN' ? 'ผู้ดูแลระบบสูงสุด' : user?.role === 'IT_ADMIN' ? 'IT Admin' : 'ผู้ใช้'}
                </Typography>
              </Box>
              <MenuItem
                onClick={() => { setAnchorEl(null); logout(); navigate('/login'); }}
                sx={{ color: '#ef4444', borderRadius: '6px', fontSize: '13px', fontWeight: 500 }}
              >
                <LogoutIcon sx={{ mr: 1.5, fontSize: 16 }} />
                {/* ออกจากระบบ */}
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* ── Sidebar nav box ──────────────────────────────────────────── */}
      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>

        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: '20px' },
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: `${appBarHeight}px`,
          position: 'relative',
          minHeight: `calc(100vh - ${appBarHeight}px)`,
          bgcolor: '#f5f6fa',
        }}
      >
        <Breadcrumbs />
        <PageTransition>
          <Outlet />
        </PageTransition>
      </Box>

      {/* QR Scanner Modal */}
      <QRScannerModal open={qrOpen} onClose={() => setQrOpen(false)} />
    </Box>
  );
}
