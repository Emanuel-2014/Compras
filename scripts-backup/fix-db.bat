@echo off
echo Actualizando la base de datos...

echo "Ejecutando add_aprobado_por_column.js..."
node add_aprobado_por_column.js
echo "add_aprobado_por_column.js finalizado."

echo "Ejecutando add_nit_dv_column.js..."
node add_nit_dv_column.js
echo "add_nit_dv_column.js finalizado."

echo "Ejecutando add_rechazo_comentario_column.js..."
node add_rechazo_comentario_column.js
echo "add_rechazo_comentario_column.js finalizado."

echo "Ejecutando add_tipo_column.js..."
node add_tipo_column.js
echo "add_tipo_column.js finalizado."

echo "Ejecutando add-image-column.js..."
node add-image-column.js
echo "add-image-column.js finalizado."

echo "Ejecutando add-indexes.js..."
node add-indexes.js
echo "add-indexes.js finalizado."

echo "Ejecutando add_firma_path_column.js..."
node add_firma_path_column.js
echo "add_firma_path_column.js finalizado."

echo "Base de datos actualizada."
