-- ย้ายหมุดเดิมที่ปักเครื่องส่วนตัวไว้ ให้กลายเป็นที่นั่งของเจ้าของเครื่อง
--
-- หมุดที่ปักคอมพิวเตอร์หรือจอของใครสักคนไว้ คือความพยายามจะบอกว่า "คนนี้นั่งตรงนี้"
-- ด้วยเครื่องมือที่ไม่มีแนวคิดเรื่องที่นั่ง ย้ายเจตนานั้นมาไว้ในตารางที่นั่ง แล้ว
-- อุปกรณ์ทุกชิ้นของคนนั้นจะตามมาเองโดยไม่ต้องปักเพิ่ม
--
-- หมุดที่เหลือไว้เหมือนเดิมคือของใช้ร่วมกัน (เครื่องพิมพ์ อุปกรณ์เครือข่าย) และ
-- หมุดที่เครื่องไม่มีเจ้าของ — สองอย่างนี้ตามคนไปไม่ได้ ต้องปักตำแหน่งเองต่อไป

INSERT INTO "floor_plan_seats" ("floorPlanId", "x", "y", "label", "ownerName", "departmentId", "note", "createdAt", "updatedAt")
SELECT DISTINCT ON (p."floorPlanId", lower(btrim(a."ownerName")))
       p."floorPlanId",
       p."x",
       p."y",
       p."label",
       btrim(a."ownerName"),
       a."departmentId",
       'ย้ายมาจากหมุดอุปกรณ์เดิมโดยอัตโนมัติ',
       CURRENT_TIMESTAMP,
       CURRENT_TIMESTAMP
FROM   "floor_plan_pins" p
JOIN   "assets" a ON a."id" = p."assetId"
WHERE  a."ownerName" IS NOT NULL
  AND  btrim(a."ownerName") <> ''
  AND  a."type" IN ('Notebook', 'Macbook', 'PC Desktop', 'Monitor มาตรฐาน')
  -- คนที่มีที่นั่งบนแปลนนี้อยู่แล้ว ไม่ต้องสร้างซ้ำ
  AND  NOT EXISTS (
         SELECT 1 FROM "floor_plan_seats" s
         WHERE  s."floorPlanId" = p."floorPlanId"
           AND  lower(btrim(s."ownerName")) = lower(btrim(a."ownerName"))
       )
ORDER BY p."floorPlanId", lower(btrim(a."ownerName")), p."id";

-- หมุดที่ถูกแทนด้วยที่นั่งแล้ว ต้องลบทิ้ง ไม่งั้นเครื่องเดียวจะโผล่สองที่บนแผนผัง
DELETE FROM "floor_plan_pins" p
USING  "assets" a
WHERE  a."id" = p."assetId"
  AND  a."ownerName" IS NOT NULL
  AND  btrim(a."ownerName") <> ''
  AND  a."type" IN ('Notebook', 'Macbook', 'PC Desktop', 'Monitor มาตรฐาน')
  AND  EXISTS (
         SELECT 1 FROM "floor_plan_seats" s
         WHERE  s."floorPlanId" = p."floorPlanId"
           AND  lower(btrim(s."ownerName")) = lower(btrim(a."ownerName"))
       );
