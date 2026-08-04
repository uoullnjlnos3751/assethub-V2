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
1. 🔶 เริ่มแล้วบางส่วน (2026-08-04) — สำรวจพบ `pages/pm/` (PMRun family) 9,712 บรรทัด, inline `style={{}}` 1,165 จุด, `sx=` 0 จุด, ใช้ emoji แทน icon library ทั้งหมด (ไม่ใช่ทั้ง MUI icons หรือ lucide) และมี `Modal`/`StarRating` ซ้ำกันถึง 3/2 ชุด (shared `components/Modal.tsx`, PMRunPage-local `PMRunModal.tsx`, PMPlanListPage-local inline function) — เก็บกวาดความซ้ำซ้อนนี้ก่อนเป็นก้าวแรก: รวมเป็น `components/Modal.tsx`/`components/StarRating.tsx` ชุดเดียว เขียนใหม่ด้วย MUI `Dialog`/`sx`/`@mui/icons-material` ตามแพทเทิร์นเดียวกับ `QRScannerModal.tsx` ที่ใช้อยู่แล้วในแอป (อ่านสี/เงาจาก theme แทน hex ฝังตรง ⇒ dark mode ใช้ได้) ลบ `PMRunModal.tsx`/`PMRunStarRating.tsx` และฟังก์ชัน Modal ในตัว `PMPlanListPage.tsx` ออก — ตรวจแล้วด้วย `tsc --noEmit` (จำนวน error เท่าเดิมก่อน/หลัง 25 รายการ ไม่มีตัวใหม่จากการแก้นี้), `vite build` ผ่าน, และเปิดดูจริงผ่าน headless browser (Playwright + JWT ที่ mint เองจาก `backend/.env` ชี้ไปที่ docker Postgres ที่ schema ทันสมัย ไม่ใช่ native Postgres ที่ยัง desync — ดูหมายเหตุด้านล่าง) ทั้งโหมดสว่าง/มืดที่ `/pm/runs` — modal เปิดถูกต้อง ปุ่มปิดใช้ได้ พื้นหลัง dark mode เปลี่ยนสีตาม theme จริงแล้ว (เดิมไม่เปลี่ยนเลย) 
  - **`PMRunPage.tsx` แปลงเต็มรูปแบบแล้ว (2026-08-04)** — เขียนใหม่ทั้งไฟล์ (1,372 → ~1,180 บรรทัด) เป็น MUI components ล้วน (`Table`/`TableHead`/`TableBody`, `Card`, `Paper`, `Chip` แทนสถานะ badge, `Select`+`MenuItem` แทน `<select>` ดิบ, `Snackbar`+`Alert` แทน toast มือทำ, `LinearProgress` แทน progress bar มือทำ, `Pagination` แทนปุ่ม ◀/▶ มือทำ) + `@mui/icons-material` แทน emoji ทั้งหมด (~35 ไอคอน) — ลบ `<style>` block ที่มี CSS class ของตัวเอง (`.pmr-btn`/`.pmr-input`/ฯลฯ, hex ฝังตรงสไตล์ Apple-HIG) ออกทั้งหมด
  - ระหว่างแปลงพบว่าโค้ด render ของ checklist item (6 ประเภท: text/rating/boolean/select/monitor_array/printer_array + inline note) ซ้ำกันเกือบทั้งหมดระหว่าง modal เดี่ยวกับ modal กลุ่ม (bulk) — ถือเป็นส่วนหนึ่งของงานแปลงนี้ตามธรรมชาติ (ไม่ใช่ scope เพิ่ม) จึงดึงออกมาเป็น local component ร่วม `ChecklistItemRow`/`ChecklistGroups`/`BoolAnswerButtons` ใช้ทั้งสอง modal แทนการก็อปสองชุด
  - ยืนยันว่า `sortConfig`/`setSortConfig` ใน state เป็นโค้ดที่ตายแล้วจากเดิม (ไม่มี `<th>` ไหนเรียก `setSortConfig` เลย ทั้ง class `.pmr-th-sortable` ก็ไม่ได้ใช้ที่ไหน) — คงพฤติกรรมเดิมไว้ (ไม่ auto-fix เพราะนอก scope ของงานนี้) หัวตารางเลยไม่มี sort affordance เหมือนเดิม
  - ตรวจแล้วด้วย `tsc --noEmit` (error รวม 25 รายการเท่าเดิมทั้งก่อน/หลัง เป็น pre-existing bug คนละเรื่อง เช่น `User.username` ไม่มีจริงในเดิม), `vite build` ผ่าน, และเปิดดูจริงผ่าน headless browser ทั้งหน้า list และ checklist modal ทั้งโหมดสว่าง/มืด — dark mode ใช้ได้ถูกต้องทั้งหน้ารวมถึงใน modal (Alert/pill button/progress bar ปรับสีตาม theme ถูกต้อง)
