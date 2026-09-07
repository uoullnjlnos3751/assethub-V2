# SITEMAP & ROUTING

> Confidence: **LEVEL 1 — VERIFIED** — อ่านจาก `frontend/src/navigation/nav.tsx` (182 บรรทัด, อ่านครบทั้งไฟล์) และ `frontend/src/App.tsx` (175 บรรทัด, อ่านครบทั้งไฟล์) โดยตรง ไม่มีเมนูหรือ route ใดถูกข้าม

## หลักการแสดงเมนู (Layout.tsx)

ระบบมีเมนู 2 ชุดที่แยกกันโดยสิ้นเชิง ไม่ได้ merge กัน — ผู้ใช้แต่ละ role เห็นแค่ชุดเดียว:

```
isAdmin (role IT_ADMIN หรือ SUPERADMIN)  -> เห็น adminNav ทั้งหมด (กรองด้วย roles[] ต่อ item ถ้ามีระบุ)
isViewer (role VIEWER)                    -> เห็น adminNav เฉพาะ path ที่อยู่ใน viewerVisiblePaths
                                              ('/dashboard', '/contracts', '/licenses')
                                              หรือ label ที่อยู่ใน viewerVisibleLabels
                                              ('License & สัญญา', 'รายงานระบบ')
role อื่น (USER)                          -> เห็น userNavItems เท่านั้น (ชุดเล็ก ไม่มี section หัวข้อ)
```
Evidence: `frontend/src/layouts/Layout.tsx:162-173`

**ผลที่ตามมา:** เมนู "อนุมัติคำขอยืม (หัวหน้างาน)" ถูกใส่ไว้ **ทั้งสองที่** (`userNavItems` และใน `adminNav > ระบบยืม-คืน`) เพราะฟีเจอร์นี้ไม่ผูกกับ role — พนักงานทั่วไปหรือ IT_ADMIN/SUPERADMIN ก็เป็นหัวหน้างานของคนอื่นได้เหมือนกัน ถ้าใส่ที่เดียวอีกกลุ่ม role จะไม่เห็นเมนูเลย

## เมนูผู้ใช้ทั่วไป (`userNavItems` — role USER เห็นเฉพาะชุดนี้)

```
รายการของพร้อมยืม        /assets?status=Available
ยืมทรัพย์สิน              /borrow/new
คำขอของฉัน                /borrow/my-requests
อนุมัติคำขอยืม (หัวหน้างาน) /borrow/supervisor-queue      [ไม่จำกัด role — ทุกคนเห็น]
รายการที่ยืม              /borrow/my-items
คำขอขยายวัน               /borrow/my-extensions
ประวัติการยืม              /borrow/my-history
```
Evidence: `frontend/src/navigation/nav.tsx:62-72`

## เมนู Admin/IT (`adminNav` — role IT_ADMIN, SUPERADMIN เห็นเต็ม; VIEWER เห็นบางส่วน)

