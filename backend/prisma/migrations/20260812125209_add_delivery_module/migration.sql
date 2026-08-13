-- CreateEnum
CREATE TYPE "DeliveryType" AS ENUM ('NEW_PURCHASE', 'RECYCLED', 'TEMP_REPLACEMENT');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('DRAFT', 'SETUP_IN_PROGRESS', 'SETUP_DONE', 'PENDING_DELIVERY', 'DELIVERED', 'CONFIRMED', 'RETURN_REQUESTED', 'RETURNED');

-- CreateTable
CREATE TABLE "delivery_requests" (
    "id" SERIAL NOT NULL,
    "deliveryType" "DeliveryType" NOT NULL DEFAULT 'NEW_PURCHASE',
    "status" "DeliveryStatus" NOT NULL DEFAULT 'DRAFT',
    "assetId" INTEGER,
    "recipientName" TEXT NOT NULL,
    "recipientEmail" TEXT,
    "recipientDept" TEXT,
    "recipientCompany" TEXT,
    "source" TEXT,
    "requestedBy" INTEGER NOT NULL,
    "installerId" INTEGER,
    "installedAt" TIMESTAMP(3),
    "deliveredById" INTEGER,
    "deliveredAt" TIMESTAMP(3),
    "confirmToken" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "confirmMethod" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_peripheral_items" (
    "id" SERIAL NOT NULL,
    "requestId" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "serialNo" TEXT,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "remark" TEXT,
    "prepared" BOOLEAN NOT NULL DEFAULT false,
    "delivered" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "delivery_peripheral_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "delivery_requests_confirmToken_key" ON "delivery_requests"("confirmToken");

-- CreateIndex
CREATE INDEX "delivery_requests_status_idx" ON "delivery_requests"("status");

-- AddForeignKey
ALTER TABLE "delivery_requests" ADD CONSTRAINT "delivery_requests_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_requests" ADD CONSTRAINT "delivery_requests_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_requests" ADD CONSTRAINT "delivery_requests_installerId_fkey" FOREIGN KEY ("installerId") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_requests" ADD CONSTRAINT "delivery_requests_deliveredById_fkey" FOREIGN KEY ("deliveredById") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_peripheral_items" ADD CONSTRAINT "delivery_peripheral_items_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "delivery_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
