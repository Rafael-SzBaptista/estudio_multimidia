@echo off
REM Define PYEXE com o caminho do python.exe, se existir.
REM Nao use setlocal aqui: a variavel precisa ficar no .bat que chamou este arquivo.

set "PYEXE="

py -3 -c "import sys" >nul 2>&1
if not errorlevel 1 (
  for /f "delims=" %%I in ('py -3 -c "import sys; print(sys.executable)" 2^>nul') do set "PYEXE=%%I"
)
if defined PYEXE if exist "%PYEXE%" goto :eof

python -c "import sys" >nul 2>&1
if not errorlevel 1 (
  for /f "delims=" %%I in ('python -c "import sys; print(sys.executable)" 2^>nul') do set "PYEXE=%%I"
)
if defined PYEXE if exist "%PYEXE%" goto :eof

if exist "%LocalAppData%\Programs\Python\Launcher\py.exe" (
  "%LocalAppData%\Programs\Python\Launcher\py.exe" -3 -c "import sys" >nul 2>&1
  if not errorlevel 1 (
    for /f "delims=" %%I in ('"%LocalAppData%\Programs\Python\Launcher\py.exe" -3 -c "import sys; print(sys.executable)" 2^>nul') do set "PYEXE=%%I"
  )
)
if defined PYEXE if exist "%PYEXE%" goto :eof

for /d %%D in ("%LocalAppData%\Programs\Python\Python3*") do (
  if exist "%%D\python.exe" (
    "%%D\python.exe" -c "import sys" >nul 2>&1
    if not errorlevel 1 (
      set "PYEXE=%%D\python.exe"
      goto :eof
    )
  )
)

if exist "%LocalAppData%\Python\bin\python.exe" (
  "%LocalAppData%\Python\bin\python.exe" -c "import sys" >nul 2>&1
  if not errorlevel 1 (
    set "PYEXE=%LocalAppData%\Python\bin\python.exe"
    goto :eof
  )
)

for /d %%D in ("%ProgramFiles%\Python3*") do (
  if exist "%%D\python.exe" (
    "%%D\python.exe" -c "import sys" >nul 2>&1
    if not errorlevel 1 (
      set "PYEXE=%%D\python.exe"
      goto :eof
    )
  )
)

set "PYEXE="
