# MODULE: Dashboard & Reports

## Module Profile

| หัวข้อ | รายละเอียด |
|---|---|
| **Module ID** | `dashboard-reports` |
| **วัตถุประสงค์** | Dashboard คือหน้าแรกที่ผู้ใช้ระดับ IT_ADMIN/SUPERADMIN/VIEWER เห็นหลังล็อกอิน สรุปภาพรวมทั้งระบบ (ทรัพย์สิน, ยืม-คืน, PM, ประกัน, สัญญา/license, คนออนไลน์) ในหน้าเดียว ส่วน USER เห็นเมนูทางลัดแบบง่ายแทน — Reports เป็นชุดหน้ารายงานแยกตามโดเมน (ทรัพย์สิน/ยืม-คืน/PM/ซ่อมบำรุง/ตรวจสอบทรัพย์สินพนักงาน) สำหรับดูรายละเอียดเชิงลึกกว่าการ์ดสรุปบนแดชบอร์ด |
| **Business Objective** | ให้ผู้บริหาร/ผู้ดูแลระบบเห็นสถานะปฏิบัติการ (operations) และ "สิ่งที่ต้องลงมือทำ" ได้ทันทีโดยไม่ต้องไล่เปิดทีละโมดูล และให้มีรายงานที่พิมพ์/ส่งออกได้สำหรับงานตรวจสอบ/นำเสนอ |
| **Users** | IT_ADMIN, SUPERADMIN, VIEWER (เห็นแดชบอร์ดเต็ม + รายงานทั้งหมดยกเว้นตรวจสอบทรัพย์สินพนักงาน); USER (เห็นแดชบอร์ดแบบทางลัดง่าย ไม่เห็นเมนูรายงาน) |
| **Roles** | ดู "Page Inventory" ต่อหน้า — ทุก endpoint ของ `/dashboard/*` จำกัดที่ `IT_ADMIN`, `SUPERADMIN`, `VIEWER` (`backend/src/routes/dashboard.ts:19`) |
| **Parent Menu** | เมนู "แดชบอร์ด" อยู่นอก section ปกติ ใน section `'ภาพรวมระบบ'` — `frontend/src/navigation/nav.tsx:76`; เมนู "รายงานระบบ" เป็นกลุ่มย่อยใน section `'สรุปและรายงาน'` — `frontend/src/navigation/nav.tsx:159-168` |
| **Related Modules** | Asset Registry, Borrow/Return, PM (Preventive Maintenance), Inventory, Contract & License, Notification Outbox, External Agent Monitoring (บริการภายนอกที่ตรวจสุขภาพเครื่อง/แบตเตอรี่) |

## Page Inventory

### หน้า: แดชบอร์ด (Dashboard)
- **Page ID**: `dashboard-main`
- **Route**: `/dashboard`
- **Component**: `frontend/src/pages/DashboardPage.tsx`
- **Purpose**: สรุปภาพรวมระบบทั้งหมดในหน้าเดียว — KPI, วงจรชีวิตทรัพย์สิน, คิวงานที่ต้องจัดการ, ผลลัพธ์จากการตรวจ PM, ห้องปฏิบัติการ IT (คนออนไลน์แบบสด), สัดส่วนหมวดหมู่, ทางลัด, สถานะทรัพย์สิน/สถานที่ตั้ง/ประกัน, สัญญา/license
- **Role required**: ทุก role ที่ login ได้เข้าถึง route ได้ (ไม่มี `ProtectedRoute roles=` ครอบ — `frontend/src/App.tsx:95`) แต่เนื้อหาที่แสดงแยกตาม role ในโค้ด: `user?.role === 'IT_ADMIN' || 'SUPERADMIN' || 'VIEWER'` จึงจะยิง query ข้อมูลเต็ม (`DashboardPage.tsx:54`); role `USER` เห็นเฉพาะ grid ทางลัด 6 ปุ่ม (`DashboardPage.tsx:109-150`); role อื่น (ไม่เข้าเงื่อนไขใดเลย) จะไม่โหลดข้อมูลอะไรเลย (`setLoading(false)` เฉยๆ ที่ `DashboardPage.tsx:92`)
- **Evidence**: `frontend/src/pages/DashboardPage.tsx:1-359`

### หน้า: รายงานทรัพย์สิน (Report — Assets)
- **Page ID**: `report-assets`
- **Route**: `/reports/assets`
- **Component**: `frontend/src/pages/reports/ReportAssetsPage.tsx`
- **Purpose**: รายงานสรุปทะเบียนทรัพย์สิน แยกตามสถานะ/แผนก/บริษัท/ประเภท/สถานที่/หมวดหมู่ พร้อมมูลค่าซื้อรวม
- **Role required**: `IT_ADMIN`, `SUPERADMIN`, `VIEWER` — `frontend/src/App.tsx:145`
- **Evidence**: `frontend/src/pages/reports/ReportAssetsPage.tsx`

### หน้า: รายงานยืม-คืน (Report — Borrow)
- **Page ID**: `report-borrow`
- **Route**: `/reports/borrow`
- **Component**: `frontend/src/pages/reports/ReportBorrowPage.tsx`
- **Purpose**: รายงานสรุปคำขอยืม-คืน แยกตามสถานะ, แนวโน้มรายเดือนตามปีที่เลือก, ตัวเลขค้าง/เกินกำหนด/รออนุมัติ
- **Role required**: `IT_ADMIN`, `SUPERADMIN`, `VIEWER` — `frontend/src/App.tsx:146`
- **Evidence**: `frontend/src/pages/reports/ReportBorrowPage.tsx`

### หน้า: รายงาน PM (Report — Preventive Maintenance)
- **Page ID**: `report-pm`
- **Route**: `/reports/pm`
- **Component**: `frontend/src/pages/reports/ReportPMPage.tsx`
- **Purpose**: รายงานสรุปผล PM ตามปี (แผน/เสร็จ/ค้าง/เลยกำหนด, แยกตามหมวดหมู่/แผนก) และ "เอกสารเสนอจัดซื้อ" (procurement report) ที่คำนวณจากผลประเมิน PM
- **Role required**: `IT_ADMIN`, `SUPERADMIN`, `VIEWER` — `frontend/src/App.tsx:147`
- **Evidence**: `frontend/src/pages/reports/ReportPMPage.tsx`

### หน้า: รายงานซ่อมบำรุง (Report — Maintenance)
- **Page ID**: `report-maintenance`
- **Route**: `/reports/maintenance`
- **Component**: `frontend/src/pages/reports/ReportMaintenancePage.tsx`
- **Purpose**: รายงานประวัติ/สถิติงานซ่อมบำรุงทรัพย์สิน
- **Role required**: `IT_ADMIN`, `SUPERADMIN`, `VIEWER` — `frontend/src/App.tsx:148`
- **Evidence**: `frontend/src/pages/reports/ReportMaintenancePage.tsx`

### หน้า: ตรวจสอบทรัพย์สินพนักงาน (Employee Clearance)
- **Page ID**: `report-user-clearance`
- **Route**: `/reports/user-clearance`
- **Component**: `frontend/src/pages/reports/EmployeeClearancePage.tsx`
- **Purpose**: ตรวจสอบว่าพนักงาน (ตาม username/ชื่อ) ถือครองทรัพย์สิน/มีของค้างยืมอะไรอยู่บ้าง ก่อนอนุมัติ clearance (เช่น ลาออก/โอนย้าย)
- **Role required**: `IT_ADMIN`, `SUPERADMIN` เท่านั้น (ไม่มี VIEWER) — `frontend/src/App.tsx:149`; เมนูก็ซ่อนจาก VIEWER เช่นกัน `roles: ['SUPERADMIN','IT_ADMIN']` — `frontend/src/navigation/nav.tsx:167`
- **Evidence**: `frontend/src/pages/reports/EmployeeClearancePage.tsx`

