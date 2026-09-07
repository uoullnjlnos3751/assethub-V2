/**
 * Shared spreadsheet/download plumbing for report exports.
 *
 * Split out of pages/pm/pmExport.ts once the PM schedule page needed the same
 * BOM handling and column sizing — the encoding rules below are the kind of
 * thing that is silently wrong in one copy and right in the other.
 *
 * xlsx โหลดแบบ dynamic ตอนจะเขียนไฟล์จริงเท่านั้น ก้อนนี้ใหญ่ ~419 KB และคน
 * ส่วนใหญ่เปิดหน้ารายงานโดยไม่เคยกดส่งออกเลย การ import ที่หัวไฟล์จึงลากมันเข้า
 * ไปในทุกหน้าที่แตะโมดูลนี้ตั้งแต่เปิด
 */

type XlsxModule = typeof import('xlsx');
let xlsxPromise: Promise<XlsxModule> | null = null;
/** โหลดครั้งเดียวแล้วใช้ซ้ำ กดส่งออกรัว ๆ ก็ไม่ดึงซ้ำ */
const loadXlsx = () => (xlsxPromise ??= import('xlsx'));

export type Cell = string | number;
export type Rows = Cell[][];

export const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Column widths sized off the content so Thai text is not clipped in Excel. */
export function autoWidth(rows: Rows) {
  const widths: number[] = [];
  for (const row of rows) {
    row.forEach((cell, i) => {
      const len = String(cell ?? '').length;
      if (!widths[i] || widths[i] < len) widths[i] = len;
    });
  }
  return widths.map(w => ({ wch: Math.min(Math.max(w + 2, 10), 48) }));
}

/** Excel rejects sheet names over 31 chars or containing []:*?/\ */
export const sheetName = (label: string) =>
  label.replace(/[[\]:*?/\\]/g, ' ').slice(0, 31) || 'Sheet1';

function sheetForWith(XLSX: XlsxModule, rows: Rows) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = autoWidth(rows);
  return ws;
}

/** One sheet per entry, in order. */
export async function writeWorkbook(sheets: { name: string; rows: Rows }[], filename: string) {
  const XLSX = await loadXlsx();
  const wb = XLSX.utils.book_new();
  for (const s of sheets) XLSX.utils.book_append_sheet(wb, sheetForWith(XLSX, s.rows), sheetName(s.name));
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  triggerDownload(new Blob([out], { type: XLSX_MIME }), filename);
}

export function writeCsv(rows: Rows, filename: string) {
  const body = rows.map(row =>
    row.map(cell => {
      const v = cell === null || cell === undefined ? '' : String(cell);
      return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
    }).join(','),
  ).join('\r\n');
  // Excel on a Thai Windows install reads a BOM-less UTF-8 CSV as TIS-620 and
  // mangles every Thai column, so the BOM is not optional here.
  triggerDownload(new Blob([`﻿${body}`], { type: 'text/csv;charset=utf-8' }), filename);
}

/** yyyymmdd-hhmm, for report filenames. */
export function stamp() {
  const d = new Date();
  const z = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}-${z(d.getHours())}${z(d.getMinutes())}`;
}
