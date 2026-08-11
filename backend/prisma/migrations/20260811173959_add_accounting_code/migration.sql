ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "accountingCode" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "assets_accountingCode_key" ON "assets"("accountingCode");
