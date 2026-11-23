@echo off
rem Relaunch Obsidian with the CDP debug port needed by the Scholium plugin.
taskkill /IM Obsidian.exe /F >nul 2>&1
timeout /t 2 /nobreak >nul
start "" "%LOCALAPPDATA%\Programs\Obsidian\Obsidian.exe" --remote-debugging-port=9222
