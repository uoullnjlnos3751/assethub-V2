-- CreateTable
CREATE TABLE "printers" (
    "id" SERIAL NOT NULL,
    "floorArea" TEXT NOT NULL,
    "brandModel" TEXT NOT NULL,
    "serialNo" TEXT,
    "ipAddress" TEXT,
    "driver" TEXT,
    "pinNote" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "printers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_sets" (
    "id" SERIAL NOT NULL,
    "docCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "appliesToCategories" TEXT,
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "categoryCount" INTEGER NOT NULL DEFAULT 0,
    "avgTimeLabel" TEXT,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checklist_sets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "checklist_sets_docCode_key" ON "checklist_sets"("docCode");
