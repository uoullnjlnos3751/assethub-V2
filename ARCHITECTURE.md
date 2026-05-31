# รายงานโครงสร้างระบบ AssetHub V2 (System Architecture Report)

เอกสารฉบับนี้สรุปโครงสร้างทางสถาปัตยกรรม (Architecture) ของระบบบริหารจัดการทรัพย์สิน AssetHub V2 ทั้งฝั่ง Frontend, Backend, Database และ Infrastructure 

---

## 1. ภาพรวมสถาปัตยกรรมระบบ (Tech Stack)

ระบบ AssetHub V2 พัฒนาด้วยรูปแบบ **Modern Web Application (Client-Server Architecture)** และถูกนำไปรันบนระบบ Container (Docker)

*   **Frontend:** React 18, TypeScript, Vite, Material UI (MUI) v6
*   **Backend:** Node.js, Express.js, TypeScript, Prisma ORM
*   **Database:** PostgreSQL 16
*   **Infrastructure:** Docker & Docker Compose (มี Nginx สำหรับเสิร์ฟ Frontend และเป็น Reverse Proxy)
*   **Authentication:** 
    *   **Local DB:** ระบบฐานข้อมูลของตัวเอง (Bcrypt + JWT)
    *   **External AD (Active Directory):** เชื่อมต่อกับ TRR Group Intranet API สำหรับการ Login ด้วยบัญชีพนักงาน

---

## 2. โครงสร้างฝั่ง Frontend (React Application)

**ตำแหน่งโค้ด:** `./frontend`

*   **Framework/Bundler:** Vite
*   **UI Library:** Material UI (MUI) สำหรับ Components (DataGrid, Dialog, Card, DatePickers ฯลฯ)
*   **Routing:** React Router v6
*   **State Management:** React Context API (หลักๆ คือ `AuthContext` สำหรับเก็บข้อมูลผู้ใช้งานและ System Settings)
*   **API Client:** Axios (เชื่อมต่อไปยัง Backend)
*   **โครงสร้างหน้าเว็บ (Pages):**
    *   **ผู้ใช้ทั่วไป (User):**
        *   หน้ารายการทรัพย์สิน (ยืม/เบิก)
        *   หน้าตะกร้าและทำเรื่องขอยืม/คืน (`BorrowRequestPage`)
        *   หน้าติดตามคำขอ และประวัติ (`MyRequestsPage`, `MyItemsPage`, `MyHistoryPage`)
    *   **ผู้ดูแลระบบ (Admin/IT):**
        *   Dashboard (`DashboardPage`)
        *   จัดการทรัพย์สิน (IT Assets), เพิ่ม, ลบ, แก้ไข, อิมพอร์ตข้อมูล (`AssetListPage`, `AssetFormPage`)
        *   จัดการการยืม-คืน (อนุมัติ, ส่งมอบ, รับคืน) (`ApprovalQueuePage`, `CheckoutPage`, `ReturnPage`)
        *   จัดการวัสดุสิ้นเปลือง (Inventory)
        *   ระบบซ่อมบำรุง (Maintenance) และ แผนบำรุงรักษาเชิงป้องกัน (PM - Preventive Maintenance)
        *   ระบบบริจาค (Donation)
        *   ตั้งค่าระบบ, จัดการผู้ใช้, หมวดหมู่ (`Admin`, `UsersPage`, `SettingsPage`)

**จุดเด่น (Key Features):**
*   **Responsive Design:** หน้าจอถูกปรับแต่งให้รองรับทั้ง Desktop (Table DataGrid) และ Mobile (Card Layout) 
*   **Dynamic UI:** มีระบบ Tab, Modal/Dialog, และ Toast Notification เพื่อการโต้ตอบที่ลื่นไหล

---

## 3. โครงสร้างฝั่ง Backend (Node.js API)

**ตำแหน่งโค้ด:** `./backend`

