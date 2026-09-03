-- One row per day of the dashboard's core KPIs, for trend charts. Populated
-- by the daily background job, not written by the app itself.
CREATE TABLE "daily_metric_snapshots" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "assetsTotal" INTEGER NOT NULL,
    "pmDonePct" DOUBLE PRECISION NOT NULL,
    "osOutdatedCount" INTEGER NOT NULL,
    "borrowOverdueCount" INTEGER NOT NULL,
    "agentOfflineCount" INTEGER,
    "warrantyExpiredCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_metric_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "daily_metric_snapshots_date_key" ON "daily_metric_snapshots"("date");
