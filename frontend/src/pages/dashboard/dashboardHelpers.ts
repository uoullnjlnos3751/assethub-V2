export function now() {
  return new Date().toLocaleDateString('th-TH', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}
export function pct(a: number, b: number) {
  return b > 0 ? Math.round((a / b) * 100) : 0;
}
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'เมื่อสักครู่';
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ชั่วโมงที่แล้ว`;
  const d = Math.floor(h / 24);
  return `${d} วันที่แล้ว`;
}
export const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

// ── Status config (theme-aware via getStatusMeta) ──────────────────────────
export const STATUS_CFG: Record<string, { label: string; colorKey: 'success' | 'warning' | 'error' | 'info' | 'neutral' }> = {
  Available:   { label: 'พร้อมใช้งาน', colorKey: 'success' },
  Borrowed:    { label: 'กำลังยืม',    colorKey: 'warning' },
  InUse:       { label: 'ใช้งานประจำ', colorKey: 'info' },
  Maintenance: { label: 'ซ่อมบำรุง',  colorKey: 'error' },
  Retired:     { label: 'ปลดระวาง',   colorKey: 'neutral' },
  Lost:        { label: 'สูญหาย',     colorKey: 'error' },
};

export function statusColor(theme: any, key: string): string {
  const cfg = STATUS_CFG[key] || { colorKey: 'neutral' };
  const map: Record<string, string> = {
    success: theme.palette.success.main,
    warning: theme.palette.warning.main,
    error: theme.palette.error.main,
    info: theme.palette.info?.main || '#0288d1',
    neutral: theme.palette.text.secondary,
  };
  return map[(cfg as any).colorKey] || theme.palette.text.secondary;
}

export const CAT_COLORS = ['#005ab4', '#964400', '#0a73e0', '#465f88', '#ba1a1a', '#bd5700', '#2e7d32'];
