# AssetHub (ITAM) — System Reference for ITAM-V2

เอกสารนี้เขียนขึ้นเพื่อให้ Claude instance อื่น (หรือทีมพัฒนาอื่น) ที่กำลังเริ่มโปรเจกต์ **ITAM-V2** (เวอร์ชันถัดไป, แยกโปรเจกต์ใหม่) มีบริบทครบถ้วนเกี่ยวกับระบบเดิม — ทั้งเมนู, โครงสร้างฐานข้อมูล, สถาปัตยกรรม, และบทเรียนจากปัญหาที่เคยเจอ โดยไม่ต้องไล่อ่านโค้ดทั้งหมดใหม่

อัปเดตล่าสุด: 2026-08-11 (หลังแก้ production incident และเพิ่มฟีเจอร์ accountingCode/GLPI monitor merge)

---

## 1. ภาพรวมระบบเดิม (AssetHub V2 / ITAM)

ระบบบริหารทรัพย์สิน IT ขององค์กร (TRR Group) ครอบคลุม: ทะเบียนทรัพย์สิน, ยืม-คืน, PM (Preventive Maintenance), บริจาค/จำหน่ายออก, License & สัญญา, รายงาน

**Tech stack:**
- Frontend: React 18 + TypeScript + Vite + Material UI (MUI) v6
- Backend: Node.js + Express + TypeScript + Prisma ORM v5.22
- Database: PostgreSQL 16
- Auth: Hybrid AD (LDAP) + Local (bcrypt), JWT

**⚠️ สิ่งสำคัญที่ต้องรู้ก่อนออกแบบ V2:** production จริงของระบบเดิมรันแบบ **ไฮบริด** ไม่ใช่ Docker ล้วนตามที่ `docker-compose.prod.yml` บอกไว้:
- `assethub-api` (backend) และ `assethub-web` (frontend, `vite preview`) รันตรงบน Windows host ผ่าน **PM2**
- มีแค่ **Postgres** และ **nginx** ที่รันเป็น Docker container (nginx ตั้งค่าให้ proxy ไปหา PM2 ผ่าน `host.docker.internal`)
- เหตุผล: container "blue" (backend/frontend เดิมที่ตั้งใจให้รันใน Docker) พังไป ทีมเลยสลับมาใช้ PM2 แทนโดยไม่ได้อัปเดตเอกสาร — เป็นสาเหตุของ production incident ครั้งใหญ่เมื่อ 2026-08-11
- **บทเรียนสำหรับ V2:** เลือกสถาปัตยกรรมเดียวให้ชัดเจนตั้งแต่แรก (Docker ล้วน หรือ PM2 ล้วน) และให้ deployment script/เอกสารตรงกับของจริงเสมอ อย่าปล่อยให้ "สิ่งที่เอกสารบอก" กับ "สิ่งที่รันจริง" ต่างกัน

---

## 2. โครงสร้างเมนูทั้งหมด (Navigation)

### เมนูผู้ใช้ทั่วไป (User)
- รายการของพร้อมยืม
- ยืมทรัพย์สิน
- คำขอของฉัน / รายการที่ยืม / คำขอขยายวัน / ประวัติการยืม

### เมนู Admin/IT (จัดกลุ่มตาม ITAM lifecycle)

**ภาพรวมระบบ**
- แดชบอร์ด

**จัดการทรัพย์สิน**
- ทะเบียนทรัพย์สิน IT: ทะเบียนทั้งหมด, คอมพิวเตอร์, จอภาพ, เครื่องพิมพ์, อุปกรณ์เครือข่าย, อุปกรณ์สื่อสาร, อุปกรณ์ต่อพ่วง, Rack & Infra, นำเข้า/ส่งออกข้อมูล, พิมพ์ QR สติ๊กเกอร์
- คลังวัสดุ: ภาพรวมคลังสินค้า, สายสัญญาณ, วัสดุสิ้นเปลือง

**Service Desk**
- ระบบยืม-คืน: ของพร้อมยืม, รออนุมัติ, ส่งมอบ (Check-out), รับคืน (Return), ขยายวัน, ยืมเกินกำหนด, ประวัติทั้งหมด

**งานซ่อมบำรุง**
- PM ทรัพย์สิน (อุปกรณ์ IT): ภาพรวม PM, กำหนดการ PM, แผน PM, ทำ PM ทรัพย์สิน, แผนผังชั้น PM, Checklist Template
- PM ทรัพย์สิน (ตู้ Switch/Hub): ภาพรวม Hub Room, แผน Hub Room, ตรวจ Hub Room, Template Hub Room

**จำหน่ายทรัพย์สินออก**
- จำหน่ายออก/บริจาค, บันทึกการจำหน่ายทรัพย์สิน

**License & สัญญา**
- Software License, สัญญา & Warranty

**สรุปและรายงาน**
- รายงานทรัพย์สิน, รายงานยืม-คืน, รายงาน PM, รายงานซ่อมบำรุง, ตรวจสอบทรัพย์สินพนักงาน

