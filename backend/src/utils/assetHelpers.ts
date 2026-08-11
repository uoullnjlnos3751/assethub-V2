export const cleanMasterValue = (value: unknown) => {
  const text = String(value ?? '').trim();
  if (!text || text === '-' || text === '#N/A' || text === '0') return '';
  return text;
};

export const calculateAssetAge = (purchaseDate?: Date | string | null) => {
  if (!purchaseDate) return null;
  const purchased = new Date(purchaseDate);
  if (Number.isNaN(purchased.getTime())) return null;
  const today = new Date();
  let years = today.getFullYear() - purchased.getFullYear();
  const monthDiff = today.getMonth() - purchased.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < purchased.getDate())) years -= 1;
  return Math.max(years, 0);
};

export const withCalculatedAge = <T extends { purchaseDate?: Date | null }>(asset: T) => ({
  ...asset,
  age: calculateAssetAge(asset.purchaseDate),
});

export const withCalculatedWarranty = <T extends { warrantyEndDate?: Date | null }>(asset: T) => ({
  ...asset,
  warrantyDaysLeft: asset.warrantyEndDate
    ? Math.max(0, Math.round((new Date(asset.warrantyEndDate).getTime() - Date.now()) / 86400000))
    : null,
});

export const parseDate = (val: unknown): Date | null => {
  if (!val) return null;
  if (val instanceof Date) return Number.isNaN(val.getTime()) ? null : val;
  const s = String(val).trim();
  if (!s) return null;

  let d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d;

  const parts = s.split(/[\/\-]/);
  if (parts.length === 3) {
    const d1 = parseInt(parts[0]);
    const m1 = parseInt(parts[1]) - 1;
    let y1 = parseInt(parts[2]);
    if (y1 < 100) y1 += 2000;
    if (y1 > 2400) y1 -= 543;
    d = new Date(y1, m1, d1);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
};
