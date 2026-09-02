# Data Model & API

## หลักการ

- ทุกตารางหลักมี `id` (uuid), `companyId`, `createdAt/By`, `updatedAt/By`, `deletedAt` (soft delete)
- `companyId` บังคับใช้ที่ชั้น repository — ห้ามพึ่ง UI กรอง
- สถานะทุกอย่างเป็น enum ในฐานข้อมูล ไม่ใช่ string อิสระ
- ค่าเงินเก็บเป็น integer สตางค์ หรือ `decimal(15,2)` — ห้ามใช้ float

---

## Entity หลัก

### Company
```
id · code (TRR Corp)* unique · nameTh · nameEn · taxId · adCompanyCode* unique
isShared (bool — ทรัพย์สินใช้ร่วมทุกบริษัท) · isActive
```

### User
> อ่านอย่างเดียวจาก AD ยกเว้น `roleId`, `isExternal`, `expiresAt`

```
id · adObjectId* unique · username · displayName · email · employeeId
department · title · managerEmail · phoneExtension · officeLocation
photoUrl (จาก thumbnailPhoto) · companyId (จาก AD company)
roleId · adGroups[] · isExternal · expiresAt (บัญชีนอก AD)
adStatus (Enabled|Disabled) · lastLoginAt · lastSyncAt
```

### Role
```
id · code (SUPERADMIN|IT_ADMIN|APPROVER|VIEWER|USER|VENDOR)* unique
nameTh · description · adGroupName (nullable) · menuCodes[] · permissions[]
```

### Asset
```
id · assetCode* unique (IT-{หมวด}-{ปีพ.ศ.}-{ลำดับ4หลัก})
serialNo* · name · categoryId · brandId · model
computerName · macAddress · ipAddress · osVersion · cpu · ram · disk
companyId* · ownerUserId · department · locationId · building · floor · room
status (enum ด้านล่าง) · condition (Normal|Scratched|Damaged)
purchaseDate · purchasePrice · poNumber · vendorId
warrantyEnd · maContractId
usefulLifeYears · depreciationMethod · salvageValue
accumulatedDepreciation · bookValue · totalRepairCost
qrPrintedAt · lastCountedAt · lastPmAt · nextPmDue
parentAssetId (nullable — อุปกรณ์ต่อพ่วงผูกกับเครื่องหลัก)
```

**AssetStatus enum**
```
InUse         กำลังใช้งาน
Available     ว่าง / พร้อมจ่าย
Borrowed      ถูกยืม
Maintenance   ซ่อม / PM
Damaged       ชำรุด
Lost          สูญหาย
Retired       รอตัดจำหน่าย
Disposed      ตัดจำหน่ายแล้ว
```

### AssetCategory
```
id · nameTh · codePrefix* unique (NB/PC/MN/PR/NW/SRV/UPS/TB/AC)
usefulLifeYears · depreciationMethod · salvageValue
replacementRule (ข้อความ) · sortOrder · assetCount (computed)
```
ลบไม่ได้เมื่อ `assetCount > 0`

### BorrowRequest
```
id · borrowCode* unique (BRW-{ปี}-{ลำดับ}) · companyId*
requesterId · department · purpose · usageLocation
startDate · dueDate · items[] (AssetId, qty)
status (enum ด้านล่าง) · approverId (IT Admin) · approvedAt · rejectReason
checkedOutAt · checkedOutBy · returnedAt · returnedBy · returnCondition
extensionCount (max 2) · notifiedManagerAt
```

**BorrowStatus enum**
```
PendingApproval   รอ IT Admin อนุมัติ
Approved          อนุมัติแล้ว · พร้อมจ่ายของ
Rejected          ปฏิเสธ
CheckedOut        จ่ายของแล้ว
Returned          คืนแล้ว
Overdue           เกินกำหนดคืน
Cancelled         ยกเลิก
```

### DeployRequest (เครื่องใหม่ & ส่งมอบ)
> โครงสร้างตาม `ITForm-Receive (2026).xlsx` ตาราง `tbl_Requests` (18 คอลัมน์)

```
id · formId* unique (FRM-{ปี}-{ลำดับ}) · formIdPA (สำหรับ Power Automate)
requestDate · comname (Computer Name) · requesterName · requesterEmail
managerEmail · department · hrEmail · itEmail · companyId*
deployType (New|Reassign|Temporary)
assetId · sourceReturnId (กรณี Reassign)
checklistTemplateId · setupStartedAt · setupCompletedAt · setupByUserId
status (enum ด้านล่าง)
emailSentAt · confirmedAt · confirmToken · employeeStartDate
```

**DeployStatus enum**
```
PendingPrep    รอเตรียมเครื่อง
InSetup        กำลัง Setup
ReadyToDeliver พร้อมส่งมอบ
AwaitingConfirm รอผู้ใช้ยืนยัน
Confirmed      รับเครื่องไปแล้ว
Reminded       เตือนแล้ว (นับครั้ง)
```

### DeployItem
> ตาราง `tbl_Items`

