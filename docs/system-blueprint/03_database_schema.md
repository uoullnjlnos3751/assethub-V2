# DATABASE SCHEMA (PostgreSQL via Prisma)

Source: `D:\ITSM\backend\prisma\schema.prisma` (1520 lines, read in full).

## Overview

- **Generator**: `prisma-client-js`
- **Datasource provider**: `postgresql`
- **Datasource URL**: `env("DATABASE_URL")`
- **Total models**: 73
- **Total enums**: 15
- Almost every model maps to a snake_case table via `@@map(...)`. A few models have no `@@map` and therefore use their PascalCase model name as the literal table name: `SystemSetting`, `ScheduledJob`... (see per-model notes; `ScheduledJob` actually does have `@@map("scheduled_jobs")` — the only models with **no** `@@map` at all are `SystemSetting`.)
- No field-level `@map` renames were found anywhere in the file — column names equal Prisma field names 1:1.
- Table cell conventions used below: **Nullable?** is Y/N based on the trailing `?` in the Prisma type. **Unique/PK/FK** marks `@id` as `PK`, `@unique`/`@@unique` participation as `Unique`, and scalar FK columns as `FK -> Target.field`. Relation object/array fields (non-scalar navigation properties) are included as their own rows per the source's instruction to quote every field verbatim; their Unique/PK/FK cell reads `Relation`.

## Domain grouping used in this document

| Domain | Models |
|---|---|
| User & Access | AppUser, LoginLog |
| Asset Core | Asset, ComputerDetail, PhoneDetail, MonitorDetail, DeviceDetail, NetworkDeviceDetail, RackDetail, PrinterDetail, CableDetail, ConsumableDetail, AssetDocument, AssetLink, AssetDisposal, AssetHistory |
| Inventory | InventoryItem, InventoryTransaction |
| Borrow Workflow | BorrowRequest, BorrowRequestItem, BorrowApproval, Checkout, CheckoutImage, Return, ReturnImage, BorrowExtension, BorrowExtensionItem |
| Maintenance & PM | MaintenanceRecord, MaintenancePart, MaintenanceImage, PMTemplate, PMTemplateItem, PMPlan, PMRun, PMRunAnswer |
| PM SW Hub | PMSwHub, PMSwHubPlan, PMSwHubItem, PMSwHubTemplate, PMSwHubTemplateItem |
| FloorPlan | FloorPlan, FloorPlanPin, FloorPlanSeat, FloorPlanTemplate, FloorPlanZone |
| Donation | Donation, DonationItem, DonationImage |
| Delivery | DeliveryRequest, DeliveryPeripheralItem, DeliveryChecklistRun, DeliveryChecklistAnswer (the checklist *run/answer* tables are delivery-execution data; the *master* ChecklistSet/ChecklistItem definitions live under Master Data per the requested grouping) |
| Licenses & Contracts | SoftwareLicense, LicenseAssignment, Contract, ContractAsset |
| Master Data | Category, CategoryType, Company, Department, AssetLocation, Vendor, AssetStatusMaster, DeviceType, Printer, ChecklistSet, ChecklistItem |
| Notifications & System | NotificationTemplate, NotificationOutbox, AppNotification, NotificationSetting, SystemSetting, ScheduledJob |
| Other | (none — all 73 models fit a domain above) |

2 + 14 + 2 + 9 + 8 + 5 + 5 + 3 + 4 + 4 + 11 + 6 = **73 models**, matching the count above.

---

## 1. User & Access

### AppUser  (`@@map("app_users")`)

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| adUsername | String | N | — | Unique | AD login name |
| displayName | String? | Y | — | | |
| email | String? | Y | — | | |
| department | String? | Y | — | | free-text department (legacy, distinct from Department master table) |
| company | String? | Y | — | | free-text company |
| companyThai | String? | Y | — | | |
| thaiName | String? | Y | — | | |
| avatarUrl | String? | Y | — | | |
| role | UserRole | N | USER | | enum: SUPERADMIN/IT_ADMIN/USER/VIEWER/HR_CUSTODY |
| isActive | Boolean | N | true | | |
| authType | AuthType | N | AD | | enum: AD/LOCAL |
| passwordHash | String? | Y | — | | only used for LOCAL auth |
| lastLoginAt | DateTime? | Y | — | | |
| managerId | Int? | Y | — | FK -> AppUser.id | Comment: "หัวหน้างานโดยตรง — ใช้กำหนดว่าใครต้องอนุมัติคำขอยืมของ user นี้ก่อนถึง IT Admin (มอบหมายมือโดย SUPERADMIN ผ่านหน้าจัดการผู้ใช้ ยังไม่มีการซิงก์จาก AD)" — direct supervisor, manually assigned, drives the supervisor-approval borrow stage |
| manager | AppUser? | Y | — | Relation | self-relation "ManagerHierarchy", onDelete: SetNull |
| directReports | AppUser[] | — | — | Relation | self-relation "ManagerHierarchy" reverse side |
| lastLoginIp | String? | Y | — | | Comment: "บันทึกไว้ตอนล็อกอินสำเร็จ — ก่อนหน้านี้ระบบไม่เก็บอะไรเกี่ยวกับเครื่องเลย จึงตอบไม่ได้ว่าใครเข้าใช้งานจากที่ไหน ทั้งที่ nginx ส่ง X-Real-IP มาให้อยู่แล้ว" |
| lastLoginAgent | String? | Y | — | | |
| lastLoginHost | String? | Y | — | | doc comment: "ชื่อเครื่องที่แปลจาก IP ด้วยข้อมูล Agent — null ถ้าจับคู่ไม่ได้" |
| createdAt | DateTime | N | now() | | |
| updatedAt | DateTime | N | @updatedAt | | |
| loginLogs | LoginLog[] | — | — | Relation | one-to-many to LoginLog.userId |
| assetHistory | AssetHistory[] | — | — | Relation | "ActorUser" — AssetHistory.actorUserId |
| assetHistoryOwner | AssetHistory[] | — | — | Relation | "OwnerUser" — AssetHistory.ownerUserId |
| borrowApprovals | BorrowApproval[] | — | — | Relation | BorrowApproval.approverUserId |
| extensionRequests | BorrowExtension[] | — | — | Relation | BorrowExtension.requestedBy |
| borrowRequests | BorrowRequest[] | — | — | Relation | BorrowRequest.requesterUserId |
| checkouts | Checkout[] | — | — | Relation | Checkout.checkoutBy |
| pmRunsPerformed | PMRun[] | — | — | Relation | "PMRunPerformedBy" — PMRun.performedBy |
| returns | Return[] | — | — | Relation | Return.returnBy |
| donations | Donation[] | — | — | Relation | Donation.createdById |
| maintenanceRecords | MaintenanceRecord[] | — | — | Relation | MaintenanceRecord.technicianId |
| notifications | AppNotification[] | — | — | Relation | AppNotification.userId |
| assignedAssets | Asset[] | — | — | Relation | "AssetAssignedTo" — Asset.assignedToUserId |
| disposalsCreated | AssetDisposal[] | — | — | Relation | "DisposalCreatedBy" — AssetDisposal.createdById |
| deliveryRequested | DeliveryRequest[] | — | — | Relation | "DeliveryRequestedBy" — DeliveryRequest.requestedBy |
| deliveryInstalled | DeliveryRequest[] | — | — | Relation | "DeliveryInstalledBy" — DeliveryRequest.installerId |
| deliveryDelivered | DeliveryRequest[] | — | — | Relation | "DeliveryDeliveredBy" — DeliveryRequest.deliveredById |
| checklistRunsPerformed | DeliveryChecklistRun[] | — | — | Relation | "DeliveryChecklistPerformedBy" — DeliveryChecklistRun.performedBy |

Indexes: `@@index([role, isActive])`, `@@index([department])`, `@@index([managerId])`.

### LoginLog  (`@@map("login_logs")`)

