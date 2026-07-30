CREATE TABLE IF NOT EXISTS "asset_locations" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "vendors" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "asset_status_masters" (
  "id" SERIAL PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "asset_locations" ("name") VALUES ('HQ'), ('Factory')
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "asset_locations" ("name")
SELECT DISTINCT "location"
FROM "assets"
WHERE "location" IS NOT NULL AND TRIM("location") <> ''
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "vendors" ("name")
SELECT DISTINCT "vendor"
FROM "assets"
WHERE "vendor" IS NOT NULL AND TRIM("vendor") <> ''
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "asset_status_masters" ("code", "name") VALUES
  ('Available', 'พร้อมใช้งาน'),
  ('Borrowed', 'กำลังยืม'),
  ('Maintenance', 'ซ่อมบำรุง'),
  ('Retired', 'ปลดระวาง'),
  ('Lost', 'สูญหาย')
ON CONFLICT ("code") DO NOTHING;
