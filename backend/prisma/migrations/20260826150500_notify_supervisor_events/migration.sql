-- เพิ่ม event key ของขั้นอนุมัติหัวหน้างาน 3 ตัวเข้าไปใน enabledEventKeys
-- ทั้ง default ของคอลัมน์ (สำหรับแถวใหม่) และแถวที่มีอยู่แล้ว (กันไม่ให้การแจ้งเตือน
-- ขั้นหัวหน้างานถูก enabledEventKeys เดิมกรองทิ้งเงียบๆ ตาม createNotification())

ALTER TABLE "notification_settings" ALTER COLUMN "enabledEventKeys"
  SET DEFAULT 'borrow_pending_supervisor,borrow_supervisor_approved,borrow_rejected_by_supervisor,borrow_request_pending,borrow_approved,borrow_rejected,checkout_completed,return_recorded,overdue_borrow,extension_pending,extension_approved,extension_rejected,pm_overdue';

UPDATE "notification_settings"
SET "enabledEventKeys" = "enabledEventKeys" || ',borrow_pending_supervisor,borrow_supervisor_approved,borrow_rejected_by_supervisor'
WHERE "enabledEventKeys" NOT LIKE '%borrow_pending_supervisor%';
