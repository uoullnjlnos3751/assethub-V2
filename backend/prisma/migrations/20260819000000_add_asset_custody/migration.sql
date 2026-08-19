-- Migration: Asset custody — track which drop-off point physically holds a device
-- Created: 2026-08-19
-- Why: staff returning a laptop on resignation hand it to HR-TRR, and IT had no
--      way to see how many machines are sitting there. `location` belongs to IT
--      and `status` must stay under IT control, so custody gets its own columns.
-- Method: Hand-written SQL (production DB user lacks shadow-DB CREATE privilege)
-- Apply with: prisma migrate resolve --applied "20260819000000_add_asset_custody"

ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "custodyHolder" TEXT;
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "custodyNote" TEXT;
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "custodyUpdatedAt" TIMESTAMP(3);
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "custodyUpdatedById" INTEGER;

CREATE INDEX IF NOT EXISTS "assets_custodyHolder_idx" ON "assets"("custodyHolder");
