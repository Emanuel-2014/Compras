# 📁 Estructura del Proyecto - Sistema de Solicitud de Compras

## 📂 Carpetas Principales

### `/app`
Aplicación Next.js con App Router
- `(auth)/` - Páginas de autenticación
- `(main)/` - Páginas principales protegidas
  - `admin/` - Panel de administración
  - `super-admin/` - Panel de super administrador
- `api/` - Endpoints de la API
- `components/` - Componentes específicos de páginas
- `context/` - Contextos de React

### `/components`
Componentes reutilizables de la aplicación
- `AppNavbar.js` - Barra de navegación principal
- `LoginPage.js` - Página de login
- `PrintableSolicitud.js` - Formato imprimible
- Modales y componentes UI

### `/hooks`
React Hooks personalizados
- `useSession.js` - Gestión de sesiones
- `useThemeColors.js` - Temas y colores

### `/lib`
Librerías y utilidades del servidor
- `auth.js` - Autenticación JWT
- `db.js` - Conexión a SQLite
- `reports.js` - Generación de reportes
- `excelUtilsServer.js` - Utilidades Excel

### `/public`
Archivos públicos estáticos
- `/uploads` - Archivos subidos (facturas, imágenes)

### `/manuales`
Manuales de usuario y documentación

### `/backups`
Respaldos automáticos de la base de datos

### `/scripts-utilidad`
Scripts de utilidad y mantenimiento
- Instalación inicial
- Configuración de entorno
- Actualización del sistema
- Limpieza de datos

### `/archivos-temporales`
Archivos de desarrollo y scripts temporales

### `/documentacion`
Documentación técnica del sistema
- Auditoría
- Seguridad
- Backup
- Super Admin

## 📄 Archivos Raíz

### Configuración
- `next.config.mjs` - Configuración de Next.js
- `jsconfig.json` - Configuración de JavaScript
- `package.json` - Dependencias y scripts
- `.env.local` - Variables de entorno (NO COMPARTIR)
- `.env.local.example` - Ejemplo de variables de entorno
- `.gitignore` - Archivos ignorados por Git

### Base de Datos
- `database.db` - Base de datos SQLite principal
- `database.db-shm` / `database.db-wal` - Archivos de SQLite

### Middleware
- `proxy.js` - Middleware de Next.js (validación de licencia y sesiones)

### Inicialización
- `init-db.js` - Script de inicialización de la base de datos

### Documentación
- `README.md` - Documentación principal del proyecto

## 🚀 Scripts Disponibles

```bash
npm run dev      # Iniciar servidor de desarrollo
npm run build    # Compilar para producción
npm start        # Iniciar en modo producción
```

## 🔐 Seguridad

- ✅ Autenticación JWT
- ✅ Validación de licencia
- ✅ Control de sesiones activas
- ✅ Roles y permisos
- ✅ Logs de auditoría

## 📦 Tecnologías

- **Framework:** Next.js 16.1.6 (Turbopack)
- **UI:** React 19.1.0 + Bootstrap 5
- **Base de Datos:** SQLite (better-sqlite3)
- **Autenticación:** JWT + bcryptjs
- **Reportes:** ExcelJS, jsPDF, html2canvas
- **Gráficos:** Chart.js + React-ChartJS-2

## 🎨 Características

1. **Gestión de Solicitudes de Compra**
2. **Flujo de Aprobaciones Multi-nivel**
3. **Gestión de Proveedores**
4. **Registro de Facturas**
5. **Comparador de Precios**
6. **Dashboard con Estadísticas**
7. **AI Insights (Análisis Kraljic)**
8. **Reportes Avanzados**
9. **Super Admin Panel (8+ módulos)**
10. **Sistema de Licencias**

## 📱 Usuarios por Defecto

Ver `init-db.js` para credenciales iniciales.

## 🔧 Mantenimiento

Para mantenimiento del sistema, consultar los scripts en `/scripts-utilidad`:
- `primera-instalacion.bat` - Primera instalación
- `start-dev.bat` - Iniciar desarrollo
- `update.bat` - Actualizar dependencias
- `configurar-env.bat` - Configurar variables de entorno

## 📞 Soporte

Para soporte técnico, consultar los manuales en `/manuales`.
