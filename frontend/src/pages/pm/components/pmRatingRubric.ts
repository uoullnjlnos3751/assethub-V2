// Quality/performance rating (1-5 stars) for PM checklists: device-category-specific
// rubric text + an auto-suggested score derived from the other checklist answers
// (physical_condition / speed_performance / pm_result). Shared by PMRunPage's
// single-run and bulk-run checklist forms.

export type RatingCategory = 'computer' | 'printer' | 'monitor' | 'mobile' | 'other';

export function getRatingCategory(assetType?: string | null): RatingCategory {
  const t = (assetType || '').toLowerCase();
  if (t.includes('printer') || t.includes('พิมพ์')) return 'printer';
  if (t.includes('monitor') || t.includes('จอ')) return 'monitor';
  if (t.includes('ipad') || t.includes('tablet') || t.includes('phone') || t.includes('มือถือ')) return 'mobile';
  if (t.includes('notebook') || t.includes('macbook') || t.includes('desktop') || t.includes('server') || t.includes('pc') || t.includes('คอมพิวเตอร์') || t.includes('it equipment')) return 'computer';
  return 'other';
}

export const RATING_RUBRIC: Record<RatingCategory, string[]> = {
  computer: [
    'รวดเร็วมาก ไม่มีปัญหาจุกจิก สภาพสมบูรณ์ 100%',
    'ทำงานได้ดี มีหน่วงเล็กน้อยเวลาเปิดหลายโปรแกรม',
    'ปานกลาง ช้าบ้างตามอายุการใช้งาน แต่ยังทำงานได้',
    'ช้ามาก มีอาการค้างบ่อยครั้ง กระทบต่อการทำงาน',
    'มีปัญหาหนัก ชำรุด หรือช้าจนทำงานไม่ได้ (พิจารณาเปลี่ยน)',
  ],
  printer: [
    'พิมพ์เร็ว คมชัด ไม่มีกระดาษติดเลย',
    'พิมพ์ได้ดี คุณภาพงานพิมพ์ปกติ นานๆ ครั้งกระดาษติด',
    'พิมพ์ช้าลง หรือคุณภาพงานพิมพ์เริ่มจาง/เพี้ยนสีบ้าง',
    'กระดาษติดบ่อย หรือคุณภาพงานพิมพ์แย่ลงชัดเจน',
    'พิมพ์ไม่ได้ หรือชำรุดจนกระทบงาน (พิจารณาเปลี่ยน/ส่งซ่อม)',
  ],
  monitor: [
    'ภาพคมชัด สีสันปกติ ไม่มีจุดเสีย ใช้งานได้สมบูรณ์',
    'ภาพปกติดี มีจุดสังเกตเล็กน้อย (เช่น ขอบจอ) ไม่กระทบการใช้งาน',
    'ภาพเริ่มมีปัญหาบ้าง เช่น สีเพี้ยน/กระพริบเป็นครั้งคราว',
    'ภาพมีปัญหาชัดเจน กระพริบถี่ หรือมีเส้น/จุดเสียรบกวนสายตา',
    'จอชำรุด ภาพไม่ติด หรือใช้งานไม่ได้ (พิจารณาเปลี่ยน)',
  ],
  mobile: [
    'แบตอึด ตอบสนองไว ไม่มีปัญหาการใช้งาน',
    'ใช้งานได้ดี แบตเสื่อมเล็กน้อยตามอายุการใช้งาน',
    'แบตเสื่อมพอสมควร หรือแอปเริ่มช้า/ค้างบ้าง',
    'แบตหมดเร็วมาก หรือค้าง/รีสตาร์ทเองบ่อยครั้ง',
    'เปิดไม่ติด หรือชำรุดจนใช้งานไม่ได้ (พิจารณาเปลี่ยน)',
  ],
  other: [
    'ทำงานได้สมบูรณ์ ไม่มีปัญหาใดๆ',
    'ทำงานได้ดี มีจุดสังเกตเล็กน้อยแต่ไม่กระทบการใช้งาน',
    'ทำงานได้ปานกลาง เริ่มมีอาการตามอายุการใช้งาน',
    'มีปัญหาการทำงานชัดเจน กระทบการใช้งาน',
    'ชำรุดหรือใช้งานไม่ได้ (พิจารณาเปลี่ยน/ส่งซ่อม)',
  ],
};

const CONDITION_SCORE: Record<string, number> = {
  'สภาพปกติ': 5, 'ชำรุดเล็กน้อย': 3.5, 'ชำรุดรอซ่อม': 2, 'หมดสภาพ': 1,
};
const SPEED_SCORE: Record<string, number> = {
  'เร็วปกติ': 5, 'เริ่มหน่วงหนืด': 3, 'ช้ามาก': 1,
};
const RESULT_SCORE: Record<string, number> = {
  'ผ่านเกณฑ์': 5, 'แก้ไขเรียบร้อย': 3.5, 'ไม่ผ่านเกณฑ์': 1.5,
};

// Never overwrites the admin's own pick — it's a suggestion, not a default.
export function suggestRating(answers: Record<string, any>): number | null {
  const scores: number[] = [];
  if (answers.physical_condition && CONDITION_SCORE[answers.physical_condition] != null) scores.push(CONDITION_SCORE[answers.physical_condition]);
  if (answers.speed_performance && SPEED_SCORE[answers.speed_performance] != null) scores.push(SPEED_SCORE[answers.speed_performance]);
  if (answers.pm_result && RESULT_SCORE[answers.pm_result] != null) scores.push(RESULT_SCORE[answers.pm_result]);
  if (scores.length === 0) return null;
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.min(5, Math.max(1, Math.round(avg)));
}
