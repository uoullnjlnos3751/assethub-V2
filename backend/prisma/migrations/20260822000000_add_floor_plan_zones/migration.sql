-- โซนแผนกและตารางโต๊ะ ทำให้ที่นั่งมีที่ให้เกาะแทนการลอยอยู่บนพิกัดดิบ
--
-- แบบเดิมที่นั่งเก็บแค่ x,y เป็นเปอร์เซ็นต์ของรูป ซึ่งไม่มีโครงสร้างอะไรกำกับเลย
-- สองที่นั่งวางทับกันสนิทได้ ขนาดไอคอนไม่มีระยะร่วม และบอกตำแหน่งกันไม่ได้
-- นอกจากชี้ว่า "จุดแถวบนซ้าย"
--
-- โซนหนึ่งประกาศ cols x rows แล้วระบบสร้างช่องโต๊ะให้เอง ที่นั่งผูกกับ
-- (zoneId, deskIndex) หนึ่งโต๊ะจึงรับได้คนเดียวโดยโครงสร้าง ไม่ต้องคอยระวัง
--
-- x,y ของที่นั่งยังอยู่ต่อ เพราะที่นั่งที่ยังไม่ได้เข้าตารางต้องวางอิสระได้
-- และเมื่อเข้าตารางแล้วค่าที่คำนวณได้จะถูกเขียนกลับลงไปด้วย ของเดิมที่อ่าน x,y
-- ตรง ๆ จึงยังทำงานได้เหมือนเดิม

CREATE TABLE IF NOT EXISTS "floor_plan_zones" (
    "id"          SERIAL       NOT NULL,
    "floorPlanId" INTEGER      NOT NULL,
    -- รหัสแผนกตามที่ใช้ในทะเบียน เช่น ACC FIN — ใช้ตั้งรหัสโต๊ะ "ACC-07"
    "code"        TEXT         NOT NULL,
    "name"        TEXT,
    "color"       TEXT,
    -- กรอบโซนเป็น % ของรูปแปลน เหมือนที่นั่ง
    "x"           DOUBLE PRECISION NOT NULL,
    "y"           DOUBLE PRECISION NOT NULL,
    "w"           DOUBLE PRECISION NOT NULL,
    "h"           DOUBLE PRECISION NOT NULL,
    "cols"        INTEGER      NOT NULL DEFAULT 1,
    "rows"        INTEGER      NOT NULL DEFAULT 1,
    "sortOrder"   INTEGER      NOT NULL DEFAULT 0,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "floor_plan_zones_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "floor_plan_zones"
    ADD CONSTRAINT "floor_plan_zones_floorPlanId_fkey"
    FOREIGN KEY ("floorPlanId") REFERENCES "floor_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "floor_plan_zones_floorPlanId_idx" ON "floor_plan_zones"("floorPlanId");
CREATE UNIQUE INDEX IF NOT EXISTS "floor_plan_zones_plan_code_key" ON "floor_plan_zones"("floorPlanId", "code");

-- ที่นั่งเกาะช่องโต๊ะ
ALTER TABLE "floor_plan_seats" ADD COLUMN IF NOT EXISTS "zoneId"    INTEGER;
ALTER TABLE "floor_plan_seats" ADD COLUMN IF NOT EXISTS "deskIndex" INTEGER;

-- ลบโซนแล้วที่นั่งต้องไม่หายไปด้วย แค่หลุดกลับไปเป็นหมุดอิสระที่พิกัดเดิม
ALTER TABLE "floor_plan_seats"
    ADD CONSTRAINT "floor_plan_seats_zoneId_fkey"
    FOREIGN KEY ("zoneId") REFERENCES "floor_plan_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- หัวใจของโครงสร้างนี้: หนึ่งโต๊ะรับได้คนเดียว ฐานข้อมูลกันซ้อนให้เอง
CREATE UNIQUE INDEX IF NOT EXISTS "floor_plan_seats_desk_key"
    ON "floor_plan_seats"("zoneId", "deskIndex")
    WHERE "zoneId" IS NOT NULL AND "deskIndex" IS NOT NULL;
