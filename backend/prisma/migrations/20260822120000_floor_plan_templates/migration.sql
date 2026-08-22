-- วาดผังชั้นเองได้โดยไม่ต้องรอไฟล์ CAD และเก็บผังไว้ใช้ซ้ำเป็นเทมเพลต
--
-- ตอนนี้แผนผังบังคับต้องมีรูป ทำให้การเปิดชั้นใหม่ต้องรอไฟล์จากฝ่ายอาคาร
-- ผลคือทั้งระบบมีแปลนเดียว ครอบคลุมคน 83 คนจาก 346 — TRR ซึ่งมีคนครึ่งหนึ่ง
-- ของทั้งกลุ่ม (174 คน) ยังไม่มีแปลนเลย
--
-- แต่รูป CAD มีประโยชน์อยู่แค่สองอย่าง: บอกรูปร่างของชั้น กับบอกว่าโซนอยู่ตรงไหน
-- ทั้งสองอย่างวาดเองได้ ส่วนที่ทำงานจริง (โซนกับตารางโต๊ะ) เป็นข้อมูลอยู่แล้ว
-- ไม่ได้พึ่งรูปเลย รูปจึงควรเป็นของเสริม ไม่ใช่เงื่อนไข

ALTER TABLE "floor_plans" ALTER COLUMN "imageUrl" DROP NOT NULL;

-- สัดส่วนผืนวาดเมื่อไม่มีรูป (กว้าง/สูง) — มีรูปแล้วใช้สัดส่วนของรูปแทน
ALTER TABLE "floor_plans" ADD COLUMN IF NOT EXISTS "aspect" DOUBLE PRECISION;

-- โซนสองชนิด: DESKS มีตารางโต๊ะให้คนนั่ง ส่วน ROOM เป็นแค่หมุดหมายให้คนดูแล้ว
-- รู้ว่าตัวเองอยู่ตรงไหน (ห้องประชุม ลิฟต์ บันได ห้องน้ำ) ซึ่งเป็นสิ่งเดียวที่
-- แบบ CAD ให้มาแล้วมีค่าจริง ๆ ต่อการเดินหน้างาน
ALTER TABLE "floor_plan_zones" ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'DESKS';

-- ชั้นในตึกเดียวกันมักวางผังเหมือนกัน เก็บชุดโซนไว้แล้วกดใช้ซ้ำ
-- เก็บเป็น JSON ก้อนเดียวเพราะเทมเพลตเป็นภาพนิ่ง ณ เวลาที่บันทึก การแก้โซน
-- บนชั้นจริงภายหลังต้องไม่ไปเปลี่ยนเทมเพลตที่ชั้นอื่นใช้อยู่
CREATE TABLE IF NOT EXISTS "floor_plan_templates" (
    "id"          SERIAL       NOT NULL,
    "name"        TEXT         NOT NULL,
    "description" TEXT,
    "company"     TEXT,
    "aspect"      DOUBLE PRECISION,
    "zones"       JSONB        NOT NULL,
    "createdBy"   TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "floor_plan_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "floor_plan_templates_name_key" ON "floor_plan_templates"("name");
