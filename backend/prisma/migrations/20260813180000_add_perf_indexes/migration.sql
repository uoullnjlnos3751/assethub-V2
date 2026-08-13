-- CreateIndex
CREATE INDEX "assets_categoryId_idx" ON "assets"("categoryId");

-- CreateIndex
CREATE INDEX "pm_plans_year_idx" ON "pm_plans"("year");

-- CreateIndex
CREATE INDEX "pm_runs_year_status_idx" ON "pm_runs"("year", "status");
