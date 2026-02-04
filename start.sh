#!/bin/sh
set -e

echo "Iniciando aplicación..."
echo "Paso 1: Inicializando base de datos..."
node init-db.js

echo "Paso 2: Iniciando servidor Next.js..."
node server.js
