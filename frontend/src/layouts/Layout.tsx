import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar, Box, CssBaseline, Drawer, IconButton, List, ListItem, ListItemButton,
  ListItemIcon, ListItemText, Toolbar, Typography, Button, Avatar, Menu, MenuItem,
  Divider, Collapse, alpha, useTheme
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
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
import { useAuth } from '../contexts/AuthContext';
import Breadcrumbs from '../components/Breadcrumbs';
import PageTransition from '../components/PageTransition';

const drawerWidth = 280;

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

const userNavItems: NavItem[] = [
  { label: 'รายการของพร้อมยืม', path: '/assets?status=Available', icon: <CheckCircleOutlineIcon /> },
  { label: 'ยืมทรัพย์สิน', path: '/borrow/new', icon: <AddBoxIcon /> },
  { label: 'คำขอของฉัน', path: '/borrow/my-requests', icon: <ListAltIcon /> },
  { label: 'รายการที่ยืม', path: '/borrow/my-items', icon: <ShoppingCartIcon /> },
  { label: 'คำขอขยายวัน', path: '/borrow/my-extensions', icon: <ExtensionIcon /> },
  { label: 'ประวัติการยืม', path: '/borrow/my-history', icon: <HistoryIcon /> },
];

const adminNav: NavEntry[] = [
  { label: 'แดชบอร์ด', path: '/dashboard', icon: <DashboardIcon /> },
  {
    label: 'ทรัพย์สิน',
    icon: <DevicesIcon />,
    children: [
      { label: 'ทะเบียน IT Asset', path: '/assets', icon: <DevicesIcon /> },
      { label: 'Computers / Desktop PC', path: '/assets?typeGroup=computers', icon: <ComputerIcon /> },
      { label: 'Monitors', path: '/assets?typeGroup=monitors', icon: <DesktopWindowsIcon /> },
      { label: 'Devices', path: '/assets?typeGroup=devices', icon: <DevicesIcon /> },
      { label: 'Printers', path: '/assets?typeGroup=printers', icon: <PrintIcon /> },
      { label: 'Phones / Tablets', path: '/assets?typeGroup=phonesTablets', icon: <PhoneAndroidIcon /> },
      { label: 'Cables', path: '/inventory?category=Cable', icon: <CableIcon /> },
      { label: 'Network devices', path: '/assets?typeGroup=network', icon: <RouterIcon /> },
      { label: 'Consumables', path: '/inventory?category=Consumable', icon: <ScienceIcon /> },
      { label: 'ประเภทอุปกรณ์ (Device Types)', path: '/assets/device-types', icon: <CategoryIcon /> },
      { label: 'สถานที่ตั้ง/ไซต์ (Location & Company)', path: '/assets/locations', icon: <LocationOnIcon /> },
      { label: 'ผู้จำหน่าย (Vendor)', path: '/assets/vendors', icon: <StoreIcon /> },
      { label: 'สถานะอุปกรณ์ (Asset Status)', path: '/assets/statuses', icon: <CheckCircleOutlineIcon /> },
      { label: 'นำเข้า/ส่งออก (Import/Export)', path: '/assets/import-export', icon: <ImportExportIcon /> },
      { label: 'Inventory', path: '/inventory', icon: <InventoryIcon /> },
      { label: 'จัดการหมวดหมู่ (Categories)', path: '/categories', icon: <CategoryManagementIcon /> },
    ],
  },
  {
    label: 'ยืม-คืน',
    icon: <ShoppingCartIcon />,
    children: [
      { label: 'รายการของพร้อมยืม', path: '/assets?status=Available', icon: <CheckCircleOutlineIcon /> },
      { label: 'รออนุมัติ', path: '/borrow/approval-queue', icon: <CheckCircleIcon /> },
      { label: 'ส่งมอบ (Check-out)', path: '/borrow/checkout', icon: <HandymanIcon /> },
      { label: 'รับคืน (Return)', path: '/borrow/return', icon: <AssignmentReturnIcon /> },
      { label: 'ยืมเกินกำหนด (Overdue)', path: '/borrow/overdue', icon: <ErrorIcon /> },
      { label: 'ประวัติยืมทั้งหมด', path: '/borrow/history', icon: <HistoryIcon /> },
      { label: 'ขยายวัน (Extension)', path: '/borrow/extensions', icon: <ExtensionIcon /> },
    ],
  },
  {
    label: 'PM ตรวจนับ',
    icon: <BuildCircleIcon />,
    children: [
      { label: 'PM Dashboard', path: '/pm', icon: <DashboardIcon /> },
      { label: 'PM Plans', path: '/pm/plans', icon: <AssignmentIcon /> },
      { label: 'PM Runs', path: '/pm/runs', icon: <PlayArrowIcon /> },
      { label: 'PM Template', path: '/pm/templates', icon: <DescriptionIcon /> },
    ],
  },
  {
    label: 'รายงาน',
    icon: <AssessmentIcon />,
    children: [
      { label: 'รายงานทรัพย์สิน', path: '/reports/assets', icon: <InventoryIcon /> },
      { label: 'รายงานยืม-คืน', path: '/reports/borrow', icon: <ReceiptLongIcon /> },
      { label: 'รายงาน PM', path: '/reports/pm', icon: <AssessmentIcon /> },
    ],
  },
  { label: 'จัดการผู้ใช้', path: '/admin/users', icon: <PeopleIcon />, roles: ['SUPERADMIN'] },
  { label: 'ตั้งค่า', path: '/admin/settings', icon: <SettingsIcon />, roles: ['SUPERADMIN'] },
  {
    label: 'ประวัติ',
    icon: <HistoryIcon />,
    children: [
      { label: 'ประวัติแจ้งเตือน (Notification Log)', path: '/admin/notification-logs', icon: <NotificationsIcon /> },
      { label: 'Audit Log', path: '/admin/audit-log', icon: <ReceiptLongIcon /> },
    ],
  },
];

