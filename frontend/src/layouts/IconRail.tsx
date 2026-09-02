import React from 'react';
import { Box, Typography, Tooltip, Badge, IconButton, alpha, useTheme } from '@mui/material';
import { keyframes } from '@emotion/react';
import KeyboardDoubleArrowLeftRoundedIcon from '@mui/icons-material/KeyboardDoubleArrowLeftRounded';
import KeyboardDoubleArrowRightRoundedIcon from '@mui/icons-material/KeyboardDoubleArrowRightRounded';
import LogoutIcon from '@mui/icons-material/Logout';
import type { RailModule, NavItem } from '../navigation/nav';

/**
 * Two-column sidebar: a fixed icon rail plus the flyout for whichever module is
 * open. Only one module's links are ever on screen, which is what buys back the
 * vertical room the old single-column accordion spent on collapsed headers.
 *
 * The rail keeps the dark palette in both colour modes on purpose — it reads as
 * chrome rather than page, so the content area beside it can be either theme
 * without the rail changing weight.
 */

export const RAIL_WIDTH = 76;
export const FLYOUT_WIDTH = 216;

const rail = {
  bg: 'linear-gradient(180deg, #101d31 0%, #060f1d 100%)',
  edge: 'rgba(255,255,255,.07)',
  icon: 'rgba(226,240,255,.66)',
  label: 'rgba(226,240,255,.42)',
  hover: 'rgba(255,255,255,.07)',
  activeBg: 'linear-gradient(135deg, rgba(34,211,238,.22), rgba(96,165,250,.14))',
  activeEdge: 'rgba(34,211,238,.34)',
  activeIcon: '#3fdcf0',
  activeLabel: '#a5f3fc',
  marker: '#22d3ee',
};

const flyIn = keyframes`
  from { opacity: 0; transform: translateX(-6px); }
  to   { opacity: 1; transform: translateX(0); }
`;

interface Props {
  modules: RailModule[];
  /** Module whose flyout is on screen. */
  openId: string | null;
  /** Module that owns the current route — gets the rail marker even while peeking elsewhere. */
  routeId: string | null;
  onOpen: (id: string) => void;
  /** Flyout pinned open as a permanent column, vs. floating over the content. */
  pinned: boolean;
  onTogglePin: () => void;
  isActive: (path: string) => boolean;
  onNavigate: (path: string) => void;
  /** Red count bubbles keyed by module id. */
  badges?: Record<string, number>;
  brand: React.ReactNode;
  footer?: React.ReactNode;
  onLogout: () => void;
}

