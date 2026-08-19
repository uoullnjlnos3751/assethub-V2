import * as XLSX from 'xlsx';
import {
  CoveragePayload, Selection, STATE_LABEL, filterRows, filterPlans, groupBy,
  planStatus, pct, scopeBits, tally,
} from './pmCoverage';

/**
 * PM report exports.
 *
 * Every sheet is built from the same helpers the on-screen charts use
 * (pmCoverage.ts), so an exported number and a rendered number cannot drift.
 * Each report carries a small header block naming the filters that produced
 * it — a spreadsheet that does not say what it was filtered by is unreadable
 * a week later.
 */

export type ReportKey = 'summary' | 'company' | 'type' | 'gap' | 'all' | 'plans';

export interface ReportDef {
  key: ReportKey;
  label: string;
  group: 'exec' | 'ops';
  /** Data rows (excluding the header block), for the "N แถว" hint in the menu. */
  count: (data: CoveragePayload, sel: Selection) => number;
  build: (data: CoveragePayload, sel: Selection) => (string | number)[][];
}

const headerBlock = (data: CoveragePayload, sel: Selection, title: string): (string | number)[][] => {
  const bits = scopeBits(sel);
  return [
    [`รายงาน PM ปีงบประมาณ ${data.year + 543}`, title],
    ['ขอบเขต', bits.length ? bits.join(' | ') : 'ทุกบริษัท ทุกประเภทอุปกรณ์ ทุกสถานะ'],
    ['ส่งออกเมื่อ', new Date().toLocaleString('th-TH')],
    [],
  ];
};

export const REPORTS: ReportDef[] = [
  {
    key: 'summary',
    label: 'สรุปภาพรวม',
    group: 'exec',
    count: () => 7,
    build: (data, sel) => {
      const t = tally(filterRows(data.rows, sel, 'state'));
      const planned = t.DONE + t.PENDING;
      return [
        ...headerBlock(data, sel, 'สรุปภาพรวม'),
        ['รายการ', 'จำนวน (เครื่อง)', 'สัดส่วน'],
        ['เครื่องที่เข้าเกณฑ์ PM ทั้งหมด', t.total, '100%'],
        ['สร้างแผนแล้ว', planned, `${pct(planned, t.total)}%`],
        ['   - ทำ PM เสร็จแล้ว', t.DONE, `${pct(t.DONE, t.total)}%`],
        ['   - อยู่ในแผน รอทำ', t.PENDING, `${pct(t.PENDING, t.total)}%`],
        ['ยังไม่ได้สร้างแผน', t.UNPLANNED, `${pct(t.UNPLANNED, t.total)}%`],
        [],
        ['ความคืบหน้าเฉพาะที่อยู่ในแผน', `${t.DONE}/${planned}`, `${pct(t.DONE, planned)}%`],
      ];
    },
  },
  {
    key: 'company',
    label: 'แยกตามบริษัท',
    group: 'exec',
    count: (data, sel) => groupBy(data.rows, sel, 'c', 'company').length,
    build: (data, sel) => [
      ...headerBlock(data, sel, 'แยกตามบริษัท'),
      ['บริษัท', 'ทำ PM เสร็จแล้ว', 'อยู่ในแผน รอทำ', 'ยังไม่ได้สร้างแผน', 'รวม', '% ครอบคลุม'],
      ...groupBy(data.rows, sel, 'c', 'company').map(g =>
        [g.name, g.DONE, g.PENDING, g.UNPLANNED, g.total, `${pct(g.DONE + g.PENDING, g.total)}%`]),
    ],
  },
  {
    key: 'type',
    label: 'แยกตามประเภทอุปกรณ์',
    group: 'exec',
    count: (data, sel) => groupBy(data.rows, sel, 't', 'type').length,
    build: (data, sel) => [
      ...headerBlock(data, sel, 'แยกตามประเภทอุปกรณ์'),
      ['ประเภทอุปกรณ์', 'ทำ PM เสร็จแล้ว', 'อยู่ในแผน รอทำ', 'ยังไม่ได้สร้างแผน', 'รวม', '% ครอบคลุม'],
      ...groupBy(data.rows, sel, 't', 'type').map(g =>
        [g.name, g.DONE, g.PENDING, g.UNPLANNED, g.total, `${pct(g.DONE + g.PENDING, g.total)}%`]),
    ],
  },
  {
    key: 'gap',
    label: 'รายชื่อเครื่องที่ยังไม่ได้สร้างแผน',
    group: 'ops',
    count: (data, sel) => filterRows(data.rows, sel, null).filter(r => r.s === 'UNPLANNED').length,
    build: (data, sel) => [
      ...headerBlock(data, sel, 'รายชื่อเครื่องที่ยังไม่ได้สร้างแผน PM'),
      ['รหัสทรัพย์สิน', 'Serial No.', 'ประเภท', 'บริษัท', 'แผนก', 'สถานที่', 'ผู้ครอบครอง'],
      ...filterRows(data.rows, sel, null)
        .filter(r => r.s === 'UNPLANNED')
        .map(r => [r.a, r.n, r.t, r.c, r.d, r.l, r.o]),
    ],
  },
  {
    key: 'all',
    label: 'รายการเครื่องทั้งหมด พร้อมสถานะ PM',
    group: 'ops',
    count: (data, sel) => filterRows(data.rows, sel, null).length,
    build: (data, sel) => [
      ...headerBlock(data, sel, 'รายการเครื่องทั้งหมด พร้อมสถานะ PM'),
      ['รหัสทรัพย์สิน', 'Serial No.', 'ประเภท', 'บริษัท', 'แผนก', 'สถานที่', 'ผู้ครอบครอง', 'สถานะ PM'],
      ...filterRows(data.rows, sel, null)
        .map(r => [r.a, r.n, r.t, r.c, r.d, r.l, r.o, STATE_LABEL[r.s]]),
    ],
  },
  {
    key: 'plans',
    label: 'รายละเอียดแผน PM',
    group: 'ops',
    count: (data, sel) => filterPlans(data.plans, sel).length,
    build: (data, sel) => {
      const plans = filterPlans(data.plans, sel);
      const t = tally(filterRows(data.rows, sel, null));
      const touched = t.DONE + t.PENDING;
      // An empty plan list is ambiguous — it can mean "no PM here" or "PM
      // happened outside any plan". Say which, rather than exporting a
      // bare header.
      const caveat: (string | number)[][] = (!plans.length && touched > 0)
        ? [['หมายเหตุ', `ไม่มีแผนที่ผูกกับขอบเขตนี้ แต่มี ${touched} เครื่องที่มีงาน PM แล้ว ` +
            '(มาจากงานนอกแผนหรือแผนที่ไม่ระบุบริษัท)'], []]
        : [];
      return [
        ...headerBlock(data, sel, 'รายละเอียดแผน PM'),
        ...caveat,
        ['แผน', 'บริษัท', 'ประเภท', 'ผู้รับผิดชอบ', 'เป้าหมาย', 'สร้างงานแล้ว', 'ทำเสร็จ',
          '% คืบหน้า', 'วันเริ่ม', 'วันสิ้นสุด', 'สถานะ'],
        ...plans.map(p => [
          p.dept || p.site || `แผน #${p.id}`,
          p.company || '', p.deviceType || '', p.lead || '',
          p.planned, p.generated, p.done, `${pct(p.done, p.generated || p.planned)}%`,
          p.startDate ? p.startDate.slice(0, 10) : '',
          p.endDate ? p.endDate.slice(0, 10) : '',
          planStatus(p).label,
        ]),
      ];
    },
  },
];

