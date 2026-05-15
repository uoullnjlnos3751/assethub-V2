@echo off
echo ============================================
echo    AssetHub V2 - Setup Script
echo ============================================
echo.

echo [1/5] Installing backend dependencies...
cd backend
call npm install
if %errorlevel% neq 0 exit /b %errorlevel%

echo [2/5] Generating Prisma client...
call npx prisma generate
if %errorlevel% neq 0 exit /b %errorlevel%

echo [3/5] Pushing database schema...
call npx prisma db push
if %errorlevel% neq 0 (
    echo WARNING: Database push failed. Make sure PostgreSQL is running.
    echo You can run this later: cd backend ^&^& npx prisma db push
)

echo [4/5] Seeding database...
call npm run seed
if %errorlevel% neq 0 (
    echo WARNING: Seed may have failed. You can run: cd backend ^&^& npm run seed
)

echo [5/5] Installing frontend dependencies...
cd ..\frontend
call npm install
if %errorlevel% neq 0 exit /b %errorlevel%

echo.
echo ============================================
echo    Setup Complete!
echo ============================================
echo.
echo To start the application:
echo   Terminal 1: cd backend ^&^& npm run dev
echo   Terminal 2: cd frontend ^&^& npm run dev
echo.
echo Or use Docker:
echo   docker-compose up -d
echo.
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:4000
echo.
pause