หมายเหตุ route `/reports` เปล่า ๆ จะ redirect ไป `/reports/assets` — `frontend/src/App.tsx:144`

ทุกหน้ารายงานมีแท็บสลับกันผ่าน `ReportHeaderTabs.tsx` (ดูหัวข้อ Filters ด้านล่าง)

---

## UI Components — Dashboard

รายการการ์ด/วิดเจ็ตทุกชิ้นที่ประกอบเป็นหน้า `/dashboard` เรียงตามลำดับที่ปรากฏจริงใน `DashboardPage.tsx` (สำหรับ role IT_ADMIN/SUPERADMIN/VIEWER):

| ลำดับ | Component | ไฟล์ | แสดงอะไร |
|---|---|---|---|
| Header | Page header + "Live" badge | `DashboardPage.tsx:257-276` | ชื่อหน้า, วันที่ปัจจุบัน (`now()`), badge สถานะ "Live" (ตกแต่งอย่างเดียว ไม่ผูก real-time) |
| Row 1 (4 การ์ด) | `KpiCard` × 4 | `components/KpiCard.tsx` | (1) ทรัพย์สิน IT ทั้งหมด, (2) PM เสร็จแล้ว (%), (3) OS ล้าสมัย, (4) งานซ่อมเปิดอยู่ — แต่ละใบคลิกแล้ว navigate ไปหน้าที่เกี่ยวข้อง |
| Strip | `LifecycleStrip` | `components/LifecycleStrip.tsx` | วงจรชีวิตทรัพย์สิน 5 ช่วง: จัดหา&ส่งมอบ → ใช้งานอยู่ → ดูแล&ซ่อมบำรุง → รอจ่ายต่อ → จำหน่ายออก ช่วงที่ยังไม่มีข้อมูล (`started:false`) แสดงจางลงและ "—" แทนเลข 0 |
| Section | `AttentionQueue` | `components/AttentionQueue.tsx` | "คิวงานที่ต้องจัดการ" — 8 รายการที่ประกอบขึ้นใน `DashboardPage.tsx:184-243` (agent ออฟไลน์, OS ล้าสมัย, PM เลยกำหนด, ยืมเกินกำหนด, รออนุมัติยืม, PM สัปดาห์นี้, ยังไม่มีวันหมดประกัน, วัสดุใกล้หมด) เรียงตาม severity (crit/warn/info) แล้วตามสัดส่วน (`count/of`); รายการที่ `count === 0` ถูกกรองออกไม่แสดง |
| Strip | `OutcomeStrip` | `components/OutcomeStrip.tsx` | "ผลจากการตรวจ PM ปี …" — จำนวนที่เสนอเพิ่ม RAM / เปลี่ยนแบต / เปลี่ยนเครื่อง ทั้งปี พร้อม coverage (ตรวจแล้วกี่เครื่องจากทั้งหมด); ซ่อนทั้งแถบถ้าผลรวมเป็น 0 |
| Row 2 (7:5) | `OpsRoomCard` (รวม `MonitoringWallPanel`) | `components/OpsRoomCard.tsx`, `components/MonitoringWallPanel.tsx` | "ห้องปฏิบัติการ IT (สด)" — แสดง hostname ของผู้ใช้ปัจจุบัน, monitoring wall 4 ตัวเลข (ทรัพย์สิน/งานเปิดอยู่/เกิน SLA/ปิดวันนี้ — คำนวณฝั่ง frontend ไม่ใช่ API), จำนวนคนออนไลน์รวม, 3 "โต๊ะ" (ยืม-คืน/PM/คลังวัสดุ) พร้อม avatar คนที่ทำงานอยู่โซนนั้น, ตารางรายชื่อคนออนไลน์ทั้งหมด+กำลังทำอะไร+เครื่องไหน |
| Row 2 | `CategoryDonutCard` (รวม `DonutChart`) | `components/CategoryDonutCard.tsx`, `components/DonutChart.tsx` | โดนัทชาร์ตสัดส่วนทรัพย์สินตามหมวดหมู่ (สูงสุด 6 หมวด) + legend รายชื่อ+จำนวน |
| Row 3 | `CategoryUtilizationCard` | `components/CategoryUtilizationCard.tsx` | "อัตราการใช้งานตามหมวดหมู่" — progress bar % การใช้งานต่อหมวด (5 หมวดที่มีของมากสุด) สีเปลี่ยนตามเกณฑ์ (≥80% แดง, ≥50% เหลือง) |
| Row 3 | `ExternalAgentsSummaryCard` | `components/ExternalAgentsSummaryCard.tsx` | จำนวนเครื่อง online/offline/ทั้งหมด จากระบบ Agent ภายนอก + สถานะ Trend Micro; component คืน `null` (ไม่แสดงการ์ด) เมื่อไม่มีข้อมูล |
| Row 3 | `QuickActionsPanel` | `components/QuickActionsPanel.tsx` | ทางลัด 6 ปุ่ม (เพิ่มทรัพย์สิน, รออนุมัติยืม, ส่งมอบอุปกรณ์, รับคืนอุปกรณ์, รายงานทรัพย์สิน, แผน PM) — เป็น static links ไม่ผูก API |
| Row 4 | `AssetStatusBreakdownCard` | `components/AssetStatusBreakdownCard.tsx` | แถบสัดส่วนทรัพย์สินตามสถานะ (Available/Borrowed/InUse/Maintenance/Retired/Lost) พร้อม % |
| Row 4 | `LocationBreakdownCard` | `components/LocationBreakdownCard.tsx` | แถบสัดส่วนทรัพย์สินตามสถานที่ตั้ง (top 6) |
| Row 4 | `WarrantyAlertsCard` | `components/WarrantyAlertsCard.tsx` | แจ้งเตือนประกันหมดแล้ว (ถ้ามี) + รายการ 4 ชิ้นแรกที่ใกล้หมดประกัน พร้อมจำนวนวันคงเหลือ |
| Bar | `QuietStatusBar` | `components/QuietStatusBar.tsx` | ยุบโมดูลที่ "ปกติ" (ทะเบียนครบถ้วน %, แจ้งเตือนส่งสำเร็จ %) เป็นแถบเดียว + รายชื่อ stage ในวงจรชีวิตที่ "ยังไม่เริ่มบันทึก" |
| Row 8 | `ContractLicenseSummary` | `components/ContractLicenseSummary.tsx` | 2 panel: (1) สัญญา — จำนวนทั้งหมด/หมดอายุแล้ว/ใกล้หมด 30/90 วัน + 3 สัญญาที่ใกล้หมดก่อน (คำนวณจาก `contractAPI.list()` ฝั่ง frontend ล้วนๆ ไม่ใช่จาก `/dashboard/*`) (2) License — % การใช้ seats รวม, จำนวน license/ใกล้หมด 90 วัน/seats ว่าง, license ที่ใช้งาน ≥80% (จาก `licenseAPI.list()`); ทั้ง panel ซ่อนตัวเองถ้าทั้งสอง list ว่าง |

**Role `USER`**: ไม่เห็นการ์ดข้างต้นเลย เห็นเฉพาะ grid ปุ่มทางลัด 6 ปุ่ม (อุปกรณ์พร้อมยืม, ยืมทรัพย์สินใหม่, คำขอของฉัน, รายการที่ยืม, คำขอขยายวัน, ประวัติการยืม) — `DashboardPage.tsx:109-150`

