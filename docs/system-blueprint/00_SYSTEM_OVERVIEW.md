# SYSTEM OVERVIEW — AssetHub (ITAM/ITSM)

> Confidence: **LEVEL 1 — VERIFIED** (จากการอ่าน source code จริงในโฟลเดอร์ D:\ITSM ทั้งหมด ไม่มีการเดา)

## Application Identity

| หัวข้อ | รายละเอียด | Evidence |
|---|---|---|
| Application Name | AssetHub (ชื่อ package: `assethub-backend`, `assethub-frontend`; ชื่อที่แสดงในหน้าเว็บ: "IT Asset Management (ITAM)") | `backend/package.json:2`, `frontend/package.json:2`, login page footer "IT Asset Management (ITAM) v1.0.0" |
| Application Type | Web Application แบบ Client-Server (SPA + REST API), ใช้งานภายในองค์กร (intranet) | โครงสร้างโดยรวม |
| องค์กรเจ้าของ | TRR Group (พบชื่อบริษัทลูก TRRT, TRR, TRRCORP, PS, SSEC, TMI, TRM, TRRL, TRRP, TRW, TEG, TRRSK ในระบบ) | `frontend/src/pages/pm/components/PMDeviceArrayInput.tsx` DEFAULT_COMPANIES, ข้อมูล Company จริงใน DB |
| Domain การใช้งาน | IT Asset Management (ทะเบียนทรัพย์สิน IT, ยืม-คืน, PM, จำหน่าย/บริจาค, License/สัญญา, รายงาน) | สังเกตจาก nav.tsx ทั้งหมด |

## Technology Stack

| Layer | เทคโนโลยี | เวอร์ชัน | Evidence |
|---|---|---|---|
| Frontend Framework | React | ^18.3.1 | `frontend/package.json` |
| Frontend Language | TypeScript | ^5.6.2 | `frontend/package.json` |
| Frontend Build Tool | Vite | ^5.4.8 | `frontend/package.json` |
| UI Library | Material UI (MUI) v6 (`@mui/material`, `@mui/icons-material`, `@mui/lab`, `@mui/x-data-grid`, `@mui/x-date-pickers`) | ^6.x | `frontend/package.json` |
| Routing | React Router DOM | ^6.27.0 | `frontend/package.json`, `frontend/src/App.tsx` |
| HTTP Client | Axios | ^1.7.7 | `frontend/package.json`, `frontend/src/services/api.ts` |
| Charts | Recharts | ^3.8.1 | `frontend/package.json` |
| Icons (secondary set) | lucide-react | 0.453.0 | `frontend/package.json` — ใช้คู่กับ MUI icons ในบางหน้า เช่น `StatusChip`, `UsersPermissionsTab` |
| Drag & Drop | @hello-pangea/dnd | ^18.0.1 | `frontend/package.json` |
| Excel/CSV | xlsx, papaparse | ^0.18.5 / ^5.5.3 | `frontend/package.json` |
| PDF export | jspdf, html2canvas | ^4.2.1 / ^1.4.1 | `frontend/package.json` |
| QR Code | html5-qrcode (สแกน), react-qr-code (สร้าง) | ^2.3.8 / ^2.0.21 | `frontend/package.json` |
| Image compression | browser-image-compression | ^2.0.2 | `frontend/package.json` |
| Backend Framework | Express.js | ^4.21.0 | `backend/package.json` |
| Backend Language | TypeScript (รันด้วย `tsx` ใน dev, compile ด้วย `tsc` เป็น `dist/` สำหรับ production) | ^5.6.2 | `backend/package.json` scripts |
| ORM | Prisma | ^5.22.0 | `backend/package.json`, `backend/prisma/schema.prisma` |
| Database | PostgreSQL | 16 (ตาม docs เดิม) — schema provider คือ `postgresql` | `backend/prisma/schema.prisma:6`, `docs/ITAM-V2-SYSTEM-REFERENCE.md` |
| Auth (session) | JWT (`jsonwebtoken`) ผ่าน **httpOnly cookie** ชื่อ `assethub_session` (ไม่ใช่ localStorage แม้เอกสารเก่าจะบอกว่าเป็น localStorage — ดูหมายเหตุด้านล่าง) | ^9.0.2 | `backend/src/middleware/auth.ts` (`AUTH_COOKIE_NAME`, `setAuthCookie`) |
| Password hashing | bcryptjs | ^2.4.3 | `backend/package.json` |
| LDAP/AD | ldapjs | ^2.3.3 | `backend/package.json`, `backend/src/services/ldap.ts` |
| Email | nodemailer | ^6.9.15 | `backend/package.json` |
| File upload | multer | ^2.1.1 | `backend/package.json` |
| Excel export (backend) | exceljs, xlsx | ^4.4.0 / ^0.18.5 | `backend/package.json` |
| Validation | zod | ^3.23.8 | `backend/package.json`, `backend/src/middleware/validation.ts` |
| Rate limiting | express-rate-limit | ^8.5.2 | `backend/package.json`, `backend/src/middleware/rateLimiter.ts` |
| AI/Chatbot | @google/genai (Gemini) | ^2.15.0 | `backend/package.json`, `backend/src/routes/ai.ts` |
| Testing | Vitest, Supertest | ^2.1.1 / ^7.0.0 | `backend/package.json` |
| Process Manager (production จริง) | **PM2** (ไม่ใช่ Docker ล้วนตามที่ compose ไฟล์บอก — ดูหัวข้อ Deployment) | — | ตรวจสอบจริงในเซสชันนี้: `pm2 list` แสดง `assethub-api` (id 0), `assethub-web` (id 1) รันแบบ fork mode |

