@echo off
setlocal
cd /d "%~dp0"
echo Stopping this project's local Compose services...
docker compose stop api web postgres redis
if errorlevel 1 exit /b 1
echo Local containers stopped. Database volumes are retained.
