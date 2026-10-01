@echo off
title Push MedAssist to GitHub
color 0A
echo ================================================================
echo   MedAssist - Pushing Code to GitHub (muhammadkaif-rajput)
echo ================================================================
echo.

cd /d "%~dp0"

echo 1. Checking git status...
"C:\Users\Rehman Ali\AppData\Local\github-copilot-git-2.53.0-4\cmd\git.exe" status

echo.
echo 2. Pushing to GitHub repository:
echo    https://github.com/muhammadkaif-rajput/Med-Assist-NodeJS.git
echo.
echo [NOTE] Agar browser mein GitHub login popup aye toh bas 'Sign In' ya 'Authorize' par click karein.
echo.

"C:\Users\Rehman Ali\AppData\Local\github-copilot-git-2.53.0-4\cmd\git.exe" push -u origin main

if %ERRORLEVEL% equ 0 (
    echo.
    echo ================================================================
    echo  [SUCCESS] Code kamyabi se GitHub par upload ho gaya hai!
    echo  View repository: https://github.com/muhammadkaif-rajput/Med-Assist-NodeJS
    echo ================================================================
) else (
    echo.
    echo ================================================================
    echo  [ATTENTION] Push nahi ho saka.
    echo  Agar repository GitHub par create nahi ki, toh pehle:
    echo  https://github.com/new par ja kar 'Med-Assist-NodeJS' create karein.
    echo ================================================================
)

echo.
pause
