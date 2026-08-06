@echo off
chcp 65001 >nul
cd /d "%~dp0"
title LAG Controller - Servidor Local

echo ==============================================
echo       LAG CONTROLLER - MODO LOCAL
echo ==============================================
echo.

where node >nul 2>nul
if %errorlevel%==0 (
  node server.js
  goto :end
)

where py >nul 2>nul
if %errorlevel%==0 (
  py server.py
  goto :end
)

where python >nul 2>nul
if %errorlevel%==0 (
  python server.py
  goto :end
)

echo Nao foi encontrado Node.js nem Python neste computador.
echo Instale o Node.js ou use a extensao Live Server do VS Code.
echo Depois abra: http://127.0.0.1:5500/index.html
pause

:end
