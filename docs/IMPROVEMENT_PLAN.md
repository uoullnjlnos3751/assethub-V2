# AssetHub V2 — แผนปรับปรุงตามหลัก ITAM + UI/UX

> จัดทำ 31 ก.ค. 2026 · อ้างอิงหลัก ITAM lifecycle (ISO 19770 / ITIL): จัดหา → ลงทะเบียน → มอบหมายใช้งาน → บำรุงรักษา → จำหน่ายออก

## สรุปผลตรวจ (Audit Findings)

### A. ช่องว่างด้าน ITAM (functionality)

| # | ประเด็น | ผลกระทบ |
|---|---------|----------|
| A1 | `ownerName` เป็น free-text ไม่ผูก FK กับ AppUser | รายงาน clearance เปราะบาง, "อุปกรณ์เชื่อมโยง" ใช้การเทียบชื่อตรงตัว พลาดง่ายเมื่อสะกดต่าง |
| A2 | ไม่มีค่าเสื่อมราคา (depreciation) | มี `purchasePrice` แต่ไม่มีอายุการใช้งาน/มูลค่าคงเหลือ — ผู้บริหารไม่เห็นมูลค่าทรัพย์สินจริง |
| A3 | ไม่มีระบบจัดการ License ซอฟต์แวร์ | `windowsLicense`/`officeLicense` เป็นแค่ string ต่อเครื่อง ไม่มี pool/จำนวนสิทธิ์/วันหมดอายุ |
| A4 | ไม่มีระบบสัญญา (Contract/Warranty) | มีแค่ `warrantyEndDate` ต่อเครื่อง ไม่มีสัญญา MA/เช่า + แจ้งเตือนหมดอายุ |
| A5 | Lifecycle ไม่ครบวงจร | ไม่มีขั้นจัดหา (procurement) และการจำหน่ายออกมีแค่ "บริจาค" — ไม่มีขายซาก/ทำลาย/e-waste พร้อมหลักฐาน |
| A6 | ไม่มี CMDB relationship จริง | ไม่มี parent-child (จอ↔คอม, dock↔โน้ตบุ๊ก) |
| A7 | คอลัมน์คอมพิวเตอร์ซ้ำซ้อนบน `Asset` กับ `ComputerDetail` | ข้อมูล 2 ที่ เสี่ยงไม่ตรงกัน |
| A8 | Master data ไม่ผูก FK: `departmentId`/`company`/`vendor`/`location` เป็น string | rename แล้วข้อมูลเก่าหลุด, `AssetStatusMaster` ซ้ำกับ enum โดยไม่ได้ใช้จริง |

### B. ปัญหา UI/UX

| # | ประเด็น | ผลกระทบ |
|---|---------|----------|
| B1 | 2 ภาษาดีไซน์: หน้า MUI theme กับหน้า inline-style (PMRun ฯลฯ) + icon 2 ชุด (MUI icons / lucide) | ดูไม่เป็นระบบเดียวกัน, dark mode ใช้ไม่ได้กับหน้า inline-style |
| B2 | Sidebar: เมนูลึก/ซ้ำซ้อน — "ของพร้อมยืม" โผล่ 2 ที่, master data กระจาย 2 ที่, PM กลุ่มเดียว 11 รายการ, section label ใช้ hack mapping ใน Sidebar.tsx | หาเมนูยาก โดยเฉพาะผู้ใช้ทั่วไป |
| B3 | บริจาค (donation = จำหน่ายออก) ไปอยู่ใต้ "ทะเบียนทรัพย์สิน" | ผิดหมวดตามหลัก lifecycle |
| B4 | ~~ไม่มี global search / QR~~ ตรวจแล้วมีอยู่ใน header ครบ — ปรับเป็น: search ค้นได้แค่ redirect ไป /assets?search= ยังไม่ suggest ผลแบบ dropdown | ใช้งานได้แต่ยังไม่ลื่น |
| B5 | ผู้บริหารไม่มีมุมมองของตัวเอง — รายงานทั้งหมดล็อก IT_ADMIN+, role มีแค่ 3 ระดับ | ผู้บริหารต้องขอสิทธิ์ admin เกินจำเป็น |

### C. โครงสร้าง/ความเร็ว