**Component ที่มีอยู่ในโฟลเดอร์ `pages/dashboard/components/` แต่ไม่ได้ถูก import ที่ไหนเลย (dead/unused)**: `BorrowSummaryCard.tsx`, `BorrowTrendCard.tsx`, `PMSummaryCard.tsx`, `RecentActivityCard.tsx`, `ModuleStatusCard.tsx`, `DataHealthCard.tsx`, `ProactiveAlertsBar.tsx` — grep ทั่ว `frontend/src` ไม่พบ `import` ของทั้ง 7 ไฟล์นี้จากไฟล์อื่นนอกจากตัวมันเอง (สอดคล้องกับคอมเมนต์ใน `DashboardPage.tsx:333-336` ที่บอกว่ากราฟแนวโน้มยืม-คืนกับกิจกรรมล่าสุดถูก "ถอดออก" เพราะเป็นศูนย์ตลอดปี) แม้ backend endpoint ที่เคยป้อนข้อมูลให้การ์ดเหล่านี้ (`/dashboard/borrow-trend`, `/dashboard/recent-activity`, `/dashboard/module-status`, `/dashboard/data-health`, `/dashboard/proactive-alerts`) ยังทำงานอยู่และถูกเรียกจาก `dashboardOverview()` (เห็นได้จาก field `d.trend`, `d.activity`, `d.modules` ที่ยัง `setState` ใน `DashboardPage.tsx:73-75` แต่ไม่ถูกส่งต่อให้ component ใดวาดผล) — ข้อมูลถูกดึงมาแต่ไม่ได้ใช้แสดงผล

---

ทุกหน้ารายงาน (ยกเว้น `EmployeeClearancePage`) ใช้ `ReportHeaderTabs.tsx` เป็นแถบแท็บสลับหน้า — แต่แถบนี้มีแค่ 4 แท็บ (ทะเบียนทรัพย์สิน/ยืม-คืน/PM/ซ่อมบำรุง — `ReportHeaderTabs.tsx:82-109`) ไม่มีแท็บ "ตรวจสอบทรัพย์สินพนักงาน" จึงไปหน้านั้นได้ทางเมนูซ้าย (`nav.tsx:167`) เท่านั้น

### รายงานทรัพย์สิน (`ReportAssetsPage.tsx`)
- **KPI การ์ด 4 ใบ** (คลิกเพื่อกรองตาราง): ทรัพย์สินทั้งหมด, พร้อมใช้งาน/กำลังใช้ (`Available+InUse`), ซ่อมบำรุง/สูญหาย (`Maintenance+Lost`), กำลังยืม/ปลดระวาง (`Borrowed+Retired`) — `ReportAssetsPage.tsx:196-313`
- **แถบสัดส่วนสถานะ (Status Distribution)** — progress bar หลายสีตามสัดส่วนสถานะทั้ง 6 + legend การ์ดคลิกกรองได้ — `:316-356`
- **โดนัทชาร์ต "ประเภทอุปกรณ์" (Device Types)** วาดด้วย `recharts` `PieChart` จาก `summary.byType` — `:359-413`
- **การ์ดหมวดหมู่การใช้งานหลัก** (6 หมวดแรกจาก `summary.byCategory`) — `:421-437`
- **จัดสรรตามบริษัท/แผนก (Top 4)** จาก `summary.byCompany` / `summary.byDepartment` เรียงจากมากไปน้อยฝั่ง frontend — `:440-467`
- **`CompanyAssetMatrix`** — ตาราง matrix แยกตามหมวดหมู่ที่รับ `assets` (รายการดิบทั้งหมด) เป็น prop เพื่อคำนวณเอง — `:475-477`, component: `frontend/src/components/CompanyAssetMatrix.tsx`
- **ตาราง DataGrid รายการทรัพย์สินทั้งหมด** พร้อมคอลัมน์ประกันคงเหลือ (คำนวณจาก `warrantyDaysLeft` ที่ backend ส่งมา) — `:480-527`

### รายงานยืม-คืน (`ReportBorrowPage.tsx`)
- **การ์ดสรุป 4 ใบ** (คลิกกรอง): รออนุมัติ (`summary.pendingApproval`), กำลังยืม (`summary.activeCheckedOut` — **ดูหมายเหตุบั๊กด้านล่าง**), ยืมเกินกำหนด (`summary.overdue`), คำขอทั้งหมด (`history.length` นับจาก client ไม่ใช่จาก `summary.total`) — `:185-286`
- **กราฟแท่งแนวโน้มรายเดือน** (`recharts` `BarChart`) จาก `dashboardAPI.borrowTrend(trendYear)` พร้อม dropdown เลือกปี 2024/2025/2026 (hardcode) — `:291-336`
- **10 อันดับผู้ขอยืมสูงสุด** — นับจาก `history` (ทุกคำขอ ไม่จำกัดปี) group by ชื่อผู้ขอฝั่ง frontend — `:91-99, 339-384`
- **ตาราง DataGrid ประวัติการยืม-คืนทั้งหมด** จาก `borrowAPI.history({ limit: 10000 })` — `:419-436`

### รายงาน PM (`ReportPMPage.tsx`)
สลับ 2 มุมมองด้วยปุ่ม toggle (`view` state) — `:311-328`:
- **มุมมอง "ความคืบหน้า PM" (default)**:
  - การ์ดสรุป 4 ใบ: แผนงานทั้งหมด, ดำเนินการเสร็จ, คงเหลือ, % ความคืบหน้า (คำนวณฝั่ง frontend `completed/total`) — `:336-431`
  - แถบ progress + สถิติภาพรวมปีนั้น — `:434-474`
  - **แยกตามหมวดหมู่** และ **แยกตามแผนก** (progress bar ต่อกลุ่ม) จาก `summary.byCategory` / `summary.byDepartment` — `:477-532`
  - **ส่วนผลประเมิน/ความพึงพอใจ**: คะแนนความพึงพอใจเฉลี่ย (`satisfaction` answer, เฉลี่ยจาก `pMRunAnswer` ของ run ที่ COMPLETED), จำนวนเครื่องช้า/ชำรุด (action items), อัตราผ่านเกณฑ์ทันที (`pm_result==='passed'`) — คำนวณทั้งหมดฝั่ง **frontend** จาก `pmAPI.runs({limit:10000})` ที่ดึงมาทั้งก้อนแล้ว filter ปีด้วย `r.year === year` เอง — `:83-206, 540-593`
  - **3 พายชาร์ต**: สภาพภายนอก (physical_condition), ประสิทธิภาพความเร็ว (speed_performance), สรุปผลตรวจ (pm_result) — นับจาก `answers` array ของแต่ละ run ที่มี `item.key` ตรงกับคีย์เหล่านี้ — `:155-196, 596-698`
  - **ตาราง "คอมพิวเตอร์ที่พบข้อบกพร่อง"** (action items) — กรอง run ที่ `physical_condition==='broken'` หรือ `speed_performance==='very_slow'` หรือ `pm_result==='pending'` — `:198-206, 700-764`
  - **ตาราง DataGrid รายการตรวจนับ PM ทั้งหมด** ของปีที่เลือก พร้อมค้นหา/กรองสถานะ — `:805-830`
