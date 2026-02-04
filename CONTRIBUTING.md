# Contribuyendo al Proyecto

¡Gracias por tu interés en contribuir al sistema de gestión de solicitudes de compra!

## 📋 Tabla de Contenidos

- [Código de Conducta](#código-de-conducta)
- [¿Cómo Puedo Contribuir?](#cómo-puedo-contribuir)
- [Guías de Estilo](#guías-de-estilo)
- [Proceso de Pull Request](#proceso-de-pull-request)
- [Reportar Bugs](#reportar-bugs)
- [Sugerir Mejoras](#sugerir-mejoras)

## Código de Conducta

Este proyecto adhiere a un [Código de Conducta](CODE_OF_CONDUCT.md). Al participar, se espera que mantengas este código.

## ¿Cómo Puedo Contribuir?

### Reportar Bugs

Antes de crear un reporte de bug:
- Verifica que el bug no haya sido reportado previamente
- Determina en qué versión ocurre el problema
- Recopila información detallada sobre el bug

**Incluye en tu reporte:**
- Título descriptivo
- Pasos exactos para reproducir
- Comportamiento esperado vs actual
- Capturas de pantalla (si aplica)
- Versión del software
- Sistema operativo
- Navegador (si aplica)

### Sugerir Mejoras

Las sugerencias de mejoras son bienvenidas. Incluye:
- Descripción clara de la mejora
- Razón por la cual sería útil
- Ejemplos de uso
- Posible implementación

### Pull Requests

1. **Fork** el repositorio
2. Crea una **rama** para tu feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. **Push** a la rama (`git push origin feature/AmazingFeature`)
5. Abre un **Pull Request**

#### Antes de Enviar

- [ ] El código sigue las guías de estilo del proyecto
- [ ] Has ejecutado las pruebas localmente
- [ ] Has añadido pruebas para tu código (si aplica)
- [ ] La documentación está actualizada
- [ ] Los commits tienen mensajes descriptivos

## Guías de Estilo

### Código JavaScript/React

```javascript
// ✅ Bueno
const handleSubmit = async (formData) => {
  try {
    const response = await fetch('/api/solicitudes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    if (!response.ok) {
      throw new Error('Error al crear solicitud');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

// ❌ Malo
const handleSubmit = async (formData) => {
  const response = await fetch('/api/solicitudes', {
    method: 'POST',
    body: JSON.stringify(formData)
  })
  return await response.json()
}
```

### Estilo de Código

- **Indentación**: 2 espacios
- **Comillas**: Simples (`'`) para strings
- **Punto y coma**: Siempre incluir
- **Nombres**: camelCase para variables/funciones, PascalCase para componentes
- **Imports**: Agrupar por tipo (React, librerías externas, componentes locales)

### Componentes React

```javascript
// ✅ Estructura recomendada
import React, { useState, useEffect } from 'react';
import { Container, Button } from 'react-bootstrap';
import { useSession } from '@/hooks/useSession';

export default function MiComponente() {
  // 1. Hooks de estado
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // 2. Hooks de contexto/custom
  const { session } = useSession();
  
  // 3. useEffect
  useEffect(() => {
    fetchData();
  }, []);
  
  // 4. Funciones
  const fetchData = async () => {
    // implementación
  };
  
  // 5. Handlers
  const handleClick = () => {
    // implementación
  };
  
  // 6. Renders condicionales
  if (loading) return <div>Cargando...</div>;
  
  // 7. Return principal
  return (
    <Container>
      {/* JSX */}
    </Container>
  );
}
```

### API Routes

```javascript
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(request) {
  try {
    // 1. Autenticación
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    
    // 2. Validación de permisos
    if (session.rol !== 'administrador') {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }
    
    // 3. Lógica de negocio
    const data = db.prepare('SELECT * FROM tabla').all();
    
    // 4. Respuesta
    return NextResponse.json({ data });
    
  } catch (error) {
    console.error('Error en GET:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
```

### Commits

Formato de mensajes de commit:

```
tipo(alcance): descripción breve

Descripción detallada (opcional)

Closes #123
```

**Tipos:**
- `feat`: Nueva característica
- `fix`: Corrección de bug
- `docs`: Cambios en documentación
- `style`: Cambios de formato (no afectan código)
- `refactor`: Refactorización de código
- `test`: Añadir o modificar tests
- `chore`: Tareas de mantenimiento

**Ejemplos:**
```
feat(solicitudes): añadir filtro por fecha
fix(auth): corregir validación de token
docs(readme): actualizar guía de instalación
```

### SQL

```javascript
// ✅ Usar prepared statements
const stmt = db.prepare('SELECT * FROM solicitudes WHERE id = ?');
const solicitud = stmt.get(id);

// ❌ Nunca concatenar strings
const query = `SELECT * FROM solicitudes WHERE id = ${id}`; // SQL Injection!
```

### Manejo de Errores

```javascript
// ✅ Siempre manejar errores
try {
  const result = await operacionRiesgosa();
  return result;
} catch (error) {
  console.error('Error descriptivo:', error);
  // Manejar error apropiadamente
  throw new Error('Mensaje amigable para el usuario');
}

// ✅ En API routes
catch (error) {
  console.error('Error en operación:', error);
  return NextResponse.json(
    { error: 'Mensaje descriptivo' },
    { status: 500 }
  );
}
```

## Estructura de Archivos

Al añadir nuevos archivos, sigue la estructura existente:

```
app/
├── (main)/
│   └── modulo/
│       ├── page.js           # Página principal
│       └── page.module.css   # Estilos específicos
├── api/
│   └── endpoint/
│       └── route.js          # API endpoint
components/
└── NombreComponente.js       # Componente reutilizable
lib/
└── utilidad.js               # Funciones de utilidad
```

## Testing

Si añades nuevas características, incluye tests:

```javascript
// Ejemplo de test (estructura sugerida)
describe('MiComponente', () => {
  it('debe renderizar correctamente', () => {
    // test
  });
  
  it('debe manejar click del usuario', () => {
    // test
  });
});
```

## Documentación

- Documenta funciones complejas con JSDoc
- Actualiza README.md si añades características
- Añade comentarios explicativos en lógica compleja
- Actualiza CHANGELOG.md

```javascript
/**
 * Calcula el total de una solicitud sumando todos sus items
 * @param {Array} items - Array de items de la solicitud
 * @returns {number} Total calculado
 */
function calcularTotal(items) {
  return items.reduce((sum, item) => sum + item.total, 0);
}
```

## Preguntas

Si tienes preguntas sobre cómo contribuir, contacta al equipo del proyecto.

---

**¡Gracias por contribuir! 🎉**