**ผู้ดูแลระบบ**
- ข้อมูลหลัก (Master Data): จัดการหมวดหมู่, ประเภท/สถานที่/ผู้จำหน่าย/สถานะ/บริษัท/แผนก
- ตั้งค่าระบบ: ตั้งค่าระบบหลัก, จัดการผู้ใช้งาน, จัดการ Backup, Flowchart ขั้นตอนระบบ, Audit Log, ประวัติแจ้งเตือน

ที่มา: [frontend/src/navigation/nav.tsx](../frontend/src/navigation/nav.tsx)

---

## 3. โครงสร้างฐานข้อมูล (60 models)

ที่มา: [backend/prisma/schema.prisma](../backend/prisma/schema.prisma)

### 3.1 ผู้ใช้ (User Management)
`AppUser` — role: SUPERADMIN/IT_ADMIN/USER, authType: AD/LOCAL

### 3.2 ทรัพย์สินหลัก (Asset Core)
- `Asset` — ตารางกลาง มี `assetCode` (รหัส IT, unique) และ `accountingCode` (เลขครุภัณฑ์ฝ่ายบัญชี, unique, **เว้นว่างได้** — เพิ่มเมื่อ 2026-08-11)
- Detail ตามประเภท (1-to-1): `ComputerDetail`, `PhoneDetail`, `MonitorDetail`, `NetworkDeviceDetail`, `RackDetail`, `PrinterDetail`, `CableDetail`, `ConsumableDetail`, `DeviceDetail`
- `AssetHistory` — log การเปลี่ยนแปลง
- `AssetDocument` — เอกสาร/รูปแนบ
- `AssetLink` — ความสัมพันธ์ระหว่างทรัพย์สิน (parent/child)
- `AssetDisposal` — บันทึกการจำหน่ายออก (method: DONATE/SELL/DESTROY/RETURN/TRANSFER)

### 3.3 คลังวัสดุ (Inventory)
`InventoryItem`, `InventoryTransaction`

### 3.4 ยืม-คืน (Borrow Workflow)
`BorrowRequest` → `BorrowRequestItem` → `BorrowApproval` / `Checkout` / `Return` / `BorrowExtension` → `BorrowExtensionItem`

### 3.5 ซ่อมบำรุง (Maintenance & PM)
- `MaintenanceRecord`, `MaintenancePart`, `MaintenanceImage`
- `PMTemplate` → `PMTemplateItem` → `PMPlan` → `PMRun` → `PMRunAnswer`
- **PM SW Hub (ระบบคู่ขนาน แยกจาก PM ปกติ)**: `PMSwHub`, `PMSwHubPlan`, `PMSwHubItem`, `PMSwHubTemplate`, `PMSwHubTemplateItem`
- `FloorPlan`, `FloorPlanPin` — ใช้ปักหมุดอุปกรณ์บนแผนผังชั้นสำหรับ PM

### 3.6 บริจาค (Donation)
`Donation`, `DonationItem`, `DonationImage`

### 3.7 License & สัญญา (Phase 2 ITAM lifecycle — เพิ่มทีหลัง)
- `SoftwareLicense` → `LicenseAssignment` (มอบหมาย license ให้ asset หรือ user)
- `Contract` → `ContractAsset` (สัญญา/warranty ผูกกับทรัพย์สิน)

### 3.8 Master Data
`Category`, `CategoryType`, `Company`, `Department`, `AssetLocation`, `Vendor`, `AssetStatusMaster`, `DeviceType`

### 3.9 ระบบ/แจ้งเตือน
`NotificationTemplate`, `NotificationOutbox`, `AppNotification`, `NotificationSetting`, `SystemSetting`, `ScheduledJob`

---

## 4. API Routes (backend/src/routes/)

`admin`, `ai` (Gemini chatbot), `assetLinks`, `assetMasterData`, `assets`, `auth`, `backup`, `borrow`, `categories`, `contracts`, `dashboard`, `departments`, `disposals`, `donation`, `floorplan`, `inventory`, `licenses`, `maintenance`, `notifications`, `pm`, `pmSwHub` + `pmSwHubPlan` + `pmSwHubTemplate`, `presence` (online-user tracking), `settings`, `uploads`

---

## 5. Flow หลักที่ควรเข้าใจก่อนออกแบบ V2

**Login:** ลอง LDAP bind ก่อน → ถ้าไม่ผ่านลอง local (bcrypt) → upsert เข้า `AppUser` → ออก JWT

