import {
  PLAN_STATE_LABEL, SchedPlan, SchedSelection, groupState, pct, rollup, schedScopeBits,
} from './pmSchedule';
import { Rows, stamp, writeCsv, writeWorkbook } from '../../utils/spreadsheet';

/**
 * Schedule exports.
 *
 * Built from the same rollup()/groupState() the two Gantt charts render from,
 * so a printed roll-up and an exported roll-up cannot disagree — including the
 * "worst plan wins" rule, which is the one people would otherwise recompute by
 * hand as an average and get wrong.
 */

export type SchedReportKey = 'company' | 'dept' | 'plans';

export interface SchedReport {
  key: SchedReportKey;
  label: string;
  rows: Rows;
}

const headerBlock = (year: number, sel: SchedSelection, today: Date, title: string): Rows => {
  const bits = schedScopeBits(sel);
  return [
    [`กำหนดการ PM ปีงบประมาณ ${year + 543}`, title],
    ['ขอบเขต', bits.length ? bits.join(' | ') : 'ทุกบริษัท ทุกแผนก ทุกสถานะ'],
    ['ข้อมูล ณ', today.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })],
    ['ส่งออกเมื่อ', new Date().toLocaleString('th-TH')],
    [],
  ];
};

export function buildScheduleReports(
  year: number, plans: SchedPlan[], sel: SchedSelection, today: Date,
): SchedReport[] {
  const head = (t: string) => headerBlock(year, sel, today, t);

  const companies = rollup(plans, 'company');
  const companyRows: Rows = [
    ...head('สรุปรายบริษัท'),
    ['บริษัท', 'จำนวนแผน', 'เป้าหมาย (เครื่อง)', 'สร้างงานแล้ว', 'ทำเสร็จ', 'คงเหลือ', '% คืบหน้า',
      'เริ่ม', 'สิ้นสุด', 'สถานะรวม', 'แผนที่เกินกำหนด'],
    ...companies.map(g => [
      g.name, g.plans.length, g.target, g.total, g.done, g.total - g.done, `${pct(g.done, g.total)}%`,
      g.start, g.end, PLAN_STATE_LABEL[groupState(g)],
      g.plans.filter(p => p.state === 'OVERDUE').length,
    ]),
  ];

  // Departments are listed under their company so the sheet mirrors the chart.
  const deptRows: Rows = [
    ...head('สรุปรายแผนก'),
    ['บริษัท', 'แผนก', 'จำนวนแผน', 'เป้าหมาย (เครื่อง)', 'สร้างงานแล้ว', 'ทำเสร็จ', 'คงเหลือ',
      '% คืบหน้า', 'เริ่ม', 'สิ้นสุด', 'สถานะ'],
  ];
  for (const co of companies) {
    for (const dp of rollup(co.plans, 'dept')) {
      deptRows.push([
        co.name, dp.name, dp.plans.length, dp.target, dp.total, dp.done, dp.total - dp.done,
        `${pct(dp.done, dp.total)}%`, dp.start, dp.end, PLAN_STATE_LABEL[groupState(dp)],
      ]);
    }
  }

  const planRows: Rows = [
    ...head('รายแผน'),
    ['รหัสแผน', 'บริษัท', 'แผนก', 'สถานที่', 'ประเภทอุปกรณ์', 'ผู้รับผิดชอบ',
      'เป้าหมาย (เครื่อง)', 'สร้างงานแล้ว', 'ทำเสร็จ', 'คงเหลือ', '% คืบหน้า',
      'เริ่ม', 'สิ้นสุด', 'จำนวนวัน', 'สถานะ'],
    ...[...plans]
      .sort((a, b) => (a.start! < b.start! ? -1 : a.start! > b.start! ? 1 : a.id - b.id))
      .map(p => {
        const days = p.start && p.end
          ? Math.round((new Date(`${p.end}T00:00:00`).getTime() - new Date(`${p.start}T00:00:00`).getTime()) / 86_400_000) + 1
          : '';
        return [
          p.id, p.company, p.dept, p.site || '', p.deviceType || '', p.lead || '',
          p.target, p.total, p.done, p.total - p.done, `${pct(p.done, p.total)}%`,
          p.start || '', p.end || '', days, PLAN_STATE_LABEL[p.state],
        ];
      }),
  ];

  return [
    { key: 'company', label: 'สรุปรายบริษัท', rows: companyRows },
    { key: 'dept', label: 'สรุปรายแผนก', rows: deptRows },
    { key: 'plans', label: 'รายแผน', rows: planRows },
  ];
}

export function exportScheduleWorkbook(
  year: number, plans: SchedPlan[], sel: SchedSelection, today: Date,
) {
  writeWorkbook(
    buildScheduleReports(year, plans, sel, today).map(r => ({ name: r.label, rows: r.rows })),
    `PM-schedule-${year + 543}-${stamp()}.xlsx`,
  );
}

export function exportScheduleCsv(
  year: number, plans: SchedPlan[], sel: SchedSelection, today: Date, key: SchedReportKey,
) {
  const rep = buildScheduleReports(year, plans, sel, today).find(r => r.key === key)!;
  writeCsv(rep.rows, `PM-schedule-${key}-${stamp()}.csv`);
}
