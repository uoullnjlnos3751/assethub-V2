-- Product photo for the catalog list/detail redesign — base64 data URL stored
-- directly in the column, same pattern as Asset.image.
ALTER TABLE "catalog_items" ADD COLUMN "imageUrl" TEXT;
