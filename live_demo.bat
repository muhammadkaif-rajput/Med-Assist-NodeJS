@echo off
title MedAssist Instant Public Live Link
color 0B
echo ================================================================
echo   MedAssist - Instant Free Public Live Link (Localtunnel)
echo ================================================================
echo.
echo Make sure your local server is running (npm start) on port 3000!
echo.
echo Creating public live URL...
echo.
call npx localtunnel --port 3000
pause
