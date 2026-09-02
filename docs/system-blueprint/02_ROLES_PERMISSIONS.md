# ROLES & PERMISSIONS

> Confidence: **LEVEL 1 — VERIFIED** — สร้างจาก grep `authorize(...)` ทุกจุดใน `backend/src/routes/*.ts` (210 endpoints ที่มี `authorize()` ระบุชัด จากทั้งหมด 304 endpoints) บวกกับ `roles[]` ทุกจุดใน `frontend/src/App.tsx` และ `frontend/src/navigation/nav.tsx` — ไฟล์ดิบเต็มอยู่ที่ `_raw_authorize_grep.txt` และ `_raw_api_routes_grep.txt`

## Role ที่มีอยู่จริง (Prisma enum `UserRole`)

```prisma
enum UserRole {
  SUPERADMIN
  IT_ADMIN
  USER
  VIEWER
  HR_CUSTODY   // ← legacy: เหลือไว้ใน enum เพราะ Postgres enum ลบ value ออกเสี่ยงเกินประโยชน์
               //   (ต้องสร้าง type ใหม่ทั้งก้อนแล้วย้ายคอลัมน์) ไม่มี user คนไหนถือ role นี้แล้ว
               //   หลังฟีเจอร์ custody ถูกถอดออก (migration 20260823120000_drop_asset_custody)
}
```
Evidence: `backend/prisma/schema.prisma` enum `UserRole`

## Role ที่ปรากฏใน UI แต่ยังไม่มีจริงใน enum (Planned, ยังไม่เปิดใช้งาน)

| Role code | Label ไทย | สถานะ | Evidence |
|---|---|---|---|
| `APPROVER` | ผู้อนุมัติ | `live: false` — โชว์ในตาราง "บทบาทในระบบ" แต่เลือกให้ user ไม่ได้จริง | `frontend/src/pages/admin/settings/UsersPermissionsTab.tsx` `CANONICAL_ROLES` |
| `VENDOR` | ผู้ขาย/ผู้รับเหมา | `live: false` เช่นกัน | เดียวกัน |

## กลไก Authorization 2 แบบที่ใช้คู่กัน

1. **Role-based** (ปกติ) — middleware `authorize(...roles: string[])` เช็คว่า `req.user.role` อยู่ใน list ที่ระบุหรือไม่ → 403 ถ้าไม่ตรง (`backend/src/middleware/auth.ts:136-142`)
2. **Relationship-based** (เฉพาะฟีเจอร์ "หัวหน้างานอนุมัติคำขอยืม") — ไม่ใช้ `authorize()` เลย ใช้ `authenticate` เฉยๆ แล้วเช็คเงื่อนไขเองในตัว handler ว่า `request.requester.managerId === req.user.userId` (หรือเป็น `SUPERADMIN`) — เพราะ "หัวหน้างาน" ไม่ใช่ role แต่เป็นความสัมพันธ์ต่อพนักงานคนหนึ่งๆ ผ่าน field `AppUser.managerId` (self-relation) — Evidence: `backend/src/routes/borrow.ts` route `POST /requests/:id/supervisor-approve`

## Permission Matrix ระดับ Module (สรุปจาก endpoint ทั้งหมดที่มี `authorize()`)

Pattern ที่พบสม่ำเสมอทั้งระบบ: **"เขียน/แก้ไข" ส่วนใหญ่ = IT_ADMIN + SUPERADMIN, "ลบถาวร" ส่วนใหญ่ = SUPERADMIN เท่านั้น, "อ่าน" บาง module เปิดให้ VIEWER ด้วย**