```
id · deployRequestId · itemId (ITM-001) · category (Notebook|Adapter|Bag|Mouse|
Keyboard|Monitor|Docking|Headset|Cable|Other) · itemName · serialNumber
qty · remark · delivered (bool) · assetId (nullable) · sparePartId (nullable)
useExisting (bool — กรณีเครื่องหมุนเวียน) · stockDeductedAt
```

### ChecklistTemplate / ChecklistSection / ChecklistItem
```
Template: id · docCode* (IT-WI-001) · name · revision · assetCategoryIds[]
          avgMinutes · isActive · updatedAt/By

Section:  id · templateId · sortOrder · name

Item:     id · sectionId · sortOrder · text · docReference (ข้อ 3.1)
          answerType (YesNoNA|Text|Number|Rating|MasterDataSelect)
          masterDataType (nullable — เช่น printer)
          isRequired · isActive · helpText
```
เก็บ revision — งานที่ทำค้างต้องยังใช้ revision เดิม

### ChecklistRun / ChecklistAnswer
```
Run:    id · runCode (RUN-{ปี}-{ลำดับ}) · templateId · templateRevision
        assetId · deployRequestId (nullable) · pmPlanId (nullable)
        performedBy · startedAt · completedAt · progress · satisfactionScore
        notes · isDraft · syncedAt (สำหรับออฟไลน์)

Answer: id · runId · itemId · value · reason (บังคับเมื่อตอบไม่ผ่าน)
        photoUrls[] · answeredAt
```

### WipeRecord (บันทึกการล้างข้อมูล — บังคับก่อนจ่ายเครื่องหมุนเวียน)
```
id · assetId · method (NIST 800-88 Purge) · tool · performedBy · performedAt
verifiedBy · result · certificateUrl · backupRetainUntil
```

### MaintenanceTicket
```
id · ticketCode (MNT-{ปี}-{ลำดับ}) · companyId* · assetId · reportedBy
symptom · priority (Low|Normal|Urgent) · photoUrls[]
assignedTo · status · slaHours · slaBreachedAt
partsUsed[] (sparePartId, qty, cost) · totalCost · isWarrantyClaim
resolvedAt · resolution
```

### PmPlan / PmTask
```
Plan: id · year · companyId* · siteId · deptTask · deviceTypeIds[]
      templateId · eligibilityRule · startDate · endDate · status

Task: id · planId · assetId · assignedTo · scheduledWeek
      runId (nullable) · status
```

### SparePart / StockMovement
```
Part:     id · partCode · name · categoryId · unitId · qtyOnHand
          reorderPoint · unitCost · locationId · companyId

Movement: id · partId · type (Receive|Issue|Adjust|Count)
          qty · refType · refId · performedBy · performedAt · note
```

### Contract / License
```
Contract: id · contractNo · type (MA|Warranty|Lease) · vendorId
          startDate · endDate · value · assetIds[] · companyId · documentUrl

License:  id · productName · licenseKey · seatsTotal · seatsUsed
          expiryDate · vendorId · companyId · assignedAssetIds[]
```

### DisposalRequest
```
id · disposalCode (DSP-{ปี}-{ลำดับ}) · companyId* · method (Sale|Donate|Recycle)
assetIds[] · totalCost · totalBookValue · reason
requestedBy · approvals[] (role, userId, approvedAt) · status · documentUrl
```

### InventoryCount (ตรวจนับประจำปี)
```
Count:  id · year · companyId* · startDate · endDate · chairmanUserId · status
Area:   id · countId · locationId · assignedTo · expectedQty · countedQty
        misplacedQty · missingQty · status
Line:   id · areaId · assetId · result (Found|Misplaced|Missing)
        foundLocationId · countedBy · countedAt
```

### DepreciationSnapshot
```
id · assetId · period (YYYY-MM) · openingValue · monthlyDepreciation
accumulatedDepreciation · closingValue · calculatedAt
```
สร้างโดย job รายเดือน ห้ามคำนวณสดตอน query

### Printer (ข้อมูลหลัก)
```
id · floor · brandModel · serialNumber · ipAddress · driverName
requiresPin · status · companyId
```

### AuditLog
```
id · entityType · entityId · action · beforeJson · afterJson
performedBy · performedAt · ipAddress · source (UI|API|ADSync|Job)
```

### NotificationRule / NotificationLog
```
Rule: id · eventCode · channels[] (Email|Line|InApp) · recipientRule
      schedule · isActive

Log:  id · ruleId · eventCode · recipient · channel · sentAt
      status · errorMessage · payloadJson
```

### ApiKey
```
id · name · hashedKey · scopes[] · ipWhitelist[] · expiresAt
lastUsedAt · callCount30d · isActive · createdBy
```

---

## API Endpoints

ทุก endpoint ต้องกรองด้วย company scope โดยอัตโนมัติ (ยกเว้น SUPERADMIN)

### Auth
```
POST   /api/auth/sso/callback          OIDC callback
POST   /api/auth/login                 fallback username/password (AD bind)
POST   /api/auth/refresh
GET    /api/auth/me                    ผู้ใช้ปัจจุบัน + role + menuCodes + companyId
```

