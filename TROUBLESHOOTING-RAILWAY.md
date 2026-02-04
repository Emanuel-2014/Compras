# Troubleshooting - Despliegue en Railway

## Problema: "La aplicación no respondió"

### Causa raíz
El servidor Next.js no se iniciaba porque `init-db.js` no terminaba explícitamente el proceso.

### Solución aplicada
1. Agregado `process.exit(0)` al final de `initDb()` en `init-db.js`
2. Agregado `process.exit(1)` en el catch para errores

### Comando de inicio
```bash
CMD sh -c "node init-db.js && echo 'Iniciando servidor Next.js...' && node server.js"
```

### Verificación
1. Los logs deben mostrar:
   - "Configuración de la base de datos completada."
   - "Conexión a la base de datos cerrada."
   - "init-db.js terminado exitosamente."
   - "Iniciando servidor Next.js..."
   - Mensaje de Next.js indicando el puerto (probablemente " ▲ Next.js 16.1.6")

2. La aplicación debe responder en: https://solicitud-compras-production.up.railway.app

### Si persiste el problema
Revisar logs con:
```bash
railway logs --tail=100
```

### Variables de entorno configuradas
- NODE_ENV=production
- JWT_SECRET=tu_secreto_super_seguro_cambiar_esto_12345
- DATABASE_PATH=/app/data/solicitud_compras.db
- PORT=3000

### Notas
- La base de datos se crea en `/app/data/` (tiene permisos de escritura para usuario `nextjs`)
- El directorio `/app/uploads/` también tiene permisos de escritura
- El contenedor usa Node 20-alpine
- El usuario del contenedor es `nextjs` (no root)
