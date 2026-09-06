import {
  CoveragePayload, Selection, SourceMode, STATE_LABEL, filterPlans, filterRows,
  groupBy, pct, planStatus, scopeBits, stateUnder, statesFor, tally,
} from './pmCoverage';
import { Rows, stamp, writeCsv, writeWorkbook } from '../../utils/spreadsheet';

/**
 * PM report exports.
 *
 * Every sheet is built from the same helpers the on-screen charts use
 * (pmCoverage.ts), so an exported number and a rendered number cannot drift —
 * including the source mode, so a workbook taken while "PM ตามแผน" is active
 * contains scheduled-PM figures and says so in its header.
 */

export type ReportKey = 'summary' | 'company' | 'type' | 'gap' | 'all' | 'plans';

export interface ReportDef {
  key: ReportKey;
  label: string;
  group: 'exec' | 'ops';
  /** Data rows (excluding the header block), for the "N แถว" hint in the menu. */
  count: (data: CoveragePayload, sel: Selection, mode: SourceMode) => number;
  build: (data: CoveragePayload, sel: Selection, mode: SourceMode) => (string | number)[][];
}

const headerBlock = (
  data: CoveragePayload, sel: Selection, mode: SourceMode, title: string,
): (string | number)[][] => {
  const bits = scopeBits(sel, mode);
  return [
    [`รายงาน PM ปีงบประมาณ ${data.year + 543}`, title],
    ['ขอบเขต', bits.length ? bits.join(' | ') : 'ทุกบริษัท ทุกประเภทอุปกรณ์ ทุกสถานะ'],
    ['ส่งออกเมื่อ', new Date().toLocaleString('th-TH')],
    [],
  ];
};

/** Column header for the third bucket, which is worded per source mode. */
const gapLabel = (mode: SourceMode) => statesFor(mode)[2].label;