- **มุมมอง "ข้อเสนอจัดซื้อ"** — เลือกบริษัทจาก dropdown (`assetAPI.companyOptions()`) แล้วเรียก `pmAPI.procurementReport(company, year)` → render ด้วย `ProcurementPanel.tsx` (ดูรายละเอียดคำนวณในหัวข้อ Data Sources) — `:38-51, 330-331`

### รายงานซ่อมบำรุง (`ReportMaintenancePage.tsx`)
- **การ์ดสรุป 4 ใบ**: รายการซ่อมทั้งหมด, ซ่อมเสร็จสิ้น, กำลังดำเนินการ (`IN_PROGRESS`+`PENDING`), ค่าใช้จ่ายรวม (sum `totalCost` ของ record ที่โหลดมา) — คำนวณฝั่ง frontend จาก `records` ที่ได้จาก `maintenanceAPI.reportAll(params)` — `:108-276`
- **ตัวกรอง**: ค้นหาข้อความ (debounce 500ms), สถานะ (dropdown รวม option พิเศษ `IN_PROGRESS_ALL`), ช่วงวันที่เริ่มซ่อม (`DatePicker` 2 ตัว) — ทุกตัวกรองส่งเป็น query param ไปที่ backend (`status`, `search`, `startDate`, `endDate`) ไม่ใช่กรองฝั่ง client — `:75-106, 280-312`
- **ตาราง DataGrid** + **Dialog รายละเอียด** ต่อรายการซ่อม (อาการเสีย, การแก้ไข, ช่าง/vendor, ค่าใช้จ่าย) เปิดเมื่อคลิกแถวหรือไอคอนดู — `:317-459`

### ตรวจสอบทรัพย์สินพนักงาน (`EmployeeClearancePage.tsx`)
- ไม่มี dashboard การ์ดสรุป — เป็นหน้าค้นหาแบบ single-purpose: กรอกชื่อพนักงานตรงตัว (exact match, case-insensitive) แล้วเรียก `assetAPI.list({ exactOwnerName, limit: 500 })`, กรองซ้ำฝั่ง frontend ให้แน่ใจว่า `ownerName` ตรงเป๊ะ — `:23-42`
- แสดงตารางทรัพย์สินที่ถือครองอยู่ (กรอง `!['Retired','Disposed','Lost'].includes(status)` ออกจากรายการ "กำลังถือครอง") พร้อมปุ่มพิมพ์แบบฟอร์มส่งคืน (มีช่องเซ็นชื่อ/สภาพตอนคืน ที่โผล่เฉพาะตอนพิมพ์ผ่าน CSS `@media print`) — `:48, 93-238`

## Filters/Search/Date-range Controls per Report Page

| หน้า | ตัวกรอง | กลไก | Evidence |
|---|---|---|---|
| ReportAssetsPage | สถานะ (dropdown รวมกลุ่ม Active/Issue/Other/WarrantyExpired/WarrantyExpiring + สถานะเดี่ยว), ค้นหาข้อความ (รหัส/serial/ชื่อ/หมวดหมู่), คลิกการ์ด KPI/legend เพื่อกรอง | ทั้งหมดกรองฝั่ง **client** จาก `assets` ที่โหลดมาครั้งเดียว (`limit: 10000`) ผ่าน `useMemo` | `ReportAssetsPage.tsx:30-32,77-97,484-503` |
| ReportBorrowPage | สถานะคำขอ (รวม option พิเศษ "ยืมเกินกำหนด"), ค้นหาชื่อผู้ยืม, ปีของกราฟแนวโน้ม (dropdown 2024/2025/2026) | สถานะ/ชื่อกรองฝั่ง **client** จาก `history` (`useMemo`); ปีแนวโน้มเป็น **server** — trigger `useEffect` ยิง `dashboardAPI.borrowTrend(trendYear)` ใหม่ทุกครั้งที่เปลี่ยนปี | `ReportBorrowPage.tsx:22-24,57-89,393-412` |
| ReportPMPage | ปี (dropdown 2024/2025/2026, server-side refetch ทั้ง summary+runs), สถานะ PM (รวม "คงเหลือที่ต้องตรวจ"), ค้นหารหัสทรัพย์สิน/serial/แบรนด์, ค้นหาชื่อผู้ตรวจ, toggle มุมมอง progress/proposal, dropdown เลือกบริษัท (เฉพาะมุมมอง proposal) | ปีเป็น **server** (`useEffect` deps `[year]`); สถานะ/ค้นหา/ผู้ตรวจกรองฝั่ง **client** จาก `runs` ที่โหลดมาทั้งปีแล้ว (`limit:10000`) ผ่าน `useMemo`; บริษัทของมุมมอง proposal เป็น **server** (`useEffect` deps `[view, proposalCompany, year]`) | `ReportPMPage.tsx:21-51,83-126,769-803` |
| ReportMaintenancePage | ค้นหาข้อความ (debounce 500ms), สถานะ (รวม option พิเศษ `IN_PROGRESS_ALL`), ช่วงวันที่เริ่มซ่อม (`DatePicker` 2 ช่อง: startDate/endDate) | ทั้งหมดเป็น **server-side** — ส่งเป็น query params ไปที่ `GET /maintenance/report/all`; ค้นหามี debounce 500ms แยก `useEffect`, ตัวกรองอื่น trigger ทันที | `ReportMaintenancePage.tsx:27-30,75-106` |
| EmployeeClearancePage | ค้นหาชื่อพนักงาน (exact match, กด Enter หรือปุ่ม "ค้นหา") | **server** เรียก `assetAPI.list({ exactOwnerName })` ทุกครั้งที่กด ไม่มี live-filter ระหว่างพิมพ์ | `EmployeeClearancePage.tsx:17,23-42` |

Dashboard เอง (`/dashboard`) ไม่มีตัวกรองใดๆ ที่ผู้ใช้ปรับได้ — ปีของ `overview` ถูก fix เป็น `new Date().getFullYear()` เสมอ (`DashboardPage.tsx:55`), `warrantyDays` fix เป็น `60` (`DashboardPage.tsx:66`) ไม่มี UI ให้เปลี่ยนทั้งสองค่านี้

## Export/Print Capabilities

