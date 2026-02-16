
@echo off
setlocal EnableDelayedExpansion

title Late Entry AI - Launcher
color 0A

echo ===================================================
echo      Late Entry AI - Auto Launcher
echo ===================================================
echo.

:: 1. Check for Node.js
echo [CHECK] Checking for Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Node.js is NOT installed.
    echo.
    echo This application requires Node.js to run.
    echo ---------------------------------------------------
    echo Option 1: Install automatically via Winget - Recommended
    echo Option 2: Open Download Page
    echo ---------------------------------------------------
    echo.
    set /p install_choice="Type 1 or 2 and press Enter: "
    
    if "!install_choice!"=="1" (
        echo [INFO] Attempting to install Node.js LTS via Winget...
        winget install -e --id OpenJS.NodeJS.LTS
        if !errorlevel! neq 0 (
            echo [ERROR] Winget installation failed. Please install manually.
            start https://nodejs.org/en/download/
            pause
            exit /b
        )
        echo [OK] Node.js installed! Please restart this script.
        pause
        exit /b
    ) else (
        echo [INFO] Opening Node.js download page...
        start https://nodejs.org/en/download/
        echo Please install Node.js and then run this script again.
        pause
        exit /b
    )
) else (
    echo [OK] Node.js is installed.
)

:: 2. Setup Application
set "APP_DIR=%~dp0late-checker-app"
cd /d "%APP_DIR%"

echo.
if not exist "node_modules" (
    echo [INFO] First time setup: Installing dependencies...
    echo        This may take a minute, please wait
    call npm install
    if %errorlevel% neq 0 (
        color 0C
        echo [ERROR] Failed to install dependencies.
        echo Please check your internet connection and try again.
        pause
        exit /b
    )
    echo [OK] Setup complete.
) else (
    echo [INFO] Dependencies already installed.
)

:: 3. Launch App
echo.
echo [INFO] Starting Application...
echo        - A browser window will open automatically.
echo        - Close this window to stop the app.
echo.

call npm run dev

pause
