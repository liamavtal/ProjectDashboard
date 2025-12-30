@echo off
title Project Dashboard - Command Center
color 0A

echo.
echo   ╔═══════════════════════════════════════════════════════════╗
echo   ║                                                           ║
echo   ║              PROJECT DASHBOARD - COMMAND CENTER           ║
echo   ║                                                           ║
echo   ╚═══════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

:: Check if node_modules exists
if not exist "node_modules\" (
    echo   [*] First time setup - Installing dependencies...
    echo.
    call npm install
    echo.
    echo   [+] Dependencies installed successfully!
    echo.
)

echo   [*] Starting Project Dashboard...
echo.
echo   ┌─────────────────────────────────────────────────────────┐
echo   │  Dashboard will open at: http://localhost:5177         │
echo   │  API Server running at:  http://localhost:3847         │
echo   │                                                         │
echo   │  Press Ctrl+C to stop the server                        │
echo   └─────────────────────────────────────────────────────────┘
echo.

:: Start the dev server
start "" http://localhost:5177
timeout /t 2 /nobreak >nul
npm run dev
