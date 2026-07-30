@echo off
echo ========================================================
echo   AssetHub V2 - Migration to Docker
echo ========================================================
echo.

echo 1. Stopping old PM2 services...
call pm2 stop assethub-api assethub-web
call pm2 save
echo.

echo 2. Copying uploads folder (if exists) to a Docker-compatible structure...
if not exist ".\backend\uploads" mkdir ".\backend\uploads"
echo (Ensure that uploads_data volume uses the files here or we will map it directly)
echo.

echo 3. Starting Docker Compose...
call docker compose --env-file .env.docker.prod -f docker-compose.prod.yml up -d --build
echo.

echo 4. Waiting for PostgreSQL to be ready (15 seconds)...
timeout /t 15 /nobreak
echo.

echo 5. Restoring Database from Backup...
echo Dropping current empty schema (if any)...
call docker compose --env-file .env.docker.prod -f docker-compose.prod.yml exec -T postgres psql -U assethub -d assethub -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

echo Restoring data from assethub_migrate_docker.dump...
call docker compose --env-file .env.docker.prod -f docker-compose.prod.yml exec -T postgres pg_restore -U assethub -d assethub -1 < assethub_migrate_docker.dump
echo.

echo 6. Baselining and applying Prisma migrations...
echo (The restored dump already has the tables but no _prisma_migrations table,
echo  so mark the baseline as applied, then apply anything newer.)
call docker compose --env-file .env.docker.prod -f docker-compose.prod.yml exec -T backend npx prisma migrate resolve --applied 0_baseline
call docker compose --env-file .env.docker.prod -f docker-compose.prod.yml exec -T backend npx prisma migrate deploy
echo.

echo ========================================================
echo Migration Completed!
echo You can check the logs with:
echo docker compose --env-file .env.docker.prod -f docker-compose.prod.yml logs -f
echo ========================================================
pause
