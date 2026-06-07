@echo off
echo ============================================
echo  ePOM Dev Environment
echo ============================================
echo.
echo Starting Vite auto-watcher (client)...
start "ePOM - Vite Watcher" cmd /k "cd /d %~dp0client && npm run watch"

echo Starting Flask server (server)...
start "ePOM - Flask Server" cmd /k "cd /d %~dp0 && python -m server.app 2>nul || python server/app.py"

echo.
echo Both processes launched in separate windows.
echo  - Vite watcher: rebuilds dist/ automatically on any src/ change
echo  - Flask server: serves the app
echo.
echo Close those windows to stop the servers.
pause