```
AssetHub (ITAM)
│
├── [Section: ภาพรวมระบบ]
│   └── แดชบอร์ด                                    /dashboard
│
├── [Section: จัดการทรัพย์สิน]
│   ├── ทะเบียนทรัพย์สิน IT (group)
│   │   ├── ทะเบียนทั้งหมด                          /assets
│   │   ├── นำเข้า/ส่งออก ข้อมูล      [SUPERADMIN,IT_ADMIN]  /assets/import-export
│   │   ├── พิมพ์ QR สติ๊กเกอร์        [SUPERADMIN,IT_ADMIN]  /assets/print-qr
│   │   └── ตรวจสอบข้อมูลจาก Agent    [SUPERADMIN,IT_ADMIN]  /assets/agent-drift
│   ├── เครื่องใหม่ & ส่งมอบ           [SUPERADMIN,IT_ADMIN]  /delivery
│   └── คลังวัสดุ (group)
│       ├── ภาพรวมคลังสินค้า                        /inventory
│       ├── สายสัญญาณ                               /inventory?category=Cable
│       └── วัสดุสิ้นเปลือง                          /inventory?category=Consumable
│
├── [Section: Service Desk]
│   └── ระบบยืม-คืน (group)
│       ├── คำขอทั้งหมด                              /borrow/all-requests
│       ├── รออนุมัติ (IT Admin)                     /borrow/approval-queue
│       ├── รออนุมัติ (หัวหน้างาน)                    /borrow/supervisor-queue
│       ├── ส่งมอบ (Check-out)                       /borrow/checkout
│       ├── รับคืน (Return)                          /borrow/return
│       ├── ขยายวัน (Extension)                      /borrow/extensions
│       ├── ยืมเกินกำหนด                             /borrow/overdue
│       └── ประวัติทั้งหมด                           /borrow/history
│
├── [Section: งานซ่อมบำรุง]
│   └── PM ทรัพย์สิน (group)
│       ├── ภาพรวม PM                                /pm
│       ├── กำหนดการ PM                              /pm/schedule
│       ├── แผน PM                                   /pm/plans
│       ├── ทำ PM ทรัพย์สิน                          /pm/runs
│       ├── แผนผังชั้น PM                            /pm/floorplan
│       ├── สแกนหาเครื่อง                            /scan
│       ├── Checklist Template                       /pm/templates
│       └── ตู้ Switch/Hub                            /pm/sw-hub
│
├── [Section: จำหน่ายทรัพย์สินออก]
│   ├── จำหน่ายออก/บริจาค                            /donations
│   └── บันทึกการจำหน่ายทรัพย์สิน                    /disposals
│
├── [Section: License & สัญญา]
│   ├── Software License                             /licenses
│   └── สัญญา & Warranty                              /contracts
│
├── [Section: สรุปและรายงาน]
│   ├── รายงานทรัพย์สิน                              /reports/assets
│   ├── รายงานยืม-คืน                                /reports/borrow
│   ├── รายงาน PM                                    /reports/pm
│   ├── รายงานซ่อมบำรุง                              /reports/maintenance
│   └── ตรวจสอบทรัพย์สินพนักงาน [SUPERADMIN,IT_ADMIN] /reports/user-clearance
│
└── [Section: ผู้ดูแลระบบ]  (ทั้ง section: roles=[SUPERADMIN, IT_ADMIN])
    ├── ข้อมูลหลัก (Master Data) (group)
    │   ├── จัดการหมวดหมู่                           /categories
    │   └── ประเภท/สถานที่/ผู้จำหน่าย/สถานะ/บริษัท/แผนก  /admin/master-data
    ├── ตั้งค่าระบบ                                   /admin/settings
    └── Flowchart ขั้นตอนระบบ                        /admin/flowcharts
```
Evidence: `frontend/src/navigation/nav.tsx:74-182`

**หมายเหตุ:** เมนู "ตู้ Switch/Hub" เดิมมี 4 รายการย่อย (ภาพรวม/แผน/ตรวจ/Template) แต่ถูกยุบเหลือทางเข้าเดียวเพราะมีการตรวจจริงแค่ 6 ครั้งทั้งกอง (ครั้งล่าสุด มิ.ย. 2569) — คอมเมนต์ในโค้ดอธิบายเหตุผลไว้ตรงๆ (`nav.tsx:134-136`)

## Route Table เต็ม (React Router — `frontend/src/App.tsx`)

Legend: 🔓 = ไม่ต้อง login, 🔒 = ต้อง login (ไม่จำกัด role), 🔒[roles] = ต้อง login และต้องมี role ในลิสต์

