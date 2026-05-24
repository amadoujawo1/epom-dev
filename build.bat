@echo off
REM ePOM Tactical Node - Build Script
echo Building ePOM Frontend...
cd /d "%~dp0client"
call npm.cmd install
call npm.cmd run build
echo Build complete.
pause
