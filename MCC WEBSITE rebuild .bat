@echo off
setlocal enableextensions
chcp 65001>nul

:: ===== CONFIG (edit as needed) =====
set "SITE_DIR=E:\MCC FILES\MCC WEBSITE\Website\manilacorinthian\mcc.2025"
set "HOST=127.0.0.1"
set "PORT=4000"
set "LRPORT=35729"
:: Optional: override PORT via first arg
if not "%~1"=="" set "PORT=%~1"

:: ===== CHECK TOOLCHAIN =====
where ruby>nul 2>nul || (echo [ERROR] Ruby not found. Install Ruby+Devkit and reopen terminal.& exit /b 1)
where bundle>nul 2>nul || (echo [INFO] Bundler not found. Installing...& gem install bundler|| (echo [ERROR] Failed to install bundler.& exit /b 1))

:: ===== ENTER SITE DIR =====
pushd "%SITE_DIR%" || (echo [ERROR] Cannot cd to %SITE_DIR%& exit /b 1)

:: ===== INSTALL GEMS =====
if exist Gemfile (
  echo [INFO] Installing gems...
  call bundle config set path vendor/bundle>nul
  call bundle install || (echo [ERROR] bundle install failed.& popd& exit /b 1)
)

:: ===== CLEAN & SERVE =====
echo [INFO] Cleaning previous build...
call bundle exec jekyll clean

:: Optional: full build before serve (uncomment if desired)
:: call bundle exec jekyll build --trace || (echo [ERROR] build failed.& popd& exit /b 1)

set "URL=http://%HOST%:%PORT%/"
echo [INFO] Starting Jekyll on %URL%
start "" "%URL%"
call bundle exec jekyll serve --host %HOST% --port %PORT% --livereload --livereload-port %LRPORT% --trace
set "ERR=%ERRORLEVEL%"

popd
endlocal & exit /b %ERR%
