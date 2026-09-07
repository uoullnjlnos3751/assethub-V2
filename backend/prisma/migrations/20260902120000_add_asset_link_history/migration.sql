-- AssetLink (asset_links) is current-state only: unique per pair, hard-deleted
-- on unlink, createdAt reset on every recreate. Nothing survives a disconnect.
-- This adds a parallel history table: one row per connection span, closed out
-- (disconnectedAt set) instead of deleted when a pair unlinks.

CREATE TABLE "asset_link_history" (
    "id" SERIAL NOT NULL,
    "parentId" INTEGER NOT NULL,
    "childId" INTEGER NOT NULL,
    "linkType" TEXT NOT NULL,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disconnectedAt" TIMESTAMP(3),
    "note" TEXT,

    CONSTRAINT "asset_link_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "asset_link_history_parentId_idx" ON "asset_link_history"("parentId");
CREATE INDEX "asset_link_history_childId_idx" ON "asset_link_history"("childId");

ALTER TABLE "asset_link_history" ADD CONSTRAINT "asset_link_history_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "asset_link_history" ADD CONSTRAINT "asset_link_history_childId_fkey"
    FOREIGN KEY ("childId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: every AssetLink row currently live represents a connection that's
-- still open (no disconnectedAt) — seed history from today's actual state so
-- link-history isn't empty for pairs that were already connected before this
-- migration, even though we don't know their true original connect date.
INSERT INTO "asset_link_history" ("parentId", "childId", "linkType", "connectedAt", "note")
SELECT "parentId", "childId", "linkType", "createdAt", 'ย้อนหลัง: เชื่อมต่ออยู่แล้วก่อนเปิดใช้ระบบประวัติการเชื่อมต่อ — ไม่ทราบวันที่เชื่อมต่อจริง'
FROM "asset_links";
