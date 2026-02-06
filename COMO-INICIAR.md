# 🚀 GUÍA RÁPIDA - Iniciar Sistema de Solicitud de Compras

## Para Iniciar la Aplicación


### OPCIÓN RECOMENDADA: Script Automático

Ejecuta el script para iniciar todo y obtener una URL pública temporal:

```powershell
cd C:\Users\rolan\OneDrive\Documentos\Solicitud_de_Compras
./iniciar-tunel.ps1
```
✅ Se abrirán dos ventanas: una para Next.js y otra para el túnel Cloudflare. En la ventana del túnel aparecerá una URL pública tipo `https://randomstring.trycloudflare.com`.

**Copia esa URL para compartir acceso externo temporal.**

---

### OPCIÓN MANUAL (avanzado)

1️⃣ Abrir PowerShell (Ventana 1) - Servidor Next.js
```powershell
cd C:\Users\rolan\OneDrive\Documentos\Solicitud_de_Compras
npm run dev
```
✅ Espera a que diga "Ready in X ms"

2️⃣ Abrir PowerShell (Ventana 2) - Túnel Cloudflare temporal
```powershell
cd C:\Users\rolan\OneDrive\Documentos\Solicitud_de_Compras
cloudflared tunnel --url http://localhost:3000
```
✅ Espera a que aparezca una URL pública tipo `https://randomstring.trycloudflare.com`

## Acceder a la Aplicación

- **Localmente:** http://localhost:3000
- **En red local:** http://192.168.0.73:3000
- **Internet (temporal):** URL pública que aparece en la ventana del túnel (ejemplo: https://randomstring.trycloudflare.com)

## Para Detener Todo

1. En cada ventana de PowerShell presiona: `Ctrl+C`
2. O ejecuta: `C:\Users\rolan\OneDrive\Documentos\Solicitud_de_Compras\detener-tunel.ps1`

## Verificar que está Funcionando

```powershell
# Ver si Next.js está corriendo
netstat -ano | findstr ":3000"

# Ver si cloudflared está corriendo
Get-Process cloudflared
```

## Solución de Problemas

### Error: "Puerto 3000 en uso"
```powershell
# Matar proceso en puerto 3000
$process = netstat -ano | findstr ":3000" | ForEach-Object { $_.Split()[-1] } | Select-Object -First 1
Stop-Process -Id $process -Force
```

### Error: "cloudflared no se reconoce"
- Asegúrate de ejecutar desde `C:\Users\rolan`
- O reinicia PowerShell

### Verificar Propagación DNS
https://www.whatsmydns.net/#CNAME/solicituddecompras.polloaldia.com

---


## 📊 URLs del Sistema

- **Dashboard Cloudflare:** https://dash.cloudflare.com
- **Panel cPanel:** https://cpanel.polloaldia.com
- **Repositorio GitHub:** https://github.com/Emanuel-2014/Compras

---

## ⚙️ Configuración Actual

- **Puerto:** 3000
- **Base de datos:** SQLite local (database.db)
- **Túnel:** Cloudflare temporal (trycloudflare.com)
- **Dominio:** (solo disponible si tienes control DNS)

---

**Última actualización:** 6 de febrero de 2026
