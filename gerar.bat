@echo off
chcp 65001 >nul
cd /d "%~dp0"

call tech\achar_python.bat
if not defined PYEXE (
  echo.
  echo Python nao foi encontrado.
  echo De dois cliques em instalar.bat primeiro.
  echo.
  pause
  exit /b 1
)

echo Gerando slides...
echo.

if "%~1"=="" (
  "%PYEXE%" tech\gerar_slides.py
) else (
  "%PYEXE%" tech\gerar_slides.py %*
)

echo.
pause