*   **Framework:** Express.js เขียนด้วย TypeScript
*   **ORM:** Prisma (ติดต่อฐานข้อมูล)
*   **API Structure (RESTful APIs):**
    *   `/api/auth`: จัดการ Login (ทั้ง AD และ Local), Get Profile, สิทธิ์
    *   `/api/assets`: จัดการทรัพย์สิน, การอัพโหลดเอกสาร, ดึงข้อมูล
    *   `/api/borrow`: วงจรการยืม-คืนทั้งหมด (สร้างคำขอ, อนุมัติ, ยกเลิก, คืน)
    *   `/api/pm`: จัดการแผน PM (Template, Plan, Run)
    *   `/api/admin`: จัดการผู้ใช้ทั้งหมด, ตั้งค่าองค์กร, Audit Log
    *   `/api/dashboard`: ดึงข้อมูลสรุปเชิงสถิติ (Stat, Chart Data)
    *   `/api/inventory`: จัดการวัสดุสิ้นเปลือง (เบิกจ่าย, สต๊อก)
    *   `/api/categories`: จัดการหมวดหมู่, ประเภททรัพย์สิน, สถานที่, บริษัท
    *   `/api/donations`: จัดการระบบบริจาคทรัพย์สิน
    *   `/api/maintenance`: บันทึกประวัติการซ่อมแซมและการส่งเคลม
*   **Background Jobs:**
    *   **Notification Worker (`startNotificationWorker`):** ประมวลผลและส่งคิวการแจ้งเตือนต่างๆ 
    *   **Overdue Checker (`startOverdueChecker`):** ตรวจสอบทรัพย์สินที่เลยกำหนดส่งคืนและดำเนินการเปลี่ยนสถานะหรือส่งแจ้งเตือน
*   **File Uploads:** ใช้ `multer` ในการอัพโหลดรูปภาพประจำตัว (Avatar), เอกสารแนบ (Documents), รูปบริจาค/ซ่อมบำรุง เก็บไว้ในระบบไฟล์ท้องถิ่น (`/uploads`)

---

## 4. โครงสร้างฐานข้อมูล (PostgreSQL & Prisma Schema)

โครงสร้างฐานข้อมูลมีความซับซ้อนและครอบคลุมกระบวนการจัดการทรัพย์สินทั้งหมด แบ่งออกเป็นกลุ่มได้ดังนี้:

### 4.1 ระบบจัดการผู้ใช้ (User Management)
*   **AppUser:** จัดเก็บข้อมูลผู้ใช้งาน (AD Username, ข้อมูลแผนก, บริษัท) รวมถึง Role (SUPERADMIN, IT_ADMIN, USER) 
*   มีการเก็บ `avatarUrl` (สามารถดึงภาพจาก AD URL ขององค์กรได้)

### 4.2 ระบบทรัพย์สินหลัก (Asset Core)
*   **Asset:** ข้อมูลหลักของทรัพย์สิน (Asset Code, S/N, ประเภท, ยี่ห้อ, สถานะ ฯลฯ)
*   **Specific Details:** โต๊ะข้อมูลเจาะจงตามประเภทอุปกรณ์แบบ **Polymorphic-like 1-to-1 relations**:
    *   `ComputerDetail` (CPU, RAM, OS, License)
    *   `PhoneDetail` (IMEI, SIM)
    *   `MonitorDetail` (Screen Size, Refresh Rate)
    *   `NetworkDeviceDetail` (IP, MAC Address)
    *   `DeviceDetail`, `RackDetail`, `PrinterDetail`, `CableDetail`, `ConsumableDetail`
*   **AssetHistory:** ตารางเก็บ Log ประวัติการเคลื่อนย้ายหรือเปลี่ยนสถานะของทรัพย์สินแต่ละชิ้น
*   **AssetDocument:** เก็บข้อมูลไฟล์เอกสาร/รูปภาพที่แนบกับทรัพย์สิน

### 4.3 ระบบวัสดุสิ้นเปลือง (Inventory)
*   **InventoryItem:** สินค้าคงคลัง, วัสดุสิ้นเปลือง
*   **InventoryTransaction:** ประวัติการเบิกจ่าย รับเข้า-จ่ายออก (Stock In/Out)

