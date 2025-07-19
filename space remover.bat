@echo off
setlocal enabledelayedexpansion

rem Change directory to _posts folder (edit this path if needed)
cd /d "%~dp0_posts"

rem Loop over files matching date-space-dash pattern
for %%f in ("2025-??-?? -*.md") do (
    set "filename=%%~nf"
    set "ext=%%~xf"
    
    rem Remove space before dash
    set "newname=!filename: =!"
    
    rem Rename file if names differ
    if not "!filename!!ext!"=="!newname!!ext!" (
        echo Renaming "%%f" to "!newname!!ext!"
        ren "%%f" "!newname!!ext!"
    )
)

endlocal
pause
