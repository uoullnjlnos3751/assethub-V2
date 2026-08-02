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
1. ✅ ปรับ `nav.tsx` ใหม่ตาม lifecycle: ภาพรวม → ทรัพย์สิน → คลัง → ยืม-คืน → ซ่อมบำรุง/PM → จำหน่ายออก (บริจาค) → รายงาน → ตั้งค่า
2. ✅ ย้าย section label เข้า data (เลิก hack `getSectionLabel` ใน Sidebar)
3. ✅ ยุบเมนูซ้ำ, ย้าย นำเข้า/ส่งออก + พิมพ์ QR มาไว้กลุ่มทรัพย์สิน
4. ✅ ลบไฟล์ขยะ (C4) — `AssetDetailPage.tsx.recovered`, `layouts/components/Sidebar.tsx` ลบแล้ว, `api.test.ts` ย้ายไป `src/app.test.ts` (2026-08-01)

### Phase 2 — ความถูกต้องข้อมูล ITAM (schema เพิ่มแบบ additive, มี migration)
1. ✅ `Asset.assignedToUserId` FK → AppUser (เก็บ `ownerName` ไว้เป็น fallback) + backfill จับคู่ชื่อแบบ exact-match เท่านั้น (18/753 จับคู่ได้ — ที่เหลือไม่มีบัญชี AppUser ในระบบ) + auto-resolve ทุกครั้งที่สร้าง/แก้ไข ownerName (2026-08-01)
2. ✅ ตาราง `AssetDisposal` + หน้า UI `/disposals` (บันทึกจำหน่าย: บริจาค/ขาย/ทำลาย/คืน vendor/โอนย้าย) — อยู่คู่กับ donation flow เดิม ยังไม่ได้ย้ายของเดิมมาเป็น disposal ประเภทหนึ่งตามแผนเต็มรูปแบบ
3. ✅ ฟิลด์ค่าเสื่อม: `usefulLifeYears`, `salvageValue` (มีใน schema) — ❌ ยังไม่มีการคำนวณ book value แสดงในรายงาน/dashboard
4. ✅ ตาราง `AssetLink` + backend route `/api/asset-links` (ที่ยังไม่มีมาก่อน) + panel UI ในแท็บ "อุปกรณ์ที่เชื่อมโยง" ของ AssetDetailPage — heuristic ชื่อเจ้าของเดิมยังคงอยู่คู่กันเป็นข้อมูลเสริม

### Phase 3 — License & Contract (โมดูลใหม่)
1. ✅ `SoftwareLicense` + `LicenseAssignment`
2. ✅ `Contract` + `ContractAsset` — แก้ bug ที่พบระหว่างตรวจสอบ: `ContractAsset` ไม่มี relation ไปยัง `Asset` ใน schema (มีแค่ FK column) ทำให้ route include ไม่ผ่าน type-check (2026-08-01)
3. ✅ หน้า UI + การ์ดบน dashboard

### Phase 4 — UI/UX ยกเครื่อง
1. ❌ ยังไม่ทำ — มาตรฐาน MUI เดียว/รวม icon ชุดเดียว, refactor หน้า inline-style (PMRun family) ยังเป็น scope ใหญ่ที่ต้องออกแบบก่อนแตะ
2. ✅ Header global search: dropdown แนะนำผลแบบ autocomplete (ค้น assetCode/serial/ชื่อ/ผู้ถือครอง, debounce 300ms, คลิกไปหน้า detail หรือดูผลทั้งหมด) — ทดสอบผ่าน browser จริงแล้ว (2026-08-01)
3. ✅ Dashboard มุมผู้บริหาร (contract/license summary) — ทำไปแล้วในรอบก่อน
4. ✅ เพิ่ม role `VIEWER` ครบ: schema enum + migration + backend authorize() (dashboard/reports/contracts/licenses แบบ read-only) + frontend routes/nav filter/Users page role picker (2026-08-01)

### Phase 5 — โครงสร้างระยะยาว
1. ❌ ยังไม่ทำ — รวม UX ของ PM 2 ระบบ
2. ❌ ยังไม่ทำ — แตกไฟล์ใหญ่ (AssetDetailPage 1,637 บรรทัด, AssetListPage 1,206, DashboardPage 928)
3. ❌ ยังไม่ทำ — ผูก FK master data (department/vendor/location) แบบ dual-write

## หมายเหตุจากรอบตรวจสอบ 2026-08-01
- **สำคัญ:** พบว่า commit ทั้งหมดตั้งแต่ 27 ก.ค. (รวมถึง cookie-based auth migration, security headers, ITAM lifecycle รอบนี้) **ยังไม่ได้ deploy ขึ้น production เลย** — image ของ `assethub-blue-backend`/`frontend` build ไว้ตั้งแต่ 27 ก.ค. ต้อง build+deploy ใหม่ทั้งหมดถึงจะได้โค้ดปัจจุบันจริง
- **สำคัญ:** พบ stack คู่ขนานที่ไม่ได้ตั้งใจ — pm2 (`assethub-api`/`assethub-web` พอร์ต 4000/5173) รันจากซอร์สโค้ดเดียวกันแต่ต่อฐานข้อมูล PostgreSQL คนละตัว (native Windows service พอร์ต 5432, ข้อมูลเก่ากว่า docker DB ~10 วัน และหยุด sync ตั้งแต่ 21 ก.ค.) โค้ดที่รันอยู่เก่ากว่า docker เสียอีก (ไม่มี cookie auth) ควรตัดสินใจว่าจะปิด stack นี้หรือใช้งานอะไรต่อ
- Migration `20260731000000_itam_lifecycle_phase2_3` ถูก apply เข้า production DB จริงแล้วในรอบนี้ (ก่อนหน้านี้มีแค่ไฟล์ migration ในโค้ด แต่ไม่เคยรันจริง)

## หมายเหตุความเสี่ยง
- Phase 2-3 มี migration — DB user production สร้าง shadow DB ไม่ได้ ต้องใช้วิธีเขียน SQL เอง + `prisma migrate resolve --applied` เหมือนรอบ FloorPlan
- ทุก phase ออกแบบให้ additive (ไม่ลบของเดิม) — rollback ง่าย
- Sandbox build/test ไม่ได้ ต้อง build จริงบนเครื่องผู้ดูแลก่อน deploy ทุกรอบ
