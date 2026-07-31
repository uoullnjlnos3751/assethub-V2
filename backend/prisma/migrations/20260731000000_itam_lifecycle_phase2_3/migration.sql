-- Migration: ITAM lifecycle additions (Phase 2 + 3)
-- Created: 2026-07-31
-- Method: Hand-written SQL (production DB user lacks shadow-DB CREATE privilege)
-- Apply with: prisma migrate resolve --applied "20260731000000_itam_lifecycle_phase2_3"

-- ─── Phase 2: Asset ITAM fields ─────────────────────────────────────────────

-- Assigned user FK (replaces free-text ownerName for linkage)
ALTER TABLE "assets"
  ADD COLUMN IF NOT EXISTS "assignedToUserId" INTEGER,
  ADD COLUMN IF NOT EXISTS "usefulLifeYears"  INTEGER,
  ADD COLUMN IF NOT EXISTS "salvageValue"     DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "requesterName"    TEXT,
  ADD COLUMN IF NOT EXISTS "budgetCode"       TEXT,
  ADD COLUMN IF NOT EXISTS "receivedDate"     TIMESTAMP(3);

-- FK: assignedToUserId → app_users(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'assets_assignedToUserId_fkey'
  ) THEN
    ALTER TABLE "assets"
      ADD CONSTRAINT "assets_assignedToUserId_fkey"
      FOREIGN KEY ("assignedToUserId") REFERENCES "app_users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ─── CMDB: AssetLink ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "asset_links" (
  "id"        SERIAL       NOT NULL,
  "parentId"  INTEGER      NOT NULL,
  "childId"   INTEGER      NOT NULL,
  "linkType"  TEXT         NOT NULL DEFAULT 'COMPONENT',
  "note"      TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "asset_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "asset_links_parentId_childId_key" ON "asset_links"("parentId","childId");
CREATE INDEX       IF NOT EXISTS "asset_links_parentId_idx"          ON "asset_links"("parentId");
CREATE INDEX       IF NOT EXISTS "asset_links_childId_idx"           ON "asset_links"("childId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'asset_links_parentId_fkey') THEN
    ALTER TABLE "asset_links"
      ADD CONSTRAINT "asset_links_parentId_fkey"
      FOREIGN KEY ("parentId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'asset_links_childId_fkey') THEN
    ALTER TABLE "asset_links"
      ADD CONSTRAINT "asset_links_childId_fkey"
      FOREIGN KEY ("childId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ─── AssetDisposal ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "asset_disposals" (
  "id"            SERIAL       NOT NULL,
  "assetId"       INTEGER      NOT NULL,
  "method"        TEXT         NOT NULL,  -- DONATE | SELL | DESTROY | RETURN | TRANSFER
  "disposalDate"  TIMESTAMP(3) NOT NULL,
  "approvedBy"    TEXT,
  "approvalRef"   TEXT,
  "saleValue"     DOUBLE PRECISION,
  "recipientName" TEXT,
  "notes"         TEXT,
  "createdById"   INTEGER      NOT NULL,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "asset_disposals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "asset_disposals_assetId_idx"      ON "asset_disposals"("assetId");
CREATE INDEX IF NOT EXISTS "asset_disposals_disposalDate_idx" ON "asset_disposals"("disposalDate");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'asset_disposals_assetId_fkey') THEN
    ALTER TABLE "asset_disposals"
      ADD CONSTRAINT "asset_disposals_assetId_fkey"
      FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'asset_disposals_createdById_fkey') THEN
    ALTER TABLE "asset_disposals"
      ADD CONSTRAINT "asset_disposals_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- ─── Phase 3: SoftwareLicense ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "software_licenses" (
  "id"            SERIAL       NOT NULL,
  "name"          TEXT         NOT NULL,
  "vendor"        TEXT,
  "licenseType"   TEXT         NOT NULL DEFAULT 'PERPETUAL',
  "totalSeats"    INTEGER      NOT NULL DEFAULT 1,
  "licenseKey"    TEXT,
  "purchaseDate"  TIMESTAMP(3),
  "expiryDate"    TIMESTAMP(3),
  "purchasePrice" DOUBLE PRECISION,
  "poNumber"      TEXT,
  "notes"         TEXT,
  "isActive"      BOOLEAN      NOT NULL DEFAULT true,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "software_licenses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "software_licenses_expiryDate_idx" ON "software_licenses"("expiryDate");

CREATE TABLE IF NOT EXISTS "license_assignments" (
  "id"         SERIAL       NOT NULL,
  "licenseId"  INTEGER      NOT NULL,
  "assetId"    INTEGER,
  "userId"     INTEGER,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "note"       TEXT,

  CONSTRAINT "license_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "license_assignments_licenseId_assetId_key" ON "license_assignments"("licenseId","assetId") WHERE "assetId" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "license_assignments_licenseId_userId_key"  ON "license_assignments"("licenseId","userId")  WHERE "userId"  IS NOT NULL;
CREATE INDEX       IF NOT EXISTS "license_assignments_licenseId_idx"          ON "license_assignments"("licenseId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'license_assignments_licenseId_fkey') THEN
    ALTER TABLE "license_assignments"
      ADD CONSTRAINT "license_assignments_licenseId_fkey"
      FOREIGN KEY ("licenseId") REFERENCES "software_licenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ─── Phase 3: Contract ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "contracts" (
  "id"           SERIAL       NOT NULL,
  "title"        TEXT         NOT NULL,
  "contractNo"   TEXT,
  "contractType" TEXT         NOT NULL DEFAULT 'WARRANTY',
  "vendor"       TEXT,
  "startDate"    TIMESTAMP(3) NOT NULL,
  "endDate"      TIMESTAMP(3) NOT NULL,
  "value"        DOUBLE PRECISION,
  "poNumber"     TEXT,
  "notes"        TEXT,
  "isActive"     BOOLEAN      NOT NULL DEFAULT true,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "contracts_contractNo_key"  ON "contracts"("contractNo") WHERE "contractNo" IS NOT NULL;
CREATE INDEX       IF NOT EXISTS "contracts_endDate_idx"      ON "contracts"("endDate","isActive");

CREATE TABLE IF NOT EXISTS "contract_assets" (
  "id"         SERIAL   NOT NULL,
  "contractId" INTEGER  NOT NULL,
  "assetId"    INTEGER  NOT NULL,

  CONSTRAINT "contract_assets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "contract_assets_contractId_assetId_key" ON "contract_assets"("contractId","assetId");
CREATE INDEX       IF NOT EXISTS "contract_assets_contractId_idx"          ON "contract_assets"("contractId");
CREATE INDEX       IF NOT EXISTS "contract_assets_assetId_idx"             ON "contract_assets"("assetId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contract_assets_contractId_fkey') THEN
    ALTER TABLE "contract_assets"
      ADD CONSTRAINT "contract_assets_contractId_fkey"
      FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contract_assets_assetId_fkey') THEN
    ALTER TABLE "contract_assets"
      ADD CONSTRAINT "contract_assets_assetId_fkey"
      FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
