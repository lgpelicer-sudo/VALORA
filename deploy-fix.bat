@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git commit -m "fix: Rules of Hooks violation - move useMemo/useEffect before early returns"
git checkout -B main
git push origin main --force
pause
