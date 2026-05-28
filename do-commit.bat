@echo off
cd /d "C:\Users\Luiz\Downloads\valora\projeto_valora"
del /f .git\index.lock 2>nul
git add src\App.jsx src\supabase.js deploy-auth-fix.bat
git commit -m "fix: auth bugs - email confirmation and session race condition"
git push
echo EXIT CODE: %errorlevel%
pause