| หน้า | Excel | PDF | Print | หมายเหตุ/หลักฐาน |
|---|---|---|---|---|
| ReportAssetsPage | มี — ปุ่ม "Export Excel" เรียก `assetAPI.exportAssets()` → `GET /assets/export/excel` (backend สร้างไฟล์จริง, role `IT_ADMIN`/`SUPERADMIN` เท่านั้น) แล้วดาวน์โหลดผ่าน blob URL | มี — ปุ่ม "Export PDF" ใช้ `html2canvas` capture element `#report-content` เป็นรูปภาพแล้ววางลง `jsPDF` (ไม่ใช่ PDF ที่เป็นข้อความจริง — เป็นภาพสกรีนช็อตของ dashboard ส่วนบนเท่านั้น ไม่รวมตาราง DataGrid ด้านล่าง) | ไม่มีปุ่มพิมพ์เฉพาะ | `ReportAssetsPage.tsx:35-63,189-190`; backend export `backend/src/routes/assets.ts:1305` |
| ReportBorrowPage | มี — ปุ่ม "Export Excel" สร้างไฟล์ **ฝั่ง client ล้วนๆ** ด้วยไลบรารี `xlsx` (`XLSX.utils.json_to_sheet` จาก `filtered` ที่กรองอยู่บนจอ ไม่ใช่เรียก API export ของ backend) | มีแบบเดียวกับ ReportAssetsPage (`html2canvas`+`jsPDF` capture `#report-content`) | ไม่มี | `ReportBorrowPage.tsx:104-124,27-55` |
| ReportPMPage | มี — Export Excel ฝั่ง client ด้วย `xlsx` จาก `filteredRuns` (เฉพาะมุมมอง "ความคืบหน้า") | มีแบบเดียวกัน (`html2canvas`+`jsPDF`) | ไม่มีปุ่มพิมพ์ตรงๆ แต่มี CSS class `no-print` บน toggle ปุ่ม view (เตรียมไว้สำหรับ browser print แต่ไม่มีปุ่มเรียก `window.print()`) — มุมมอง "ข้อเสนอจัดซื้อ" (`ProcurementPanel`) ก็ใช้ id `report-content` เดียวกันจึงถูก PDF-export ได้เช่นกันแม้ปุ่ม PDF จะอยู่นอก toggle | `ReportPMPage.tsx:53-81,209-237,311` |
| ReportMaintenancePage | ไม่มี | มี (`html2canvas`+`jsPDF`) | ไม่มี | `ReportMaintenancePage.tsx:35-63` |
| EmployeeClearancePage | ไม่มี | ไม่มี (ไม่ใช้ jsPDF) | มี — ปุ่ม "พิมพ์เอกสารส่งคืน" เรียก `window.print()` ตรงๆ พร้อม CSS `@media print` ซ่อนทุกอย่างยกเว้น `#print-area` และโชว์คอลัมน์/ส่วนที่ประกาศเฉพาะตอนพิมพ์ (ช่องเซ็นชื่อ, สภาพตอนคืน) | `EmployeeClearancePage.tsx:44-46,133,183-184,199-212,220-238` |
| DashboardPage | ไม่มี | ไม่มี | ไม่มี | ไม่พบปุ่ม export/print ใดๆ ในไฟล์ |

ทุกหน้าที่มีปุ่ม "Export PDF" ใช้กลไกเดียวกันทุกตัวอักษร (คัดลอกกันมา): `html2canvas` capture `document.getElementById('report-content')` เป็น canvas สเกล 3x → แปลงเป็น PNG → วางลง `jsPDF('p','mm','a4')` พร้อม header ข้อความคงที่ (ชื่อรายงาน + วันที่ export) — ไม่ใช่ PDF ที่สร้างจากข้อมูลตารางจริง (เนื้อหาที่อยู่นอก div `#report-content` เช่นตาราง DataGrid รายการละเอียด จะไม่ติดไปใน PDF)

## API Inventory

### `backend/src/routes/dashboard.ts` — ทุก endpoint การ์ดผ่าน `guard = [authenticate, authorize('IT_ADMIN','SUPERADMIN','VIEWER')]` (`dashboard.ts:19`)

| Method & Path | Handler (services/dashboardData.ts) | Query Params | ใครเรียกใช้ | Evidence |
|---|---|---|---|---|
| `GET /dashboard/overview` | `dashboardOverview()` — รวมทุกก้อนด้วย `Promise.all` + `settle()` (ก้อนที่ fail คืน `null` ไม่ throw) | `year` (default ปีปัจจุบัน), `warrantyDays` (default 60) | `DashboardPage.tsx:66` | `dashboard.ts:34-37`, `dashboardData.ts:376-402` |
| `GET /dashboard/asset-summary` | `assetSummary()` | — | `ReportAssetsPage.tsx:67` | `dashboard.ts:39` |
| `GET /dashboard/module-status` | `moduleStatus()` | — | ไม่มีหน้าไหนเรียกตรง (ข้อมูลมาทาง `/overview` แต่ผลไม่ถูกวาด — ดู Unknown) | `dashboard.ts:40` |
| `GET /dashboard/category-utilization` | `categoryUtilization()` | — | ไม่มีหน้าไหนเรียกตรง (ใช้ผ่าน `/overview` → `CategoryUtilizationCard`) | `dashboard.ts:41` |
| `GET /dashboard/inventory-low-stock` | `inventoryLowStock()` | — | ไม่มีหน้าไหนเรียกตรง (ใช้ผ่าน `/overview`) | `dashboard.ts:42` |
| `GET /dashboard/data-health` | `dataHealth()` | — | ไม่มีหน้าไหนเรียกตรง (ใช้ผ่าน `/overview` แต่ผลไม่ถูกวาดเป็นการ์ดเฉพาะ — เห็นทางอ้อมใน `AttentionQueue`/`QuietStatusBar`) | `dashboard.ts:43` |
| `GET /dashboard/borrow-summary` | `borrowSummary()` | — | `ReportBorrowPage.tsx:59` | `dashboard.ts:44` |
| `GET /dashboard/borrow-trend` | `borrowTrend()` | `year` | `ReportBorrowPage.tsx:61` | `dashboard.ts:45` |
| `GET /dashboard/pm-summary` | `pmSummary()` | `year` | `Layout.tsx:159` (badge จำนวน PM ค้าง), `ReportPMPage.tsx:86` | `dashboard.ts:46` |
| `GET /dashboard/external-agents-summary` | `externalAgentsSummary()` | — | ไม่มีหน้าไหนเรียกตรง (ใช้ผ่าน `/overview`) | `dashboard.ts:47` |
| `GET /dashboard/recent-activity` | `recentActivity()` | — | `admin/settings/AuditLogTab.tsx:60` | `dashboard.ts:48` |
| `GET /dashboard/proactive-alerts` | `proactiveAlerts()` | — | ไม่มีหน้าไหนเรียกตรง (ใช้ผ่าน `/overview` → `AttentionQueue`) | `dashboard.ts:49` |
| `GET /dashboard/warranty-expiring` | `warrantyExpiring()` | `days` (default 30) | ไม่มีหน้าไหนเรียกตรง (ใช้ผ่าน `/overview` → `WarrantyAlertsCard`) | `dashboard.ts:50-51` |

ฟังก์ชัน `lifecycle()` และ `procurementOutcome()` ใน `dashboardData.ts:289-363` **ไม่มี route เดี่ยวเปิดให้เรียกตรง** — ถูกเรียกเฉพาะจากภายใน `dashboardOverview()` (`dashboardData.ts:393-394`) ผลลัพธ์ออกมาเป็น field `stages` และ `outcome` ที่ใช้วาด `LifecycleStrip` และ `OutcomeStrip`

### Endpoint อื่นที่หน้ารายงานเรียก (ไม่ใช่ `/dashboard/*`)

| Method & Path | เรียกจาก (frontend) | Role guard (backend) | Evidence |
|---|---|---|---|
| `GET /assets` (พร้อม `exactOwnerName`) | `ReportAssetsPage` (list เต็ม), `EmployeeClearancePage` (ค้นหา) | `authenticate` เท่านั้น — ทุก role ที่ login แล้วเรียกได้ | `backend/src/routes/assets.ts:607-675` |
| `GET /assets/export/excel` | `ReportAssetsPage` ปุ่ม Export Excel | `IT_ADMIN`, `SUPERADMIN` | `backend/src/routes/assets.ts:1305` |
| `GET /assets/options/companies` | `ReportPMPage` (dropdown บริษัทของมุมมองข้อเสนอ) | — (ไม่ตรวจใน grep นี้ ดู Unknown) | `frontend/src/services/api.ts:158` |
| `GET /borrow/history` | `ReportBorrowPage` | `IT_ADMIN`, `SUPERADMIN` เท่านั้น (**ไม่รวม VIEWER**) | `backend/src/routes/borrow.ts:1148` |
| `GET /pm/runs` | `ReportPMPage` | `IT_ADMIN`, `SUPERADMIN` เท่านั้น (**ไม่รวม VIEWER**) | `backend/src/routes/pm.ts:585` |
| `GET /pm/procurement-report` | `ReportPMPage` มุมมอง "ข้อเสนอจัดซื้อ" → `pmAPI.procurementReport()` | `IT_ADMIN`, `SUPERADMIN` เท่านั้น (**ไม่รวม VIEWER**) | `backend/src/routes/pm.ts:1163` |
| `GET /maintenance/report/all` | `ReportMaintenancePage` | `IT_ADMIN`, `SUPERADMIN` เท่านั้น (**ไม่รวม VIEWER**) | `backend/src/routes/maintenance.ts:181` |
| `GET /contracts`, `GET /licenses` | `DashboardPage` (`ContractLicenseSummary`) | ไม่ได้ตรวจในงานนี้ (นอกขอบเขต) | `DashboardPage.tsx:89-90` |
| `GET /presence/online` | `DashboardPage` (`OpsRoomCard`) polling ทุก 15 วิ | ไม่ได้ตรวจในงานนี้ | `DashboardPage.tsx:100-104` |