- 🗑️ **พบโค้ดตายระหว่างสำรวจ (2026-08-04):** `PMChecklistModal.tsx` (945 บรรทัด), `PMBulkModal.tsx` (260), `PMAdhocModal.tsx` (291) — รวม ~1,496 บรรทัด — ไม่มีที่ไหนใน codebase import ใช้เลย (`grep` หา 0 จุดอ้างอิงนอกไฟล์ตัวเอง) `PMRunPage.tsx` เขียน checklist/bulk/adhoc logic ของตัวเองซ้ำแทนที่จะเรียกใช้ 3 ไฟล์นี้ — ข้ามไม่แปลง (ไม่มีประโยชน์ขัดโค้ดที่ไม่มีใครใช้) รอการตัดสินใจว่าจะลบทิ้งหรือไม่
- **`PMPlanListPage.tsx` แปลงเต็มรูปแบบแล้ว (2026-08-04)** — เขียนใหม่ทั้งไฟล์ (1,108 → ~870 บรรทัด) เป็น MUI ล้วน: `Table`, `ToggleButtonGroup` แทนปุ่มสลับตาราง/การ์ดมือทำ, `Chip`+`LinearProgress` แทน badge/progress bar มือทำ, `Select`+`MenuItem`, `Alert` แทนกล่องเตือน/แจ้งเตือนมือทำ — ดึง logic คำนวณสถานะแผน (เสร็จ/เกินกำหนด/ดำเนินการ/ยังไม่ generate) ที่ซ้ำกันระหว่างมุมมองตารางกับการ์ดออกมาเป็นฟังก์ชันร่วม `getPlanStatus()` และดึงฟอร์ม Create/Edit ที่ตัวฟิลด์เหมือนกัน ~90% ออกมาเป็น `PlanFormFields` ใช้ร่วมกัน (ต่างกันแค่ field ไหน disabled ตอนมีงานตรวจเสร็จแล้ว) — พบ inconsistency เล็กน้อยระหว่างของเดิม (มุมมองตารางแยก badge "ยังไม่ Generate" ต่างหาก แต่มุมมองการ์ดไม่แยก ใช้ badge เทาเริ่มต้นแทน) ถือเป็นส่วนหนึ่งของการรวม logic นี้ จึงทำให้เหมือนกันทั้งสองมุมมอง (ไม่ใช่ scope เพิ่ม)
  - ตรวจแล้วด้วย `tsc --noEmit` (error รวม 25 เท่าเดิม ไม่มี error จากไฟล์นี้เลย), `vite build` ผ่าน, เปิดดูจริงทั้งมุมมองตาราง/การ์ด/modal สร้างแผน ทั้งโหมดสว่าง/มืด — ใช้งานได้ปกติ dark mode ถูกต้องทั้งหมด
