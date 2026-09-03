import React from 'react';
import { Box, Typography, Collapse, Tooltip, Badge, alpha, useTheme } from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import type { RailModule, NavItem } from '../navigation/nav';

/**
 * Single-column sidebar: every module is a row in one flat list, and groups
 * open as an inline accordion instead of a flyout panel.
 *
 * Replaces the icon-rail + flyout pair. The rail spent a fixed 76px on icons
 * whose labels were still guesses at 10px, and put the actual links behind a
 * click — you could not see where anything was without opening a module first.
 * Here the whole menu is legible at rest, which is what the reference design
 * (docs/2026-08-28_082414_0.png) does.
 *
 * Collapsed mode keeps the icons only; clicking one expands the sidebar back
 * and opens that group, so the collapse is a space toggle rather than a
 * different navigation model.
 */

export const SIDEBAR_WIDTH = 240;
export const SIDEBAR_COLLAPSED_WIDTH = 68;

interface Props {
  modules: RailModule[];
  /** Module that owns the current route — its row reads as active. */
  routeId: string | null;
  /** Groups currently expanded, keyed by module id. */
  openIds: Record<string, boolean>;
  onToggleGroup: (id: string) => void;
  isActive: (path: string) => boolean;
  onNavigate: (path: string) => void;
  /** Red count bubbles keyed by module id. */
  badges?: Record<string, number>;
  collapsed: boolean;
  /** Clicking an icon while collapsed re-expands the sidebar onto that group. */
  onExpandOnto: (id: string) => void;
  brand: React.ReactNode;
  /** Status card above the user block — omitted while collapsed. */
  status?: React.ReactNode;
  footer?: React.ReactNode;
}

