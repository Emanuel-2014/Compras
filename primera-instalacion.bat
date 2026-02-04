@echo off
cd /d "%~dp0"
title Primera Instalacion - Sistema de Gestion
color 0A

echo ========================================
echo   PRIMERA INSTALACION - SISTEMA
echo ========================================
echo.
echo Este script instalara la aplicacion
echo por primera vez en este equipo.
echo.
echo Duracion estimada: 3-5 minutos
echo.
pause

cls
echo ========================================
echo   PASO 1/4: Verificando Node.js
echo ========================================
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js NO esta instalado
    echo.
    echo Por favor, instala Node.js desde:
    echo   - manuales\node-v22.20.0-x64.msi ^(64 bits^)
    echo   - manuales\node-v22.20.0-x86.msi ^(32 bits^)
    echo.
    echo Despues de instalar, ejecuta este script nuevamente.
    pause
    exit /b 1
)

echo [OK] Node.js encontrado
node --version
echo.
pause

cls
echo ========================================
echo   PASO 2/5: Verificando configuracion
echo ========================================
echo.

if not exist .env.local (
    echo [ADVERTENCIA] No se encontro el archivo .env.local
    echo.
    echo Este archivo es necesario para:
    echo   - Cifrado de la base de datos
    echo   - Seguridad de sesiones
    echo   - Licencia de la aplicacion
    echo.
    echo Deseas crearlo ahora?
    echo   S = SI, ejecutar asistente de configuracion
    echo   N = NO, continuar sin configuracion ^(puede causar errores^)
    echo.
    set /p create_env="Crear .env.local? (S/N): "
    
    if /i "!create_env!"=="S" (
        echo.
        echo Ejecutando asistente de configuracion...
        call configurar-env.bat
        
        if not exist .env.local (
            echo.
            echo [ERROR] No se pudo crear .env.local
            pause
            exit /b 1
        )
    ) else (
        echo.
        echo [ADVERTENCIA] Continuando sin .env.local
        echo Se usaran valores por defecto.
        echo.
    )
) else (
    echo [OK] Archivo .env.local encontrado
    echo.
)

pause

cls
echo ========================================
echo   PASO 3/5: Instalando dependencias
echo ========================================
echo.
echo Instalando paquetes de Node.js...
echo Esto puede tardar 2-5 minutos...
echo.
echo [INFO] Se incluye cifrado de base de datos
echo.

call npm install

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Hubo un problema al instalar las dependencias
    echo.
    echo Posibles soluciones:
    echo   1. Verifica tu conexion a internet
    echo   2. Ejecuta como Administrador
    echo   3. Intenta: npm cache clean --force
    echo.
    pause
    exit /b 1
)

echo.
echo [OK] Dependencias instaladas correctamente
echo.
pause

cls
echo ========================================
echo   PASO 4/5: Inicializando base de datos
echo ========================================
echo.

if exist database.db (
    echo [INFO] La base de datos ya existe ^(database.db^)
    echo.
    echo [ADVERTENCIA] Si eliminas la base de datos actual,
    echo PERDERAS TODOS LOS DATOS ^(solicitudes, facturas, usuarios, etc.^)
    echo.
    echo Deseas eliminar la base de datos actual y crear una nueva?
    echo   S = SI, eliminar todo y crear base de datos limpia
    echo   N = NO, mantener base de datos actual
    echo.
    set /p db_choice="Eliminar base de datos? (S/N): "
    
    if /i "!db_choice!"=="S" (
        echo.
        echo Creando respaldo de la base de datos actual...
        copy database.db database.db.backup.%date:~-4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%.db >nul 2>&1
        echo [OK] Respaldo creado con fecha y hora
        echo.
        echo Eliminando base de datos actual...
        del database.db
        del database.db-shm 2>nul
        del database.db-wal 2>nul
        echo [OK] Base de datos eliminada
        echo.
        goto :init_db
    ) else (
        echo.
        echo [OK] Manteniendo base de datos existente
        echo.
    )
) else (
    :init_db
    echo Creando nueva base de datos...
    echo.
    node init-db.js
    
    if %errorlevel% neq 0 (
        echo.
        echo [ERROR] No se pudo crear la base de datos
        pause
        exit /b 1
    )
    
    echo.
    echo [OK] Base de datos creada correctamente
    echo.
    echo Usuario administrador creado:
    echo   Usuario: admin
    echo   Contrasena: admin
    echo   Nombre: ROLANDO TORRES
    echo.
    echo [IMPORTANTE] Cambia la contrasena despues del primer login
    echo [NOTA] Se crearon algunos usuarios de ejemplo que puedes eliminar
    echo.
)

pause

cls
echo ========================================
echo   PASO 5/5: Compilando aplicacion
echo ========================================
echo.
echo Compilando para modo produccion...
echo Esto puede tardar 1-2 minutos...
echo.

call npm run build

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Hubo un problema al compilar
    echo.
    echo Puedes usar modo desarrollo si prefieres
    pause
    exit /b 1
)

echo.
echo [OK] Aplicacion compilada correctamente
echo.
pause

cls
echo ========================================
echo   INSTALACION COMPLETADA
echo ========================================
echo.
echo [OK] La aplicacion esta lista para usar
echo.
echo CREDENCIALES DE ACCESO:
 echo   Usuario: admin
 echo   Contrasena: admin
echo   URL: http://localhost:3000
echo.
echo ----------------------------------------
echo   Opciones de inicio:
echo ----------------------------------------
echo.
echo   1. Iniciar en modo desarrollo
echo      ^(para pruebas, muestra errores^)
echo.
echo   2. Iniciar en modo produccion
echo      ^(para uso normal^)
echo.
echo   3. Iniciar en segundo plano
echo      ^(produccion, sin ventana^)
echo.
echo   4. No iniciar ahora
echo.
set /p start_choice="Elige una opcion (1-4): "

if "%start_choice%"=="1" (
    echo.
    echo Iniciando en modo desarrollo...
    echo Presiona Ctrl+C para detener
    echo.
    timeout /t 2 /nobreak >nul
    call npm run dev
) else if "%start_choice%"=="2" (
    echo.
    echo Iniciando en modo produccion...
    echo Presiona Ctrl+C para detener
    echo.
    timeout /t 2 /nobreak >nul
    call npm start
) else if "%start_choice%"=="3" (
    echo.
    echo Iniciando en segundo plano...
    timeout /t 2 /nobreak >nul
    start /B npm start
    echo.
    echo [OK] Aplicacion iniciada en segundo plano
    echo.
    echo Para detener: stop-app.bat
    echo Para ver si esta corriendo: netstat -ano ^| findstr ":3000"
    echo.
    pause
) else (
    echo.
    echo Para iniciar la aplicacion despues:
    echo   - Desarrollo: start-dev.bat
    echo   - Produccion: start-prod.bat
    echo   - Segundo plano: start-prod-background.bat
    echo.
    echo Para detener: stop-app.bat
    echo.
    pause
)

echo.
echo Instalacion finalizada
echo.
