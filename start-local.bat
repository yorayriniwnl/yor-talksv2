@echo off
setlocal
cd /d "%~dp0"

echo ========================================================
echo               Yor Talks - Local Stack Launcher
echo ========================================================

if not exist ".env" (
  echo Copy .env.example to .env and configure local values first.
  exit /b 1
)

echo [1/4] Starting the local PostgreSQL and Redis containers...
docker compose up -d --wait postgres redis
if errorlevel 1 goto failed

echo [2/4] Building the API and frontend images...
docker compose build api web
if errorlevel 1 goto failed

echo [3/4] Applying the additive schema migration before starting API workers...
docker compose run --rm --no-deps api pnpm --filter @workspace/db migrate:beta
if errorlevel 1 goto failed

echo [4/4] Starting the API and frontend...
docker compose up -d --wait api web
if errorlevel 1 goto failed

echo ========================================================
echo  Frontend: http://localhost:8080
echo  API:      http://localhost:4000
echo  Readiness: http://localhost:8080/api/readyz
echo  To seed an isolated demo database, run:
echo  docker compose exec api pnpm --filter @workspace/api-server seed
echo ========================================================
exit /b 0

:failed
echo Local startup failed. Inspect docker compose ps and docker compose logs.
exit /b 1
