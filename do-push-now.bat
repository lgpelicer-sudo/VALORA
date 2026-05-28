@echo off
cd /d "C:\Users\Luiz\Downloads\valora\projeto_valora"
echo === Pushing fix to GitHub main ===
git push origin HEAD:main --force
echo.
echo Exit code: %ERRORLEVEL%
echo === Done ===
pause