### Assets
```
GET    /api/assets                     ?q&categoryId&status&locationId&page&size
POST   /api/assets
GET    /api/assets/:id
PATCH  /api/assets/:id
DELETE /api/assets/:id
GET    /api/assets/:id/history
GET    /api/assets/:id/maintenance
POST   /api/assets/:id/transfer        โอนย้ายภายใน
POST   /api/assets/import/validate     อัปโหลด → ผลตรวจสอบ (ไม่บันทึก)
POST   /api/assets/import/commit
GET    /api/assets/export
POST   /api/assets/labels/print        คืน PDF ชุดสติกเกอร์
GET    /api/assets/scan/:code          สแกน QR → asset
```

### Borrow
```
GET    /api/borrows                    ?status&page
POST   /api/borrows                    สร้างคำขอ (ตรวจ company scope + ของค้างคืน)
GET    /api/borrows/:id
POST   /api/borrows/:id/approve        IT Admin เท่านั้น
POST   /api/borrows/:id/reject         ต้องมี reason
POST   /api/borrows/:id/checkout
POST   /api/borrows/:id/return         พร้อม condition + photoUrls
POST   /api/borrows/:id/extend
GET    /api/borrows/queue              คิวอนุมัติของ IT Admin คนนี้
GET    /api/borrows/overdue
```

### Deploy
```
GET    /api/deploys                    ?status&companyId
POST   /api/deploys
GET    /api/deploys/:id
PATCH  /api/deploys/:id/items
POST   /api/deploys/:id/setup/start
POST   /api/deploys/:id/setup/complete
POST   /api/deploys/:id/send-email     trigger Power Automate
POST   /api/deploys/confirm/:token     ผู้ใช้ยืนยันรับ (จาก MS Form)
GET    /api/deploys/queue              คิวงาน Setup
GET    /api/deploys/reassign-pool      คลังเครื่องพร้อมจ่ายซ้ำ
POST   /api/deploys/:id/wipe-record
```

### Checklist
```
GET    /api/checklist-templates
POST   /api/checklist-templates
PATCH  /api/checklist-templates/:id    บันทึกเป็น revision ใหม่
GET    /api/checklist-templates/:id/items
POST   /api/checklist-runs
PATCH  /api/checklist-runs/:id         บันทึกร่าง (รองรับ offline batch)
POST   /api/checklist-runs/:id/complete
POST   /api/checklist-runs/sync        ซิงก์หลายรายการจากมือถือ
```

### อื่น ๆ
```
/api/maintenance   /api/pm-plans   /api/pm-tasks
/api/spare-parts   /api/stock-movements
/api/contracts     /api/licenses
/api/disposals     /api/donations
/api/inventory-counts
/api/reports/assets|borrow|pm|maintenance|cost   (?filters → JSON | xlsx | pdf)
/api/reports/schedules
/api/depreciation/snapshots  /api/depreciation/run
```

### Admin
```
GET    /api/admin/users               ?role&department&status
PATCH  /api/admin/users/:id/role
POST   /api/admin/users/external      สร้างบัญชีนอก AD (บังคับ expiresAt)
GET    /api/admin/roles
GET    /api/admin/companies
GET    /api/admin/master-data/:type   category|brand|location|vendor|unit|printer
POST   /api/admin/master-data/:type
PATCH  /api/admin/master-data/:type/:id
DELETE /api/admin/master-data/:type/:id   → 409 ถ้ามีข้อมูลอ้างอิง
GET    /api/admin/settings
PATCH  /api/admin/settings/:group     general|borrow|notification|email|security|system|data
GET    /api/admin/audit-logs
GET    /api/admin/notification-logs
GET    /api/admin/integrations
POST   /api/admin/integrations/:id/test
GET    /api/admin/api-keys
POST   /api/admin/api-keys
DELETE /api/admin/api-keys/:id
POST   /api/admin/ad-sync             ซิงก์ทันที
```

---

## Background jobs

| งาน | ตารางเวลา | หน้าที่ |
| --- | --- | --- |
| AD sync | ทุก 4 ชั่วโมง | ดึงผู้ใช้ แผนก รูป กลุ่ม → อัปเดต role และระงับบัญชีที่ถูก disable |
| คำนวณค่าเสื่อม | ทุกวันที่ 1 เวลา 01:00 | สร้าง DepreciationSnapshot ทุกทรัพย์สิน |
| แจ้งเตือนรายวัน | ทุกวัน 09:00 | เกินกำหนดคืน · SLA · รอยืนยันรับ · ค้างคืนหลังลาออก |
| สรุปประจำวัน | ทุกวัน 08:30 | อะไหล่ต่ำกว่าจุดสั่งซื้อ · ประกันใกล้หมด |
| สำรองข้อมูล | ทุกวัน 02:00 | ฐานข้อมูล + ไฟล์แนบ → Azure Blob เก็บ 90 วัน |
| ล้าง log เก่า | ทุกวันอาทิตย์ 03:00 | ลบ audit log เกิน 365 วัน · system log เกิน 90 วัน |
| GLPI import | ตามรอบ agent | อัปเดตสเปกฮาร์ดแวร์จาก GLPI |