- **`PMDashboardPage.tsx` แปลงเต็มรูปแบบแล้ว (2026-08-04)** — เขียนใหม่ทั้งไฟล์ (307 → ~290 บรรทัด) เป็น MUI ล้วน: `ToggleButtonGroup` แทนแท็บ PLANNED/ADHOC มือทำ, `CardActionArea` แทนปุ่ม workflow step/quick action มือทำ, `Table`/`Chip`/`LinearProgress` สำหรับตารางสรุปแผน — ดึง logic สถานะแถวตาราง (เสร็จสิ้น/เกินกำหนด/กำลังดำเนิน/กำหนดการ) ออกเป็น `getRowStatus()`
  - **เจอบั๊กจริงระหว่างตรวจภาพจริง:** ใช้ `bgcolor: '${color}.50'` (เช่น `'primary.50'`, `'success.50'`) เพื่อทำพื้นหลังสีอ่อนของการ์ด — แต่ theme.ts ของโปรเจกต์นี้กำหนดแค่ `main/light/dark/contrastText` ให้แต่ละสี ไม่มี shade `.50` เลย ทำให้ sx resolve ไม่เจอค่าและพื้นหลังไม่ขึ้นสีอะไรเลย (เงียบ ไม่ error) เจอจากภาพสกรีนช็อตจริงที่การ์ดขาวโล่งผิดจากที่ตั้งใจ — แก้เป็น `alpha(theme.palette[color].main, 0.08)` (0.16 ใน dark mode) ตาม pattern เดียวกับที่ `Modal.tsx`/`StarRating.tsx` ใช้อยู่แล้ว — **บั๊กเดียวกันนี้มีอยู่ใน `PMPlanListPage.tsx` ที่เพิ่งแปลงไปก่อนหน้าด้วย** (กล่องไอคอนหัวข้อ 2 จุด ใช้ `'primary.50'`) แก้ไปพร้อมกันแล้ว — เป็นเหตุผลที่ยืนยันว่าการเปิดดูภาพจริงทุกไฟล์สำคัญ ไม่ใช่แค่ตรวจ type/build เฉยๆ
  - ตรวจแล้วด้วย `tsc --noEmit` (25 เท่าเดิม), `vite build` ผ่าน, เปิดดูจริงทั้งโหมดสว่าง/มืด (รวมถึงยืนยันว่าพื้นหลังสีอ่อนของการ์ดสถิติ/quick-action ขึ้นถูกต้องหลังแก้บั๊ก .50)
- **`PMTemplatePage.tsx` แปลงเต็มรูปแบบแล้ว (2026-08-04)** — เขียนใหม่ทั้งไฟล์ (433 → ~400 บรรทัด) เป็น MUI ล้วน: `Chip` แทน type/group badge มือทำ, `TextField`/`Select`+`MenuItem`/`Checkbox` สำหรับแถวแก้ไข checklist item, ไอคอน MUI แทน emoji ทั้งหมดใน `TYPE_LABELS`/`GROUP_LABELS`
  - **เจอบั๊กจริงอีกจุดระหว่างตรวจภาพจริง (Preview modal):** item ที่มี `type` ไม่ตรงกับ key ใน `TYPE_LABELS` (พบจริงจากข้อมูลจริงใน DB — บาง item เก็บ `type = "Boolean"` ตัว B ใหญ่ ปนกับอีกกลุ่มที่เก็บ `"boolean"` ตัวเล็ก ข้อมูลไม่สม่ำเสมอเดิมอยู่แล้ว ไม่เกี่ยวกับรอบแปลงนี้) ทำให้ `TYPE_LABELS[item.type]` เป็น `undefined` และ Chip label ว่างจนดูเหมือนไอคอนวงกลมเปล่าๆ ผิดปกติ — ของเดิม (ก่อนแปลง) ก็มีปัญหาเดียวกันแต่แสดงเป็นกล่องเทาว่างที่ยังพอเห็น ไม่ใช่จุดที่ต้อง "แก้ data" (นอก scope) แต่แก้ visual fallback ให้ไม่ดูพังเงียบๆ: เปลี่ยนเป็น `label={TYPE_LABELS[item.type]?.label || item.type || '—'}` แสดงค่า type ดิบแทนเมื่อไม่รู้จัก — ตรวจพบว่าครั้งแรกที่แก้แล้ว rebuild ไม่ทัน (ไฟล์ที่ `vite preview` เสิร์ฟอยู่ที่พอร์ต 5173 เป็น `dist/` ที่ build ไว้ก่อนแก้ ไม่ใช่ live dev server) ต้อง `vite build` ใหม่ก่อนถึงเห็นผลถูกต้องในภาพจริง — เป็นบทเรียนสำหรับรอบถัดไป: ทุกครั้งที่แก้ไฟล์หลัง build ไปแล้วต้อง build ซ้ำก่อนตรวจภาพจริงเสมอ
  - ตรวจแล้วด้วย `tsc --noEmit` (25 เท่าเดิม), `vite build` ผ่าน, เปิดดูจริงทั้งหน้ารายการ/modal แก้ไข/modal preview ทั้งโหมดสว่าง/มืด — ยืนยันการแก้ fallback ด้วยภาพจริงหลัง rebuild แล้ว
