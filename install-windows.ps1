# ============================================================
#  AssetHub V2 — Windows Auto-Install Script
#  รองรับ: Windows 10/11, Windows Server 2019/2022
#  สิ่งที่ script นี้ทำ:
#    1. ตรวจสอบและติดตั้ง Node.js, PostgreSQL, Git, PM2
#    2. ตั้งค่า PostgreSQL Database
#    3. Build Frontend + Backend
#    4. Migrate Database (Prisma)
#    5. เปิด Firewall ports
#    6. รัน PM2 และตั้ง Auto-start
# ============================================================

param(
    [string]$InstallDir    = "C:\AssetHub",
    [string]$DBName        = "assethub",
    [string]$DBUser        = "assethub_user",
    [string]$DBPassword    = "AssetHub@2024!",
    [string]$PGPassword    = "",          # postgres superuser password (ถ้าว่างจะถามตอนรัน)
    [string]$JWTSecret     = "",          # ถ้าว่างจะ generate อัตโนมัติ
    [int]$BackendPort      = 3000,
    [int]$FrontendPort     = 5173,
    [string]$SourceDir     = "C:\Apps\assethub-V2"   # โฟลเดอร์ต้นทางบนเครื่องปัจจุบัน
)

# ── Color helpers ────────────────────────────────────────────
function Write-Step   { param($msg) Write-Host "`n━━━ $msg" -ForegroundColor Cyan }
function Write-OK     { param($msg) Write-Host "  ✓ $msg" -ForegroundColor Green }
function Write-Warn   { param($msg) Write-Host "  ⚠ $msg" -ForegroundColor Yellow }
function Write-Fail   { param($msg) Write-Host "  ✗ $msg" -ForegroundColor Red }
function Write-Info   { param($msg) Write-Host "  → $msg" -ForegroundColor Gray }

# ── Require Admin ────────────────────────────────────────────
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
        [Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Fail "กรุณารัน PowerShell ในฐานะ Administrator (Run as Administrator)"
    exit 1
}

Clear-Host
Write-Host @"
╔══════════════════════════════════════════════════════╗
║         AssetHub V2 — Auto Install for Windows       ║
║         IT Asset Management System                   ║
╚══════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

# ── Collect missing params ───────────────────────────────────
if (-not $PGPassword) {
    $PGPassword = Read-Host "กรอก password ของ postgres (superuser)" -AsSecureString |
                  ForEach-Object { [Runtime.InteropServices.Marshal]::PtrToStringAuto(
                      [Runtime.InteropServices.Marshal]::SecureStringToBSTR($_)) }
}
if (-not $JWTSecret) {
    $bytes = New-Object byte[] 48
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    $JWTSecret = [System.Convert]::ToBase64String($bytes)
    Write-Info "JWT Secret ถูก generate อัตโนมัติ"
}

$env:PGPASSWORD = $PGPassword
$PG_BIN = ""   # จะหาทีหลัง

# ════════════════════════════════════════════════════════════
# STEP 1 — ตรวจสอบ / ติดตั้ง Prerequisites
# ════════════════════════════════════════════════════════════
Write-Step "STEP 1/7 — ตรวจสอบ Prerequisites"

# ── winget ──────────────────────────────────────────────────
$hasWinget = Get-Command winget -ErrorAction SilentlyContinue
if (-not $hasWinget) {
    Write-Warn "ไม่พบ winget — จะดาวน์โหลดตัวติดตั้งแบบ manual"
}

# ── Node.js ─────────────────────────────────────────────────
$nodeVer = node --version 2>$null
if ($nodeVer -match "v(\d+)" -and [int]$Matches[1] -ge 18) {
    Write-OK "Node.js $nodeVer (พบแล้ว)"
} else {
    Write-Info "กำลังติดตั้ง Node.js LTS..."
    if ($hasWinget) {
        winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
    } else {
        $nodeUrl = "https://nodejs.org/dist/v20.11.1/node-v20.11.1-x64.msi"
        $nodeMsi = "$env:TEMP\nodejs.msi"
        Write-Info "ดาวน์โหลด Node.js จาก $nodeUrl"
        Invoke-WebRequest $nodeUrl -OutFile $nodeMsi -UseBasicParsing
        Start-Process msiexec.exe -ArgumentList "/i $nodeMsi /quiet /norestart" -Wait
        Remove-Item $nodeMsi -Force
    }
    # Reload PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" +
                [System.Environment]::GetEnvironmentVariable("Path","User")
    Write-OK "Node.js ติดตั้งแล้ว: $(node --version)"
}

