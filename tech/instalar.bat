@echo off
chcp 65001 >nul
cd /d "%~dp0\.."

echo ========================================
echo  Gerador de slides - instalacao
echo ========================================
echo.

call tech\achar_python.bat
if defined PYEXE goto :deps

echo Python nao encontrado. Vou instala-lo agora.
echo Isso pode levar um ou dois minutos. Nao feche esta janela.
echo.

call :install_python
if errorlevel 1 (
  echo.
  echo Nao consegui instalar o Python automaticamente.
  echo Instale em: https://www.python.org/downloads/
  echo Na instalacao, marque "Add Python to PATH".
  echo Depois rode instalar.bat de novo.
  echo.
  pause
  exit /b 1
)

call :refresh_path
call tech\achar_python.bat
if not defined PYEXE (
  echo.
  echo O Python foi instalado, mas este Windows ainda nao o enxerga.
  echo Feche esta janela e rode instalar.bat outra vez.
  echo.
  pause
  exit /b 1
)

:deps
echo Usando Python:
echo   %PYEXE%
echo.
echo Instalando as bibliotecas do gerador...
echo.

"%PYEXE%" -m pip install --upgrade pip
"%PYEXE%" -m pip install -r "README.md\requirements.txt"
if errorlevel 1 (
  echo.
  echo Falha ao instalar as bibliotecas.
  echo.
  pause
  exit /b 1
)

echo.
echo Pronto. Agora de dois cliques em gerar.bat para criar os slides.
echo.
pause
exit /b 0

:refresh_path
for /f "tokens=2*" %%A in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul') do set "SysPath=%%B"
for /f "tokens=2*" %%A in ('reg query "HKCU\Environment" /v Path 2^>nul') do set "UserPath=%%B"
if defined SysPath set "PATH=%SysPath%;%PATH%"
if defined UserPath set "PATH=%UserPath%;%PATH%"
exit /b 0

:install_python
where winget >nul 2>&1
if not errorlevel 1 (
  echo Instalando Python com o winget...
  winget install -e --id Python.Python.3.12 --scope user --silent --accept-package-agreements --accept-source-agreements
  if not errorlevel 1 (
    call :refresh_path
    call tech\achar_python.bat
    if defined PYEXE exit /b 0
  )
  echo winget nao concluiu. Tentando o instalador oficial...
  echo.
)

set "PY_VER=3.12.10"
set "PY_INST=%TEMP%\python-%PY_VER%-installer.exe"
if /i "%PROCESSOR_ARCHITECTURE%"=="ARM64" (
  set "PY_URL=https://www.python.org/ftp/python/%PY_VER%/python-%PY_VER%-arm64.exe"
) else (
  set "PY_URL=https://www.python.org/ftp/python/%PY_VER%/python-%PY_VER%-amd64.exe"
)

echo Baixando Python %PY_VER%...
curl.exe -fsSL -o "%PY_INST%" "%PY_URL%"
if errorlevel 1 (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -UseBasicParsing -Uri '%PY_URL%' -OutFile '%PY_INST%'"
)
if not exist "%PY_INST%" (
  echo Nao foi possivel baixar o instalador.
  exit /b 1
)

echo Instalando Python para este usuario...
"%PY_INST%" /quiet InstallAllUsers=0 PrependPath=1 Include_pip=1 Include_launcher=1 Include_test=0
if errorlevel 1 (
  echo O instalador do Python retornou erro.
  del /q "%PY_INST%" 2>nul
  exit /b 1
)
del /q "%PY_INST%" 2>nul
exit /b 0