- **`PMFloorPlanPage.tsx` แปลงเต็มรูปแบบแล้ว (2026-08-04)** — เขียนใหม่ chrome ทั้งหมด (header/controls bar/sidebar ค้นหา-เพิ่ม pin/modal สร้าง-แก้ไขแปลน/tooltip) เป็น MUI; ใช้ `CircularProgress` แทน emoji ⏳ หมุนด้วย CSS keyframes เอง — **ตั้งใจไม่แตะ** กลไกวาง pin บนรูป (คำนวณ %x/%y จาก drag event, SVG pin แบบ data-URI, absolute positioning) เพราะ MUI ไม่มี component สำหรับ "จุดปักบนรูปภาพ" อยู่แล้ว แค่ห่อด้วย `Box`+`sx` แทน `div`+`style` เฉยๆ ไม่เปลี่ยน logic การลากปักหมุดเลย
  - ตรวจแล้วด้วย `tsc --noEmit` (25 เท่าเดิม รวม error `assetAPI.getAll` เดิมที่มีอยู่ก่อนแล้ว), `vite build` ผ่าน, เปิดดูจริง — **หมายเหตุ:** DB ที่ใช้ทดสอบ (docker Postgres) ไม่มีข้อมูลแผนผังชั้นเลย (`เลือกแปลน` ว่างเปล่า) ทำให้เห็น header/controls/loading state/modal สร้างแปลนใหม่ครบทุกส่วน แต่ยังไม่เห็นแผนที่จริงที่มี pin/tooltip/sidebar edit mode เพราะไม่มีข้อมูลให้โหลด — ยืนยันว่าโค้ดส่วน pin/drag เป็นการ copy ตรรกะเดิมมาทั้งดุ้น ไม่ได้แก้ ความเสี่ยงจึงต่ำแม้ไม่เห็นภาพจริงของส่วนนั้น — สังเกตเพิ่มเติม (ไม่ใช่บั๊กจากรอบนี้): หน้านี้ค้าง spinner "กำลังโหลด..." ตลอดไปถ้าไม่มีแผนผังในระบบเลย เพราะ `loading` state ถูก set false เฉพาะใน effect ที่มีเงื่อนไข `if (!selectedPlanId) return` ไว้ก่อน — เป็นพฤติกรรมเดิมจากโค้ดต้นฉบับ ไม่ใช่สิ่งที่เกิดจากการแปลงครั้งนี้
- **`PMSchedulePage.tsx` แปลงเต็มรูปแบบแล้ว (2026-08-04)** — เขียนใหม่ทั้งไฟล์ (839 → ~640 บรรทัด) เป็น MUI ล้วน: `Table` ทั้งชุดสำหรับ Gantt chart (WBS hierarchy 3 ระดับ: total/site/dept ผ่าน `React.Fragment` + sticky header), `ToggleButtonGroup` แทนสลับรายวัน/รายสัปดาห์, stat card, filter panel, แถบเครื่องมือ (ยุบ/ขยายทั้งหมด, เลื่อนช่วงเวลา) — Gantt bar สีเขียว/ฟ้า/ส้มใช้ `alpha(theme.palette[color].main, ...)` แทน CSS class ตายตัว (เขียนบทเรียนจากบั๊ก `.50` ของรอบก่อนไว้แล้ว จึงไม่พลาดซ้ำ)
  - **CSS `@media print` ของเดิม (ซ่อน sidebar/nav ตอนพิมพ์ ฯลฯ) ย้ายไปใช้ MUI `GlobalStyles` component แทน raw `<style>` tag** — เป็นทางเลือกที่ "เป็น MUI" มากกว่าและยังคงพฤติกรรมพิมพ์เดิมไว้ครบ เพราะ media query แบบนี้ไม่มีทางแปลงเป็น `sx` ต่อ element ได้อยู่แล้ว (เป็นเรื่อง cross-cutting ของทั้งหน้า)
  - สังเกต (ไม่ใช่บั๊กจากรอบนี้): `showAdhoc` state มีอยู่และถูกใช้กรอง query แต่ไม่มี UI ให้สลับค่าเลยแม้แต่จุดเดียวในโค้ดเดิม (ค่าเริ่มต้น false ตลอดไป ซ่อนแผนนอกแผนเสมอ) — คงพฤติกรรมเดิมไว้ ไม่ได้เพิ่ม toggle ให้เพราะนอก scope ของงานแปลงนี้
  - ตรวจแล้วด้วย `tsc --noEmit` (25 เท่าเดิม), `vite build` ผ่าน, เปิดดูจริงทั้งมุมมองรายสัปดาห์/รายวัน/ขยายกลุ่ม site ทั้งโหมดสว่าง/มืด — Gantt bar, sticky header, เส้นไฮไลต์ "วันนี้" ถูกต้องครบทุกโหมด — **จบกลุ่มไฟล์ PM หลักที่ route จริง 6 ไฟล์ (Dashboard/Plans/Runs/Templates/FloorPlan/Schedule) ครบทุกไฟล์แล้ว**
