# Política de Seguridad

## Versiones Soportadas

| Versión | Soportada          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reportar una Vulnerabilidad

Si descubres una vulnerabilidad de seguridad en este proyecto, por favor repórtala de manera responsable:

### Proceso de Reporte

1. **NO** abras un issue público en GitHub
2. Envía un correo detallado al equipo de seguridad
3. Incluye:
   - Descripción detallada de la vulnerabilidad
   - Pasos para reproducir el problema
   - Posible impacto
   - Sugerencias de solución (si las tienes)

### Qué Esperar

- **Confirmación**: Recibirás confirmación de recepción en 24-48 horas
- **Evaluación**: Evaluaremos la vulnerabilidad en 3-5 días hábiles
- **Actualización**: Te mantendremos informado del progreso
- **Resolución**: Trabajaremos en un parche y coordinaremos la divulgación

### Recomendaciones de Seguridad

#### Para Usuarios

1. **Contraseñas**
   - Cambiar contraseñas por defecto inmediatamente
   - Usar contraseñas fuertes (mínimo 12 caracteres)
   - No reutilizar contraseñas

2. **Variables de Entorno**
   - Nunca compartir el archivo `.env.local`
   - Generar JWT_SECRET único y seguro
   - Proteger LICENSE_KEY

3. **Actualizaciones**
   - Mantener el sistema actualizado
   - Revisar el CHANGELOG regularmente
   - Aplicar parches de seguridad inmediatamente

4. **Backups**
   - Realizar backups regulares
   - Almacenar backups en ubicación segura
   - Probar restauración de backups periódicamente

5. **Logs de Auditoría**
   - Revisar logs regularmente
   - Investigar actividad sospechosa
   - Mantener logs por tiempo adecuado

#### Para Administradores

1. **Configuración de Seguridad**
   - Activar protección contra fuerza bruta
   - Configurar límites de intentos fallidos
   - Mantener lista blanca/negra de IPs actualizada

2. **Control de Acceso**
   - Aplicar principio de mínimo privilegio
   - Revisar permisos de usuarios regularmente
   - Desactivar cuentas inactivas

3. **Sesiones**
   - Configurar timeout de sesión apropiado
   - Cerrar sesiones inactivas
   - Monitorear sesiones concurrentes

4. **Base de Datos**
   - Proteger archivo database.db
   - Restringir acceso físico al servidor
   - Encriptar backups sensibles

#### Para Desarrolladores

1. **Código**
   - Validar todos los inputs del usuario
   - Sanitizar datos antes de queries
   - Usar prepared statements (ya implementado)
   - No exponer información sensible en errores

2. **Dependencias**
   - Mantener dependencias actualizadas
   - Ejecutar `npm audit` regularmente
   - Revisar vulnerabilidades conocidas

3. **API**
   - Validar autenticación en todos los endpoints
   - Implementar rate limiting
   - Validar permisos por rol

## Características de Seguridad Implementadas

✅ **Autenticación**
- JWT con tokens seguros
- Passwords hasheados con bcrypt
- Validación de sesiones

✅ **Autorización**
- Control basado en roles
- Verificación de permisos por endpoint
- Separación de accesos (admin, coordinador, aprobador)

✅ **Protección de Datos**
- Prepared statements para prevenir SQL injection
- Validación de inputs
- Sanitización de datos

✅ **Auditoría**
- Logs completos de actividad
- Tracking de cambios
- Registro de accesos fallidos

✅ **Sesiones**
- Control de sesiones activas
- Timeout configurable
- Cierre automático de sesiones inactivas

✅ **Infraestructura**
- Sistema de licencias
- Protección contra fuerza bruta
- Lista blanca/negra de IPs

## Vulnerabilidades Conocidas

Actualmente no hay vulnerabilidades conocidas de severidad alta o crítica.

Para ver vulnerabilidades de dependencias:
```bash
npm audit
```

## Actualizaciones de Seguridad

Las actualizaciones de seguridad se publican en este formato:

**[SECURITY-YYYY-MM-DD] Título de la vulnerabilidad**
- **Severidad**: Baja/Media/Alta/Crítica
- **Componente afectado**: Descripción
- **Versiones afectadas**: X.X.X
- **Solución**: Actualizar a versión X.X.X

---

**Última revisión**: Febrero 2026

Para más información sobre seguridad, consultar la documentación técnica en `/documentacion/RESUMEN_SEGURIDAD.md`