**PM + GLPI integration (จุดซับซ้อนที่สุดในระบบ):**
1. ช่างเปิด PM run → กด "ดึงสเปคจาก GLPI" → ระบบ query GLPI REST API หา CPU/RAM/OS/Office/Antivirus + จอที่เชื่อมต่อ (auto-detect)
2. **ต้องกดยืนยันแยกต่างหาก** ("ยืนยันอัพเดทข้อมูลสเปคคอม") ก่อนข้อมูลจะเข้าฟอร์มจริง — ป้องกันข้อมูล GLPI ทับของที่ช่างกรอกเองโดยไม่ได้ตั้งใจ
3. จอ/ปริ้นเตอร์ใหม่ที่เจอจะถูกสร้างเป็น Asset อัตโนมัติ — รหัส (`assetCode`) generate อัตโนมัติตาม prefix ของบริษัท (ดู `generateAssetCode()` ใน pm.ts) ส่วน `accountingCode` (เลขครุภัณฑ์จริง) เว้นว่างได้ ใส่ทีหลังได้

**การ generate รหัสทรัพย์สินอัตโนมัติ (บทเรียนสำคัญ):**
- ต้องหาตัวเลขถัดไปแบบ**ตัวเลขจริง ไม่ใช่ string sort** (บั๊กที่เจอ: "M09" > "M035" ตามตัวอักษร ทั้งที่ 9 < 35) — ดึงทุกรหัสที่ตรง prefix มาเทียบตัวเลขในโค้ด ไม่ใช้ `ORDER BY code DESC` เฉยๆ
- ต้อง lock ระดับ transaction (Postgres advisory lock) กันสอง request สร้างรหัสชนกัน
- ถ้ารหัสมาจาก client (พิมพ์เอง/รับ preview) ต้องเช็คซ้ำว่ายังว่างอยู่ก่อน insert เสมอ (preview อาจ stale)

---

## 6. Environment Variables ที่ต้องมี

ดู [backend/.env.example](../backend/.env.example) — กลุ่มหลัก: `DATABASE_URL`, `JWT_SECRET`, `LDAP_*`, `SMTP_*`, `GLPI_API_URL`/`GLPI_USER_TOKEN`/`GLPI_APP_TOKEN`, `GEMINI_API_KEY`, `CORS_ORIGIN`/`CORS_ALLOWED_HOSTNAMES`

⚠️ Token/password ทุกตัวใน env ต้องเป็นค่าจริงที่ rotate ใหม่สำหรับ V2 — **ห้ามคัดลอกค่าจากระบบเดิมไปใช้ตรงๆ** โดยเฉพาะ GLPI token (ของเดิมเคยหลุดใน public GitHub repo มาก่อน)

---

## 7. บทเรียน/จุดที่ควรทำให้ดีขึ้นใน V2

1. **แยก dev directory กับ production directory ให้เป็นคนละที่** — ระบบเดิมใช้โฟลเดอร์เดียวกันทั้ง dev และ production (PM2 รันจาก working directory ที่ใช้พัฒนาโค้ดด้วย) ทำให้การสลับ git branch ธรรมดาๆ ส่งผลกระทบต่อเว็บที่ใช้งานจริงได้
2. **Commit บ่อยๆ อย่าปล่อยงานค้างไม่ commit นาน** — เหตุการณ์ข้อมูล "หาย" ที่เจอ แท้จริงคือโค้ดที่ยังไม่ commit ถูกสลับ branch ทับ
3. **ตั้งค่า PM2/process manager ให้ auto-start ตอนเครื่องรีสตาร์ทตั้งแต่แรก** (ระบบเดิมไม่มี ทำให้เสี่ยง downtime ถ้าเครื่อง reboot)
4. **ตัดสินใจสถาปัตยกรรม deploy ให้ชัดตั้งแต่ต้น** และให้เอกสารตรงกับของจริงตลอด
5. **Error handler ควรแปล error ของ ORM เป็นข้อความที่เข้าใจง่ายตั้งแต่วันแรก** (ระบบเดิมปล่อย raw Prisma error ออกไปให้ผู้ใช้เห็นตรงๆ นานมาก กว่าจะแก้)
6. **แยกรหัส IT-generated กับเลขทะเบียนที่หน่วยงานอื่นออกให้** ตั้งแต่ตอนออกแบบ schema (อย่ารวมกันแล้วมาแยกทีหลังแบบระบบเดิม)
7. **Prisma migration history ควรเริ่มเก็บตั้งแต่ commit แรก** อย่าใช้ `prisma db push` อย่างเดียวไปนานๆ (ระบบเดิมไม่มี migration history เลยจนกระทั่งกลางปีที่สอง)

---

## 8. วิธีใช้เอกสารนี้

ถ้าเป็น Claude instance ที่เพิ่งเข้าถึงโปรเจกต์นี้ (ผ่าน LAN share หรือช่องทางอื่น) แนะนำอ่านตามลำดับ:
1. เอกสารนี้ (ภาพรวม)
2. [backend/prisma/schema.prisma](../backend/prisma/schema.prisma) (schema เต็ม)
3. [frontend/src/navigation/nav.tsx](../frontend/src/navigation/nav.tsx) + [frontend/src/App.tsx](../frontend/src/App.tsx) (routing เต็ม)
4. [backend/src/app.ts](../backend/src/app.ts) (route mounting) + [backend/src/index.ts](../backend/src/index.ts) (entry point)
