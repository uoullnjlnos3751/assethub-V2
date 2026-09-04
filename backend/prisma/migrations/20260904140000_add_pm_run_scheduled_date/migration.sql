-- A PM plan only carries start/end dates for the whole batch. That is too
-- coarse to work from once a plan holds 188 machines across 22 departments:
-- the team needs to know which department is booked for which day. Until now
-- that was written into the free-text note field, where it could not be
-- sorted, counted or reported on.
ALTER TABLE "pm_runs" ADD COLUMN "scheduledDate" TIMESTAMP(3);

-- Supports "what is booked for this day" and "what is booked but not done".
CREATE INDEX "pm_runs_scheduledDate_status_idx" ON "pm_runs"("scheduledDate", "status");