**⚠️ หมายเหตุสำคัญเรื่อง Auth token storage:** เอกสารเก่า (`ARCHITECTURE.md`, `docs/ITAM-V2-SYSTEM-REFERENCE.md`) เขียนว่า JWT เก็บใน `localStorage` — จากการอ่าน source code จริงใน `backend/src/middleware/auth.ts` **ไม่ตรงกับข้อมูลนี้แล้ว**: ระบบเปลี่ยนมาใช้ **httpOnly cookie** (`assethub_session`) พร้อมคอมเมนต์อธิบายเหตุผลด้านความปลอดภัย (ปิดช่องโหว่ XSS ที่การอ่าน token จาก localStorage เปิดไว้) — เอกสารเก่าจึงเป็นข้อมูลที่ล้าสมัยไปแล้ว ไฟล์นี้ยึดตาม source code ปัจจุบันเป็นหลัก (LEVEL 1 VERIFIED)

## Backend Route Modules (27 ไฟล์ใน `backend/src/routes/`)

`admin.ts`, `ai.ts`, `assetLinks.ts`, `assetMasterData.ts`, `assets.ts`, `auth.ts`, `backup.ts`, `borrow.ts`, `categories.ts`, `contracts.ts`, `dashboard.ts`, `delivery.ts`, `departments.ts`, `disposals.ts`, `donation.ts`, `floorplan.ts`, `inventory.ts`, `licenses.ts`, `maintenance.ts`, `notifications.ts`, `pm.ts`, `pmSwHub.ts`, `pmSwHubPlan.ts`, `pmSwHubTemplate.ts`, `presence.ts`, `settings.ts`, `uploads.ts`

รวม **304 route definitions** (`router.get/post/put/patch/delete`) ทั้งระบบ — ดูรายการดิบที่ `docs/system-blueprint/_raw_api_routes_grep.txt` (แหล่งข้อมูลดิบสำหรับ Phase 13 API Inventory ของแต่ละโมดูล)

## Route Mounting Order (backend/src/app.ts)

