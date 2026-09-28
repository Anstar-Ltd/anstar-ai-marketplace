@echo off
setlocal

set "ANSTAR_NPX="

for /f "delims=" %%I in ('where.exe npx.cmd 2^>nul') do if not defined ANSTAR_NPX set "ANSTAR_NPX=%%I"
if not defined ANSTAR_NPX if defined LOCALAPPDATA if exist "%LOCALAPPDATA%\Programs\nodejs\npx.cmd" set "ANSTAR_NPX=%LOCALAPPDATA%\Programs\nodejs\npx.cmd"
if not defined ANSTAR_NPX if defined APPDATA if exist "%APPDATA%\npm\npx.cmd" set "ANSTAR_NPX=%APPDATA%\npm\npx.cmd"
if not defined ANSTAR_NPX if defined NVM_SYMLINK if exist "%NVM_SYMLINK%\npx.cmd" set "ANSTAR_NPX=%NVM_SYMLINK%\npx.cmd"
if not defined ANSTAR_NPX if defined VOLTA_HOME if exist "%VOLTA_HOME%\bin\npx.cmd" set "ANSTAR_NPX=%VOLTA_HOME%\bin\npx.cmd"
if not defined ANSTAR_NPX if defined ProgramFiles if exist "%ProgramFiles%\nodejs\npx.cmd" set "ANSTAR_NPX=%ProgramFiles%\nodejs\npx.cmd"
if not defined ANSTAR_NPX if defined ProgramFiles(x86) if exist "%ProgramFiles(x86)%\nodejs\npx.cmd" set "ANSTAR_NPX=%ProgramFiles(x86)%\nodejs\npx.cmd"

if not defined ANSTAR_NPX (
  1>&2 echo Softeria Microsoft 365 could not start because Node.js 20 or later and npx were not found.
  1>&2 echo Install the current Node.js LTS release, then fully quit and reopen Codex.
  exit /b 127
)

call "%ANSTAR_NPX%" -y "@softeria/ms-365-mcp-server@0.151.0" --org-mode
exit /b %errorlevel%
