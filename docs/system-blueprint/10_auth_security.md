# MODULE: Authentication, Authorization & Security

## Authentication Flow

ระบบพยายามยืนยันตัวตนผ่าน **Active Directory (LDAP) ก่อนเสมอ** แล้วจึง fallback ไปตรวจ local password (`AppUser.passwordHash`) เฉพาะเมื่อ LDAP ตอบว่า `null` (bind ไม่ผ่าน หรือ Employee API ล้มเหลว) — ไม่ใช่กรณี username ไม่พบใน AD แล้วข้ามไป local ทันที แต่เป็น "AD ปฏิเสธ/เชื่อมต่อไม่ได้ → ลอง local user record ที่มี passwordHash"

ลำดับที่แท้จริงใน `AuthService.login()` (`backend/src/services/auth.service.ts:21-140`):

1. `username = username.toLowerCase()` (auth.service.ts:22)
2. ถ้า `isDevAuthBypass(username, password)` เป็นจริง (เฉพาะ non-production และ `ALLOW_DEV_AUTH_BYPASS=true`, และ password === `'password'` หรือ username มีคำว่า `test`) — ข้าม LDAP ไปเลย ใช้ค่าจาก `AppUser` ที่มีอยู่แล้วเป็น `ldapInfo` (auth.service.ts:26-42, `config/env.ts:17-20`)
3. มิฉะนั้น เรียก `authenticateLDAP(username, password)` (auth.service.ts:44) ซึ่งทำ 2 ขั้นตอนใน `ldap.ts`:
   - **Bind**: เปิด LDAP client ไปยัง `ldap://LDAP_HOST:LDAP_PORT`, สร้าง bind DN ด้วย `buildBindUser()` (เติม `LDAP_DOMAIN\` ถ้า username ไม่มี `\` หรือ `@`) แล้ว `client.bind(dn, password)` (`ldap.ts:86-103`) — นี่คือขั้นตอนที่ตรวจรหัสผ่านจริงกับ AD; bind ล้มเหลว → return `null` ทันที (ไม่ลอง Employee API ต่อ)
   - **Fetch profile**: ถ้า bind ผ่าน เรียก REST API ภายในองค์กร `GET https://intra-serv.trrgroup.com/api_intranet/Employee/Employee_Get?show_profile=Y&employee_username={username}` (`ldap.ts:107-110`) ไม่ใช่ LDAP search — ระบบดึงโปรไฟล์ (ชื่อ, อีเมล, แผนก, บริษัท, รูป) จาก Intranet API ตัวนี้ ไม่ใช่จาก LDAP attributes โดยตรง ถ้า response ไม่ `ok`, `status !== 'Success'`, ไม่มี `data[0]`, หรือ `employee_username` ใน response ไม่ตรงกับ username ที่ขอ (case-insensitive) → return `null`
4. ถ้า `ldapInfo` เป็น `null` (AD bind ล้มเหลว หรือ Employee API ล้มเหลว/ไม่ตรง) → หา `AppUser` local ด้วย `adUsername`; ถ้ามี `passwordHash` และ `bcrypt.compare(password, hash)` ผ่าน → `authType = 'LOCAL'`; ถ้าไม่มี local user หรือรหัสผ่านผิด → throw `AppError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', 401)` (auth.service.ts:47-61)
5. Upsert เข้า `AppUser` โดย key คือ `adUsername`:
   - **ไม่พบ user** → `prisma.appUser.create()` ด้วยค่าจาก `ldapInfo` (หรือ username เปล่าถ้าไม่มี ldapInfo), `role: 'USER'` เป็นค่าเริ่มต้นเสมอ, `authType` ตามที่ resolve ได้, `passwordHash: null` (auth.service.ts:67-82)
   - **พบ user อยู่แล้ว** → อัปเดตเฉพาะ `lastLoginAt` เสมอ; ถ้า `authType === 'AD'` และมี `ldapInfo` จะ sync ฟิลด์โปรไฟล์ (displayName, email, department, company, companyThai, thaiName, avatarUrl) จาก AD ทับของเดิม, และเลื่อน `authType` เป็น `'AD'` ถ้ายังไม่ใช่; ถ้า login ผ่านทาง local password จะเลื่อน `authType` เป็น `'LOCAL'` แทน — **role ของ user เดิมจะไม่ถูกแตะต้องเลยในทุกกรณี** (auth.service.ts:83-104)
6. ถ้า `!user.isActive` → throw `AppError('บัญชีผู้ใช้ถูกปิดใช้งาน', 403)` (auth.service.ts:106-108)
7. สร้าง JWT ด้วย `generateToken()` แล้วส่งกลับทั้ง `token` และ `user` object (auth.service.ts:110-139)

ที่ controller (`auth.controller.ts:19-46`) หลัง `AuthService.login()` สำเร็จ: บันทึก login log แบบ fire-and-forget (`void recordLogin(...)`, ไม่ await), ตั้ง httpOnly session cookie ด้วย `setAuthCookie()`, แล้วส่ง JSON กลับ (ที่ยังมี `token` อยู่ในตัวด้วย เพื่อรองรับ non-browser client ที่ใช้ Bearer header). กรณี error จะบันทึก login log แบบ `success: false` ก่อนส่ง error ต่อไปที่ `errorHandler`.

`AuthService.checkExpiry()` (สำหรับหน้า "เช็ควันหมดอายุรหัสผ่าน" บนหน้า Login) ก็ผ่าน dev-bypass check เดียวกัน แล้วเรียก `checkPasswordExpiry()` ใน `ldap.ts` ซึ่ง bind เข้า AD ด้วย username/password ที่กรอก แล้ว search แอตทริบิวต์ `msDS-UserPasswordExpiryTimeComputed`, `pwdLastSet`, `userAccountControl` เพื่อคำนวณวันหมดอายุ (รองรับ fallback คำนวณจาก domain `maxPwdAge` ถ้าไม่มี computed attribute) — endpoint นี้จึงเป็นการตรวจรหัสผ่านกับ AD จริง (ไม่ทัชฐานข้อมูล local เลย, ไม่สร้าง/อัปเดต `AppUser`)

```mermaid
sequenceDiagram
    participant Browser
    participant API as Express (auth.controller)
    participant Svc as AuthService
    participant LDAP as ldap.ts (AD bind)
    participant EmpAPI as intra-serv.trrgroup.com Employee API
    participant DB as AppUser (Prisma/Postgres)

    Browser->>API: POST /api/auth/login {username, password}
    API->>Svc: AuthService.login(username, password)
    alt dev bypass enabled & matches
        Svc->>DB: findUnique(adUsername) for profile fields
    else normal path
        Svc->>LDAP: authenticateLDAP(username, password)
        LDAP->>LDAP: client.bind(domain\username, password)
        alt bind fails
            LDAP-->>Svc: null
        else bind ok
            LDAP->>EmpAPI: GET Employee_Get?employee_username=...
            EmpAPI-->>LDAP: profile JSON (or error)
            LDAP-->>Svc: LDAPUserInfo | null
        end
    end
    alt ldapInfo is null
        Svc->>DB: findUnique(adUsername)
        alt local user has passwordHash && bcrypt.compare ok
            Svc->>Svc: authType = 'LOCAL'
        else
            Svc-->>API: throw AppError 401 "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"
        end
    end
    Svc->>DB: findUnique(adUsername) again
    alt user not found
        Svc->>DB: create AppUser (role='USER', authType, passwordHash=null)
    else user found
        Svc->>DB: update (lastLoginAt, + AD profile fields if authType AD)
    end
    alt user.isActive === false
        Svc-->>API: throw AppError 403 "บัญชีผู้ใช้ถูกปิดใช้งาน"
    end
    Svc->>Svc: generateToken(user) [jwt.sign]
    Svc-->>API: { token, user }
    API->>DB: recordLogin (fire-and-forget, LoginLog)
    API->>Browser: Set-Cookie assethub_session (httpOnly); JSON { token, user }
```

## Session/Token mechanism

- **Mechanism**: JWT (`jsonwebtoken`), delivered two ways simultaneously — as an **httpOnly cookie** named `assethub_session` (`middleware/auth.ts:8`, set in `setAuthCookie()` at `auth.ts:63-71`) which is what the browser SPA relies on, and also in the JSON response body (`{ token, user }`) for non-browser clients that authenticate with an `Authorization: Bearer` header.
- **httpOnly**: yes — `res.cookie(AUTH_COOKIE_NAME, token, { httpOnly: true, secure: req.secure, sameSite: 'lax', path: '/', maxAge: cookieMaxAgeMs() })` (`auth.ts:64-70`). Comment at `auth.ts:44-49` states this closes the XSS path of a script reading the token out of localStorage. Confirmed on the frontend: `AuthContext.tsx:59-65` says the token is no longer kept in localStorage; `login()` at `AuthContext.tsx:73-78` only reads `res.data.user`, not `res.data.token`.
- **secure flag**: tied to `req.secure` (real scheme via `X-Forwarded-Proto`, since `app.set('trust proxy', ...)` in `app.ts:79`), **not** to `NODE_ENV=production` — the code comment explains production nginx currently serves on plain `:80`, so a hardcoded `secure: isProduction()` would have silently dropped every production login cookie (`auth.ts:51-62`).
- **sameSite**: `'lax'` — comment explains nginx serves frontend and `/api/` from the same origin in real deployments, so this is effectively same-site; `lax` also permits the cookie on top-level GET navigations like backup-download links (`auth.ts:44-49`).
- **Secret source**: `getJwtSecret()` in `config/env.ts:53-66`. Reads `process.env.JWT_SECRET`. In production, throws if the secret is missing, shorter than 32 chars, or one of three known placeholder strings (`WEAK_JWT_SECRETS` set, `config/env.ts:1-5,22-26`). Outside production, falls back to the placeholder `'assethub-jwt-secret-change-in-production'` if unset. `validateProductionEnv()` (`config/env.ts:33-51`) is called once at startup (`index.ts:9`) and throws (crashing startup) if `JWT_SECRET` is weak, `DATABASE_URL` contains a known-weak password pattern, or `ALLOW_DEV_AUTH_BYPASS=true` in production.
- **Expiry**: `JWT_EXPIRES_IN` env var (default `'24h'`), read by `generateToken()` in `auth.ts:102-109` for the JWT's own `exp` claim, and separately parsed by `cookieMaxAgeMs()` (`auth.ts:35-42`) for the cookie's `maxAge` (only understands `<number><unit s|m|h|d>`; anything else falls back to 24h for the cookie specifically, though the token itself still honors whatever `generateToken()` signed). A code comment (`auth.ts:30-34`) notes this was a real bug fixed: `JWT_EXPIRES_IN` was documented but never actually read, so every token used to be hardcoded to 24h regardless of the env value.
- **Verification per request**: `authenticate()` middleware (`middleware/auth.ts:111-134`). Checks `Authorization: Bearer <token>` header first; if absent, falls back to parsing the raw `Cookie` header for `assethub_session` via a hand-rolled `parseCookieHeader()` (no `cookie-parser` dependency — comment at `auth.ts:10-12` explains this was to avoid regenerating `package-lock.json` in a sandbox where `npm install` couldn't be verified). No token found → `AppError('ไม่พบ Token การยืนยันตัวตน', 401)`. Token present → `jwt.verify(token, getJwtSecret())`, cast to `AuthUser`, assigned to `req.user`; verify failure (bad signature/expired) → `AppError('Token ไม่ถูกต้องหรือหมดอายุ', 401)`.
- **Query-string token fallback**: `middleware/allowQueryToken.ts` lets a request carry `?token=<jwt>` and rewrites it into `req.headers.authorization = 'Bearer ...'` before `authenticate()` runs — for `<img>`/download links where setting a header isn't possible.
- **Logout**: `AuthController.logout` (`auth.controller.ts:53-56`) calls `clearAuthCookie()` and always returns success — client JS cannot clear an httpOnly cookie itself, so this is a real server round-trip.
- **Frontend idle logout**: `AuthContext.tsx:92-121` — a 30-minute inactivity timer (reset on mousemove/keydown/scroll/click) calls `logout()` client-side. This is **frontend-only**; the JWT itself stays valid until its real expiry regardless of idle time (explicitly called out in `.env.example`'s `JWT_EXPIRES_IN` comment).

## Password policy

- **Local-account passwords** (`AppUser.passwordHash`, `authType='LOCAL'`) are hashed with `bcrypt` (cost factor `10`) — see `AuthService.createLocalUser` (`auth.service.ts:147`), `setLocalPassword` (`auth.service.ts:167`), and the change-password route (`routes/auth.ts:64`).
- **Complexity rule**: only a minimum length is enforced, **no** composition rules (uppercase/digit/symbol) found anywhere in the codebase.
  - Server-side: `routes/auth.ts:11,48-52` — `MIN_LOCAL_PASSWORD_LENGTH = 8`, enforced in `POST /api/auth/change-password`; also rejects reusing the same password (`routes/auth.ts:53-55`) and requires the current password to `bcrypt.compare` correctly first.
  - Client-side: `ProfilePage.tsx:53-56` duplicates the same 8-character minimum check before calling the API (client-side check is advisory only — server re-validates).
  - AD-managed accounts (`authType='AD'`) have no password policy enforced by this app at all — password rules for those live entirely in Active Directory; this app only calls `checkPasswordExpiry()` to *read* AD's expiry state, never to set or validate password strength.
- Login itself (`loginSchema` in `middleware/validation.ts:5-8`) only validates `username`/`password` are non-empty strings within length caps (100/200 chars) — no complexity check at login (correct, since login isn't where a password is chosen).

## Rate limiting

Configured in `backend/src/middleware/rateLimiter.ts` using `express-rate-limit`, all windows `15 * 60 * 1000` ms (15 min), all **skipped entirely when `NODE_ENV === 'development'`**:

| Limiter | Max (per IP / 15 min) | Applied to | Notes |
|---|---|---|---|
| `authLimiter` | 100 | every `/api/auth/*` route, mounted in `app.ts:125` (`app.use('/api/auth', authLimiter, authRoutes)`) | Generic budget for the whole auth router |
| `loginLimiter` | `LOGIN_RATE_LIMIT_MAX` env var, default **15** | specifically `POST /api/auth/login` and `POST /api/auth/check-expiry` (`routes/auth.ts:14,17`) | `skipSuccessfulRequests: true` — only failed attempts count; comment (`rateLimiter.ts:12-14`) explains this stricter limit exists to stay under AD's own account-lockout threshold |
| `apiLimiter` | 5000 | all of `/api/*` (`app.ts:126`, after auth routes are already mounted) | Broad API-wide ceiling |

`app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS ?? 1))` (`app.ts:79`) is required for these limits to apply per real client IP rather than per-nginx-hop; comment explains without it every request would appear to come from nginx's IP and the whole office would share one budget.

## Authorization model

`authorize(...roles: string[])` (`middleware/auth.ts:136-142`) is a middleware factory: it requires `req.user` to already be set (i.e. must run after `authenticate`) — no `req.user` → `AppError('ไม่ได้ล็อกอิน', 401)`; `req.user.role` not included in the given `roles` list → `AppError('ไม่มีสิทธิ์เข้าถึง', 403)`; otherwise `next()`. It is a flat allow-list check against the single `role` string on the JWT payload — no hierarchy/inheritance logic in the middleware itself.

**`UserRole` enum** (`backend/prisma/schema.prisma:1207-1213`) — the full defined set:
- `SUPERADMIN`
- `IT_ADMIN`
- `USER`
- `VIEWER`
- `HR_CUSTODY`

**Role strings actually referenced in `authorize(...)` calls across the backend** (grep of `authorize(...)` in `backend/src/routes/*.ts`): `'SUPERADMIN'`, `'IT_ADMIN'`, `'VIEWER'` — `'HR_CUSTODY'` is defined in the schema enum but was not found used in any `authorize()` call scanned; `'USER'` is the default role assigned to every new account (`auth.service.ts:78`) but is likewise not passed to `authorize()` anywhere (routes open to `'USER'` are simply left un-role-gated, protected only by `authenticate`). The role-set accepted by `PUT /api/admin/users/:id/role` (`routes/admin.ts:107`) is `['SUPERADMIN', 'IT_ADMIN', 'USER', 'VIEWER']` — a code comment there notes `VIEWER` was previously missing from this allow-list even though the UI already offered it, and was added to stay in sync with the Prisma enum (still omits `HR_CUSTODY`).

**managerId-based authorization (supervisor-approval feature)** — this is a *non-role-based* authorization path layered on top of the role system, for the borrow-request supervisor approval flow (`backend/src/routes/borrow.ts`, `backend/src/routes/admin.ts`):
- `AppUser.managerId` is a self-referential FK (any user can be set as another user's manager — comment at `borrow.ts:360-362`: "Anyone can be a manager (no dedicated role) — `managerId` on the requester is what grants access").
- Only `SUPERADMIN` can set it: `PUT /api/admin/users/:id/manager` is gated `authorize('SUPERADMIN')` (`admin.ts:122`). It rejects self-assignment (`admin.ts:136`) and walks the candidate manager's own `managerId` chain to reject cycles (`admin.ts:140-146`).
- When a user submits a borrow request, if their `AppUser.managerId` resolves to an existing user, the request is created with `status: 'PendingSupervisor'` instead of `'Pending'`, and only the manager is notified first — IT Admin is not notified until the manager approves (`borrow.ts:163-168, 242-255`). Users with no `managerId` skip straight to the old IT-Admin-only queue (`borrow.ts:256-277`).
- `GET /api/borrow/requests/supervisor-queue` (`borrow.ts:363-385`) requires only `authenticate` (any logged-in user) — the actual access control is the Prisma `where` clause itself: `requester: { managerId: req.user!.userId }` (`borrow.ts:368`), i.e. a user only ever sees requests from people who have *them* set as manager.
- `POST /api/borrow/requests/:id/supervisor-approve` (`borrow.ts:388-410`) double-checks at the row level: `request.requester.managerId !== req.user!.userId && !['SUPERADMIN'].includes(req.user!.role)` → 403 (`borrow.ts:399-401`) — so a `SUPERADMIN` can approve on any manager's behalf as an escape hatch, but otherwise only the exact assigned manager can act on that specific request, independent of their `role`.

## Login audit / failed login tracking

Handled by `backend/src/services/loginAudit.ts`, writing to the `LoginLog` Prisma model, called from `AuthController.login` for **both** success and failure paths (`auth.controller.ts:28,38-43`) via `recordLogin()` — fire-and-forget (`void`, not awaited) so audit-logging latency/failure never blocks or breaks the login response.

Per attempt, `recordLogin()` (`loginAudit.ts:136-168`) writes: `userId` (null on failure/unknown user), `username` (truncated to 200 chars), `success` (bool), `reason` (failure message, truncated to 300 chars by the controller), `ip`, `userAgent` (truncated to 400 chars), `hostname`, `authType`. On success it also stamps `AppUser.lastLoginIp`, `lastLoginAgent`, `lastLoginHost` on the user row (`loginAudit.ts:153-162`) — these are shown on `ProfilePage.tsx` (`lastLoginAt` etc., `ProfilePage.tsx:78`) and exposed via `AuthService.getUserById` (`auth.service.ts:191-193`).

Hostname resolution (`resolveHost()`, `loginAudit.ts:118-120`) does **not** use reverse-DNS on the client IP. A code comment explains why (`loginAudit.ts:15-19`): nginx runs in Docker with port-mapping SNAT, so every request's `req.ip` arrives as the same Docker-internal IP (`172.19.0.1`) regardless of the real client — IP-based hostname lookup is useless in this deployment. Instead it queries the external monitoring Agent (`fetchAllAgentRecords()` from `services/externalAgent`) for which Windows machine has this AD account currently logged in (`resolveHostByUser`), falling back to an IP→hostname map from the same Agent data (`resolveHostByIp`) when available. Results are cached in-memory for 5 minutes (`TTL_MS`, `loginAudit.ts:38`).

`GET /api/auth/login-history` (`routes/auth.ts:27-38`) lets any authenticated user view **only their own** login history (`where: { userId: req.user!.userId }`), capped at 100 rows, no admin role required — the comment explains this is intentional so users can self-audit for suspicious access without needing admin rights (`routes/auth.ts:25-26`).

## Background jobs

All three live in `backend/src/jobs/`. Startup wiring is in `backend/src/index.ts:14-20`, inside the `app.listen()` callback.

### `overdueChecker.ts` — `startOverdueChecker()`
- **Trigger**: called once at server startup (fires both checks immediately), then re-runs every hour via `setInterval(..., 60 * 60 * 1000)` (`overdueChecker.ts:198-214`). No cron library — plain `setInterval`.
- **`checkOverdueBorrows()`**: reads `BorrowRequestItem` rows where `itemStatus in [CheckedOut, PartiallyReturned]` and `dueDate < now`, plus their requester and asset (`overdueChecker.ts:10-20`). Groups overdue items per requester and sends one `overdue_borrow` EMAIL notification per requester, plus a combined summary EMAIL to every `IT_ADMIN`/`SUPERADMIN` and a LINE broadcast (`overdueChecker.ts:22-99`). Writes a `ScheduledJob` audit row (`jobType: 'overdue_check'`) on completion (`overdueChecker.ts:101-107`). Uses `retryWithBackoff` around DB reads/writes.
- **`checkOverduePMs()`**: reads `PMPlan` rows whose `endDate < now` and that still have runs `not COMPLETED`, notifies `IT_ADMIN`/`SUPERADMIN` by email and a LINE broadcast per overdue plan (`overdueChecker.ts:120-196`). No `ScheduledJob` row written for this one.
- Both wrapped in try/catch that only logs (structured JSON log) — never throws out of the interval callback.

### `proactiveSummary.ts` — `startDailySummaryJob()` / `sendDailySummary()`
- **Not currently wired up**: `startDailySummaryJob` is exported (`proactiveSummary.ts:47-59`, designed to fire 10s after startup then every 24h) but grep across `backend/src` finds **no import/call site** for it anywhere, including `index.ts`. This job is effectively dead code in the current build — flagged under Unknown/Not Verified below in case it's started elsewhere not covered by this read (e.g. a separate worker process) but none was found.
- If it were running, `sendDailySummary()` would count overdue borrows, pending borrow requests, remaining PM runs for the current year, and assets with warranty expiring within 30 days, then send one `daily_summary` LINE broadcast notification.

### `agentSpecSync.ts` — `startAgentSpecSync()` / `runAgentSpecAutofill()`
- **Trigger**: called at startup (`index.ts:18`); internally delays its first run by 60s, then repeats every 24h (`DAY_MS`) via `setInterval` (`agentSpecSync.ts:37-49`). No-ops entirely if `AGENT_AUTOFILL_ENABLED=false`, or if `EXTERNAL_ASSET_API_URL`/`EXTERNAL_ASSET_API_KEY` are unset (`agentSpecSync.ts:17-18,38-41`).
- **What it does**: calls `fillBlanksFromAgent(prisma, { actorUserId: null })` (from `services/externalAgent`) to top up **only empty** asset spec fields from the external read-only monitoring Agent — a field that already has a value is never overwritten, by design (doc comment `agentSpecSync.ts:1-9`), since deciding between two conflicting real values needs human review elsewhere in the UI. `actorUserId: null` marks the change history as job-driven rather than user-driven.

## Environment Variables Inventory

Source: `backend/.env.example`. All values present in that file are placeholders/examples (no real secret detected).

**Server**: `PORT`, `NODE_ENV`, `FRONTEND_URL` (canonical frontend origin), `CORS_ORIGIN` (comma-separated exact allowed origins), `CORS_ALLOWED_HOSTNAMES` (looser hostname-only CORS allowance)

**Request body limits**: `JSON_BODY_LIMIT` (default JSON cap), `IMPORT_BODY_LIMIT` (larger cap for bulk asset JSON import)

**Database**: `DATABASE_URL` (Postgres connection string)

**Backup/Restore**: `PG_DUMP_PATH`, `PSQL_PATH` (optional explicit paths to Postgres client tools for the backup feature's `pg_dump`/`psql` shell-out)

**Auth**: `JWT_SECRET`, `JWT_EXPIRES_IN`, `ALLOW_DEV_AUTH_BYPASS` (dev-only LDAP bypass switch, must never be true in production — enforced by `validateProductionEnv()`)

**LDAP/AD**: `LDAP_HOST`, `LDAP_PORT`, `LDAP_BASE_DN`, `LDAP_DOMAIN`, `LDAP_SEARCH_USER`, `LDAP_SEARCH_PASSWORD` (service account used for AD *search* operations like `searchADUsers`/`getAllADCompanies`/`getAllADDepartments` — not used for the per-user login bind, which binds as the logging-in user themselves)

**Email (Office365)**: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

**MS Teams**: `TEAMS_WEBHOOK_URL`

**GLPI Integration**: `GLPI_API_URL`, `GLPI_USER_TOKEN`, `GLPI_APP_TOKEN`

**AI Chatbot (Google Gemini)**: `GEMINI_API_KEY`

**External Asset Monitoring Agent**: `EXTERNAL_ASSET_API_URL`, `EXTERNAL_ASSET_API_KEY` (read-only integration; gates `agentSpecSync.ts` and the Agent-based hostname lookups in `loginAudit.ts`)

**Borrow settings**: `BORROW_DUE_DAYS`

**Rate limiting**: `LOGIN_RATE_LIMIT_MAX` (see Rate limiting section)

Also referenced in code but **not listed** in `.env.example` (found via reading source, not enumerated in the example file): `TRUST_PROXY_HOPS` (`app.ts:79`), `AGENT_AUTOFILL_ENABLED` (`agentSpecSync.ts:17,38`).

## Security headers / CORS / CSRF / XSS / SQL injection protections

**Security headers** — hand-written middleware in `app.ts:85-94` (explicitly chosen over adding the `helmet` dependency, per comment `app.ts:81-84`, since a new dependency would require regenerating `package-lock.json`):
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: no-referrer-when-downgrade`
- `X-Powered-By` header removed
- `Strict-Transport-Security: max-age=15552000; includeSubDomains` — only set `if (isProduction())`
- No CSP, COEP, or other headers helmet would provide — explicitly called out as a gap in the comment.

**CORS** (`app.ts:96-111`): custom `origin` callback, not a wildcard. Requests with no `Origin` header (non-browser clients) are always allowed. Browser-origin requests are allowed only if the exact normalized origin is in `explicitAllowedOrigins` (from `CORS_ORIGIN` + `FRONTEND_URL`), or its hostname is in `allowedOriginHostnames` (from `CORS_ALLOWED_HOSTNAMES`, plus `localhost`/`127.0.0.1` auto-added outside production only, `app.ts:56-58`). `credentials: true` is set, required for the httpOnly cookie to be sent cross-origin when applicable. A startup warning fires if production has zero configured origins (`app.ts:61-66`).

**CSRF**: no explicit CSRF token/middleware found. Mitigating factors present: `sameSite: 'lax'` on the session cookie limits cross-site POST submission of the cookie, and CORS `credentials: true` combined with the strict origin allow-list means a foreign origin's `fetch`/XHR with credentials would be rejected by the browser's CORS check before a state-changing request's response could be read (though the request itself may still hit the server for simple-CORS-safe verbs — no explicit CSRF-token defense was found beyond cookie `SameSite` + CORS origin checking). This is a gap worth flagging, not a claim that CSRF is fully solved.

**XSS**: primary stated defense is that the JWT lives in an httpOnly cookie, not localStorage, specifically to prevent a successful XSS payload from exfiltrating the session token (`auth.ts:44-49`, `AuthContext.tsx:59-65`). No sanitization/escaping library observed in the auth-related files read; React's default JSX escaping is the implicit general-purpose XSS mitigation for rendered user data on the frontend (not verified beyond what these files show).

**SQL injection**: all database access observed in the auth/security files goes through Prisma Client (`prisma.appUser.findUnique/create/update`, etc.), which parameterizes queries — no raw string-concatenated SQL was seen in `auth.service.ts`, `loginAudit.ts`, `ldap.ts`, or `auth.controller.ts`. (`app.ts:169` does use `prisma.$queryRaw`\`SELECT 1\`` for the `/api/ready` health check — a fixed literal query with no interpolated input, so not an injection vector.)

**LDAP injection**: `ldap.ts:42-49` (`escapeFilter()`) escapes `\`, `*`, `(`, `)`, and null bytes before interpolating user-supplied values into LDAP search filters (used in `checkPasswordExpiry`, `searchADUsers`) — explicit protection against LDAP filter injection. Note the login-bind path itself (`buildBindUser` + `client.bind`) does not build a filter string at all, so injection there is not applicable; escaping matters specifically for the `search()` calls.

## Error Handling architecture

Central error class hierarchy in `middleware/errorHandler.ts`:
- `AppError extends Error` (`errorHandler.ts:63-70`) — base class, `constructor(message, status = 400)`, sets `this.status` and `this.name = 'AppError'`.
- `ValidationError` (400), `NotFoundError` (404, default message "ไม่พบทรัพยากร"), `UnauthorizedError` (401, default "ไม่ได้รับอนุญาต"), `ForbiddenError` (403, default "ไม่มีสิทธิ์เข้าถึง") — all thin subclasses of `AppError` with a fixed/default status (`errorHandler.ts:72-98`).

**Flow**: route handlers/controllers wrap logic in try/catch and call `next(err)` on failure (seen throughout `auth.controller.ts`, `routes/auth.ts`, `routes/borrow.ts`, `routes/admin.ts`) — errors are either a thrown `AppError`/subclass with an explicit status and Thai message (e.g. `throw new AppError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', 401)` in `auth.service.ts:56`), or an unexpected exception (e.g. a Prisma error, a bug) that falls through with no `.status` set.

`errorHandler(err, req, res, next)` (`errorHandler.ts:37-61`), registered last in `app.ts:183` (`app.use(errorHandler)`), is the single sink:
1. `translatePrismaError(err)` (`errorHandler.ts:17-35`) first checks for Prisma's duck-typed `err.code`: `P2002` (unique constraint) → 409 with a Thai message naming the duplicated field (translated via `DUPLICATE_FIELD_LABELS_TH`, e.g. `assetCode` → "รหัสทรัพย์สิน"); `P2025` (record not found) → 404 "ไม่พบข้อมูลที่ต้องการ...". This runs *before* falling back to `err.status`, so a raw Prisma error never leaks its native message to the client.
2. Otherwise: `status = err.status || 500`, `message = err.message || 'เกิดข้อผิดพลาดภายในระบบ'`.
3. Always logs a structured JSON line to stderr (`requestId`, timestamp, status, real `err.message`, path, method, and `err.stack` only when `NODE_ENV === 'development'`) — full detail server-side regardless of what's sent to the client.
4. Responds `res.status(status).json({ error: message, requestId, timestamp, ...(dev && { details: err.stack }) })` — stack trace is only ever included in the HTTP response when running in development; production clients get status + Thai message + requestId + timestamp only.

So the concrete mapping is: **AppError(msg, 401)** (bad credentials, bad/missing token) → HTTP 401 with that Thai message; **AppError(msg, 403)** (inactive account, role/manager check failure) → 403; **AppError(msg, 404)** → 404; Prisma `P2002`/`P2025` → 409/404 auto-translated; anything else (uncaught bug, network error, etc.) → 500 with a generic Thai message, real detail only in server logs (and in the response body when `NODE_ENV=development`).

## Unknown / Not Verified

- **`startDailySummaryJob()` (`backend/src/jobs/proactiveSummary.ts`) appears unused** — no call site found in `backend/src/index.ts` or anywhere else searched under `backend/src`. Could not verify whether it's intentionally disabled, started from a file outside the paths searched, or simply dead code left after a refactor.
- **CSRF**: no dedicated CSRF-token middleware/library was found in the files read. Whether this is an accepted risk (mitigated by `SameSite=Lax` + strict CORS origin allow-list) or a genuine gap was not something the code comments addressed directly — noted as a gap above rather than asserted as either safe or vulnerable.
- **Content-Security-Policy / other helmet-style headers**: explicitly absent per the `app.ts:81-84` comment; not verified whether CSP is applied at the nginx layer instead (nginx config was not read as part of this section).
- **`HR_CUSTODY` role**: defined in the Prisma `UserRole` enum but no `authorize('HR_CUSTODY', ...)` call was found in the routes scanned in this task — could not confirm whether this role is actively used elsewhere in the codebase (e.g. a newer/removed custody feature — note the repo's recent commit history includes "feat: drop the custody feature", which may explain why this role now appears orphaned) or reserved for a future feature.
- **`ALLOW_DEV_AUTH_BYPASS` / `isDevAuthBypass`**: password-equals-`'password'` OR username-contains-`'test'` bypass logic (`config/env.ts:17-20`) is gated behind non-production + explicit env flag, verified in code, but this document did not verify runtime deployment configuration (i.e., cannot confirm no production-like staging environment has this flag mistakenly enabled — that's outside static code review).
- Frontend `services/api.ts` `SILENT_401_PATHS` (referenced by comment in `AuthContext.tsx:63-65`) was not read in this pass; behavior described here is only as characterized by that comment, not independently verified against `api.ts` itself.
