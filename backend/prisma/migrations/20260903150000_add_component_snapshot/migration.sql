-- Last-seen RAM/disk fingerprint per asset, used only by the component
-- change-detection background job to diff against the next agent report.
CREATE TABLE "asset_component_snapshots" (
    "assetId" INTEGER NOT NULL,
    "ramFingerprint" JSONB NOT NULL,
    "diskFingerprint" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_component_snapshots_pkey" PRIMARY KEY ("assetId")
);

ALTER TABLE "asset_component_snapshots" ADD CONSTRAINT "asset_component_snapshots_assetId_fkey"
    FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