# ── Git ─────────────────────────────────────────────────────
$gitVer = git --version 2>$null
if ($gitVer) {
    Write-OK "Git ($gitVer)"
} else {
    Write-Info "กำลังติดตั้ง Git..."
    if ($hasWinget) {
        winget install Git.Git --silent --accept-package-agreements --accept-source-agreements
    } else {
        $gitUrl = "https://github.com/git-for-windows/git/releases/download/v2.44.0.windows.1/Git-2.44.0-64-bit.exe"
        $gitExe = "$env:TEMP\git-installer.exe"
        Invoke-WebRequest $gitUrl -OutFile $gitExe -UseBasicParsing
        Start-Process $gitExe -ArgumentList "/VERYSILENT /NORESTART" -Wait
        Remove-Item $gitExe -Force
    }
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" +
                [System.Environment]::GetEnvironmentVariable("Path","User")
    Write-OK "Git ติดตั้งแล้ว"
}

# ── PostgreSQL ───────────────────────────────────────────────
$pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
if ($pgService) {
    Write-OK "PostgreSQL (service: $($pgService.Name) — $($pgService.Status))"
    # หา pg_isready / psql path
    $pgPaths = @(
        "C:\Program Files\PostgreSQL\18\bin",
        "C:\Program Files\PostgreSQL\17\bin",
        "C:\Program Files\PostgreSQL\16\bin",
        "C:\Program Files\PostgreSQL\15\bin",
        "C:\Program Files\PostgreSQL\14\bin",
        "C:\Program Files\PostgreSQL\13\bin"
    )
    foreach ($p in $pgPaths) {
        if (Test-Path "$p\psql.exe") { $PG_BIN = $p; break }
    }
} else {
    Write-Info "ไม่พบ PostgreSQL — กำลังดาวน์โหลดและติดตั้ง..."
    $pgVersion = "16.2"
    if ($hasWinget) {
        winget install PostgreSQL.PostgreSQL --silent --accept-package-agreements --accept-source-agreements `
            --override "--mode unattended --superpassword `"$PGPassword`" --serverport 5432"
    } else {
        $pgUrl = "https://get.enterprisedb.com/postgresql/postgresql-$pgVersion-1-windows-x64.exe"
        $pgExe = "$env:TEMP\pg_installer.exe"
        Write-Info "ดาวน์โหลด PostgreSQL $pgVersion (อาจใช้เวลาสักครู่...)"
        Invoke-WebRequest $pgUrl -OutFile $pgExe -UseBasicParsing
        Start-Process $pgExe -Wait -ArgumentList `
            "--mode unattended",
            "--superpassword `"$PGPassword`"",
            "--serverport 5432",
            "--prefix `"C:\Program Files\PostgreSQL\16`""
        Remove-Item $pgExe -Force
    }
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" +
                [System.Environment]::GetEnvironmentVariable("Path","User")
    $PG_BIN = "C:\Program Files\PostgreSQL\16\bin"
    Start-Service -Name "postgresql*" -ErrorAction SilentlyContinue
    Write-OK "PostgreSQL ติดตั้งแล้ว"
}
if (-not $PG_BIN) { $PG_BIN = "C:\Program Files\PostgreSQL\18\bin" }
$env:Path += ";$PG_BIN"

# ── PM2 ─────────────────────────────────────────────────────
$pm2Ver = pm2 --version 2>$null
if ($pm2Ver) {
    Write-OK "PM2 v$pm2Ver (พบแล้ว)"
} else {
    Write-Info "กำลังติดตั้ง PM2..."
    npm install -g pm2 pm2-windows-startup --silent
    Write-OK "PM2 ติดตั้งแล้ว"
}

# ── serve (static file server) ───────────────────────────────
$serveVer = serve --version 2>$null
if (-not $serveVer) {
    npm install -g serve --silent
    Write-OK "serve ติดตั้งแล้ว"
} else {
    Write-OK "serve v$serveVer (พบแล้ว)"
}

# ════════════════════════════════════════════════════════════
# STEP 2 — คัดลอก / เตรียมโฟลเดอร์
# ════════════════════════════════════════════════════════════
Write-Step "STEP 2/7 — เตรียมโฟลเดอร์ $InstallDir"

if (Test-Path $InstallDir) {
    Write-Warn "$InstallDir มีอยู่แล้ว — จะ backup และแทนที่"
    $backupDir = "$InstallDir`_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    Rename-Item $InstallDir $backupDir
    Write-OK "Backup ไปที่ $backupDir"
}

if (Test-Path $SourceDir) {
    Write-Info "คัดลอกจาก $SourceDir → $InstallDir"
    Copy-Item $SourceDir $InstallDir -Recurse -Force
    Write-OK "คัดลอกเรียบร้อย"
} else {
    Write-Warn "ไม่พบ $SourceDir — ใช้ไดเรกทอรีปัจจุบันแทน"
    $InstallDir = $PSScriptRoot
    Write-Info "ใช้ $InstallDir"
}

Set-Location $InstallDir

# ════════════════════════════════════════════════════════════
# STEP 3 — ตั้งค่า Database
# ════════════════════════════════════════════════════════════
Write-Step "STEP 3/7 — ตั้งค่า PostgreSQL Database"

# ตรวจสอบว่า PostgreSQL พร้อมใช้
$pgReady = & "$PG_BIN\pg_isready.exe" -U postgres 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Warn "PostgreSQL ยังไม่พร้อม — รอ 5 วินาที..."
    Start-Sleep 5
}