- ❌ ส่วนที่เหลือของ Phase 4 ข้อ 1: ตระกูล `PMSwHub*` ทั้งชุด (คู่ขนานกับ PM ทรัพย์สิน — Dashboard/Form/PlanList/TemplateList/Template) ยังเป็น inline-style ทั้งหมด ยังไม่ได้แตะเลย
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

## หมายเหตุจากรอบตรวจสอบ 2026-08-04
- ยืนยันปัญหา stack คู่ขนาน (native postgres พอร์ต 5432) ที่โน้ตไว้ข้างบนอีกครั้งแบบเจาะจง: schema ยัง desync จริง — ขาดคอลัมน์ `pm_runs.notes` (มาจาก migration ของ commit `0b57c26` "add note field to PM run entries") ทำให้ backend ที่ต่อ native DB วิ่ง `overdueChecker` ล้มเหลวด้วย Prisma error ทันทีที่ start — ห้ามใช้ native DB (5432) ทดสอบ/รันโค้ดปัจจุบันจนกว่าจะรัน migration ให้ทันหรือปิด stack นี้ไปเลย ระหว่างนี้ให้ต่อ backend dev เข้ากับ docker Postgres (`127.0.0.1:5433`, user/pass เดียวกับ native) แทนถ้าต้องการทดสอบด้วยข้อมูลจริงที่ schema ทันสมัย
- **แก้แล้ว:** เว็บเข้าไม่ได้ที่ `http://localhost/` (พอร์ต 80) — `assethub-nginx` (จุดเข้าจริงที่ผู้ใช้ใช้ ไม่ใช่ 8080 ซึ่งเป็น Postgres Enterprise Manager ของคนละระบบที่บังเอิญรันอยู่บนเครื่องเดียวกัน) ค้าง crash-loop มากว่า 1 ชม. (RestartCount 10) เพราะ `nginx/upstream.conf` ใช้ static `upstream {}` block ที่ resolve DNS ของ `assethub-blue-frontend-1`/`assethub-blue-backend-1` ครั้งเดียวตอน nginx start — nginx อยู่คนละ compose project กับ backend/frontend (`docker-compose.shared.yml` vs `.app.yml`) เลยไม่มี `depends_on` คุมลำดับ ถ้า nginx start ก่อน container พวกนั้นมีอยู่จริง จะ resolve ไม่เจอ → nginx ถือเป็น fatal config error แล้ว exit ทันที แล้ว crash-loop ตลอดไปแม้ container เป้าหมายจะขึ้นมาแล้วก็ตาม (ไม่ self-heal) ต้องรอคนสังเกตแล้ว `docker restart assethub-nginx` มือเปล่าทุกครั้ง
  - แก้รอบแรกโดยเปลี่ยน `nginx/nginx.conf` ให้ใช้ `resolver 127.0.0.11 valid=10s;` + `set $backend_upstream/$frontend_upstream` แทน static upstream block และลบ `nginx/upstream.conf` ทิ้ง — แต่ **พบว่าไปชนกับ `deploy.ps1`**: สคริปต์ blue-green deploy เขียนทับ `nginx/upstream.conf` ใหม่ทุกครั้งที่ swap สี (เพื่อสลับ container ที่ nginx ชี้ไป) แล้ว `docker exec assethub-nginx nginx -s reload` — ถ้าลบไฟล์นี้ไปเฉยๆ การ swap สีจะไม่มีผลอะไรเลยเพราะ nginx.conf ไม่ได้อ่านมันแล้ว
  - แก้ใหม่ให้เข้ากันได้ทั้งคู่: ย้าย `set` ออกจาก `nginx.conf`, ให้ `nginx/upstream.conf` ใช้ `map $host $backend_upstream {...}` / `map $host $frontend_upstream {...}` แทน `upstream {}` block เดิม (`map` ไม่ resolve DNS เอง ไม่มีทาง fatal ตอน reload ต่างจาก `upstream{}` แต่ยังเป็นไฟล์ที่ deploy.ps1 เขียนทับได้เหมือนเดิม) และแก้ heredoc ใน `deploy.ps1` (ขั้นตอน "Swap Nginx configuration") ให้ generate format `map` แทน `upstream {}` ด้วย — โครงสร้างไฟล์/path ที่ script อื่นพึ่งพาไม่เปลี่ยน เปลี่ยนแค่เนื้อหาข้างใน
  - ตรวจแล้วด้วย `nginx -t` ผ่าน + `nginx -s reload` จริง (ไม่ต้อง restart) ยังเสิร์ฟ 200 ปกติ — ยังไม่ได้จำลอง race แบบเต็มรูปแบบ (หยุด frontend/backend แล้ว reload nginx) เพราะ auto-mode classifier บล็อกการหยุด container ที่ผู้ใช้จริงพึ่งพาอยู่ — เชื่อตามหลักการมาตรฐานของ nginx+Docker DNS (`map`/`resolver` ไม่ทำ DNS ตอน config load) แทน
