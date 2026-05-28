@echo off
echo === Valora Auth Fix Deploy ===
cd /d "C:\Users\Luiz\Downloads\valora\projeto_valora"

echo Removing stale git lock if present...
del /f .git\index.lock 2>nul

echo Adding changed files...
git add src\App.jsx src\supabase.js

echo Committing auth bug fixes...
git commit -m "fix: auth bugs - email confirmation handling and session race condition"

echo Pushing to main branch (triggers Vercel deploy)...
git push origin HEAD:main

echo.
echo Done! Vercel will auto-deploy in ~1 minute.
echo Check: https://vercel.com/luiz-gustavo-s-projects2/valora
pause
