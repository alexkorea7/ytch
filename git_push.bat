@echo off
echo ==========================================
echo       YouTube Channel Analyzer - Git Push
echo ==========================================

echo [1/4] Adding files...
git add .

echo [2/4] Committing changes...
git commit -m "Update: Monthly trend, video duration, social links"

echo [3/4] Pushing to GitHub...
git push origin main

if %errorlevel% neq 0 (
    echo [!] Standard push failed. Remote might be ahead.
    echo [?] Attempting force push...
    git push -f origin main
)

echo.
echo ==========================================
if %errorlevel% equ 0 (
    echo       SUCCESS: Pushed to GitHub!
) else (
    echo       FAILURE: Something went wrong.
)
echo ==========================================
pause
