@echo off
REM ============================================
REM EMERGENCY: Remove .env from Git Repository
REM ============================================

echo.
echo ========================================
echo   SECURITY INCIDENT RESPONSE
echo   Removing .env from Git
echo ========================================
echo.

echo Step 1: Removing .env from Git tracking...
git rm --cached backend\.env 2>nul
git rm --cached .env 2>nul

echo.
echo Step 2: Committing removal...
git commit -m "SECURITY: Remove exposed .env file from repository"

echo.
echo Step 3: Pushing to remote...
git push origin main

echo.
echo ========================================
echo   IMMEDIATE REMOVAL COMPLETE
echo ========================================
echo.
echo NEXT STEPS (CRITICAL):
echo 1. Purge .env from Git history (see SECURITY_INCIDENT_RESPONSE.md)
echo 2. Revoke ALL credentials in the exposed .env file
echo 3. Generate new credentials
echo 4. Update all deployments
echo.
echo Full instructions in: docs\SECURITY_INCIDENT_RESPONSE.md
echo.

pause
