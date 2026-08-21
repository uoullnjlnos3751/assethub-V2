-- ปักหมุดที่ "ที่นั่งของคน" แทนที่จะปักทีละเครื่อง
--
-- ตารางเดิม floor_plan_pins ผูกหมุดกับ assetId ตรง ๆ ทำให้ต้นทุนการทำแผนผัง
-- โตตามจำนวน "อุปกรณ์" (733 ชิ้น) ไม่ใช่จำนวน "ที่นั่ง" และแผนผังจะพังทุกครั้ง
-- ที่มีการเปลี่ยนเครื่องให้พนักงาน — หมุดจะยังชี้ไปที่เครื่องเก่าที่ปลดไปแล้ว
-- ผลคือใช้งานจริงไม่ได้ ทั้งระบบมีหมุดอยู่ 1 จุด
--
-- ที่นั่งผูกกับ ownerName ซึ่งคอมพิวเตอร์ 99% และจอ 91% มีค่านี้อยู่แล้ว
-- อุปกรณ์จึงตามคนไปเองโดยไม่ต้องแก้แผนผัง เมื่อ IT เปลี่ยนผู้ครอบครองตอนส่งมอบ
--
-- floor_plan_pins ยังอยู่ต่อ ใช้กับอุปกรณ์ส่วนกลางที่ไม่มีเจ้าของ — เครื่องพิมพ์
-- มี ownerName แค่ 5% เพราะเป็นของใช้ร่วมกันจริง ๆ จึงต้องปักตำแหน่งเองเหมือนเดิม

CREATE TABLE IF NOT EXISTS "floor_plan_seats" (
    "id"           SERIAL       NOT NULL,
    "floorPlanId"  INTEGER      NOT NULL,
    "x"            DOUBLE PRECISION NOT NULL,
    "y"            DOUBLE PRECISION NOT NULL,
    -- รหัสที่นั่งตามที่หน้างานเรียก เช่น "22-A-05" ไม่บังคับ
    "label"        TEXT,
    -- กุญแจที่ทำให้อุปกรณ์ตามคนไป ตรงกับ assets."ownerName"
    "ownerName"    TEXT,
    "departmentId" TEXT,
    "note"         TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "floor_plan_seats_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "floor_plan_seats"
    ADD CONSTRAINT "floor_plan_seats_floorPlanId_fkey"
    FOREIGN KEY ("floorPlanId") REFERENCES "floor_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "floor_plan_seats_floorPlanId_idx" ON "floor_plan_seats"("floorPlanId");
-- ใช้ค้นว่า "คนนี้นั่งตรงไหน" จากหน้ารายละเอียดทรัพย์สิน
CREATE INDEX IF NOT EXISTS "floor_plan_seats_ownerName_idx"   ON "floor_plan_seats"("ownerName");

-- คนหนึ่งคนนั่งได้ที่เดียวต่อหนึ่งแปลน กันการปักซ้ำจนนับซ้ำ
CREATE UNIQUE INDEX IF NOT EXISTS "floor_plan_seats_plan_owner_key"
    ON "floor_plan_seats"("floorPlanId", "ownerName") WHERE "ownerName" IS NOT NULL;