| Module (route file) | GET (อ่าน) | POST/PUT/PATCH (เขียน) | DELETE (ลบ) | หมายเหตุ |
|---|---|---|---|---|
| `admin.ts` | SUPERADMIN (เกือบทั้งหมด), ยกเว้น `/login-logs` = IT_ADMIN+SUPERADMIN | SUPERADMIN | SUPERADMIN | การจัดการผู้ใช้/ตั้งค่าระบบ/backup/notification-template สงวนไว้ที่ SUPERADMIN เป็นหลัก |
| `assetLinks.ts` | — (ไม่มี GET ที่ต้อง auth แยก) | IT_ADMIN, SUPERADMIN | IT_ADMIN, SUPERADMIN | ลบลิงก์ CMDB ไม่ได้ล็อกไว้ที่ SUPERADMIN อย่างเดียว ต่างจาก pattern อื่น |
| `assetMasterData.ts` | IT_ADMIN, SUPERADMIN (ทุก endpoint) | IT_ADMIN, SUPERADMIN | IT_ADMIN, SUPERADMIN | Master data (device-types, locations, companies, vendors, asset-statuses, printers, checklist-sets) — ทุก CRUD verb ใช้สิทธิ์เดียวกันหมด ไม่แยกลบ |
| `assets.ts` | ผสม: บาง endpoint ไม่ auth เลย (เช่น GET `/` list หลัก — ดูหมายเหตุ), ที่เหลือ IT_ADMIN+SUPERADMIN | IT_ADMIN, SUPERADMIN | **SUPERADMIN เท่านั้น** (`DELETE /:id`, `bulk-delete`, `bulk-delete-by-type`) | นี่คือจุดที่ลบทรัพย์สินจริงถูกกันไว้แน่นสุด — IT_ADMIN แก้ไขได้แต่ลบไม่ได้ |
| `borrow.ts` | IT_ADMIN, SUPERADMIN (ฝั่ง admin queue/report ทั้งหมด) | IT_ADMIN, SUPERADMIN (approve/checkout/return/extension) | ไม่มี DELETE endpoint | ฝั่งผู้ใช้ทั่วไป (create/cancel/my-*) ไม่ผ่าน `authorize()` เลย — auth อย่างเดียวพอ, ฝั่งหัวหน้างานใช้กลไก managerId แทน role |
| `backup.ts` | SUPERADMIN, IT_ADMIN | SUPERADMIN, IT_ADMIN (create) | SUPERADMIN | restore ก็ SUPERADMIN เท่านั้น |
| `categories.ts` | IT_ADMIN, SUPERADMIN | IT_ADMIN, SUPERADMIN | SUPERADMIN | ลบ category/type ล็อก SUPERADMIN |
| `contracts.ts` | IT_ADMIN, SUPERADMIN, **VIEWER** | IT_ADMIN, SUPERADMIN | SUPERADMIN | เปิดอ่านให้ VIEWER — ตรงกับ nav.tsx ที่ VIEWER เห็นเมนู "License & สัญญา" |
| `delivery.ts` | IT_ADMIN, SUPERADMIN | IT_ADMIN, SUPERADMIN | ไม่มี DELETE endpoint | หน้า public confirm (`/confirm/:token`) ไม่อยู่ในลิสต์นี้เพราะไม่ผ่าน `authenticate` เลย — ดู `05_module_delivery_license_contract.md` |
| `departments.ts` | ไม่ auth แยก (public list) | SUPERADMIN | SUPERADMIN | เข้มกว่า master data อื่น — แก้แผนกได้แค่ SUPERADMIN ไม่ใช่ IT_ADMIN |
| `disposals.ts` | IT_ADMIN, SUPERADMIN | IT_ADMIN, SUPERADMIN | SUPERADMIN | |
| `donation.ts` | (endpoint หลักไม่ auth แยกในผลการค้นนี้ — ต้องดู 04_module_donation_disposal.md) | IT_ADMIN, SUPERADMIN (รูปภาพ) | IT_ADMIN, SUPERADMIN (รูปภาพ) | |
| `floorplan.ts` | (GET ไม่ auth แยก) | IT_ADMIN, SUPERADMIN | IT_ADMIN, SUPERADMIN | **ผิดสังเกต:** endpoint เขียนของโมดูลนี้เรียก `authorize()` โดยไม่มี `authenticate` นำหน้าในโค้ดบรรทัดเดียวกัน (เช่น `router.put('/:id/zones', authorize(...))`) — ต้องตรวจว่า `authenticate` ถูกเรียกแยกเป็น router-level middleware ก่อนหน้านี้หรือไม่ ไม่เช่นนั้น `req.user` อาจเป็น undefined ตอน `authorize` ทำงาน (ดู AUDIT ด้านล่าง) |
| `inventory.ts` | (GET ไม่ auth แยก) | IT_ADMIN, SUPERADMIN | SUPERADMIN | เบิก/รับเข้า (checkin/checkout) ต้อง IT_ADMIN ขึ้นไป |
| `licenses.ts` | IT_ADMIN, SUPERADMIN, **VIEWER** | IT_ADMIN, SUPERADMIN | SUPERADMIN | เหมือน contracts.ts |
| `maintenance.ts` | IT_ADMIN, SUPERADMIN | IT_ADMIN, SUPERADMIN | (ลบได้เฉพาะรูปภาพ — IT_ADMIN,SUPERADMIN ไม่ใช่ SUPERADMIN อย่างเดียว) | |
| `pm.ts` | IT_ADMIN, SUPERADMIN (เกือบทั้งหมด), `coverage` เปิดให้ **VIEWER** ด้วย | IT_ADMIN, SUPERADMIN | IT_ADMIN, SUPERADMIN (`DELETE /runs/:id`) | โมดูล PM ไม่มี endpoint ไหนล็อก SUPERADMIN อย่างเดียวเลย |
| `presence.ts` | IT_ADMIN, SUPERADMIN, **VIEWER** (ดูว่าใคร online) | — | — | |
| `settings.ts` | IT_ADMIN, SUPERADMIN | IT_ADMIN, SUPERADMIN | — | System settings key-value store |

