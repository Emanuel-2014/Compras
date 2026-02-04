# 📋 Guía de Copia a USB para Instalación en Otro PC

## ❌ NO COPIAR (Archivos Innecesarios)

Estas carpetas/archivos se regeneran automáticamente y NO debes copiarlos:

### 1. **node_modules/** (MUY IMPORTANTE)
   - ❌ NO COPIAR - Pesa cientos de MB
   - Se reinstala automáticamente con `npm install`

### 2. **.next/**
   - ❌ NO COPIAR - Archivos compilados temporales
   - Se regenera con `npm run build` o `npm run dev`

### 3. **database.db, database.db-shm, database.db-wal**
   - ❌ NO COPIAR - Base de datos local con datos de prueba
   - Se crea nueva con `primera-instalacion.bat`

### 4. **uploads/**
   - ❌ NO COPIAR - Archivos subidos por usuarios
   - Se crea automáticamente vacía

### 5. **backups/**
   - ❌ NO COPIAR - Respaldos de base de datos local
   - No necesarios en instalación nueva

### 6. **archivos-temporales/**
   - ❌ NO COPIAR - Scripts de prueba y desarrollo
   - No necesarios para instalación

### 7. **scripts-backup/**
   - ❌ NO COPIAR - Respaldos de scripts antiguos
   - No necesarios para instalación

### 8. **.env.local**
   - ⚠️ CUIDADO - Contiene JWT_SECRET y configuración
   - Opcional: puedes copiar si quieres mantener la misma configuración
   - O mejor: crea uno nuevo en el otro PC

### 9. **.genaiscript/** y **.vscode/**
   - ❌ NO COPIAR - Configuraciones del editor
   - Opcionales, no necesarias para la aplicación

---

## ✅ SÍ COPIAR (Archivos Esenciales)

### Archivos de Configuración:
- ✅ **package.json** - Dependencias y scripts
- ✅ **package-lock.json** - Versiones exactas de dependencias
- ✅ **next.config.mjs** - Configuración de Next.js
- ✅ **jsconfig.json** - Configuración de JavaScript
- ✅ **proxy.js** - Middleware de Next.js

### Código de la Aplicación:
- ✅ **app/** - Toda la aplicación Next.js
- ✅ **components/** - Componentes React
- ✅ **hooks/** - Custom hooks
- ✅ **lib/** - Librerías y utilidades
- ✅ **public/** - Archivos estáticos (excepto uploads)

### Scripts de Instalación:
- ✅ **primera-instalacion.bat** - Instalación inicial
- ✅ **iniciar-aplicacion.bat** - Iniciar la aplicación
- ✅ **init-db.js** - Inicializar base de datos

### Documentación:
- ✅ **README.md** - Información del proyecto
- ✅ **PRESENTACION_COMERCIAL.md** - Presentación comercial
- ✅ **CHANGELOG.md** - Historial de versiones
- ✅ **SECURITY.md** - Políticas de seguridad
- ✅ **CONTRIBUTING.md** - Guía de contribución
- ✅ **CODE_OF_CONDUCT.md** - Código de conducta
- ✅ **LICENSE** - Licencia del software
- ✅ **VERSION.md** - Información de versión
- ✅ **ESTRUCTURA_PROYECTO.md** - Estructura del proyecto
- ✅ **INICIO_RAPIDO.md** - Guía de inicio rápido

### Manuales y Utilidades:
- ✅ **manuales/** - Manuales de usuario y técnicos
- ✅ **scripts-utilidad/** - Scripts útiles para mantenimiento
- ✅ **documentacion/** - Documentación adicional

### Archivos Opcionales:
- ✅ **.env.local.example** - Ejemplo de configuración
- ✅ **.gitignore** - Si vas a usar Git
- ✅ **.npmrc** - Configuración de npm

---

## 📦 Resumen del Tamaño

### Sin archivos innecesarios:
```
Carpeta completa:        ~500 MB - 1 GB (con node_modules)
Solo archivos esenciales: ~5-10 MB
```

**Ahorro de espacio: 98%** 🎯

---

## 🚀 Pasos en el Otro PC

Una vez copiados los archivos esenciales:

### 1. Copiar a USB
```
Copia SOLO las carpetas y archivos marcados con ✅
```

### 2. En el Otro PC
```
1. Copia la carpeta completa a una ubicación (ej: C:\Proyectos\)
2. Abre PowerShell como Administrador
3. Navega a la carpeta: cd C:\Proyectos\Solicitud_de_Compras
4. Ejecuta: .\primera-instalacion.bat
```

### 3. El Script Hará Automáticamente:
- ✅ Instalar todas las dependencias (node_modules)
- ✅ Crear la base de datos vacía
- ✅ Configurar el entorno
- ✅ Compilar la aplicación
- ✅ Iniciar el servidor

---

## ⚡ Método Rápido de Copia

### Opción 1: Copia Manual (Recomendado)
Crea una carpeta nueva y copia SOLO los archivos ✅

### Opción 2: Comando PowerShell
```powershell
# Crear carpeta limpia
$destino = "D:\USB\Solicitud_de_Compras_Limpio"
New-Item -ItemType Directory -Path $destino -Force

# Copiar archivos esenciales
$incluir = @(
    "app",
    "components",
    "hooks",
    "lib",
    "public",
    "manuales",
    "scripts-utilidad",
    "documentacion",
    "*.json",
    "*.js",
    "*.mjs",
    "*.md",
    "*.bat",
    ".env.local.example"
)

foreach ($item in $incluir) {
    Copy-Item -Path ".\$item" -Destination $destino -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "✅ Copia limpia completada en: $destino"
```

---

## 📊 Checklist Final

Antes de copiar a USB, verifica que tienes:

- [ ] package.json y package-lock.json
- [ ] Carpeta app/ completa
- [ ] Carpeta components/ completa
- [ ] Carpeta lib/ completa
- [ ] primera-instalacion.bat
- [ ] init-db.js
- [ ] README.md
- [ ] proxy.js
- [ ] next.config.mjs

**Si tienes estos archivos, tienes todo lo necesario** ✅

---

## 🎯 Tamaño Final Aproximado

| Carpeta/Archivo | Tamaño |
|-----------------|--------|
| app/ | ~2 MB |
| components/ | ~500 KB |
| lib/ | ~200 KB |
| public/ | ~500 KB |
| manuales/ | ~100 KB |
| documentacion/ | ~200 KB |
| Archivos raíz | ~50 KB |
| **TOTAL** | **~3.5 MB** |

---

## 💡 Notas Importantes

1. **Node.js 18+** debe estar instalado en el otro PC
2. **No necesitas copiar node_modules** (se reinstala automáticamente)
3. La **base de datos se crea nueva** en la primera instalación
4. **Credenciales por defecto** después de instalación:
   - Usuario: `superadmin`
   - Contraseña: `admin123`

---

**¡Listo para copiar! La carpeta será mucho más liviana sin archivos innecesarios** 🚀
