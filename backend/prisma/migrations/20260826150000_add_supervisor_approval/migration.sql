-- อนุมัติยืม-คืน 2 ขั้น: หัวหน้างานอนุมัติก่อน แล้วจึงเด้งไปให้ IT Admin
--
-- เพิ่ม managerId บน app_users (หัวหน้างานโดยตรง มอบหมายมือโดย SUPERADMIN)
-- และสถานะใหม่ PendingSupervisor บน BorrowRequestStatus สำหรับคำขอที่ยังรอ
-- หัวหน้างานอนุมัติ — คำขอที่ผ่านขั้นนี้แล้ว (หรือผู้ขอไม่มีหัวหน้างานผูกไว้)
-- จะเข้าสถานะ Pending เดิมเพื่อรอ IT Admin ตามเดิมทุกประการ โค้ดที่เช็ค
-- status !== 'Pending' ในขั้น IT Admin จึงไม่ต้องแก้อะไรเพิ่ม
--
-- stage บน borrow_approvals แยกว่าการอนุมัติ/ปฏิเสธแต่ละแถวเกิดขึ้นที่ขั้นไหน

ALTER TYPE "BorrowRequestStatus" ADD VALUE IF NOT EXISTS 'PendingSupervisor';

CREATE TYPE "ApprovalStage" AS ENUM ('Supervisor', 'ITAdmin');

ALTER TABLE "app_users" ADD COLUMN "managerId" INTEGER;
ALTER TABLE "app_users" ADD CONSTRAINT "app_users_managerId_fkey"
  FOREIGN KEY ("managerId") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "app_users_managerId_idx" ON "app_users"("managerId");

ALTER TABLE "borrow_approvals" ADD COLUMN "stage" "ApprovalStage" NOT NULL DEFAULT 'ITAdmin';
