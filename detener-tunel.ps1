# Script para detener todos los procesos
Write-Host "==================================================================" -ForegroundColor Red
Write-Host "  DETENIENDO APLICACION Y TUNEL" -ForegroundColor Red
Write-Host "==================================================================" -ForegroundColor Red
Write-Host ""

# Detener Node.js (Next.js)
Write-Host "Deteniendo servidor Next.js..." -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    $nodeProcesses | Stop-Process -Force
    Write-Host "  Servidor Next.js detenido" -ForegroundColor Green
} else {
    Write-Host "  No se encontró servidor Next.js ejecutándose" -ForegroundColor Gray
}

# Detener Cloudflared
Write-Host ""
Write-Host "Deteniendo túnel Cloudflare..." -ForegroundColor Yellow
$cloudflaredProcesses = Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue
if ($cloudflaredProcesses) {
    $cloudflaredProcesses | Stop-Process -Force
    Write-Host "  Túnel Cloudflare detenido" -ForegroundColor Green
} else {
    Write-Host "  No se encontró túnel Cloudflare ejecutándose" -ForegroundColor Gray
}

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Green
Write-Host "  TODO DETENIDO CORRECTAMENTE" -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Presiona cualquier tecla para cerrar..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
