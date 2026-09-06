import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { keyframes } from '@emotion/react';
import {
  AppBar, Box, Drawer, IconButton, List, ListItem, ListItemButton,
  ListItemIcon, ListItemText, Toolbar, Typography, Button, Avatar, Menu, MenuItem,
  Divider, Collapse, alpha, useTheme, Badge, TextField, InputAdornment, Tooltip,
  useMediaQuery, BottomNavigation, BottomNavigationAction, Paper, Popper, ClickAwayListener,
  CircularProgress
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
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
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import { useAuth } from '../contexts/AuthContext';
import { useAppTheme } from '../contexts/ThemeContext';
import { useChatbotContext } from '../contexts/ChatbotContext';
import Breadcrumbs from '../components/Breadcrumbs';
import PageTransition from '../components/PageTransition';
import QRScannerModal from '../components/QRScannerModal';
import { notificationAPI, assetAPI, presenceAPI, dashboardAPI } from '../services/api';
import { adminNav, NavGroup, NavItem, userNavItems, adminRail, userRail, viewerRail, RailModule } from '../navigation/nav';
import SidebarNav, { SIDEBAR_WIDTH, SIDEBAR_COLLAPSED_WIDTH } from './SidebarNav';
import { APP_VERSION, GIT_COMMIT, BUILD_NUMBER, BUILD_TIME, formatBuildTime } from '../utils/buildInfo';

// ── Sidebar widths ─────────────────────────────────────────────────────────
// Desktop runs on a single flat sidebar (SIDEBAR_WIDTH, or the icons-only
// SIDEBAR_COLLAPSED_WIDTH); `mobileDrawerWidth` still belongs to the temporary
// drawer, which keeps the full adminNav accordion because a phone has no room
// for a permanent column.
const mobileDrawerWidth = 240;
const appBarHeight = 50;

const pulseKeyframes = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(22,163,74,.5); }
  70% { box-shadow: 0 0 0 6px rgba(22,163,74,0); }
  100% { box-shadow: 0 0 0 0 rgba(22,163,74,0); }
