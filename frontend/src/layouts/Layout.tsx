import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar, Box, CssBaseline, Drawer, IconButton, List, ListItem, ListItemButton,
  ListItemIcon, ListItemText, Toolbar, Typography, Button, Avatar, Menu, MenuItem,
  Divider, Collapse, alpha, useTheme, Badge, TextField, InputAdornment
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
import { useAuth } from '../contexts/AuthContext';
import Breadcrumbs from '../components/Breadcrumbs';
import PageTransition from '../components/PageTransition';

// ── Sidebar width matching ITSM HTML (210px) ───────────────────────────────
const drawerWidth = 220;
const appBarHeight = 50;

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles?: string[];
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
    label: 'ทรัพย์สิน',
    icon: <DevicesIcon fontSize="small" />,
    children: [
      { label: 'ทะเบียน IT Asset', path: '/assets', icon: <DevicesIcon fontSize="small" /> },
      { label: 'คอมพิวเตอร์', path: '/assets?typeGroup=computers', icon: <ComputerIcon fontSize="small" /> },
      { label: 'จอภาพ', path: '/assets?typeGroup=monitors', icon: <DesktopWindowsIcon fontSize="small" /> },
      { label: 'เครื่องพิมพ์', path: '/assets?typeGroup=printers', icon: <PrintIcon fontSize="small" /> },
      { label: 'อุปกรณ์เครือข่าย', path: '/assets?typeGroup=network', icon: <RouterIcon fontSize="small" /> },
      { label: 'อุปกรณ์สื่อสาร', path: '/assets?typeGroup=phonesTablets', icon: <PhoneAndroidIcon fontSize="small" /> },
      { label: 'อุปกรณ์นำเสนอ/AV', path: '/assets?typeGroup=devices', icon: <DevicesIcon fontSize="small" /> },
      { label: 'Rack & Infrastructure', path: '/assets?typeGroup=devices', icon: <HandymanIcon fontSize="small" /> },
      { label: 'สายสัญญาณ', path: '/inventory?category=Cable', icon: <CableIcon fontSize="small" /> },
      { label: 'วัสดุสิ้นเปลือง', path: '/inventory?category=Consumable', icon: <ScienceIcon fontSize="small" /> },
      { label: 'ประเภทอุปกรณ์ (Device Types)', path: '/assets/device-types', icon: <CategoryIcon fontSize="small" /> },
      { label: 'สถานที่ตั้ง/ไซต์ (Location & Company)', path: '/assets/locations', icon: <LocationOnIcon fontSize="small" /> },
      { label: 'ผู้จำหน่าย (Vendor)', path: '/assets/vendors', icon: <StoreIcon fontSize="small" /> },
      { label: 'สถานะอุปกรณ์ (Asset Status)', path: '/assets/statuses', icon: <CheckCircleOutlineIcon fontSize="small" /> },
      { label: 'นำเข้า/ส่งออก (Import/Export)', path: '/assets/import-export', icon: <ImportExportIcon fontSize="small" /> },
      { label: 'พิมพ์ QR สติ๊กเกอร์', path: '/assets/print-qr', icon: <PrintIcon fontSize="small" /> },
      { label: 'Inventory', path: '/inventory', icon: <InventoryIcon fontSize="small" /> },
      { label: 'จัดการหมวดหมู่ (Categories)', path: '/categories', icon: <CategoryManagementIcon fontSize="small" /> },
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
    ],
  },
  { label: 'จัดการผู้ใช้', path: '/admin/users', icon: <PeopleIcon fontSize="small" />, roles: ['SUPERADMIN'] },
  { label: 'ตั้งค่า', path: '/admin/settings', icon: <SettingsIcon fontSize="small" />, roles: ['SUPERADMIN'] },
  {
    label: 'ประวัติ',
    icon: <HistoryIcon fontSize="small" />,
    children: [
      { label: 'ประวัติแจ้งเตือน (Notification Log)', path: '/admin/notification-logs', icon: <NotificationsIcon fontSize="small" /> },
      { label: 'Audit Log', path: '/admin/audit-log', icon: <ReceiptLongIcon fontSize="small" /> },
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
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

  // ── Section grouping for sidebar visual clarity ─────────────────────
  const getSectionLabel = (label: string): string | null => {
    if (label === 'แดชบอร์ด') return 'ภาพรวม';
    if (label === 'ทรัพย์สิน') return 'จัดการทรัพย์สิน';
    if (label === 'ยืม-คืน') return 'Service Desk';
    if (label === 'PM ตรวจนับ') return null;
    if (label === 'รายงาน') return 'รายงาน';
    if (label === 'จัดการผู้ใช้') return 'ผู้ดูแลระบบ';
    if (label === 'ตั้งค่า') return null;
    if (label === 'ประวัติ') return null;
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
                {group.children.map((child) => {
                  const active = location.pathname + location.search === child.path;
                  return (
                    <ListItem key={child.path} disablePadding>
                      <ListItemButton
                        selected={active}
                        onClick={() => { navigate(child.path); setMobileOpen(false); }}
                        sx={{
                          pl: '44px',
                          pr: '12px',
                          py: '6px',
                          mx: '8px',
                          my: '1px',
                          borderRadius: '7px',
                          '&.Mui-selected': {
                            bgcolor: '#fef3c7',
                            color: '#b45309',
                            '&:hover': { bgcolor: '#fde68a' },
                          },
                          '&:hover': { bgcolor: '#f9fafb' },
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 26, color: active ? '#b45309' : '#9ca3af' }}>
                          {React.cloneElement(child.icon as React.ReactElement, { sx: { fontSize: 14 } })}
                        </ListItemIcon>
                        <ListItemText
                          primary={child.label}
                          primaryTypographyProps={{
                            fontSize: '0.78rem',
                            fontWeight: active ? 600 : 400,
                            color: active ? '#b45309' : '#4b5563',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        />
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              </List>
            </Collapse>
          </React.Fragment>
        );
      } else {
        const item = entry as NavItem;
        const active = isActive(item.path);
        items.push(
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              selected={active}
              onClick={() => { navigate(item.path); setMobileOpen(false); }}
              sx={{
                borderRadius: '7px',
                mx: '8px',
                py: '7px',
                px: '12px',
                my: '1px',
                '&.Mui-selected': {
                  bgcolor: '#fef3c7',
                  color: '#b45309',
                  '&:hover': { bgcolor: '#fde68a' },
                },
                '&:hover': { bgcolor: '#f9fafb' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 30, color: active ? '#b45309' : '#6b7280' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontSize: '0.8125rem',
                  fontWeight: active ? 600 : 500,
                  color: active ? '#b45309' : '#374151',
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

            {/* Notification bell */}
            <IconButton
              size="small"
              sx={{
                width: 32,
                height: 32,
                borderRadius: '7px',
                border: '0.5px solid #e5e7eb',
                color: '#6b7280',
                '&:hover': { bgcolor: '#f9fafb' },
              }}
            >
              <NotificationsIcon sx={{ fontSize: 16 }} />
            </IconButton>

            {/* User button */}
            <Button
              variant="text"
              onClick={(e) => setAnchorEl(e.currentTarget)}
              startIcon={
                <Avatar
                  sx={{
                    width: 28,
                    height: 28,
                    background: 'linear-gradient(135deg, #f59e0b, #8b5cf6)',
                    fontSize: '11px',
                    fontWeight: 500,
                    border: 'none',
                    boxShadow: 'none',
                  }}
                >
                  {user?.displayName?.charAt(0) || 'U'}
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
    </Box>
  );
}
