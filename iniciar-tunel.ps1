# Script para iniciar la aplicación con túnel de Cloudflare
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "  INICIANDO SISTEMA DE SOLICITUD DE COMPRAS CON CLOUDFLARE TUNNEL" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host ""

# Ruta de la aplicación
$appPath = "C:\Users\rolan\OneDrive\Documentos\Solicitud_de_Compras"


# Paso 1: Iniciar Next.js en una nueva ventana
Write-Host "[PASO 1/2] Iniciando servidor Next.js..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$appPath'; Write-Host 'SERVIDOR NEXT.JS - NO CIERRES ESTA VENTANA' -ForegroundColor Green; npm run dev"

Write-Host "   Esperando 10 segundos para que Next.js inicie..." -ForegroundColor Gray
Start-Sleep -Seconds 10

# Paso 2: Iniciar túnel temporal de Cloudflare
Write-Host ""
Write-Host "[PASO 2/2] Iniciando túnel temporal de Cloudflare..." -ForegroundColor Yellow
Write-Host "   Se abrirá una ventana nueva con la URL temporal pública." -ForegroundColor Gray
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$appPath'; Write-Host 'TUNEL CLOUDFLARE TEMPORAL - NO CIERRES ESTA VENTANA' -ForegroundColor Green; Write-Host ''; Write-Host 'Tu aplicación estará disponible en una URL temporal:' -ForegroundColor Cyan; Write-Host ''; cloudflared tunnel --url http://localhost:3000; Write-Host ''; Write-Host 'Copia la URL pública que aparece arriba para compartir acceso.' -ForegroundColor Yellow; Write-Host ''"

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Green
Write-Host "  ¡LISTO! El sistema está iniciándose..." -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Se abrieron 2 ventanas de PowerShell:" -ForegroundColor White
Write-Host "  1. Servidor Next.js (localhost:3000)" -ForegroundColor Yellow
Write-Host "  2. Túnel Cloudflare temporal (URL pública trycloudflare.com)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Copia la URL pública que aparece en la ventana del túnel para compartir acceso externo." -ForegroundColor Cyan
Write-Host ""
Write-Host "NO CIERRES ninguna de las ventanas que se abrieron." -ForegroundColor Red
Write-Host ""
Write-Host "Presiona cualquier tecla para cerrar esta ventana..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
