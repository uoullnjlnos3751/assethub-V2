-- migration 20260826150500 enabled 3 new event keys (borrow_pending_supervisor,
-- borrow_supervisor_approved, borrow_rejected_by_supervisor) but never inserted
-- the notification_templates rows for them. sendEmail() has no way to tell
-- "no template exists yet" apart from "this event was never meant to have
-- one" — it falls back to a generic email whose body is the raw
-- JSON.stringify(payload) of the whole request, items array included. Content
-- here matches DEFAULT_TEMPLATES in backend/src/routes/admin.ts exactly, so a
-- SUPERADMIN resetting these from Settings gets byte-identical text.
--
-- ON CONFLICT DO NOTHING: idempotent, and leaves alone any of these three an
-- admin may have already hand-created or customized since the event keys
-- went live.

INSERT INTO "notification_templates" ("key", "channel", "subjectTh", "bodyTh") VALUES
  ('borrow_pending_supervisor', 'EMAIL', 'มีคำขอยืมรอคุณอนุมัติ', '{{requester}} ส่งคำขอยืมเลขที่ {{requestNo}} รอการอนุมัติจากคุณในฐานะหัวหน้างาน'),
  ('borrow_supervisor_approved', 'EMAIL', 'คำขอยืมผ่านหัวหน้างานแล้ว รอ IT Admin', 'คำขอเลขที่ {{requestNo}} จาก {{requester}} ผ่านการอนุมัติจากหัวหน้างาน ({{supervisor}}) แล้ว รอ IT Admin ดำเนินการต่อ'),
  ('borrow_rejected_by_supervisor', 'EMAIL', 'คำขอยืมถูกหัวหน้างานปฏิเสธ', 'คำขอเลขที่ {{requestNo}} ถูกหัวหน้างาน ({{supervisor}}) ปฏิเสธเนื่องจาก {{note}}')
ON CONFLICT ("key", "channel") DO NOTHING;