export const reportByKey = (key: ReportKey) => REPORTS.find(r => r.key === key)!;

const stamp = () => {
  const d = new Date();
  const z = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}-${z(d.getHours())}${z(d.getMinutes())}`;
};

function triggerDownload(blob: Blob, filename: string) {
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
function autoWidth(rows: (string | number)[][]) {
  const widths: number[] = [];
  for (const row of rows) {
    row.forEach((cell, i) => {
      const len = String(cell ?? '').length;
      if (!widths[i] || widths[i] < len) widths[i] = len;
    });
  }
  return widths.map(w => ({ wch: Math.min(Math.max(w + 2, 10), 48) }));
}

/** One .xlsx holding every report as its own sheet. */
export function exportWorkbook(data: CoveragePayload, sel: Selection) {
  const wb = XLSX.utils.book_new();
  for (const rep of REPORTS) {
    const rows = rep.build(data, sel);
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = autoWidth(rows);
    // Sheet names cannot exceed 31 chars or contain []:*?/\ — the report
    // labels are Thai prose, so they get trimmed rather than trusted.
    const name = rep.label.replace(/[[\]:*?/\\]/g, ' ').slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  triggerDownload(
    new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `PM-report-${data.year + 543}-${stamp()}.xlsx`,
  );
}

export function exportSheet(data: CoveragePayload, sel: Selection, key: ReportKey) {
  const rep = reportByKey(key);
  const rows = rep.build(data, sel);
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = autoWidth(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, rep.label.replace(/[[\]:*?/\\]/g, ' ').slice(0, 31));
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  triggerDownload(
    new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `PM-${key}-${stamp()}.xlsx`,
  );
}

export function exportCsv(data: CoveragePayload, sel: Selection, key: ReportKey) {
  const rep = reportByKey(key);
  const body = rep.build(data, sel).map(row =>
    row.map(cell => {
      const v = cell === null || cell === undefined ? '' : String(cell);
      return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
    }).join(','),
  ).join('\r\n');
  // Excel on a Thai Windows install reads a BOM-less UTF-8 CSV as TIS-620 and
  // mangles every Thai column, so the BOM is not optional here.
  triggerDownload(
    new Blob([`﻿${body}`], { type: 'text/csv;charset=utf-8' }),
    `PM-${key}-${stamp()}.csv`,
  );
}
