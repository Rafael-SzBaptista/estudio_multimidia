@echo off
chcp 65001 >nul
cd /d "%~dp0"

if not exist "tech\instalar.bat" (
  echo Nao encontrei tech\instalar.bat
  echo.
  pause
  exit /b 1
)

call tech\instalar.bat
