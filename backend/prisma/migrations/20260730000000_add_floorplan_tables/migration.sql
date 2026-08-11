-- CreateTable
CREATE TABLE "floor_plans" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "floor" TEXT NOT NULL,
    "building" TEXT,
    "company" TEXT,
    "imageUrl" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "floor_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FloorPlanPin" (
    "id" SERIAL NOT NULL,
    "floorPlanId" INTEGER NOT NULL,
    "assetId" INTEGER NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FloorPlanPin_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FloorPlanPin" ADD CONSTRAINT "FloorPlanPin_floorPlanId_fkey" FOREIGN KEY ("floorPlanId") REFERENCES "floor_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FloorPlanPin" ADD CONSTRAINT "FloorPlanPin_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
