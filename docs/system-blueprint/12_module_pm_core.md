# MODULE: PM ทรัพย์สิน IT (Preventive Maintenance) — Core + GLPI + Agent Integration

> Confidence: **LEVEL 1 — VERIFIED** สำหรับ backend (`backend/src/routes/pm.ts` 1413 บรรทัด อ่านครบ, `services/glpi.ts`, `glpiSpec.ts`, `agentPmCheck.ts`, `agentMonitors.ts`, `externalAgent.ts` อ่านครบทุกไฟล์ — ผู้เขียนเอกสารนี้เป็นผู้พัฒนาการต่อข้อมูลจอจาก Agent เข้าหน้า PM ในเซสชันเดียวกัน) — Frontend อ่านละเอียดเฉพาะส่วนที่เกี่ยวกับ GLPI/Agent integration ใน `PMRunPage.tsx`, ส่วนอื่นของหน้า PM (Template/Plan/Schedule list UI) อ่านแบบสรุปโครงสร้างเท่านั้น ทำเครื่องหมายไว้ใน Unknown section

## Module Profile

| หัวข้อ | รายละเอียด |
|---|---|
| Module ID | MOD-PM-CORE |
| Purpose | วางแผนและบันทึกงานตรวจเช็คบำรุงรักษาเชิงป้องกัน (PM) ของทรัพย์สิน IT ประจำปี/รอบ พร้อมดึงข้อมูลสเปคจริงจากระบบภายนอก (GLPI, Agent) มาช่วยกรอกอัตโนมัติ |
| Business Objective | ให้แน่ใจว่าเครื่องทุกเครื่องได้รับการตรวจตามรอบ, ตรวจจับปัญหาเชิงรุก (แบตเสื่อม, ดิสก์เต็ม, ยังไม่ Activate) ก่อนเป็นเรื่องใหญ่, ลดงานกรอกข้อมูลซ้ำด้วยมือ |
| Users | IT_ADMIN, SUPERADMIN เท่านั้น (VIEWER เห็นได้เฉพาะ `/pm/coverage` ผ่าน API แต่ไม่มีเมนู) |
| Parent Menu | "PM ทรัพย์สิน" (adminNav section "งานซ่อมบำรุง") |
| Related Modules | Assets (auto-sync สเปคคอมพิวเตอร์, สร้าง Asset ใหม่จากจอ/ปริ้นเตอร์ที่เจอ), AssetLink (ผูก CMDB จอ/ปริ้นเตอร์เข้ากับเครื่องแม่), Maintenance (ถ้าตรวจแล้วพบปัญหา — ไม่ auto-link กัน ต้องสร้างเรื่องซ่อมแยก) |
| Dependencies | GLPI REST API (ภายนอก), External Asset-Monitoring Agent API (ภายนอก) |

## Page Inventory

| Page ID | ชื่อ | Route | Purpose |
|---|---|---|---|
| PAGE-PM-01 | ภาพรวม PM | `/pm` | Dashboard สรุปความคืบหน้า PM |
| PAGE-PM-02 | กำหนดการ PM | `/pm/schedule` | ปฏิทิน/ตารางกำหนดการ PM |
| PAGE-PM-03 | แผน PM | `/pm/plans` | จัดการแผน PM (สร้าง/แก้/ลบ/generate งาน) |
| PAGE-PM-04 | ทำ PM ทรัพย์สิน | `/pm/runs` | หน้าหลักที่ช่างใช้ทำงานจริง — เปิด checklist, ดึงสเปคจาก GLPI/Agent, บันทึกผล |
| PAGE-PM-05 | แผนผังชั้น PM | `/pm/floorplan` | ดูสถานะ PM ปักบนผังชั้น (ดูรายละเอียดใน `07_module_pmswhub_floorplan.md`) |
| PAGE-PM-06 | สแกนหาเครื่อง | `/scan` | ใช้มือถือสแกน QR/ค้นหาเครื่องหน้างาน (ไม่จำกัด role) |
| PAGE-PM-07 | Checklist Template | `/pm/templates` | จัดการชุดคำถามตรวจเช็ค |

