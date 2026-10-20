@echo off
chcp 65001 >nul
title Twilight
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js n'est pas installe. Telecharge-le sur https://nodejs.org puis relance ce fichier.
  pause
  exit /b 1
)
node --disable-warning=ExperimentalWarning server.js
pause