export default function SidebarNav({
  modules, routeId, openIds, onToggleGroup, isActive, onNavigate,
  badges = {}, collapsed, onExpandOnto, brand, status, footer,
}: Props) {
  const theme = useTheme();

  const top = modules.filter(m => !m.atBottom);
  const bottom = modules.filter(m => m.atBottom);

  /** A module holding exactly one destination is its own link, not a group. */
  const soleItem = (m: RailModule): NavItem | null => {
    const items = m.sections.flatMap(s => s.items);
    return items.length === 1 ? items[0] : null;
  };

  // ── Collapsed: icons only ────────────────────────────────────────────────
  const renderCollapsed = (m: RailModule) => {
    const owns = m.id === routeId;
    const count = badges[m.id] || 0;
    return (
      <Tooltip key={m.id} title={m.title} placement="right" arrow>
        <Box
          component="button"
          type="button"
          onClick={() => {
            const only = soleItem(m);
            if (only?.path) onNavigate(only.path);
            else onExpandOnto(m.id);
          }}
          aria-current={owns ? 'page' : undefined}
          sx={{
            width: 44,
            height: 40,
            border: 0,
            borderRadius: '10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            font: 'inherit',
            bgcolor: owns ? alpha(theme.palette.primary.main, 0.12) : 'transparent',
            transition: 'background .15s ease',
            '&:hover': { bgcolor: owns ? alpha(theme.palette.primary.main, 0.16) : alpha(theme.palette.text.primary, 0.05) },
            '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: '-2px' },
            '& .nav-glyph': { fontSize: 20, color: owns ? theme.palette.primary.main : theme.palette.text.secondary },
          }}
        >
          <Badge
            badgeContent={count}
            color="error"
            overlap="circular"
            sx={{ '& .MuiBadge-badge': { fontSize: '9px', height: 15, minWidth: 15, fontWeight: 700 } }}
          >
            {React.isValidElement(m.icon)
              ? React.cloneElement(m.icon as React.ReactElement, { className: 'nav-glyph' })
              : m.icon}
          </Badge>
        </Box>
      </Tooltip>
    );
  };

  // ── Expanded: one row per module, groups open inline ─────────────────────
  /** Shared row chrome for both the group headers and their child links. */
  const row = (opts: {
    active: boolean;
    depth: 0 | 1;
    onClick: () => void;
    icon?: React.ReactNode;
    label: string;
    count?: number;
    trailing?: React.ReactNode;
    ariaExpanded?: boolean;
  }) => {
    const { active, depth, onClick, icon, label, count = 0, trailing, ariaExpanded } = opts;
    return (
      <Box
        component="button"
        type="button"
        onClick={onClick}
        aria-expanded={ariaExpanded}
        aria-current={active && depth === 1 ? 'page' : undefined}
        sx={{
          width: '100%',
          border: 0,
          cursor: 'pointer',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          pl: depth === 1 ? '34px' : '11px',
          pr: '9px',
          py: depth === 1 ? '6px' : '8px',
          borderRadius: '9px',
          font: 'inherit',
          bgcolor: active ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
          transition: 'background .15s ease',
          '&:hover': {
            bgcolor: active
              ? alpha(theme.palette.primary.main, 0.15)
              : alpha(theme.palette.text.primary, 0.045),
          },
          '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: '-2px' },
          '& .nav-glyph': {
            fontSize: depth === 1 ? 16 : 19,
            color: active ? theme.palette.primary.main : theme.palette.text.secondary,
            flexShrink: 0,
          },
        }}
      >
        {icon
          ? (React.isValidElement(icon)
              ? React.cloneElement(icon as React.ReactElement, { className: 'nav-glyph' })
              : icon)
          : null}
        <Typography
          noWrap
          sx={{
            flex: 1,
            minWidth: 0,
            fontSize: depth === 1 ? '12.5px' : '13.2px',
            fontWeight: active ? 700 : 500,
            // Thai tone marks sit above the cap height — a tight line-height
            // clips them against noWrap's overflow.
            lineHeight: 1.45,
            color: active ? theme.palette.primary.main : theme.palette.text.primary,
          }}
        >
          {label}
        </Typography>
        {count > 0 && (
          <Box sx={{
            flexShrink: 0,
            minWidth: 18,
            height: 18,
            px: '5px',
            borderRadius: '999px',
            bgcolor: theme.palette.error.main,
            color: '#fff',
            fontSize: '10px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {count}
          </Box>
        )}
        {trailing}
      </Box>
    );
  };

  const renderExpanded = (m: RailModule) => {
    const owns = m.id === routeId;
    const count = badges[m.id] || 0;
    const only = soleItem(m);

    // Single-destination module: a plain link row, no chevron, no accordion.
    if (only) {
      return (
        <Box key={m.id}>
          {row({
            active: only.path ? isActive(only.path) : false,
            depth: 0,
            onClick: () => only.path && onNavigate(only.path),
            icon: m.icon,
            label: m.label,
            count,
          })}
        </Box>
      );
    }

    const open = !!openIds[m.id];
    return (
      <Box key={m.id}>
        {row({
          // The header highlights only while its group is shut — an open group
          // already shows which child is active, and two highlights read as two
          // current pages.
          active: owns && !open,
          depth: 0,
          onClick: () => onToggleGroup(m.id),
          icon: m.icon,
          label: m.label,
          count,
          ariaExpanded: open,
          trailing: (
            <ExpandMoreRoundedIcon sx={{
              fontSize: 17,
              flexShrink: 0,
              color: theme.palette.text.disabled,
              transform: open ? 'rotate(180deg)' : 'none',
              transition: 'transform .18s ease',
            }} />
          ),
        })}

        <Collapse in={open} unmountOnExit>
          {/* Guide line ties the indented children back to their header. */}
          <Box sx={{
            position: 'relative',
            pt: '2px',
            pb: '4px',
            '&::before': {
              content: '""',
              position: 'absolute',
              left: '20px',
              top: '4px',
              bottom: '6px',
              width: '1px',
              bgcolor: theme.palette.divider,
            },
          }}>
            {m.sections.map((sec, i) => (
              <Box key={sec.label || `sec-${i}`}>
                {sec.label && (
                  <Typography sx={{
                    display: 'block',
                    pl: '34px',
                    pt: i === 0 ? '3px' : '9px',
                    pb: '3px',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '.04em',
                    lineHeight: 1.4,
                    color: theme.palette.text.disabled,
                  }}>
                    {sec.label}
                  </Typography>
                )}
                {sec.items.map(item => (
                  <Box key={item.path || item.label}>
                    {row({
                      active: item.path ? isActive(item.path) : false,
                      depth: 1,
                      onClick: () => item.path && onNavigate(item.path),
                      icon: item.icon,
                      label: item.label,
                    })}
                  </Box>
                ))}
              </Box>
            ))}
          </Box>
        </Collapse>
      </Box>
    );
  };

  const renderModule = collapsed ? renderCollapsed : renderExpanded;

  return (
    <Box sx={{
      width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      bgcolor: theme.palette.background.paper,
      borderRight: `1px solid ${theme.palette.divider}`,
      transition: 'width .18s ease',
    }}>
      {/* ── Brand ───────────────────────────────────────────────────── */}
      <Box sx={{
        flexShrink: 0,
        px: collapsed ? '6px' : '12px',
        py: '11px',
        display: 'flex',
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}>
        {brand}
      </Box>

      {/* ── Modules ─────────────────────────────────────────────────── */}
      <Box sx={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        px: collapsed ? '6px' : '9px',
        pb: '6px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: collapsed ? 'center' : 'stretch',
        gap: collapsed ? '3px' : '1px',
      }}>
        {top.map(renderModule)}

        {bottom.length > 0 && (
          <>
            <Box sx={{ flex: 1, minHeight: '10px' }} />
            <Box sx={{
              width: collapsed ? 36 : '100%',
              height: '1px',
              bgcolor: theme.palette.divider,
              my: '5px',
              flexShrink: 0,
            }} />
            {bottom.map(renderModule)}
          </>
        )}
      </Box>

      {/* ── Status card + user block ────────────────────────────────── */}
      {!collapsed && status && (
        <Box sx={{ flexShrink: 0, px: '9px', pb: '8px' }}>{status}</Box>
      )}
      {footer && (
        <Box sx={{ flexShrink: 0, borderTop: `1px solid ${theme.palette.divider}` }}>
          {footer}
        </Box>
      )}
    </Box>
  );
}
