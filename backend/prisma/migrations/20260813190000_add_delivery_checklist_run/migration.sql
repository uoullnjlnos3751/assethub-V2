-- CreateTable
CREATE TABLE "checklist_items" (
    "id" SERIAL NOT NULL,
    "setId" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "refCode" TEXT NOT NULL,
    "itemText" TEXT NOT NULL,
    "answerType" TEXT NOT NULL DEFAULT 'PASS_FAIL_NA',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_checklist_runs" (
    "id" SERIAL NOT NULL,
    "requestId" INTEGER NOT NULL,
    "checklistSetId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "performedBy" INTEGER,
    "performedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_checklist_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_checklist_answers" (
    "id" SERIAL NOT NULL,
    "runId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "value" TEXT,
    "note" TEXT,

    CONSTRAINT "delivery_checklist_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "checklist_items_setId_sortOrder_idx" ON "checklist_items"("setId", "sortOrder");

-- CreateIndex
CREATE INDEX "delivery_checklist_runs_requestId_idx" ON "delivery_checklist_runs"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_checklist_answers_runId_itemId_key" ON "delivery_checklist_answers"("runId", "itemId");

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_setId_fkey" FOREIGN KEY ("setId") REFERENCES "checklist_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_checklist_runs" ADD CONSTRAINT "delivery_checklist_runs_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "delivery_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_checklist_runs" ADD CONSTRAINT "delivery_checklist_runs_checklistSetId_fkey" FOREIGN KEY ("checklistSetId") REFERENCES "checklist_sets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_checklist_runs" ADD CONSTRAINT "delivery_checklist_runs_performedBy_fkey" FOREIGN KEY ("performedBy") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_checklist_answers" ADD CONSTRAINT "delivery_checklist_answers_runId_fkey" FOREIGN KEY ("runId") REFERENCES "delivery_checklist_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_checklist_answers" ADD CONSTRAINT "delivery_checklist_answers_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "checklist_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
