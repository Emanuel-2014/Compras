# Guía de Despliegue en cPanel (polloaldia.com)

## Requisitos Previos
- Node.js habilitado en cPanel (verifica en "Setup Node.js App")
- Acceso SSH o Terminal en cPanel
- FileZilla o acceso a File Manager

## Pasos de Despliegue

### 1. Preparar la Aplicación Localmente

```powershell
# Crear build de producción
npm run build

# Verificar que no haya errores
```

### 2. Archivos a Subir al Servidor

**SUBIR ESTOS:**
- `app/` (toda la carpeta)
- `components/`
- `context/`
- `hooks/`
- `lib/`
- `public/`
- `uploads/` (vacía inicialmente)
- `package.json`
- `package-lock.json`
- `next.config.mjs`
- `jsconfig.json`
- `init-db.js`

**NO SUBIR:**
- `node_modules/` (se instalarán en el servidor)
- `.next/` (se generará en el servidor)
- `.env.local` (crear nuevo en servidor)
- `solicitud_compras.db` (se creará en servidor)

### 3. Configurar en cPanel

#### A. Setup Node.js App
1. Ve a "Setup Node.js App"
2. Crea nueva aplicación:
   - **Node.js version:** 18.x o superior
   - **Application mode:** Production
   - **Application root:** `/home/polloaldia/solicitud-compras`
   - **Application URL:** `polloaldia.com` o tu dominio
   - **Application startup file:** Dejar vacío (usaremos npm start)

#### B. Variables de Entorno
En la misma pantalla, agrega:
```
NODE_ENV=production
PORT=3000
JWT_SECRET=tu_secreto_super_seguro_cambialo
DATABASE_PATH=./solicitud_compras.db
```

### 4. Conectar por SSH y Configurar

```bash
# Conectar al servidor
ssh polloaldia@polloaldia.com

# Ir al directorio de la app
cd ~/solicitud-compras

# Instalar dependencias
npm install --production

# Crear base de datos
node init-db.js

# Crear directorios necesarios
mkdir -p uploads public/uploads

# Dar permisos
chmod 755 uploads
chmod 755 public/uploads
chmod 644 solicitud_compras.db

# Build en producción
npm run build
```

### 5. Configurar package.json Scripts

Asegúrate que `package.json` tenga:
```json
{
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start -p 3000",
    "lint": "next lint"
  }
}
```

### 6. Iniciar Aplicación en cPanel

Vuelve a "Setup Node.js App" y:
1. Haz clic en "Start App"
2. Si hay errores, revisa los logs

### 7. Configurar Dominio (si es necesario)

Si usas un subdominio o dominio diferente:
1. Ve a "Domains" en cPanel
2. Crea/edifica dominio
3. Apunta el document root a `/home/polloaldia/solicitud-compras`

### 8. Configurar .htaccess (Opcional)

Crea `.htaccess` en el directorio raíz si necesitas proxy:
```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ http://localhost:3000/$1 [P,L]
```

## Solución de Problemas

### La app no inicia
```bash
# Ver logs
cd ~/solicitud-compras
cat logs/error.log

# Verificar Node.js
node --version
npm --version

# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Error de base de datos
```bash
# Recrear base de datos
rm solicitud_compras.db
node init-db.js
```

### Error de permisos
```bash
chmod -R 755 ~/solicitud-compras
chmod 644 solicitud_compras.db
chmod 755 uploads
```

### Puerto ocupado
En cPanel Node.js App, cambia el puerto en variables de entorno:
```
PORT=3001
```

## Actualizar la Aplicación

Cuando hagas cambios:
```bash
# En el servidor
cd ~/solicitud-compras

# Descargar cambios (si usas Git) o subir archivos por FTP
# git pull origin main

# Reinstalar dependencias si cambiaron
npm install

# Rebuild
npm run build

# Reiniciar app en cPanel
# Ve a "Setup Node.js App" > "Restart"
```

## Backup de Base de Datos

```bash
# Hacer backup
cp solicitud_compras.db solicitud_compras.db.backup.$(date +%Y%m%d)

# Restaurar backup
cp solicitud_compras.db.backup.20260204 solicitud_compras.db
```

## Notas Importantes

1. **Seguridad:** Cambia `JWT_SECRET` a algo único y seguro
2. **Uploads:** Asegúrate que la carpeta `uploads/` tenga permisos de escritura
3. **Base de datos:** SQLite no es ideal para producción con mucho tráfico, considera PostgreSQL/MySQL
4. **Logs:** Revisa regularmente los logs en cPanel
5. **SSL:** Activa SSL/HTTPS en cPanel para seguridad

## Recursos de cPanel

- **File Manager:** Para subir/editar archivos
- **Terminal:** Para comandos SSH
- **Setup Node.js App:** Para gestionar la aplicación
- **SSL/TLS Status:** Para activar HTTPS
- **Cron Jobs:** Para tareas programadas si las necesitas
