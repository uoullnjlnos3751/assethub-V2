-- Migration: Add HR_CUSTODY role (HR staff who receive returned devices)
-- Created: 2026-08-19
-- Why: AppUser.department holds free-text AD names and HR appears under at
--      least three spellings, so HR cannot be detected automatically — the
--      role is granted per person from Settings › ผู้ใช้งาน.
-- Method: Hand-written SQL (production DB user lacks shadow-DB CREATE privilege)
-- NOTE: kept in its own migration on purpose — Postgres refuses to use a new
--       enum value in the same transaction that adds it.
-- Apply with: prisma migrate resolve --applied "20260819000001_add_hr_custody_role"

ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'HR_CUSTODY';
