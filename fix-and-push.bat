@echo off
cd /d "%~dp0"
echo Removendo lock do git...
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
echo.
echo Fazendo commit do fix...
git add src/App.jsx
git commit -m "fix: add missing generateSimulatedUsers function (black screen fix)"
echo.
echo Enviando para GitHub (main)...
git push origin main
echo.
echo Pronto! Vercel vai rebuildar em ~1 minuto.
echo Acesse: https://valora-two-pi.vercel.app
echo.
pause