## Workflow เต็ม: Template → Plan → Run → GLPI/Agent Assist → Perform

```mermaid
flowchart TD
    T[สร้าง PMTemplate\n+ templateItems หลายข้อ\nรองรับ type พิเศษ MONITOR_ARRAY/PRINTER_ARRAY] --> P[สร้าง PMPlan\nระบุ ปี/site/company/deptTask/deviceType/\nplannedDeviceCount/templateId]
    P --> Eligibility[GET /plans/eligibility\nคำนวณว่ามีเครื่องใน scope นี้กี่เครื่อง\nที่ยังไม่มี PMRun ปีนี้]
    Eligibility --> Generate[POST /plans/:id/generate\nสร้าง PMRun สถานะ DRAFT\nตาม plannedDeviceCount เครื่องแรกที่ eligible]
    Generate --> RunList[GET /runs\nแสดงในหน้า 'ทำ PM ทรัพย์สิน'\nกรอง asset.status ไม่ใช่ Retired/Lost/Damaged/Maintenance]

    RunList --> OpenChecklist[ช่างเปิด checklist ของ 1 เครื่อง]
    OpenChecklist --> FetchGLPI{กด 'ดึงสเปคจาก GLPI'?}
    FetchGLPI -->|ใช่| GLPIData[GET /runs/:id/glpi-spec\nquery ด้วย Serial Number\nได้ CPU/RAM/OS/Office/AV/จอที่เชื่อมต่อ]
    GLPIData --> ConfirmGLPI[ต้องกด 'ยืนยันอัพเดทข้อมูลสเปคคอม'\nแยกต่างหาก ก่อนข้อมูลจะเข้าฟอร์มจริง]

    OpenChecklist --> FetchAgent{กด 'ดึงข้อมูล Agent'?}
    FetchAgent -->|ใช่| AgentData[GET /runs/:id/agent-check\nได้ findings (แบต/ดิสก์/AV/Windows Update)\n+ answers ที่ตอบแทนได้\n+ monitors ที่ต่ออยู่ - เพิ่มใหม่]
    AgentData --> ApplyAgent[กด 'เติมคำตอบ N ข้อ + จอ N ตัว'\nรวม logic เดียวกับฝั่ง GLPI merge จอด้วย Serial]

    ConfirmGLPI --> FillForm[กรอก/ตรวจทาน Checklist ครบทุกข้อ]
    ApplyAgent --> FillForm
    FillForm --> Submit[POST /runs/:id/perform\nstatus: DRAFT/IN_PROGRESS/COMPLETED]

    Submit --> ProcessDevices[processDeviceAnswers\nสำหรับ item type MONITOR_ARRAY/PRINTER_ARRAY:\nจับคู่ Serial กับทะเบียนเดิม หรือสร้าง Asset ใหม่\n+ generateAssetCode แบบ advisory-lock กันชนกัน]
    ProcessDevices --> LinkCMDB[upsert AssetLink parent-child\nผูกจอ/ปริ้นเตอร์เข้ากับเครื่องแม่]
    ProcessDevices --> AutoSyncSpec[ถ้า asset.type = Computer:\nauto-sync cpu/ram/storage1/osVersion/domainName\nเข้า ComputerDetail จากคำตอบ checklist]
    LinkCMDB --> Done([PMRun.status อัปเดต\nperformedBy/performedAt/completedAt])
    AutoSyncSpec --> Done
```

## API Inventory (backend/src/routes/pm.ts — 1413 บรรทัด)

