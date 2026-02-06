# 🌐 Acceso a la Aplicación de Solicitud de Compras

## ✅ CONFIGURACIÓN ACTUAL (Funcional)

### 1. Acceso en Red Local
La aplicación está completamente funcional en tu red local:

- **Desde esta PC:** http://localhost:3000
- **Desde otras PCs en la red:** http://192.168.0.73:3000

### 2. Cloudflare Tunnel (Configurado - Pendiente DNS)
El túnel está configurado correctamente pero **no funciona públicamente** porque el dominio `polloaldia.com` no está usando los nameservers de Cloudflare.

**Configuración del túnel:**
- Tunnel ID: `39c1aac5-b5dd-4f2b-aeb6-57b6577ef5d6`
- Dominio objetivo: `solicituddecompras.polloaldia.com`
- Config: `C:\Users\rolan\.cloudflared\config.yml`

---

## 🚀 Cómo Iniciar la Aplicación

### Opción 1: Scripts Automáticos
```powershell
# Iniciar todo
.\iniciar-aplicacion.bat

# Detener todo
.\detener-tunel.ps1
```

### Opción 2: Manual (Recomendado para desarrollo)

**Terminal 1 - Next.js:**
```powershell
cd "C:\Users\rolan\OneDrive\Documentos\Solicitud_de_Compras"
npm run dev
```

**Terminal 2 - Cloudflare Tunnel (Opcional):**
```powershell
cd C:\Users\rolan
C:\Users\rolan\AppData\Local\Microsoft\WinGet\Packages\cloudflare.cloudflared_Microsoft.Winget.Source_8wekyb3d8bbwe\cloudflared.exe tunnel --config C:\Users\rolan\.cloudflared\config.yml run solicitud-compras
```

---

## 🔧 Para Hacer Funcionar el Acceso Público

**PROBLEMA:** El dominio `polloaldia.com` está usando nameservers de cPanel, NO de Cloudflare.

**SOLUCIÓN 1 (Recomendada):** Agregar CNAME directamente en cPanel
1. Entra a tu cPanel
2. Busca "Zone Editor" o "Editor de zona DNS"
3. Agrega un registro CNAME:
   - Nombre: `solicituddecompras`
   - Tipo: CNAME
   - Destino: `39c1aac5-b5dd-4f2b-aeb6-57b6577ef5d6.cfargotunnel.com`
   - TTL: 300

**SOLUCIÓN 2 (Óptima pero más compleja):** Cambiar nameservers
1. En el registrador donde compraste el dominio, cambia los nameservers a:
   - `athena.ns.cloudflare.com`
   - `oswald.ns.cloudflare.com`
2. Espera 1-24 horas para propagación DNS

---

## 📝 Archivos Importantes

- `next.config.mjs` - Configuración de Next.js con allowedDevOrigins
- `C:\Users\rolan\.cloudflared\config.yml` - Configuración del túnel Cloudflare
- `iniciar-aplicacion.bat` - Script para iniciar Next.js
- `detener-tunel.ps1` - Script para detener todos los procesos

---

## ❌ Intentos Fallidos (No usar)

Los siguientes métodos fueron probados y NO funcionaron:
- ❌ Railway (trial expirado)
- ❌ Render (requiere tarjeta de crédito)
- ❌ Deploy directo a cPanel (no soporta Node.js)
- ❌ Fly.io (requiere configuración compleja)

---

## 💡 Uso Recomendado Actual

**Para uso interno/desarrollo:**
- Usar red local: http://192.168.0.73:3000
- Todos los dispositivos en tu oficina/red pueden acceder

**Para acceso externo:**
- Configurar CNAME en cPanel (ver SOLUCIÓN 1 arriba)
- O usar la IP pública de tu router + port forwarding (puerto 3000)