```
/uploads              -> uploadsRoutes (static file serving)
/api/auth              -> authLimiter, authRoutes
/api/*                 -> apiLimiter (rate limit ทั่วไป ใช้กับทุก route ถัดจากนี้)
/api/assets             -> assetMasterDataRoutes (ต้อง mount ก่อน assetRoutes เพราะ assetRoutes มี GET /:id
                            ที่จะ "กิน" path คงที่อย่าง /device-types, /locations ถ้าลงทะเบียนทีหลัง — Express
                            จับคู่ router ตามลำดับการลงทะเบียน)
/api/assets             -> assetRoutes
/api/borrow             -> borrowRoutes
/api/pm                 -> pmRoutes
/api/pm-sw-hub          -> pmSwHubRoutes
/api/pm-sw-hub-plan     -> pmSwHubPlanRoutes
/api/pm-sw-hub-template -> pmSwHubTemplateRoutes
/api/admin              -> adminRoutes
/api/dashboard          -> dashboardRoutes
/api/inventory          -> inventoryRoutes
/api/categories         -> categoryRoutes
/api/departments        -> departmentRoutes
/api/donations          -> donationRoutes
/api/contracts          -> contractRoutes
/api/licenses           -> licenseRoutes
/api/disposals          -> disposalRoutes
/api/asset-links        -> assetLinkRoutes
/api/maintenance        -> maintenanceRoutes
/api/notifications      -> notificationsRoutes
/api/backup             -> backupRoutes
/api/settings           -> settingsRoutes
/api/ai                 -> aiRoutes
/api/presence           -> presenceRoutes
/api/floorplans         -> floorplanRoutes
/api/delivery           -> deliveryRoutes
/api/health             -> inline handler (health check, ไม่ auth)
/api/ready              -> inline handler (DB connectivity check ผ่าน SELECT 1, ไม่ auth)
```
Evidence: `backend/src/app.ts:121-181`

## Middleware Stack (เรียงตามลำดับจริงที่ execute)

1. `trust proxy` = 1 hop (เชื่อ `X-Forwarded-*` จาก nginx ชั้นเดียว, ปรับได้ผ่าน `TRUST_PROXY_HOPS`) — `app.ts:79`
2. Security headers เขียนมือ (ไม่ใช้ `helmet`): `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer-when-downgrade`, ลบ `X-Powered-By`, และถ้า production เพิ่ม `Strict-Transport-Security` — `app.ts:85-94`
3. CORS แบบ custom origin-check function: อนุญาต origin ที่ตรง `CORS_ORIGIN`/`FRONTEND_URL` เป๊ะๆ (`explicitAllowedOrigins`), หรือ hostname ที่ตรง `CORS_ALLOWED_HOSTNAMES` (`allowedOriginHostnames`, ปกติ localhost/127.0.0.1 ใน non-production), `credentials: true` — `app.ts:96-111`
4. `requestLogger` — log ทุก request/response พร้อม `requestId` (`backend/src/middleware/requestLogger.ts`)
5. `express.json()` — จำกัดขนาด body แยกสองระดับ: `/api/assets` scope ได้ 25MB (`IMPORT_BODY_LIMIT`, สำหรับ import Excel/JSON ก้อนใหญ่), ที่เหลือ 2MB (`JSON_BODY_LIMIT`) — `app.ts:121-122`
6. `authLimiter` เฉพาะ `/api/auth/*`, `apiLimiter` สำหรับ `/api/*` ที่เหลือ — `backend/src/middleware/rateLimiter.ts`
7. Route handlers ทั้งหมด (ตามลำดับด้านบน)
8. `errorHandler` — จุดจบท้ายสุด แปล error (รวมถึง Prisma error) เป็นข้อความอ่านง่าย + คืน `{ error: message }` พร้อม HTTP status ที่เหมาะสม — `backend/src/middleware/errorHandler.ts`

## Authentication & Authorization (สรุปย่อ — รายละเอียดเต็มอยู่ที่ `10_auth_security.md`)

