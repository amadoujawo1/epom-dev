@echo off
echo ============================================
echo  ePOM Dev Environment
echo ============================================
echo.

echo [1/3] Syncing source files to inner project copy...
xcopy /Y /Q "%~dp0client\src\i18n\translations.js" "%~dp0epom-dev\client\src\i18n\"
xcopy /Y /Q "%~dp0client\src\pages\Personnel.jsx"  "%~dp0epom-dev\client\src\pages\"
xcopy /Y /Q "%~dp0client\package.json"             "%~dp0epom-dev\client\"
xcopy /Y /Q "%~dp0server\app.py"                   "%~dp0epom-dev\server\"
echo Sync done.
echo.

echo [2/3] Building outer client (client/dist)...
cd /d "%~dp0client"
call npm.cmd run build
echo.

echo [3/3] Building inner client (epom-dev/client/dist)...
cd /d "%~dp0epom-dev\client"
call npm.cmd run build
echo.

echo Starting Vite watcher (outer client - auto-rebuild on save)...
start "ePOM - Vite Watcher" cmd /k "cd /d %~dp0client && npm run watch"

echo Starting Flask server...
start "ePOM - Flask Server" cmd /k "cd /d %~dp0server && python app.py"

echo.
echo Both processes launched in separate windows.
echo  - Vite watcher: rebuilds outer dist/ on any src/ change
echo  - After saving, run dev.bat again to sync inner dist/
echo.
pause
