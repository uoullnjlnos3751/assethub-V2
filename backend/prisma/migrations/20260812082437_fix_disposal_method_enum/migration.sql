CREATE TYPE "DisposalMethod" AS ENUM ('DONATE', 'SELL', 'DESTROY', 'RETURN', 'TRANSFER');
ALTER TABLE "asset_disposals" DROP COLUMN "method", ADD COLUMN "method" "DisposalMethod" NOT NULL;