| Method | Endpoint | Purpose | Evidence |
|---|---|---|---|
| GET | `/templates` | รายการ template (`?activeOnly=1` กรองเฉพาะ active) | `pm.ts:110` |
| POST | `/templates` | สร้าง template + templateItems | `pm.ts:122` |
| PUT | `/templates/:id` | แก้ template — ลบ/เพิ่ม/แก้ item, **ห้ามลบ item ที่มีคำตอบ PM ผูกอยู่แล้ว** (เก็บไว้พร้อม warning) | `pm.ts:147` |
| GET | `/leads` | รายชื่อ IT staff ที่เลือกเป็นเจ้าของแผนได้ (แทนที่ free-text เดิม) | `pm.ts:231` |
| GET | `/plans` | รายการแผน + นับ total/completed runs (กรอง asset ที่ retired/lost ออกจากการนับ) | `pm.ts:258` |
| POST | `/plans` | สร้างแผนใหม่ | `pm.ts:297` |
| GET | `/plans/gaps` | หา scope (company+dept+deviceType) ที่ไม่มีแผนใดครอบคลุมเลย | `pm.ts:331` |
| GET | `/plans/cleanup-mismatch` | (ยังไม่ได้อ่านรายละเอียด — ชื่อบ่งชี้ว่าหาความไม่ตรงกันของข้อมูลเพื่อล้าง) | `pm.ts:370` |
| GET | `/plans/eligibility` | นับเครื่องที่ยัง eligible ใน scope ของแผน (ไม่คืน asset id list ให้ client) | `pm.ts:401` |
| PUT | `/plans/:id` | แก้แผน — **ถ้ายังไม่มี run ที่ COMPLETED และเปลี่ยน scope/template จะลบ PMRun เดิมทั้งหมดแล้ว generate ใหม่อัตโนมัติ**; ถ้ามี completed แล้วแก้ได้แค่ lead/startDate/endDate/deviceType/plannedDeviceCount | `pm.ts:417` |
| DELETE | `/plans/:id` | ลบแผน — **บล็อกถ้ามี run สถานะ COMPLETED อยู่แม้แค่ 1 รายการ** | `pm.ts:512` |
| POST | `/plans/:id/generate` | สร้าง PMRun (DRAFT) ตามจำนวน `plannedDeviceCount` จากเครื่องที่ eligible | `pm.ts:551` |
| GET | `/runs` | รายการงาน PM (กรอง planId/status ได้, exclude asset ที่ retired/lost/damaged/maintenance) | `pm.ts:585` |
| POST | `/runs/:id/perform` | บันทึกผลตรวจ — เขียน PMRunAnswer, ประมวลผล MONITOR_ARRAY/PRINTER_ARRAY (สร้าง Asset+ผูก CMDB), auto-sync สเปคคอมพิวเตอร์, อัปเดตสถานะ run | `pm.ts:869` |
| GET | `/coverage` | ข้อมูลดิบระดับ asset สำหรับ pivot ในหน้า dashboard — เปิดให้ VIEWER อ่านด้วย | `pm.ts:958` |
| GET | `/dashboard` | สรุป % ความคืบหน้าตามแผน | `pm.ts:1055` |
| POST | `/runs/:id/upload` | อัปโหลดรูปประกอบการตรวจ | `pm.ts:1094` |
| POST | `/runs/bulk-perform` | บันทึกผลหลาย run พร้อมกัน (ใช้กับ checklist ที่คำตอบเหมือนกันหลายเครื่อง) | `pm.ts:1118` |
| GET | `/procurement-report` | รายงานเสนอจัดซื้อจากผล PM (บริษัท+ปี) | `pm.ts:1163` |
| GET | `/runs/:id/agent-check` | **[แก้ในเซสชันนี้]** ดึงข้อมูลจาก Agent — findings+answers+**monitors** (เพิ่มใหม่) อ่านอย่างเดียว ไม่เขียน DB | `pm.ts:1176` |
| GET | `/runs/:id/glpi-spec` | ดึงสเปคจาก GLPI ด้วย Serial | `pm.ts:1208` |
| DELETE | `/runs/:id` | ลบงาน PM (ลบ answers ก่อนด้วย transaction) | `pm.ts:1230` |
| PATCH | `/runs/:id/notes` | บันทึกหมายเหตุอิสระ (เช่น "เจ้าของไม่อยู่ นัดใหม่") แยกจาก perform | `pm.ts:1246` |
| POST | `/upload-temp` | อัปโหลดรูปชั่วคราวก่อนผูกกับ run จริง | `pm.ts:1258` |
| GET | `/check-serial` | เช็คว่า Serial ซ้ำในทะเบียนหรือไม่ (ใช้ตอนกรอกจอ/ปริ้นเตอร์ใหม่) | `pm.ts:1266` |
| GET | `/preview-monitor-code` / `/preview-printer-code` | พรีวิวรหัสทรัพย์สินที่ระบบจะ generate ให้ก่อนบันทึกจริง | `pm.ts:1298, 1311` |
| GET | `/runs/adhoc-search` | ค้นหาเครื่องสำหรับสร้าง PM แบบ ad-hoc (นอกแผน) | `pm.ts:1325` |
| GET | `/runs/adhoc-check/:assetId` | เช็คว่าเครื่องนี้ทำ PM ad-hoc ซ้ำปีเดียวกันหรือยัง | `pm.ts:1347` |
| POST | `/runs/adhoc` | สร้าง PMRun แบบ ad-hoc (ไม่ผูกกับแผนที่มีอยู่) | `pm.ts:1363` |

