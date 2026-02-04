# Dockerfile para Next.js en Railway/Fly.io
FROM node:20-alpine AS base

# Instalar dependencias solo cuando sea necesario
FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

# Copiar package.json y package-lock.json
COPY package.json package-lock.json* ./
RUN npm ci

# Reconstruir el código fuente solo cuando sea necesario
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Deshabilitar telemetría durante el build
ENV NEXT_TELEMETRY_DISABLED 1

# Build de Next.js
RUN npm run build

# Imagen de producción
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar archivos necesarios
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/init-db.js ./init-db.js
COPY --from=builder /app/start.sh ./start.sh

# Copiar node_modules completo para init-db.js (alternativa más segura)
COPY --from=deps /app/node_modules ./node_modules

# Crear directorio para uploads y base de datos
RUN mkdir -p /app/uploads /app/data && \
    chown -R nextjs:nodejs /app/uploads /app/data && \
    chmod +x /app/start.sh && \
    ls -la /app/

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Inicializar base de datos y arrancar
CMD sh -c "node init-db.js && echo 'Iniciando servidor Next.js...' && node server.js"
