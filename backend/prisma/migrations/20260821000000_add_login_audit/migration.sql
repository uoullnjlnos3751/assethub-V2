-- บันทึกว่าใครเข้าใช้งานจากเครื่องไหน
--
-- ระบบไม่เคยเก็บอะไรเกี่ยวกับเครื่องที่ล็อกอินเลย ทั้งที่ nginx ส่ง X-Real-IP และ
-- X-Forwarded-For มาให้อยู่แล้วและ express ตั้ง trust proxy ไว้ถูกต้อง — ค่ามาถึง
-- แล้วถูกทิ้งไปเฉย ๆ จึงตอบคำถามพื้นฐานอย่าง "บัญชีนี้เข้าจากเครื่องไหน" ไม่ได้

ALTER TABLE "app_users" ADD COLUMN IF NOT EXISTS "lastLoginIp"    TEXT;
ALTER TABLE "app_users" ADD COLUMN IF NOT EXISTS "lastLoginAgent" TEXT;
ALTER TABLE "app_users" ADD COLUMN IF NOT EXISTS "lastLoginHost"  TEXT;

CREATE TABLE IF NOT EXISTS "login_logs" (
    "id"        SERIAL       NOT NULL,
    "userId"    INTEGER,
    "username"  TEXT         NOT NULL,
    "success"   BOOLEAN      NOT NULL,
    "reason"    TEXT,
    "ip"        TEXT,
    "userAgent" TEXT,
    "hostname"  TEXT,
    "authType"  TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_logs_pkey" PRIMARY KEY ("id")
);

-- ล็อกอินที่ล้มเหลวอาจเป็นชื่อผู้ใช้ที่ไม่มีอยู่จริง userId จึงเป็น null ได้
-- และการลบผู้ใช้ต้องไม่ลบประวัติทิ้ง (SET NULL ไม่ใช่ CASCADE)
ALTER TABLE "login_logs"
    ADD CONSTRAINT "login_logs_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "login_logs_userId_createdAt_idx" ON "login_logs"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "login_logs_createdAt_idx"        ON "login_logs"("createdAt");
CREATE INDEX IF NOT EXISTS "login_logs_ip_idx"               ON "login_logs"("ip");
