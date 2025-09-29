@echo off & setlocal enableextensions
chcp 65001>nul
set "SITE_DIR=E:\MCC FILES\MCC WEBSITE\Website\manilacorinthian\mcc.2025"
set "HOST=127.0.0.1"
set "PORT=4000"
set "LRPORT=35729"
if not "%~1"=="" set "PORT=%~1"

pushd "%SITE_DIR%" || (echo [ERROR] Cannot cd to %SITE_DIR%& exit /b 1)

:: Fast dev serve: no clean, no bundle install
set "URL=http://%HOST%:%PORT%/"
echo [DEV] Serving Jekyll (incremental + livereload) on %URL%
start "" "%URL%"

bundle exec jekyll serve --host %HOST% --port %PORT% --livereload --livereload-port %LRPORT% --incremental --trace
set "ERR=%ERRORLEVEL%"

popd & endlocal & exit /b %ERR%
