@echo off
cd /d "%~dp0"
echo Enviando Valora 2.0 para o GitHub (branch main)...
echo.
git checkout -B main
git push origin main --force
echo.
echo Pronto! Vercel vai buildar em ~1 minuto.
echo Acesse: https://valora-two-pi.vercel.app
echo.
pause