- Auth แบบ **Hybrid**: ลองยืนยันตัวตนผ่าน AD/Intranet API ขององค์กรก่อน (`backend/src/services/auth.service.ts`, `ldap.ts`), ถ้าไม่ผ่านลอง Local (bcrypt) — ผลจะ upsert เข้า `AppUser`
- Token: JWT เซ็นด้วย `JWT_SECRET`, อายุคุมด้วย `JWT_EXPIRES_IN` (default 24h), ส่งกลับเป็น **httpOnly cookie** ชื่อ `assethub_session` — ไม่ใช่ Bearer token ที่ frontend เก็บเอง (แม้ `authenticate()` middleware จะรองรับ `Authorization: Bearer` header เป็น fallback ด้วยสำหรับ non-browser client) — `backend/src/middleware/auth.ts:63-134`
- Authorization: role-based ผ่าน `authorize(...roles)` middleware ที่เช็ค `req.user.role` ตรงกับ role string ที่ระบุ — role หลักที่ใช้งานจริงในระบบ (พบใน `authorize()` calls): `SUPERADMIN`, `IT_ADMIN`, `VIEWER` (endpoint จำนวนมากไม่ผ่าน `authorize()` เลย แปลว่าแค่ login แล้วเรียกได้ — เช่น endpoint ของ role `USER` ทั่วไป)
- Role enum เต็มใน Prisma schema: `SUPERADMIN`, `IT_ADMIN`, `USER`, `VIEWER`, `HR_CUSTODY` (ค่า legacy ที่เหลือใน enum แต่ไม่มีใครถือ role นี้แล้ว หลังฟีเจอร์ custody ถูกถอดออก)
- Role เพิ่มเติมที่ปรากฏใน UI แต่ **ยังไม่เปิดใช้งานจริง** (`live: false` ใน `UsersPermissionsTab.tsx`): `APPROVER`, `VENDOR` — เป็น role ที่ออกแบบเผื่อไว้ในอนาคต ไม่มีอยู่ใน Prisma enum จริง
- มีระบบอนุมัติแบบพิเศษที่ **ไม่ผูกกับ role** คือ "หัวหน้างานอนุมัติคำขอยืม" — ใช้ field `AppUser.managerId` (self-relation) แทน role แยกต่างหาก ใครก็เป็นหัวหน้างานของใครก็ได้โดยไม่ต้องมี role พิเศษ (เพิ่มเข้าระบบในเซสชันนี้)

## Deployment / Hosting

**⚠️ Production จริงไม่ตรงกับ `docker-compose*.yml` ทั้งหมด** — ยืนยันจากการตรวจสอบจริงในเซสชันนี้ (LEVEL 1 VERIFIED, ตรวจสอบ ณ วันที่ทำเอกสารนี้):

- `assethub-api` (backend) และ `assethub-web` (frontend, เสิร์ฟผ่าน `vite preview`) รันตรงบน **Windows host ผ่าน PM2** ไม่ใช่ใน Docker container
- Backend build ด้วย `tsc` เป็น `dist/index.js` แล้ว PM2 รันไฟล์นั้นตรงๆ (`node dist/index.js`)
- Frontend build ด้วย `vite build` เป็น `dist/` แล้ว `vite preview --port 5173 --host 0.0.0.0` เสิร์ฟไฟล์ static
- Database: PostgreSQL รันที่ `127.0.0.1:5433` (ยืนยันจาก `prisma migrate status` output ระหว่างทำงานเซสชันนี้)
- ไฟล์ `docker-compose.app.yml`, `docker-compose.prod.yml`, `docker-compose.shared.yml`, `nginx/nginx.conf`, `backend/Dockerfile`, `frontend/Dockerfile` มีอยู่ในโปรเจกต์แต่ **ไม่ตรงกับสถาปัตยกรรมที่รันอยู่จริงในปัจจุบัน** ตามที่ `docs/ITAM-V2-SYSTEM-REFERENCE.md` (เขียนไว้ก่อนหน้านี้) เตือนไว้แล้วว่าเกิดจาก production incident ที่ container เดิมพังแล้วทีมสลับมาใช้ PM2 แทนโดยไม่อัปเดต deployment docs — สถานะนี้ยังคงอยู่ ณ ตอนที่เขียนเอกสารนี้
- Deploy จริง (สังเกตจากการ deploy ในเซสชันนี้เอง): `npx prisma migrate deploy` (DB) → `npm run build` (backend, tsc) → `npm run build` (frontend, vite build) → `pm2 restart assethub-api` → `pm2 restart assethub-web`

## Notification System (สรุปย่อ)