# สร้าง user และ database
$sqlCommands = @"
DO `$`$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$DBUser') THEN
    CREATE USER $DBUser WITH PASSWORD '$DBPassword';
  END IF;
END
`$`$;

CREATE DATABASE $DBName OWNER $DBUser;
GRANT ALL PRIVILEGES ON DATABASE $DBName TO $DBUser;
"@

$sqlFile = "$env:TEMP\assethub_setup.sql"
$sqlCommands | Set-Content $sqlFile -Encoding UTF8

& "$PG_BIN\psql.exe" -U postgres -f $sqlFile 2>&1 | ForEach-Object {
    if ($_ -match "ERROR") { Write-Warn $_ } else { Write-Info $_ }
}
Remove-Item $sqlFile -Force
Write-OK "Database '$DBName' และ user '$DBUser' พร้อมแล้ว"

# ════════════════════════════════════════════════════════════
# STEP 4 — สร้างไฟล์ .env
# ════════════════════════════════════════════════════════════
Write-Step "STEP 4/7 — สร้างไฟล์ Environment (.env)"

$localIP = (Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.InterfaceAlias -notmatch "Loopback|VPN" -and $_.IPAddress -ne "127.0.0.1" } |
    Select-Object -First 1).IPAddress

$envContent = @"
# AssetHub V2 — Environment Variables
# Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

# Database
DATABASE_URL="postgresql://${DBUser}:${DBPassword}@localhost:5432/${DBName}"

# Server
PORT=$BackendPort
NODE_ENV=production
CORS_ORIGIN=http://${localIP}:${FrontendPort}

# JWT
JWT_SECRET="$JWTSecret"
JWT_EXPIRES_IN=8h

# Frontend URL (for QR Code links)
FRONTEND_URL=http://${localIP}:${FrontendPort}
"@

$envPath = "$InstallDir\backend\.env"
$envContent | Set-Content $envPath -Encoding UTF8
Write-OK ".env สร้างที่ $envPath"
Write-Info "Server IP: $localIP"

# ════════════════════════════════════════════════════════════
# STEP 5 — Install Dependencies & Build
# ════════════════════════════════════════════════════════════
Write-Step "STEP 5/7 — ติดตั้ง Dependencies และ Build"

# Backend
Write-Info "ติดตั้ง Backend dependencies..."
Set-Location "$InstallDir\backend"
npm ci --production=false 2>&1 | Select-String -Pattern "error|warn" | ForEach-Object { Write-Info $_ }

Write-Info "Build Backend (TypeScript → JavaScript)..."
npm run build 2>&1 | Select-String -Pattern "error|Error" | ForEach-Object { Write-Warn $_ }
Write-OK "Backend build เสร็จ"

# Prisma migrate
Write-Info "รัน Prisma Database Migration..."
npx prisma migrate deploy 2>&1 | ForEach-Object { Write-Info $_ }
Write-OK "Database migration เสร็จ"

# Frontend
Write-Info "ติดตั้ง Frontend dependencies..."
Set-Location "$InstallDir\frontend"
npm ci 2>&1 | Select-String -Pattern "error" | ForEach-Object { Write-Warn $_ }

Write-Info "Build Frontend (Vite)..."
npm run build 2>&1 | Select-String -Pattern "error|Error" | ForEach-Object { Write-Warn $_ }
Write-OK "Frontend build เสร็จ → $InstallDir\frontend\dist"

