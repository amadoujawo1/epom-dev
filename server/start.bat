@echo off
REM ePOM Tactical Node - Windows Start Script
echo Starting ePOM Backend with Waitress...
cd /d "%~dp0"

REM Try to find Python
set PYTHON_CMD=python
py --version >nul 2>&1
if %errorlevel% == 0 (
    set PYTHON_CMD=py
) else (
    python --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo [ERROR] Python not found. Please install Python or add it to your PATH.
        pause
        exit /b 1
    )
)

echo Using %PYTHON_CMD%...

REM Install waitress if missing
%PYTHON_CMD% -m pip install waitress

REM Run using module invocation to bypass PATH issues
%PYTHON_CMD% -m waitress --port=8000 wsgi:app
pause