### 4.4 ระบบยืม-คืน (Borrow Workflow)
*   **BorrowRequest:** คำขอยืม (1 คำขอ)
*   **BorrowRequestItem:** รายการทรัพย์สินหรือวัสดุในคำขอนั้น (หลายรายการ)
*   **BorrowApproval:** ประวัติและสถานะการอนุมัติ
*   **Checkout / Return:** บันทึกหลักฐานการส่งมอบและการรับคืนสภาพ (รวมถึงระบุสภาพทรัพย์สิน)
*   **BorrowExtension:** การขอขยายเวลายืม (ต่ออายุ)

### 4.5 ระบบซ่อมบำรุงและการบริจาค (Maintenance & PM & Donation)
*   **MaintenanceRecord & MaintenancePart:** บันทึกประวัติการส่งซ่อม, อะไหล่ที่ถูกเปลี่ยน, ค่าใช้จ่าย
*   **PMTemplate, PMPlan, PMRun:** แผนและคู่มือสำหรับงานซ่อมบำรุงเชิงป้องกัน (Preventive Maintenance) ประจำปี/ประจำเดือน
*   **Donation, DonationItem:** บันทึกทรัพย์สินที่ถูกตัดจำหน่ายเพื่อบริจาคและผู้รับ

### 4.6 ระบบระบบและการแจ้งเตือน (System & Configuration)
*   **Category, Company, AssetLocation, Vendor:** ข้อมูล Master Data พื้นฐาน
*   **NotificationSetting, NotificationTemplate, NotificationOutbox:** ตั้งค่าการแจ้งเตือน (Email, LINE, Teams) 

---

## 5. กระบวนการ Authentication (Login Flow)

ระบบมีการยืนยันตัวตนแบบ Hybrid โดยมี Priority ไปที่ Active Directory (AD) ขององค์กร:
1.  **Frontend:** ผู้ใช้กรอก Username / Password ผ่านหน้า Login
2.  **Backend (`auth.service.ts`):** นำข้อมูล Username/Password ยิง Request ไปยัง **Intranet API** (`https://intra-tools.trrgroup.com/api_sys_auth/SysAuth/login_auth_emp_get`) ด้วย Application Code "INTRANET"
3.  **AD Response:** หาก AD ตอบกลับสำเร็จ (Success) ระบบจะนำข้อมูลผู้ใช้ (เช่น ชื่อภาษาไทย, อีเมล, ชื่อบริษัท) มาปรับปรุงหรือสร้างในตาราง `AppUser` ในระบบ AssetHub ทันที
4.  **Avatar & Display:** ระบบประกอบลิงก์รูปโปรไฟล์อัตโนมัติจากโครงสร้าง `empimage` (เช่น `https://intra-tools.trrgroup.com/empimage/TRRGROUP.COM/[USERNAME].PNG`) และบันทึกข้อมูล `companyThai`
5.  **Token Generation:** Backend สร้าง JWT (JSON Web Token) ส่่งกลับไปให้ Frontend เก็บใน `localStorage` นำไปใช้ในทุกๆ API Request 

---

## 6. โครงสร้าง Infrastructure (Docker Deployment)

ระบบถูกออกแบบให้รันผ่าน `docker-compose.yml`
*   **Container 1: `postgres`** 
    *   ฐานข้อมูล PostgreSQL (Port: 5433 ภายนอก / 5432 ภายใน)
    *   มี Volume เก็บข้อมูล (Persisted Data) ที่ `pgdata`
*   **Container 2: `backend`** 
    *   Node.js API (Port: 4000)
    *   รับ Connection สื่อสารกับ Postgres
    *   มี Volume `/app/uploads` เชื่อมไปที่โฮสต์เพื่อเก็บไฟล์รูปภาพ/เอกสาร (ข้อมูลไม่หายเมื่อ Restart)
*   **Container 3: `frontend`** 
    *   Nginx Web Server ให้บริการไฟล์ Static (React Build) (Port: 5173 ภายนอก / 80 ภายใน)
    *   Nginx Config ถูกตั้งค่าให้ Reverse Proxy ทุก Request ที่นำหน้าด้วย `/api/` หรือ `/uploads/` ไปหา `backend:4000` ทันที 

---
*จัดทำเอกสารโดย: AI Assistant (Agentic Coding Team)*