## Business Rules (VERIFIED, cite file:line)

1. **ลบแผนไม่ได้ถ้ามีงานที่ COMPLETED แล้วแม้แค่ 1 รายการ** ต้องลบงานที่เสร็จก่อน — `pm.ts:518-523`
2. **แก้ scope/template ของแผนที่ยังไม่มีงาน COMPLETED เลย = ลบ PMRun เดิมทั้งหมดแล้ว generate ใหม่อัตโนมัติ** (ไม่ merge, replace ทั้งชุด) — `pm.ts:449-497`
3. **แก้ template โดยลบ item ที่มีคำตอบ PM ผูกอยู่แล้ว: item ไม่ถูกลบจริง (กันข้อมูลหาย) แต่ตอบกลับพร้อม `_warning`** — `pm.ts:168-220`
4. **นับความคืบหน้าแผน (`/plans`) และ list งาน (`/runs`) exclude เครื่องที่ retired/lost/damaged/maintenance เสมอ** — ป้องกัน % ค้างต่ำกว่าจริงตลอดไปเพราะเครื่องที่ไม่มีทางถูกตรวจแล้ว (คอมเมนต์ยืนยันเหตุผลตรงๆ) — `pm.ts:273-279`, ใช้ `PM_EXCLUDED_STATUSES` (import จากที่อื่น — ไม่ได้ยืนยันค่าที่แน่นอนในเซสชันนี้ แต่ชื่อกับ context บ่งชัดว่าเป็น `[Retired, Lost, Damaged, Maintenance]`)
5. **สร้างรหัสทรัพย์สินอัตโนมัติของจอ/ปริ้นเตอร์ที่เจอระหว่างทำ PM ต้อง lock ระดับ transaction (Postgres advisory lock) กันสองคำขอสร้างรหัสชนกัน** — ยืนยันซ้ำจากเอกสารเดิม `docs/ITAM-V2-SYSTEM-REFERENCE.md` และคอมเมนต์ใน `pm.ts` โซน `generateDeviceCodeSafe`
6. **GLPI/Agent เติมข้อมูลเข้าฟอร์มต้องกดยืนยันแยกขั้นเสมอ ไม่เขียนทับอัตโนมัติทันทีที่ดึงมา** — ป้องกันทับข้อมูลที่ช่างกรอกเองโดยไม่ได้ตั้งใจ — `PMRunPage.tsx` (`applyGLPISpecToAnswers`, `applyAgentAnswers`)
7. **Agent เติมจอเข้าฟอร์มโดยไม่แตะ `screenSize`/`ports`/`hasSpeaker`** — เพราะ Agent อ่านค่าพวกนี้ไม่ได้ Agent จึงใช้ field แยก `connectedPort`/`year` แทนเพื่อไม่ให้ปนกับสเปคจอที่ช่างกรอกเอง (หมายเหตุ: บั๊กฝั่งบันทึกที่เคยเขียน null ทับของเดิมแก้แล้ว — ดู "Known Issue — แก้แล้ว" ด้านล่าง — แต่การแยก field ยังเป็นดีไซน์ที่ถูกต้องอยู่) — `backend/src/services/agentMonitors.ts` (`buildAgentPmMonitors`)

