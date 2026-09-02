# MODULE: Admin & Settings

## Module Profile

โมดูล Admin & Settings คือส่วนบริหารจัดการระบบทั้งหมดของ AssetHub/ITSM ครอบคลุมตั้งแต่การจัดการผู้ใช้และสิทธิ์, การตั้งค่าระบบ/อีเมล/LINE/Teams, การซิงก์ข้อมูลจาก Active Directory/Intra-tools, Backup & Restore ฐานข้อมูล, เทมเพลตการแจ้งเตือน, Audit Log/Login Log, และข้อมูลหลัก (Master Data) ที่ใช้ประกอบฟอร์มทะเบียนทรัพย์สินทั่วทั้งระบบ (บริษัท, แผนก, Vendor, Location, สถานะทรัพย์สิน, ประเภทอุปกรณ์, เครื่องพิมพ์, ชุด Checklist)

เข้าถึงได้จากเมนู "ตั้งค่าระบบ" (SettingsPage.tsx, เส้นทาง `/admin/settings`) ซึ่งเป็นหน้าแบบ Tab รวม 7 แท็บ และเมนู "ข้อมูลหลัก" (MasterDataManagementPage.tsx) ที่รวมหน้าย่อยของ master data เข้าด้วยกันแบบ embedded tabs เช่นกัน ผู้ใช้ส่วนใหญ่ต้องมีบทบาท `SUPERADMIN` หรือ `IT_ADMIN` จึงจะเข้าถึงได้ ยกเว้นบางหน้าอ่านอย่างเดียว (เช่น departments GET) ที่เปิดให้ผู้ใช้ล็อกอินทุกคน

