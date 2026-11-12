@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================================
echo   Kurd Fit 4.7 - iOS (.ipa) Automatic Cloud Builder
echo ========================================================
echo.
set "DEFAULT_REPO=https://github.com/basamqabil4-lab/kurdfit-ios.git"
set /p CUSTOM_REPO="Press ENTER to use [%DEFAULT_REPO%] or paste your GitHub repo link: "
if not "%CUSTOM_REPO%"=="" set "DEFAULT_REPO=%CUSTOM_REPO%"

git add -A
git commit -m "Kurd Fit 4.7 iOS & Android optimized release" 2>nul
git branch -M main
git remote remove origin 2>nul
git remote add origin "%DEFAULT_REPO%"

echo.
echo Uploading project to %DEFAULT_REPO% ...
echo (If a GitHub Sign-In window appears, click "Sign in with your browser")
echo.
git push -u origin main --force

echo.
echo ========================================================
echo Done! Now refresh your GitHub "Actions" page!
echo In ~3 minutes, download "KurdFit-iOS-IPA" (.ipa file)!
echo ========================================================
pause
