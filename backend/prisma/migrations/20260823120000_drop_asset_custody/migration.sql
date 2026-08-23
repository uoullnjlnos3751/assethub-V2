-- เลิกใช้แนวคิดจุดรับฝาก
--
-- คอลัมน์ชุดนี้เพิ่มไว้เมื่อ 20260819 เพื่อเก็บว่าเครื่องถูกฝากไว้ที่จุดไหน
-- ตอนนี้ตัดสินใจไม่ทำฟีเจอร์นี้แล้ว จึงลบออกแทนที่จะทิ้งคอลัมน์ว่างไว้ให้เข้าใจผิด
--
-- ข้อความที่เคยอยู่ใน custodyNote ถูกคืนกลับไปที่ assets."ownerName" เรียบร้อยแล้ว
-- ก่อนรัน migration นี้ (ดู scripts/revert-custody-backfill.ts) — ทั้ง 81 รายการ
-- รวมถึงคำบอกอาการเสียอย่าง "จอเสีย" ที่คนจดไว้ ไม่มีอะไรหายไปกับการลบคอลัมน์
--
-- แถวประวัติ CUSTODY_CHANGE ใน asset_history ยังอยู่ครบและไม่ถูกลบ — เป็นบันทึก
-- ว่าเคยเกิดอะไรขึ้นจริง การลบร่องรอยการแก้ข้อมูลย้อนหลังทิ้งแย่กว่าการเก็บไว้
--
-- ค่า HR_CUSTODY ใน enum "UserRole" ก็ไม่ถูกลบเช่นกัน ไม่มีผู้ใช้คนไหนถือบทบาทนี้
-- และการลบค่าออกจาก enum ของ Postgres ต้องสร้าง type ใหม่ทั้งก้อนแล้วย้ายคอลัมน์
-- ตาม ซึ่งเสี่ยงเกินกว่าประโยชน์ โค้ดฝั่งแอปไม่รับค่านี้แล้วจึงเลือกไม่ได้อยู่ดี

DROP INDEX IF EXISTS "assets_custodyHolder_idx";

ALTER TABLE "assets" DROP COLUMN IF EXISTS "custodyHolder";
ALTER TABLE "assets" DROP COLUMN IF EXISTS "custodyNote";
ALTER TABLE "assets" DROP COLUMN IF EXISTS "custodyUpdatedAt";
ALTER TABLE "assets" DROP COLUMN IF EXISTS "custodyUpdatedById";
