/**
 * Built-in views for the asset registry.
 *
 * These were nine separate sidebar entries — "คอมพิวเตอร์", "จอภาพ",
 * "เครื่องพิมพ์" and so on — that all opened the same /assets page with one
 * query parameter changed. Nine of the sixty-five menu items were not pages at
 * all, which is most of why the sidebar felt long.
 *
 * They ship with the app rather than living in the saved-views localStorage:
 * that store is personal and per-browser, so seeding it would have meant a new
 * user, or the same user on a second machine, silently losing the shortcuts
 * the menu used to guarantee.
 */

import { ReactNode } from 'react';

export interface PresetView {
  key: string;
  label: string;
  /** Query string applied to /assets — the same one the old menu entry used. */
  params: Record<string, string>;
  /** Restricted presets are hidden from roles that cannot use them. */
  roles?: string[];
  group: 'type' | 'status';
}

export const PRESET_VIEWS: PresetView[] = [
  { key: 'computers', label: 'คอมพิวเตอร์', params: { typeGroup: 'computers' }, group: 'type' },
  { key: 'monitors', label: 'จอภาพ', params: { typeGroup: 'monitors' }, group: 'type' },
  { key: 'printers', label: 'เครื่องพิมพ์', params: { typeGroup: 'printers' }, group: 'type' },
  { key: 'network', label: 'อุปกรณ์เครือข่าย', params: { typeGroup: 'network' }, group: 'type' },
  { key: 'phones', label: 'อุปกรณ์สื่อสาร', params: { typeGroup: 'phonesTablets' }, group: 'type' },
  { key: 'devices', label: 'อุปกรณ์ต่อพ่วง', params: { typeGroup: 'devices' }, group: 'type' },
  { key: 'rack', label: 'Rack & Infra', params: { typeGroup: 'rack' }, group: 'type' },
  { key: 'available', label: 'ของพร้อมยืม', params: { status: 'Available' }, group: 'status' },
  {
    key: 'custody-hr-trr',
    label: 'เครื่องที่ฝ่ายบุคคลรับฝาก',
    params: { custodyHolder: 'HR_TRR' },
    roles: ['SUPERADMIN', 'IT_ADMIN'],
    group: 'status',
  },
];

export const presetsFor = (role?: string) =>
  PRESET_VIEWS.filter(v => !v.roles || (role && v.roles.includes(role)));

/** True when the current query string is exactly this preset — used to tick it in the menu. */
export function isPresetActive(v: PresetView, search: URLSearchParams): boolean {
  const keys = Object.keys(v.params);
  if (!keys.length) return false;
  return keys.every(k => search.get(k) === v.params[k]);
}