export default function IconRail({
  modules, openId, routeId, onOpen, pinned, onTogglePin,
  isActive, onNavigate, badges = {}, brand, footer, onLogout,
}: Props) {
  const theme = useTheme();
  const openModule = modules.find(m => m.id === openId) || null;

  const top = modules.filter(m => !m.atBottom);
  const bottom = modules.filter(m => m.atBottom);

  const renderRailButton = (m: RailModule) => {
    const isOpen = m.id === openId;
    const owns = m.id === routeId;
    const count = badges[m.id] || 0;

    return (
      <Tooltip key={m.id} title={m.title} placement="right" arrow disableHoverListener={pinned && isOpen}>
        <Box
          component="button"
          type="button"
          onClick={() => onOpen(m.id)}
          aria-current={owns ? 'page' : undefined}
          sx={{
            position: 'relative',
            width: 60,
            minHeight: 54,
            border: '1px solid transparent',
            borderRadius: '13px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            px: '2px',
            py: '7px',
            font: 'inherit',
            background: isOpen ? rail.activeBg : 'transparent',
            borderColor: isOpen ? rail.activeEdge : 'transparent',
            boxShadow: isOpen ? '0 6px 18px -8px rgba(34,211,238,.55)' : 'none',
            transition: 'background .18s ease, border-color .18s ease, box-shadow .18s ease',
            '&:hover': { background: isOpen ? rail.activeBg : rail.hover },
            '&:focus-visible': { outline: `2px solid ${rail.marker}`, outlineOffset: '2px' },
            '& .rail-glyph': {
              fontSize: 21,
              color: isOpen ? rail.activeIcon : rail.icon,
              transition: 'color .18s ease, transform .18s ease',
            },
            '&:hover .rail-glyph': { color: isOpen ? rail.activeIcon : '#eaf6ff', transform: 'translateY(-1px)' },
          }}
        >
          {/* Route marker — stays on the module that owns the page even while
              the user peeks into another module's flyout. */}
          {owns && (
            <Box sx={{
              // -8 cancels the rail's own side padding, so the bar lands flush
              // on the rail's left edge rather than off it.
              position: 'absolute',
              left: -8,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 3,
              height: 22,
              borderRadius: '0 3px 3px 0',
              bgcolor: rail.marker,
              boxShadow: `0 0 10px ${rail.marker}`,
            }} />
          )}

          <Badge
            badgeContent={count}
            color="error"
            overlap="circular"
            sx={{ '& .MuiBadge-badge': { fontSize: '9px', height: 15, minWidth: 15, top: 2, right: 1, fontWeight: 700 } }}
          >
            {React.isValidElement(m.icon)
              ? React.cloneElement(m.icon as React.ReactElement, { className: 'rail-glyph' })
              : m.icon}
          </Badge>

          <Typography
            noWrap
            sx={{
              fontSize: '10px',
              fontWeight: isOpen ? 700 : 500,
              letterSpacing: 0,
              // Thai tone marks sit above the cap height — a 1.0 line-height
              // crops them against the noWrap overflow.
              lineHeight: 1.35,
              maxWidth: '100%',
              color: isOpen ? rail.activeLabel : rail.label,
              transition: 'color .18s ease',
            }}
          >
            {m.label}
          </Typography>
        </Box>
      </Tooltip>
    );
  };

  const renderFlyoutItem = (item: NavItem) => {
    const active = item.path ? isActive(item.path) : false;
    return (
      <Box
        key={item.path || item.label}
        component="button"
        type="button"
        onClick={() => item.path && onNavigate(item.path)}
        sx={{
          position: 'relative',
          width: '100%',
          border: 0,
          cursor: 'pointer',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          gap: '9px',
          px: '10px',
          py: '7px',
          borderRadius: '9px',
          font: 'inherit',
          bgcolor: active ? alpha(theme.palette.primary.main, 0.11) : 'transparent',
          transition: 'background .15s ease',
          '&:hover': { bgcolor: active ? alpha(theme.palette.primary.main, 0.16) : alpha(theme.palette.text.primary, 0.05) },
          '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: '-2px' },
          '& .fly-glyph': { fontSize: 15, color: active ? theme.palette.primary.main : theme.palette.text.secondary },
        }}
      >
        {active && (
          <Box sx={{
            position: 'absolute',
            left: -8,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 3,
            height: 16,
            borderRadius: '0 3px 3px 0',
            bgcolor: theme.palette.primary.main,
          }} />
        )}
        {item.icon
          ? React.cloneElement(item.icon as React.ReactElement, { className: 'fly-glyph' })
          : <Box sx={{ width: 15 }} />}
        <Typography
          sx={{
            fontSize: '12.5px',
            fontWeight: active ? 700 : 500,
            lineHeight: 1.35,
            color: active ? theme.palette.primary.main : theme.palette.text.primary,
          }}
        >
          {item.label}
        </Typography>
      </Box>
    );
  };

  const flyout = openModule && (
    <Box
      sx={{
        width: FLYOUT_WIDTH,
        flexShrink: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: theme.palette.background.paper,
        borderRight: `1px solid ${theme.palette.divider}`,
        animation: pinned ? 'none' : `${flyIn} .16s ease-out`,
        boxShadow: pinned ? 'none' : '18px 0 40px -24px rgba(6,15,29,.45)',
      }}
    >
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        px: '14px',
        height: 50,
        flexShrink: 0,
        borderBottom: `1px solid ${theme.palette.divider}`,
      }}>
        <Typography noWrap sx={{ fontSize: '13px', fontWeight: 700, flex: 1, color: theme.palette.text.primary }}>
          {openModule.title}
        </Typography>
        <Tooltip title={pinned ? 'ปล่อยเมนูให้ลอย (ได้พื้นที่เพิ่ม)' : 'ตรึงเมนูไว้'}>
          <IconButton
            size="small"
            onClick={onTogglePin}
            sx={{
              width: 26, height: 26, minWidth: 26, minHeight: 26, borderRadius: '7px',
              color: theme.palette.text.secondary,
              '&:hover': { color: theme.palette.primary.main, bgcolor: alpha(theme.palette.primary.main, 0.08) },
            }}
          >
            {pinned
              ? <KeyboardDoubleArrowLeftRoundedIcon sx={{ fontSize: 17 }} />
              : <KeyboardDoubleArrowRightRoundedIcon sx={{ fontSize: 17 }} />}
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', px: '8px', py: '8px' }}>
        {openModule.sections.map((sec, i) => {
          const items = sec.items;
          if (items.length === 0) return null;
          return (
            <Box key={sec.label || `sec-${i}`} sx={{ mb: '4px' }}>
              {sec.label && (
                <Typography sx={{
                  display: 'block',
                  px: '10px',
                  pt: i === 0 ? '4px' : '12px',
                  pb: '5px',
                  fontSize: '10px',
                  fontWeight: 700,
                  // Wide tracking pulls Thai syllables apart; .04em is enough
                  // to read as a label without breaking the words up.
                  letterSpacing: '.04em',
                  lineHeight: 1.4,
                  color: theme.palette.text.secondary,
                }}>
                  {sec.label}
                </Typography>
              )}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                {items.map(renderFlyoutItem)}
              </Box>
            </Box>
          );
        })}
      </Box>

      {footer && (
        <Box sx={{ flexShrink: 0, borderTop: `1px solid ${theme.palette.divider}` }}>
          {footer}
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: '100%', position: 'relative' }}>
      {/* ── Rail ─────────────────────────────────────────────────────── */}
      <Box sx={{
        width: RAIL_WIDTH,
        flexShrink: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '3px',
        py: '9px',
        background: rail.bg,
        borderRight: `1px solid ${rail.edge}`,
        zIndex: 2,
      }}>
        <Box sx={{ height: 41, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: '4px' }}>
          {brand}
        </Box>

        {top.map(renderRailButton)}

        <Box sx={{ flex: 1, minHeight: 8 }} />

        {bottom.map(renderRailButton)}

        <Box sx={{ width: 34, height: '1px', bgcolor: rail.edge, my: '5px' }} />

        <Tooltip title="ออกจากระบบ" placement="right" arrow>
          <IconButton
            onClick={onLogout}
            sx={{
              width: 38, height: 38, minWidth: 38, minHeight: 38, borderRadius: '11px',
              color: rail.icon,
              '&:hover': { bgcolor: 'rgba(248,113,113,.16)', color: '#fca5a5' },
            }}
          >
            <LogoutIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* ── Flyout ───────────────────────────────────────────────────── */}
      {pinned ? flyout : (
        openModule && (
          <Box sx={{
            position: 'absolute',
            left: RAIL_WIDTH,
            top: 0,
            bottom: 0,
            zIndex: 3,
          }}>
            {flyout}
          </Box>
        )
      )}
    </Box>
  );
}
