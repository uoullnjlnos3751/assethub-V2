import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar, Box, Drawer, IconButton, List, ListItem, ListItemButton,
  ListItemIcon, ListItemText, Toolbar, Typography, Button, Avatar, Menu, MenuItem,
  Divider, Collapse, alpha, useTheme, Badge, TextField, InputAdornment, Tooltip,
  useMediaQuery, BottomNavigation, BottomNavigationAction, Paper, Popper, ClickAwayListener,
  CircularProgress
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DevicesIcon from '@mui/icons-material/Devices';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import NotificationsIcon from '@mui/icons-material/Notifications';
import LogoutIcon from '@mui/icons-material/Logout';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { useAuth } from '../contexts/AuthContext';
import { useAppTheme } from '../contexts/ThemeContext';
import Breadcrumbs from '../components/Breadcrumbs';
import PageTransition from '../components/PageTransition';
import QRScannerModal from '../components/QRScannerModal';
import { notificationAPI, assetAPI } from '../services/api';
import { adminNav, NavGroup, NavItem, userNavItems } from '../navigation/nav';

// ── Sidebar width matching ITSM HTML (210px) ───────────────────────────────
const drawerWidth = 220;
const mobileDrawerWidth = 240;
const appBarHeight = 50;

// ── Section label component ──────────────────────────────────────────────
function SidebarSection({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
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
        color: theme.palette.text.secondary,
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
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { mode, toggleColorMode } = useAppTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchAnchorRef = useRef<HTMLFormElement>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [anchorElNotif, setAnchorElNotif] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const { user, logout, systemSettings } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchOpen(false);
      navigate(`/assets?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const goToSuggestion = (assetId: number) => {
    setSearchOpen(false);
    setSearchQuery('');
    navigate(`/assets/${assetId}`);
  };

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchSuggestions([]);
      setSearchOpen(false);
      return;
    }
    setSearchLoading(true);
    const timer = setTimeout(() => {
      assetAPI.list({ search: q, limit: 8 })
        .then(res => {
          setSearchSuggestions(res.data?.data || []);
          setSearchOpen(true);
        })
        .catch(() => setSearchSuggestions([]))
        .finally(() => setSearchLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const isAdmin = user?.role === 'IT_ADMIN' || user?.role === 'SUPERADMIN';
  const isViewer = user?.role === 'VIEWER';

  // VIEWER = read-only executive access: dashboard, license/contract, reports only
  const viewerVisiblePaths = new Set(['/dashboard', '/contracts', '/licenses']);
  const viewerVisibleLabels = new Set(['License & สัญญา', 'รายงานระบบ']);

  const filteredNav = isAdmin
    ? adminNav.filter(entry => {
        if (entry.roles) return entry.roles.includes(user?.role || '');
        return true;
      })
    : isViewer
    ? adminNav.filter(entry => viewerVisiblePaths.has(('path' in entry && entry.path) || '') || viewerVisibleLabels.has(entry.label))
    : userNavItems;

  const isActive = (path: string) => {
    if (!path) return false;
    if (path.includes('?')) return location.pathname + location.search === path;
    if (path === '/pm') return location.pathname === '/pm';
    return location.pathname === path || (path !== '/' && location.pathname.startsWith(path + '/'));
  };

  useEffect(() => {
    const title = systemSettings?.systemName || 'IT Asset Management (ITAM) - ระบบบริหารทรัพย์สิน IT';
    document.title = title;
  }, [systemSettings?.systemName]);

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  useEffect(() => {
    const newOpen: Record<string, boolean> = {};
    if (isAdmin) {
      adminNav.forEach(entry => {
        if ('children' in entry) {
          const anyActive = entry.children.some(child => child.path ? isActive(child.path) : false);
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

  const renderNav = () => {
    const items: React.ReactNode[] = [];
    let prevSection = '';

    filteredNav.forEach((entry) => {
      // Section headings are data-driven from nav.tsx (entry.section field)
      const sectionLabel = entry.section ?? null;
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
                  '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.04) },
                }}
              >
                <ListItemIcon sx={{ minWidth: 30, color: isOpen ? theme.palette.warning.main : theme.palette.text.secondary }}>
                  {group.icon}
                </ListItemIcon>
                <ListItemText
                  primary={group.label}
                  primaryTypographyProps={{
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    color: theme.palette.text.primary,
                  }}
                />
                {isOpen
                  ? <ExpandLess sx={{ fontSize: 16, color: theme.palette.text.secondary }} />
                  : <ExpandMore sx={{ fontSize: 16, color: theme.palette.text.secondary }} />}
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
                    .map((child) => {
                      if (child.isHeader) {
                        headerCount++;
                        return (
                          <Box key={`header-${child.label}`} sx={{ width: '100%' }}>
                            {headerCount > 1 && (
                              <Divider sx={{ mx: '16px', my: '6px', borderColor: theme.palette.divider }} />
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
                                color: theme.palette.text.secondary,
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

                      const active = child.path ? isActive(child.path) : false;
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
                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                color: theme.palette.primary.main,
                                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.15) },
                              },
                              '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.04) },
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
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: theme.palette.primary.main,
                  '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.15) },
                },
                '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.04) },
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
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: theme.palette.background.paper }}>
      {/* Logo / Brand */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        px: '14px',
        height: `${appBarHeight}px`,
        borderBottom: `0.5px solid ${theme.palette.divider}`,
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
            background: theme.palette.warning.main,
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
          <Typography noWrap sx={{ fontSize: '13px', fontWeight: 600, color: theme.palette.text.primary, lineHeight: 1.2 }}>
            ITAM
          </Typography>
          <Typography noWrap sx={{ fontSize: '10px', color: theme.palette.text.secondary, lineHeight: 1 }}>
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
        borderTop: `0.5px solid ${theme.palette.divider}`,
        mt: 'auto',
      }}>
        <Avatar sx={{
          width: 32,
          height: 32,
          background: `linear-gradient(135deg, ${theme.palette.warning.main}, ${theme.palette.primary.main})`,
          fontSize: '11px',
          fontWeight: 500,
          flexShrink: 0,
          border: 'none',
          boxShadow: 'none',
        }}>
          {user?.displayName?.charAt(0) || 'U'}
        </Avatar>
        <Box sx={{ overflow: 'hidden', flex: 1 }}>
          <Typography noWrap sx={{ fontSize: '12px', fontWeight: 500, color: theme.palette.text.primary, lineHeight: 1.3 }}>
            {user?.displayName || user?.adUsername}
          </Typography>
          <Typography sx={{ fontSize: '10px', color: theme.palette.warning.main, lineHeight: 1 }}>
            {user?.role === 'SUPERADMIN' ? 'Super Admin' : user?.role === 'IT_ADMIN' ? 'IT Admin' : 'User'}
          </Typography>
        </Box>
        <IconButton
          size="small"
          onClick={() => { logout(); navigate('/login'); }}
          sx={{ color: theme.palette.text.secondary, p: '4px', '&:hover': { color: theme.palette.error.main, bgcolor: alpha(theme.palette.error.main, 0.08) } }}
          title="ออกจากระบบ"
        >
          <LogoutIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', position: 'relative', bgcolor: theme.palette.background.default }}>

      {/* ── AppBar / Topbar ──────────────────────────────────────────── */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          zIndex: (t) => t.zIndex.drawer + 1,
          height: `${appBarHeight}px`,
          backgroundColor: alpha(theme.palette.background.paper, 0.85),
          backdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${theme.palette.divider}`,
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
            sx={{ mr: 1, display: { md: 'none' }, color: theme.palette.text.secondary }}
          >
            <MenuIcon sx={{ fontSize: 20 }} />
          </IconButton>

           {/* Page title area */}
           <Box>
             <Typography
               sx={{
                 fontWeight: 600,
                 color: theme.palette.text.primary,
                 fontSize: '15px',
                 lineHeight: 1.2,
               }}
             >
               ITAM
             </Typography>
           </Box>

           {/* Global Search Bar */}
           <Box sx={{ flex: 1, display: { xs: 'none', sm: 'flex' }, justifyContent: 'center', px: 2 }}>
            <ClickAwayListener onClickAway={() => setSearchOpen(false)}>
             <form ref={searchAnchorRef} onSubmit={handleSearch} style={{ width: '100%', maxWidth: '400px', position: 'relative' }}>
               <TextField
                 fullWidth
                 size="small"
                 variant="outlined"
                 placeholder="ค้นหาทรัพย์สิน (ชื่อ/รหัส/SN/ผู้ถือครอง)..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 onFocus={() => { if (searchSuggestions.length > 0) setSearchOpen(true); }}
                 autoComplete="off"
                 sx={{
                   '& .MuiOutlinedInput-root': {
                     borderRadius: '8px',
                     bgcolor: alpha(theme.palette.background.paper, 0.8),
                     backdropFilter: 'blur(4px)',
                     '& fieldset': { borderColor: theme.palette.divider },
                     '&:hover fieldset': { borderColor: theme.palette.divider },
                   },
                 }}
                 InputProps={{
                   startAdornment: (
                     <InputAdornment position="start">
                      {searchLoading
                        ? <CircularProgress size={16} sx={{ color: theme.palette.text.secondary }} />
                        : <SearchIcon sx={{ color: theme.palette.text.secondary, fontSize: 20 }} />}
                     </InputAdornment>
                   ),
                 }}
               />
               <Popper
                 open={searchOpen}
                 anchorEl={searchAnchorRef.current}
                 placement="bottom-start"
                 style={{ width: searchAnchorRef.current?.offsetWidth, zIndex: 1300 }}
               >
                 <Paper elevation={4} sx={{ mt: 0.5, borderRadius: '8px', overflow: 'hidden', border: `1px solid ${theme.palette.divider}` }}>
                   {searchSuggestions.length === 0 ? (
                     <Box sx={{ px: 2, py: 1.5, fontSize: 13, color: theme.palette.text.secondary }}>
                       ไม่พบทรัพย์สินที่ตรงกับ "{searchQuery.trim()}"
                     </Box>
                   ) : (
                     <List dense disablePadding>
                       {searchSuggestions.map((a: any) => (
                         <ListItemButton key={a.id} onClick={() => goToSuggestion(a.id)} sx={{ py: 1 }}>
                           <ListItemText
                             primary={a.assetName || a.assetCode || a.serialNo}
                             secondary={[a.assetCode, a.serialNo, a.ownerName].filter(Boolean).join(' · ')}
                             primaryTypographyProps={{ fontSize: 13, fontWeight: 600 }}
                             secondaryTypographyProps={{ fontSize: 12 }}
                           />
                         </ListItemButton>
                       ))}
                       <ListItemButton onClick={() => { setSearchOpen(false); navigate(`/assets?search=${encodeURIComponent(searchQuery.trim())}`); }} sx={{ py: 1, justifyContent: 'center' }}>
                         <ListItemText
                           primary={`ดูผลการค้นหาทั้งหมดสำหรับ "${searchQuery.trim()}"`}
                           primaryTypographyProps={{ fontSize: 12.5, fontWeight: 600, color: theme.palette.primary.main, textAlign: 'center' }}
                         />
                       </ListItemButton>
                     </List>
                   )}
                 </Paper>
               </Popper>
             </form>
            </ClickAwayListener>
           </Box>

           <Box sx={{ flex: 1, display: { xs: 'flex', sm: 'none' } }} />

           {/* Right side: notification + user */}
           <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

            {/* QR Scanner Button (Desktop only since mobile has BottomNav) */}
            <IconButton
              size="small"
              onClick={() => setQrOpen(true)}
              sx={{
                width: 36,
                height: 36,
                borderRadius: '7px',
                border: `0.5px solid ${theme.palette.divider}`,
                color: theme.palette.text.secondary,
                display: { xs: 'none', sm: 'flex' },
                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.06), color: theme.palette.primary.main, borderColor: theme.palette.primary.main },
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
                  width: 36,
                  height: 36,
                  borderRadius: '7px',
                  border: `0.5px solid ${theme.palette.divider}`,
                  color: theme.palette.text.secondary,
                  '&:hover': { bgcolor: alpha(theme.palette.warning.main, 0.08), color: theme.palette.warning.main, borderColor: theme.palette.warning.main },
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
                width: 36,
                height: 36,
                borderRadius: '7px',
                border: `0.5px solid ${theme.palette.divider}`,
                color: theme.palette.text.secondary,
                '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.04) },
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
              <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${theme.palette.divider}` }}>
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
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        bgcolor: notif.isRead ? 'transparent' : alpha(theme.palette.info.main, 0.06),
                        '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.04) }
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
                          color: notif.isRead ? 'text.primary' : theme.palette.info.main
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
                    bgcolor: theme.palette.primary.main,
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
                color: theme.palette.text.primary,
                fontSize: '12px',
                fontWeight: 500,
                border: `0.5px solid ${theme.palette.divider}`,
                bgcolor: theme.palette.background.paper,
                '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.04) },
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
                  border: `0.5px solid ${theme.palette.divider}`,
                  p: '4px',
                },
              }}
            >
              <Box sx={{ px: '12px', py: '10px', borderBottom: `0.5px solid ${theme.palette.divider}`, mb: '4px' }}>
                <Typography sx={{ fontWeight: 600, fontSize: '13px', color: theme.palette.text.primary, lineHeight: 1.3 }}>
                  {user?.displayName}
                </Typography>
                <Typography sx={{ fontSize: '11px', color: theme.palette.text.secondary, mt: '2px' }}>
                  {user?.role === 'SUPERADMIN' ? 'ผู้ดูแลระบบสูงสุด' : user?.role === 'IT_ADMIN' ? 'IT Admin' : user?.role === 'VIEWER' ? 'ผู้บริหาร (อ่านอย่างเดียว)' : 'ผู้ใช้'}
                </Typography>
              </Box>
              <MenuItem
                onClick={() => { setAnchorEl(null); navigate('/profile'); }}
                sx={{ borderRadius: '6px', fontSize: '13px', fontWeight: 500, color: theme.palette.text.primary }}
              >
                <PersonOutlineIcon sx={{ mr: 1.5, fontSize: 16 }} />
                โปรไฟล์ของฉัน
              </MenuItem>
              <Divider sx={{ my: '4px', borderColor: theme.palette.divider }} />
              <MenuItem
                onClick={() => { setAnchorEl(null); logout(); navigate('/login'); }}
                sx={{ color: theme.palette.error.main, borderRadius: '6px', fontSize: '13px', fontWeight: 500 }}
              >
                <LogoutIcon sx={{ mr: 1.5, fontSize: 16 }} />
                ออกจากระบบ
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
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: mobileDrawerWidth,
              borderRight: 'none',
              boxShadow: '10px 0 25px rgba(0,0,0,0.05)',
            },
          }}
        >
          {drawer}
        </Drawer>

        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              borderRight: `1px solid ${theme.palette.divider}`,
            },
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
          minWidth: 0,
          p: { xs: 2, md: '24px' },
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: `${appBarHeight}px`,
          mb: { xs: '56px', md: 0 },
          position: 'relative',
          minHeight: `calc(100vh - ${appBarHeight}px)`,
          bgcolor: theme.palette.background.default,
        }}
      >
        <Breadcrumbs />
        <PageTransition>
          <Outlet />
        </PageTransition>
      </Box>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <Paper 
          sx={{ 
            position: 'fixed', 
            bottom: 0, 
            left: 0, 
            right: 0, 
            zIndex: 1000, 
            borderRadius: '24px 24px 0 0', 
            borderTop: '1px solid rgba(255, 255, 255, 0.3)',
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 -4px 30px rgba(0, 0, 0, 0.03), 0 -1px 3px rgba(0, 0, 0, 0.02)',
            overflow: 'hidden'
          }} 
          elevation={0}
        >
          <BottomNavigation
            showLabels
            value={location.pathname}
            onChange={(_, newValue) => {
              if (newValue === 'scan') {
                setQrOpen(true);
              } else {
                navigate(newValue);
              }
            }}
            sx={{ 
              height: 64, 
              background: 'transparent',
              '& .MuiBottomNavigationAction-root': {
                color: '#94a3b8',
                padding: '6px 0 8px',
                transition: 'all 0.2s',
                '&.Mui-selected': {
                  color: '#2563eb',
                  fontWeight: 700,
                  '& .MuiSvgIcon-root': {
                    transform: 'scale(1.1)',
                  }
                }
              }
            }}
          >
            <BottomNavigationAction label="หน้าหลัก" value="/dashboard" icon={<DashboardIcon />} />
            <BottomNavigationAction label="ทรัพย์สิน" value="/assets" icon={<DevicesIcon />} />
            <BottomNavigationAction label="ยืม-คืน" value="/borrow/new" icon={<ShoppingCartIcon />} />
            <BottomNavigationAction label="สแกน" value="scan" icon={<QrCodeScannerIcon />} />
          </BottomNavigation>
        </Paper>
      )}

      {/* QR Scanner Modal */}
      <QRScannerModal open={qrOpen} onClose={() => setQrOpen(false)} />
    </Box>
  );
}
