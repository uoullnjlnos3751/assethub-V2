-- Migration: Asset master-data FK dual-write (department/vendor/location)
-- Created: 2026-08-04
-- Method: Hand-written SQL (production DB user lacks shadow-DB CREATE privilege,
--   same constraint as 20260731000000_itam_lifecycle_phase2_3)
-- Apply with: prisma migrate deploy (or prisma migrate resolve --applied if run by hand first)
--
-- Note: the existing "departmentId"/"vendor"/"location" free-text columns on assets
-- are left untouched — this is additive dual-write, matching the assignedToUserId
-- pattern from Phase 2. Backfill below is a best-effort exact match; real-world data
-- shows departments/locations were historically entered as abbreviations ("IT"/"HQ")
-- while the master tables hold full names, so match rates for those two are expected
-- to be low. Vendor names are more consistent between the two, so its match rate is
-- expected to be meaningfully higher.

-- ─── FK columns ──────────────────────────────────────────────────────────────

ALTER TABLE "assets"
  ADD COLUMN IF NOT EXISTS "departmentRefId" INTEGER,
  ADD COLUMN IF NOT EXISTS "vendorRefId"     INTEGER,
  ADD COLUMN IF NOT EXISTS "locationRefId"   INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'assets_departmentRefId_fkey'
  ) THEN
    ALTER TABLE "assets"
      ADD CONSTRAINT "assets_departmentRefId_fkey"
      FOREIGN KEY ("departmentRefId") REFERENCES "departments"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'assets_vendorRefId_fkey'
  ) THEN
    ALTER TABLE "assets"
      ADD CONSTRAINT "assets_vendorRefId_fkey"
      FOREIGN KEY ("vendorRefId") REFERENCES "vendors"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'assets_locationRefId_fkey'
  ) THEN
    ALTER TABLE "assets"
      ADD CONSTRAINT "assets_locationRefId_fkey"
      FOREIGN KEY ("locationRefId") REFERENCES "asset_locations"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "assets_departmentRefId_idx" ON "assets"("departmentRefId");
CREATE INDEX IF NOT EXISTS "assets_vendorRefId_idx"     ON "assets"("vendorRefId");
CREATE INDEX IF NOT EXISTS "assets_locationRefId_idx"   ON "assets"("locationRefId");

-- ─── Backfill: exact, case/whitespace-normalized match ────────────────────────
-- Idempotent — only fills rows where the ref column is still NULL, so safe to
-- re-run after master data is cleaned up later to pick up newly-matchable rows.

UPDATE "assets" a
SET "departmentRefId" = d.id
FROM "departments" d
WHERE a."departmentRefId" IS NULL
  AND a."departmentId" IS NOT NULL
  AND upper(trim(regexp_replace(a."departmentId", '\s+', ' ', 'g'))) = upper(trim(regexp_replace(d.name, '\s+', ' ', 'g')));

UPDATE "assets" a
SET "vendorRefId" = v.id
FROM "vendors" v
WHERE a."vendorRefId" IS NULL
  AND a."vendor" IS NOT NULL
  AND upper(trim(regexp_replace(a."vendor", '\s+', ' ', 'g'))) = upper(trim(regexp_replace(v.name, '\s+', ' ', 'g')));

UPDATE "assets" a
SET "locationRefId" = l.id
FROM "asset_locations" l
WHERE a."locationRefId" IS NULL
  AND a."location" IS NOT NULL
  AND upper(trim(regexp_replace(a."location", '\s+', ' ', 'g'))) = upper(trim(regexp_replace(l.name, '\s+', ' ', 'g')));
