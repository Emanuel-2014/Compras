# Guía de Despliegue en Railway

## ¿Por qué Railway?
- ✅ **NO requiere tarjeta de crédito** para empezar
- ✅ $5 USD de crédito gratis cada mes (renovable)
- ✅ Detecta automáticamente Next.js
- ✅ Soporta SQLite perfectamente
- ✅ Muy fácil de usar

---

## PASO 1: Crear Cuenta en Railway

1. Ve a: **https://railway.app/**
2. Haz clic en **"Start a New Project"** o **"Login"**
3. Regístrate con:
   - GitHub (recomendado)
   - O con Email

**No pide tarjeta de crédito** ✅

---

## PASO 2: Subir Proyecto

### Opción A: Desde GitHub (Recomendada)

Si tienes tu proyecto en GitHub:

1. En Railway, clic en **"New Project"**
2. Selecciona **"Deploy from GitHub repo"**
3. Autoriza Railway a acceder a tus repos
4. Selecciona el repositorio de tu app
5. Railway detectará automáticamente que es Next.js

### Opción B: Desde CLI (Lo haremos)

Usaremos Railway CLI para subir directamente desde tu PC.

---

## PASO 3: Instalar Railway CLI

En PowerShell ejecuta:

```powershell
npm install -g @railway/cli
```

Verifica instalación:

```powershell
railway --version
```

---

## PASO 4: Login en Railway

```powershell
railway login
```

Esto abrirá el navegador. Autoriza el acceso.

---

## PASO 5: Inicializar Proyecto

En el directorio de tu app:

```powershell
cd C:\Users\rolan\OneDrive\Documentos\Solicitud_de_Compras

railway init
```

Te preguntará:
- **"Select a project"** → Selecciona **"Create a new project"**
- **"Enter project name"** → Escribe: `solicitud-compras`

---

## PASO 6: Configurar Variables de Entorno

```powershell
# Establecer NODE_ENV
railway variables set NODE_ENV=production

# Establecer JWT_SECRET
railway variables set JWT_SECRET="tu_secreto_super_seguro_cambiar_esto_12345"

# Establecer ruta de base de datos
railway variables set DATABASE_PATH="./solicitud_compras.db"

# Establecer puerto
railway variables set PORT=3000
```

---

## PASO 7: Crear Volumen para Base de Datos

Railway ahora usa volúmenes persistentes:

1. Ve a tu proyecto en Railway Dashboard: **https://railway.app/dashboard**
2. Haz clic en tu servicio
3. Ve a la pestaña **"Settings"**
4. En **"Volumes"**, clic en **"+ New Volume"**
5. Mount Path: `/app/data`
6. Haz clic en **"Add"**

O desde CLI:

```powershell
railway volume create
```

---

## PASO 8: Desplegar

```powershell
railway up
```

Esto:
1. Empaquetará tu código
2. Lo subirá a Railway
3. Railway detectará que es Next.js
4. Instalará dependencias
5. Hará el build
6. Iniciará la app

**Espera 3-5 minutos**. Verás el progreso en tiempo real.

---

## PASO 9: Obtener URL

```powershell
railway domain
```

O ve al dashboard y verás la URL asignada, algo como:
```
https://solicitud-compras-production.up.railway.app
```

---

## PASO 10: Verificar que Funciona

```powershell
# Abrir en navegador
railway open

# Ver logs
railway logs
```

---

## PASO 11: Configurar Dominio Personalizado

### A. En Railway Dashboard

1. Ve a tu proyecto en Railway
2. Clic en **"Settings"**
3. En **"Domains"**, clic en **"+ Custom Domain"**
4. Ingresa: `solicituddecompras.polloaldia.com`
5. Railway te dará un CNAME:
   ```
   CNAME: solicituddecompras → xxxx.up.railway.app
   ```

### B. En cPanel (DNS)

1. Ve a cPanel → **"Zone Editor"**
2. Busca `polloaldia.com`
3. Agrega registro CNAME:
   - **Nombre:** `solicituddecompras`
   - **Tipo:** CNAME
   - **Destino:** El que Railway te dio (ej: `solicitud-compras-production.up.railway.app`)
4. Guarda y espera 5-10 minutos

### C. Verificar SSL

Railway genera certificado SSL automáticamente. Espera unos minutos y verifica:
```
https://solicituddecompras.polloaldia.com
```

---

## Comandos Útiles

```powershell
# Ver estado
railway status

# Ver logs en tiempo real
railway logs

# Ver variables
railway variables

# Establecer variable
railway variables set VARIABLE_NAME=valor

# Abrir dashboard
railway open

# Actualizar después de cambios
railway up

# Ver uso/costos
railway service
```

---

## Actualizar la Aplicación

Cuando hagas cambios:

```powershell
# En el directorio del proyecto
cd C:\Users\rolan\OneDrive\Documentos\Solicitud_de_Compras

# Desplegar nueva versión
railway up
```

---

## Backup de Base de Datos

### Desde Railway CLI:

```powershell
# Conectar por shell
railway shell

# Dentro del shell:
cp solicitud_compras.db solicitud_compras.db.backup.$(date +%Y%m%d)
exit
```

### Descargar backup:

Railway no tiene SFTP directo, pero puedes:

1. Agregar endpoint API para descargar DB
2. O usar Railway Shell para copiar el archivo

---

## Monitoreo

Railway Dashboard muestra:
- ✅ CPU usage
- ✅ Memory usage
- ✅ Network traffic
- ✅ Costos estimados
- ✅ Logs en tiempo real

Ve a: **https://railway.app/dashboard**

---

## Costos Estimados

**Plan Gratuito:**
- $5 USD crédito/mes
- Renovable automáticamente
- Tu app consume ~$3-4/mes
- **Alcanza todo el mes** ✅

**Si se acaba el crédito:**
- App se pausa hasta próximo mes
- O puedes agregar tarjeta para continuar

---

## Solución de Problemas

### Error en deploy

```powershell
# Ver logs detallados
railway logs --tail

# Reiniciar servicio
railway restart
```

### Error de base de datos

```powershell
railway shell
ls -la
node init-db.js
exit
```

### Cambiar variables

```powershell
railway variables set VARIABLE_NAME=nuevo_valor
railway restart
```

---

## Ventajas de Railway vs Fly.io

| Feature | Railway | Fly.io |
|---------|---------|--------|
| Tarjeta requerida | ❌ No | ✅ Sí |
| Crédito gratis | $5/mes | $5/mes |
| SQLite support | ✅ Excelente | ⚠️ Requiere volumen |
| Setup | 🟢 Muy fácil | 🟡 Medio |
| UI/Dashboard | 🟢 Moderna | 🟡 Básica |
| CLI | 🟢 Simple | 🟡 Compleja |
| Auto-deploy | ✅ Con GitHub | ⚠️ Manual |

---

## Próximos Pasos

1. ✅ Desplegar app en Railway
2. ✅ Probar login y funcionalidad
3. ✅ Configurar dominio personalizado
4. ✅ Configurar backup automático (opcional)
5. ✅ Monitorear uso en dashboard

---

## Recursos

- **Railway Dashboard:** https://railway.app/dashboard
- **Railway Docs:** https://docs.railway.app
- **CLI Docs:** https://docs.railway.app/develop/cli

¿Problemas? Ejecuta `railway logs` para ver qué está pasando.