**พบข้อขัดแย้งเรื่องสิทธิ์ (role mismatch) ที่สำคัญ**: route ฝั่ง frontend อนุญาต `VIEWER` เข้าหน้า `/reports/borrow`, `/reports/pm`, `/reports/maintenance` ได้ (`App.tsx:146-148`) แต่ backend endpoint หลักที่หน้าเหล่านั้นใช้ดึงตารางรายละเอียด (`/borrow/history`, `/pm/runs`, `/pm/procurement-report`, `/maintenance/report/all`) ทั้งหมด `authorize('IT_ADMIN','SUPERADMIN')` เท่านั้น ไม่รวม `VIEWER` — ผลคือผู้ใช้ role `VIEWER` เปิด 3 หน้านี้ได้ เห็นการ์ดสรุป (จาก `/dashboard/*` ที่อนุญาต VIEWER) แต่ตาราง/กราฟแนวโน้มที่ต้องพึ่ง endpoint เหล่านี้จะได้ HTTP 403 (ตัวเลขจะค้างที่ loading หรือ array ว่างแล้วแต่ error handling ของแต่ละหน้า — ไม่ได้ตรวจ error boundary ในงานนี้)

## Data Sources & Calculations

อ้างอิงจาก `backend/src/services/dashboardData.ts` และ `backend/src/services/pmProcurement.ts` ทั้งหมด

