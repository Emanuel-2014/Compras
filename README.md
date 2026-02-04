# 🐔 Sistema de Gestión Pollos al Día

Sistema de gestión de solicitudes, aprobaciones, facturas y compras desarrollado con Next.js 15.

## 🚀 Inicio Rápido

### Requisitos Previos
- Node.js 22.20.0 o superior
- SQLite3

### Instalación

```bash
# Instalar dependencias
npm install

# Inicializar la base de datos (primera vez)
node init-db.js

# Modo desarrollo
npm run dev

# Modo producción
npm run build
npm start
```

Abrir [http://localhost:3000](http://localhost:3000) en el navegador.

## 📁 Estructura del Proyecto

```
pollos-al-dia-app/
├── app/                    # Aplicación Next.js (App Router)
│   ├── (auth)/            # Páginas de autenticación
│   ├── (main)/            # Páginas principales
│   ├── api/               # API Routes
│   └── components/        # Componentes de la app
├── components/            # Componentes globales
├── lib/                   # Librerías y utilidades
├── hooks/                 # Custom React Hooks
├── manuales/             # 📚 Manuales e instrucciones
├── scripts-utilidad/     # 🔧 Scripts de mantenimiento
├── public/               # Archivos estáticos
├── uploads/              # Archivos subidos (facturas, imágenes)
└── database.db          # Base de datos SQLite

```

## 📚 Documentación

- Ver carpeta `/manuales` para guías detalladas
- Instrucciones de instalación y configuración
- Solución de problemas comunes

## 🔧 Scripts de Utilidad

Los scripts de mantenimiento y corrección de datos están en `/scripts-utilidad`. Ver su README para más información.

## 🎨 Tecnologías

- **Next.js 15.5.9** - Framework React
- **React 19** - Biblioteca de UI
- **React Bootstrap** - Componentes UI
- **SQLite** - Base de datos
- **Chart.js** - Gráficos
- **SweetAlert2** - Alertas elegantes
- **ExcelJS** - Exportación a Excel

## 🔒 Seguridad

- Autenticación basada en JWT
- Middleware de protección de rutas
- Roles: Administrador, Coordinador, Aprobador, Usuario

## 📊 Características

- ✅ Gestión de solicitudes de compra
- ✅ Sistema de aprobaciones multinivel
- ✅ Registro y seguimiento de facturas
- ✅ Dashboard con estadísticas
- ✅ Reportes exportables a Excel
- ✅ Gestión de proveedores
- ✅ Plantillas de solicitudes
- ✅ Sistema de permisos por rol
- ✅ Tema personalizable (colores de empresa)

## 🚦 Scripts Disponibles

```bash
# Desarrollo
npm run dev

# Producción
npm run build
npm start

# Inicializar DB
node init-db.js

# Migrar DB
node migrate-db.js
```

## 🆘 Soporte

Para problemas o preguntas, consultar los manuales en `/manuales` o contactar al administrador del sistema.

---

Desarrollado para **Pollos al Día** 🐔
