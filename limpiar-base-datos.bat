@echo off
chcp 65001 >nul
echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║     LIMPIAR BASE DE DATOS - Empezar de Cero                   ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo ⚠️  ADVERTENCIA: Esta acción eliminará TODOS los datos:
echo.
echo    ❌ Todas las solicitudes
echo    ❌ Todos los items
echo    ❌ Todas las aprobaciones
echo    ❌ Todas las facturas
echo    ❌ Todos los proveedores
echo    ❌ Archivos subidos (uploads)
echo    ❌ Historial de auditoría
echo.
echo    ✅ Se mantendrán: Usuarios por defecto (superadmin, admin)
echo.
echo ════════════════════════════════════════════════════════════════
echo.

set /p confirm="¿Estás SEGURO de que deseas eliminar todos los datos? (SI/NO): "

if /i "%confirm%" NEQ "SI" (
    echo.
    echo ❌ Operación cancelada. No se eliminó nada.
    echo.
    pause
    exit /b
)

echo.
echo 🔄 Eliminando base de datos actual...

REM Eliminar archivos de base de datos
if exist database.db (
    del /f /q database.db
    echo    ✅ database.db eliminado
)
if exist database.db-shm (
    del /f /q database.db-shm
    echo    ✅ database.db-shm eliminado
)
if exist database.db-wal (
    del /f /q database.db-wal
    echo    ✅ database.db-wal eliminado
)

REM Eliminar carpeta uploads completa
if exist uploads (
    echo 🔄 Eliminando archivos subidos...
    rmdir /s /q uploads
    echo    ✅ Carpeta uploads eliminada
)

REM Eliminar carpeta backups
if exist backups (
    echo 🔄 Eliminando backups antiguos...
    rmdir /s /q backups
    echo    ✅ Carpeta backups eliminada
)

echo.
echo 🔄 Creando nueva base de datos limpia...
echo.

REM Ejecutar init-db.js para crear base de datos nueva
node init-db.js

if errorlevel 1 (
    echo.
    echo ❌ Error al crear la base de datos
    echo.
    pause
    exit /b 1
)

echo.
echo ════════════════════════════════════════════════════════════════
echo.
echo ✅ ¡Base de datos limpiada exitosamente!
echo.
echo 📋 Credenciales por defecto:
echo    Usuario: superadmin
echo    Contraseña: admin123
echo.
echo    Usuario: admin
echo    Contraseña: admin123
echo.
echo 🎯 La aplicación está lista para empezar de cero
echo.
echo ════════════════════════════════════════════════════════════════
echo.
pause
