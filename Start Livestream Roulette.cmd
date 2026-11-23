@echo off
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File "%~dp0windows\Start-LivestreamRoulette.ps1"
if errorlevel 1 pause
