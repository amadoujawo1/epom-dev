@echo off
REM ePOM Tactical Node - Windows Start Script
echo Starting ePOM Backend with Waitress...
cd /d "%~dp0"
python -m pip install waitress
waitress-serve --port=8000 wsgi:app
pause
