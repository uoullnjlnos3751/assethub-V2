import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  alpha,
  Avatar,
  Box,
  Collapse,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  useTheme,
} from '@mui/material';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import LogoutIcon from '@mui/icons-material/Logout';
import { NavGroup, NavItem } from '../../navigation/nav';

type Props = {
  drawerWidth: number;
  mobileDrawerWidth: number;
  appBarHeight: number;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  openGroups: Record<string, boolean>;
  toggleGroup: (label: string) => void;
  filteredNav: Array<NavItem | NavGroup>;
  userRole?: string;
  userDisplayName?: string | null;
  userAdUsername?: string | null;
  systemName?: string | null;
  organizationName?: string | null;
  logoUrl?: string | null;
  onLogout: () => void;
};

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

export default function Sidebar({
  drawerWidth,
  mobileDrawerWidth,
  appBarHeight,
  mobileOpen,
  setMobileOpen,
  openGroups,
  toggleGroup,
  filteredNav,
  userRole,
  userDisplayName,
  userAdUsername,
  systemName,
  organizationName,
  logoUrl,
  onLogout,
}: Props) {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    if (!path) return false;
    if (path.includes('?')) return location.pathname + location.search === path;
    if (path === '/pm') return location.pathname === '/pm';
    return location.pathname === path || (path !== '/' && location.pathname.startsWith(path + '/'));
  };

  const getSectionLabel = (label: string): string | null => {
    if (label === 'แดชบอร์ด') return 'ภาพรวมระบบ';
    if (label === 'ทะเบียนทรัพย์สิน IT') return 'จัดการทรัพย์สิน';
    if (label === 'ระบบจัดการคลัง') return null;
    if (label === 'ระบบยืม-คืน') return 'Service Desk';
    if (label === 'ซ่อมบำรุง & PM') return 'งานซ่อมบำรุง';
    if (label === 'รายงานระบบ') return 'สรุปและรายงาน';
    if (label === 'ตั้งค่าผู้ดูแลระบบ') return 'ผู้ดูแลระบบ';
    return null;
  };

  const renderNav = () => {
    const items: React.ReactNode[] = [];
    let prevSection = '';

    filteredNav.forEach((entry) => {
      const sectionLabel =
        'children' in entry ? getSectionLabel((entry as NavGroup).label) : getSectionLabel((entry as NavItem).label);

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
                {isOpen ? (
                  <ExpandLess sx={{ fontSize: 16, color: theme.palette.text.secondary }} />
                ) : (
                  <ExpandMore sx={{ fontSize: 16, color: theme.palette.text.secondary }} />
                )}
              </ListItemButton>
            </ListItem>

            <Collapse in={isOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding sx={{ mb: 0.5 }}>
                {(() => {
                  let headerCount = 0;
                  return group.children
                    .filter((child) => {
                      if (child.roles) return child.roles.includes(userRole || '');
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
                            onClick={() => {
                              navigate(child.path || '/');
                              setMobileOpen(false);
                            }}
                            sx={{
                              pl: '24px',
                              pr: '12px',
                              py: '6.5px',
                              mx: '8px',
                              my: '1px',
                              borderRadius: '7px',
                              '&.Mui-selected': {
                                bgcolor: alpha(theme.palette.primary.main, 0.12),
                                color: theme.palette.primary.main,
                                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.18) },
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
              onClick={() => {
                navigate(item.path || '');
                setMobileOpen(false);
              }}
              sx={{
                borderRadius: '7px',
                mx: '8px',
                py: '7px',
                px: '12px',
                my: '1px',
                '&.Mui-selected': {
                  bgcolor: alpha(theme.palette.primary.main, 0.12),
                  color: theme.palette.primary.main,
                  '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.18) },
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

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: theme.palette.background.paper }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          px: '14px',
          height: `${appBarHeight}px`,
          borderBottom: `0.5px solid ${theme.palette.divider}`,
          flexShrink: 0,
        }}
      >
        {logoUrl ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 34,
              height: 34,
              overflow: 'hidden',
              borderRadius: '8px',
              flexShrink: 0,
            }}
          >
            <img src={logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </Box>
        ) : (
          <Box
            sx={{
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
            }}
          >
            {(systemName || 'IT').substring(0, 2).toUpperCase()}
          </Box>
        )}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography noWrap sx={{ fontSize: '13px', fontWeight: 600, color: theme.palette.text.primary, lineHeight: 1.2 }}>
            ITAM
          </Typography>
          <Typography noWrap sx={{ fontSize: '10px', color: theme.palette.text.secondary, lineHeight: 1 }}>
            {organizationName || 'ระบบจัดการ IT ครบวงจร'}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ overflowY: 'auto', flexGrow: 1 }}>{renderNav()}</Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          px: '14px',
          py: '10px',
          borderTop: `0.5px solid ${theme.palette.divider}`,
          mt: 'auto',
        }}
      >
        <Avatar
          sx={{
            width: 32,
            height: 32,
            background: `linear-gradient(135deg, ${theme.palette.warning.main}, ${theme.palette.primary.main})`,
            fontSize: '11px',
            fontWeight: 500,
            flexShrink: 0,
            border: 'none',
            boxShadow: 'none',
          }}
        >
          {userDisplayName?.charAt(0) || 'U'}
        </Avatar>
        <Box sx={{ overflow: 'hidden', flex: 1 }}>
          <Typography noWrap sx={{ fontSize: '12px', fontWeight: 500, color: theme.palette.text.primary, lineHeight: 1.3 }}>
            {userDisplayName || userAdUsername}
          </Typography>
          <Typography sx={{ fontSize: '10px', color: theme.palette.warning.main, lineHeight: 1 }}>
            {userRole === 'SUPERADMIN' ? 'Super Admin' : userRole === 'IT_ADMIN' ? 'IT Admin' : 'User'}
          </Typography>
        </Box>
        <IconButton
          size="small"
          onClick={() => {
            onLogout();
            navigate('/login');
          }}
          sx={{ color: theme.palette.text.secondary, p: '4px', '&:hover': { color: theme.palette.error.main, bgcolor: alpha(theme.palette.error.main, 0.08) } }}
          title="ออกจากระบบ"
        >
          <LogoutIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>
    </Box>
  );

  return (
    <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
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
  );
}