**Endpoint ที่ authenticate อย่างเดียว ไม่มี `authorize()` role-check เลย** (ทุกคนที่ login แล้วเรียกได้ ไม่ว่า role ใด) พบมากที่สุดใน `borrow.ts` (สร้างคำขอ, ดูคำขอตัวเอง, ยกเลิกคำขอตัวเอง, ดูรายการที่ยืม, ประวัติตัวเอง, คิวหัวหน้างาน) และ endpoint พื้นฐานอื่นๆ ที่ไม่ปรากฏใน grep ผลลัพธ์นี้ (เช่น GET รายการหลักของหลาย module, `/api/auth/me`, `/api/notifications`) — ต้องดูไฟล์ raw หรือแต่ละ route file โดยตรงเพื่อยืนยัน endpoint แต่ละตัว

## ⚠️ AUDIT FINDING (สังเกตจากการทำเอกสารนี้ — ต้องตรวจสอบเพิ่ม ไม่ใช่ข้อสรุป)

`backend/src/routes/floorplan.ts` มีหลาย endpoint ที่เรียก `authorize('IT_ADMIN', 'SUPERADMIN')` **โดยไม่เห็น `authenticate` อยู่ใน call เดียวกัน** (บรรทัด 88, 223, 260, 273, 300, 400, 428, 456, 468) ต่างจากไฟล์ route อื่นๆ ทั้งหมดที่เขียน `authenticate, authorize(...)` คู่กันเสมอ — เป็นไปได้ว่า:
(ก) ไฟล์นี้มี `router.use(authenticate)` แยกไว้ต้นไฟล์ (ปกติ ไม่ใช่บั๊ก), หรือ
(ข) endpoint เหล่านี้พึ่ง `authorize()` เช็ค `req.user.role` โดยไม่มีอะไรรับประกันว่า `req.user` ถูกตั้งค่าไว้ก่อน (`middleware/auth.ts:138`: `if (!req.user) return next(new AppError('ไม่ได้ล็อกอิน', 401))` — ถ้าเป็นเช่นนี้จริง `authorize()` เองมี fallback ป้องกันอยู่แล้ว ไม่ใช่ช่องโหว่)