`;

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
  // Only the mobile drawer still reads this — it renders the full accordion and
  // never collapses. Desktop collapse is now the rail's pin state below.
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('sidebarCollapsed') === '1');
  // Which accordion groups are open. Several can be at once — the user opens
  // and shuts them freely; only the route's own group is opened for them.
  const [openNavIds, setOpenNavIds] = useState<Record<string, boolean>>({});
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
  const [pmOverdueCount, setPmOverdueCount] = useState(0);
  const [clock, setClock] = useState(new Date());
  const { user, logout, systemSettings } = useAuth();
  const { askAI } = useChatbotContext();
  const navigate = useNavigate();
  const location = useLocation();
  const currentDrawerWidth = sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  // Live clock — matches the mockup's "ระบบออนไลน์ HH:MM:SS" topbar indicator
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

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

  // Presence heartbeat — powers the "ทีมงานออนไลน์ตอนนี้" panel on the admin
  // dashboard. Fires on mount, on every route change, and every 25s while the
  // tab stays open on one page (backend treats anyone unseen for 90s as offline).
  useEffect(() => {
    if (!user) return;
    const ping = () => { presenceAPI.heartbeat(location.pathname).catch(() => {}); };
    ping();
    const interval = setInterval(ping, 25000);
    return () => clearInterval(interval);
  }, [user, location.pathname]);

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

  // PM overdue count — powers the red nav badge on "PM ทรัพย์สิน" (mirrors the mockup's nav-badge)
  useEffect(() => {
    if (!isAdmin) return;
    dashboardAPI.pmSummary().then(res => setPmOverdueCount(res.data?.overdue || 0)).catch(() => {});
  }, [isAdmin]);

  // VIEWER = read-only executive access: dashboard, license/contract, reports only
  const viewerVisiblePaths = new Set(['/dashboard', '/contracts', '/licenses', '/catalog']);
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

  // ── Rail: role-filtered modules, and which one owns the current page ──────
  const railModules: RailModule[] = useMemo(() => {
    const source = isAdmin ? adminRail : isViewer ? viewerRail : userRail;
    const role = user?.role || '';
    return source
      .filter(m => !m.roles || m.roles.includes(role))
      .map(m => ({
        ...m,
        sections: m.sections
          .map(s => ({ ...s, items: s.items.filter(i => !i.roles || i.roles.includes(role)) }))
          .filter(s => s.items.length > 0),
      }))
      .filter(m => m.sections.length > 0);
  }, [isAdmin, isViewer, user?.role]);

  // Longest matching path wins, so /categories (which sits in both ทรัพย์สิน and
  // ตั้งค่า) and /pm vs /pm/runs resolve to the module the user actually opened.
  const routeRailId = useMemo(() => {
    let best: { id: string; len: number } | null = null;
    railModules.forEach(m => m.sections.forEach(s => s.items.forEach(item => {
      if (!item.path || !isActive(item.path)) return;
      if (!best || item.path.length > best.len) best = { id: m.id, len: item.path.length };
    })));
    return best ? (best as { id: string }).id : null;
  }, [railModules, location.pathname, location.search]);

  // Opens the group that owns the page, without shutting anything the user
  // opened themselves — navigating shouldn't collapse the rest of the menu
  // out from under them.
  useEffect(() => {
    if (!routeRailId) return;
    setOpenNavIds(prev => (prev[routeRailId] ? prev : { ...prev, [routeRailId]: true }));
  }, [routeRailId]);

  const toggleSidebar = () => {
    const next = !sidebarCollapsed;
    localStorage.setItem('sidebarCollapsed', next ? '1' : '0');
    setSidebarCollapsed(next);
  };

  const toggleNavGroup = (id: string) => {
    setOpenNavIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  /** Clicking an icon in the collapsed sidebar reopens it onto that group. */
  const expandOnto = (id: string) => {
    localStorage.setItem('sidebarCollapsed', '0');
    setSidebarCollapsed(false);
    setOpenNavIds(prev => ({ ...prev, [id]: true }));
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
      if (sectionLabel && sectionLabel !== prevSection && !collapsed) {
        items.push(<SidebarSection key={`sec-${sectionLabel}`}>{sectionLabel}</SidebarSection>);
        prevSection = sectionLabel;
      }

      if ('children' in entry) {
        const group = entry as NavGroup;
        const isOpen = openGroups[group.label] ?? false;
        const badgeCount = group.label === 'PM ทรัพย์สิน' ? pmOverdueCount : 0;
        const groupButton = (
          <ListItemButton
            onClick={() => {
              if (collapsed) {
                setCollapsed(false);
                localStorage.setItem('sidebarCollapsed', '0');
                setOpenGroups(prev => ({ ...prev, [group.label]: true }));
              } else {
                toggleGroup(group.label);
              }
            }}
            sx={{
              borderRadius: '9px',
              mx: '8px',
              py: '7px',
              px: '12px',
              my: '1px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.04) },
            }}
          >
            <ListItemIcon sx={{ minWidth: collapsed ? 0 : 30, color: isOpen ? theme.palette.primary.main : theme.palette.text.secondary }}>
              <Badge
                badgeContent={badgeCount}
                color="error"
                overlap="circular"
                sx={{ '& .MuiBadge-badge': { fontSize: '9px', height: 14, minWidth: 14 } }}
              >
                {group.icon}
              </Badge>
            </ListItemIcon>
            {!collapsed && (
              <ListItemText
                primary={group.label}
                primaryTypographyProps={{
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  color: theme.palette.text.primary,
                }}
              />
            )}
            {!collapsed && (isOpen
              ? <ExpandLess sx={{ fontSize: 16, color: theme.palette.text.secondary }} />
              : <ExpandMore sx={{ fontSize: 16, color: theme.palette.text.secondary }} />)}
          </ListItemButton>
        );
        items.push(
          <React.Fragment key={group.label}>
            <ListItem disablePadding>
              {collapsed ? <Tooltip title={group.label} placement="right">{groupButton}</Tooltip> : groupButton}
            </ListItem>

            <Collapse in={isOpen && !collapsed} timeout="auto" unmountOnExit>
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
                              borderRadius: '9px',
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
                                fontWeight: active ? 700 : 400,
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
        const itemButton = (
          <ListItemButton
            selected={active}
            onClick={() => {
              // เมนูสั่งงาน (เช่น ผู้ช่วย AI) ไม่ได้พาไปหน้าไหน แค่เปิดแผงขึ้นมา
              if (item.action === 'assistant') askAI('');
              else navigate(item.path || '');
              setMobileOpen(false);
            }}
            sx={{
              borderRadius: '9px',
              mx: '8px',
              py: '7px',
              px: '12px',
              my: '1px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              '&.Mui-selected': {
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: theme.palette.primary.main,
                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.15) },
              },
              '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.04) },
            }}
          >
            <ListItemIcon sx={{ minWidth: collapsed ? 0 : 30, color: active ? theme.palette.primary.main : theme.palette.text.secondary }}>
              {item.icon}
            </ListItemIcon>
            {!collapsed && (
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontSize: '0.8125rem',
                  fontWeight: active ? 700 : 500,
                  color: active ? theme.palette.primary.main : theme.palette.text.primary,
                }}
              />
            )}
          </ListItemButton>
        );
        items.push(
          <ListItem key={item.path || item.label} disablePadding>
            {collapsed ? <Tooltip title={item.label} placement="right">{itemButton}</Tooltip> : itemButton}
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
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}>
        {systemSettings?.logoUrl ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, overflow: 'hidden', borderRadius: '8px', flexShrink: 0 }}>
            <img src={systemSettings.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </Box>
        ) : (
          <Box sx={{
            width: 34,
            height: 34,
            borderRadius: '10px',
            background: `linear-gradient(150deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            boxShadow: `0 6px 16px -6px ${theme.palette.primary.main}`,
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
        {!collapsed && (
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography noWrap sx={{ fontSize: '13px', fontWeight: 600, color: theme.palette.text.primary, lineHeight: 1.2 }}>
              ITAM
            </Typography>
            <Typography noWrap sx={{ fontSize: '10px', color: theme.palette.text.secondary, lineHeight: 1 }}>
              {systemSettings?.organizationName || 'ระบบจัดการ IT ครบวงจร'}
            </Typography>
          </Box>
        )}
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
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}>
        <Avatar sx={{
          width: 32,
          height: 32,
          background: `linear-gradient(150deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
          fontSize: '11px',
          fontWeight: 500,
          flexShrink: 0,
          border: 'none',
          boxShadow: 'none',
        }}>
          {user?.displayName?.charAt(0) || 'U'}
        </Avatar>
        {!collapsed && (
          <>
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
          </>
        )}
      </Box>

      {/* Build/version footer — so it's always visible which build is live */}
      {!collapsed && (
        <Tooltip title={`อัปเดตครั้งที่ ${BUILD_NUMBER}${BUILD_TIME ? ` · Built ${formatBuildTime(BUILD_TIME)}` : ''}`} placement="top">
          <Typography noWrap sx={{
            fontSize: '9px',
            fontFamily: 'monospace',
            letterSpacing: '0.02em',
            textAlign: 'center',
            color: theme.palette.text.disabled,
            py: '4px',
            flexShrink: 0,
          }}>
            v{APP_VERSION} · #{BUILD_NUMBER} · {GIT_COMMIT}
          </Typography>
        </Tooltip>
      )}
    </Box>
  );

  // ── Rail brand + footer ──────────────────────────────────────────────────
  const homePath = railModules[0]?.sections[0]?.items[0]?.path || '/dashboard';
  const brandMark = (
    <Tooltip title={sidebarCollapsed ? (systemSettings?.systemName || 'ITAM') : ''} placement="right" arrow>
      <Box
        component="button"
        type="button"
        onClick={() => navigate(homePath)}
        aria-label="หน้าแรก"
        sx={{
          width: sidebarCollapsed ? 'auto' : '100%',
          border: 0,
          bgcolor: 'transparent',
          p: 0,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          textAlign: 'left',
          font: 'inherit',
          minWidth: 0,
          '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: '2px', borderRadius: '10px' },
          '&:hover .brand-tile': { transform: 'scale(1.05)' },
        }}
      >
        <Box className="brand-tile" sx={{
          width: 38,
          height: 38,
          flexShrink: 0,
          borderRadius: '11px',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: '13px',
          letterSpacing: '-0.02em',
          color: '#fff',
          background: systemSettings?.logoUrl
            ? alpha(theme.palette.primary.main, 0.1)
            : `linear-gradient(140deg, ${theme.palette.primary.main}, ${theme.palette.info.main})`,
          boxShadow: systemSettings?.logoUrl ? 'none' : `0 8px 20px -10px ${theme.palette.primary.main}`,
          transition: 'transform .18s ease',
        }}>
          {systemSettings?.logoUrl
            ? <img src={systemSettings.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            : (systemSettings?.systemName || 'IT').substring(0, 2).toUpperCase()}
        </Box>
        {!sidebarCollapsed && (
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography noWrap sx={{ fontSize: '14px', fontWeight: 700, color: theme.palette.text.primary, lineHeight: 1.3 }}>
              {systemSettings?.systemName || 'ITAM'}
            </Typography>
            <Typography noWrap sx={{ fontSize: '10.5px', color: theme.palette.text.secondary, lineHeight: 1.3 }}>
              {systemSettings?.organizationName || 'ระบบจัดการทรัพย์สิน IT'}
            </Typography>
          </Box>
        )}
      </Box>
    </Tooltip>
  );

  // Status card above the user block — the live signals we actually have
  // (clock + the PM overdue count already fetched for the nav badge), not a
  // decorative "all systems operational" that nothing measures.
  const sidebarStatus = (
    <Box sx={{
      borderRadius: '11px',
      border: `1px solid ${theme.palette.divider}`,
      bgcolor: alpha(theme.palette.text.primary, 0.02),
      px: '11px',
      py: '9px',
    }}>
      <Typography sx={{ fontSize: '10.5px', fontWeight: 700, color: theme.palette.text.secondary, mb: '5px' }}>
        สถานะระบบ
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
        <Box sx={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          bgcolor: theme.palette.success.main,
          animation: `${pulseKeyframes} 2s infinite`,
          flexShrink: 0,
        }} />
        <Typography sx={{ fontSize: '12px', fontWeight: 600, color: theme.palette.success.main }}>
          ระบบออนไลน์
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Typography sx={{ fontSize: '10.5px', fontFamily: 'monospace', color: theme.palette.text.disabled }}>
          {clock.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
        </Typography>
      </Box>
      {isAdmin && pmOverdueCount > 0 && (
        <Box
          component="button"
          type="button"
          onClick={() => navigate('/pm')}
          sx={{
            mt: '7px',
            width: '100%',
            border: 0,
            cursor: 'pointer',
            font: 'inherit',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            px: '8px',
            py: '5px',
            borderRadius: '7px',
            bgcolor: alpha(theme.palette.error.main, 0.1),
            '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.16) },
          }}
        >
          <WarningAmberRoundedIcon sx={{ fontSize: 14, color: theme.palette.error.main, flexShrink: 0 }} />
          <Typography sx={{ fontSize: '11px', fontWeight: 600, color: theme.palette.error.main }}>
            PM เลยกำหนด {pmOverdueCount} แผน
          </Typography>
        </Box>
      )}
    </Box>
  );

  const railFooter = (
    <>
      <Box
        component="button"
        type="button"
        onClick={() => navigate('/profile')}
        sx={{
          width: '100%',
          border: 0,
          bgcolor: 'transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '9px',
          px: '12px',
          py: '9px',
          textAlign: 'left',
          font: 'inherit',
          '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.04) },
        }}
      >
        <Avatar
          src={user?.avatarUrl || undefined}
          sx={{
            width: 30,
            height: 30,
            fontSize: '11px',
            fontWeight: 700,
            flexShrink: 0,
            background: `linear-gradient(140deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
          }}
        >
          {!user?.avatarUrl && (user?.displayName?.charAt(0) || 'U')}
        </Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography noWrap sx={{ fontSize: '12px', fontWeight: 600, color: theme.palette.text.primary, lineHeight: 1.3 }}>
            {user?.displayName || user?.adUsername}
          </Typography>
          <Typography noWrap sx={{ fontSize: '10px', color: theme.palette.text.secondary, lineHeight: 1.2 }}>
            {user?.role === 'SUPERADMIN' ? 'ผู้ดูแลระบบสูงสุด' : user?.role === 'IT_ADMIN' ? 'IT Admin' : user?.role === 'VIEWER' ? 'ผู้บริหาร' : 'ผู้ใช้'}
          </Typography>
        </Box>
      </Box>
      <Tooltip title={`อัปเดตครั้งที่ ${BUILD_NUMBER}${BUILD_TIME ? ` · Built ${formatBuildTime(BUILD_TIME)}` : ''}`} placement="top">
        <Typography noWrap sx={{
          fontSize: '9px',
          fontFamily: 'monospace',
          letterSpacing: '0.02em',
          textAlign: 'center',
          color: theme.palette.text.disabled,
          pb: '5px',
        }}>
          v{APP_VERSION} · #{BUILD_NUMBER} · {GIT_COMMIT}
        </Typography>
      </Tooltip>
    </>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', position: 'relative', bgcolor: theme.palette.background.default }}>

      {/* ── AppBar / Topbar ──────────────────────────────────────────── */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${currentDrawerWidth}px)` },
          ml: { md: `${currentDrawerWidth}px` },
          transition: theme.transitions.create(['width', 'margin'], { duration: theme.transitions.duration.shorter }),
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

          {/* Desktop sidebar collapse toggle */}
          <Tooltip title={sidebarCollapsed ? 'ขยายเมนู' : 'ย่อเมนู (ได้พื้นที่เพิ่ม)'}>
            <IconButton
              onClick={toggleSidebar}
              sx={{
                display: { xs: 'none', md: 'flex' },
                width: 34,
                height: 34,
                borderRadius: '8px',
                border: `0.5px solid ${theme.palette.divider}`,
                color: theme.palette.text.secondary,
                '&:hover': { borderColor: theme.palette.primary.main, color: theme.palette.primary.main },
              }}
            >
              {sidebarCollapsed ? <MenuIcon sx={{ fontSize: 18 }} /> : <MenuOpenIcon sx={{ fontSize: 18 }} />}
            </IconButton>
          </Tooltip>

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
                 placeholder="ค้นหาทรัพย์สิน หรือถาม AI..."
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
                   {/* Bridges search to the floating AssetHub Assistant — for
                       anything that isn't a direct asset match ("ใครถือครอง
                       M001", "มีโน้ตบุ๊กกี่เครื่อง"), matching the InvGate-style
                       "search or ask AI" hint in the box's placeholder. */}
                   <Divider sx={{ borderColor: theme.palette.divider }} />
                   <List dense disablePadding>
                     <ListItemButton
                       onClick={() => { setSearchOpen(false); askAI(searchQuery); }}
                       sx={{ py: 1, gap: '10px' }}
                     >
                       <AutoAwesomeRoundedIcon sx={{ fontSize: 16, color: theme.palette.secondary.main, flexShrink: 0 }} />
                       <ListItemText
                         primary={<>ถาม AI: <Box component="span" sx={{ fontWeight: 700 }}>"{searchQuery.trim()}"</Box></>}
                         primaryTypographyProps={{ fontSize: 12.5, fontWeight: 600, color: theme.palette.secondary.main }}
                       />
                     </ListItemButton>
                   </List>
                 </Paper>
               </Popper>
             </form>
            </ClickAwayListener>
           </Box>

           <Box sx={{ flex: 1, display: { xs: 'flex', sm: 'none' } }} />

           {/* Live clock — mirrors the mockup's "ระบบออนไลน์ HH:MM:SS" indicator */}
           <Box sx={{
             display: { xs: 'none', lg: 'flex' },
             alignItems: 'center',
             gap: '7px',
             fontFamily: 'monospace',
             fontSize: '12.5px',
             color: theme.palette.text.secondary,
             whiteSpace: 'nowrap',
           }}>
             <Box sx={{
               width: 7,
               height: 7,
               borderRadius: '50%',
               bgcolor: 'success.main',
               animation: `${pulseKeyframes} 2s infinite`,
             }} />
             <span>ระบบออนไลน์</span>
             <span>{clock.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</span>
           </Box>

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
      <Box component="nav" sx={{ width: { md: currentDrawerWidth }, flexShrink: { md: 0 }, transition: theme.transitions.create('width', { duration: theme.transitions.duration.shorter }) }}>
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

        {/* Desktop sidebar — fixed full height, above the AppBar so the brand
            block lines up with the top of the window as in the reference. */}
        <Box sx={{
          display: { xs: 'none', md: 'block' },
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          width: currentDrawerWidth,
          zIndex: (t) => t.zIndex.drawer + 2,
          transition: theme.transitions.create('width', { duration: theme.transitions.duration.shorter }),
        }}>
          <SidebarNav
            modules={railModules}
            routeId={routeRailId}
            openIds={openNavIds}
            onToggleGroup={toggleNavGroup}
            isActive={isActive}
            onNavigate={navigate}
            onAction={a => { if (a === 'assistant') askAI(''); }}
            badges={{ pm: pmOverdueCount }}
            collapsed={sidebarCollapsed}
            onExpandOnto={expandOnto}
            brand={brandMark}
            status={sidebarStatus}
            footer={railFooter}
          />
        </Box>
      </Box>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          p: { xs: 2, md: '24px' },
          width: { md: `calc(100% - ${currentDrawerWidth}px)` },
          transition: theme.transitions.create('width', { duration: theme.transitions.duration.shorter }),
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
                color: theme.palette.text.disabled,
                padding: '6px 0 8px',
                transition: 'all 0.2s',
                '&.Mui-selected': {
                  color: theme.palette.info.main,
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
