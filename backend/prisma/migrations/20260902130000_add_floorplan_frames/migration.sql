-- Freeform device-frame drawing tool for the floor plan (IT Admin drags a
-- rectangle on the map, then attaches assets to it — independent of
-- FloorPlanZone's desk grid, since a frame like a server rack or a network
-- cabinet doesn't belong to any one person's desk).

CREATE TABLE "floor_plan_frames" (
    "id" SERIAL NOT NULL,
    "floorPlanId" INTEGER NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "w" DOUBLE PRECISION NOT NULL,
    "h" DOUBLE PRECISION NOT NULL,
    "label" TEXT,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "floor_plan_frames_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "floor_plan_frames_floorPlanId_idx" ON "floor_plan_frames"("floorPlanId");

ALTER TABLE "floor_plan_frames" ADD CONSTRAINT "floor_plan_frames_floorPlanId_fkey"
    FOREIGN KEY ("floorPlanId") REFERENCES "floor_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "floor_plan_frame_assets" (
    "frameId" INTEGER NOT NULL,
    "assetId" INTEGER NOT NULL,

    CONSTRAINT "floor_plan_frame_assets_pkey" PRIMARY KEY ("frameId", "assetId")
);

CREATE INDEX "floor_plan_frame_assets_assetId_idx" ON "floor_plan_frame_assets"("assetId");

ALTER TABLE "floor_plan_frame_assets" ADD CONSTRAINT "floor_plan_frame_assets_frameId_fkey"
    FOREIGN KEY ("frameId") REFERENCES "floor_plan_frames"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "floor_plan_frame_assets" ADD CONSTRAINT "floor_plan_frame_assets_assetId_fkey"
    FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
