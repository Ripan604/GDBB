@echo off
setlocal

REM Move to the repository root (where this batch file lives)
cd /d "%~dp0"

REM Optional: allow a custom commit message as argument
set "COMMIT_MSG=%~1"
if "%COMMIT_MSG%"=="" set "COMMIT_MSG=ci: remove duplicate pnpm version config"

echo.
echo [1/3] Staging workflow file...
git add .github/workflows/ci.yml
if errorlevel 1 (
  echo Failed to stage file.
  exit /b 1
)

echo [2/3] Creating commit...
git commit -m "%COMMIT_MSG%"
if errorlevel 1 (
  echo Commit failed (possibly no changes to commit).
  exit /b 1
)

echo [3/3] Pushing to remote...
git push
if errorlevel 1 (
  echo Push failed.
  exit /b 1
)

echo.
echo Done.
exit /b 0