| Route | Component | Access | หมายเหตุ |
|---|---|---|---|
| `/login` | LoginPage | 🔓 | redirect ไป dashboard ถ้า login แล้ว |
| `/delivery-confirm/:token` | DeliveryConfirmPage | 🔓 | **Public** — ยืนยันรับเครื่องผ่านลิงก์ที่ส่งอีเมล ไม่ต้อง login |
| `/dashboard` | DashboardPage | 🔒 | ไม่จำกัด role เฉพาะ (ทุกคน login แล้วเข้าได้ แต่ role USER ไม่มีเมนูลิงก์ไปหน้านี้) |
| `/assets` | AssetListPage | 🔒[SUPERADMIN,IT_ADMIN,USER,VIEWER] | |
| `/assets/new` | AssetFormPage | 🔒[IT_ADMIN,SUPERADMIN] | |
| `/assets/:id` | AssetDetailPage | 🔒[SUPERADMIN,IT_ADMIN,USER,VIEWER] | |
| `/assets/:id/edit` | AssetFormPage | 🔒[IT_ADMIN,SUPERADMIN] | ใช้ component เดียวกับ `/assets/new` |
| `/assets/:id/history` | AssetHistoryPage | 🔒 | ไม่จำกัด role ในนิยาม route (ไม่มี `roles` prop) |
| `/assets/device-types` | DeviceTypesPage | 🔒[IT_ADMIN,SUPERADMIN] | |
| `/assets/locations` | LocationsPage | 🔒[IT_ADMIN,SUPERADMIN] | |
| `/assets/vendors` | VendorsPage | 🔒[IT_ADMIN,SUPERADMIN] | |
| `/assets/statuses` | AssetStatusesPage | 🔒[IT_ADMIN,SUPERADMIN] | |
| `/assets/import-export` | ImportExportPage | 🔒[IT_ADMIN,SUPERADMIN] | |
| `/assets/print-qr` | PrintQRPage | 🔒[IT_ADMIN,SUPERADMIN] | |
| `/assets/agent-drift` | AgentDriftPage | 🔒[IT_ADMIN,SUPERADMIN] | |
| `/delivery` | DeliveryPage | 🔒[IT_ADMIN,SUPERADMIN] | |
| `/inventory` | InventoryPage | 🔒[IT_ADMIN,SUPERADMIN] | |
| `/categories` | CategoryPage | 🔒[IT_ADMIN,SUPERADMIN] | |
| `/borrow/new` | BorrowRequestPage | 🔒 | ไม่จำกัด role |
| `/borrow/my-requests` | MyRequestsPage | 🔒 | ไม่จำกัด role |
| `/borrow/my-items` | MyItemsPage | 🔒 | ไม่จำกัด role |
| `/borrow/my-history` | MyHistoryPage | 🔒 | ไม่จำกัด role |
| `/borrow/my-extensions` | MyExtensionsPage | 🔒 | ไม่จำกัด role |
| `/borrow/supervisor-queue` | SupervisorApprovalQueuePage | 🔒 | ไม่จำกัด role โดยตั้งใจ — คุมสิทธิ์จริงด้วย `managerId` ที่ backend |
| `/borrow/all-requests` | AllRequestsPage | 🔒[IT_ADMIN,SUPERADMIN] | |
| `/borrow/approval-queue` | ApprovalQueuePage | 🔒[IT_ADMIN,SUPERADMIN] | |
| `/borrow/overdue` | BorrowOverduePage | 🔒[IT_ADMIN,SUPERADMIN] | |
| `/borrow/checkout` | CheckoutPage | 🔒[IT_ADMIN,SUPERADMIN] | |
| `/borrow/return` | ReturnPage | 🔒[IT_ADMIN,SUPERADMIN] | |
| `/borrow/history` | BorrowHistoryPage | 🔒[IT_ADMIN,SUPERADMIN] | |
| `/borrow/extensions` | ExtensionQueuePage | 🔒[IT_ADMIN,SUPERADMIN] | |
| `/pm` | PMDashboardPage | 🔒[IT_ADMIN,SUPERADMIN] | |
| `/pm/sw-hub` | PMSwHubDashboardPage | 🔒[IT_ADMIN,SUPERADMIN] | |
| `/pm/sw-hub/new` | PMSwHubFormPage | 🔒[IT_ADMIN,SUPERADMIN] | |
| `/pm/sw-hub/plans` | PMSwHubPlanListPage | 🔒[IT_ADMIN,SUPERADMIN] | |
| `/pm/sw-hub/template` | PMSwHubTemplateListPage | 🔒[IT_ADMIN,SUPERADMIN] | |
| `/pm/sw-hub/template/:id` | PMSwHubTemplatePage | 🔒[IT_ADMIN,SUPERADMIN] | |
| `/pm/sw-hub/template/:id/edit` | PMSwHubTemplatePage | 🔒[IT_ADMIN,SUPERADMIN] | component เดียวกับด้านบน |
| `/pm/plans` | PMPlanListPage | 🔒[IT_ADMIN,SUPERADMIN] | |
| `/pm/runs` | PMRunPage | 🔒[IT_ADMIN,SUPERADMIN] | |
| `/pm/schedule` | PMSchedulePage | 🔒[IT_ADMIN,SUPERADMIN] | |
| `/pm/floorplan` | PMFloorPlanPage | 🔒[IT_ADMIN,SUPERADMIN] | |
| `/scan` | ScanPage | 🔒 | **ไม่จำกัด role โดยตั้งใจ** — คอมเมนต์ในโค้ดอธิบายว่าใช้หน้างานบนมือถือ ไม่ใช่ข้อมูลที่ต้องจำกัดสิทธิ์ |
| `/pm/templates` | PMTemplatePage | 🔒[IT_ADMIN,SUPERADMIN] | |
| `/reports` | (redirect) | 🔒 | ไป `/reports/assets` |
| `/reports/assets` | ReportAssetsPage | 🔒[IT_ADMIN,SUPERADMIN,VIEWER] | |
| `/reports/borrow` | ReportBorrowPage | 🔒[IT_ADMIN,SUPERADMIN,VIEWER] | |
| `/reports/pm` | ReportPMPage | 🔒[IT_ADMIN,SUPERADMIN,VIEWER] | |
| `/reports/maintenance` | ReportMaintenancePage | 🔒[IT_ADMIN,SUPERADMIN,VIEWER] | |
| `/reports/user-clearance` | EmployeeClearancePage | 🔒[IT_ADMIN,SUPERADMIN] | ไม่มี VIEWER |
| `/admin/users` | (redirect) | 🔒 | ไป `/admin/settings?tab=8` |
| `/admin/settings` | SettingsPage | 🔒[SUPERADMIN,IT_ADMIN] | หน้า tab เดียว รวมหลาย sub-page (ดู `09_module_admin_settings.md`) |
| `/admin/backup` | (redirect) | 🔒 | ไป `/admin/settings?tab=12` |
| `/admin/notification-logs` | (redirect) | 🔒 | ไป `/admin/settings?tab=2` |
| `/admin/audit-log` | (redirect) | 🔒 | ไป `/admin/settings?tab=13` |
| `/admin/master-data` | MasterDataManagementPage | 🔒[SUPERADMIN,IT_ADMIN] | |
| `/admin/flowcharts` | FlowchartsPage | 🔒[IT_ADMIN,SUPERADMIN] | |
| `/contracts` | ContractsPage | 🔒[IT_ADMIN,SUPERADMIN] | |
| `/licenses` | LicensesPage | 🔒[IT_ADMIN,SUPERADMIN] | |
| `/profile` | ProfilePage | 🔒 | ไม่จำกัด role |
| `/donations` | DonationListPage | 🔒[IT_ADMIN,SUPERADMIN] | |
| `/donations/new` | DonationFormPage | 🔒[IT_ADMIN,SUPERADMIN] | |
| `/donations/:id` | DonationDetailPage | 🔒[IT_ADMIN,SUPERADMIN] | |
| `/disposals` | DisposalsPage | 🔒[IT_ADMIN,SUPERADMIN] | |
| `*` (ไม่ match) | redirect | — | ไป `/dashboard` |

Evidence: `frontend/src/App.tsx:90-171` (อ่านทุกบรรทัด)

**ทุกหน้าโหลดแบบ `React.lazy()`** (code splitting ต่อหน้า) ยกเว้น `LoginPage` และ `Layout`/`ErrorBoundary`/`Chatbot` ที่ import ตรง — `App.tsx:9-66`

**`homePathFor(role)` คืนค่า `/dashboard` เสมอทุก role** — ไม่มีการแยกหน้า landing ตาม role แม้ comment จะบอกว่าออกแบบให้ทำได้ (`App.tsx:70-72`)

**`<Chatbot />` แสดงทุกหน้าหลัง login** (นอก `<Routes>`, เงื่อนไขเดียวคือ `{user && <Chatbot />}`) — `App.tsx:172`

---
*ไฟล์นี้เป็นส่วนหนึ่งของ System Blueprint — ดู `INDEX.md` สำหรับสารบัญเต็ม*