## ✅ Known Issue — แก้แล้ว (2026-09-01)

**เดิม:** `processDeviceAnswers()` ใน `pm.ts` (โซน MonitorDetail upsert): ถ้า device object มี `screenSize` **หรือ** `ports` **หรือ** `hasSpeaker` แม้แค่ตัวเดียว ระบบจะ upsert `MonitorDetail` ทั้งแถวแล้วเขียนอีกสองช่องที่ไม่มีค่าเป็น `null` ทับของเดิมที่เคยกรอกไว้ — กระทบทั้งข้อมูลจาก GLPI (ถ้า GLPI ส่งพอร์ตมาแต่ไม่มีขนาดจอ ขนาดจอเดิมจะถูกล้าง) และข้อมูลกรอกมือเช่นกัน

**แก้ไข:** เพิ่ม helper `buildMonitorSpecPatch(dev)` ที่หยิบเฉพาะช่องที่ "มีค่าจริงส่งมา" (`screenSize`/`ports` เป็น string ไม่ว่าง, `hasSpeaker` ไม่ใช่ `undefined`/`null`) แล้วใช้ patch นั้นเป็น `update` ของ upsert — ช่องที่ไม่ได้ส่งมาจะไม่ถูกแตะ ส่วน `create` branch (asset ใหม่/แถวยังไม่มี) ยังเติม `null`/`false` ให้ช่องที่ขาดตามเดิมเพราะไม่มีของเดิมให้ทับ ใช้ helper เดียวกันทั้งจุดสร้าง asset ใหม่และจุดอัปเดต asset เดิม — `pm.ts` (`buildMonitorSpecPatch`)

**ไม่มี use case "ผู้ใช้ตั้งใจล้างค่า" ในหน้าทำ PM** — ช่อง `screenSize`/`ports`/`hasSpeaker` เป็นแบบแสดงผลอย่างเดียว (`PMDeviceArrayInput.tsx` ไม่มี input ให้แก้) ค่ามาจาก checkSerial/GLPI/Agent เท่านั้น การล้างค่าจริงๆ ทำผ่านหน้าแก้ไข Asset (`AssetFormPage.tsx`) ซึ่งเป็นคนละ path

## Unknown / Not Verified

- ยังไม่ได้อ่าน `PMTemplatePage.tsx`, `PMPlanListPage.tsx`, `PMDashboardPage.tsx`, `PMSchedulePage.tsx` แบบละเอียดทีละบรรทัด (รู้จาก route/API ที่เรียกและโครงสร้างทั่วไปเท่านั้น) — ปุ่ม/ฟอร์มระดับ field ของ 4 หน้านี้ยังไม่ verified ครบ 100%
- `PM_EXCLUDED_STATUSES` ค่าที่แน่นอนไม่ได้ยืนยัน (อนุมานจาก context)
- `/plans/cleanup-mismatch` — อ่านแค่ชื่อ endpoint จาก route list ยังไม่ได้เปิดโค้ดจริง
- Business rule ข้อ 6-7 อ้างอิงจาก session narrative (สิ่งที่ผู้เขียนเอกสารนี้ทำเองในเซสชันนี้) ซึ่งตรงกับโค้ดจริงที่อ่าน แต่ยังไม่ได้ deploy/verify ผ่านการทดสอบจริงในเบราว์เซอร์ (ผู้ใช้ยังไม่มีบัญชีทดสอบให้ตอนที่ทำฟีเจอร์นี้)

---
*ไฟล์นี้เป็นส่วนหนึ่งของ System Blueprint — ดู `INDEX.md` สำหรับสารบัญเต็ม*