# ════════════════════════════════════════════════════════════
# STEP 6 — ตั้งค่า PM2
# ════════════════════════════════════════════════════════════
Write-Step "STEP 6/7 — ตั้งค่า PM2 Process Manager"

# หยุด process เก่าถ้ามี
pm2 delete assethub-api  2>$null
pm2 delete assethub-web  2>$null

# สร้าง PM2 ecosystem config
$pm2Config = @"
module.exports = {
  apps: [
    {
      name: 'assethub-api',
      script: 'dist/index.js',
      cwd: '$($InstallDir.Replace("\","\\"))\\backend',
      env: {
        NODE_ENV: 'production',
        PORT: $BackendPort
      },
      max_restarts: 10,
      restart_delay: 3000,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: 'C:\\AssetHub\\logs\\api-error.log',
      out_file:   'C:\\AssetHub\\logs\\api-out.log',
    },
    {
      name: 'assethub-web',
      script: 'serve.cmd',
      args: '-s dist -p $FrontendPort',
      cwd: '$($InstallDir.Replace("\","\\"))\\frontend',
      interpreter: 'none',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: 'C:\\AssetHub\\logs\\web-error.log',
      out_file:   'C:\\AssetHub\\logs\\web-out.log',
    }
  ]
}
"@

New-Item -ItemType Directory -Path "C:\AssetHub\logs" -Force | Out-Null
$pm2Config | Set-Content "$InstallDir\ecosystem.config.js" -Encoding UTF8

Set-Location $InstallDir
pm2 start ecosystem.config.js
pm2 save
pm2-startup install
Write-OK "PM2 กำลังรัน และตั้ง Auto-start เมื่อ Windows เปิดเครื่อง"

# ════════════════════════════════════════════════════════════
# STEP 7 — เปิด Firewall
# ════════════════════════════════════════════════════════════
Write-Step "STEP 7/7 — ตั้งค่า Windows Firewall"

$rules = @(
    @{ Name="AssetHub-API";     Port=$BackendPort;  Desc="AssetHub Backend API" },
    @{ Name="AssetHub-Web";     Port=$FrontendPort; Desc="AssetHub Frontend Web" }
)

foreach ($rule in $rules) {
    $existing = Get-NetFirewallRule -DisplayName $rule.Name -ErrorAction SilentlyContinue
    if ($existing) { Remove-NetFirewallRule -DisplayName $rule.Name }
    New-NetFirewallRule `
        -DisplayName $rule.Name `
        -Direction Inbound `
        -Protocol TCP `
        -LocalPort $rule.Port `
        -Action Allow `
        -Description $rule.Desc | Out-Null
    Write-OK "Firewall เปิด port $($rule.Port) ($($rule.Name))"
}

# ════════════════════════════════════════════════════════════
# สรุปผล
# ════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║              ✅  ติดตั้งสำเร็จ!                      ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Green

Write-Host @"

  📌 ข้อมูลการเข้าถึง:
  ─────────────────────────────────────────────────
  🌐 Web App   :  http://$localIP`:$FrontendPort
  🔌 API       :  http://$localIP`:$BackendPort
  📁 Install   :  $InstallDir
  🗄  Database  :  $DBName @ localhost:5432

  🔑 Database Credentials:
     User     : $DBUser
     Password : $DBPassword
     (บันทึกไว้ใน $InstallDir\backend\.env)

  ─────────────────────────────────────────────────
  📋 คำสั่งที่ใช้บ่อย:
     pm2 status           → ดูสถานะ process
     pm2 logs             → ดู log แบบ real-time
     pm2 restart all      → restart ทั้งหมด
     pm2 stop all         → หยุดทั้งหมด
  ─────────────────────────────────────────────────
"@ -ForegroundColor White

# ตรวจสอบสถานะ
Write-Host "  🔍 สถานะ PM2 ปัจจุบัน:" -ForegroundColor Cyan
pm2 list

# บันทึก log การติดตั้ง
$installLog = @"
AssetHub V2 Install Log
=======================
Date     : $(Get-Date)
Server IP: $localIP
Install  : $InstallDir
Database : $DBName
DB User  : $DBUser
API Port : $BackendPort
Web Port : $FrontendPort
Node.js  : $(node --version)
PM2      : $(pm2 --version)
"@
$installLog | Set-Content "C:\AssetHub\logs\install.log" -Encoding UTF8
Write-OK "บันทึก install log ไปที่ C:\AssetHub\logs\install.log"