Backend หลักที่ครอบคลุม: `backend/src/routes/admin.ts` (912 บรรทัด), `assetMasterData.ts` (568 บรรทัด), `departments.ts` (133 บรรทัด), `backup.ts` (25 บรรทัด + `backup.controller.ts` 106 บรรทัด), `settings.ts` (70 บรรทัด — SystemSetting คนละตารางกับ NotificationSetting), `notifications.ts` (68 บรรทัด — user-facing bell notifications ไม่ใช่ template), `ai.ts` (271 บรรทัด — Gemini chatbot), `presence.ts` (36 บรรทัด — who's online)

Frontend หลักที่ครอบคลุม: `frontend/src/pages/admin/*.tsx` ทั้งหมด (top-level, `master-data/`, `settings/`) รวมถึงหน้า master data ที่อยู่ใต้เมนู "ทะเบียนทรัพย์สิน IT" คือ `frontend/src/pages/assets/LocationsPage.tsx`, `VendorsPage.tsx`, `DeviceTypesPage.tsx`, `AssetStatusesPage.tsx`, `MasterDataPage.tsx` (shared CRUD component), `ImportExportPage.tsx`, `PrintQRPage.tsx`, `AgentDriftPage.tsx`

---

## Page/Tab Inventory

| ID | ชื่อหน้า/แท็บ | Route/Tab | วัตถุประสงค์ | Role | Evidence |
|---|---|---|---|---|---|
| ADM-01 | ตั้งค่าระบบ (SettingsPage) | `/admin/settings` (parent tab shell) | Container สำหรับแท็บย่อย 14 แท็บ (index 0-13) จัดกลุ่มเป็น 4 หมวดใน left-nav: ทั่วไป / ผู้ใช้ & สิทธิ์ / การแจ้งเตือน / ความปลอดภัย & ระบบ | เข้าหน้าได้ต้อง SUPERADMIN หรือ IT_ADMIN (ดู nav.tsx); แต่ละ item มี `roles` ของตัวเองซ้อนอีกชั้น | `frontend/src/pages/admin/SettingsPage.tsx:41-76` (TAB_GROUPS) |
| ADM-01a | ข้อมูลระบบ | Tab index 0 (inline ใน SettingsPage) | ชื่อระบบ, ชื่อองค์กร, โลโก้, timezone, welcome banner + preview UI จำลอง | SUPERADMIN เท่านั้น (`roles:['SUPERADMIN']`) | `SettingsPage.tsx:45, 276-364` |
| ADM-01b | กฎการยืม | Tab index 1 (inline) | borrowDays, maxBorrowDays, overdueWarningDays, maxItemsPerRequest, allowExtension, maxExtensionsPerRequest | SUPERADMIN เท่านั้น | `SettingsPage.tsx:46, 366-385` |
| ADM-01c | LINE แจ้งเตือน (จริงๆ ครอบ SMTP+Teams+Event toggle+Log ด้วย) | Tab index 2 (inline) | ตั้งค่า LINE Messaging API, SMTP Email, MS Teams webhook, เลือก event ที่แจ้งเตือน, ตารางประวัติการแจ้งเตือนพร้อม pagination | SUPERADMIN เท่านั้น | `SettingsPage.tsx:61, 387-527` |
| ADM-01d | Templates อีเมล (EmailTemplateEditor) | Tab index 3 | แก้ไข subject/body เทมเพลตอีเมล (จัดกลุ่ม 5 หมวด: คำขอยืม/ส่งมอบ-คืน/ขยายวัน/แจ้งเตือน/เครื่องใหม่&ส่งมอบ), รีเซ็ตเป็นค่าเริ่มต้น, พรีวิว HTML สด (iframe) — **ไม่มีปุ่ม "ทดสอบส่ง" ในหน้านี้แม้ backend จะมี endpoint `/notification-templates/:id/test` และ `adminAPI.testNotificationTemplate()` รออยู่ก็ตาม (dead frontend capability)** | SUPERADMIN เท่านั้น | `SettingsPage.tsx:62, 529-531`; `frontend/src/pages/admin/settings/EmailTemplateEditor.tsx`; unused: `frontend/src/services/api.ts:359` |
| ADM-01e | ความปลอดภัย | Tab index 4 (inline) | requireStrongPassword, passwordExpiryDays, sessionTimeoutHours, ปุ่ม "บังคับยกเลิกเซสชันทั้งหมด" | SUPERADMIN เท่านั้น | `SettingsPage.tsx:68, 533-553` |
| ADM-01f | ระบบ / Health | Tab index 5 (inline) | Health check: DB/LDAP/SMTP status + latency, ข้อมูลเซิร์ฟเวอร์ (เวอร์ชัน, API status, timestamp) | SUPERADMIN เท่านั้น | `SettingsPage.tsx:69, 555-590` |
| ADM-01g | จัดการข้อมูล | Tab index 6 (inline) | Export JSON backup (`GET /api/admin/backup`), Restore JSON, ค้นหา+เลือก+ลบทรัพย์สินเป็นชุด (bulk delete) | SUPERADMIN เท่านั้น | `SettingsPage.tsx:70, 592-685` |
| ADM-01h | การสร้างรหัสทรัพย์สิน (SystemSettingsTab) | Tab index 7 | ตั้งค่า COMPANY_PREFIXES (prefix Monitor/Printer ต่อบริษัท + padding เลข) และ PM_DISPLAY_FORMAT ผ่าน SystemSetting key-value (`/api/settings`) | ไม่จำกัด role เพิ่ม (เข้าหน้า SettingsPage ได้ก็เห็น) | `SettingsPage.tsx:47, 687-689`; `frontend/src/pages/admin/SystemSettingsTab.tsx` |
| ADM-01i | ผู้ใช้งาน (UsersPermissionsTab) | Tab index 8 | CRUD ผู้ใช้, ค้นหา/สร้างจาก AD, สร้าง local user, ตั้งรหัสผ่าน, มอบหมายหัวหน้างาน, เปลี่ยน role, ปิด/เปิดใช้งาน, ลบ | SUPERADMIN เท่านั้น | `SettingsPage.tsx:53, 691-693`; `frontend/src/pages/admin/settings/UsersPermissionsTab.tsx` |
| ADM-01j | บริษัท & หน่วยงาน (CompanyOrgTab) | Tab index 9 | รวม CompaniesPage + DepartmentManagementPage เป็น sub-tab เดียว | ไม่จำกัด role เพิ่ม | `SettingsPage.tsx:55, 695-697`; `frontend/src/pages/admin/settings/CompanyOrgTab.tsx` |
| ADM-01k | ตารางสิทธิ์รายเมนู (PermissionMatrixTab) | Tab index 10 | ตารางสรุปสิทธิ์ตาม Role (READ-ONLY, hardcoded ในโค้ด ไม่มี backend) | ไม่จำกัด role เพิ่ม | `SettingsPage.tsx:54, 699-701`; `frontend/src/pages/admin/settings/PermissionMatrixTab.tsx` |
| ADM-01l | เชื่อมต่อระบบภายนอก (IntegrationsTab) | Tab index 11 | รายการ connector สถานะการเชื่อมต่อ (hardcoded read-only list: AD, Entra SSO, GLPI Agent, Power Automate, MS Forms, SMTP, ERP, Print Server, PO, HR, Backup, External Asset API — ส่วนใหญ่ label "ไม่มีในระบบนี้"), แสดง External Asset API key/baseUrl/endpoint ตัวอย่างจาก `GET /api/admin/external-api-info` — **ไม่มีปุ่มทดสอบอีเมลหรือ Ping ในแท็บนี้** (ปุ่มทดสอบอีเมลไม่มีอยู่ใน UI เลย แม้ backend มี `POST /admin/test-email`; ปุ่ม Ping อยู่ในแท็บ "ระบบ / Health" index 5 คนละที่) | ไม่จำกัด role เพิ่ม | `SettingsPage.tsx:73, 703-705`; `frontend/src/pages/admin/settings/IntegrationsTab.tsx`; unused: `frontend/src/services/api.ts` testEmail |
| ADM-01m | Backup (BackupTab) | Tab index 12 | สร้าง/ดาวน์โหลด/ลบ/กู้คืนไฟล์ pg_dump (.sql) ผ่าน `backup.ts`/`BackupController` — คนละกลไกกับ JSON backup ใน tab จัดการข้อมูล | ไม่จำกัด role เพิ่ม (แต่ backend DELETE/restore บังคับ SUPERADMIN) | `SettingsPage.tsx:71, 707-709`; `frontend/src/pages/admin/settings/BackupTab.tsx` |
| ADM-01n | Audit Log (AuditLogTab) | Tab index 13 | แสดง login log ทั้งระบบ | ไม่จำกัด role เพิ่ม (แต่ backend `/login-logs` ต้อง IT_ADMIN/SUPERADMIN) | `SettingsPage.tsx:72, 711-713`; `frontend/src/pages/admin/settings/AuditLogTab.tsx` |

หมายเหตุสำคัญ: `SettingsPage.tsx:141` — ถ้า `user.role !== 'SUPERADMIN'` หน้าจะ**ไม่โหลด** `adminAPI.settings()` และ `adminAPI.notificationTemplates()` เลย (return ก่อน) หมายความว่าแท็บที่พึ่งพา `settings` state (index 0,1,2,4,6,7-inline) จะได้ค่าว่าง/placeholder สำหรับ IT_ADMIN แม้ไม่ได้ถูกซ่อนด้วย `roles` ก็ตาม — ส่วนแท็บที่ดึงข้อมูลของตัวเอง (UsersPermissionsTab, CompanyOrgTab, PermissionMatrixTab, IntegrationsTab, BackupTab, AuditLogTab, SystemSettingsTab) ทำงานได้ปกติเพราะ fetch เอง ไม่พึ่ง state กลางนี้
| ADM-02 | ข้อมูลหลัก (MasterDataManagementPage) | `/admin/master-data` | Container รวมหน้าย่อย master data แบบ embedded tabs | IT_ADMIN/SUPERADMIN | `frontend/src/pages/admin/MasterDataManagementPage.tsx` |
| ADM-03 | จัดการบริษัท (CompaniesPage) | `/admin/companies` หรือ embedded | CRUD บริษัท + sync จาก Intra-tools | SUPERADMIN/IT_ADMIN | `frontend/src/pages/admin/CompaniesPage.tsx` |
| ADM-04 | จัดการแผนก (DepartmentManagementPage) | `/admin/departments` | CRUD แผนก + sync AD | SUPERADMIN | `frontend/src/pages/admin/DepartmentManagementPage.tsx` |
| ADM-05 | ผังองค์กร/Flowchart (FlowchartsPage) | `/admin/flowcharts` | ดู/จัดการผังงาน (ตรวจสอบเพิ่มเติมด้านล่าง) | ตรวจสอบเพิ่มเติม | `frontend/src/pages/admin/FlowchartsPage.tsx` |
| ADM-06 | เครื่องพิมพ์ตามพื้นที่ (PrinterMasterPage) | master-data sub-tab | CRUD เครื่องพิมพ์ (floorArea, brandModel, IP, driver, PIN) | IT_ADMIN/SUPERADMIN | `frontend/src/pages/admin/master-data/PrinterMasterPage.tsx` |
| ADM-07 | ชุด Checklist ติดตั้ง (ChecklistSetMasterPage) | master-data sub-tab | CRUD ชุด checklist + รายการตรวจสอบในชุด (ผ่าน ChecklistItemsDialog) | IT_ADMIN/SUPERADMIN | `frontend/src/pages/admin/master-data/ChecklistSetMasterPage.tsx` |
| AST-01 | Location + Company (LocationsPage) | `/assets/locations` | CRUD สถานที่ตั้งทรัพย์สิน (ใช้ MasterDataPage shared component, `showCompanyField`) **คู่กับ CRUD บริษัทในหน้าเดียวกัน** (สอง `MasterDataPage` วางเป็น 2 คอลัมน์) | IT_ADMIN/SUPERADMIN | `frontend/src/pages/assets/LocationsPage.tsx:1-43` |
| AST-02 | Vendor (VendorsPage) | `/assets/vendors` | CRUD ผู้จำหน่าย ใช้ MasterDataPage shared component ตรงๆ | IT_ADMIN/SUPERADMIN | `frontend/src/pages/assets/VendorsPage.tsx:1-21` |
| AST-03 | ประเภทอุปกรณ์ (DeviceTypesPage) | `/assets/device-types` | CRUD ประเภทอุปกรณ์ — **ไม่ได้ใช้ MasterDataPage shared component แต่เป็นโค้ด bespoke ที่เขียนซ้ำ UI/logic เกือบเหมือนกันทั้งหมด** (duplicate implementation) | IT_ADMIN/SUPERADMIN | `frontend/src/pages/assets/DeviceTypesPage.tsx:1-367` |
| AST-04 | สถานะทรัพย์สิน (AssetStatusesPage) | `/assets/statuses` | CRUD สถานะทรัพย์สิน ใช้ MasterDataPage + `statusOptions` fix 6 ค่า — **รายการ status code/name ต่างจากที่ประกาศใน MasterDataManagementPage tab 3 (ดู Business Rules)** | IT_ADMIN/SUPERADMIN | `frontend/src/pages/assets/AssetStatusesPage.tsx:1-30` |
| AST-05 | Import/Export (ImportExportPage) | `/assets/import-export` | นำเข้าทรัพย์สิน (Excel/CSV ผ่าน `ImportAssetsButton`), ส่งออก Excel (client-side, แยก sheet ตาม type, เลือกรูปแบบวันที่ ISO/ไทย) หรือ CSV (`assetAPI.exportCSV()`), ดาวน์โหลด template พร้อมตัวอย่างข้อมูล, ตารางคอลัมน์ที่รองรับทั้งหมด (54 คอลัมน์) | IT_ADMIN/SUPERADMIN | `frontend/src/pages/assets/ImportExportPage.tsx:1-506` |
| AST-06 | พิมพ์ QR Code (PrintQRPage) | `/assets/print-qr` | เลือกทรัพย์สิน (filter ตามประเภท/ค้นหา, infinite-scroll load-more), ตั้งค่า layout สติ๊กเกอร์ (ขนาดกระดาษ A4/A5, ขนาดสติ๊กเกอร์ S/L, จำนวนคอลัมน์ 2-4, สไตล์ default/dark/minimal), เลือกฟิลด์แสดงผลบน label (5 ฟิลด์หลัก toggle + ฟิลด์เพิ่มเติม 18 รายการผ่าน FieldPicker), พรีวิวสด, ปุ่มพิมพ์ (`window.print()` พร้อม CSS `@media print` เฉพาะโซน) — ปุ่ม PNG/PDF export **แสดงเป็น disabled ถาวร** (ยังไม่เปิดใช้งาน) | IT_ADMIN/SUPERADMIN | `frontend/src/pages/assets/PrintQRPage.tsx:1-1029` |
| AST-07 | Agent Drift (AgentDriftPage) | `/assets/agent-drift` | 3 แท็บย่อย: (1) "สเปกเครื่อง" — เทียบทะเบียนกับ Agent, แยกช่องว่างที่เติมได้อัตโนมัติ (`agentFillBlanks`) กับค่าที่ขัดกันต้องตัดสินใจเอง, แสดงเครื่องที่ Agent เห็นแต่ยังไม่มีทะเบียน (ปุ่ม "สร้างทะเบียน"); (2) "จอภาพ" — จับคู่/สร้าง/link จอกับเครื่อง แบ่ง bucket FIX/CREATE/LINK/OK/MANUAL; (3) "สุขภาพเครื่อง" — คะแนนความเสี่ยงต่อเครื่อง, License breakdown, เวอร์ชัน Agent — **endpoint ที่ใช้ (`assetAPI.agentDrift/agentFillBlanks/agentMonitors/agentHealth`) อยู่นอกไฟล์ routes ที่กำหนดให้สำรวจในสโคปนี้ (คาดว่าอยู่ใน assets.ts หรือ agentMonitors service) จึงไม่ปรากฏใน API Inventory ด้านล่าง** | IT_ADMIN/SUPERADMIN | `frontend/src/pages/assets/AgentDriftPage.tsx:1-588`, backend service `backend/src/services/agentMonitors.ts` (ไม่ได้อ่านในสโคปนี้) |

(รายละเอียดแต่ละแท็บ/หน้าจะขยายความในหัวข้อ UI Components ถัดไป — เอกสารนี้กำลังเขียนแบบ incremental)

---

## API Inventory — Backend Routes (admin.ts, assetMasterData.ts, departments.ts, backup.ts, settings.ts, notifications.ts, ai.ts, presence.ts)

> หมายเหตุ: ตารางนี้ยาวมากตามคำสั่ง ครอบคลุมทุก route ในไฟล์ที่ระบุ

### admin.ts (mounted ที่ `/api/admin`)

| Method | Endpoint | Purpose | Auth/Roles | Request | Response | Evidence |
|---|---|---|---|---|---|---|
| GET | `/ad-companies` | ดึงรายชื่อบริษัทจาก AD | SUPERADMIN, IT_ADMIN | - | Array บริษัทจาก LDAP | `admin.ts:32-37` |
| POST | `/sync-companies` | ซิงก์บริษัท+แผนกจาก Intra-tools | SUPERADMIN, IT_ADMIN | - | `{message, company:{added}, department:{added}}` | `admin.ts:41-46` |
| GET | `/users/search-ad` | ค้นหาผู้ใช้ใน AD | SUPERADMIN | query `q` | ผลลัพธ์ AD search | `admin.ts:47-54` |
| POST | `/users/from-ad` | สร้างผู้ใช้จากผลค้นหา AD | SUPERADMIN | `{adUsername, displayName, email, department, role}` | AppUser ที่สร้าง (201) | `admin.ts:56-70` |
| GET | `/users` | รายการผู้ใช้ (แบ่งหน้า/ค้นหา/กรอง role) | SUPERADMIN | query `search, role, page, limit` | `{data, total, page, totalPages}` | `admin.ts:72-99` |
| PUT | `/users/:id/role` | เปลี่ยนบทบาทผู้ใช้ | SUPERADMIN | `{role}` ∈ SUPERADMIN/IT_ADMIN/USER/VIEWER | `{message}` | `admin.ts:101-119` |
| PUT | `/users/:id/manager` | กำหนด/ยกเลิกหัวหน้างานของผู้ใช้ (กันวนลูป) | SUPERADMIN | `{managerId}` (null = ยกเลิก) | `{message}` | `admin.ts:122-151` |
| PUT | `/users/:id/toggle-active` | เปิด/ปิดการใช้งานผู้ใช้ | SUPERADMIN | - | `{message, isActive}` | `admin.ts:153-165` |
| DELETE | `/users/:id` | ลบผู้ใช้ (ห้ามลบตัวเอง, กันลบถ้ามี FK) | SUPERADMIN | - | `{message}` หรือ 400 ถ้ามี FK ผูก | `admin.ts:167-186` |
| POST | `/users/local` | สร้าง local user (ไม่ผ่าน AD) | SUPERADMIN | `{username, password≥8, displayName, role}` | user ที่สร้าง (201) | `admin.ts:189-201` |
| PUT | `/users/:id/local-password` | ตั้งรหัสผ่านใหม่ให้ local user | SUPERADMIN | `{password≥8}` | `{message}` | `admin.ts:203-215` |
| GET | `/users/:id` | ดูรายละเอียดผู้ใช้รายคน | SUPERADMIN | - | user object + manager | `admin.ts:217-227` |
| GET | `/external-api-info` | ดูค่า config API ภายนอก (คืนค่า apiKey แบบ plaintext) | SUPERADMIN | - | `{configured, baseUrl, apiKey}` | `admin.ts:236-242` |
| GET | `/settings` | ดึง NotificationSetting (secret ถูก redact) | SUPERADMIN | - | settings object (secret fields = `••••••••`) | `admin.ts:272-280` |
| PUT | `/settings` | อัปเดต NotificationSetting (SMTP/LINE/Teams/borrow policy/security) | SUPERADMIN | หลายฟิลด์ (ดู Forms & Fields) — ค่า mask `••••••••` = ไม่เปลี่ยน | settings ที่อัปเดต (redacted) | `admin.ts:282-338` |
| POST | `/test-email` | ทดสอบส่งอีเมลด้วยค่า SMTP ที่กรอก | SUPERADMIN | `{to, smtpHost, smtpPort, smtpUser, smtpPass, smtpFromEmail, smtpFromName}` | `{success, message}` | `admin.ts:341-383` |
| GET | `/ping` | เช็คสถานะ server/DB/SMTP/LDAP | SUPERADMIN | - | `{server, database, smtp, ldap}` แต่ละอันมี status/message/latency | `admin.ts:386-439` |
| POST | `/force-logout-all` | บังคับออกจากระบบทุก session (placeholder — ไม่ได้ invalidate token จริง) | SUPERADMIN | - | `{success, message}` | `admin.ts:442-444` |
| GET | `/notification-templates` | รายการเทมเพลตแจ้งเตือนทั้งหมด | SUPERADMIN | - | Array NotificationTemplate | `admin.ts:447-452` |
| POST | `/notification-templates` | สร้างเทมเพลตใหม่ | SUPERADMIN | NotificationTemplate fields | template ที่สร้าง (201) | `admin.ts:454-459` |
| POST | `/notification-templates/:id/reset` | รีเซ็ตเทมเพลตกลับค่า default (จาก DEFAULT_TEMPLATES) | SUPERADMIN | - | template ที่อัปเดต หรือ 400 ถ้าไม่มี default | `admin.ts:461-479` |
| PUT | `/notification-templates/:id` | แก้ไข subject/body เทมเพลต | SUPERADMIN | `{subjectTh, bodyTh, ...}` | template ที่อัปเดต | `admin.ts:481-487` |
| POST | `/notification-templates/:id/test` | ส่งอีเมลทดสอบด้วยเทมเพลต+ข้อมูลตัวอย่าง (mock) | SUPERADMIN | `{to}` | `{success, message}` | `admin.ts:489-622` |
| GET | `/notification-logs` | ประวัติการส่งแจ้งเตือน (NotificationOutbox) | SUPERADMIN | query `page, limit` | `{data, total, page, totalPages}` | `admin.ts:625-640` |
| GET | `/login-logs` | ประวัติการล็อกอินทั้งระบบ | IT_ADMIN, SUPERADMIN | query `limit≤500, failedOnly, username` | `{data, total, failedLast24h}` | `admin.ts:647-669` |
| GET | `/backup` | Export backup เป็น JSON (assets+master data) ดาวน์โหลดทันที | SUPERADMIN | - | ไฟล์ JSON (`assethub-backup-YYYY-MM-DD.json`) | `admin.ts:670-698` |
| POST | `/restore` | นำเข้าไฟล์ JSON backup กลับเข้าระบบ (upsert master data, skip asset ที่ assetCode ซ้ำ) | SUPERADMIN | multipart `file` (≤100MB) | `{message}` สรุปจำนวนนำเข้า/ข้าม | `admin.ts:700-811` |
| POST | `/clear-all-assets` | ล้างทะเบียนทรัพย์สินทั้งหมด (รวม PM/history/maintenance/donation ที่เกี่ยวข้อง) | SUPERADMIN | - | `{message}` จำนวนที่ลบ | `admin.ts:814-841` |
| POST | `/advanced-clear-data` | ล้างข้อมูลแบบเลือกได้ (assets/borrow/donations/master data/users) | SUPERADMIN | `{clearAssets, clearBorrow, clearDonations, clearMasterData, clearUsers}` (boolean) | `{message}` | `admin.ts:843-909` |

### assetMasterData.ts (mounted ที่ `/api/assets` ร่วมกับ assets.ts — ต้องมาก่อน assets.ts's `GET /:id`)

| Method | Endpoint | Purpose | Auth/Roles | Request | Response | Evidence |
|---|---|---|---|---|---|---|
| GET | `/device-types` | รายการประเภทอุปกรณ์ + assetCount ต่อประเภท | IT_ADMIN, SUPERADMIN | - | Array `{...deviceType, assetCount}` | `assetMasterData.ts:21-35` |
| POST | `/device-types` | สร้างประเภทอุปกรณ์ | IT_ADMIN, SUPERADMIN | `{name, description?, isActive?}` | created (201) | `assetMasterData.ts:37-52` |
| PUT | `/device-types/:typeId` | แก้ไขประเภทอุปกรณ์ | IT_ADMIN, SUPERADMIN | `{name, description?, isActive?}` | updated | `assetMasterData.ts:54-72` |
| DELETE | `/device-types/:typeId` | ลบประเภทอุปกรณ์ | IT_ADMIN, SUPERADMIN | - | `{message}` | `assetMasterData.ts:74-83` |
| POST | `/device-types/import-from-assets` | นำเข้าค่า distinct จาก Asset.type ที่ยังไม่มีใน master | IT_ADMIN, SUPERADMIN | - | `{imported: count}` | `assetMasterData.ts:85-105` |
| GET | `/locations` | รายการ location + assetCount | IT_ADMIN, SUPERADMIN | - | Array `{...location, assetCount}` | `assetMasterData.ts:107-116` |
| POST | `/locations` | สร้าง location | IT_ADMIN, SUPERADMIN | `{name, company?, description?, isActive?}` | created (201) | `assetMasterData.ts:118-132` |
| PUT | `/locations/:locationId` | แก้ไข location | IT_ADMIN, SUPERADMIN | เหมือน POST | updated | `assetMasterData.ts:134-151` |
| DELETE | `/locations/:locationId` | ลบ location | IT_ADMIN, SUPERADMIN | - | `{message}` | `assetMasterData.ts:153-161` |
| POST | `/locations/import-from-assets` | นำเข้า location+company distinct จาก Asset | IT_ADMIN, SUPERADMIN | - | `{imported: count}` | `assetMasterData.ts:163-186` |
| GET | `/companies` | รายการบริษัท + assetCount | IT_ADMIN, SUPERADMIN | - | Array `{...company, assetCount}` | `assetMasterData.ts:188-197` |
| POST | `/companies` | สร้างบริษัท | IT_ADMIN, SUPERADMIN | `{name, description?, assetCompanyCodes?, isActive?}` | created (201) | `assetMasterData.ts:199-211` |
| PUT | `/companies/:companyId` | แก้ไขบริษัท | IT_ADMIN, SUPERADMIN | เหมือน POST | updated | `assetMasterData.ts:213-227` |
| DELETE | `/companies/:companyId` | ลบบริษัท | IT_ADMIN, SUPERADMIN | - | `{message}` | `assetMasterData.ts:229-237` |
| POST | `/companies/import-from-assets` | นำเข้าค่า distinct จาก Asset.company | IT_ADMIN, SUPERADMIN | - | `{imported: count}` | `assetMasterData.ts:239-246` |
| GET | `/vendors` | รายการ vendor + assetCount | IT_ADMIN, SUPERADMIN | - | Array `{...vendor, assetCount}` | `assetMasterData.ts:248-257` |
| POST | `/vendors` | สร้าง vendor | IT_ADMIN, SUPERADMIN | `{name, description?, isActive?}` | created (201) | `assetMasterData.ts:259-270` |
| PUT | `/vendors/:vendorId` | แก้ไข vendor | IT_ADMIN, SUPERADMIN | เหมือน POST | updated | `assetMasterData.ts:272-285` |
| DELETE | `/vendors/:vendorId` | ลบ vendor | IT_ADMIN, SUPERADMIN | - | `{message}` | `assetMasterData.ts:287-295` |
| POST | `/vendors/import-from-assets` | นำเข้าค่า distinct จาก Asset.vendor | IT_ADMIN, SUPERADMIN | - | `{imported: count}` | `assetMasterData.ts:297-304` |
| GET | `/asset-statuses` | รายการสถานะทรัพย์สิน + assetCount | IT_ADMIN, SUPERADMIN | - | Array `{...status, assetCount}` | `assetMasterData.ts:306-315` |
| POST | `/asset-statuses` | สร้างสถานะ (code ต้องอยู่ใน ASSET_STATUS_OPTIONS) | IT_ADMIN, SUPERADMIN | `{code, name, description?, isActive?}` | created (201) | `assetMasterData.ts:317-330` |
| PUT | `/asset-statuses/:statusId` | แก้ไขสถานะ | IT_ADMIN, SUPERADMIN | เหมือน POST | updated | `assetMasterData.ts:332-347` |
| DELETE | `/asset-statuses/:statusId` | ลบสถานะ | IT_ADMIN, SUPERADMIN | - | `{message}` | `assetMasterData.ts:349-357` |
| GET | `/printers` | รายการเครื่องพิมพ์ | IT_ADMIN, SUPERADMIN | - | Array Printer | `assetMasterData.ts:360-365` |
| POST | `/printers` | สร้างเครื่องพิมพ์ | IT_ADMIN, SUPERADMIN | `{floorArea, brandModel, serialNo?, ipAddress?, driver?, pinNote?, status?, isActive?}` | created (201) | `assetMasterData.ts:367-386` |
| PUT | `/printers/:printerId` | แก้ไขเครื่องพิมพ์ | IT_ADMIN, SUPERADMIN | เหมือน POST | updated | `assetMasterData.ts:388-412` |
| DELETE | `/printers/:printerId` | ลบเครื่องพิมพ์ | IT_ADMIN, SUPERADMIN | - | `{message}` | `assetMasterData.ts:414-422` |
| GET | `/checklist-sets` | รายการชุด checklist (item/category count คำนวณสด) | IT_ADMIN, SUPERADMIN | - | Array ChecklistSet + count | `assetMasterData.ts:425-440` |
| GET | `/checklist-sets/:setId/items` | รายการ item ในชุด | IT_ADMIN, SUPERADMIN | - | Array ChecklistItem (เรียง sortOrder) | `assetMasterData.ts:442-450` |
| POST | `/checklist-sets/:setId/items` | เพิ่ม item ในชุด (sortOrder ต่อท้าย) | IT_ADMIN, SUPERADMIN | `{category, itemText, refCode?, answerType?}` | created (201) | `assetMasterData.ts:452-473` |
| PUT | `/checklist-sets/:setId/items/:itemId` | แก้ไข item | IT_ADMIN, SUPERADMIN | `{category, itemText, refCode?, answerType?}` | updated | `assetMasterData.ts:475-494` |
| DELETE | `/checklist-sets/:setId/items/:itemId` | ลบ item | IT_ADMIN, SUPERADMIN | - | `{message}` | `assetMasterData.ts:496-504` |
| POST | `/checklist-sets` | สร้างชุด checklist | IT_ADMIN, SUPERADMIN | `{docCode, name, appliesToCategories?, itemCount?, categoryCount?, avgTimeLabel?, revision?, isActive?}` | created (201) | `assetMasterData.ts:506-528` |
| PUT | `/checklist-sets/:setId` | แก้ไขชุด | IT_ADMIN, SUPERADMIN | เหมือน POST | updated | `assetMasterData.ts:530-555` |
| DELETE | `/checklist-sets/:setId` | ลบชุด | IT_ADMIN, SUPERADMIN | - | `{message}` | `assetMasterData.ts:557-565` |

### departments.ts (mounted ที่ `/api/departments`)

| Method | Endpoint | Purpose | Auth/Roles | Request | Response | Evidence |
|---|---|---|---|---|---|---|
| GET | `/` | รายการแผนก (ค้นหาได้) | authenticate เท่านั้น (ทุก role) | query `search?` | Array Department | `departments.ts:10-26` |
| GET | `/:id` | ดูแผนกรายตัว | authenticate เท่านั้น | - | Department หรือ 404 | `departments.ts:29-36` |
| POST | `/` | สร้างแผนก (กันชื่อ/code ซ้ำ) | SUPERADMIN | `{name, code?, description?}` | created (201) | `departments.ts:39-70` |
| PUT | `/:id` | แก้ไขแผนก (กันชื่อซ้ำ) | SUPERADMIN | `{name?, code?, description?}` | updated | `departments.ts:73-102` |
| DELETE | `/:id` | ลบแผนก (บล็อกถ้ามี asset ผูกอยู่) | SUPERADMIN | - | `{message}` หรือ 400 | `departments.ts:105-120` |
| POST | `/sync-ad` | ซิงก์แผนก+บริษัทจาก Intra-tools (เรียก service เดียวกับ admin.ts) | SUPERADMIN | - | `{message, addedCount}` | `departments.ts:125-130` |

### backup.ts (mounted ที่ path ของตัวเอง, ใช้ `BackupController`; ต่างจาก `admin.ts` GET/POST `/backup` ที่เป็น JSON export)

| Method | Endpoint | Purpose | Auth/Roles | Request | Response | Evidence |
|---|---|---|---|---|---|---|
| GET | `/:filename/download` | ดาวน์โหลดไฟล์ pg_dump backup (.sql) รองรับ query token | SUPERADMIN, IT_ADMIN | query token (ผ่าน `allowQueryToken`) | ไฟล์ .sql | `backup.ts:11`, `backup.controller.ts:74-82` |
| GET | `/` | รายการไฟล์ backup ในโฟลเดอร์ `backups/` | SUPERADMIN, IT_ADMIN | - | Array `{filename, size, createdAt}` เรียงใหม่สุดก่อน | `backup.ts:12`, `backup.controller.ts:12-31` |
| POST | `/` | สร้าง backup ใหม่ด้วย `pg_dump --clean --if-exists` | SUPERADMIN, IT_ADMIN | - | `{message, filename}` | `backup.ts:13`, `backup.controller.ts:33-61` |
| DELETE | `/:filename` | ลบไฟล์ backup | SUPERADMIN เท่านั้น | - | `{message}` | `backup.ts:21`, `backup.controller.ts:63-72` |
| POST | `/:filename/restore` | กู้คืนฐานข้อมูลด้วย `psql --file` (ทับข้อมูลจริงทั้งหมด) | SUPERADMIN เท่านั้น | - | `{message}` | `backup.ts:22`, `backup.controller.ts:84-105` |

หมายเหตุ role: comment ใน `backup.ts:15-20` ระบุว่าเดิม DELETE/restore เปิดให้ IT_ADMIN ด้วย แต่ถูกแก้ให้ตรงกับ `admin.ts` /restore (SUPERADMIN เท่านั้น) เพื่อความสอดคล้อง — เป็นจุดที่เคย "audit finding" แล้วแก้ไข

### settings.ts (mounted ที่ `/api/settings` — คนละตารางกับ `admin.ts`'s `/settings`: ใช้ `SystemSetting` key-value table ไม่ใช่ `NotificationSetting`)

| Method | Endpoint | Purpose | Auth/Roles | Request | Response | Evidence |
|---|---|---|---|---|---|---|
| GET | `/` | รายการ SystemSetting ทั้งหมด (เรียงตาม group) | IT_ADMIN, SUPERADMIN | - | Array SystemSetting | `settings.ts:9-16` |
| GET | `/:key` | ดึงค่า setting รายคีย์ (ใช้โดย PMDeviceArrayInput อ่าน `PM_DISPLAY_FORMAT`) | IT_ADMIN, SUPERADMIN | - | SystemSetting หรือ `{value: null}` | `settings.ts:18-33` |
| PUT | `/` | อัปเดตหลาย setting พร้อมกัน (upsert) | IT_ADMIN, SUPERADMIN | `{settings: [{key, value, group?, description?}]}` | `{message, updated[]}` | `settings.ts:36-67` |

### notifications.ts (mounted ที่ `/api/notifications` — user-facing bell/AppNotification ไม่ใช่ template/outbox)

| Method | Endpoint | Purpose | Auth/Roles | Request | Response | Evidence |
|---|---|---|---|---|---|---|
| GET | `/` | แจ้งเตือนล่าสุด 20 รายการของผู้ใช้ปัจจุบัน | authenticate ทุก role | - | Array AppNotification | `notifications.ts:8-21` |
| PUT | `/:id/read` | ทำเครื่องหมายอ่านแล้ว (ตรวจสอบเจ้าของ) | authenticate (เจ้าของ notification เท่านั้น) | - | `{message}` หรือ 403/404 | `notifications.ts:24-49` |
| PUT | `/read-all` | ทำเครื่องหมายอ่านทั้งหมดของผู้ใช้ปัจจุบัน | authenticate ทุก role | - | `{message}` | `notifications.ts:52-65` |

### ai.ts (mounted ที่ path ของตัวเอง — Gemini-powered chatbot ผู้ช่วยค้นข้อมูลทรัพย์สิน)

| Method | Endpoint | Purpose | Auth/Roles | Request | Response | Evidence |
|---|---|---|---|---|---|---|
| POST | `/chat` | แชทกับ AI (Gemini function-calling: ค้นทรัพย์สิน/สถิติ/สัญญา-ไลเซนส์ใกล้หมดอายุ/PM เกินกำหนด/ยืมเกินกำหนด) สตรีมผลลัพธ์แบบ SSE | authenticate ทุก role | `{messages: [{role, text}]}` | SSE stream: `{type:'chunk'|'tool'|'done'|'error', ...}` | `ai.ts:188-269` |

Business note: ฟังก์ชันที่ AI เรียกได้ (tool ผูกกับ Prisma โดยตรง ไม่มี role filter เพิ่มเติมนอกจาก authenticate) — `search_assets`, `get_asset_stats`, `get_expiring_items`, `get_overdue_pm`, `get_overdue_borrows` (`ai.ts:23-76, 80-183`) หมายความว่า USER ทั่วไปที่ login ได้ก็ถามข้อมูลทรัพย์สิน/สัญญา/PM ของทั้งองค์กรผ่านแชทได้ ไม่ได้จำกัดเฉพาะของตัวเอง — ตรวจสอบเพิ่มเติมว่าตั้งใจหรือไม่

### presence.ts (mounted ที่ path ของตัวเอง — who's-online tracking)

| Method | Endpoint | Purpose | Auth/Roles | Request | Response | Evidence |
|---|---|---|---|---|---|---|
| POST | `/heartbeat` | ผู้ใช้ที่ login รายงานสถานะออนไลน์ของตัวเอง (frontend เรียกทุกครั้งที่เปลี่ยนหน้า + ทุก ~25 วิ) | authenticate ทุก role | `{path}` (ตัดที่ 200 ตัวอักษร) | `{ok: true}` | `presence.ts:10-14` |
| GET | `/online` | รายชื่อผู้ใช้ที่ออนไลน์ตอนนี้พร้อมกิจกรรม/hostname/IP | IT_ADMIN, SUPERADMIN, VIEWER | - | Array `{userId, displayName, adUsername, role, avatarUrl, activity, zone, hostname, ip, lastSeen}` | `presence.ts:18-33` |

---

## UI Components & Buttons/Actions ต่อหน้า/แท็บ

### ADM-01a ข้อมูลระบบ (SettingsPage tab 0)
ฟอร์มแก้ไข: ชื่อระบบ, ชื่อองค์กร, URL โลโก้, เขตเวลา (dropdown มีตัวเลือกเดียว Asia/Bangkok), Switch "แบนเนอร์ต้อนรับ" + กล่อง preview จำลองหน้าตาระบบแบบสด (mock browser frame) `SettingsPage.tsx:276-364`

### ADM-01b กฎการยืม (tab 1)
TextField ตัวเลข: วันยืมมาตรฐาน, จำนวนวันยืมสูงสุด, ระยะเวลาเตือนก่อนเกินกำหนด, จำนวนรายการสูงสุดต่อคำขอ, Switch "อนุญาตให้ขอต่ออายุ" + TextField จำนวนครั้งขอต่ออายุสูงสุด (แสดงเมื่อเปิด) `SettingsPage.tsx:366-385`

### ADM-01c LINE/SMTP/Teams/Events/Log (tab 2)
- การ์ด LINE พร้อม Switch เปิด/ปิด, ฟิลด์ Channel Access Token (type password ถ้ามีค่า), Webhook URL, Verify Token, ปุ่มเลือกโหมดส่ง Broadcast/Push (Chip toggle), ฟิลด์ User/Group IDs เมื่อเลือก Push
- การ์ด SMTP: Switch เปิด/ปิด, Host/Port/Username/Password/From Email/From Name/CC Emails
- การ์ด MS Teams: Switch เปิด/ปิด, Webhook URL
- Chip toggle เลือก "เหตุการณ์ที่ต้องการแจ้งเตือน" 10 รายการ (borrow_request_pending ... delivery_confirm_request) — ค่าเก็บเป็น comma-separated string `enabledEventKeys`
- ตารางประวัติการแจ้งเตือนล่าสุด พร้อมปุ่มรีเฟรชและ pagination (ปุ่มซ้าย/ขวา) `SettingsPage.tsx:387-527`
- ปุ่ม "บันทึก" (save bar ลอยด้านล่างเมื่อมีการแก้ไข `isDirty()`) เรียก `PUT /api/admin/settings` ครั้งเดียวรวมทุก field ในทุกแท็บ inline (0,1,2,4,6) `SettingsPage.tsx:156-200, 735-748`

### ADM-01d Templates อีเมล (EmailTemplateEditor)
- หน้ารายการ: การ์ดเทมเพลตจัดกลุ่ม 5 หมวด คลิกเพื่อเข้าสู่โหมดแก้ไข
- หน้าแก้ไข: TextField หัวข้ออีเมล, Textarea เนื้อหา HTML (16 แถว, font monospace), Chip แทรกตัวแปร (placeholder) แยกกลุ่มตามบริบท, iframe พรีวิวอีเมลสด (sandbox="allow-same-origin"), ปุ่ม "คืนค่าเริ่มต้น" (`POST /notification-templates/:id/reset`), ปุ่ม "บันทึก" (`PUT /notification-templates/:id` ผ่าน parent `handleSaveTemplate`), ปุ่ม "ยกเลิก"/"← กลับ" `EmailTemplateEditor.tsx:99-166`

### ADM-01e ความปลอดภัย (tab 4)
Switch "บังคับใช้รหัสผ่านที่ซับซ้อน", TextField อายุรหัสผ่าน (วัน), TextField หมดอายุเซสชัน (ชั่วโมง), ปุ่ม "บังคับยกเลิกเซสชัน" สีแดง (confirm dialog แบบ `window.confirm` แล้วเรียก `POST /admin/force-logout-all`) `SettingsPage.tsx:533-553`

### ADM-01f ระบบ / Health (tab 5)
รายการ StatusRow (DB/LDAP/SMTP) พร้อมไอคอนออนไลน์/ออฟไลน์และ latency, ปุ่มรีเฟรช (`GET /admin/ping`), กล่องข้อมูลเซิร์ฟเวอร์ (เวอร์ชัน hardcode "2.0.0", API status, timestamp), Alert เตือนเมื่อ LDAP offline `SettingsPage.tsx:555-590`

### ADM-01g จัดการข้อมูล (tab 6)
- ปุ่ม "ดาวน์โหลด Backup" (JSON, `GET /admin/backup`, blob download ฝั่ง client)
- ปุ่ม "เลือกไฟล์" + ปุ่ม "กู้คืนข้อมูล" (JSON, `POST /admin/restore`)
- ตาราง "ล้างข้อมูล": ค้นหาทรัพย์สิน, checkbox เลือกหลายรายการ (เลือกทั้งหมด/บางส่วน), ปุ่ม "ลบ N รายการ" เปิด dialog ยืนยัน แล้วเรียก `assetAPI.bulkDelete(selectedIds)` (endpoint นอกโมดูลนี้ อยู่ใน assets.ts) `SettingsPage.tsx:592-685, 718-732`
- หมายเหตุ: ปุ่ม "ล้างข้อมูลทะเบียนทรัพย์สินทั้งหมด" (`POST /admin/clear-all-assets`) และ "ล้างข้อมูลแบบเลือกได้" (`POST /admin/advanced-clear-data`) มี backend รองรับ แต่**ไม่พบปุ่มเรียกใช้ทั้งสอง endpoint นี้ในหน้า UI ที่สำรวจ** — อาจเป็นฟีเจอร์ที่ยังไม่เปิดใช้งานหรือถูกแทนที่ด้วย bulk-delete ในตารางนี้แล้ว ต้องตรวจสอบเพิ่ม

### ADM-01h การสร้างรหัสทรัพย์สิน (SystemSettingsTab)
ฟิลด์ "รูปแบบการแสดงผลหน้า PM" (PM_DISPLAY_FORMAT), ตารางแก้ไข COMPANY_PREFIXES แบบ dynamic rows (บริษัท/Prefix Monitor/Prefix Printer/จำนวนหลัก) พร้อมปุ่มเพิ่ม/ลบแถว, ปุ่ม "บันทึกการตั้งค่า" เขียนทั้งสอง key ผ่าน `PUT /api/settings` พร้อมกัน `SystemSettingsTab.tsx:60-99, 121-238`

### ADM-01i ผู้ใช้งาน (UsersPermissionsTab)
- KPI strip: ผู้ใช้ทั้งหมด/ใช้งานอยู่/AD/Local (คำนวณจาก client-side)
- การ์ด "การเชื่อมต่อ AD" — เป็น**ข้อความอธิบายสถานะปัจจุบันเท่านั้น ไม่มีปุ่มทำงาน** (ระบุชัดว่า sync ตามตารางเวลาอัตโนมัติยังไม่เปิดใช้งาน) `UsersPermissionsTab.tsx:286-301`
- ตาราง "บทบาทในระบบ": 6 บทบาท canonical (SUPERADMIN, IT_ADMIN, APPROVER, VIEWER, USER, VENDOR) — APPROVER และ VENDOR มี flag `live:false` (แสดง "ยังไม่เปิดใช้งาน" เพราะยังไม่มีในระบบจริง) `UsersPermissionsTab.tsx:31-38`
- ตาราง "รายชื่อผู้ใช้": ค้นหา + กรอง role/แผนก/สถานะ, ปุ่ม "ส่งออกรายชื่อ" (Excel ผ่าน `xlsx` client-side), ปุ่ม "เพิ่มผู้ใช้งานใหม่" เปิด dialog สองแท็บ (ค้นหาจาก AD / สร้างผู้ใช้ทดสอบ Manual), ต่อแถวมีปุ่มไอคอน: ตั้งค่าสิทธิ์ (role dialog), ตั้งหัวหน้างาน (manager dialog), ตั้ง/เปลี่ยนรหัสผ่าน local, ปิด/เปิดใช้งาน (toggle-active), ลบผู้ใช้ (มี `window.confirm`) — จำกัดแสดง 30 แถวแรกของผลกรอง `UsersPermissionsTab.tsx:274-690`
- Dialog มอบหมายหัวหน้างานอธิบายชัดว่าเชื่อมกับ flow อนุมัติคำขอยืม (borrow supervisor approval) `UsersPermissionsTab.tsx:516-525`

### ADM-01j บริษัท & หน่วยงาน (CompanyOrgTab) — READ-ONLY
ตาราง "บริษัทในเครือ" และ "แผนก/หน่วยงาน" **ไม่มีปุ่ม CRUD ในแท็บนี้เลย** เป็นการแสดงผลอย่างเดียว พร้อมข้อความชี้ไปที่เมนู "ข้อมูลหลัก" สำหรับจัดการแบบเต็มรูปแบบ `CompanyOrgTab.tsx:1-117` (ต่างจาก ADM-03/ADM-04/ADM-02 ที่มี CRUD เต็ม)

### ADM-01k ตารางสิทธิ์รายเมนู (PermissionMatrixTab) — READ-ONLY, hardcoded
ตาราง 13 แถว x 4 คอลัมน์ (SUPERADMIN/IT_ADMIN/VIEWER/USER) ค่า full/read/none — **ข้อมูลถูกเขียนตายตัวในซอร์สโค้ด ไม่ได้ดึงจาก backend หรือฐานข้อมูลสิทธิ์ใดๆ** ระบบยังไม่มีตาราง permission แยก — comment ในโค้ดยืนยันว่า "การจะแก้สิทธิ์ต้องแก้โค้ดโดยตรง" `PermissionMatrixTab.tsx:16-33, 51-55`

### ADM-01l เชื่อมต่อระบบภายนอก (IntegrationsTab) — READ-ONLY connector list + API info
Grid การ์ดสถานะ connector 12 รายการ (ส่วนใหญ่ "ไม่มีในระบบนี้"), กล่องแสดง External Asset API key/header/base URL (จาก `GET /admin/external-api-info`), ตาราง endpoint 4 รายการของ external API, ตัวอย่างคำสั่ง curl-like — **ไม่มีปุ่ม action ใดๆ ในแท็บนี้** (อ่านอย่างเดียวทั้งหมด) `IntegrationsTab.tsx:1-178`

### ADM-01m Backup (BackupTab)
ตารางไฟล์ .sql พร้อมขนาด/วันที่, ปุ่ม "สร้าง Backup ตอนนี้" (`POST /api/backup`), ต่อแถวมีปุ่มดาวน์โหลด (ทุก role ที่เข้าถึงแท็บได้), ปุ่มกู้คืน/ลบ (แสดงเฉพาะ `user.role === 'SUPERADMIN'` ฝั่ง frontend — `canDestroy` — สอดคล้องกับ backend guard) เปิด confirm dialog ก่อนทำจริงทุกครั้ง ข้อความระบุ "สำรองข้อมูลอัตโนมัติทุกวัน 02:00 น. เก็บย้อนหลัง 180 วัน" (ไม่พบโค้ด cron/scheduler ที่ตั้งเวลานี้ในไฟล์ที่สำรวจ — เป็นข้อความ UI เท่านั้น ต้องตรวจสอบเพิ่มว่ามี cron job จริงหรือไม่) `BackupTab.tsx:25-186`

### ADM-01n Audit Log (AuditLogTab)
**หมายเหตุสำคัญ**: แท็บนี้ไม่ได้แสดง login log (แม้ backend จะมี `GET /admin/login-logs` และตั้งชื่อ "Audit Log" ก็ตาม) แต่แสดง 3 แท็บย่อยแทน: (1) ประวัติการปรับปรุงทรัพย์สิน — ดึงจาก `assetAPI.getGlobalHistory()` (AssetHistory table) พร้อมค้นหา/กรองตาม actionType, (2) รายการยืมล่าสุด — จาก `dashboardAPI.recentActivity().recentRequests`, (3) รายการคืนล่าสุด — จาก `recentReturns` ทั้งหมดแสดงผ่าน DataGrid พร้อมลิงก์คลิกไปหน้ารายละเอียด `AuditLogTab.tsx:1-226`. **`GET /admin/login-logs` ไม่ถูกเรียกจากที่ใดในโค้ด frontend ที่สำรวจ (grep ทั้ง `frontend/src` ไม่พบ `loginLogs`/`login-logs`) — เป็น backend endpoint ที่ไม่มี UI ใช้งาน (dead/orphaned API)**

### ADM-02/ADM-03/ADM-06/ADM-07/AST-01..04 — Master Data CRUD (ใช้ shared `MasterDataPage` component)
`frontend/src/pages/assets/MasterDataPage.tsx` เป็น generic CRUD component ที่ CompaniesPage/DepartmentManagement (ผ่าน embed)/DeviceTypesPage/LocationsPage/VendorsPage/AssetStatusesPage และ tab ต่างๆ ใน MasterDataManagementPage เรียกใช้ร่วมกัน โดยรับ prop `fetchItems/createItem/updateItem/deleteItem/importItems` เป็น function เฉพาะของแต่ละ entity

UI มาตรฐานของทุกหน้า: การ์ด header พร้อมไอคอน+สี accent เฉพาะ entity, ปุ่ม "🔄 นำเข้าจากทรัพย์สิน" (แสดงเมื่อมี prop `importItems` — เรียก `.../import-from-assets`), ปุ่ม "＋ เพิ่ม{itemLabel}", stat strip (ทั้งหมด/ใช้งาน/ปิดใช้งาน), ช่องค้นหา (กรอง client-side บน name/code/description), ตารางพร้อมคอลัมน์ตามเงื่อนไข (isStatusPage หรือ showCodeField เพิ่มคอลัมน์รหัส, showCompanyField เพิ่มคอลัมน์ Company), แสดงจำนวน assetCount ต่อแถว, ปุ่ม "✏️ แก้ไข"/"🗑" ต่อแถว, Dialog สร้าง/แก้ไข (มี Select รหัสสถานะเฉพาะหน้าสถานะทรัพย์สิน), Dialog ยืนยันลบ `MasterDataPage.tsx:1-442`

หน้าที่ผูก entity เฉพาะ (ยืนยันจาก `MasterDataManagementPage.tsx:56-141` และหน้า standalone ใต้ `/assets/*`):
- ประเภทอุปกรณ์ (master-data tab 0 ใช้ MasterDataPage; แต่หน้า standalone `/assets/device-types` (DeviceTypesPage.tsx) **เป็นโค้ด bespoke แยกต่างหาก ไม่ใช้ MasterDataPage** แม้ UI/behavior จะแทบเหมือนกันทุกประการ — โค้ดซ้ำซ้อนสองชุดสำหรับ entity เดียวกัน)
- สถานที่ตั้ง (LocationsPage มาตรฐาน ใช้ MasterDataPage, `showCompanyField`, มี importItems — และวางคู่กับฟอร์ม CRUD บริษัทในหน้าเดียวกัน)
- ผู้จำหน่าย (VendorsPage / tab 2): พื้นฐาน, มี importItems, ใช้ MasterDataPage ตรงๆ ทั้งสองที่
- สถานะอุปกรณ์: ใช้ MasterDataPage ทั้งคู่ แต่ `statusOptions` **ไม่ตรงกัน** ระหว่าง tab 3 ของ MasterDataManagementPage (Available/InUse/Borrowed/UnderRepair/Retired/Reserved) กับหน้า standalone AssetStatusesPage (Available/Borrowed/InUse/Maintenance/Retired/Lost) — ดู Business Rules ข้อ 16b. ไม่มี importItems ในทั้งสองที่ (backend ไม่มี endpoint `/asset-statuses/import-from-assets` ให้เรียกด้วย)
- บริษัท: ไม่ใช้ MasterDataPage ที่จุด embed หลัก — CompaniesPage เป็นหน้าเฉพาะของตัวเองที่มี DataGrid + ปุ่ม sync AD/Intra-tools เพิ่มเติม (ดูหัวข้อ ADM-03) ปรากฏอยู่ 2 จุด: embed ใน MasterDataManagementPage tab 4 และหน้า standalone `/admin/companies`; ส่วนคอลัมน์ขวาของ `/assets/locations` ใช้ MasterDataPage ธรรมดา (ไม่ใช่ CompaniesPage) ต่อกับ endpoint บริษัทชุดเดียวกัน จึงเป็น**การ CRUD บริษัทผ่าน UI ต่างกันสองแบบในสองหน้า** ขึ้นอยู่กับว่าผู้ใช้เข้าทางไหน
- แผนก (tab 5): `showCodeField`, ไม่มี importItems ในจุดนี้ (sync ทำผ่านปุ่มแยกในหน้า DepartmentManagementPage)

### AST-05/06/07 Import-Export / QR / Agent Drift — ไม่ใช้ MasterDataPage เลย เป็นหน้าเฉพาะทางแต่ละหน้า
- **ImportExportPage**: 3 การ์ด (นำเข้า/ส่งออก/Template) — ปุ่มนำเข้าเป็น `ImportAssetsButton` component แยก (ไม่ได้เปิดอ่าน), ปุ่มส่งออก Excel ทำ client-side ทั้งหมด (ดึง asset ทุกตัวด้วย `assetAPI.list({limit:10000})` แล้วแบ่ง sheet ตาม `type` เอง ผ่านไลบรารี `xlsx`), ปุ่มส่งออก CSV เรียก backend `assetAPI.exportCSV()` (นอกสโคปนี้ อยู่ใน assets.ts), ปุ่ม Template สร้างไฟล์ตัวอย่างพร้อมข้อมูล mock ต่อประเภทอุปกรณ์ที่มีจริงในระบบ, ตัวเลือกรูปแบบวันที่ (ISO/ไทย พ.ศ.) มีผลเฉพาะ export Excel ไม่มีผลกับ CSV/Template — ตารางแสดงคอลัมน์ที่รองรับทั้งหมด (54 field mapping คงที่ในโค้ด, sync ด้วยมือกับ backend export header ตามคอมเมนต์ในไฟล์) `ImportExportPage.tsx:11-115, 189-333`
- **PrintQRPage**: เลือกทรัพย์สินจาก sidebar (ค้นหา+กรองประเภท+infinite scroll), ปรับ layout (กระดาษ/ขนาดสติ๊กเกอร์/คอลัมน์/สไตล์), toggle ฟิลด์หลัก 5 ฟิลด์ + FieldPicker เลือกฟิลด์เพิ่มจาก 18 ฟิลด์ (จัดกลุ่ม 5 หมวด), พรีวิวสด, พิมพ์ผ่าน `window.print()` (CSS `@media print` ซ่อนทุกอย่างนอก `#print-zone`) — ปุ่ม PNG/PDF ถูกใส่ `disabled` ถาวรไว้ล่วงหน้า (placeholder ยังไม่ implement) `PrintQRPage.tsx:421-1029`
- **AgentDriftPage**: 3 แท็บ (สเปกเครื่อง/จอภาพ/สุขภาพเครื่อง) โหลดข้อมูลแบบ lazy ต่อแท็บ (ไม่โหลดพร้อมกันเพราะแต่ละ endpoint สแกน Agent ทีละเครื่อง ช้า) ปุ่ม "เติมทั้งหมด" (`agentFillBlanks`) มี `window.confirm` ก่อนเสมอ, ตารางความขัดแย้ง (conflict) เป็น read-only ลิงก์ไปหน้ารายละเอียดทรัพย์สินให้ผู้ใช้ตัดสินใจเอง, ข้อความในหน้าระบุมี auto-fill รายวันที่ปิดได้ด้วย env var `AGENT_AUTOFILL_ENABLED=false` `AgentDriftPage.tsx:35-350`

### ADM-03 CompaniesPage (จัดการบริษัท) — ใช้ DataGrid ของตัวเอง ไม่ใช้ MasterDataPage
DataGrid คอลัมน์ ID/รหัส/ชื่อบริษัท(TH)/ชื่อบริษัทหลัก(EN)/ชื่อบริษัทย่อ(Asset)/สถานะ/วันที่สร้าง/จัดการ, ปุ่ม "เพิ่มบริษัทด้วยตนเอง" และ "ดึงรายชื่อจาก Intra-tools" (เรียก `adminAPI.syncADCompanies()` → `POST /admin/sync-companies`, มี `window.confirm` ก่อน), ต่อแถวมีปุ่มแก้ไข/เปิด-ปิดใช้งาน/ลบ, รองรับโหมด `embedded` (ซ่อน header เต็ม แสดงปุ่มย่อแทนเมื่อฝังใน MasterDataManagementPage) `CompaniesPage.tsx:1-245`

### ADM-04 DepartmentManagementPage
ตาราง MUI Table (ไม่ใช่ DataGrid) คอลัมน์ ชื่อแผนก(TH)/ชื่อแผนก(EN)/รหัส/รายละเอียด/การดำเนินการ, ช่องค้นหา, ปุ่ม "ดึงจาก Intra-tools" (`departmentAPI.syncAD()` → `POST /departments/sync-ad`), ปุ่ม "เพิ่มแผนกใหม่", ไอคอนแก้ไข/ลบต่อแถว, Dialog ฟอร์ม ชื่อ/รหัส/รายละเอียด `DepartmentManagementPage.tsx:1-305`

### ADM-05 FlowchartsPage — ไม่มี CRUD, เป็นหน้าเอกสารประกอบ (documentation viewer)
แสดงรูปภาพ flowchart คงที่ 3 ชุด (asset lifecycle / borrow-return / PM) พร้อม zoom/fullscreen/download รูป, accordion อธิบายขั้นตอนแบบ hardcoded steps ในโค้ด (ไม่ดึงจาก backend เลย) `FlowchartsPage.tsx:1-433` — เป็นเอกสารอ้างอิงสำหรับผู้ใช้ ไม่ใช่ระบบจัดการข้อมูล

### ADM-06 PrinterMasterPage
ตารางเครื่องพิมพ์ (ชั้น/พื้นที่, ยี่ห้อ/รุ่น, Serial, IP, สถานะ), ช่องค้นหา, ปุ่ม "+ เพิ่มเครื่องพิมพ์", ปุ่มแก้ไข/ลบต่อแถว, Dialog ฟอร์ม 6 ฟิลด์ + Select สถานะ (ใช้งานปกติ/ซ่อมบำรุง) + Switch เปิดใช้งาน `PrinterMasterPage.tsx:1-234`

### ADM-07 ChecklistSetMasterPage + ChecklistItemsDialog
ตารางชุด checklist (รหัสเอกสาร, ชื่อชุด, ใช้กับหมวด, จำนวนหัวข้อ/หมวด, เวลาเฉลี่ย, revision, สถานะ), ปุ่ม "+ เพิ่มชุด Checklist", ต่อแถวมีปุ่ม "📋 หัวข้อ" (เปิด ChecklistItemsDialog), แก้ไข, ลบ — ChecklistItemsDialog จัดกลุ่มรายการตาม category, ปุ่ม "+ เพิ่มหัวข้อในหมวดนี้" ต่อกลุ่ม และ "+ เพิ่มหมวดใหม่" ที่ท้ายรายการ ฟอร์มมี หมวด/อ้างอิง(refCode)/รายการตรวจสอบ(itemText, multiline) `ChecklistSetMasterPage.tsx:1-238`, `ChecklistItemsDialog.tsx:1-200`

---

## Forms & Fields

| ฟอร์ม/Dialog | ฟิลด์ | ชนิด | บังคับ | Evidence |
|---|---|---|---|---|
| ข้อมูลระบบ (tab 0) | systemName, organizationName, logoUrl, timezone, showWelcomeBanner | text/text/text/select/switch | ไม่บังคับ (มี default) | `SettingsPage.tsx:281-299` |
| กฎการยืม (tab 1) | borrowDays, maxBorrowDays, overdueWarningDays, maxItemsPerRequest, allowExtension, maxExtensionsPerRequest | number/number/number/number/switch/number | ไม่บังคับ | `SettingsPage.tsx:370-380` |
| LINE settings | enableLine, lineChannelAccessToken, lineWebhookUrl, lineWebhookVerifyToken, lineSendMode, lineUserIds | switch/password(masked)/text/text/toggle/textarea | token/verify ใช้ SECRET_MASK sentinel | `SettingsPage.tsx:409-422` |
| SMTP settings | enableEmail, smtpHost, smtpPort, smtpUser, smtpPass, smtpFromEmail, smtpFromName, emailCc | switch/text/text/text/password(masked)/text/text/text | ไม่บังคับ | `SettingsPage.tsx:428-437` |
| Teams settings | enableTeams, teamsWebhookUrl | switch/text | ไม่บังคับ | `SettingsPage.tsx:440-445` |
| ความปลอดภัย (tab 4) | requireStrongPassword, passwordExpiryDays, sessionTimeoutHours | switch/number/number | ไม่บังคับ | `SettingsPage.tsx:537-543` |
| COMPANY_PREFIXES (SystemSettingsTab) | company, monitorPrefix, printerPrefix, padding | text/text/text/number(1-10) | company ต้องไม่ว่าง (validate ก่อนบันทึก) | `SystemSettingsTab.tsx:60-84` |
| PM_DISPLAY_FORMAT | displayFormat | text (รองรับ `{AssetName}`, `{AssetCode}`) | ไม่บังคับ | `SystemSettingsTab.tsx:143-151` |
| เพิ่มผู้ใช้จาก AD | adQuery (ค้นหา), assignedRole | search/select | ต้องเลือกผู้ใช้ AD ก่อนกดยืนยัน | `UsersPermissionsTab.tsx:571-617` |
| สร้างผู้ใช้ Manual | manualUsername, manualPassword, manualDisplayName, manualEmail, manualDepartment, manualRole | text/password/text/text/text/select | username, password(≥8), displayName บังคับ | `UsersPermissionsTab.tsx:618-636`, backend `admin.ts:189-201` |
| เปลี่ยน role ผู้ใช้ | newRole | select (เฉพาะ role ที่ live:true) | ต้องเลือก | `UsersPermissionsTab.tsx:490-514` |
| ตั้งหัวหน้างาน | selectedManagerId | select (รายชื่อ user อื่นทั้งหมด ยกเว้นตัวเอง) | ไม่บังคับ (ว่าง = ไม่มีหัวหน้างาน) | `UsersPermissionsTab.tsx:517-550` |
| ตั้ง/เปลี่ยนรหัสผ่าน | newPassword | password | ≥8 ตัวอักษร | `UsersPermissionsTab.tsx:653-682`, backend `admin.ts:203-215` |
| เทมเพลตอีเมล (แก้ไข) | localSubject, localBody | text/textarea(HTML) | ไม่บังคับ (validate ที่ backend เท่านั้น) | `EmailTemplateEditor.tsx:127-130` |
| บริษัท (CompaniesPage) | code, name(TH), nameEng(EN), assetCompanyCodes | text ทั้งหมด | name บังคับ | `CompaniesPage.tsx:191-229` |
| แผนก (DepartmentManagementPage) | name, code, description | text/text/textarea | name บังคับ (validate ทั้ง frontend/backend) | `DepartmentManagementPage.tsx:267-289`, backend `departments.ts:43-45` |
| Master Data ทั่วไป (MasterDataPage) | code(บางหน้า), name, company(บางหน้า), description, isActive | text/text/text/textarea/switch | name บังคับ, code บังคับเฉพาะหน้าสถานะ (isStatusPage) | `MasterDataPage.tsx:112-138` |
| เครื่องพิมพ์ | floorArea, brandModel, serialNo, ipAddress, driver, pinNote, status, isActive | text×6/select/switch | floorArea, brandModel บังคับ | `PrinterMasterPage.tsx:22, 67-92`, backend `assetMasterData.ts:369-372` |
| ชุด Checklist | docCode, name, appliesToCategories, itemCount, categoryCount, avgTimeLabel, revision, isActive | text/text/text/number/number/text/number/switch | docCode, name บังคับ | `ChecklistSetMasterPage.tsx:23, 64-90`, backend `assetMasterData.ts:508-511` |
| รายการ Checklist (item) | category, refCode, itemText, answerType | text/text/textarea/(implicit default PASS_FAIL_NA) | category, itemText บังคับ | `ChecklistItemsDialog.tsx:19, 67-87`, backend `assetMasterData.ts:456-458` |
| Restore JSON backup | file (multipart) | file input (.json) | ต้องมี `version` และ `data` ในไฟล์ | `SettingsPage.tsx:614-622`, backend `admin.ts:700-811` |
| Backup/Restore .sql (BackupTab) | ไม่มีฟอร์ม — ปุ่มกดตรงต่อไฟล์ที่เลือกจากตาราง | - | - | `BackupTab.tsx:112-182` |

---

## CRUD Matrix (Master Data Entities)

| Entity | Create | Read | Update | Delete | Import จาก Assets | Extra Actions | Evidence |
|---|---|---|---|---|---|---|---|
| Company (บริษัท) | ✅ (`POST /companies`) | ✅ | ✅ (`PUT /companies/:id`) | ✅ (`DELETE /companies/:id`, บล็อกถ้ามี FK) | ✅ (`POST /companies/import-from-assets`) | Sync จาก Intra-tools (`POST /admin/sync-companies`) — ปุ่มอยู่ทั้งใน CompaniesPage และ nav "ข้อมูลหลัก" | `assetMasterData.ts:188-246`, `admin.ts:41-46` |
| Department (แผนก) | ✅ (`POST /departments`, SUPERADMIN เท่านั้น) | ✅ (ทุก role authenticate) | ✅ (SUPERADMIN) | ✅ (บล็อกถ้ามี asset ผูก, SUPERADMIN) | ❌ (ไม่มี endpoint import-from-assets สำหรับแผนก) | Sync จาก Intra-tools (`POST /departments/sync-ad`) | `departments.ts:1-133` |
| Vendor (ผู้จำหน่าย) | ✅ | ✅ | ✅ | ✅ | ✅ | - | `assetMasterData.ts:248-304` |
| AssetLocation (สถานที่ตั้ง) | ✅ | ✅ | ✅ | ✅ | ✅ (รวม company จาก asset groupBy) | showCompanyField ในฟอร์ม | `assetMasterData.ts:107-186` |
| AssetStatusMaster (สถานะทรัพย์สิน) | ✅ (code ต้องอยู่ใน ASSET_STATUS_OPTIONS) | ✅ | ✅ | ✅ | ❌ (endpoint มีจริงหรือไม่ — ตรวจแล้วไม่มี `/asset-statuses/import-from-assets` ใน assetMasterData.ts) | code ผูก enum ตายตัว ไม่ใช่ free text | `assetMasterData.ts:306-357` |
| DeviceType (ประเภทอุปกรณ์) | ✅ | ✅ | ✅ | ✅ | ✅ | - | `assetMasterData.ts:21-105` |
| Printer (เครื่องพิมพ์) | ✅ | ✅ | ✅ | ✅ | ❌ (ไม่มี concept "นำเข้าจากทรัพย์สิน" — เครื่องพิมพ์ไม่ใช่ dropdown ของฟอร์ม asset) | status แยกจาก isActive (active/maintenance) | `assetMasterData.ts:360-422` |
| ChecklistSet (ชุด Checklist) | ✅ | ✅ (พร้อม live item/category count) | ✅ | ✅ | ❌ | จัดการ ChecklistItem ย่อยผ่าน sub-resource `/checklist-sets/:setId/items` | `assetMasterData.ts:424-565` |
| ChecklistItem (รายการใน checklist) | ✅ | ✅ | ✅ | ✅ | ❌ | sortOrder ต่อท้ายอัตโนมัติเมื่อสร้างใหม่ | `assetMasterData.ts:442-504` |
| AppUser (ผู้ใช้) | ✅ (จาก AD หรือ local) | ✅ (list+detail, แบ่งหน้า) | ✅ (role/manager/toggle-active/password แยก endpoint ย่อย ไม่มี PUT รวม) | ✅ (ห้ามลบตัวเอง, บล็อกถ้ามี FK) | - (import คือ "จาก AD" ไม่ใช่จาก assets) | เปลี่ยน role, ตั้งหัวหน้างาน (กันวนลูป), toggle-active, ตั้งรหัสผ่าน local แยกเป็นคนละ endpoint | `admin.ts:47-227` |

**ข้อสังเกต CRUD ที่ไม่สมมาตร**: ทุก entity ใน `assetMasterData.ts` ใช้ role guard เดียวกันหมด (`IT_ADMIN, SUPERADMIN`) ทุก verb ไม่มีการแยกสิทธิ์ลบออกจากสิทธิ์แก้ไข — ต่างจาก `admin.ts` (ผู้ใช้/settings/backup) ที่ส่วนใหญ่ล็อก `SUPERADMIN` เท่านั้น และต่างจาก `backup.ts` ที่แยก GET/POST (IT_ADMIN+) ออกจาก DELETE/restore (SUPERADMIN เท่านั้น)

---

## Database Tables ที่เกี่ยวข้อง

จาก `backend/prisma/schema.prisma` (อ้างอิงจาก field ที่ใช้จริงในโค้ดที่อ่าน — ไม่ได้ไล่อ่าน schema แบบเต็มไฟล์ในสเตจนี้):

- **AppUser** — id, adUsername, displayName, email, department, company, companyThai, avatarUrl, role (SUPERADMIN/IT_ADMIN/USER/VIEWER — enum ที่ยืนยันจาก validate ใน `admin.ts:107`), isActive, authType (AD/LOCAL), lastLoginAt, managerId (self-relation → หัวหน้างาน), createdAt
- **NotificationSetting** — ตารางเดียว (findFirst/create ถ้ายังไม่มี) เก็บ systemName, organizationName, logoUrl, timezone, darkMode, showWelcomeBanner, borrowDays, maxBorrowDays, maxItemsPerRequest, allowExtension, maxExtensionsPerRequest, overdueWarningDays, enableEmail, enableTeams, teamsWebhookUrl, enabledEventKeys, smtpHost/Port/User/Pass/FromEmail/FromName, emailCc, requireStrongPassword, passwordExpiryDays, sessionTimeoutHours, enableLine, lineChannelAccessToken, lineWebhookUrl, lineWebhookVerifyToken, lineSendMode, lineUserIds, lineEnabledStatuses `admin.ts:272-338`
- **SystemSetting** — key-value store แยกต่างหาก (key, value, group, description, updatedBy) ใช้เก็บ COMPANY_PREFIXES/PM_DISPLAY_FORMAT — **คนละตารางกับ NotificationSetting** แม้ทั้งคู่จะถูกเรียกว่า "settings" `settings.ts:1-70`
- **NotificationTemplate** — id, key, channel (EMAIL), subjectTh, bodyTh, subjectEn, bodyEn `admin.ts:447-487`
- **NotificationOutbox** — ประวัติการส่งแจ้งเตือน (channel, eventType, status, recipient, lastError, createdAt) `admin.ts:625-640`
- **LoginLog** — success, username, createdAt, userId (relation → AppUser) — มี backend endpoint แต่ไม่มี UI ใช้งาน (ดูหมายเหตุ ADM-01n) `admin.ts:647-669`
- **Company** — id, code, name, nameEng, description, assetCompanyCodes, isActive, createdAt `assetMasterData.ts:188-246`, `CompaniesPage.tsx`
- **Department** — id, name, nameEng, code, description `departments.ts`
- **Vendor** — id, name, description, isActive `assetMasterData.ts:248-304`
- **AssetLocation** — id, name, company, description, isActive `assetMasterData.ts:107-186`
- **AssetStatusMaster** — id, code, name, description, isActive `assetMasterData.ts:306-357`
- **DeviceType** — id, name, description, isActive `assetMasterData.ts:21-105`
- **Printer** — id, floorArea, brandModel, serialNo, ipAddress, driver, pinNote, status, isActive `assetMasterData.ts:360-422`
- **ChecklistSet** — id, docCode, name, appliesToCategories, itemCount, categoryCount, avgTimeLabel, revision, isActive `assetMasterData.ts:424-565`
- **ChecklistItem** — id, setId (FK→ChecklistSet), category, refCode, itemText, answerType, sortOrder `assetMasterData.ts:442-504`
- **AppNotification** — id, userId, isRead, createdAt (bell notifications ผู้ใช้ทั่วไป — คนละตารางกับ NotificationOutbox/Template) `notifications.ts`
- **AssetHistory** — ใช้แสดงใน Audit Log tab (asset change trail) `AuditLogTab.tsx:59`

---

## Workflow

### AD/Intra-tools Sync Flow
1. ผู้ใช้กดปุ่ม "ดึงรายชื่อจาก Intra-tools" ที่หน้า CompaniesPage หรือ DepartmentManagementPage (ปุ่มแยกกันคนละหน้าแต่เรียก service เดียวกัน)
2. Frontend เรียก `POST /api/admin/sync-companies` หรือ `POST /api/departments/sync-ad` — ทั้งสอง endpoint เรียกฟังก์ชันเดียวกันคือ `syncMasterDataFromIntraTools()` จาก `services/intraSync.ts` (ยังไม่ได้อ่านไฟล์นี้ในสเตจนี้ — ดู Unknown/Not Verified)
3. ผลลัพธ์คืนจำนวนบริษัท/แผนกที่เพิ่มใหม่ ทั้งสองหน้าจะรีเฟรชตารางของตัวเองทันที
4. แยกจากนี้: การเพิ่ม **ผู้ใช้** จาก AD เป็นคนละ flow — ใช้ `GET /users/search-ad` (ค้นหาสด, LDAP) แล้ว `POST /users/from-ad` (สร้าง AppUser ทีละคน) — **ไม่มีการซิงก์ผู้ใช้เป็นชุด/ตามตารางเวลา** ระบบดึงข้อมูล AD ของผู้ใช้จริงเฉพาะตอน login เท่านั้น (ตามที่ UI ระบุใน `UsersPermissionsTab.tsx:296-298`)
5. `admin.ts:32-37` ยังมี endpoint แยก `GET /ad-companies` (ผ่าน `getAllADCompanies()` LDAP โดยตรง) ซึ่งดูเหมือนเป็นคนละกลไกกับ Intra-tools sync — ไม่พบว่าถูกเรียกจาก frontend ที่สำรวจ (ตรวจสอบเพิ่ม)

### Backup & Restore Flow (สองระบบคู่ขนาน — อย่าสับสน)
**ระบบที่ 1 — Full DB backup (pg_dump/psql, ผ่าน BackupTab):**
1. `POST /api/backup` → `BackupController.createBackup` รัน `pg_dump --dbname <DATABASE_URL> --clean --if-exists --file <path>.sql` เก็บไฟล์ในโฟลเดอร์ `backend/backups/`
2. `GET /api/backup` list ไฟล์ในโฟลเดอร์ (อ่านจาก filesystem ตรงๆ ไม่มีตารางบันทึก metadata)
3. ดาวน์โหลดผ่าน `GET /api/backup/:filename/download` (รองรับ query token ผ่าน `allowQueryToken` middleware สำหรับกรณีเปิดลิงก์ตรงในเบราว์เซอร์)
4. กู้คืนผ่าน `POST /api/backup/:filename/restore` รัน `psql --dbname <DATABASE_URL> --file <path>.sql` — **overwrite ฐานข้อมูลทั้งหมดทันที ไม่มี dry-run**
5. UI ระบุว่ามี auto-backup ทุกวัน 02:00 น. เก็บย้อนหลัง 180 วัน — **ไม่พบโค้ด cron/scheduler ที่ตั้งเวลานี้ในไฟล์ routes ที่สำรวจ** ต้องตรวจสอบเพิ่มใน scheduler/service files อื่น (เช่น agentMonitors.ts หรือไฟล์ cron แยก)

**ระบบที่ 2 — Selective JSON backup (assets + master data เท่านั้น, ผ่าน SettingsPage tab "จัดการข้อมูล"):**
1. `GET /api/admin/backup` ส่งออก assets (พร้อมทุก detail table) + categories + companies + vendors + locations + statuses + deviceTypes เป็นไฟล์ JSON ให้ดาวน์โหลดทันที (ไม่เก็บไว้ที่ server)
2. `POST /api/admin/restore` รับไฟล์ JSON กลับมา upsert master data ทั้งหมดก่อน แล้วจึง insert asset ทีละตัว (ข้ามถ้า `assetCode` ซ้ำ) พร้อม detail record ที่แนบมาด้วย — เป็น additive merge ไม่ใช่ overwrite เหมือนระบบที่ 1
3. ไม่ครอบคลุมผู้ใช้/borrow/PM/donation/maintenance — เฉพาะ asset registry + master data ตามชื่อฟิลด์ที่ export

### Notification Template → Outbox → Send Flow (เท่าที่เห็นจากโมดูลนี้)
1. Admin แก้ไข subject/body ผ่าน EmailTemplateEditor → `PUT /admin/notification-templates/:id`
2. เทมเพลตมี placeholder แบบ `{{key}}` ที่ระบบอื่น (เช่น borrow module ที่ไม่ได้อยู่ในสโคปนี้) จะแทนที่ค่าจริงตอนส่งจริง แล้วบันทึกผลลง `NotificationOutbox` — จุดที่เขียนแทรกลง NotificationOutbox อยู่นอกไฟล์ที่สำรวจในสโคปนี้ (คาดว่าอยู่ใน `services/notification.ts`)
3. โมดูลนี้เห็นเฉพาะปลายทางอ่าน (`GET /admin/notification-logs`) และ endpoint ทดสอบส่งแบบ mock data (`POST /notification-templates/:id/test` — ปัจจุบันไม่มีปุ่มเรียกใน UI)
4. `invalidateSettingsCache()` ถูกเรียกทุกครั้งหลัง `PUT /admin/settings` เพื่อให้ค่าที่แก้ (เช่น SMTP, enabledEventKeys) มีผลทันทีกับ service ที่ cache การตั้งค่าไว้ `admin.ts:335`, import จาก `services/notification.ts:7`

---

## Business Rules (พร้อม file:line)

1. **VIEWER role ต้องรวมอยู่ใน validate ของ `/users/:id/role`** — เคยขาดจน "เลือกได้ในหน้า UI แต่ backend reject" มาก่อน แก้แล้วโดยรวม 4 ค่า SUPERADMIN/IT_ADMIN/USER/VIEWER `admin.ts:101-107`
2. **ห้ามตั้งหัวหน้างานแบบวนลูป (circular manager chain)** — เดินสาย managerId ของผู้ที่จะถูกตั้งเป็นหัวหน้า จนกว่าจะถึง null หรือเจอ id เดิม (บ่งชี้วงวน) แล้ว reject `admin.ts:140-146`
3. **ห้ามตั้งตัวเองเป็นหัวหน้างานของตัวเอง** `admin.ts:136`
4. **ห้ามลบผู้ใช้ที่กำลังล็อกอินอยู่ (self-delete)** `admin.ts:173-175`
5. **ลบผู้ใช้ที่มีประวัติ (FK constraint) ไม่ได้ — ต้อง toggle ปิดใช้งานแทน** (จับ Prisma error code P2003) `admin.ts:179-184`
6. **Secret fields (smtpPass, lineChannelAccessToken, lineWebhookVerifyToken) ไม่เคยถูกส่งค่าจริงกลับไปที่ frontend** — GET คืนค่า mask `••••••••`, PUT เข้าใจว่าค่า mask กลับมา = "ไม่เปลี่ยน" (`applySecretField`) ป้องกันไม่ให้ credential หลุดไปอยู่ใน network log ของเบราว์เซอร์ `admin.ts:244-270, 315-322`
7. **`GET /admin/external-api-info` คืนค่า apiKey แบบ plaintext โดยตั้งใจ** (SUPERADMIN เท่านั้น) เพราะหน้าจอนี้มีไว้ให้ admin อ่านค่าไปตั้งค่าที่อื่น — ต่างจากกฎข้อ 6 โดยเจตนา `admin.ts:230-242`
8. **รหัสผ่าน local user ต้อง ≥ 8 ตัวอักษร** ทั้งตอนสร้างและตอนตั้งรหัสใหม่ (validate ซ้ำทั้ง frontend และ backend) `admin.ts:195-197, 207-209`; `UsersPermissionsTab.tsx:212-215, 239-242`
9. **ลบแผนกไม่ได้ถ้ามี asset ผูกอยู่** (`assetCount > 0`) `departments.ts:109-115`
10. **ชื่อแผนกห้ามซ้ำ (case-insensitive)** ทั้งตอนสร้างและแก้ไข `departments.ts:47-58, 81-89`
11. **สถานะทรัพย์สิน (AssetStatusMaster.code) ต้องอยู่ใน `ASSET_STATUS_OPTIONS`** เป็น whitelist ตายตัว ไม่ใช่ free text `assetMasterData.ts:322, 338`
12. **backup.ts: DELETE และ restore ต้อง SUPERADMIN เท่านั้น** (เดิมเคยอนุญาต IT_ADMIN ด้วย ถูกแก้ให้ตรงกับ `admin.ts` /restore เพื่อความสอดคล้อง) `backup.ts:15-22`
13. **`POST /admin/restore` (JSON backup) ข้าม asset ที่ `assetCode` ซ้ำแทนที่จะ error ทั้งไฟล์** — เป็น additive/idempotent merge `admin.ts:759-761`
14. **`clear-all-assets` และ `advanced-clear-data` ลบข้อมูลแบบมีลำดับ (respect FK)** เช่น ลบ PMRunAnswer/PMRun ก่อน แล้วค่อยลบ Asset เพื่อไม่ชน foreign key `admin.ts:816-841, 847-905`
15. **ตั้งค่าระบบ (SettingsPage) โหลดข้อมูลกลาง (`settings`/`templates`) เฉพาะเมื่อ role เป็น SUPERADMIN เป๊ะๆ** — IT_ADMIN ที่เข้าหน้านี้ได้จะไม่มีข้อมูลกลางให้แท็บ inline ใช้ แม้ตัวแท็บจะไม่ได้ถูกซ่อนด้วย `roles` ก็ตาม (ดูหมายเหตุใต้ Page/Tab Inventory) `SettingsPage.tsx:141`
16b. **รายการ `statusOptions` ของหน้า "สถานะทรัพย์สิน" ไม่ตรงกันระหว่างสองจุดในโค้ด**: `MasterDataManagementPage.tsx:113-120` (เมนู "ข้อมูลหลัก" tab 3) ประกาศ `Available/InUse/Borrowed/UnderRepair/Retired/Reserved` ในขณะที่ `AssetStatusesPage.tsx:5-12` (หน้า standalone `/assets/statuses`) ประกาศ `Available/Borrowed/InUse/Maintenance/Retired/Lost` — code เดียวกัน (`UnderRepair` vs `Maintenance`, `Reserved` vs `Lost`) ไม่ตรงกัน ทั้งที่ทั้งสองเรียก backend endpoint เดียวกัน (`GET/POST /asset-statuses`) ซึ่งไม่ validate ชื่อ (`ASSET_STATUS_OPTIONS` เป็น whitelist ของ **code** เท่านั้น ไม่ validate name) — ผลคือผู้ใช้จะเห็นตัวเลือกไม่เหมือนกันขึ้นกับว่าเข้าหน้าไหน `MasterDataManagementPage.tsx:113-120`, `AssetStatusesPage.tsx:5-12`
16. **PermissionMatrixTab เป็นข้อมูล hardcode ที่ผู้เขียนโค้ด "hand-compile" จากเงื่อนไข role ใน nav.tsx/authorize() เอง** — ไม่ sync อัตโนมัติกับโค้ดจริง หากมีการแก้ role guard ที่อื่นแล้วลืมแก้ตารางนี้ ข้อมูลจะไม่ตรงความจริง `PermissionMatrixTab.tsx:16-19`

---

## Unknown / Not Verified

- **`services/intraSync.ts`** (ฟังก์ชัน `syncMasterDataFromIntraTools`) ยังไม่ได้เปิดอ่าน — เป็นหัวใจของ AD/Intra-tools sync flow ทั้งบริษัทและแผนก ควรตรวจสอบเพิ่มเพื่อยืนยันกลไกจับคู่ข้อมูล/การจัดการ error
- **cron/scheduler สำหรับ auto-backup ทุกวัน 02:00 น.** ที่ BackupTab UI อ้างถึง — ไม่พบในไฟล์ routes ที่สำรวจ (`backup.ts`, `backup.controller.ts` มีแต่ manual create/list/delete/restore ไม่มี schedule logic) ต้องตรวจสอบไฟล์อื่น เช่น `services/` หรือ `app.ts`/`server.ts` startup hooks
- **`services/notification.ts`** — จุดที่เขียนข้อมูลลง `NotificationOutbox` จริง (ใครเรียกตอนไหน, ใช้ template placeholder อย่างไร) ไม่ได้อ่านในสโคปนี้ มีเพียง `invalidateSettingsCache` ที่ import มาใช้
- **`GET /admin/ad-companies`** (ผ่าน `getAllADCompanies()` LDAP ตรง) ไม่พบจุดเรียกใช้จาก frontend ที่สำรวจ — อาจเป็น endpoint ค้างจากดีไซน์เก่าก่อนเปลี่ยนไปใช้ Intra-tools sync หรือใช้จากที่อื่นที่ยังไม่ได้ตรวจ
- **`POST /admin/test-email`** และ **`POST /admin/notification-templates/:id/test`** — มี backend รองรับสมบูรณ์แต่ไม่พบปุ่มเรียกใช้งานใน UI ที่สำรวจทั้งหมด (IntegrationsTab, EmailTemplateEditor) เป็นไปได้ว่าถูกถอดปุ่มออกภายหลังหรือมีแผนจะใช้ในอนาคต
- **`GET /admin/login-logs`** — backend สมบูรณ์ (มี filter failedOnly/username, นับ failed 24h) แต่ไม่มี UI เรียกใช้เลย แม้แท็บชื่อ "Audit Log" จะดูเหมือนเป็นที่ที่ควรอยู่ก็ตาม (ดูรายละเอียดใน ADM-01n)
- **`POST /admin/clear-all-assets`** และ **`POST /admin/advanced-clear-data`** — ไม่พบปุ่มเรียกใช้ใน SettingsPage tab "จัดการข้อมูล" (ปัจจุบันมีแต่ bulk-delete แบบเลือกทรัพย์สินทีละรายการผ่าน `assetAPI.bulkDelete`) ต้องตรวจสอบว่ามี UI อื่นเรียกอยู่หรือเป็นโค้ดที่เหลือค้างจากดีไซน์เดิม
- **`AssetStatusMaster` import-from-assets** — assetMasterData.ts ไม่มี endpoint นี้ (มีให้ device-types/locations/companies/vendors แต่ไม่มีให้ asset-statuses) MasterDataPage component รองรับ prop `importItems` เป็น optional จึงไม่ error แต่หน้าสถานะทรัพย์สินไม่มีปุ่มนี้แสดง — ยืนยันว่าตรงกับ backend (ไม่ใช่บั๊ก)
- **`services/agentMonitors.ts`** (แก้ไขล่าสุดตาม git status) ให้ backend แก่ AgentDriftPage (`/assets/agent-drift`, `agent-monitors`, `agent-health`, `agent-fill-blanks` — ชื่อ endpoint จริงต้องตรวจใน `assets.ts` หรือไฟล์ routes อื่นที่ไม่ได้อยู่ในสโคปที่มอบหมายให้ section นี้) — ควรมีอีก section หนึ่งของ blueprint ที่ครอบคลุมไฟล์นี้โดยตรง (เช่น module ทะเบียนทรัพย์สิน/Agent monitoring)
- **`components/ImportAssetsButton.tsx`** และ **`components/SectionCard.tsx`** — ใช้ร่วมกันหลายหน้าในโมดูลนี้แต่ไม่ได้เปิดอ่านเนื้อหาโดยตรง (เห็นแค่ผ่านการ import)
- **`components/assets/MonitorReconcile.tsx`** (`MonitorCard`, `MonitorLinkList`, `MonitorRow`, `bucketColors`) — ใช้ใน AgentDriftPage tab "จอภาพ" แต่ไม่ได้เปิดอ่านเนื้อหาโดยตรงในสโคปนี้
- **Prisma schema เต็ม** (`backend/prisma/schema.prisma`) ไม่ได้เปิดอ่านตรงในสเตจนี้ — รายชื่อ field ของแต่ละตารางใน "Database Tables" ด้านบนมาจากการอนุมานผ่านโค้ด route/frontend เท่านั้น อาจมี field เพิ่มเติมที่ไม่ถูกใช้ในโมดูลนี้

