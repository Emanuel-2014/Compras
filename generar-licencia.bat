@echo off
chcp 65001 >nul
color 0A
title 🔐 Generador de Licencias Portable - Pollos al Día

echo.
echo ═══════════════════════════════════════════════════════════════════════════
echo 🔐 GENERADOR DE LICENCIAS PORTABLE - POLLOS AL DÍA
echo ═══════════════════════════════════════════════════════════════════════════
echo.
echo Verificando Node.js...
echo.

:: Verificar si Node.js está instalado
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo ❌ ERROR: Node.js no está instalado
    echo.
    echo Por favor, instala Node.js desde: https://nodejs.org
    echo.
    pause
    exit /b 1
)

:: Mostrar versión de Node.js
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js detectado: %NODE_VERSION%
echo.

:: Verificar si el archivo existe
if not exist "generador-licencia-portable.cjs" (
    color 0C
    echo ❌ ERROR: No se encuentra el archivo generador-licencia-portable.cjs
    echo.
    echo Asegúrate de que este archivo .bat esté en la misma carpeta que:
    echo    - generador-licencia-portable.cjs
    echo.
    pause
    exit /b 1
)

echo Iniciando generador...
echo.
echo ═══════════════════════════════════════════════════════════════════════════
echo.

:: Ejecutar el generador
node generador-licencia-portable.cjs

echo.
echo ═══════════════════════════════════════════════════════════════════════════
echo.
echo Presiona cualquier tecla para cerrar...
pause >nul