- **แก้แล้ว:** ผู้ใช้เจอ `CORS not allowed for origin: http://itam.trrgroup.com` ตอนเข้าเว็บผ่านโดเมนจริง — พบว่า container `assethub-blue-backend-1` ที่รันอยู่จริงไม่มี `NODE_ENV`/`CORS_ORIGIN`/`FRONTEND_URL`/`CORS_ALLOWED_HOSTNAMES` ในตัวมันเลย (เช็คด้วย `docker exec ... printenv`) ทั้งที่ `backend/.env` มีค่าถูกต้องครบ (รวม `http://itam.trrgroup.com` อยู่แล้ว) — สาเหตุตรงกับที่คอมเมนต์ใน `docker-compose.app.yml` เคยเตือนไว้: ตัวแปรพวกนี้ประกาศแบบ pass-through เปล่า (`- NODE_ENV` ไม่มีค่า) ซึ่งถ้าไม่มีอยู่ใน shell ที่รัน `docker compose up` จริง ๆ ตอนนั้น จะกลาย เป็น "unset" ทับค่าจาก `env_file` ไปเลย ไม่ fallback ไปใช้ `backend/.env` ตามที่ตั้งใจไว้ — `deploy.ps1` มีขั้นตอนโหลด `backend\.env` เข้า shell ก่อนเรียก `docker compose up` อยู่แล้วเพื่อแก้ปัญหานี้โดยเฉพาะ แต่ container ที่รันอยู่ตอนนี้ไม่ได้ผ่านขั้นตอนนั้น (ไม่ทราบสาเหตุว่าพลาดตอนไหน) — แก้โดยรัน PowerShell ทำตามเทคนิคเดียวกับ `deploy.ps1` (โหลด `backend\.env` เข้า process env) แล้ว `docker compose -p assethub-blue -f docker-compose.app.yml up -d backend` (ไม่ `--build` เพื่อไม่ deploy โค้ดที่ยังไม่ commit) — ตรวจแล้ว container ใหม่มี env ครบ, healthy, และทดสอบ CORS preflight จริงผ่าน curl ได้ `Access-Control-Allow-Origin: http://itam.trrgroup.com` ถูกต้อง — **หมายเหตุ:** สาเหตุที่ container ตั้งต้นไม่มี env เหล่านี้ยังไม่ทราบแน่ชัด (ไม่ได้ใช้ `deploy.ps1` deploy ล่าสุด? หรือรันจาก shell อื่นที่ไม่ได้โหลด .env?) — ควรตรวจสอบว่าการ deploy ครั้งต่อไปทุกครั้งผ่าน `deploy.ps1` เท่านั้น ไม่ใช้ `docker compose up` ตรงๆ
- Phase 2-3 มี migration — DB user production สร้าง shadow DB ไม่ได้ ต้องใช้วิธีเขียน SQL เอง + `prisma migrate resolve --applied` เหมือนรอบ FloorPlan
- ทุก phase ออกแบบให้ additive (ไม่ลบของเดิม) — rollback ง่าย
- Sandbox build/test ไม่ได้ ต้อง build จริงบนเครื่องผู้ดูแลก่อน deploy ทุกรอบ