- Multi-channel: **Email** (SMTP ผ่าน nodemailer), **LINE** (Broadcast/Multicast), **Teams** (webhook) — เปิด/ปิดแยกแต่ละ channel ได้ผ่าน `NotificationSetting`
- Pattern: event-driven → เขียนแถวลง `NotificationOutbox` (สถานะ PENDING) ผ่านฟังก์ชัน `createNotification(eventType, channel, recipient, payload)` → มี worker/queue processor แยกส่งจริง (`processNotificationQueue` ใน `backend/src/services/notification.ts`)
- Event ถูกกรองด้วย allow-list แบบ comma-separated string ใน `NotificationSetting.enabledEventKeys` — ถ้า event ไม่อยู่ใน list (และ list ไม่ว่าง) จะถูกข้าม (silent skip, มี log แจ้ง)
- Template ต่อ event เก็บใน `NotificationTemplate`, มีค่า default ฝังในโค้ด (`DEFAULT_TEMPLATES` ใน `admin.ts`) ที่ admin กด "รีเซ็ตเป็นค่าเริ่มต้น" ได้
- In-app notification แยกอีกระบบ (`AppNotification` model) — ไม่ผ่าน outbox, insert ตรงเข้า DB ให้ผู้ใช้เห็นในกระดิ่งแจ้งเตือนทันที

## External Integrations

| ระบบ | ทิศทาง | Auth | Purpose | Evidence |
|---|---|---|---|---|
| Active Directory / Intranet API (`intra-tools.trrgroup.com`) | Outbound | Application code "INTRANET" | Login (ยืนยันตัวตนพนักงาน), ดึงข้อมูล AD user สำหรับ autofill, sync บริษัท/แผนก | `backend/src/services/ldap.ts`, `auth.service.ts`, `intraSync.ts` |
| GLPI (asset management ภายนอก, `10.100.77.229/glpi`) | Outbound | Session token (`initSession`/`killSession`) + App-Token + User-Token | ดึงสเปคฮาร์ดแวร์จริง (CPU/RAM/OS/Office/Antivirus/จอที่เชื่อมต่อ) ด้วย Serial Number มาเทียบ/sync กับทะเบียน | `backend/src/services/glpi.ts` |
| External Asset-Monitoring Agent (`EXTERNAL_ASSET_API_URL`) | Outbound | `x-api-key` header | ดึงข้อมูล real-time จากเครื่อง (battery health, disk space, antivirus, Windows Update, จอที่ต่ออยู่, printer USB) สำหรับหน้าทำ PM และหน้า "ตรวจสอบข้อมูลจาก Agent" | `backend/src/services/externalAgent.ts`, `agentMonitors.ts`, `agentPmCheck.ts`, `agentFleetHealth.ts` |
| Google Gemini AI | Outbound | API key (`GEMINI_API_KEY`) | Chatbot ในแอป (`<Chatbot />` component ปรากฏทุกหน้าหลัง login) | `backend/src/routes/ai.ts`, `frontend/src/components/Chatbot.tsx` |
| LINE Messaging API | Outbound | Channel Access Token | ส่งแจ้งเตือน Broadcast/Multicast | `NotificationSetting.lineChannelAccessToken` และการเรียกใน `notification.ts` |
| Microsoft Teams | Outbound | Webhook URL | ส่งแจ้งเตือนเข้าช่อง Teams | `NotificationSetting.teamsWebhookUrl` |
| SMTP (email) | Outbound | Username/Password (ตั้งค่าได้ผ่าน DB หรือ env) | ส่งอีเมลแจ้งเตือนทุกประเภท | `NotificationSetting` fields `smtp*` |

## File Storage

- Local filesystem — โฟลเดอร์ `uploads/` แยกย่อยตามประเภท (พบใน `borrow.ts`: `uploads/borrow/`; ลักษณะเดียวกันคาดว่าใช้กับ maintenance/donation — ต้องตรวจแต่ละ route เพื่อยืนยัน)
- เสิร์ฟผ่าน `app.use('/uploads', uploadsRoutes)` (route พิเศษ ไม่ใช่ static middleware ตรงๆ) — `backend/src/app.ts:124`
- Upload ใช้ `multer` เก็บเป็น disk storage, ตั้งชื่อไฟล์ด้วย UUID (ป้องกันชนกัน/เดาชื่อไฟล์)

---
*ไฟล์นี้เป็นส่วนหนึ่งของ System Blueprint — ดู `INDEX.md` สำหรับสารบัญเต็ม*
