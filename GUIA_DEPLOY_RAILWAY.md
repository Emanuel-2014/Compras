# Railway Deployment Guide

1. Ve a https://railway.app y entra a tu proyecto.
2. Haz clic en el botón "+ New" y selecciona "Deploy from GitHub repo" o "Deploy from template".
3. Si tu proyecto está en GitHub, conéctalo. Si no, sube tu código a un repositorio de GitHub primero.
4. Railway detectará automáticamente tu proyecto Next.js/Node.js.
5. En la sección de variables, agrega todas las variables de tu archivo .env (DATABASE_URL, JWT_SECRET, etc.) usando los valores que ya tienes.
6. Haz clic en "Deploy" y espera a que termine el despliegue.
7. Cuando termine, Railway te dará una URL pública para tu app.
8. Tu app ya estará conectada a la base de datos Railway y funcionando en la nube.

## Notas
- Si necesitas ayuda para subir tu código a GitHub, avísame y te guío paso a paso.
- Si tu app necesita comandos especiales para build/start, agrégalos en el panel de Railway.
- Puedes ver logs y errores en la pestaña "Deployments" de Railway.
