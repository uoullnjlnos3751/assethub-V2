-- Standard IT Equipment Catalog: reference specs per job role, with purchase
-- history (price/vendor/PO document) and manual tagging onto real assets.

CREATE TABLE "catalog_items" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "jobRole" TEXT,
    "brand" TEXT,
    "model" TEXT,
    "specs" TEXT,
    "recommendedPrice" DECIMAL(12,2),
    "vendorName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "catalog_item_documents" (
    "id" SERIAL NOT NULL,
    "catalogItemId" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "note" TEXT,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_item_documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "catalog_item_documents_catalogItemId_idx" ON "catalog_item_documents"("catalogItemId");

ALTER TABLE "catalog_item_documents" ADD CONSTRAINT "catalog_item_documents_catalogItemId_fkey"
    FOREIGN KEY ("catalogItemId") REFERENCES "catalog_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Manual tagging FK on assets — nullable, SET NULL on delete so removing a
-- catalog spec never deletes or blocks deleting the real assets tagged to it.
ALTER TABLE "assets" ADD COLUMN "catalogItemId" INTEGER;

CREATE INDEX "assets_catalogItemId_idx" ON "assets"("catalogItemId");

ALTER TABLE "assets" ADD CONSTRAINT "assets_catalogItemId_fkey"
    FOREIGN KEY ("catalogItemId") REFERENCES "catalog_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
