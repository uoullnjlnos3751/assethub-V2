-- Migration: Add notes field to PMRun (freeform remark, e.g. "owner busy, will
-- reschedule PM to <date>: <reason>") independent of the checklist answers.
-- Created: 2026-08-03

ALTER TABLE "pm_runs" ADD COLUMN "notes" TEXT;