Doc comment on model: "ประวัติการเข้าใช้งาน — เก็บทั้งที่สำเร็จและล้มเหลว เพื่อให้ตามได้ว่าใครเข้าจากไหน และมีใครพยายามเดารหัสผ่านหรือเปล่า" (login history, success and failure, to trace origin and detect password-guessing attempts).

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| userId | Int? | Y | — | FK -> AppUser.id | doc comment: "null เมื่อล็อกอินล้มเหลวด้วยชื่อผู้ใช้ที่ไม่มีในระบบ" (null when login fails with a username that doesn't exist) |
| username | String | N | — | | doc comment: "ชื่อผู้ใช้ที่พิมพ์เข้ามาจริง เก็บแยกจาก userId เพราะกรณีล้มเหลวอาจไม่มี user" |
| success | Boolean | N | — | | |
| reason | String? | Y | — | | doc comment: "เหตุผลที่ล้มเหลว เช่น รหัสผ่านผิด บัญชีถูกปิด" |
| ip | String? | Y | — | | |
| userAgent | String? | Y | — | | |
| hostname | String? | Y | — | | doc comment: "ชื่อเครื่องที่แปลจาก IP ด้วยข้อมูล Agent" |
| authType | String? | Y | — | | |
| createdAt | DateTime | N | now() | | |
| user | AppUser? | Y | — | Relation | onDelete: SetNull |

Indexes: `@@index([userId, createdAt])`, `@@index([createdAt])`, `@@index([ip])`.

---

## 2. Asset Core

### Asset  (`@@map("assets")`)

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| assetCode | String? | Y | — | Unique | |
| assetName | String? | Y | — | | |
| accountingCode | String? | Y | — | Unique | Comment: "เลขครุภัณฑ์ที่ฝ่ายบัญชีออกให้ — แยกจาก assetCode (รหัสที่ฝ่าย IT สร้างอัตโนมัติ) เพราะฝ่ายบัญชีมักจะออกเลขทีหลัง หรือบางเครื่องไม่เคยมีเลขนี้เลย จึงต้องเว้นว่างได้จนกว่าจะทราบ" |
| serialNo | String | N | — | Unique | |
| type | String? | Y | — | | free-text asset type |
| categoryId | Int? | Y | — | FK -> Category.id | |
| brand | String? | Y | — | | |
| model | String? | Y | — | | |
| cpu | String? | Y | — | | |
| ram | String? | Y | — | | |
| osVersion | String? | Y | — | | |
| windowsLicense | String? | Y | — | | |
| officeLicense | String? | Y | — | | |
| antivirusStatus | String? | Y | — | | |
| vendor | String? | Y | — | | free-text vendor (legacy, distinct from Vendor master table / vendorRef) |
| poNumber | String? | Y | — | | |
| prNumber | String? | Y | — | | |
| purchaseDate | DateTime? | Y | — | | |
| purchasePrice | Float? | Y | — | | |
| warrantyEndDate | DateTime? | Y | — | | |
| age | Int? | Y | — | | |
| ownerName | String? | Y | — | | free-text owner name; keyed against `FloorPlanSeat.ownerName` |
| departmentId | String? | Y | — | | free-text/legacy department id (String, not FK) |
| location | String? | Y | — | | free-text location |
| status | AssetStatus | N | Available | | enum |
| remark | String? | Y | — | | |
| createdAt | DateTime | N | now() | | |
| updatedAt | DateTime | N | @updatedAt | | |
| company | String? | Y | — | | |
| oldAssetCode | String? | Y | — | | |
| cpuGeneration | String? | Y | — | | |
| domainName | String? | Y | — | | |
| floor | String? | Y | — | | |
| poDate | DateTime? | Y | — | | |
| ramDetail | String? | Y | — | | |
| gpu | String? | Y | — | | |
| osType | String? | Y | — | | |
| budget | String? | Y | — | | |
| ramSlot1 | String? | Y | — | | |
| ramSlot2 | String? | Y | — | | |
| memoryType | String? | Y | — | | |
| ramOnboard | String? | Y | — | | |
| ramType | String? | Y | — | | |
| ramSpeed | String? | Y | — | | |
| ramMaxSupported | String? | Y | — | | |
| ramAvailableSlots | String? | Y | — | | |
| ramUpgradeable | String? | Y | — | | |
| snComputer | String? | Y | — | | |
| storage1 | String? | Y | — | | |
| storage2 | String? | Y | — | | |
| image | String? | Y | — | | |
| assignedToUserId | Int? | Y | — | FK -> AppUser.id | Comment block "Phase 2: ITAM lifecycle additions — FK to assigned user (replaces free-text ownerName lookup)" |
| assignedTo | AppUser? | Y | — | Relation | "AssetAssignedTo" |
| departmentRefId | Int? | Y | — | FK -> Department.id | Comment: "Phase 5: FK to master data (dual-write — departmentId/vendor/location string columns above stay as-is for display/fallback; these are resolved best-effort on write)" |
| departmentRef | Department? | Y | — | Relation | |
| vendorRefId | Int? | Y | — | FK -> Vendor.id | |
| vendorRef | Vendor? | Y | — | Relation | |
| locationRefId | Int? | Y | — | FK -> AssetLocation.id | |
| locationRef | AssetLocation? | Y | — | Relation | |
| usefulLifeYears | Int? | Y | — | | comment: "e.g. 5 for laptops, 3 for phones" (depreciation) |
| salvageValue | Float? | Y | — | | comment: "ราคาซากเมื่อหมดอายุ (บาท)" |
| requesterName | String? | Y | — | | comment: "ชื่อผู้ขอจัดซื้อ" (procurement) |
| budgetCode | String? | Y | — | | comment: "รหัสงบประมาณ" |
| receivedDate | DateTime? | Y | — | | comment: "วันที่รับของจริง" |
| assetHistory | AssetHistory[] | — | — | Relation | "AssetHistoryAsset" |
| borrowRequestItems | BorrowRequestItem[] | — | — | Relation | |
| pmRuns | PMRun[] | — | — | Relation | |
| computerDetail | ComputerDetail? | Y | — | Relation | 1-to-1 |
| phoneDetail | PhoneDetail? | Y | — | Relation | 1-to-1 |
| monitorDetail | MonitorDetail? | Y | — | Relation | 1-to-1 |
| deviceDetail | DeviceDetail? | Y | — | Relation | 1-to-1 |
| networkDeviceDetail | NetworkDeviceDetail? | Y | — | Relation | 1-to-1 |
| rackDetail | RackDetail? | Y | — | Relation | 1-to-1 |
| printerDetail | PrinterDetail? | Y | — | Relation | 1-to-1 |
| cableDetail | CableDetail? | Y | — | Relation | 1-to-1 |
| consumableDetail | ConsumableDetail? | Y | — | Relation | 1-to-1 |
| category | Category? | Y | — | Relation | |
| donationItem | DonationItem? | Y | — | Relation | 1-to-1 |
| documents | AssetDocument[] | — | — | Relation | |
| maintenanceRecords | MaintenanceRecord[] | — | — | Relation | |
| floorPlanPins | FloorPlanPin[] | — | — | Relation | |
| disposals | AssetDisposal[] | — | — | Relation | Phase 2 |
| linkedParent | AssetLink[] | — | — | Relation | "LinkChild" — this asset as the child side |
| linkedChildren | AssetLink[] | — | — | Relation | "LinkParent" — this asset as the parent side |
| contractAssets | ContractAsset[] | — | — | Relation | |
| deliveryRequests | DeliveryRequest[] | — | — | Relation | |

Indexes: `@@index([status, departmentId, location])`, `@@index([type, brand])`, `@@index([status, createdAt])`, `@@index([departmentId])`, `@@index([departmentRefId])`, `@@index([vendorRefId])`, `@@index([locationRefId])`, `@@index([categoryId])`.

### ComputerDetail  (`@@map("computer_details")`) — 1:1 detail of Asset

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| assetId | Int | N | — | Unique, FK -> Asset.id | onDelete: Cascade |
| asset | Asset | N | — | Relation | |
| cpu | String? | Y | — | | |
| cpuGeneration | String? | Y | — | | |
| ram | String? | Y | — | | |
| ramSlot1 | String? | Y | — | | |
| ramSlot2 | String? | Y | — | | |
| storage1 | String? | Y | — | | |
| storage2 | String? | Y | — | | |
| gpu | String? | Y | — | | |
| osType | String? | Y | — | | |
| osVersion | String? | Y | — | | |
| windowsLicense | String? | Y | — | | |
| officeLicense | String? | Y | — | | |
| antivirusStatus | String? | Y | — | | |
| domainName | String? | Y | — | | |
| snComputer | String? | Y | — | | |

### PhoneDetail  (`@@map("phone_details")`) — 1:1 detail of Asset

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| assetId | Int | N | — | Unique, FK -> Asset.id | onDelete: Cascade |
| asset | Asset | N | — | Relation | |
| imei1 | String? | Y | — | | |
| imei2 | String? | Y | — | | |
| osVersion | String? | Y | — | | |
| storageCapacity | String? | Y | — | | |
| ram | String? | Y | — | | |
| phoneNumber | String? | Y | — | | |
| mdmEnrolled | Boolean? | Y | — | | |
| simProvider | String? | Y | — | | inline comment: "AIS, TrueMove, DTAC" |

### MonitorDetail  (`@@map("monitor_details")`) — 1:1 detail of Asset

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| assetId | Int | N | — | Unique, FK -> Asset.id | onDelete: Cascade |
| asset | Asset | N | — | Relation | |
| screenSize | String? | Y | — | | inline comment: 24", 27", 34" Ultrawide |
| resolution | String? | Y | — | | inline comment: 1920x1080, 4K |
| panelType | String? | Y | — | | inline comment: IPS, VA, TN, OLED |
| refreshRate | String? | Y | — | | inline comment: 60Hz, 144Hz, 240Hz |
| ports | String? | Y | — | | inline comment: HDMI, DisplayPort, USB-C |
| hasSpeaker | Boolean? | Y | — | | |
| curved | Boolean? | Y | — | | |

### DeviceDetail  (`@@map("device_details")`) — 1:1 detail of Asset (peripherals)

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| assetId | Int | N | — | Unique, FK -> Asset.id | onDelete: Cascade |
| asset | Asset | N | — | Relation | |
| deviceType | String? | Y | — | | inline comment: Keyboard, Mouse, Headset, Webcam |
| connectionType | String? | Y | — | | inline comment: USB, Wireless 2.4G, Bluetooth |
| powerSource | String? | Y | — | | inline comment: Battery AA, Rechargeable, USB Powered |
| rgbSupport | Boolean? | Y | — | | |

### NetworkDeviceDetail  (`@@map("network_device_details")`) — 1:1 detail of Asset

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| assetId | Int | N | — | Unique, FK -> Asset.id | onDelete: Cascade |
| asset | Asset | N | — | Relation | |
| networkType | String? | Y | — | | inline comment: Switch, Router, Firewall, Access Point |
| ipAddress | String? | Y | — | | |
| macAddress | String? | Y | — | | |
| firmwareVersion | String? | Y | — | | |
| portCount | Int? | Y | — | | |
| locationRack | String? | Y | — | | |
| poeSupport | Boolean? | Y | — | | |

### RackDetail  (`@@map("rack_details")`) — 1:1 detail of Asset

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| assetId | Int | N | — | Unique, FK -> Asset.id | onDelete: Cascade |
| asset | Asset | N | — | Relation | |
| subType | String? | Y | — | | inline comment: Rack, Enclosure, PDU |
| rackUnits | String? | Y | — | | |
| powerCapacity | String? | Y | — | | |
| rackLocation | String? | Y | — | | |

### PrinterDetail  (`@@map("printer_details")`) — 1:1 detail of Asset

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| assetId | Int | N | — | Unique, FK -> Asset.id | onDelete: Cascade |
| asset | Asset | N | — | Relation | |
| printerType | String? | Y | — | | inline comment: Laser, Inkjet, Dot Matrix, Thermal |
| isColor | Boolean? | Y | — | | |
| networkReady | Boolean? | Y | — | | |
| ipAddress | String? | Y | — | | |
| macAddress | String? | Y | — | | |
| pageCount | Int? | Y | — | | |
| duplexSupport | Boolean? | Y | — | | |

### CableDetail  (`@@map("cable_details")`) — 1:1 detail of Asset

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| assetId | Int | N | — | Unique, FK -> Asset.id | onDelete: Cascade |
| asset | Asset | N | — | Relation | |
| cableType | String? | Y | — | | inline comment: HDMI, LAN CAT6, USB-C to Lightning |
| length | String? | Y | — | | inline comment: 1.5m, 3m, 5m |
| stockQuantity | Int? | Y | — | | |
| minimumStock | Int? | Y | — | | |

### ConsumableDetail  (`@@map("consumable_details")`) — 1:1 detail of Asset

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| assetId | Int | N | — | Unique, FK -> Asset.id | onDelete: Cascade |
| asset | Asset | N | — | Relation | |
| consumableType | String? | Y | — | | inline comment: Toner, Ink Cartridge, ถ่าน AA |
| compatibleWith | String? | Y | — | | inline comment: Printer Brother HL-L2320D etc. |
| stockQuantity | Int? | Y | — | | |
| minimumStock | Int? | Y | — | | |
| expiryDate | DateTime? | Y | — | | |

### AssetDocument  (`@@map("asset_documents")`)

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| assetId | Int | N | — | FK -> Asset.id | |
| fileName | String | N | — | | original file name |
| storedName | String | N | — | | name on disk |
| fileSize | Int | N | — | | |
| mimeType | String | N | — | | |
| docType | String | N | "OTHER" | | |
| note | String? | Y | — | | |
| uploadedBy | String? | Y | — | | |
| createdAt | DateTime | N | now() | | |
| asset | Asset | N | — | Relation | onDelete: Cascade |

Indexes: `@@index([assetId])`.

### AssetLink  (`@@map("asset_links")`) — Phase 2 CMDB parent-child relationship. Model comment: "CMDB parent-child relationships (e.g. โน้ตบุ๊ก ↔ dock, คอม ↔ จอ)"

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| parentId | Int | N | — | FK -> Asset.id | relation "LinkParent" |
| childId | Int | N | — | FK -> Asset.id | relation "LinkChild" |
| linkType | String | N | "COMPONENT" | | inline comment: COMPONENT \| CONNECTED \| DEPENDS_ON |
| note | String? | Y | — | | |
| createdAt | DateTime | N | now() | | |
| parent | Asset | N | — | Relation | onDelete: Cascade |
| child | Asset | N | — | Relation | onDelete: Cascade |

Indexes/constraints: `@@unique([parentId, childId])`, `@@index([parentId])`, `@@index([childId])`.

### AssetDisposal  (`@@map("asset_disposals")`) — model comment: "การจำหน่ายทรัพย์สินออก (บริจาค / ขาย / ทำลาย / คืน vendor)"

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| assetId | Int | N | — | FK -> Asset.id | |
| asset | Asset | N | — | Relation | |
| method | DisposalMethod | N | — | | enum |
| disposalDate | DateTime | N | — | | |
| approvedBy | String? | Y | — | | comment: "ชื่อผู้อนุมัติ / เลขที่คำสั่ง" |
| approvalRef | String? | Y | — | | comment: "เอกสารอ้างอิง" |
| saleValue | Float? | Y | — | | comment: "ราคาขาย (ถ้าวิธีคือ SELL)" |
| recipientName | String? | Y | — | | comment: "ผู้รับบริจาค/ซื้อ" |
| notes | String? | Y | — | | |
| createdById | Int | N | — | FK -> AppUser.id | relation "DisposalCreatedBy" |
| createdBy | AppUser | N | — | Relation | |
| createdAt | DateTime | N | now() | | |

Indexes: `@@index([assetId])`, `@@index([disposalDate])`.

### AssetHistory  (`@@map("asset_history")`)

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| assetId | Int | N | — | FK -> Asset.id | relation "AssetHistoryAsset" |
| actionType | String | N | — | | |
| fromStatus | String? | Y | — | | |
| toStatus | String? | Y | — | | |
| fromOwner | String? | Y | — | | |
| toOwner | String? | Y | — | | |
| fromDept | String? | Y | — | | |
| toDept | String? | Y | — | | |
| fromLoc | String? | Y | — | | |
| toLoc | String? | Y | — | | |
| note | String? | Y | — | | |
| actorUserId | Int? | Y | — | FK -> AppUser.id | relation "ActorUser" |
| ownerUserId | Int? | Y | — | FK -> AppUser.id | relation "OwnerUser" |
| createdAt | DateTime | N | now() | | |
| actor | AppUser? | Y | — | Relation | |
| asset | Asset | N | — | Relation | |
| owner | AppUser? | Y | — | Relation | |

Indexes: `@@index([assetId])`.

---

## 3. Inventory

### InventoryItem  (`@@map("inventory_items")`)

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| name | String | N | — | | |
| category | String | N | — | | inline comment: Cable, Cartridge, Consumable, Other |
| brand | String? | Y | — | | |
| model | String? | Y | — | | |
| totalQuantity | Int | N | 0 | | |
| availableQuantity | Int | N | 0 | | |
| minStockLevel | Int | N | 0 | | |
| unit | String | N | — | | inline comment: ชิ้น, ม้วน, เส้น, ตลับ, etc. |
| location | String? | Y | — | | |
| remark | String? | Y | — | | |
| image | String? | Y | — | | |
| isActive | Boolean | N | true | | |
| createdAt | DateTime | N | now() | | |
| updatedAt | DateTime | N | @updatedAt | | |
| transactions | InventoryTransaction[] | — | — | Relation | |
| borrowItems | BorrowRequestItem[] | — | — | Relation | "InventoryBorrowItems" |

Indexes: `@@index([category, isActive])`, `@@index([name])`.

### InventoryTransaction  (`@@map("inventory_transactions")`)

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| itemId | Int | N | — | FK -> InventoryItem.id | |
| item | InventoryItem | N | — | Relation | onDelete: Cascade |
| action | String | N | — | | inline comment: checkin, checkout |
| quantity | Int | N | — | | |
| userId | Int? | Y | — | | plain Int, no `@relation` declared (not a Prisma-enforced FK) |
| userName | String? | Y | — | | |
| note | String? | Y | — | | |
| refNo | String? | Y | — | | inline comment: Reference number (e.g. borrow request no) |
| createdAt | DateTime | N | now() | | |

Indexes: `@@index([itemId])`, `@@index([createdAt])`.

---

## 4. Borrow Workflow

### BorrowRequest  (`@@map("borrow_requests")`)

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| requestNo | String | N | — | Unique | |
| requesterUserId | Int | N | — | FK -> AppUser.id | |
| departmentId | String? | Y | — | | free-text, not FK |
| purpose | String? | Y | — | | |
| status | BorrowRequestStatus | N | Pending | | enum — includes `PendingSupervisor` (supervisor-approval stage) |
| note | String? | Y | — | | |
| createdAt | DateTime | N | now() | | |
| updatedAt | DateTime | N | @updatedAt | | |
| approvals | BorrowApproval[] | — | — | Relation | |
| extensions | BorrowExtension[] | — | — | Relation | |
| items | BorrowRequestItem[] | — | — | Relation | |
| requester | AppUser | N | — | Relation | |
| checkouts | Checkout[] | — | — | Relation | |

Indexes: `@@index([requesterUserId, status])`, `@@index([status, createdAt])`, `@@index([departmentId])`.

### BorrowRequestItem  (`@@map("borrow_request_items")`)

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| requestId | Int | N | — | FK -> BorrowRequest.id | |
| assetId | Int? | Y | — | FK -> Asset.id | nullable — item may be quantity-based inventory instead |
| inventoryItemId | Int? | Y | — | FK -> InventoryItem.id | relation "InventoryBorrowItems" |
| isQuantityBased | Boolean | N | false | | |
| quantity | Int | N | 1 | | |
| borrowDate | DateTime? | Y | — | | |
| dueDate | DateTime? | Y | — | | |
| itemStatus | BorrowItemStatus | N | Pending | | enum |
| note | String? | Y | — | | |
| extensions | BorrowExtensionItem[] | — | — | Relation | |
| asset | Asset? | Y | — | Relation | |
| inventoryItem | InventoryItem? | Y | — | Relation | |
| request | BorrowRequest | N | — | Relation | |
| returns | Return[] | — | — | Relation | |

Indexes: `@@index([assetId, itemStatus, dueDate])`, `@@index([requestId, itemStatus])`, `@@index([dueDate, itemStatus])`, `@@index([inventoryItemId])`.

### BorrowApproval  (`@@map("borrow_approvals")`)

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| requestId | Int | N | — | FK -> BorrowRequest.id | |
| approverUserId | Int | N | — | FK -> AppUser.id | |
| action | String | N | — | | |
| note | String? | Y | — | | |
| stage | ApprovalStage | N | ITAdmin | | enum: Supervisor / ITAdmin — added for the supervisor-approval feature |
| actedAt | DateTime | N | now() | | |
| approver | AppUser | N | — | Relation | |
| request | BorrowRequest | N | — | Relation | |

No `@@index`/`@@unique` beyond implicit PK.

### Checkout  (`@@map("checkouts")`)

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| requestId | Int | N | — | FK -> BorrowRequest.id | |
| checkoutBy | Int | N | — | FK -> AppUser.id | |
| receivedBy | String? | Y | — | | |
| checkoutAt | DateTime | N | now() | | |
| handoverNote | String? | Y | — | | |
| signatureData | String? | Y | — | | Comment: "Base64 PNG data URL from the on-screen signature pad — small enough (a few KB) that storing it as text alongside the row is reasonable, unlike the photo evidence below which goes to disk like every other evidence-photo model in this schema (see MaintenanceImage)." |
| checker | AppUser | N | — | Relation | |
| request | BorrowRequest | N | — | Relation | |
| images | CheckoutImage[] | — | — | Relation | |

### CheckoutImage  (`@@map("checkout_images")`)

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| checkoutId | Int | N | — | FK -> Checkout.id | onDelete: Cascade |
| checkout | Checkout | N | — | Relation | |
| imageUrl | String | N | — | | disk-stored evidence photo |
| description | String? | Y | — | | |
| createdAt | DateTime | N | now() | | |

### Return  (`@@map("returns")`)

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| requestItemId | Int | N | — | FK -> BorrowRequestItem.id | |
| returnBy | Int | N | — | FK -> AppUser.id | |
| returnedAt | DateTime | N | now() | | |
| condition | ReturnCondition | N | — | | enum, includes `Lost` |
| damageNote | String? | Y | — | | |
| accessoriesNote | String? | Y | — | | |
| receiverName | String? | Y | — | | |
| signatureData | String? | Y | — | | base64 PNG signature, same pattern as Checkout.signatureData |
| requestItem | BorrowRequestItem | N | — | Relation | |
| returner | AppUser | N | — | Relation | |
| images | ReturnImage[] | — | — | Relation | |

### ReturnImage  (`@@map("return_images")`)

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| returnId | Int | N | — | FK -> Return.id | onDelete: Cascade |
| return | Return | N | — | Relation | |
| imageUrl | String | N | — | | |
| description | String? | Y | — | | |
| createdAt | DateTime | N | now() | | |

### BorrowExtension  (`@@map("borrow_extensions")`)

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| requestId | Int | N | — | FK -> BorrowRequest.id | |
| requestedBy | Int | N | — | FK -> AppUser.id | |
| status | ExtensionStatus | N | Pending | | enum |
| reason | String? | Y | — | | |
| createdAt | DateTime | N | now() | | |
| decidedAt | DateTime? | Y | — | | |
| decidedBy | Int? | Y | — | | plain Int, no `@relation` declared |
| decisionNote | String? | Y | — | | |
| items | BorrowExtensionItem[] | — | — | Relation | |
| request | BorrowRequest | N | — | Relation | |
| requester | AppUser | N | — | Relation | |

### BorrowExtensionItem  (`@@map("borrow_extension_items")`)

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| extensionId | Int | N | — | FK -> BorrowExtension.id | |
| requestItemId | Int | N | — | FK -> BorrowRequestItem.id | |
| oldDueDate | DateTime | N | — | | |
| requestedDueDate | DateTime | N | — | | |
| extraDays | Int | N | — | | |
| extension | BorrowExtension | N | — | Relation | |
| requestItem | BorrowRequestItem | N | — | Relation | |

---

## 5. Maintenance & PM

### MaintenanceRecord  (`@@map("maintenance_records")`)

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| ticketNo | String | N | — | Unique | |
| assetId | Int | N | — | FK -> Asset.id | |
| asset | Asset | N | — | Relation | |
| reportedProblem | String | N | — | | |
| repairType | String | N | — | | |
| vendorName | String? | Y | — | | |
| resolutionNote | String? | Y | — | | |
| totalCost | Float | N | 0 | | |
| status | String | N | "IN_PROGRESS" | | plain String, not an enum |
| startedAt | DateTime | N | now() | | |
| completedAt | DateTime? | Y | — | | |
| technicianId | Int | N | — | FK -> AppUser.id | |
| technician | AppUser | N | — | Relation | |
| replacedParts | MaintenancePart[] | — | — | Relation | |
| images | MaintenanceImage[] | — | — | Relation | |

### MaintenancePart  (`@@map("maintenance_parts")`)

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| recordId | Int | N | — | FK -> MaintenanceRecord.id | onDelete: Cascade |
| record | MaintenanceRecord | N | — | Relation | |
| partName | String | N | — | | |
| quantity | Int | N | 1 | | |
| price | Float | N | 0 | | |

### MaintenanceImage  (`@@map("maintenance_images")`)

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| recordId | Int | N | — | FK -> MaintenanceRecord.id | onDelete: Cascade |
| record | MaintenanceRecord | N | — | Relation | |
| imageType | String | N | — | | |
| imageUrl | String | N | — | | |
| description | String? | Y | — | | |
| createdAt | DateTime | N | now() | | |

### PMTemplate  (`@@map("pm_templates")`)

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| year | Int | N | — | | |
| name | String | N | — | | |
| description | String? | Y | — | | |
| active | Boolean | N | true | | |
| plans | PMPlan[] | — | — | Relation | |
| templateItems | PMTemplateItem[] | — | — | Relation | |

### PMTemplateItem  (`@@map("pm_template_items")`)

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| templateId | Int | N | — | FK -> PMTemplate.id | |
| key | String | N | — | | |
| label | String | N | — | | |
| type | String | N | — | | checklist item input type (plain string) |
| required | Boolean | N | false | | |
| group | String? | Y | — | | |
| order | Int | N | 0 | | |
| answers | PMRunAnswer[] | — | — | Relation | |
| template | PMTemplate | N | — | Relation | |

### PMPlan  (`@@map("pm_plans")`)

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| year | Int | N | — | | |
| site | String? | Y | — | | |
| deptTask | String? | Y | — | | |
| company | String? | Y | — | | |
| lead | String? | Y | — | | |
| deviceType | String? | Y | — | | |
| plannedDeviceCount | Int | N | — | | |
| startDate | DateTime? | Y | — | | |
| endDate | DateTime? | Y | — | | |
| templateId | Int | N | — | FK -> PMTemplate.id | |
| isAdhoc | Boolean | N | false | | |
| template | PMTemplate | N | — | Relation | |
| runs | PMRun[] | — | — | Relation | |

Indexes: `@@index([year])`.

### PMRun  (`@@map("pm_runs")`)

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| planId | Int | N | — | FK -> PMPlan.id | |
| assetId | Int | N | — | FK -> Asset.id | |
| year | Int | N | — | | |
| status | PMRunStatus | N | DRAFT | | enum |
| performedBy | Int? | Y | — | FK -> AppUser.id | relation "PMRunPerformedBy" |
| performedAt | DateTime? | Y | — | | |
| completedAt | DateTime? | Y | — | | |
| photoUrl | String? | Y | — | | |
| notes | String? | Y | — | | added by migration `20260803000000_add_pm_run_notes` |
| createdAt | DateTime | N | now() | | |
| updatedAt | DateTime | N | @updatedAt, also @default(now()) | | double-annotated `@updatedAt @default(now())` in source |
| answers | PMRunAnswer[] | — | — | Relation | |
| asset | Asset | N | — | Relation | |
| performer | AppUser? | Y | — | Relation | |
| plan | PMPlan | N | — | Relation | |

Indexes/constraints: `@@unique([assetId, year], name: "unique_asset_year_completed")`, `@@index([planId, status])`, `@@index([assetId, year])`, `@@index([status, performedAt])`, `@@index([year, status])`.

### PMRunAnswer  (`@@map("pm_run_answers")`)

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| runId | Int | N | — | FK -> PMRun.id | |
| itemId | Int | N | — | FK -> PMTemplateItem.id | |
| value | String? | Y | — | | |
| item | PMTemplateItem | N | — | Relation | |
| run | PMRun | N | — | Relation | |

---

## 6. PM SW Hub

All four "hub" models track a separate PM checklist track for server/network-hub rooms (floor + period based, independent of the Asset-based PMRun flow above).

### PMSwHub  (`@@map("pm_sw_hubs")`)

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| planId | Int? | Y | — | FK -> PMSwHubPlan.id | onDelete: SetNull |
| formId | String | N | — | Unique | |
| floor | String | N | — | | |
| date | DateTime | N | — | | |
| technician | String | N | — | | |
| period | String | N | — | | |
| remark | String? | Y | — | | |
| signTech | String? | Y | — | | |
| signMgr | String? | Y | — | | |
| status | String | N | "Pending" | | inline comment: Pass, Fail, Pending |
| photoBeforeUrl | String? | Y | — | | |
| photoAfterUrl | String? | Y | — | | |
| createdAt | DateTime | N | now() | | |
| updatedAt | DateTime | N | @updatedAt | | |
| plan | PMSwHubPlan? | Y | — | Relation | |
| items | PMSwHubItem[] | — | — | Relation | |

### PMSwHubPlan  (`@@map("pm_sw_hub_plans")`)

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| year | Int | N | — | | |
| floor | String | N | — | | |
| period | String | N | — | | inline comment: 'Monthly' \| 'Quarterly' \| 'Annual' |
| startDate | DateTime? | Y | — | | |
| endDate | DateTime? | Y | — | | |
| technician | String? | Y | — | | |
| status | String | N | "Pending" | | inline comment: 'Pending', 'Completed' |
| templateId | Int? | Y | — | FK -> PMSwHubTemplate.id | onDelete: SetNull |
| createdAt | DateTime | N | now() | | |
| updatedAt | DateTime | N | @updatedAt | | |
| template | PMSwHubTemplate? | Y | — | Relation | |
| swHubs | PMSwHub[] | — | — | Relation | |

### PMSwHubItem  (`@@map("pm_sw_hub_items")`)

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| pmSwHubId | Int | N | — | FK -> PMSwHub.id | onDelete: Cascade |
| category | String | N | — | | |
| checkItem | String | N | — | | |
| status | String? | Y | — | | inline comment: pass, fail, na |
| note | String? | Y | — | | |
| photoUrl | String? | Y | — | | |
| resolveStatus | String? | Y | — | | inline comment: open, inprogress, resolved (only for fail) |
| resolvedAt | DateTime? | Y | — | | |
| pmSwHub | PMSwHub | N | — | Relation | |

### PMSwHubTemplate  (`@@map("pm_sw_hub_templates")`)

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| name | String | N | — | Unique | |
| description | String? | Y | — | | |
| isActive | Boolean | N | true | | |
| createdAt | DateTime | N | now() | | |
| updatedAt | DateTime | N | @updatedAt | | |
| items | PMSwHubTemplateItem[] | — | — | Relation | |
| plans | PMSwHubPlan[] | — | — | Relation | |

### PMSwHubTemplateItem  (`@@map("pm_sw_hub_template_items")`)

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| templateId | Int | N | — | FK -> PMSwHubTemplate.id | onDelete: Cascade |
| template | PMSwHubTemplate | N | — | Relation | |
| group | String | N | — | | inline comment: 'power', 'network', 'env', 'physical', 'cable' |
| key | String | N | — | | |
| label | String | N | — | | |
| type | String | N | "boolean" | | |
| required | Boolean | N | false | | |
| order | Int | N | 0 | | |

---

## 7. FloorPlan

### FloorPlan  (`@@map("floor_plans")`)

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| name | String | N | — | | |
| floor | String | N | — | | |
| building | String? | Y | — | | |
| company | String? | Y | — | | |
| imageUrl | String? | Y | — | | doc comment: "ไม่มีก็ได้ — ผังที่วาดเองใช้ผืนว่างแทน" (optional — a hand-drawn plan uses a blank canvas instead) |
| aspect | Float? | Y | — | | doc comment: "สัดส่วนผืนวาด (กว้าง/สูง) ใช้เมื่อไม่มีรูป" (canvas aspect ratio, used when there's no image) |
| isActive | Boolean | N | true | | |
| createdAt | DateTime | N | now() | | |
| updatedAt | DateTime | N | @updatedAt | | |
| pins | FloorPlanPin[] | — | — | Relation | |
| seats | FloorPlanSeat[] | — | — | Relation | |
| zones | FloorPlanZone[] | — | — | Relation | |

### FloorPlanPin  (`@@map("floor_plan_pins")`)

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| floorPlanId | Int | N | — | FK -> FloorPlan.id | onDelete: Cascade |
| floorPlan | FloorPlan | N | — | Relation | |
| assetId | Int | N | — | FK -> Asset.id | |
| asset | Asset | N | — | Relation | |
| x | Float | N | — | | |
| y | Float | N | — | | |
| label | String? | Y | — | | |
| createdAt | DateTime | N | now() | | |

Indexes/constraints: `@@unique([floorPlanId, assetId])`.

### FloorPlanSeat  (`@@map("floor_plan_seats")`)

Model doc comment: "ที่นั่งของคนบนแผนผัง อุปกรณ์ตามมาเองผ่าน ownerName ไม่ต้องปักทีละเครื่อง" (a person's seat on the plan — devices follow automatically via ownerName, no need to pin each device individually).

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| floorPlanId | Int | N | — | FK -> FloorPlan.id | onDelete: Cascade |
| floorPlan | FloorPlan | N | — | Relation | |
| x | Float | N | — | | |
| y | Float | N | — | | |
| label | String? | Y | — | | doc comment: "รหัสที่นั่งตามที่หน้างานเรียก เช่น \"22-A-05\"" |
| ownerName | String? | Y | — | | doc comment: "ตรงกับ Asset.ownerName — กุญแจที่ทำให้อุปกรณ์ตามคนไป" (matches Asset.ownerName — the key that makes devices follow the person); no formal FK, string-matched join |
| departmentId | String? | Y | — | | |
| note | String? | Y | — | | |
| zoneId | Int? | Y | — | FK -> FloorPlanZone.id | onDelete: SetNull; doc comment: "โซนที่ที่นั่งนี้เกาะอยู่ ถ้าเป็น null คือหมุดอิสระที่ยังไม่เข้าตาราง" (the zone this seat belongs to; null = a free-standing pin not yet placed in a grid) |
| zone | FloorPlanZone? | Y | — | Relation | |
| deskIndex | Int? | Y | — | | doc comment: "ลำดับช่องโต๊ะในโซน นับจาก 0 เรียงซ้ายไปขวาบนลงล่าง" (desk slot order within the zone, 0-based, left-to-right top-to-bottom) |
| createdAt | DateTime | N | now() | | |
| updatedAt | DateTime | N | @updatedAt, also @default(now()) | | double-annotated in source |

Indexes: `@@index([floorPlanId])`, `@@index([ownerName])`.

### FloorPlanTemplate  (`@@map("floor_plan_templates")`)

Model doc comment: "ชุดโซนที่เก็บไว้ใช้ซ้ำกับชั้นอื่น — ชั้นในตึกเดียวกันมักวางผังเหมือนกัน" (a saved set of zones reused across other floors — floors in the same building often share the same layout).

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| name | String | N | — | Unique | |
| description | String? | Y | — | | |
| company | String? | Y | — | | |
| aspect | Float? | Y | — | | |
| zones | Json | N | — | | doc comment: "ภาพนิ่งของโซน ณ เวลาที่บันทึก แก้โซนบนชั้นจริงทีหลังต้องไม่กระทบเทมเพลต" (a snapshot of zones at save time — later edits to the real floor's zones must not affect the template) |
| createdBy | String? | Y | — | | |
| createdAt | DateTime | N | now() | | |
| updatedAt | DateTime | N | @updatedAt, also @default(now()) | | double-annotated in source |

No relations — `zones` is a self-contained `Json` snapshot, not a Prisma relation to `FloorPlanZone`.

### FloorPlanZone  (`@@map("floor_plan_zones")`)

Model doc comment: "โซนแผนกบนแปลน ประกาศตารางโต๊ะของตัวเอง ระบบสร้างช่องให้ตาม cols x rows" (a department zone on the plan that declares its own desk grid; the system generates slots per cols x rows).

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| floorPlanId | Int | N | — | FK -> FloorPlan.id | onDelete: Cascade |
| floorPlan | FloorPlan | N | — | Relation | |
| code | String | N | — | | doc comment: "รหัสแผนกตามทะเบียน ใช้ตั้งรหัสโต๊ะ เช่น ACC-07" (department code per registry, used to name desks, e.g. ACC-07) |
| name | String? | Y | — | | |
| color | String? | Y | — | | |
| kind | String | N | "DESKS" | | doc comment: "DESKS = มีตารางโต๊ะให้คนนั่ง · ROOM = หมุดหมายอย่างห้องประชุม ลิฟต์ บันได" (DESKS = has a seating grid; ROOM = a landmark pin like meeting room, elevator, stairs) |
| x | Float | N | — | | |
| y | Float | N | — | | |
| w | Float | N | — | | |
| h | Float | N | — | | |
| cols | Int | N | 1 | | |
| rows | Int | N | 1 | | |
| sortOrder | Int | N | 0 | | |
| createdAt | DateTime | N | now() | | |
| updatedAt | DateTime | N | @updatedAt, also @default(now()) | | double-annotated in source |
| seats | FloorPlanSeat[] | — | — | Relation | |

Indexes/constraints: `@@unique([floorPlanId, code])`, `@@index([floorPlanId])`.

---

## 8. Donation

### Donation  (`@@map("donations")`)

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| batchRef | String | N | — | Unique | |
| donationDate | DateTime | N | — | | |
| recipientName | String | N | — | | |
| recipientAddress | String? | Y | — | | |
| recipientContact | String? | Y | — | | |
| recipientPhone | String? | Y | — | | |
| approvalRef | String? | Y | — | | |
| notes | String? | Y | — | | |
| status | DonationStatus | N | PENDING | | enum |
| createdById | Int | N | — | FK -> AppUser.id | |
| createdBy | AppUser | N | — | Relation | |
| items | DonationItem[] | — | — | Relation | |
| images | DonationImage[] | — | — | Relation | |
| createdAt | DateTime | N | now() | | |
| updatedAt | DateTime | N | @updatedAt | | |

### DonationItem  (`@@map("donation_items")`)

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| donationId | Int | N | — | FK -> Donation.id | onDelete: Cascade |
| donation | Donation | N | — | Relation | |
| assetId | Int | N | — | Unique, FK -> Asset.id | one-to-one — an asset can appear in at most one donation item |
| asset | Asset | N | — | Relation | |
| condition | String? | Y | — | | |
| notes | String? | Y | — | | |
| image | String? | Y | — | | `@db.Text` |
| createdAt | DateTime | N | now() | | |

### DonationImage  (`@@map("donation_images")`)

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| donationId | Int | N | — | FK -> Donation.id | onDelete: Cascade |
| donation | Donation | N | — | Relation | |
| image | String | N | — | | `@db.Text` |
| caption | String? | Y | — | | |
| createdAt | DateTime | N | now() | | |

---

## 9. Delivery

Header comment in schema: "New Devices & Delivery (เครื่องใหม่ & ส่งมอบ) — Phase A: register device + peripherals, deliver with a self-generated email-confirmation link (no Power Automate / MS Forms dependency — the confirmToken is resolved by a public, unauthenticated route+page)."

### DeliveryRequest  (`@@map("delivery_requests")`)

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| deliveryType | DeliveryType | N | NEW_PURCHASE | | enum |
| status | DeliveryStatus | N | DRAFT | | enum |
| assetId | Int? | Y | — | FK -> Asset.id | |
| asset | Asset? | Y | — | Relation | |
| recipientName | String | N | — | | |
| recipientEmail | String? | Y | — | | |
| recipientDept | String? | Y | — | | |
| recipientCompany | String? | Y | — | | |
| source | String? | Y | — | | |
| requestedBy | Int | N | — | FK -> AppUser.id | relation "DeliveryRequestedBy" |
| requester | AppUser | N | — | Relation | |
| installerId | Int? | Y | — | FK -> AppUser.id | relation "DeliveryInstalledBy" |
| installer | AppUser? | Y | — | Relation | |
| installedAt | DateTime? | Y | — | | |
| deliveredById | Int? | Y | — | FK -> AppUser.id | relation "DeliveryDeliveredBy" |
| deliveredBy | AppUser? | Y | — | Relation | |
| deliveredAt | DateTime? | Y | — | | |
| confirmToken | String? | Y | — | Unique | resolved by a public, unauthenticated route for email confirmation |
| confirmedAt | DateTime? | Y | — | | |
| confirmMethod | String? | Y | — | | |
| notes | String? | Y | — | | |
| peripherals | DeliveryPeripheralItem[] | — | — | Relation | |
| checklistRuns | DeliveryChecklistRun[] | — | — | Relation | |
| createdAt | DateTime | N | now() | | |
| updatedAt | DateTime | N | @updatedAt | | |

Indexes: `@@index([status])`.

### DeliveryPeripheralItem  (`@@map("delivery_peripheral_items")`)

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| requestId | Int | N | — | FK -> DeliveryRequest.id | onDelete: Cascade |
| request | DeliveryRequest | N | — | Relation | |
| category | String | N | — | | |
| itemName | String | N | — | | |
| serialNo | String? | Y | — | | |
| qty | Int | N | 1 | | |
| remark | String? | Y | — | | |
| prepared | Boolean | N | false | | |
| delivered | Boolean | N | false | | |

### DeliveryChecklistRun  (`@@map("delivery_checklist_runs")`)

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| requestId | Int | N | — | FK -> DeliveryRequest.id | onDelete: Cascade |
| request | DeliveryRequest | N | — | Relation | |
| checklistSetId | Int | N | — | FK -> ChecklistSet.id | |
| checklistSet | ChecklistSet | N | — | Relation | |
| status | String | N | "DRAFT" | | |
| performedBy | Int? | Y | — | FK -> AppUser.id | relation "DeliveryChecklistPerformedBy" |
| performer | AppUser? | Y | — | Relation | |
| performedAt | DateTime? | Y | — | | |
| completedAt | DateTime? | Y | — | | |
| createdAt | DateTime | N | now() | | |
| updatedAt | DateTime | N | @updatedAt | | |
| answers | DeliveryChecklistAnswer[] | — | — | Relation | |

Indexes: `@@index([requestId])`.

### DeliveryChecklistAnswer  (`@@map("delivery_checklist_answers")`)

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| runId | Int | N | — | FK -> DeliveryChecklistRun.id | onDelete: Cascade |
| run | DeliveryChecklistRun | N | — | Relation | |
| itemId | Int | N | — | FK -> ChecklistItem.id | |
| item | ChecklistItem | N | — | Relation | |
| value | String? | Y | — | | |
| note | String? | Y | — | | |

Indexes/constraints: `@@unique([runId, itemId])`.

---

## 10. Licenses & Contracts

Header comment in schema: "Phase 3: License & Contract management".

### SoftwareLicense  (`@@map("software_licenses")`)

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| name | String | N | — | | comment: "ชื่อซอฟต์แวร์ เช่น \"Microsoft 365 Business\"" |
| vendor | String? | Y | — | | |
| licenseType | String | N | "PERPETUAL" | | inline comment: PERPETUAL \| SUBSCRIPTION \| OEM \| VOLUME |
| totalSeats | Int | N | 1 | | comment: "จำนวนสิทธิ์รวม" |
| licenseKey | String? | Y | — | | comment: "serial / activation key (เข้ารหัสในอนาคต)" (to be encrypted in future) |
| purchaseDate | DateTime? | Y | — | | |
| expiryDate | DateTime? | Y | — | | comment: "null = ไม่มีวันหมดอายุ (perpetual)" |
| purchasePrice | Float? | Y | — | | |
| poNumber | String? | Y | — | | |
| notes | String? | Y | — | | |
| isActive | Boolean | N | true | | |
| createdAt | DateTime | N | now() | | |
| updatedAt | DateTime | N | @updatedAt | | |
| assignments | LicenseAssignment[] | — | — | Relation | |

Indexes: `@@index([expiryDate])`.

### LicenseAssignment  (`@@map("license_assignments")`)

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| licenseId | Int | N | — | FK -> SoftwareLicense.id | onDelete: Cascade |
| license | SoftwareLicense | N | — | Relation | |
| assetId | Int? | Y | — | *(no `@relation` — plain Int column, not a Prisma-enforced FK to Asset)* | modeling gap: intended to reference Asset.id but not wired as a relation |
| userId | Int? | Y | — | *(no `@relation` — plain Int column, not a Prisma-enforced FK to AppUser)* | same gap for AppUser.id |
| assignedAt | DateTime | N | now() | | |
| note | String? | Y | — | | |

Indexes/constraints: `@@unique([licenseId, assetId])`, `@@unique([licenseId, userId])`, `@@index([licenseId])`.

### Contract  (`@@map("contracts")`)

Model comment: "สัญญาและ warranty (MA, leasing, ประกัน)" (contracts and warranty: maintenance agreements, leasing, insurance).

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| title | String | N | — | | comment: "ชื่อสัญญา" |
| contractNo | String? | Y | — | Unique | |
| contractType | String | N | "WARRANTY" | | inline comment: WARRANTY \| MA \| LEASE \| INSURANCE \| SUPPORT |
| vendor | String? | Y | — | | |
| startDate | DateTime | N | — | | |
| endDate | DateTime | N | — | | comment: "วันหมดสัญญา — ระบบจะแจ้งเตือน 30/60/90 วันก่อน" (expiry date — system alerts 30/60/90 days ahead) |
| value | Float? | Y | — | | comment: "มูลค่าสัญญา (บาท)" |
| poNumber | String? | Y | — | | |
| notes | String? | Y | — | | |
| isActive | Boolean | N | true | | |
| createdAt | DateTime | N | now() | | |
| updatedAt | DateTime | N | @updatedAt | | |
| assets | ContractAsset[] | — | — | Relation | |

Indexes: `@@index([endDate, isActive])`.

### ContractAsset  (`@@map("contract_assets")`)

Model comment: "asset ที่อยู่ภายใต้สัญญา (one contract → many assets)".

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| contractId | Int | N | — | FK -> Contract.id | onDelete: Cascade |
| contract | Contract | N | — | Relation | |
| assetId | Int | N | — | FK -> Asset.id | onDelete: Restrict — an asset cannot be deleted while under contract |
| asset | Asset | N | — | Relation | |

Indexes/constraints: `@@unique([contractId, assetId])`, `@@index([contractId])`, `@@index([assetId])`.

---

## 11. Master Data

### Category  (`@@map("categories")`)

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| name | String | N | — | Unique | |
| icon | String | N | — | | |
| description | String? | Y | — | | |
| sortOrder | Int | N | 0 | | |
| isActive | Boolean | N | true | | |
| createdAt | DateTime | N | now() | | |
| updatedAt | DateTime | N | @updatedAt | | |
| types | CategoryType[] | — | — | Relation | |
| assets | Asset[] | — | — | Relation | |

### CategoryType  (`@@map("category_types")`)

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| categoryId | Int | N | — | FK -> Category.id | onDelete: Cascade |
| category | Category | N | — | Relation | |
| name | String | N | — | | |
| description | String? | Y | — | | |
| detailTable | String? | Y | — | | inline comment: "computer_details", "phone_details", etc. — names the 1:1 detail table this type maps to |
| isBorrowable | Boolean | N | true | | |
| isAssignable | Boolean | N | true | | |
| sortOrder | Int | N | 0 | | |
| isActive | Boolean | N | true | | |
| createdAt | DateTime | N | now() | | |
| updatedAt | DateTime | N | @updatedAt | | |

Indexes/constraints: `@@unique([categoryId, name])`.

### Company  (`@@map("companies")`)

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| code | String? | Y | — | Unique | |
| name | String | N | — | Unique | |
| nameEng | String? | Y | — | | |
| logoUrl | String? | Y | — | | |
| description | String? | Y | — | | |
| assetCompanyCodes | String? | Y | — | | |
| isActive | Boolean | N | true | | |
| createdAt | DateTime | N | now() | | |
| updatedAt | DateTime | N | @updatedAt | | |

No relation fields defined to Asset (Asset.company is a free-text string, not FK'd to Company).

### Department  (`@@map("departments")`)

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| name | String | N | — | Unique | |
| nameEng | String? | Y | — | | |
| code | String | N | — | Unique | |
| logoUrl | String? | Y | — | | |
| description | String? | Y | — | | |
| createdAt | DateTime | N | now() | | |
| updatedAt | DateTime | N | @updatedAt | | |
| assets | Asset[] | — | — | Relation | back-relation from Asset.departmentRefId |

### AssetLocation  (`@@map("asset_locations")`)

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| name | String | N | — | Unique | |
| description | String? | Y | — | | |
| isActive | Boolean | N | true | | |
| createdAt | DateTime | N | now() | | |
| updatedAt | DateTime | N | @updatedAt | | |
| company | String? | Y | — | | |
| assets | Asset[] | — | — | Relation | back-relation from Asset.locationRefId |

### Vendor  (`@@map("vendors")`)

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| name | String | N | — | Unique | |
| description | String? | Y | — | | |
| isActive | Boolean | N | true | | |
| createdAt | DateTime | N | now() | | |
| updatedAt | DateTime | N | @updatedAt | | |
| assets | Asset[] | — | — | Relation | back-relation from Asset.vendorRefId |

### AssetStatusMaster  (`@@map("asset_status_masters")`)

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| code | String | N | — | Unique | |
| name | String | N | — | | |
| description | String? | Y | — | | |
| isActive | Boolean | N | true | | |
| createdAt | DateTime | N | now() | | |
| updatedAt | DateTime | N | @updatedAt | | |

No relations defined — `Asset.status` uses the `AssetStatus` enum directly, not this table; this looks like a reference/lookup table not yet wired to Asset via FK.

### DeviceType  (`@@map("device_types")`)

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| name | String | N | — | Unique | |
| description | String? | Y | — | | |
| isActive | Boolean | N | true | | |
| createdAt | DateTime | N | now() | | |
| updatedAt | DateTime | N | @updatedAt | | |

No relations defined — not FK'd from Asset (Asset.type is a free-text string).

### Printer  (`@@map("printers")`)

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| floorArea | String | N | — | | |
| brandModel | String | N | — | | |
| serialNo | String? | Y | — | | |
| ipAddress | String? | Y | — | | |
| driver | String? | Y | — | | |
| pinNote | String? | Y | — | | |
| status | String | N | "active" | | |
| isActive | Boolean | N | true | | |
| createdAt | DateTime | N | now() | | |
| updatedAt | DateTime | N | @updatedAt | | |

No relations defined — standalone printer registry, separate from `PrinterDetail` (which is the 1:1 Asset detail table for printer-category assets).

### ChecklistSet  (`@@map("checklist_sets")`)

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| docCode | String | N | — | Unique | |
| name | String | N | — | | |
| appliesToCategories | String? | Y | — | | |
| itemCount | Int | N | 0 | | |
| categoryCount | Int | N | 0 | | |
| avgTimeLabel | String? | Y | — | | |
| revision | Int | N | 1 | | |
| isActive | Boolean | N | true | | |
| createdAt | DateTime | N | now() | | |
| updatedAt | DateTime | N | @updatedAt | | |
| items | ChecklistItem[] | — | — | Relation | |
| checklistRuns | DeliveryChecklistRun[] | — | — | Relation | |

### ChecklistItem  (`@@map("checklist_items")`)

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| setId | Int | N | — | FK -> ChecklistSet.id | onDelete: Cascade |
| set | ChecklistSet | N | — | Relation | |
| category | String | N | — | | |
| refCode | String | N | — | | |
| itemText | String | N | — | | |
| answerType | String | N | "PASS_FAIL_NA" | | |
| sortOrder | Int | N | 0 | | |
| createdAt | DateTime | N | now() | | |
| updatedAt | DateTime | N | @updatedAt | | |
| answers | DeliveryChecklistAnswer[] | — | — | Relation | |

Indexes: `@@index([setId, sortOrder])`.

---

## 12. Notifications & System

### NotificationTemplate  (`@@map("notification_templates")`)

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| key | String | N | — | | |
| channel | NotificationChannel | N | — | | enum |
| subjectTh | String | N | — | | Thai-language subject line |
| bodyTh | String | N | — | | Thai-language body |

Indexes/constraints: `@@unique([key, channel])`.

### NotificationOutbox  (`@@map("notification_outbox")`)

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| eventType | String | N | — | | |
| channel | NotificationChannel | N | — | | enum |
| recipient | String | N | — | | |
| payloadJson | String | N | — | | |
| status | NotificationStatus | N | PENDING | | enum |
| retryCount | Int | N | 0 | | |
| lastError | String? | Y | — | | |
| createdAt | DateTime | N | now() | | |
| sentAt | DateTime? | Y | — | | |

Indexes: `@@index([status, channel])`, `@@index([createdAt])`.

### AppNotification  (`@@map("app_notifications")`)

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| userId | Int | N | — | FK -> AppUser.id | onDelete: Cascade |
| title | String | N | — | | |
| message | String | N | — | | |
| isRead | Boolean | N | false | | |
| type | String | N | "SYSTEM" | | |
| link | String? | Y | — | | |
| createdAt | DateTime | N | now() | | |
| user | AppUser | N | — | Relation | |

Indexes: `@@index([userId, isRead])`.

### NotificationSetting  (`@@map("notification_settings")`)

Singleton-style settings table (no natural key beyond `id`; app code is expected to keep exactly one row).

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| systemName | String | N | "ITAM" | | General section |
| organizationName | String | N | "TRR Group" | | |
| logoUrl | String? | Y | — | | |
| timezone | String | N | "Asia/Bangkok" | | |
| darkMode | Boolean | N | false | | |
| showWelcomeBanner | Boolean | N | true | | |
| borrowDays | Int | N | 3 | | Borrow Rules section |
| maxBorrowDays | Int | N | 30 | | |
| maxItemsPerRequest | Int | N | 5 | | |
| allowExtension | Boolean | N | true | | |
| maxExtensionsPerRequest | Int | N | 2 | | |
| overdueWarningDays | Int | N | 3 | | |
| enableEmail | Boolean | N | true | | Notifications section |
| enableTeams | Boolean | N | false | | |
| teamsWebhookUrl | String? | Y | — | | |
| enabledEventKeys | String | N | "borrow_pending_supervisor,borrow_supervisor_approved,borrow_rejected_by_supervisor,borrow_request_pending,borrow_approved,borrow_rejected,checkout_completed,return_recorded,overdue_borrow,extension_pending,extension_approved,extension_rejected,pm_overdue" | | comma-separated list of enabled event keys; includes the three supervisor-approval event keys added alongside the `PendingSupervisor`/`Supervisor` workflow |
| smtpHost | String? | Y | — | | SMTP section (can override env vars) |
| smtpPort | String | N | "587" | | |
| smtpUser | String? | Y | — | | |
| smtpPass | String? | Y | — | | stored in plaintext in this table |
| smtpFromEmail | String? | Y | — | | |
| smtpFromName | String? | Y | — | | |
| emailCc | String? | Y | — | | |
| enableLine | Boolean | N | false | | LINE section |
| lineChannelAccessToken | String? | Y | — | | stored in plaintext |
| lineWebhookUrl | String? | Y | — | | |
| lineWebhookVerifyToken | String? | Y | — | | |
| lineSendMode | String | N | "broadcast" | | |
| lineUserIds | String? | Y | — | | |
| lineEnabledStatuses | String | N | "รอรับเรื่อง,รับเรื่องแล้ว,กำลังดำเนินการ,รอชิ้นส่วน,เสร็จสิ้น,ยกเลิก" | | Thai status labels, comma-separated |
| requireStrongPassword | Boolean | N | true | | Security section |
| passwordExpiryDays | Int | N | 90 | | |
| sessionTimeoutHours | Int | N | 8 | | |

No relations, no additional indexes.

### SystemSetting

No `@@map` — table name is the Prisma default (`SystemSetting`, or as Prisma's default casing produces it) since this model has no explicit `@@map` directive, unlike every other model in the file.

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| group | String | N | "GENERAL" | | inline comment: e.g., 'ASSET_GENERATION' |
| key | String | N | — | Unique | |
| value | String | N | — | | inline comment: JSON text or plain string |
| description | String? | Y | — | | |
| updatedAt | DateTime | N | @updatedAt | | |
| updatedBy | Int? | Y | — | | inline comment: User ID who last updated; plain Int, no `@relation` declared |

No indexes beyond the implicit PK and the `key` unique constraint.

### ScheduledJob  (`@@map("scheduled_jobs")`)

| Column | Type | Nullable? | Default | Unique/PK/FK | Notes |
|---|---|---|---|---|---|
| id | Int | N | autoincrement() | PK | |
| jobType | String | N | — | | |
| status | String | N | — | | |
| result | String? | Y | — | | |
| startedAt | DateTime | N | now() | | |
| completedAt | DateTime? | Y | — | | |

No relations, no additional indexes.

---

## Consolidated Relationship List (every FK, both directions)

Format: `Owner.fkColumn -> Target.field (cardinality)`; the reverse navigation property is named in parentheses.

**User & Access**
- `AppUser.managerId -> AppUser.id` (many-to-one, self-relation "ManagerHierarchy"; reverse: `AppUser.directReports` one-to-many)
- `LoginLog.userId -> AppUser.id` (many-to-one; reverse: `AppUser.loginLogs`)

**Asset Core**
- `Asset.categoryId -> Category.id` (many-to-one; reverse: `Category.assets`)
- `Asset.assignedToUserId -> AppUser.id` ("AssetAssignedTo", many-to-one; reverse: `AppUser.assignedAssets`)
- `Asset.departmentRefId -> Department.id` (many-to-one; reverse: `Department.assets`)
- `Asset.vendorRefId -> Vendor.id` (many-to-one; reverse: `Vendor.assets`)
- `Asset.locationRefId -> AssetLocation.id` (many-to-one; reverse: `AssetLocation.assets`)
- `ComputerDetail.assetId -> Asset.id` (one-to-one; reverse: `Asset.computerDetail`)
- `PhoneDetail.assetId -> Asset.id` (one-to-one; reverse: `Asset.phoneDetail`)
- `MonitorDetail.assetId -> Asset.id` (one-to-one; reverse: `Asset.monitorDetail`)
- `DeviceDetail.assetId -> Asset.id` (one-to-one; reverse: `Asset.deviceDetail`)
- `NetworkDeviceDetail.assetId -> Asset.id` (one-to-one; reverse: `Asset.networkDeviceDetail`)
- `RackDetail.assetId -> Asset.id` (one-to-one; reverse: `Asset.rackDetail`)
- `PrinterDetail.assetId -> Asset.id` (one-to-one; reverse: `Asset.printerDetail`)
- `CableDetail.assetId -> Asset.id` (one-to-one; reverse: `Asset.cableDetail`)
- `ConsumableDetail.assetId -> Asset.id` (one-to-one; reverse: `Asset.consumableDetail`)
- `AssetDocument.assetId -> Asset.id` (many-to-one; reverse: `Asset.documents`)
- `AssetLink.parentId -> Asset.id` ("LinkParent", many-to-one; reverse: `Asset.linkedChildren`)
- `AssetLink.childId -> Asset.id` ("LinkChild", many-to-one; reverse: `Asset.linkedParent`)
- `AssetDisposal.assetId -> Asset.id` (many-to-one; reverse: `Asset.disposals`)
- `AssetDisposal.createdById -> AppUser.id` ("DisposalCreatedBy", many-to-one; reverse: `AppUser.disposalsCreated`)
- `AssetHistory.assetId -> Asset.id` ("AssetHistoryAsset", many-to-one; reverse: `Asset.assetHistory`)
- `AssetHistory.actorUserId -> AppUser.id` ("ActorUser", many-to-one; reverse: `AppUser.assetHistory`)
- `AssetHistory.ownerUserId -> AppUser.id` ("OwnerUser", many-to-one; reverse: `AppUser.assetHistoryOwner`)

**Inventory**
- `InventoryTransaction.itemId -> InventoryItem.id` (many-to-one; reverse: `InventoryItem.transactions`)
- `BorrowRequestItem.inventoryItemId -> InventoryItem.id` ("InventoryBorrowItems", many-to-one; reverse: `InventoryItem.borrowItems`)

**Borrow Workflow**
- `BorrowRequest.requesterUserId -> AppUser.id` (many-to-one; reverse: `AppUser.borrowRequests`)
- `BorrowRequestItem.requestId -> BorrowRequest.id` (many-to-one; reverse: `BorrowRequest.items`)
- `BorrowRequestItem.assetId -> Asset.id` (many-to-one, nullable; reverse: `Asset.borrowRequestItems`)
- `BorrowApproval.requestId -> BorrowRequest.id` (many-to-one; reverse: `BorrowRequest.approvals`)
- `BorrowApproval.approverUserId -> AppUser.id` (many-to-one; reverse: `AppUser.borrowApprovals`)
- `Checkout.requestId -> BorrowRequest.id` (many-to-one; reverse: `BorrowRequest.checkouts`)
- `Checkout.checkoutBy -> AppUser.id` (many-to-one; reverse: `AppUser.checkouts`)
- `CheckoutImage.checkoutId -> Checkout.id` (many-to-one; reverse: `Checkout.images`)
- `Return.requestItemId -> BorrowRequestItem.id` (many-to-one; reverse: `BorrowRequestItem.returns`)
- `Return.returnBy -> AppUser.id` (many-to-one; reverse: `AppUser.returns`)
- `ReturnImage.returnId -> Return.id` (many-to-one; reverse: `Return.images`)
- `BorrowExtension.requestId -> BorrowRequest.id` (many-to-one; reverse: `BorrowRequest.extensions`)
- `BorrowExtension.requestedBy -> AppUser.id` (many-to-one; reverse: `AppUser.extensionRequests`)
- `BorrowExtensionItem.extensionId -> BorrowExtension.id` (many-to-one; reverse: `BorrowExtension.items`)
- `BorrowExtensionItem.requestItemId -> BorrowRequestItem.id` (many-to-one; reverse: `BorrowRequestItem.extensions`)

**Maintenance & PM**
- `MaintenanceRecord.assetId -> Asset.id` (many-to-one; reverse: `Asset.maintenanceRecords`)
- `MaintenanceRecord.technicianId -> AppUser.id` (many-to-one; reverse: `AppUser.maintenanceRecords`)
- `MaintenancePart.recordId -> MaintenanceRecord.id` (many-to-one; reverse: `MaintenanceRecord.replacedParts`)
- `MaintenanceImage.recordId -> MaintenanceRecord.id` (many-to-one; reverse: `MaintenanceRecord.images`)
- `PMTemplateItem.templateId -> PMTemplate.id` (many-to-one; reverse: `PMTemplate.templateItems`)
- `PMPlan.templateId -> PMTemplate.id` (many-to-one; reverse: `PMTemplate.plans`)
- `PMRun.planId -> PMPlan.id` (many-to-one; reverse: `PMPlan.runs`)
- `PMRun.assetId -> Asset.id` (many-to-one; reverse: `Asset.pmRuns`)
- `PMRun.performedBy -> AppUser.id` ("PMRunPerformedBy", many-to-one, nullable; reverse: `AppUser.pmRunsPerformed`)
- `PMRunAnswer.runId -> PMRun.id` (many-to-one; reverse: `PMRun.answers`)
- `PMRunAnswer.itemId -> PMTemplateItem.id` (many-to-one; reverse: `PMTemplateItem.answers`)

**PM SW Hub**
- `PMSwHub.planId -> PMSwHubPlan.id` (many-to-one, nullable, onDelete SetNull; reverse: `PMSwHubPlan.swHubs`)
- `PMSwHubPlan.templateId -> PMSwHubTemplate.id` (many-to-one, nullable, onDelete SetNull; reverse: `PMSwHubTemplate.plans`)
- `PMSwHubItem.pmSwHubId -> PMSwHub.id` (many-to-one; reverse: `PMSwHub.items`)
- `PMSwHubTemplateItem.templateId -> PMSwHubTemplate.id` (many-to-one; reverse: `PMSwHubTemplate.items`)

**FloorPlan**
- `FloorPlanPin.floorPlanId -> FloorPlan.id` (many-to-one; reverse: `FloorPlan.pins`)
- `FloorPlanPin.assetId -> Asset.id` (many-to-one; reverse: `Asset.floorPlanPins`)
- `FloorPlanSeat.floorPlanId -> FloorPlan.id` (many-to-one; reverse: `FloorPlan.seats`)
- `FloorPlanSeat.zoneId -> FloorPlanZone.id` (many-to-one, nullable, onDelete SetNull; reverse: `FloorPlanZone.seats`)
- `FloorPlanZone.floorPlanId -> FloorPlan.id` (many-to-one; reverse: `FloorPlan.zones`)
- (`FloorPlanSeat.ownerName` <-> `Asset.ownerName` is a **string-matched join, not a real FK** — this is how devices "follow" a seat)
- (`FloorPlanTemplate.zones` is a `Json` snapshot, not a relation)

**Donation**
- `Donation.createdById -> AppUser.id` (many-to-one; reverse: `AppUser.donations`)
- `DonationItem.donationId -> Donation.id` (many-to-one; reverse: `Donation.items`)
- `DonationItem.assetId -> Asset.id` (one-to-one, unique; reverse: `Asset.donationItem`)
- `DonationImage.donationId -> Donation.id` (many-to-one; reverse: `Donation.images`)

**Delivery**
- `DeliveryRequest.assetId -> Asset.id` (many-to-one, nullable; reverse: `Asset.deliveryRequests`)
- `DeliveryRequest.requestedBy -> AppUser.id` ("DeliveryRequestedBy", many-to-one; reverse: `AppUser.deliveryRequested`)
- `DeliveryRequest.installerId -> AppUser.id` ("DeliveryInstalledBy", many-to-one, nullable; reverse: `AppUser.deliveryInstalled`)
- `DeliveryRequest.deliveredById -> AppUser.id` ("DeliveryDeliveredBy", many-to-one, nullable; reverse: `AppUser.deliveryDelivered`)
- `DeliveryPeripheralItem.requestId -> DeliveryRequest.id` (many-to-one; reverse: `DeliveryRequest.peripherals`)
- `DeliveryChecklistRun.requestId -> DeliveryRequest.id` (many-to-one; reverse: `DeliveryRequest.checklistRuns`)
- `DeliveryChecklistRun.checklistSetId -> ChecklistSet.id` (many-to-one; reverse: `ChecklistSet.checklistRuns`)
- `DeliveryChecklistRun.performedBy -> AppUser.id` ("DeliveryChecklistPerformedBy", many-to-one, nullable; reverse: `AppUser.checklistRunsPerformed`)
- `DeliveryChecklistAnswer.runId -> DeliveryChecklistRun.id` (many-to-one; reverse: `DeliveryChecklistRun.answers`)
- `DeliveryChecklistAnswer.itemId -> ChecklistItem.id` (many-to-one; reverse: `ChecklistItem.answers`)

**Licenses & Contracts**
- `LicenseAssignment.licenseId -> SoftwareLicense.id` (many-to-one; reverse: `SoftwareLicense.assignments`)
- `LicenseAssignment.assetId` and `LicenseAssignment.userId` are plain nullable `Int` columns **without** `@relation` — not enforced FKs in Prisma (application-level join only)
- `ContractAsset.contractId -> Contract.id` (many-to-one; reverse: `Contract.assets`)
- `ContractAsset.assetId -> Asset.id` (many-to-one, onDelete Restrict; reverse: `Asset.contractAssets`)

**Master Data**
- `CategoryType.categoryId -> Category.id` (many-to-one; reverse: `Category.types`)
- `ChecklistItem.setId -> ChecklistSet.id` (many-to-one; reverse: `ChecklistSet.items`)

**Notifications & System**
- `AppNotification.userId -> AppUser.id` (many-to-one; reverse: `AppUser.notifications`)

**Non-FK "loose" foreign-key-shaped columns found in the schema** (plain `Int`/`Int?` with no `@relation`, so Prisma does not enforce referential integrity — flagged because they look like FKs at a glance):
- `InventoryTransaction.userId`
- `BorrowExtension.decidedBy`
- `LicenseAssignment.assetId`, `LicenseAssignment.userId`
- `SystemSetting.updatedBy`

---

## All Enums

15 enums total.

| Enum | Values (verbatim) | Used by |
|---|---|---|
| `DisposalMethod` | `DONATE` (บริจาค), `SELL` (ขายซาก), `DESTROY` (ทำลาย/e-waste), `RETURN` (คืน vendor / leasing), `TRANSFER` (โอนย้ายภายใน) | `AssetDisposal.method` |
| `DeliveryType` | `NEW_PURCHASE`, `RECYCLED`, `TEMP_REPLACEMENT` | `DeliveryRequest.deliveryType` |
| `DeliveryStatus` | `DRAFT`, `SETUP_IN_PROGRESS`, `SETUP_DONE`, `PENDING_DELIVERY`, `DELIVERED`, `CONFIRMED`, `RETURN_REQUESTED`, `RETURNED` | `DeliveryRequest.status` |
| `DonationStatus` | `PENDING`, `COMPLETED`, `CANCELLED` | `Donation.status` |
| `UserRole` | `SUPERADMIN`, `IT_ADMIN`, `USER`, `VIEWER`, `HR_CUSTODY` | `AppUser.role` |
| `AuthType` | `AD`, `LOCAL` | `AppUser.authType` |
| `AssetStatus` | `Available`, `Borrowed`, `InUse`, `Maintenance`, `Damaged`, `Retired`, `Lost` | `Asset.status` |
| `BorrowItemStatus` | `Pending`, `Approved`, `Rejected`, `CheckedOut`, `Returned`, `PartiallyReturned`, `Cancelled` | `BorrowRequestItem.itemStatus` |
| `BorrowRequestStatus` | `PendingSupervisor`, `Pending`, `Approved`, `Rejected`, `CheckedOut`, `PartiallyReturned`, `Returned`, `Cancelled` | `BorrowRequest.status` |
| `ApprovalStage` | `Supervisor`, `ITAdmin` | `BorrowApproval.stage` |
| `ExtensionStatus` | `Pending`, `Approved`, `Rejected` | `BorrowExtension.status` |
| `PMRunStatus` | `DRAFT`, `IN_PROGRESS`, `COMPLETED` | `PMRun.status` |
| `ReturnCondition` | `Normal`, `Damaged`, `Repairing`, `AccessoryIncomplete`, `Lost` | `Return.condition` |
| `NotificationChannel` | `EMAIL`, `TEAMS`, `LINE` | `NotificationTemplate.channel`, `NotificationOutbox.channel` |
| `NotificationStatus` | `PENDING`, `SENT`, `FAILED` | `NotificationOutbox.status` |

Note: `UserRole.HR_CUSTODY` and migration `20260819000001_add_hr_custody_role` correspond to a now-removed custody feature (`20260823120000_drop_asset_custody` dropped the custody tables), but the enum value itself is still present in the schema — the role was not rolled back.

---

## Indexes (`@@index`) and Unique constraints (`@@unique` / field-level `@unique`) — full list per model

| Model | `@@index` | `@@unique` / composite unique | Field-level `@unique` |
|---|---|---|---|
| AppUser | `[role, isActive]`, `[department]`, `[managerId]` | — | `adUsername` |
| Asset | `[status, departmentId, location]`, `[type, brand]`, `[status, createdAt]`, `[departmentId]`, `[departmentRefId]`, `[vendorRefId]`, `[locationRefId]`, `[categoryId]` | — | `assetCode`, `accountingCode`, `serialNo` |
| ComputerDetail | — | — | `assetId` |
| PhoneDetail | — | — | `assetId` |
| MonitorDetail | — | — | `assetId` |
| LoginLog | `[userId, createdAt]`, `[createdAt]`, `[ip]` | — | — |
| DeviceDetail | — | — | `assetId` |
| NetworkDeviceDetail | — | — | `assetId` |
| RackDetail | — | — | `assetId` |
| PrinterDetail | — | — | `assetId` |
| CableDetail | — | — | `assetId` |
| ConsumableDetail | — | — | `assetId` |
| AssetDocument | `[assetId]` | — | — |
| AssetLink | `[parentId]`, `[childId]` | `[parentId, childId]` | — |
| AssetDisposal | `[assetId]`, `[disposalDate]` | — | — |
| InventoryItem | `[category, isActive]`, `[name]` | — | — |
| InventoryTransaction | `[itemId]`, `[createdAt]` | — | — |
| DeviceType | — | — | `name` |
| Company | — | — | `code`, `name` |
| Department | — | — | `name`, `code` |
| Category | — | — | `name` |
| CategoryType | — | `[categoryId, name]` | — |
| AssetLocation | — | — | `name` |
| Vendor | — | — | `name` |
| AssetStatusMaster | — | — | `code` |
| Printer | — | — | — |
| ChecklistSet | — | — | `docCode` |
| ChecklistItem | `[setId, sortOrder]` | — | — |
| DeliveryChecklistRun | `[requestId]` | — | — |
| DeliveryChecklistAnswer | — | `[runId, itemId]` | — |
| AssetHistory | `[assetId]` | — | — |
| BorrowRequest | `[requesterUserId, status]`, `[status, createdAt]`, `[departmentId]` | — | `requestNo` |
| BorrowRequestItem | `[assetId, itemStatus, dueDate]`, `[requestId, itemStatus]`, `[dueDate, itemStatus]`, `[inventoryItemId]` | — | — |
| BorrowApproval | — | — | — |
| Checkout | — | — | — |
| CheckoutImage | — | — | — |
| Return | — | — | — |
| ReturnImage | — | — | — |
| BorrowExtension | — | — | — |
| BorrowExtensionItem | — | — | — |
| PMTemplate | — | — | — |
| PMTemplateItem | — | — | — |
| PMPlan | `[year]` | — | — |
| PMRun | `[planId, status]`, `[assetId, year]`, `[status, performedAt]`, `[year, status]` | `[assetId, year]` (named `unique_asset_year_completed`) | — |
| PMRunAnswer | — | — | — |
| DeliveryRequest | `[status]` | — | `confirmToken` |
| DeliveryPeripheralItem | — | — | — |
| NotificationTemplate | — | `[key, channel]` | — |
| NotificationOutbox | `[status, channel]`, `[createdAt]` | — | — |
| AppNotification | `[userId, isRead]` | — | — |
| NotificationSetting | — | — | — |
| SystemSetting | — | — | `key` |
| ScheduledJob | — | — | — |
| SoftwareLicense | `[expiryDate]` | — | — |
| LicenseAssignment | `[licenseId]` | `[licenseId, assetId]`, `[licenseId, userId]` | — |
| Contract | `[endDate, isActive]` | — | `contractNo` |
| ContractAsset | `[contractId]`, `[assetId]` | `[contractId, assetId]` | — |
| Donation | — | — | `batchRef` |
| DonationItem | — | — | `assetId` |
| DonationImage | — | — | — |
| MaintenanceRecord | — | — | `ticketNo` |
| MaintenancePart | — | — | — |
| MaintenanceImage | — | — | — |
| PMSwHub | — | — | `formId` |
| PMSwHubPlan | — | — | — |
| PMSwHubItem | — | — | — |
| PMSwHubTemplate | — | — | `name` |
| PMSwHubTemplateItem | — | — | — |
| FloorPlan | — | — | — |
| FloorPlanPin | — | `[floorPlanId, assetId]` | — |
| FloorPlanSeat | `[floorPlanId]`, `[ownerName]` | — | — |
| FloorPlanTemplate | — | — | `name` |
| FloorPlanZone | `[floorPlanId]` | `[floorPlanId, code]` | — |

---

## ER Diagrams

Split into 4 domain-scoped diagrams for readability (73 models total). Field lists in each diagram are abbreviated to PK/FK/notable columns — see the field-by-field tables above for full detail.

### 1. Asset Core (+ Master Data referenced by Asset)

```mermaid
erDiagram
    Asset ||--o| ComputerDetail : has
    Asset ||--o| PhoneDetail : has
    Asset ||--o| MonitorDetail : has
    Asset ||--o| DeviceDetail : has
    Asset ||--o| NetworkDeviceDetail : has
    Asset ||--o| RackDetail : has
    Asset ||--o| PrinterDetail : has
    Asset ||--o| CableDetail : has
    Asset ||--o| ConsumableDetail : has
    Asset ||--o{ AssetDocument : documents
    Asset ||--o{ AssetHistory : assetHistory
    Asset ||--o{ AssetDisposal : disposals
    Asset }o--o{ Asset : "AssetLink (parent/child)"
    Asset }o--|| Category : categoryId
    Asset }o--o| AppUser : assignedToUserId
    Asset }o--o| Department : departmentRefId
    Asset }o--o| Vendor : vendorRefId
    Asset }o--o| AssetLocation : locationRefId
    Category ||--o{ CategoryType : types
    AssetDisposal }o--|| AppUser : createdById
    AssetHistory }o--o| AppUser : actorUserId
    AssetHistory }o--o| AppUser : ownerUserId

    Asset {
        int id PK
        string assetCode UK
        string accountingCode UK
        string serialNo UK
        int categoryId FK
        int assignedToUserId FK
        int departmentRefId FK
        int vendorRefId FK
        int locationRefId FK
        AssetStatus status
    }
    ComputerDetail { int id PK, int assetId FK-UK }
    PhoneDetail { int id PK, int assetId FK-UK }
    MonitorDetail { int id PK, int assetId FK-UK }
    DeviceDetail { int id PK, int assetId FK-UK }
    NetworkDeviceDetail { int id PK, int assetId FK-UK }
    RackDetail { int id PK, int assetId FK-UK }
    PrinterDetail { int id PK, int assetId FK-UK }
    CableDetail { int id PK, int assetId FK-UK }
    ConsumableDetail { int id PK, int assetId FK-UK }
    AssetDocument { int id PK, int assetId FK }
    AssetHistory { int id PK, int assetId FK, int actorUserId FK, int ownerUserId FK }
    AssetDisposal { int id PK, int assetId FK, DisposalMethod method, int createdById FK }
    Category { int id PK, string name UK }
    CategoryType { int id PK, int categoryId FK }
    Department { int id PK, string name UK, string code UK }
    Vendor { int id PK, string name UK }
    AssetLocation { int id PK, string name UK }
    AppUser { int id PK, string adUsername UK }
```

### 2. Borrow Workflow

```mermaid
erDiagram
    AppUser ||--o{ BorrowRequest : requests
    BorrowRequest ||--o{ BorrowRequestItem : items
    BorrowRequest ||--o{ BorrowApproval : approvals
    BorrowRequest ||--o{ BorrowExtension : extensions
    BorrowRequest ||--o{ Checkout : checkouts
    BorrowRequestItem }o--o| Asset : assetId
    BorrowRequestItem }o--o| InventoryItem : inventoryItemId
    BorrowRequestItem ||--o{ Return : returns
    BorrowRequestItem ||--o{ BorrowExtensionItem : extensions
    BorrowExtension ||--o{ BorrowExtensionItem : items
    Checkout ||--o{ CheckoutImage : images
    Return ||--o{ ReturnImage : images
    InventoryItem ||--o{ InventoryTransaction : transactions
    AppUser ||--o{ BorrowApproval : approverUserId
    AppUser ||--o{ Checkout : checkoutBy
    AppUser ||--o{ Return : returnBy
    AppUser ||--o{ BorrowExtension : requestedBy

    BorrowRequest {
        int id PK
        string requestNo UK
        int requesterUserId FK
        BorrowRequestStatus status
    }
    BorrowRequestItem {
        int id PK
        int requestId FK
        int assetId FK
        int inventoryItemId FK
        BorrowItemStatus itemStatus
    }
    BorrowApproval { int id PK, int requestId FK, int approverUserId FK, ApprovalStage stage }
    Checkout { int id PK, int requestId FK, int checkoutBy FK, string signatureData }
    CheckoutImage { int id PK, int checkoutId FK }
    Return { int id PK, int requestItemId FK, int returnBy FK, ReturnCondition condition }
    ReturnImage { int id PK, int returnId FK }
    BorrowExtension { int id PK, int requestId FK, int requestedBy FK, ExtensionStatus status }
    BorrowExtensionItem { int id PK, int extensionId FK, int requestItemId FK }
    InventoryItem { int id PK, string name, int totalQuantity, int availableQuantity }
    InventoryTransaction { int id PK, int itemId FK, string action }
    Asset { int id PK }
    AppUser { int id PK }
```

### 3. Maintenance & PM (incl. PM SW Hub)

```mermaid
erDiagram
    Asset ||--o{ MaintenanceRecord : maintenanceRecords
    MaintenanceRecord ||--o{ MaintenancePart : replacedParts
    MaintenanceRecord ||--o{ MaintenanceImage : images
    MaintenanceRecord }o--|| AppUser : technicianId
    PMTemplate ||--o{ PMTemplateItem : templateItems
    PMTemplate ||--o{ PMPlan : plans
    PMPlan ||--o{ PMRun : runs
    PMRun }o--|| Asset : assetId
    PMRun }o--o| AppUser : performedBy
    PMRun ||--o{ PMRunAnswer : answers
    PMTemplateItem ||--o{ PMRunAnswer : answers
    PMSwHubTemplate ||--o{ PMSwHubTemplateItem : items
    PMSwHubTemplate ||--o{ PMSwHubPlan : plans
    PMSwHubPlan ||--o{ PMSwHub : swHubs
    PMSwHub ||--o{ PMSwHubItem : items

    MaintenanceRecord { int id PK, string ticketNo UK, int assetId FK, int technicianId FK }
    MaintenancePart { int id PK, int recordId FK }
    MaintenanceImage { int id PK, int recordId FK }
    PMTemplate { int id PK, int year, string name }
    PMTemplateItem { int id PK, int templateId FK }
    PMPlan { int id PK, int templateId FK, int year }
    PMRun { int id PK, int planId FK, int assetId FK, PMRunStatus status }
    PMRunAnswer { int id PK, int runId FK, int itemId FK }
    PMSwHub { int id PK, int planId FK, string formId UK, string status }
    PMSwHubPlan { int id PK, int templateId FK, int year }
    PMSwHubItem { int id PK, int pmSwHubId FK }
    PMSwHubTemplate { int id PK, string name UK }
    PMSwHubTemplateItem { int id PK, int templateId FK }
    Asset { int id PK }
    AppUser { int id PK }
```

### 4. Everything Else (User/Access, FloorPlan, Donation, Delivery, Licenses & Contracts, Master Data, Notifications & System)

```mermaid
erDiagram
    AppUser ||--o{ LoginLog : loginLogs
    AppUser ||--o{ AppNotification : notifications
    AppUser ||--o{ Donation : donations
    AppUser ||--o{ DeliveryRequest : "requested/installed/delivered"

    FloorPlan ||--o{ FloorPlanPin : pins
    FloorPlan ||--o{ FloorPlanSeat : seats
    FloorPlan ||--o{ FloorPlanZone : zones
    FloorPlanZone ||--o{ FloorPlanSeat : seats
    FloorPlanPin }o--|| Asset : assetId

    Donation ||--o{ DonationItem : items
    Donation ||--o{ DonationImage : images
    DonationItem ||--|| Asset : assetId

    DeliveryRequest ||--o{ DeliveryPeripheralItem : peripherals
    DeliveryRequest ||--o{ DeliveryChecklistRun : checklistRuns
    DeliveryRequest }o--o| Asset : assetId
    ChecklistSet ||--o{ ChecklistItem : items
    ChecklistSet ||--o{ DeliveryChecklistRun : checklistRuns
    DeliveryChecklistRun ||--o{ DeliveryChecklistAnswer : answers
    ChecklistItem ||--o{ DeliveryChecklistAnswer : answers

    SoftwareLicense ||--o{ LicenseAssignment : assignments
    Contract ||--o{ ContractAsset : assets
    ContractAsset }o--|| Asset : assetId

    NotificationOutbox }o--|| NotificationTemplate : "keyed by eventType/channel (no FK)"

    FloorPlan { int id PK, string name, string floor }
    FloorPlanPin { int id PK, int floorPlanId FK, int assetId FK }
    FloorPlanSeat { int id PK, int floorPlanId FK, int zoneId FK, string ownerName }
    FloorPlanZone { int id PK, int floorPlanId FK, string code }
    FloorPlanTemplate { int id PK, string name UK, json zones }
    Donation { int id PK, string batchRef UK, int createdById FK }
    DonationItem { int id PK, int donationId FK, int assetId FK-UK }
    DonationImage { int id PK, int donationId FK }
    DeliveryRequest { int id PK, DeliveryType deliveryType, DeliveryStatus status, string confirmToken UK }
    DeliveryPeripheralItem { int id PK, int requestId FK }
    ChecklistSet { int id PK, string docCode UK }
    ChecklistItem { int id PK, int setId FK }
    DeliveryChecklistRun { int id PK, int requestId FK, int checklistSetId FK }
    DeliveryChecklistAnswer { int id PK, int runId FK, int itemId FK }
    SoftwareLicense { int id PK, string name }
    LicenseAssignment { int id PK, int licenseId FK }
    Contract { int id PK, string contractNo UK }
    ContractAsset { int id PK, int contractId FK, int assetId FK }
    NotificationTemplate { int id PK, string key, NotificationChannel channel }
    NotificationOutbox { int id PK, NotificationStatus status }
    AppNotification { int id PK, int userId FK }
    NotificationSetting { int id PK }
    SystemSetting { int id PK, string key UK }
    ScheduledJob { int id PK, string jobType }
    AppUser { int id PK, string adUsername UK }
    LoginLog { int id PK, int userId FK }
    Asset { int id PK }
```

---

## Migration History Summary

Chronological, from `D:\ITSM\backend\prisma\migrations`:

| Migration folder | Guessed purpose |
|---|---|
| `0_baseline` | Initial baseline migration establishing the schema as it existed before formal migration tracking began |
| `20260512000000_asset_registry_fields` | Added asset registry fields to the `Asset` model |
| `20260512001000_device_types` | Added the `DeviceType` master table |
| `20260512002000_asset_master_data` | Added asset-related master data tables (likely Category/Vendor/AssetLocation/etc.) |
| `20260730000000_add_floorplan_tables` | Added the initial FloorPlan/FloorPlanPin tables |
| `20260731000000_itam_lifecycle_phase2_3` | ITAM lifecycle Phase 2/3 additions — matches the "Phase 2: ITAM lifecycle additions" (AssetLink, AssetDisposal) and "Phase 3: License & Contract management" (SoftwareLicense, LicenseAssignment, Contract, ContractAsset) blocks in the schema |
| `20260801000000_add_viewer_role` | Added the `VIEWER` value to the `UserRole` enum |
| `20260803000000_add_pm_run_notes` | Added the `notes` field to `PMRun` |
| `20260804000000_asset_master_data_fk` | Wired the Asset master-data FK columns (departmentRefId/vendorRefId/locationRefId — "Phase 5: FK to master data" in the schema comments) |
| `20260811173959_add_accounting_code` | Added `Asset.accountingCode` |
| `20260812082437_fix_disposal_method_enum` | Fixed/adjusted the `DisposalMethod` enum values |
| `20260812125209_add_delivery_module` | Added the Delivery domain (DeliveryRequest, DeliveryPeripheralItem, etc.) |
| `20260813170000_add_printer_checklist_set` | Added `Printer` and `ChecklistSet`/`ChecklistItem` master tables |
| `20260813180000_add_perf_indexes` | Added performance-oriented `@@index` entries across models |
| `20260813190000_add_delivery_checklist_run` | Added `DeliveryChecklistRun` and `DeliveryChecklistAnswer` |
| `20260815094230_add_borrow_signature_photo_lost` | Added borrow-flow signature data and photo evidence fields, and the `Lost` value to `ReturnCondition` (and/or `AssetStatus`) |
| `20260819000000_add_asset_custody` | Added an asset-custody feature (tables since dropped — see `20260823120000_drop_asset_custody` below) |
| `20260819000001_add_hr_custody_role` | Added the `HR_CUSTODY` value to `UserRole` |
| `20260821000000_add_login_audit` | Added the `LoginLog` model |
| `20260821100000_add_floor_plan_seats` | Added `FloorPlanSeat` |
| `20260821100001_convert_pins_to_seats` | Data/structure migration converting `FloorPlanPin`-style records into `FloorPlanSeat` records |
| `20260822000000_add_floor_plan_zones` | Added `FloorPlanZone` |
| `20260822120000_floor_plan_templates` | Added `FloorPlanTemplate` |
| `20260823120000_drop_asset_custody` | Dropped the asset-custody tables added in `20260819000000_add_asset_custody` (matches recent commit `e169e45 feat: drop the custody feature`) |
| `20260826150000_add_supervisor_approval` | Added the supervisor-approval borrow workflow — `AppUser.managerId`, `BorrowRequestStatus.PendingSupervisor`, `ApprovalStage.Supervisor` |
| `20260826150500_notify_supervisor_events` | Added the supervisor-approval notification event keys to `NotificationSetting.enabledEventKeys` (borrow_pending_supervisor, borrow_supervisor_approved, borrow_rejected_by_supervisor) |
| `migration_lock.toml` | Prisma migration-lock file (not a migration; records the locked provider, `postgresql`) |

Note: `UserRole.HR_CUSTODY` (added by `20260819000001_add_hr_custody_role`) remains in the schema's enum even though the custody feature it originally served was dropped by `20260823120000_drop_asset_custody` — the enum value was not rolled back.

