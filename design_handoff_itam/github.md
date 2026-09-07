repo: uoullnjlnos3751/assethub-V2
branch: master
path: frontend/src

## Last sync
date: 2026-08-05T10:30:00Z

### Updated in this project
- ไล่ตรวจ App.tsx เทียบกับม็อกอัป แล้วเติมหน้าจอที่ยังขาด 14 หน้า
- ยืม–คืน: คิวอนุมัติ · จ่ายของ (Check-out) · ต่ออายุ & เกินกำหนด
- PM: แผน PM ทั้งหมด · เทมเพลตใบตรวจ / บริจาค: สร้างรายการ · รายละเอียด
- รายงาน: ยืม–คืน · PM & ซ่อม / ตั้งค่า: Audit Log · Notification Logs · Companies
- ทรัพย์สิน: เพิ่มแท็บ "ประวัติทรัพย์สิน" ตาม AssetHistoryPage.tsx
- เพิ่มเมนู "มุมมองผู้ใช้" 4 แท็บ (My Requests / My Items / My History / My Extensions)
- เพิ่มไฟล์ ITAM Login.dc.html ตาม LoginPage.tsx (Sign In + Check Expiry)
- รื้อเมนู "แผน PM" ใหม่ทั้งหมดให้ตรงของจริง: PM Dashboard · แผน PM (year/company/site/deptTask/deviceType + eligibility) · Gantt รายสัปดาห์ · PM Run Checklist 20 หัวข้อ 6 กลุ่ม · Template (boolean/text/rating/select)

### เพิ่มเติมรอบล่าสุด
- เลือกใช้ธีม Light เพียงชุดเดียว (ลบ ITAM Dashboard.dc.html ธีมมืดที่ค้างเวอร์ชันเก่าออก)
- ไฟล์ใหม่: ITAM Mobile.dc.html (4 หน้าจอมือถือ), ITAM States.dc.html (9 สถานะ/edge case), ITAM Documents.dc.html (เอกสารพิมพ์ A4 3 ฉบับ)
- แดชบอร์ด: สวิตช์บทบาท SUPERADMIN/IT_ADMIN/USER, ตารางประวัติซ่อมในรายละเอียดทรัพย์สิน (MaintenanceTab.tsx), ผลตรวจไฟล์ก่อนนำเข้า (ImportExportPage.tsx)
- หน้าภาพรวม: เพิ่มทางลัด 6 ปุ่มตามบทบาท, สถานะทรัพย์สิน 6 สถานะตาม enum จริง, การ์ดระบบยืม-คืน / ระบบ PM / สถานะโมดูล ตาม DashboardPage.tsx
- แท็บ "ทำ PM Checklist" ทำใหม่ตาม flow จริงของ PMRunPage.tsx: ตารางงานที่ระบบสร้างจากแผน → เลือกเครื่อง (Computer Name) → กด "ทำ PM" → โมดัล Checklist (GLPI spec, ความคืบหน้า, รูปถ่าย, ✓ใช่/✗ไม่/N-A พร้อมช่องระบุเหตุผล) → บันทึกร่าง / บันทึกผล PM

## Screen map
| Screen (project) | Repo files |
| --- | --- |
| › ลงทะเบียนใหม่ | pages/assets/AssetFormPage.tsx |
| › รายละเอียดทรัพย์สิน | pages/assets/AssetDetailPage.tsx |
| › รายการทั้งหมด | pages/assets/AssetListPage.tsx |
| › นำเข้าข้อมูลจำนวนมาก | pages/assets/ImportExportPage.tsx |
| › สติกเกอร์ & QR | pages/assets/PrintQRPage.tsx |
| › ประวัติทรัพย์สิน | pages/assets/AssetHistoryPage.tsx |
| ยืม–คืน › คิวอนุมัติ | pages/borrow/ApprovalQueuePage.tsx |
| ยืม–คืน › จ่ายของ | pages/borrow/CheckoutPage.tsx |
| ยืม–คืน › รับคืน | pages/borrow/ReturnPage.tsx |
| ยืม–คืน › ต่ออายุ & เกินกำหนด | pages/borrow/ExtensionQueuePage.tsx, BorrowOverduePage.tsx |
| ยืม–คืน › ประวัติ | pages/borrow/BorrowHistoryPage.tsx |
| PM › ภาพรวม PM | pages/pm/PMDashboardPage.tsx |
| PM › แผน PM | pages/pm/PMPlanListPage.tsx |
| PM › กำหนดการ (Gantt) | pages/pm/PMSchedulePage.tsx |
| PM › ทำ PM Checklist | pages/pm/PMRunPage.tsx |
| PM › Template | pages/pm/PMTemplatePage.tsx |
| จำหน่าย › บริจาค (สร้าง / รายละเอียด) | pages/donations/DonationFormPage.tsx, DonationDetailPage.tsx, DonationListPage.tsx |
| คลังอะไหล่ | pages/inventory/InventoryPage.tsx |
| รายงาน › ตามหมวด | pages/reports/ReportAssetsPage.tsx |
| รายงาน › ยืม–คืน | pages/reports/ReportBorrowPage.tsx |
| รายงาน › PM & ซ่อม | pages/reports/ReportPMPage.tsx, ReportMaintenancePage.tsx |
| ตั้งค่า › ผู้ใช้ & สิทธิ์ | pages/admin/UsersPage.tsx |
| ตั้งค่า › ข้อมูลหลัก | pages/assets/MasterDataPage.tsx, DeviceTypesPage.tsx, LocationsPage.tsx, VendorsPage.tsx, categories/CategoryPage.tsx |
| ตั้งค่า › บันทึกกิจกรรม | pages/admin/AuditLogPage.tsx |
| ตั้งค่า › การแจ้งเตือน | pages/admin/NotificationLogsPage.tsx |
| ตั้งค่า › บริษัท & หน่วยงาน | pages/admin/CompaniesPage.tsx |
| ตั้งค่า › ทั่วไป | pages/admin/SettingsPage.tsx |
| ภาพรวม (KPI · ทางลัด · สถานะ · โมดูล) | pages/DashboardPage.tsx |
| ITAM Mobile.dc.html | pages/borrow/ReturnPage.tsx, pm/PMRunPage.tsx, assets/AssetFormPage.tsx |
| ITAM States.dc.html | components/EmptyState.tsx, LoadingSkeleton.tsx + empty/error states ทั่วทั้งโปรเจกต์ |
| ITAM Documents.dc.html | pages/borrow/CheckoutPage.tsx, pm/PMRunPage.tsx, donations/DonationFormPage.tsx |
| มุมมองผู้ใช้ (4 แท็บ) | pages/borrow/MyRequestsPage.tsx, MyItemsPage.tsx, MyHistoryPage.tsx, MyExtensionsPage.tsx |
| ITAM Login.dc.html | pages/LoginPage.tsx, LoginPage.css |
