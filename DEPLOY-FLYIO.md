# Guía de Despliegue en Fly.io

## PASO 1: Instalar Fly CLI

Abre PowerShell como Administrador y ejecuta:

```powershell
# Instalar flyctl
iwr https://fly.io/install.ps1 -useb | iex

# Cerrar y reabrir PowerShell normal (no como admin)
```

Verifica la instalación:
```powershell
fly version
```

---

## PASO 2: Crear Cuenta y Login

```powershell
# Ir al directorio del proyecto
cd C:\Users\rolan\OneDrive\Documentos\Solicitud_de_Compras

# Login (abrirá el navegador)
fly auth login
```

Completa el registro en el navegador (te pedirá email).

---

## PASO 3: Configurar next.config.mjs

Asegúrate que `next.config.mjs` tenga la opción `output: 'standalone'`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // ← Agregar esta línea
  reactStrictMode: true,
  // ... resto de configuración
};

export default nextConfig;
```

---

## PASO 4: Configurar Variables de Entorno

Crea archivo `.env.production`:

```bash
NODE_ENV=production
JWT_SECRET=tu_secreto_super_seguro_cambiar_esto_12345
DATABASE_PATH=/app/data/solicitud_compras.db
```

---

## PASO 5: Modificar init-db.js

Actualiza la ruta de la base de datos:

```javascript
const dbPath = process.env.DATABASE_PATH || './solicitud_compras.db';
const db = new Database(dbPath);
```

---

## PASO 6: Crear Volumen para la Base de Datos

```powershell
# Crear app en Fly.io
fly launch --no-deploy

# Cuando pregunte:
# - App name: solicitud-compras (o el que prefieras)
# - Region: Miami (mia) está cerca
# - Would you like to set up a PostgreSQL database? → NO
# - Would you like to set up an Upstash Redis database? → NO

# Crear volumen para SQLite
fly volumes create solicitud_data --size 1 --region mia
```

---

## PASO 7: Configurar Secretos

```powershell
# Establecer JWT_SECRET
fly secrets set JWT_SECRET="tu_secreto_super_seguro_cambiar_esto_12345"

# Establecer ruta de base de datos
fly secrets set DATABASE_PATH="/app/data/solicitud_compras.db"
```

---

## PASO 8: Desplegar la Aplicación

```powershell
# Primera vez - Build y deploy
fly deploy

# Esto tomará varios minutos la primera vez
```

Espera a que termine. Verás algo como:
```
✓ Deployment successful!
Visit: https://solicitud-compras.fly.dev
```

---

## PASO 9: Verificar que Funciona

```powershell
# Abrir en navegador
fly open

# Ver logs en tiempo real
fly logs
```

---

## PASO 10: Configurar Dominio Personalizado

### A. Agregar dominio en Fly.io

```powershell
# Agregar certificado SSL para tu dominio
fly certs add solicituddecompras.polloaldia.com
```

Fly.io te dará instrucciones de DNS como:
```
A record: solicituddecompras → <IP de Fly.io>
AAAA record: solicituddecompras → <IPv6 de Fly.io>
```

### B. Configurar DNS en cPanel

1. Ve a cPanel → **"Zone Editor"**
2. Busca el dominio `polloaldia.com`
3. Agrega los registros que Fly.io te indicó:
   - **Tipo A**: `solicituddecompras` → IP de Fly.io
   - **Tipo AAAA**: `solicituddecompras` → IPv6 de Fly.io

4. Guarda y espera 5-10 minutos

### C. Verificar certificado

```powershell
fly certs show solicituddecompras.polloaldia.com
```

Cuando diga "Certificate issued", estará listo.

---

## Comandos Útiles

```powershell
# Ver estado de la app
fly status

# Ver logs en tiempo real
fly logs

# Abrir SSH en el servidor
fly ssh console

# Reiniciar la app
fly apps restart

# Ver uso de recursos
fly scale show

# Actualizar la app después de cambios
fly deploy

# Ver variables de entorno
fly secrets list
```

---

## Actualizar la Aplicación

Cuando hagas cambios en el código:

```powershell
# 1. Asegúrate de estar en el directorio del proyecto
cd C:\Users\rolan\OneDrive\Documentos\Solicitud_de_Compras

# 2. Deploy
fly deploy
```

¡Eso es todo! Se actualizará automáticamente.

---

## Backup de Base de Datos

```powershell
# Hacer backup
fly ssh console
# Dentro del servidor:
cp /app/data/solicitud_compras.db /app/data/solicitud_compras.db.backup.$(date +%Y%m%d)
exit

# Descargar backup a tu PC
fly ssh sftp get /app/data/solicitud_compras.db.backup.20260204 ./backup.db
```

---

## Solución de Problemas

### La app no inicia
```powershell
# Ver logs detallados
fly logs

# Reiniciar
fly apps restart
```

### Error de base de datos
```powershell
# Entrar al servidor
fly ssh console

# Verificar archivos
ls -la /app/data/

# Reinicializar BD
cd /app
node init-db.js
exit
```

### Cambiar región
```powershell
fly scale count 1 --region mia
```

---

## Costos Estimados

**Plan Gratuito incluye:**
- ✅ 3 máquinas compartidas (512MB RAM)
- ✅ 160GB transferencia/mes
- ✅ 3GB volumen persistente

**Tu app consume aprox:**
- 1 máquina = 512MB RAM
- 1GB volumen para DB
- ~10-20GB transferencia/mes (uso interno)

**Resultado: TODO GRATIS** 🎉

---

## Próximos Pasos Después del Deploy

1. ✅ Probar login en `https://tu-app.fly.dev`
2. ✅ Crear usuarios de prueba
3. ✅ Verificar subida de archivos
4. ✅ Configurar dominio personalizado
5. ✅ Hacer backup de la base de datos

¿Problemas? Ejecuta `fly logs` para ver qué pasa.