export const REPORTS: ReportDef[] = [
  {
    key: 'summary',
    label: 'สรุปภาพรวม',
    group: 'exec',
    count: () => 7,
    build: (data, sel, mode) => {
      const t = tally(filterRows(data.rows, sel, 'state', mode), mode);
      const covered = t.DONE + t.PENDING;
      return [
        ...headerBlock(data, sel, mode, 'สรุปภาพรวม'),
        ['รายการ', 'จำนวน (เครื่อง)', 'สัดส่วน'],
        ['เครื่องที่เข้าเกณฑ์ PM ทั้งหมด', t.total, '100%'],
        ['มีงาน PM แล้ว', covered, `${pct(covered, t.total)}%`],
        ['   - ทำ PM เสร็จแล้ว', t.DONE, `${pct(t.DONE, t.total)}%`],
        ['   - รอทำ', t.PENDING, `${pct(t.PENDING, t.total)}%`],
        [gapLabel(mode), t.UNPLANNED, `${pct(t.UNPLANNED, t.total)}%`],
        [],
        ['ความคืบหน้าเฉพาะที่มีงานแล้ว', `${t.DONE}/${covered}`, `${pct(t.DONE, covered)}%`],
      ];
    },
  },
  {
    key: 'company',
    label: 'แยกตามบริษัท',
    group: 'exec',
    count: (data, sel, mode) => groupBy(data.rows, sel, 'c', 'company', mode).length,
    build: (data, sel, mode) => [
      ...headerBlock(data, sel, mode, 'แยกตามบริษัท'),
      ['บริษัท', 'ทำ PM เสร็จแล้ว', 'รอทำ', gapLabel(mode), 'รวม', '% ครอบคลุม'],
      ...groupBy(data.rows, sel, 'c', 'company', mode).map(g =>
        [g.name, g.DONE, g.PENDING, g.UNPLANNED, g.total, `${pct(g.DONE + g.PENDING, g.total)}%`]),
    ],
  },
  {
    key: 'type',
    label: 'แยกตามประเภทอุปกรณ์',
    group: 'exec',
    count: (data, sel, mode) => groupBy(data.rows, sel, 't', 'type', mode).length,
    build: (data, sel, mode) => [
      ...headerBlock(data, sel, mode, 'แยกตามประเภทอุปกรณ์'),
      ['ประเภทอุปกรณ์', 'ทำ PM เสร็จแล้ว', 'รอทำ', gapLabel(mode), 'รวม', '% ครอบคลุม'],
      ...groupBy(data.rows, sel, 't', 'type', mode).map(g =>
        [g.name, g.DONE, g.PENDING, g.UNPLANNED, g.total, `${pct(g.DONE + g.PENDING, g.total)}%`]),
    ],
  },
  {
    key: 'gap',
    label: 'รายชื่อเครื่องที่ยังไม่ได้สร้างแผน',
    group: 'ops',
    count: (data, sel, mode) =>
      filterRows(data.rows, sel, null, mode).filter(r => stateUnder(r, mode) === 'UNPLANNED').length,
    build: (data, sel, mode) => [
      ...headerBlock(data, sel, mode, `รายชื่อเครื่อง: ${gapLabel(mode)}`),
      ['รหัสทรัพย์สิน', 'Serial No.', 'ประเภท', 'บริษัท', 'แผนก', 'สถานที่', 'ผู้ครอบครอง'],
      ...filterRows(data.rows, sel, null, mode)
        .filter(r => stateUnder(r, mode) === 'UNPLANNED')
        .map(r => [r.a, r.n, r.t, r.c, r.d, r.l, r.o]),
    ],
  },
  {
    key: 'all',
    label: 'รายการเครื่องทั้งหมด พร้อมสถานะ PM',
    group: 'ops',
    count: (data, sel, mode) => filterRows(data.rows, sel, null, mode).length,
    build: (data, sel, mode) => [
      ...headerBlock(data, sel, mode, 'รายการเครื่องทั้งหมด พร้อมสถานะ PM'),
      ['รหัสทรัพย์สิน', 'Serial No.', 'ประเภท', 'บริษัท', 'แผนก', 'สถานที่', 'ผู้ครอบครอง',
        'สถานะ PM', 'จากแผนตามกำหนด', 'จากงานนอกแผน'],
      ...filterRows(data.rows, sel, null, mode).map(r => [
        r.a, r.n, r.t, r.c, r.d, r.l, r.o,
        mode === 'ALL' ? STATE_LABEL[r.s] : STATE_LABEL[stateUnder(r, mode)],
        r.sp ? STATE_LABEL[r.sp] : '—',
        r.sa ? STATE_LABEL[r.sa] : '—',
      ]),
    ],
  },
  {
    key: 'plans',
    label: 'รายละเอียดแผน PM',
    group: 'ops',
    count: (data, sel, mode) => filterPlans(data.plans, sel, mode).length,
    build: (data, sel, mode) => {
      const plans = filterPlans(data.plans, sel, mode);
      const t = tally(filterRows(data.rows, sel, null, mode), mode);
      const touched = t.DONE + t.PENDING;
      // An empty plan list is ambiguous — it can mean "no PM here" or "PM
      // happened outside any plan". Say which, rather than exporting a
      // bare header.
      const caveat: (string | number)[][] = (!plans.length && touched > 0)
        ? [['หมายเหตุ', `ไม่มีแผนที่ผูกกับขอบเขตนี้ แต่มี ${touched} เครื่องที่มีงาน PM แล้ว ` +
            '(มาจากงานนอกแผนหรือแผนที่ไม่ระบุบริษัท)'], []]
        : [];
      return [
        ...headerBlock(data, sel, mode, 'รายละเอียดแผน PM'),
        ...caveat,
        ['แผน', 'ชนิดแผน', 'บริษัท', 'ประเภท', 'ผู้รับผิดชอบ', 'เป้าหมาย', 'สร้างงานแล้ว',
          'ทำเสร็จ', '% คืบหน้า', 'วันเริ่ม', 'วันสิ้นสุด', 'สถานะ'],
        ...plans.map(p => [
          p.dept || p.site || `แผน #${p.id}`,
          p.isAdhoc ? 'นอกแผน' : 'ตามแผน',
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

/** Mode goes in the filename so two exports taken minutes apart stay distinguishable. */
const modeTag = (mode: SourceMode) => (mode === 'ALL' ? '' : `-${mode.toLowerCase()}`);

/** One .xlsx holding every report as its own sheet. */
export function exportWorkbook(data: CoveragePayload, sel: Selection, mode: SourceMode) {
  void writeWorkbook(
    REPORTS.map(rep => ({ name: rep.label, rows: rep.build(data, sel, mode) as Rows })),
    `PM-report-${data.year + 543}${modeTag(mode)}-${stamp()}.xlsx`,
  );
}

export function exportSheet(data: CoveragePayload, sel: Selection, mode: SourceMode, key: ReportKey) {
  const rep = reportByKey(key);
  void writeWorkbook([{ name: rep.label, rows: rep.build(data, sel, mode) as Rows }],
    `PM-${key}${modeTag(mode)}-${stamp()}.xlsx`);
}

export function exportCsv(data: CoveragePayload, sel: Selection, mode: SourceMode, key: ReportKey) {
  const rep = reportByKey(key);
  writeCsv(rep.build(data, sel, mode) as Rows, `PM-${key}${modeTag(mode)}-${stamp()}.csv`);
}
