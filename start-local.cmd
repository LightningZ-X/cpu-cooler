@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -File "%~dp0tools\start-local.ps1"
if errorlevel 1 pause
