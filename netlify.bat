@echo off & setlocal enableextensions
chcp 65001>nul

:: === CONFIG ===
set "SITE_DIR=E:\MCC FILES\MCC WEBSITE\Website\manilacorinthian\mcc.2025"
set "JEKYLL_PORT=4000"
set "NETLIFY_PORT=8888"
set "LRPORT=35729"
:: Optional: override Netlify port via first arg
if not "%~1"=="" set "NETLIFY_PORT=%~1"

:: === TOOLING CHECKS ===
where node>nul 2>nul || (echo [ERROR] Node.js not found. Install Node 18+ and retry.& exit /b 1)
where npm>nul 2>nul  || (echo [ERROR] npm not found. Ensure Node is installed and in PATH.& exit /b 1)
where netlify>nul 2>nul || (
  echo [INFO] Netlify CLI not found. Installing globally...&
  npm i -g netlify-cli || (echo [ERROR] Failed to install Netlify CLI.& exit /b 1)
)
where ruby>nul 2>nul || (echo [ERROR] Ruby not found. Install Ruby+Devkit and retry.& exit /b 1)
where bundle>nul 2>nul || (echo [INFO] Bundler not found. Installing...& gem install bundler || (echo [ERROR] Failed to install bundler.& exit /b 1))

:: === GO TO SITE ===
pushd "%SITE_DIR%" || (echo [ERROR] Cannot cd to %SITE_DIR%& exit /b 1)

:: (Optional) Ensure gems are installed once; comment out if not needed
if exist Gemfile (
  if not exist vendor\bundle (
    echo [INFO] Installing gems (first run)...
    call bundle config set path vendor/bundle>nul
    call bundle install || (echo [ERROR] bundle install failed.& popd& exit /b 1)
  )
)

set "URL=http://localhost:%NETLIFY_PORT%/"
echo [DEV] Netlify Dev on %URL% (proxy -> Jekyll http://127.0.0.1:%JEKYLL_PORT%/)
start "" "%URL%"

:: Run Netlify Dev, which starts Jekyll and proxies it
netlify dev ^
  -c "bundle exec jekyll serve --host 127.0.0.1 --port %JEKYLL_PORT% --livereload --livereload-port %LRPORT% --incremental --trace" ^
  --targetPort %JEKYLL_PORT% ^
  --port %NETLIFY_PORT% ^
  --telemetry-disable
set "ERR=%ERRORLEVEL%"

popd
endlocal & exit /b %ERR%
