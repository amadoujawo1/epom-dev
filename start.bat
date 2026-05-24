@echo off
REM ePOM Tactical Node - Root Delegate Script
echo Delegating to server/start.bat...
cd /d "%~dp0server"
call start.bat