| การ์ด/เมตริก | ฟังก์ชัน | คำนวณอย่างไร |
|---|---|---|
| ทรัพย์สิน IT ทั้งหมด (KPI), สัดส่วนหมวดหมู่, สถานะ, สถานที่, บริษัท, ประเภท | `assetSummary()` | `prisma.asset.groupBy` แยกตาม `status`/`departmentId`/`company`/`type`/`location` อย่างละ query, บวก `prisma.asset.count()` รวม, `prisma.category.findMany` (เฉพาะ `isActive`) พร้อม `_count.assets`, และ `prisma.asset.aggregate({_sum:{purchasePrice}})` — **หมายเหตุสำคัญ**: `totalPurchaseCost` เป็นผลรวมราคาซื้อดิบ (ไม่ใช่ book value หลังหักค่าเสื่อม เพราะระบบยังไม่มี policy อายุการใช้งาน/มูลค่าซาก) — `dashboardData.ts:18-41` |
| PM เสร็จแล้ว % (KPI), งานซ่อมเปิดอยู่ (KPI) | `moduleStatus()` (ไม่ได้ใช้แสดงตรงบน UI ปัจจุบัน — ดู Unknown) / จริงๆ KPI หน้าแดชบอร์ดคำนวณจาก `d.pm` (`pmSummary()`) และ `byStatus` ของ `assetSummary()` | PM% = `pmDone/pmTotal` นับจาก `pmSummary()`; งานซ่อมเปิดอยู่ = จำนวน asset ที่ `status==='Maintenance'` จาก `byStatus` | `DashboardPage.tsx:162-164,288-305`, `dashboardData.ts:170-205` |
| OS ล้าสมัย (KPI) | `dataHealth()` field `outdatedOSCount` | `prisma.asset.count({ where: { computerDetail: { OR: [osVersion contains 'Windows 7'/'Windows 8'/'Windows 10' (insensitive)] } } })` — **นับ Windows 10 ว่าล้าสมัยด้วย** (ไม่ใช่แค่ 7/8) | `dashboardData.ts:106-134` |
| วงจรชีวิตทรัพย์สิน (`LifecycleStrip`) | `lifecycle()` | 5 stage: (1) `deliver` = `prisma.deliveryRequest.count()` ทั้งหมด, ค้าง = `status NOT IN ['CONFIRMED','RETURNED']`; (2) `inuse` = `asset.count({status:'InUse'})`, sub = จำนวน `Available`; (3) `maintain` = `pmDone` ของปีปัจจุบัน (`pMRun.count({year, status:'COMPLETED'})`), sub รวม `pmTotal`+จำนวน asset `status:'Maintenance'`; (4) `recover` = จำนวน asset `Available` (ตีความว่าเป็นช่วง "รอจ่ายต่อ"); (5) `dispose` = จำนวน asset `Retired`, sub = จำนวน `assetDisposal.count()` — แต่ละ stage มี flag `started` ที่ตัดสินว่าค่า 0 หมายถึง "ยังไม่เริ่ม" หรือ "ปกติ" | `dashboardData.ts:289-344` |
| คิวงานที่ต้องจัดการ (`AttentionQueue`, 8 รายการ) | ผสมจากหลายฟังก์ชัน คำนวณสัดส่วน (severity/share) ฝั่ง **frontend** | agent ออฟไลน์ = `externalAgentsSummary()` field `offline`/`total` (บริการภายนอก); OS ล้าสมัย = `dataHealth().outdatedOSCount`; PM เลยกำหนด = `pmSummary().overdue`; ยืมเกินกำหนด = `borrowSummary().overdue`; รออนุมัติยืม = `borrowSummary().pendingApproval`; PM สัปดาห์นี้ = `proactiveAlerts().upcomingPMs`; ยังไม่มีวันหมดประกัน = `dataHealth().missingWarranty`/`activeTotal`; วัสดุใกล้หมด = `inventoryLowStock().lowStockCount`/`totalQuantity` | `DashboardPage.tsx:184-243` |
| PM เลยกำหนด (`pmSummary().overdue`) | `pmSummary(year)` | จาก `pMRun.findMany({year})` กรอง `r.status !== 'COMPLETED' && r.plan.endDate && new Date(r.plan.endDate) < now` | `dashboardData.ts:170-205`, บรรทัด `overdue` = `:183` |
| ยืมเกินกำหนด (`borrowSummary().overdue`, `moduleStatus().borrow.overdueItems`, `proactiveAlerts().overdueItems`) | `borrowSummary()`/`moduleStatus()`/`proactiveAlerts()` (สูตรเดียวกัน 3 ที่) | `prisma.borrowRequestItem.count({ where: { itemStatus:'CheckedOut', dueDate: { lt: now } } })` — นับที่ระดับ **item** ไม่ใช่ request | `dashboardData.ts:50,140,246` |
| รออนุมัติยืม | `borrowSummary().pendingApproval` / `proactiveAlerts().pendingApprovals` | `prisma.borrowRequest.count({ where: { status: 'Pending' } })` | `dashboardData.ts:142,247` |
| PM กำหนดสัปดาห์นี้ | `proactiveAlerts().upcomingPMs` | `prisma.pMRun.count({ where: { status: {not:'COMPLETED'}, plan: { endDate: { gte: now, lte: now+7วัน } } } })` | `dashboardData.ts:241-253` |
| ยังไม่มีวันหมดประกัน | `dataHealth().missingWarranty` / `.activeTotal` | `asset.count({ warrantyEndDate: null, NOT: {status:'Retired'} })` เทียบกับ `asset.count({ NOT: {status:'Retired'} })` — นับเฉพาะเครื่องที่ยังไม่ปลดระวาง (คอมเมนต์ในโค้ดบอกว่านี่คือเหตุผลเดียวที่การ์ดใกล้หมดประกันมักว่างเปล่า) | `dashboardData.ts:124-134` |
| วัสดุใกล้หมด | `inventoryLowStock()` | ดึง `availableQuantity`/`minStockLevel` ของ `InventoryItem` ที่ `isActive` มาเทียบใน JS (Prisma เทียบ 2 คอลัมน์ในแถวเดียวกันไม่ได้โดยตรง) นับจำนวนที่ `availableQuantity <= minStockLevel`; `totalQuantity` = `aggregate({_sum:{totalQuantity}})` | `dashboardData.ts:90-104` |
| ผลลัพธ์จากการตรวจ PM (`OutcomeStrip`: เสนอเพิ่ม RAM/เปลี่ยนแบต/เปลี่ยนเครื่อง) | `procurementOutcome(year)` → เรียก `buildProcurementReport(prisma, null, year)` (ไม่กรองบริษัท — ตัวเลขบนแดชบอร์ดเป็นยอดรวมทั้งกลุ่ม) | ดูรายละเอียดสูตรทั้งหมดในแถวถัดไป (`buildProcurementReport`) — ที่นี่แค่ตัด field `addRam.length`/`replaceBattery.length`/`replaceMachine.length`/`coverage` มาส่งต่อ | `dashboardData.ts:346-363` |
| **`buildProcurementReport()`** (ใช้ทั้งใน dashboard `OutcomeStrip` และหน้า "ข้อเสนอจัดซื้อ" ของ `ReportPMPage`) | `pmProcurement.ts:83-201` | ดึง asset ที่ `type IN ['Notebook','PC Desktop','Macbook']` และไม่ `Retired` (กรองบริษัทถ้าระบุ) → ดึงคำตอบ PM ล่าสุด (`pMRunAnswer` ที่ `item.key==='speed_performance'`, run สถานะ `COMPLETED` ของปีนั้น) ต่อเครื่อง หาค่าล่าสุดด้วย `completedAt`/`performedAt` แล้วเช็คว่าข้อความมีคำว่า "หน่วง"/"ช้า" หรือไม่ (`slow`) → ดึงข้อมูลแบตเตอรี่จาก **external Agent** (`fetchAllAgentRecords()`) จับคู่ด้วย `serial_number`/`hostname` (skip ถ้า agent ล่ม) → กฎ 3 ข้อ: **(1) เพิ่ม RAM** ถ้า `slow===true && ram<=8GB`; **(2) เปลี่ยนเครื่อง** ถ้า `slow===true` แต่ RAM `>8GB` (เพิ่ม RAM ไม่น่าช่วย); **(3) เปลี่ยนแบตเตอรี่** ถ้าอ่านค่าแบตได้และ `<50%` (เกณฑ์แยกจาก RAM/slow — เครื่องหนึ่งอาจเข้าทั้ง RAM/เครื่อง และแบตพร้อมกัน) — ไม่ใส่ราคาต้นทุนเพราะทะเบียนมี `purchasePrice` แค่ 4 จาก 522 เครื่อง (ตามคอมเมนต์ในโค้ด), เรียงผลลัพธ์แต่ละกลุ่มตาม `batteryPct` แล้วชื่อ | `pmProcurement.ts:83-201`, ค่าคงที่ `RAM_UPGRADE_GB=8`, `BATTERY_REPLACE_PCT=50` ที่ `:25,27` |
| แนวโน้มยืม-คืนรายเดือน (`ReportBorrowPage` bar chart) | `borrowTrend(year)` | ดึง `borrowRequest` ทั้งหมดของปีนั้นตาม `createdAt`, group by เดือนใน JS, นับ `requests` (ทุกคำขอ), `approved` (status `Approved`/`CheckedOut`/`Returned`), `returned` (status `Returned`) — เดือนที่ไม่มีคำขอ init เป็น 0 ไว้ล่วงหน้าเพื่อให้กราฟมีครบ 12 แท่ง | `dashboardData.ts:147-168` |
| สรุปยืม-คืน (`ReportBorrowPage` การ์ดบน) | `borrowSummary()` | `total`=`borrowRequest.count()`, `byStatus`=`groupBy(status)`, `overdue`/`pendingApproval` ตามสูตรข้างต้น, `activeItems`=`borrowRequestItem.count({itemStatus: IN ['CheckedOut','PartiallyReturned']})` — **ReportBorrowPage อ่าน field `summary.activeCheckedOut` ซึ่งไม่มีอยู่จริงในผลลัพธ์นี้ (มีแต่ `activeItems`) การ์ด "กำลังยืม" จึงแสดง 0 เสมอ — บั๊ก field-name mismatch ระหว่าง frontend/backend** | `dashboardData.ts:136-145`; frontend อ่านผิดที่ `ReportBorrowPage.tsx:232` |
| สรุป PM ปี (`ReportPMPage` การ์ดบน, breakdown หมวด/แผนก) | `pmSummary(year)` | `total`/`completed` นับจาก `pMRun.findMany({year})` (`completed` = `status==='COMPLETED'`); `planned` = sum `plannedDeviceCount` ของ `pMPlan` ปีนั้น (คนละตัวกับ `total` ที่นับจาก run จริง); `overdue` ตามสูตรข้างต้น; `byCategory`/`byDepartment` build จาก loop เดียวกับที่ดึง `runs` มา (ไม่ query ซ้ำ) โดยใช้ `plannedDeviceCount` ของแผนที่ผูกกับแต่ละ run เป็นตัวถ่วงน้ำหนัก ไม่ใช่นับ 1 ต่อ 1 run | `dashboardData.ts:170-205` |
| ผลประเมิน/ความพึงพอใจ PM, 3 พายชาร์ต, action items (`ReportPMPage`) | **ไม่ผ่าน dashboardData.ts** — คำนวณทั้งหมดฝั่ง **frontend** จาก `pmAPI.runs({limit:10000})` ที่ดึง run ทุกตัวมาพร้อม `answers` แล้ว filter/aggregate เอง | ดูหัวข้อ UI Components ด้านบน (`ReportPMPage.tsx:128-206`) — จุดอ่อน: ดึง PM run **ทั้งหมดในระบบ** (`limit:10000`) มาไว้ใน browser ทุกครั้งที่เปลี่ยนปี แล้วค่อย filter `r.year===year` ที่ client, ไม่ได้ filter ที่ query | `ReportPMPage.tsx:83-96` |
| สัญญา & License (`ContractLicenseSummary` บน dashboard) | ไม่ผ่าน `/dashboard/*` — ดึงตรงจาก `contractAPI.list({})` / `licenseAPI.list({})` แล้วคำนวณวันคงเหลือ/สัดส่วน seats ทั้งหมดฝั่ง **frontend** | `dl(d)` = จำนวนวันจนถึงวันหมดอายุ; นับ `cExpired`(<0วัน), `cExp30`(0-30), `cExp90`(0-90); seat% = `usedSeats/totalSeats`; license ใช้งานสูง = `usedSeats/totalSeats >= 0.8` | `ContractLicenseSummary.tsx:15-28`, `DashboardPage.tsx:89-90` |
| ห้องปฏิบัติการ IT / Monitoring Wall (`OpsRoomCard`) | ไม่ผ่าน `/dashboard/*` — คนออนไลน์จาก `presenceAPI.online()` (poll ทุก 15 วิ); ตัวเลข `openWork`/`overSla`/`closedToday` คำนวณฝั่ง **frontend** ล้วนจากค่าที่ได้จาก `/dashboard/overview` อยู่แล้ว | `openWork = borrowPending + maintenance`; `overSla = borrowOverdue + pmOverdue`; `closedToday` = นับ `activityData.recentReturns` (จาก `recentActivity()`) ที่ `returnedAt` ตรงกับวันนี้ (`toDateString()` เทียบ) | `DashboardPage.tsx:96-104,171-177` |
| อุปกรณ์ออนไลน์ตอนนี้ (`ExternalAgentsSummaryCard`) | `externalAgentsSummary()` | fetch ตรงไปยัง `${EXTERNAL_ASSET_API_URL}/api/external/summary` (บริการภายนอก, ต้องมี env var `EXTERNAL_ASSET_API_URL`+`EXTERNAL_ASSET_API_KEY`) ด้วย timeout 5 วิ — คืน `{available:false}` เมื่อไม่ตั้งค่า env หรือ fetch ล้มเหลว/timeout (ไม่ throw error ให้ทั้งหน้าแดชบอร์ดพัง) | `dashboardData.ts:207-222` |
| กิจกรรมล่าสุด (คำนวณแต่ไม่แสดงเป็นการ์ด) | `recentActivity()` | 10 คำขอยืมล่าสุด + 10 การคืนล่าสุด (`orderBy createdAt/returnedAt desc`) — ใช้เฉพาะเพื่อคำนวณ `closedToday` ใน `OpsRoomCard` ไม่มีการ์ดแสดงลิสต์นี้ตรงๆ บนแดชบอร์ด (เทียบกับ `RecentActivityCard.tsx` ที่เป็น dead component) | `dashboardData.ts:225-239` |
| ข้อมูลบริบทเพิ่มเติมในเอกสารเสนอจัดซื้อ (`context.lowRamNotFlagged`, `context.ramDistribution`) | `buildProcurementReport()` | `lowRamNotFlagged` = จำนวนเครื่อง RAM ≤8GB ที่ไม่เข้าเกณฑ์ slow (ยังไม่ถูกเสนอรอบนี้); `ramDistribution` = histogram ของ RAM แบ่ง 4 bucket (`≤4GB`/`8GB`/`16GB`/`>16GB`/`ไม่ทราบ`) จาก regex ดึงตัวเลขแรกออกจากสตริง `ram` | `pmProcurement.ts:140-177` |