**ไม่สามารถสรุปได้ว่าเป็นบั๊กจริงหรือไม่จากการ grep เพียงอย่างเดียว — ต้องเปิด `backend/src/routes/floorplan.ts` อ่านทั้งไฟล์เพื่อยืนยัน** (บันทึกไว้ใน `UNKNOWN_NOT_VERIFIED.md`)

## Role Matrix ระดับเมนู (Frontend — จาก nav.tsx roles[] + App.tsx ProtectedRoute roles[])

| เมนู/ฟีเจอร์ | USER | IT_ADMIN | SUPERADMIN | VIEWER |
|---|:---:|:---:|:---:|:---:|
| Dashboard | ⚠️¹ | ✅ | ✅ | ✅ (จำกัด, ดูหมายเหตุ) |
| ทะเบียนทรัพย์สิน (ดู) | ✅ | ✅ | ✅ | ✅ |
| ทะเบียนทรัพย์สิน (เพิ่ม/แก้) | ❌ | ✅ | ✅ | ❌ |
| ทะเบียนทรัพย์สิน (ลบ) | ❌ | ❌ | ✅ | ❌ |
| ยืมทรัพย์สิน (สร้างคำขอ) | ✅ | ✅ | ✅ | ⚠️² |
| อนุมัติคำขอยืม (หัวหน้างาน) | ✅³ | ✅³ | ✅³ | ✅³ |
| อนุมัติคำขอยืม (IT Admin) | ❌ | ✅ | ✅ | ❌ |
| PM ทั้งหมด | ❌ | ✅ | ✅ | ❌ (ยกเว้น coverage ผ่าน API แต่ไม่มีเมนู) |
| จำหน่าย/บริจาค | ❌ | ✅ | ✅ | ❌ |
| License & สัญญา | ❌ | ✅ | ✅ | ✅ |
| รายงานระบบ | ❌ | ✅ | ✅ | ✅ |
| ตรวจสอบทรัพย์สินพนักงาน | ❌ | ✅ | ✅ | ❌ |
| ข้อมูลหลัก (Master Data) | ❌ | ✅ | ✅ | ❌ |
| ตั้งค่าระบบ / จัดการผู้ใช้ | ❌ | ✅⁴ | ✅ | ❌ |
| Backup/Restore | ❌ | ✅⁵ | ✅ | ❌ |

¹ role USER ไม่มีลิงก์เมนูไป `/dashboard` (ไม่อยู่ใน `userNavItems`) แต่ route เองไม่ได้ล็อก role (`App.tsx` ไม่มี `roles` prop บน `/dashboard`) — เข้าถึงได้ถ้าพิมพ์ URL ตรงๆ, ไม่ verified ว่าหน้าเช็ค role เองอีกชั้นหรือไม่
² role VIEWER ไม่มีลิงก์เมนู "ยืมทรัพย์สิน" แต่ route `/borrow/new` เองไม่ล็อก role เช่นกัน
³ ทุก role เข้าถึงได้เพราะสิทธิ์จริงผูกกับ `managerId` ไม่ใช่ role
⁴ `/admin/settings` เปิดให้ IT_ADMIN เข้าหน้าได้ แต่ backend หลาย endpoint ในหน้านั้น (จัดการผู้ใช้, backup, notification template) ล็อกไว้ที่ SUPERADMIN เท่านั้น — แปลว่า IT_ADMIN เห็นหน้าแต่กดบาง tab แล้วจะโดน 403 จาก backend (ต้อง verify ที่ frontend ว่าซ่อน control เหล่านั้นให้ IT_ADMIN หรือไม่ — ดู `09_module_admin_settings.md`)
⁵ `backup.ts` GET/POST (list/create) เปิดให้ IT_ADMIN ด้วย แต่ DELETE/restore ล็อก SUPERADMIN

---
*ไฟล์นี้เป็นส่วนหนึ่งของ System Blueprint — ดู `INDEX.md` สำหรับสารบัญเต็ม*
