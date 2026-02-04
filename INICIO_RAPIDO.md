# 🚀 Guía Rápida de Inicio

## ⚡ Instalación Rápida

### Windows (Recomendado)
```bash
# 1. Ejecutar el script de instalación
.\scripts-utilidad\primera-instalacion.bat

# 2. Configurar variables de entorno
.\scripts-utilidad\configurar-env.bat

# 3. Iniciar el servidor
.\scripts-utilidad\start-dev.bat
```

### Manual
```bash
# 1. Instalar dependencias
npm install

# 2. Crear archivo .env.local (copiar de .env.local.example)
# Configurar: JWT_SECRET, LICENSE_KEY, COMPANY_NAME

# 3. Inicializar base de datos
node init-db.js

# 4. Iniciar servidor de desarrollo
npm run dev
```

## 🌐 Acceso

- **URL:** http://localhost:3000
- **Usuario Admin:** Definido en `init-db.js`

## 📋 Scripts Disponibles

### Desarrollo
```bash
npm run dev        # Iniciar servidor (puerto 3000)
npm run build      # Compilar para producción
npm start          # Iniciar modo producción
```

### Utilidades (Windows)
```bash
.\scripts-utilidad\start-dev.bat           # Iniciar desarrollo
.\scripts-utilidad\stop-app.bat            # Detener servidor
.\scripts-utilidad\update.bat              # Actualizar dependencias
.\scripts-utilidad\reiniciar-datos-avanzado.bat  # Limpiar datos
```

## 🔐 Variables de Entorno Requeridas

```env
# .env.local
JWT_SECRET=tu-secreto-super-seguro-aqui
LICENSE_KEY=tu-licencia-jwt-generada
COMPANY_NAME=Nombre de tu Empresa
PORT=3000
```

## 📦 Requisitos del Sistema

- **Node.js:** v18 o superior
- **NPM:** v9 o superior
- **Sistema Operativo:** Windows 10/11, Linux, macOS
- **Espacio en Disco:** 500 MB mínimo
- **RAM:** 2 GB mínimo

## 🎯 Características Principales

1. ✅ **Solicitudes de Compra** - Crear y gestionar solicitudes
2. ✅ **Aprobaciones Multi-nivel** - Flujo de aprobación configurable
3. ✅ **Proveedores** - Gestión completa de proveedores
4. ✅ **Facturas** - Registro y seguimiento de facturas
5. ✅ **Comparador de Precios** - Análisis de precios
6. ✅ **Dashboard** - Estadísticas en tiempo real
7. ✅ **Reportes** - Excel y PDF personalizados
8. ✅ **Super Admin** - 8+ módulos de administración avanzada

## 🔑 Roles de Usuario

- **Super Admin** - Acceso completo al sistema
- **Admin** - Gestión de usuarios, solicitudes y configuración
- **Coordinador** - Asignación de aprobadores
- **Aprobador** - Aprobar/rechazar solicitudes
- **Solicitante** - Crear solicitudes de compra
- **Invitado** - Solo lectura

## 📚 Documentación

- **Estructura del Proyecto:** `ESTRUCTURA_PROYECTO.md`
- **Manuales de Usuario:** `/manuales`
- **Documentación Técnica:** `/documentacion`
- **README Principal:** `README.md`

## 🛠️ Solución de Problemas

### Error: Puerto 3000 en uso
```bash
.\scripts-utilidad\stop-app.bat
npm run dev
```

### Error: Base de datos corrupta
```bash
node init-db.js
```

### Error: Módulos no encontrados
```bash
npm install
```

### Error: Licencia expirada
```bash
# Generar nueva licencia (ver /manuales)
.\archivos-temporales\generar-licencia.bat
```

## 🔄 Actualización del Sistema

```bash
# Backup automático antes de actualizar
.\scripts-utilidad\update.bat
```

## 📞 Soporte

Para soporte técnico:
1. Revisar documentación en `/manuales`
2. Revisar `/documentacion` para detalles técnicos
3. Revisar logs de auditoría en Super Admin panel

## ⚠️ Importante

- **NO COMPARTIR** el archivo `.env.local`
- Mantener backups regulares en `/backups`
- Revisar logs de auditoría periódicamente
- Actualizar licencia antes de expiración

## 🎨 Personalización

Para personalizar colores, logos y configuración:
1. Acceder como Admin
2. Ir a **Configuración**
3. Modificar: Nombre empresa, logo, colores

## 🚀 Puesta en Producción

```bash
# 1. Compilar
npm run build

# 2. Iniciar en producción
npm start

# 3. (Opcional) Usar PM2
npm install -g pm2
pm2 start npm --name "solicitud-compras" -- start
```

## 📊 Base de Datos

- **Motor:** SQLite
- **Archivo:** `database.db`
- **Backups:** `/backups` (automáticos)
- **Migración:** Ejecutar `init-db.js`

## 🔐 Seguridad

- ✅ Autenticación JWT
- ✅ Passwords hasheados (bcrypt)
- ✅ Validación de sesiones
- ✅ Sistema de licencias
- ✅ Logs de auditoría
- ✅ Control de permisos por rol

---

**¿Listo para empezar?** Ejecuta `.\scripts-utilidad\primera-instalacion.bat` y sigue las instrucciones en pantalla.
