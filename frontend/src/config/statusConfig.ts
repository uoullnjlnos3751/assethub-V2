import React from 'react';
import {
  CheckCircle2, Clock, Wrench, Archive, PackageX, User, ShoppingCart,
  CheckCircle, RotateCcw, FileText, RefreshCw, CircleCheck, type LucideIcon,
} from 'lucide-react';
import type { Theme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';

/**
 * ── Central status configuration ───────────────────────────────────────────
 * Single source of truth for asset/borrow/PM status → label / icon / color.
 * Colors are semantic keys resolved against the active MUI theme palette, so
 * both light and dark mode render correctly. Consumers must NOT hardcode hex
 * for any status that appears here.
 *
 * Semantic mapping:
 *   success → Available / Approved / COMPLETED
 *   warning → Borrowed / Pending / IN_PROGRESS / PartiallyReturned
 *   error   → Maintenance / Lost / Rejected
 *   info    → InUse / CheckedOut
 *   neutral → Retired / Returned / DRAFT
 */

export type StatusColorKey = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'purple';

export interface StatusConfigEntry {
  /** Thai label (primary). */
  label: string;
  /** Optional English label for bilingual contexts. */
  labelEn?: string;
  icon: LucideIcon;
  colorKey: StatusColorKey;
}

export const STATUS_CONFIG: Record<string, StatusConfigEntry> = {
  // ── Asset statuses ───────────────────────────────────────────────────────
  Available:   { label: 'พร้อมใช้งาน',  labelEn: 'Available',   icon: CheckCircle2, colorKey: 'success' },
  Borrowed:    { label: 'กำลังยืม',     labelEn: 'Borrowed',    icon: Clock,        colorKey: 'warning' },
  InUse:       { label: 'ใช้งานประจำ',  labelEn: 'In Use',      icon: User,         colorKey: 'info' },
  Maintenance: { label: 'ซ่อมบำรุง',    labelEn: 'Maintenance', icon: Wrench,       colorKey: 'error' },
  Retired:     { label: 'ปลดระวาง',     labelEn: 'Retired',     icon: Archive,      colorKey: 'neutral' },
  Lost:        { label: 'สูญหาย',       labelEn: 'Lost',        icon: PackageX,     colorKey: 'error' },

  // ── Borrow request statuses ──────────────────────────────────────────────
  Pending:     { label: 'รออนุมัติ',          labelEn: 'Pending',            icon: Clock,        colorKey: 'warning' },
  Approved:    { label: 'อนุมัติแล้ว',         labelEn: 'Approved',           icon: CheckCircle,  colorKey: 'success' },
  Rejected:    { label: 'ไม่อนุมัติ',          labelEn: 'Rejected',           icon: PackageX,     colorKey: 'error' },

  // ── Borrow item statuses ─────────────────────────────────────────────────
  CheckedOut:        { label: 'จ่ายแล้ว',      labelEn: 'Checked Out',        icon: ShoppingCart, colorKey: 'info' },
  Returned:          { label: 'คืนแล้ว',        labelEn: 'Returned',           icon: RotateCcw,    colorKey: 'neutral' },
  PartiallyReturned: { label: 'คืนบางส่วน',    labelEn: 'Partially Returned', icon: RotateCcw,    colorKey: 'warning' },

  // ── PM run statuses ──────────────────────────────────────────────────────
  DRAFT:       { label: 'ร่าง',             labelEn: 'Draft',       icon: FileText, colorKey: 'neutral' },
  IN_PROGRESS: { label: 'กำลังดำเนินการ',    labelEn: 'In Progress', icon: RefreshCw, colorKey: 'warning' },
  COMPLETED:   { label: 'เสร็จสิ้น',         labelEn: 'Completed',   icon: CircleCheck, colorKey: 'success' },
};

/** Fallback used when a status string is not in the map. */
const DEFAULT_ENTRY: StatusConfigEntry = {
  label: '',
  icon: CircleCheck,
  colorKey: 'neutral',
};

// ── Color resolution ────────────────────────────────────────────────────────
function paletteColor(theme: Theme, key: StatusColorKey): string {
  switch (key) {
    case 'success': return theme.palette.success.main;
    case 'warning': return theme.palette.warning.main;
    case 'error':   return theme.palette.error.main;
    case 'info':    return (theme.palette as any).info?.main || '#0288d1';
    // Company scope / borrow, per the handoff's purple semantic color.
    case 'purple':  return theme.palette.secondary.main;
    case 'neutral':
    default:        return theme.palette.text.secondary;
  }
}

export interface StatusMeta {
  label: string;
  labelEn: string;
  Icon: LucideIcon;
  /** Solid foreground color resolved against the current theme. */
  color: string;
  /** Soft tinted background resolved against the current theme. */
  bg: string;
  /** Tinted border resolved against the current theme. */
  border: string;
}

/**
 * Resolve a status string into theme-aware display metadata.
 * Pass an optional custom label to override the Thai default.
 */
export function getStatusMeta(status: string, theme: Theme, customLabel?: string): StatusMeta {
  const entry = STATUS_CONFIG[status] ?? { ...DEFAULT_ENTRY, label: status };
  const color = paletteColor(theme, entry.colorKey);
  return {
    label: customLabel ?? entry.label,
    labelEn: entry.labelEn ?? entry.label,
    Icon: entry.icon,
    color,
    // Handoff "Chip สถานะ": background rgba(color,.1) · border rgba(color,.35)
    bg: alpha(color, 0.10),
    border: alpha(color, 0.35),
  };
}

/** Resolve just the semantic color key for a status (no theme needed). */
export function getStatusColorKey(status: string): StatusColorKey {
  return (STATUS_CONFIG[status] ?? DEFAULT_ENTRY).colorKey;
}

/** Resolve the lucide icon component for a status. */
export function getStatusIcon(status: string): LucideIcon {
  return (STATUS_CONFIG[status] ?? DEFAULT_ENTRY).icon;
}

/** Resolve the Thai label for a status, optionally overridden. */
export function getStatusLabel(status: string, customLabel?: string): string {
  const entry = STATUS_CONFIG[status] ?? DEFAULT_ENTRY;
  return customLabel ?? entry.label;
}

/** Convenience: list of asset-status keys for iteration (filter ribbons etc.). */
export const ASSET_STATUSES = ['Available', 'Borrowed', 'InUse', 'Maintenance', 'Retired', 'Lost'] as const;