export default function Layout() {
  const theme = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = user?.role === 'IT_ADMIN' || user?.role === 'SUPERADMIN';

  const filteredNav = isAdmin
    ? adminNav.filter(entry => {
        if (entry.roles) return entry.roles.includes(user?.role || '');
        return true;
      })
    : userNavItems;

  const isActive = (path: string) =>
    location.pathname === path || (path !== '/' && location.pathname.startsWith(path + '?')) || (path !== '/' && location.pathname.startsWith(path + '/'));

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

  const renderNav = () => (
    <List sx={{ px: 1.5 }}>
      {filteredNav.map((entry) => {
        if ('children' in entry) {
          const group = entry as NavGroup;
          const isOpen = openGroups[group.label] ?? false;
          return (
            <React.Fragment key={group.label}>
              <ListItem disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton 
                  onClick={() => toggleGroup(group.label)}
                  sx={{ 
                    borderRadius: 3,
                    py: 1.2,
                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.05) }
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40, color: isOpen ? theme.palette.primary.main : 'inherit' }}>{group.icon}</ListItemIcon>
                  <ListItemText primary={group.label} primaryTypographyProps={{ fontWeight: 600, fontSize: '0.9rem' }} />
                  {isOpen ? <ExpandLess sx={{ fontSize: 20 }} /> : <ExpandMore sx={{ fontSize: 20 }} />}
                </ListItemButton>
              </ListItem>
              <Collapse in={isOpen} timeout="auto" unmountOnExit>
                <List component="div" disablePadding sx={{ mb: 1 }}>
                  {group.children.map((child) => {
                    const active = location.pathname + location.search === child.path;
                    return (
                      <ListItem key={child.path} disablePadding sx={{ mb: 0.2 }}>
                        <ListItemButton
                          selected={active}
                          onClick={() => { navigate(child.path); setMobileOpen(false); }}
                          sx={{ 
                            pl: 5, 
                            borderRadius: 2.5,
                            py: 1,
                            '&.Mui-selected': {
                              bgcolor: alpha(theme.palette.primary.main, 0.08),
                              color: theme.palette.primary.main,
                              '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.12) }
                            }
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 36, color: active ? 'inherit' : alpha(theme.palette.text.primary, 0.5) }}>
                             {React.cloneElement(child.icon as React.ReactElement, { size: 18 })}
                          </ListItemIcon>
                          <ListItemText primary={child.label} primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: active ? 700 : 500 }} />
                        </ListItemButton>
                      </ListItem>
                    );
                  })}
                </List>
              </Collapse>
            </React.Fragment>
          );
        }
        const item = entry as NavItem;
        const active = location.pathname + location.search === item.path;
        return (
          <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              selected={active}
              onClick={() => { navigate(item.path); setMobileOpen(false); }}
              sx={{ 
                borderRadius: 3,
                py: 1.2,
                '&.Mui-selected': {
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: theme.palette.primary.main,
                  '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.15) }
                }
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: active ? 'inherit' : 'inherit' }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: active ? 700 : 600, fontSize: '0.9rem' }} />
            </ListItemButton>
          </ListItem>
        );
      })}
    </List>
  );

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar sx={{ 
        mb: 2,
        minHeight: '72px !important',
        borderBottom: '1px solid #E2E8F0',
        gap: 1.5,
        px: 2.5
      }}>
        <Box sx={{
          width: 40, height: 40, borderRadius: 2,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #FF6B00 0%, #FF8C00 100%)',
          boxShadow: '0 4px 12px rgba(255,107,0,0.3)',
          color: '#fff',
          fontSize: 18,
          flexShrink: 0,
        }}>
          <img src="/vite.svg" alt="logo" style={{ width: 22, height: 22, filter: 'brightness(0) invert(1)' }} />
        </Box>
        <Box>
          <Typography variant="body1" noWrap sx={{ fontWeight: 800, lineHeight: 1.2, color: '#0F172A', fontSize: '0.95rem' }}>
            IT Asset
          </Typography>
          <Typography variant="caption" noWrap sx={{ color: '#64748B', fontSize: '0.7rem', lineHeight: 1, fontWeight: 500 }}>
            TRR Group
          </Typography>
        </Box>
      </Toolbar>
      <Box sx={{ overflowY: 'auto', flexGrow: 1, pb: 2 }}>
        {renderNav()}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
      <CssBaseline />

      <AppBar position="fixed" sx={{ 
        width: { md: `calc(100% - ${drawerWidth}px)` }, 
        ml: { md: `${drawerWidth}px` },
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}>
        <Toolbar sx={{ minHeight: '72px !important', px: 3 }}>
          <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(!mobileOpen)} sx={{ mr: 2, display: { md: 'none' } }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap sx={{ flexGrow: 1, fontWeight: 700, color: theme.palette.text.primary, letterSpacing: '-0.01em', fontSize: '1.1rem' }}>
            ระบบบริหารทรัพย์สิน IT
          </Typography>
          <Button 
            variant="text"
            onClick={(e) => setAnchorEl(e.currentTarget)} 
            startIcon={<Avatar sx={{ width: 36, height: 36, bgcolor: 'linear-gradient(135deg, #FF6B00, #FF8C00)', fontWeight: 800, fontSize: '0.95rem', border: `2px solid ${alpha('#fff', 0.9)}`, background: 'linear-gradient(135deg, #FF6B00, #FF8C00)' }}>{user?.displayName?.charAt(0) || 'U'}</Avatar>}
            sx={{ 
              borderRadius: 4,
              px: 2,
              py: 0.8,
              color: theme.palette.text.primary,
              '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.06) }
            }}
          >
            {user?.displayName || user?.adUsername}
          </Button>
          <Menu 
            anchorEl={anchorEl} 
            open={Boolean(anchorEl)} 
            onClose={() => setAnchorEl(null)}
            PaperProps={{
              sx: { 
                mt: 1.5,
                minWidth: 220,
                borderRadius: 5,
                boxShadow: '0 20px 50px rgba(0,0,0,0.12)',
                border: '1px solid #E5E7EB',
                p: 1
              }
            }}
          >
            <Box sx={{ px: 2, py: 2 }}>
               <Typography variant="subtitle1" fontWeight={900} sx={{ lineHeight: 1.2 }}>{user?.displayName}</Typography>
               <Typography variant="caption" color="text.secondary" fontWeight={600}>{user?.role === 'SUPERADMIN' ? 'ผู้ดูแลระบบสูงสุด' : user?.role === 'IT_ADMIN' ? 'IT Admin' : 'ผู้ใช้'}</Typography>
            </Box>
            <Divider sx={{ my: 1, opacity: 0.4 }} />
            <MenuItem onClick={() => { setAnchorEl(null); logout(); navigate('/login'); }} sx={{ borderRadius: 3, py: 1.5, color: theme.palette.error.main, fontWeight: 700 }}>
              <LogoutIcon sx={{ mr: 1.5, fontSize: 20 }} /> ออกจากระบบ
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth } }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth } }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box component="main" sx={{
        flexGrow: 1, 
        p: { xs: 2, md: 5 }, 
        width: { md: `calc(100% - ${drawerWidth}px)` }, 
        mt: '70px',
        position: 'relative',
        minHeight: 'calc(100vh - 70px)'
      }}>
        <Breadcrumbs />
        <PageTransition>
          <Outlet />
        </PageTransition>
      </Box>
    </Box>
  );
}
