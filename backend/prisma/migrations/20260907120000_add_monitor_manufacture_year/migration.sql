-- ปีที่ผลิตจอ อ่านได้จาก EDID ที่ Agent ส่งมาอยู่แล้ว (237 จาก 242 จอที่เห็น)
-- แต่ไม่มีที่เก็บ จึงถูกทิ้งทุกรอบ ใช้ประเมินอายุจอเพื่อวางแผนเปลี่ยนได้
ALTER TABLE "monitor_details" ADD COLUMN "manufactureYear" INTEGER;