## Unknown / Not Verified

- **บั๊กชื่อ field ที่ยืนยันแล้ว**: `ReportBorrowPage.tsx:232` อ่าน `summary?.activeCheckedOut` แต่ backend (`borrowSummary()` ใน `dashboardData.ts:136-145`) ไม่เคยส่ง field ชื่อนี้ (มีแต่ `activeItems`) — การ์ด "กำลังยืม" บนหน้ารายงานยืม-คืนจึงแสดง `0` เสมอโดยไม่มีทางรู้จาก UI ว่าเป็นบั๊กหรือค่าจริง (ยังไม่ได้ตรวจว่ามีการแก้ไขนอกเหนือจากที่ grep พบ)
- **Role mismatch ที่ยืนยันแล้ว**: role `VIEWER` เข้าหน้า `/reports/borrow`, `/reports/pm`, `/reports/maintenance` ได้ตาม React Router (`App.tsx:146-148`) แต่ backend endpoint หลักของ 3 หน้านี้ (`/borrow/history`, `/pm/runs`, `/pm/procurement-report`, `/maintenance/report/all`) `authorize` เฉพาะ `IT_ADMIN`/`SUPERADMIN` — ยังไม่ได้ตรวจโค้ด error-handling ของแต่ละหน้าว่า 403 แสดงผลอย่างไร (เงียบ/toast/ตารางว่าง)
- **Component ที่ไม่ได้ใช้ (dead code) ที่ยืนยันแล้ว**: `BorrowSummaryCard.tsx`, `BorrowTrendCard.tsx`, `PMSummaryCard.tsx`, `RecentActivityCard.tsx`, `ModuleStatusCard.tsx`, `DataHealthCard.tsx`, `ProactiveAlertsBar.tsx` ในโฟลเดอร์ `pages/dashboard/components/` ไม่ถูก import จากที่ใดเลยนอกจากตัวเอง — ยังไม่ได้ตรวจว่าเคยถูกใช้ในเวอร์ชันก่อนหน้าหรือเป็นโค้ดที่เตรียมไว้ใช้ต่อ (ดูคอมเมนต์ `DashboardPage.tsx:333-336` ที่อธิบายเหตุผลการถอดกราฟแนวโน้ม/กิจกรรมออก)
- **ไม่ได้ตรวจ**: role guard ของ `GET /assets/options/companies` (`assetAPI.companyOptions`, ใช้ใน dropdown บริษัทของ `ReportPMPage`), `GET /contracts`, `GET /licenses`, `GET /presence/online` — นอกขอบเขต services ที่ระบุให้อ่านในงานนี้ (`dashboard.ts`, `dashboardData.ts`, `pmProcurement.ts`), และไม่ใช่ endpoint dashboard/report โดยตรง
- **ไม่ได้ตรวจ**: component `frontend/src/components/CompanyAssetMatrix.tsx` (ใช้ใน `ReportAssetsPage`) และ `DonutChart.tsx` เนื้อหาการ render โดยละเอียด — ระบุแค่ input/output คร่าวๆ จากจุดที่ถูกเรียกใช้
- **ไม่ได้ตรวจ**: error-handling/fallback UI เมื่อ backend คืน `null` จาก `settle()` ใน `dashboardOverview()` (เช่น `d.modules`, `d.categories` เป็น `null`) — เห็นเฉพาะว่า frontend เซ็ต state เป็นค่านั้นตรงๆ (`DashboardPage.tsx:67-82`) ไม่ได้ตรวจว่าแต่ละ component ที่รับ prop เหล่านี้ (เช่น `CategoryUtilizationCard` รับ `categories=[]` เป็น default) จะพังหรือไม่ถ้าได้ `null` ตรงๆ
- **ไม่ได้ตรวจ**: `Layout.tsx` เต็มไฟล์ (อ้างถึงแค่บรรทัดที่เรียก `dashboardAPI.pmSummary()` สำหรับ badge จำนวน PM ค้างในเมนู) และ `admin/settings/AuditLogTab.tsx` เต็มไฟล์ (อ้างถึงแค่บรรทัดที่เรียก `dashboardAPI.recentActivity()`) — ทั้งสองไฟล์อยู่นอกขอบเขตโมดูล Dashboard/Reports โดยตรง
- **ไม่ได้ตรวจ**: `assetSummary()` field `totalPurchaseCost` ถูกใช้แสดงผลที่หน้าใดบ้างนอกจาก backend response — grep ไม่พบการอ้างอิง `totalPurchaseCost` ในฝั่ง frontend dashboard/reports ที่อ่านมาทั้งหมด (อาจเป็นอีก field ที่ backend คำนวณไว้แต่ไม่มี UI ใช้ เหมือนกรณี `moduleStatus`)
