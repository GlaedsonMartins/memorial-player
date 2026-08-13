@echo off
setlocal

set "ROOM=%~1"
if "%ROOM%"=="" set "ROOM=1"

set "PLAYER_BASE_URL=%~2"
if "%PLAYER_BASE_URL%"=="" set "PLAYER_BASE_URL=http://localhost:8091"

set "PLAYER_URL=%PLAYER_BASE_URL%/sala/%ROOM%"
set "CHROME_EXE="

if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "CHROME_EXE=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined CHROME_EXE if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "CHROME_EXE=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined CHROME_EXE if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "CHROME_EXE=%LocalAppData%\Google\Chrome\Application\chrome.exe"

if not defined CHROME_EXE (
  echo Chrome nao foi encontrado neste computador.
  exit /b 1
)

start "Memorial Player" "%CHROME_EXE%" ^
  --user-data-dir="%LocalAppData%\MemorialPlayerChrome" ^
  --kiosk "%PLAYER_URL%" ^
  --autoplay-policy=no-user-gesture-required ^
  --no-first-run ^
  --disable-session-crashed-bubble

endlocal
