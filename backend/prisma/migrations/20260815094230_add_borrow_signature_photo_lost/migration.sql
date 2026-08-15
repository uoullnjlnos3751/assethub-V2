-- AlterEnum
ALTER TYPE "ReturnCondition" ADD VALUE 'Lost';

-- AlterTable
ALTER TABLE "checkouts" ADD COLUMN     "signatureData" TEXT;

-- AlterTable
ALTER TABLE "returns" ADD COLUMN     "signatureData" TEXT;

-- CreateTable
CREATE TABLE "checkout_images" (
    "id" SERIAL NOT NULL,
    "checkoutId" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checkout_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "return_images" (
    "id" SERIAL NOT NULL,
    "returnId" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "return_images_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "checkout_images" ADD CONSTRAINT "checkout_images_checkoutId_fkey" FOREIGN KEY ("checkoutId") REFERENCES "checkouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_images" ADD CONSTRAINT "return_images_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
