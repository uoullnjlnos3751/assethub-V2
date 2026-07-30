-- CreateEnum
CREATE TYPE "DonationStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPERADMIN', 'IT_ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "AuthType" AS ENUM ('AD', 'LOCAL');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('Available', 'Borrowed', 'InUse', 'Maintenance', 'Damaged', 'Retired', 'Lost');

-- CreateEnum
CREATE TYPE "BorrowItemStatus" AS ENUM ('Pending', 'Approved', 'Rejected', 'CheckedOut', 'Returned', 'PartiallyReturned', 'Cancelled');

-- CreateEnum
CREATE TYPE "BorrowRequestStatus" AS ENUM ('Pending', 'Approved', 'Rejected', 'CheckedOut', 'PartiallyReturned', 'Returned', 'Cancelled');

-- CreateEnum
CREATE TYPE "ExtensionStatus" AS ENUM ('Pending', 'Approved', 'Rejected');

-- CreateEnum
CREATE TYPE "PMRunStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ReturnCondition" AS ENUM ('Normal', 'Damaged', 'Repairing', 'AccessoryIncomplete');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'TEAMS', 'LINE');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "app_users" (
    "id" SERIAL NOT NULL,
    "adUsername" TEXT NOT NULL,
    "displayName" TEXT,
    "email" TEXT,
    "department" TEXT,
    "company" TEXT,
    "companyThai" TEXT,
    "thaiName" TEXT,
    "avatarUrl" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "authType" "AuthType" NOT NULL DEFAULT 'AD',
    "passwordHash" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" SERIAL NOT NULL,
    "assetCode" TEXT,
    "assetName" TEXT,
    "serialNo" TEXT NOT NULL,
    "type" TEXT,
    "categoryId" INTEGER,
    "brand" TEXT,
    "model" TEXT,
    "cpu" TEXT,
    "ram" TEXT,
    "osVersion" TEXT,
    "windowsLicense" TEXT,
    "officeLicense" TEXT,
    "antivirusStatus" TEXT,
    "vendor" TEXT,
    "poNumber" TEXT,
    "prNumber" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "purchasePrice" DOUBLE PRECISION,
    "warrantyEndDate" TIMESTAMP(3),
    "age" INTEGER,
    "ownerName" TEXT,
    "departmentId" TEXT,
    "location" TEXT,
    "status" "AssetStatus" NOT NULL DEFAULT 'Available',
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "company" TEXT,
    "oldAssetCode" TEXT,
    "cpuGeneration" TEXT,
    "domainName" TEXT,
    "floor" TEXT,
    "poDate" TIMESTAMP(3),
    "ramDetail" TEXT,
    "gpu" TEXT,
    "osType" TEXT,
    "budget" TEXT,
    "ramSlot1" TEXT,
    "ramSlot2" TEXT,
    "memoryType" TEXT,
    "ramOnboard" TEXT,
    "ramType" TEXT,
    "ramSpeed" TEXT,
    "ramMaxSupported" TEXT,
    "ramAvailableSlots" TEXT,
    "ramUpgradeable" TEXT,
    "snComputer" TEXT,
    "storage1" TEXT,
    "storage2" TEXT,
    "image" TEXT,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "computer_details" (
    "id" SERIAL NOT NULL,
    "assetId" INTEGER NOT NULL,
    "cpu" TEXT,
    "cpuGeneration" TEXT,
    "ram" TEXT,
    "ramSlot1" TEXT,
    "ramSlot2" TEXT,
    "storage1" TEXT,
    "storage2" TEXT,
    "gpu" TEXT,
    "osType" TEXT,
    "osVersion" TEXT,
    "windowsLicense" TEXT,
    "officeLicense" TEXT,
    "antivirusStatus" TEXT,
    "domainName" TEXT,
    "snComputer" TEXT,

    CONSTRAINT "computer_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phone_details" (
    "id" SERIAL NOT NULL,
    "assetId" INTEGER NOT NULL,
    "imei1" TEXT,
    "imei2" TEXT,
    "osVersion" TEXT,
    "storageCapacity" TEXT,
    "ram" TEXT,
    "phoneNumber" TEXT,
    "mdmEnrolled" BOOLEAN,
    "simProvider" TEXT,

    CONSTRAINT "phone_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitor_details" (
    "id" SERIAL NOT NULL,
    "assetId" INTEGER NOT NULL,
    "screenSize" TEXT,
    "resolution" TEXT,
    "panelType" TEXT,
    "refreshRate" TEXT,
    "ports" TEXT,
    "hasSpeaker" BOOLEAN,
    "curved" BOOLEAN,

    CONSTRAINT "monitor_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_details" (
    "id" SERIAL NOT NULL,
    "assetId" INTEGER NOT NULL,
    "deviceType" TEXT,
    "connectionType" TEXT,
    "powerSource" TEXT,
    "rgbSupport" BOOLEAN,

    CONSTRAINT "device_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "network_device_details" (
    "id" SERIAL NOT NULL,
    "assetId" INTEGER NOT NULL,
    "networkType" TEXT,
    "ipAddress" TEXT,
    "macAddress" TEXT,
    "firmwareVersion" TEXT,
    "portCount" INTEGER,
    "locationRack" TEXT,
    "poeSupport" BOOLEAN,

    CONSTRAINT "network_device_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rack_details" (
    "id" SERIAL NOT NULL,
    "assetId" INTEGER NOT NULL,
    "subType" TEXT,
    "rackUnits" TEXT,
    "powerCapacity" TEXT,
    "rackLocation" TEXT,

    CONSTRAINT "rack_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "printer_details" (
    "id" SERIAL NOT NULL,
    "assetId" INTEGER NOT NULL,
    "printerType" TEXT,
    "isColor" BOOLEAN,
    "networkReady" BOOLEAN,
    "ipAddress" TEXT,
    "macAddress" TEXT,
    "pageCount" INTEGER,
    "duplexSupport" BOOLEAN,

    CONSTRAINT "printer_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cable_details" (
    "id" SERIAL NOT NULL,
    "assetId" INTEGER NOT NULL,
    "cableType" TEXT,
    "length" TEXT,
    "stockQuantity" INTEGER,
    "minimumStock" INTEGER,

    CONSTRAINT "cable_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consumable_details" (
    "id" SERIAL NOT NULL,
    "assetId" INTEGER NOT NULL,
    "consumableType" TEXT,
    "compatibleWith" TEXT,
    "stockQuantity" INTEGER,
    "minimumStock" INTEGER,
    "expiryDate" TIMESTAMP(3),

    CONSTRAINT "consumable_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_documents" (
    "id" SERIAL NOT NULL,
    "assetId" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "docType" TEXT NOT NULL DEFAULT 'OTHER',
    "note" TEXT,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "totalQuantity" INTEGER NOT NULL DEFAULT 0,
    "availableQuantity" INTEGER NOT NULL DEFAULT 0,
    "minStockLevel" INTEGER NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL,
    "location" TEXT,
    "remark" TEXT,
    "image" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_transactions" (
    "id" SERIAL NOT NULL,
    "itemId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "userId" INTEGER,
    "userName" TEXT,
    "note" TEXT,
    "refNo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_types" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" SERIAL NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "nameEng" TEXT,
    "logoUrl" TEXT,
    "description" TEXT,
    "assetCompanyCodes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "nameEng" TEXT,
    "code" TEXT NOT NULL,
    "logoUrl" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_types" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "detailTable" TEXT,
    "isBorrowable" BOOLEAN NOT NULL DEFAULT true,
    "isAssignable" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_locations" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "company" TEXT,

    CONSTRAINT "asset_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_status_masters" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_status_masters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_history" (
    "id" SERIAL NOT NULL,
    "assetId" INTEGER NOT NULL,
    "actionType" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "fromOwner" TEXT,
    "toOwner" TEXT,
    "fromDept" TEXT,
    "toDept" TEXT,
    "fromLoc" TEXT,
    "toLoc" TEXT,
    "note" TEXT,
    "actorUserId" INTEGER,
    "ownerUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "borrow_requests" (
    "id" SERIAL NOT NULL,
    "requestNo" TEXT NOT NULL,
    "requesterUserId" INTEGER NOT NULL,
    "departmentId" TEXT,
    "purpose" TEXT,
    "status" "BorrowRequestStatus" NOT NULL DEFAULT 'Pending',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "borrow_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "borrow_request_items" (
    "id" SERIAL NOT NULL,
    "requestId" INTEGER NOT NULL,
    "assetId" INTEGER,
    "inventoryItemId" INTEGER,
    "isQuantityBased" BOOLEAN NOT NULL DEFAULT false,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "borrowDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "itemStatus" "BorrowItemStatus" NOT NULL DEFAULT 'Pending',
    "note" TEXT,

    CONSTRAINT "borrow_request_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "borrow_approvals" (
    "id" SERIAL NOT NULL,
    "requestId" INTEGER NOT NULL,
    "approverUserId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "note" TEXT,
    "actedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "borrow_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkouts" (
    "id" SERIAL NOT NULL,
    "requestId" INTEGER NOT NULL,
    "checkoutBy" INTEGER NOT NULL,
    "receivedBy" TEXT,
    "checkoutAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "handoverNote" TEXT,

    CONSTRAINT "checkouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "returns" (
    "id" SERIAL NOT NULL,
    "requestItemId" INTEGER NOT NULL,
    "returnBy" INTEGER NOT NULL,
    "returnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "condition" "ReturnCondition" NOT NULL,
    "damageNote" TEXT,
    "accessoriesNote" TEXT,
    "receiverName" TEXT,

    CONSTRAINT "returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "borrow_extensions" (
    "id" SERIAL NOT NULL,
    "requestId" INTEGER NOT NULL,
    "requestedBy" INTEGER NOT NULL,
    "status" "ExtensionStatus" NOT NULL DEFAULT 'Pending',
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "decidedBy" INTEGER,
    "decisionNote" TEXT,

    CONSTRAINT "borrow_extensions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "borrow_extension_items" (
    "id" SERIAL NOT NULL,
    "extensionId" INTEGER NOT NULL,
    "requestItemId" INTEGER NOT NULL,
    "oldDueDate" TIMESTAMP(3) NOT NULL,
    "requestedDueDate" TIMESTAMP(3) NOT NULL,
    "extraDays" INTEGER NOT NULL,

    CONSTRAINT "borrow_extension_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pm_templates" (
    "id" SERIAL NOT NULL,
    "year" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "pm_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pm_template_items" (
    "id" SERIAL NOT NULL,
    "templateId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "group" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "pm_template_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pm_plans" (
    "id" SERIAL NOT NULL,
    "year" INTEGER NOT NULL,
    "site" TEXT,
    "deptTask" TEXT,
    "company" TEXT,
    "lead" TEXT,
    "deviceType" TEXT,
    "plannedDeviceCount" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "templateId" INTEGER NOT NULL,
    "isAdhoc" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "pm_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pm_runs" (
    "id" SERIAL NOT NULL,
    "planId" INTEGER NOT NULL,
    "assetId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" "PMRunStatus" NOT NULL DEFAULT 'DRAFT',
    "performedBy" INTEGER,
    "performedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pm_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pm_run_answers" (
    "id" SERIAL NOT NULL,
    "runId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "value" TEXT,

    CONSTRAINT "pm_run_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "subjectTh" TEXT NOT NULL,
    "bodyTh" TEXT NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_outbox" (
    "id" SERIAL NOT NULL,
    "eventType" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "recipient" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "notification_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_notifications" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "type" TEXT NOT NULL DEFAULT 'SYSTEM',
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_settings" (
    "id" SERIAL NOT NULL,
    "systemName" TEXT NOT NULL DEFAULT 'ITAM',
    "organizationName" TEXT NOT NULL DEFAULT 'TRR Group',
    "logoUrl" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Bangkok',
    "darkMode" BOOLEAN NOT NULL DEFAULT false,
    "showWelcomeBanner" BOOLEAN NOT NULL DEFAULT true,
    "borrowDays" INTEGER NOT NULL DEFAULT 3,
    "maxBorrowDays" INTEGER NOT NULL DEFAULT 30,
    "maxItemsPerRequest" INTEGER NOT NULL DEFAULT 5,
    "allowExtension" BOOLEAN NOT NULL DEFAULT true,
    "maxExtensionsPerRequest" INTEGER NOT NULL DEFAULT 2,
    "overdueWarningDays" INTEGER NOT NULL DEFAULT 3,
    "enableEmail" BOOLEAN NOT NULL DEFAULT true,
    "enableTeams" BOOLEAN NOT NULL DEFAULT false,
    "teamsWebhookUrl" TEXT,
    "enabledEventKeys" TEXT NOT NULL DEFAULT 'borrow_request_pending,borrow_approved,borrow_rejected,checkout_completed,return_recorded,overdue_borrow,extension_pending,extension_approved,extension_rejected,pm_overdue',
    "smtpHost" TEXT,
    "smtpPort" TEXT NOT NULL DEFAULT '587',
    "smtpUser" TEXT,
    "smtpPass" TEXT,
    "smtpFromEmail" TEXT,
    "smtpFromName" TEXT,
    "emailCc" TEXT,
    "enableLine" BOOLEAN NOT NULL DEFAULT false,
    "lineChannelAccessToken" TEXT,
    "lineWebhookUrl" TEXT,
    "lineWebhookVerifyToken" TEXT,
    "lineSendMode" TEXT NOT NULL DEFAULT 'broadcast',
    "lineUserIds" TEXT,
    "lineEnabledStatuses" TEXT NOT NULL DEFAULT 'รอรับเรื่อง,รับเรื่องแล้ว,กำลังดำเนินการ,รอชิ้นส่วน,เสร็จสิ้น,ยกเลิก',
    "requireStrongPassword" BOOLEAN NOT NULL DEFAULT true,
    "passwordExpiryDays" INTEGER NOT NULL DEFAULT 90,
    "sessionTimeoutHours" INTEGER NOT NULL DEFAULT 8,

    CONSTRAINT "notification_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" SERIAL NOT NULL,
    "group" TEXT NOT NULL DEFAULT 'GENERAL',
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_jobs" (
    "id" SERIAL NOT NULL,
    "jobType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "result" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "scheduled_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donations" (
    "id" SERIAL NOT NULL,
    "batchRef" TEXT NOT NULL,
    "donationDate" TIMESTAMP(3) NOT NULL,
    "recipientName" TEXT NOT NULL,
    "recipientAddress" TEXT,
    "recipientContact" TEXT,
    "recipientPhone" TEXT,
    "approvalRef" TEXT,
    "notes" TEXT,
    "status" "DonationStatus" NOT NULL DEFAULT 'PENDING',
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "donations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donation_items" (
    "id" SERIAL NOT NULL,
    "donationId" INTEGER NOT NULL,
    "assetId" INTEGER NOT NULL,
    "condition" TEXT,
    "notes" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "donation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donation_images" (
    "id" SERIAL NOT NULL,
    "donationId" INTEGER NOT NULL,
    "image" TEXT NOT NULL,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "donation_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_records" (
    "id" SERIAL NOT NULL,
    "ticketNo" TEXT NOT NULL,
    "assetId" INTEGER NOT NULL,
    "reportedProblem" TEXT NOT NULL,
    "repairType" TEXT NOT NULL,
    "vendorName" TEXT,
    "resolutionNote" TEXT,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "technicianId" INTEGER NOT NULL,

    CONSTRAINT "maintenance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_parts" (
    "id" SERIAL NOT NULL,
    "recordId" INTEGER NOT NULL,
    "partName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "maintenance_parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_images" (
    "id" SERIAL NOT NULL,
    "recordId" INTEGER NOT NULL,
    "imageType" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pm_sw_hubs" (
    "id" SERIAL NOT NULL,
    "planId" INTEGER,
    "formId" TEXT NOT NULL,
    "floor" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "technician" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "remark" TEXT,
    "signTech" TEXT,
    "signMgr" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "photoBeforeUrl" TEXT,
    "photoAfterUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pm_sw_hubs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pm_sw_hub_plans" (
    "id" SERIAL NOT NULL,
    "year" INTEGER NOT NULL,
    "floor" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "technician" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "templateId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pm_sw_hub_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pm_sw_hub_items" (
    "id" SERIAL NOT NULL,
    "pmSwHubId" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "checkItem" TEXT NOT NULL,
    "status" TEXT,
    "note" TEXT,
    "photoUrl" TEXT,
    "resolveStatus" TEXT,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "pm_sw_hub_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pm_sw_hub_templates" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pm_sw_hub_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pm_sw_hub_template_items" (
    "id" SERIAL NOT NULL,
    "templateId" INTEGER NOT NULL,
    "group" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'boolean',
    "required" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "pm_sw_hub_template_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "floor_plans" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "floor" TEXT NOT NULL,
    "building" TEXT,
    "company" TEXT,
    "imageUrl" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "floor_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "floor_plan_pins" (
    "id" SERIAL NOT NULL,
    "floorPlanId" INTEGER NOT NULL,
    "assetId" INTEGER NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "floor_plan_pins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "app_users_adUsername_key" ON "app_users"("adUsername");

-- CreateIndex
CREATE INDEX "app_users_role_isActive_idx" ON "app_users"("role", "isActive");

-- CreateIndex
CREATE INDEX "app_users_department_idx" ON "app_users"("department");

-- CreateIndex
CREATE UNIQUE INDEX "assets_assetCode_key" ON "assets"("assetCode");

-- CreateIndex
CREATE UNIQUE INDEX "assets_serialNo_key" ON "assets"("serialNo");

-- CreateIndex
CREATE INDEX "assets_status_departmentId_location_idx" ON "assets"("status", "departmentId", "location");

-- CreateIndex
CREATE INDEX "assets_type_brand_idx" ON "assets"("type", "brand");

-- CreateIndex
CREATE INDEX "assets_status_createdAt_idx" ON "assets"("status", "createdAt");

-- CreateIndex
CREATE INDEX "assets_departmentId_idx" ON "assets"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "computer_details_assetId_key" ON "computer_details"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "phone_details_assetId_key" ON "phone_details"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "monitor_details_assetId_key" ON "monitor_details"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "device_details_assetId_key" ON "device_details"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "network_device_details_assetId_key" ON "network_device_details"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "rack_details_assetId_key" ON "rack_details"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "printer_details_assetId_key" ON "printer_details"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "cable_details_assetId_key" ON "cable_details"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "consumable_details_assetId_key" ON "consumable_details"("assetId");

-- CreateIndex
CREATE INDEX "asset_documents_assetId_idx" ON "asset_documents"("assetId");

-- CreateIndex
CREATE INDEX "inventory_items_category_isActive_idx" ON "inventory_items"("category", "isActive");

-- CreateIndex
CREATE INDEX "inventory_items_name_idx" ON "inventory_items"("name");

-- CreateIndex
CREATE INDEX "inventory_transactions_itemId_idx" ON "inventory_transactions"("itemId");

-- CreateIndex
CREATE INDEX "inventory_transactions_createdAt_idx" ON "inventory_transactions"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "device_types_name_key" ON "device_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "companies_code_key" ON "companies"("code");

-- CreateIndex
CREATE UNIQUE INDEX "companies_name_key" ON "companies"("name");

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "category_types_categoryId_name_key" ON "category_types"("categoryId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "asset_locations_name_key" ON "asset_locations"("name");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_name_key" ON "vendors"("name");

-- CreateIndex
CREATE UNIQUE INDEX "asset_status_masters_code_key" ON "asset_status_masters"("code");

-- CreateIndex
CREATE INDEX "asset_history_assetId_idx" ON "asset_history"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "borrow_requests_requestNo_key" ON "borrow_requests"("requestNo");

-- CreateIndex
CREATE INDEX "borrow_requests_requesterUserId_status_idx" ON "borrow_requests"("requesterUserId", "status");

-- CreateIndex
CREATE INDEX "borrow_requests_status_createdAt_idx" ON "borrow_requests"("status", "createdAt");

-- CreateIndex
CREATE INDEX "borrow_requests_departmentId_idx" ON "borrow_requests"("departmentId");

-- CreateIndex
CREATE INDEX "borrow_request_items_assetId_itemStatus_dueDate_idx" ON "borrow_request_items"("assetId", "itemStatus", "dueDate");

-- CreateIndex
CREATE INDEX "borrow_request_items_requestId_itemStatus_idx" ON "borrow_request_items"("requestId", "itemStatus");

-- CreateIndex
CREATE INDEX "borrow_request_items_dueDate_itemStatus_idx" ON "borrow_request_items"("dueDate", "itemStatus");

-- CreateIndex
CREATE INDEX "borrow_request_items_inventoryItemId_idx" ON "borrow_request_items"("inventoryItemId");

-- CreateIndex
CREATE INDEX "pm_runs_planId_status_idx" ON "pm_runs"("planId", "status");

-- CreateIndex
CREATE INDEX "pm_runs_assetId_year_idx" ON "pm_runs"("assetId", "year");

-- CreateIndex
CREATE INDEX "pm_runs_status_performedAt_idx" ON "pm_runs"("status", "performedAt");

-- CreateIndex
CREATE UNIQUE INDEX "pm_runs_assetId_year_key" ON "pm_runs"("assetId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_key_channel_key" ON "notification_templates"("key", "channel");

-- CreateIndex
CREATE INDEX "notification_outbox_status_channel_idx" ON "notification_outbox"("status", "channel");

-- CreateIndex
CREATE INDEX "notification_outbox_createdAt_idx" ON "notification_outbox"("createdAt");

-- CreateIndex
CREATE INDEX "app_notifications_userId_isRead_idx" ON "app_notifications"("userId", "isRead");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");

-- CreateIndex
CREATE UNIQUE INDEX "donations_batchRef_key" ON "donations"("batchRef");

-- CreateIndex
CREATE UNIQUE INDEX "donation_items_assetId_key" ON "donation_items"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_records_ticketNo_key" ON "maintenance_records"("ticketNo");

-- CreateIndex
CREATE UNIQUE INDEX "pm_sw_hubs_formId_key" ON "pm_sw_hubs"("formId");

-- CreateIndex
CREATE UNIQUE INDEX "pm_sw_hub_templates_name_key" ON "pm_sw_hub_templates"("name");

-- CreateIndex
CREATE UNIQUE INDEX "floor_plan_pins_floorPlanId_assetId_key" ON "floor_plan_pins"("floorPlanId", "assetId");

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "computer_details" ADD CONSTRAINT "computer_details_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phone_details" ADD CONSTRAINT "phone_details_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitor_details" ADD CONSTRAINT "monitor_details_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_details" ADD CONSTRAINT "device_details_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "network_device_details" ADD CONSTRAINT "network_device_details_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rack_details" ADD CONSTRAINT "rack_details_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "printer_details" ADD CONSTRAINT "printer_details_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cable_details" ADD CONSTRAINT "cable_details_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumable_details" ADD CONSTRAINT "consumable_details_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_documents" ADD CONSTRAINT "asset_documents_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_types" ADD CONSTRAINT "category_types_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_history" ADD CONSTRAINT "asset_history_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_history" ADD CONSTRAINT "asset_history_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_history" ADD CONSTRAINT "asset_history_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borrow_requests" ADD CONSTRAINT "borrow_requests_requesterUserId_fkey" FOREIGN KEY ("requesterUserId") REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borrow_request_items" ADD CONSTRAINT "borrow_request_items_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borrow_request_items" ADD CONSTRAINT "borrow_request_items_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borrow_request_items" ADD CONSTRAINT "borrow_request_items_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "borrow_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borrow_approvals" ADD CONSTRAINT "borrow_approvals_approverUserId_fkey" FOREIGN KEY ("approverUserId") REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borrow_approvals" ADD CONSTRAINT "borrow_approvals_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "borrow_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkouts" ADD CONSTRAINT "checkouts_checkoutBy_fkey" FOREIGN KEY ("checkoutBy") REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkouts" ADD CONSTRAINT "checkouts_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "borrow_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "returns" ADD CONSTRAINT "returns_requestItemId_fkey" FOREIGN KEY ("requestItemId") REFERENCES "borrow_request_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "returns" ADD CONSTRAINT "returns_returnBy_fkey" FOREIGN KEY ("returnBy") REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borrow_extensions" ADD CONSTRAINT "borrow_extensions_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "borrow_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borrow_extensions" ADD CONSTRAINT "borrow_extensions_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borrow_extension_items" ADD CONSTRAINT "borrow_extension_items_extensionId_fkey" FOREIGN KEY ("extensionId") REFERENCES "borrow_extensions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borrow_extension_items" ADD CONSTRAINT "borrow_extension_items_requestItemId_fkey" FOREIGN KEY ("requestItemId") REFERENCES "borrow_request_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pm_template_items" ADD CONSTRAINT "pm_template_items_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "pm_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pm_plans" ADD CONSTRAINT "pm_plans_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "pm_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pm_runs" ADD CONSTRAINT "pm_runs_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pm_runs" ADD CONSTRAINT "pm_runs_performedBy_fkey" FOREIGN KEY ("performedBy") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pm_runs" ADD CONSTRAINT "pm_runs_planId_fkey" FOREIGN KEY ("planId") REFERENCES "pm_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pm_run_answers" ADD CONSTRAINT "pm_run_answers_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "pm_template_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pm_run_answers" ADD CONSTRAINT "pm_run_answers_runId_fkey" FOREIGN KEY ("runId") REFERENCES "pm_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_notifications" ADD CONSTRAINT "app_notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation_items" ADD CONSTRAINT "donation_items_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "donations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation_items" ADD CONSTRAINT "donation_items_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation_images" ADD CONSTRAINT "donation_images_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "donations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_parts" ADD CONSTRAINT "maintenance_parts_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "maintenance_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_images" ADD CONSTRAINT "maintenance_images_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "maintenance_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pm_sw_hubs" ADD CONSTRAINT "pm_sw_hubs_planId_fkey" FOREIGN KEY ("planId") REFERENCES "pm_sw_hub_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pm_sw_hub_plans" ADD CONSTRAINT "pm_sw_hub_plans_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "pm_sw_hub_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pm_sw_hub_items" ADD CONSTRAINT "pm_sw_hub_items_pmSwHubId_fkey" FOREIGN KEY ("pmSwHubId") REFERENCES "pm_sw_hubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pm_sw_hub_template_items" ADD CONSTRAINT "pm_sw_hub_template_items_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "pm_sw_hub_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "floor_plan_pins" ADD CONSTRAINT "floor_plan_pins_floorPlanId_fkey" FOREIGN KEY ("floorPlanId") REFERENCES "floor_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "floor_plan_pins" ADD CONSTRAINT "floor_plan_pins_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

