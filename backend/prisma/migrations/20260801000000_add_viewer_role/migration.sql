-- Migration: Add VIEWER role (read-only dashboard/reports access for executives)
-- Created: 2026-08-01
-- Method: Hand-written SQL (production DB user lacks shadow-DB CREATE privilege)
-- Apply with: prisma migrate resolve --applied "20260801000000_add_viewer_role"

ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'VIEWER';
