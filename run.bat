@echo off
setlocal EnableDelayedExpansion

title NEC Sports Management - Launcher

:: Determine absolute root directory
set "ROOT_DIR=%~dp0"
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"

echo ===================================================
echo     NEC Sports Management - Full Stack Launcher
echo ===================================================
echo.

:: 1. Verify Node.js and npm
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found in your PATH.
    echo Please install Node.js from https://nodejs.org/ and restart your terminal.
    echo.
    pause
    exit /b 1
)

where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm is not found in your PATH.
    echo Please ensure npm is installed with Node.js.
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js and npm detected.

:: 2. Check Backend Dependencies & Environment
if not exist "%ROOT_DIR%\backend\node_modules\" (
    echo.
    echo [NOTICE] Backend node_modules not found. Installing dependencies...
    pushd "%ROOT_DIR%\backend"
    call npm install
    popd
)

if not exist "%ROOT_DIR%\backend\.env" (
    echo [WARNING] backend\.env was not found. Backend may fail if database environment variables are missing.
)

:: 3. Check Frontend Dependencies
if not exist "%ROOT_DIR%\frontend\node_modules\" (
    echo.
    echo [NOTICE] Frontend node_modules not found. Installing dependencies...
    pushd "%ROOT_DIR%\frontend"
    call npm install
    popd
)

echo [OK] Dependencies checked.
echo.

:: 4. Start Backend Server in a dedicated window
echo Starting Backend Server on port 5000...
start "NEC Sports - Backend (Port 5000)" /D "%ROOT_DIR%\backend" cmd /k "echo Starting Backend (npm run dev)... && npm run dev"

:: Small delay to allow backend to bind ports
timeout /t 2 /nobreak >nul

:: 5. Start Frontend Server in a dedicated window
echo Starting Frontend Client on port 5173...
start "NEC Sports - Frontend (Port 5173)" /D "%ROOT_DIR%\frontend" cmd /k "echo Starting Frontend (npm run dev)... && npm run dev"

echo.
echo ===================================================
echo   Both services are launching!
echo.
echo   - Backend API:  http://localhost:5000
echo   - Frontend App: http://localhost:5173
echo.
echo   Each service runs in its own command window.
echo   To stop a service, press Ctrl+C in its window
echo   or close the respective terminal window.
echo ===================================================
echo.
pause