| # | ประเด็น |
|---|---------|
| C1 | PM 2 ระบบขนาน (PM ทรัพย์สิน / PM SwHub) — โค้ดคล้ายกันคนละชุด |
| C2 | หน้า master data ซ้ำ: DeviceTypes/Locations/Vendors/Statuses แยกหน้า + MasterDataManagementPage รวมอีกที่ |
| C3 | ไฟล์ใหญ่ที่ยังเหลือ: AssetDetailPage, AssetListPage, DashboardPage |
| C4 | ไฟล์ขยะ/dead code: `AssetDetailPage.tsx.recovered`, `layouts/components/Sidebar.tsx` (ไม่มีใคร import — Layout วาด drawer เองซ้ำอีกชุด), `api.test.ts` วางใน routes/ |

## แผนดำเนินการ (เรียงตามลำดับ ความเสี่ยงต่ำ→สูง / คุ้มก่อน)

### Phase 1 — จัดระเบียบเมนู + เก็บกวาด (ทำทันที, ไม่แตะ DB)
1. ปรับ `nav.tsx` ใหม่ตาม lifecycle: ภาพรวม → ทรัพย์สิน → คลัง → ยืม-คืน → ซ่อมบำรุง/PM → จำหน่ายออก (บริจาค) → รายงาน → ตั้งค่า
2. ย้าย section label เข้า data (เลิก hack `getSectionLabel` ใน Sidebar)
3. ยุบเมนูซ้ำ, ย้าย นำเข้า/ส่งออก + พิมพ์ QR มาไว้กลุ่มทรัพย์สิน
4. ลบไฟล์ขยะ (C4)

### Phase 2 — ความถูกต้องข้อมูล ITAM (schema เพิ่มแบบ additive, มี migration)
1. `Asset.assignedToUserId` FK → AppUser (เก็บ `ownerName` ไว้เป็น fallback) + backfill จับคู่ชื่อ
2. ตาราง `AssetDisposal` (วิธีจำหน่าย: บริจาค/ขาย/ทำลาย/คืน vendor, วันที่, ผู้อนุมัติ, มูลค่า, เอกสาร) — บริจาคเดิมกลายเป็น disposal ประเภทหนึ่ง
3. ฟิลด์ค่าเสื่อม: `usefulLifeYears`, `salvageValue` + คำนวณ book value ในรายงาน/dashboard
4. ตาราง `AssetLink` (parent-child) แทน heuristic ชื่อเจ้าของ

### Phase 3 — License & Contract (โมดูลใหม่)
1. `SoftwareLicense` (ชื่อ, ประเภท, จำนวนสิทธิ์, วันหมดอายุ, ราคา) + `LicenseAssignment` ผูกกับ asset/user
2. `Contract` (vendor, ประเภท MA/เช่า/ประกัน, วันเริ่ม-สิ้นสุด, มูลค่า, ทรัพย์สินที่ครอบคลุม) + แจ้งเตือนหมดอายุผ่าน notification เดิม
3. หน้า UI + รายงาน + การ์ดบน dashboard

### Phase 4 — UI/UX ยกเครื่อง
1. มาตรฐานเดียว: MUI theme + icon ชุดเดียว — ทยอย refactor หน้า inline-style (เริ่ม PMRun family)
2. Header: global search (ค้น asset code/serial/ชื่อ) + ปุ่มสแกน QR
3. Dashboard เพิ่มมุมผู้บริหาร: มูลค่ารวม/ค่าเสื่อม, warranty/contract ใกล้หมด, งบซ่อมสะสม
4. เพิ่ม role `VIEWER` (อ่านรายงาน/dashboard อย่างเดียว) สำหรับผู้บริหาร

### Phase 5 — โครงสร้างระยะยาว
1. รวม UX ของ PM 2 ระบบให้หน้าตา/flow เดียวกัน (ยังแยกข้อมูล)
2. แตกไฟล์ใหญ่ที่เหลือ (AssetDetailPage, AssetListPage, DashboardPage)
3. ค่อยๆ ผูก FK master data (department, vendor, location) แบบ dual-write ก่อนตัด string

## หมายเหตุความเสี่ยง
- Phase 2-3 มี migration — DB user production สร้าง shadow DB ไม่ได้ ต้องใช้วิธีเขียน SQL เอง + `prisma migrate resolve --applied` เหมือนรอบ FloorPlan
- ทุก phase ออกแบบให้ additive (ไม่ลบของเดิม) — rollback ง่าย
- Sandbox build/test ไม่ได้ ต้อง build จริงบนเครื่องผู้ดูแลก่อน deploy ทุกรอบ
