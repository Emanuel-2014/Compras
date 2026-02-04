// app/api/solicitudes/items/delete-image/route.js
import { NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import path from 'path';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(request) {
  const session = await getSession();
  // Solo los administradores pueden borrar imágenes
  if (!session || session.rol?.toLowerCase() !== 'administrador') {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  }

  try {
    const { itemId } = await request.json();

    if (!itemId) {
      return NextResponse.json({ message: 'Falta el ID del ítem.' }, { status: 400 });
    }

    // 1. Obtener la ruta de la imagen de la base de datos
    const itemStmt = db.prepare('SELECT ruta_imagen FROM solicitud_items WHERE id = ?');
    const item = itemStmt.get(itemId);

    if (!item || !item.ruta_imagen) {
      return NextResponse.json({ message: 'El ítem no existe o no tiene una imagen asociada.' }, { status: 404 });
    }

    const publicPath = item.ruta_imagen;
    // Construir la ruta completa en el sistema de archivos
    const filePath = path.join(process.cwd(), 'public', publicPath);

    // 2. Actualizar la base de datos para quitar la referencia a la imagen
    const updateStmt = db.prepare('UPDATE solicitud_items SET ruta_imagen = NULL WHERE id = ?');
    const updateResult = updateStmt.run(itemId);

    if (updateResult.changes === 0) {
        // Si no se actualizó ninguna fila, es un problema.
        throw new Error(`No se pudo actualizar el ítem con ID ${itemId} en la base de datos.`);
    }

    // 3. Eliminar el archivo físico del servidor
    try {
      await unlink(filePath);
      console.log(`Imagen eliminada exitosamente: ${filePath}`);
    } catch (fileError) {

      if (fileError.code !== 'ENOENT') {
        throw fileError; // Lanzar otros errores de archivo
      }
      console.warn(`El archivo de imagen no se encontró en la ruta: ${filePath}, pero la referencia en la base de datos fue eliminada.`);
    }

    return NextResponse.json({ message: 'Imagen eliminada correctamente.' }, { status: 200 });

  } catch (error) {
    console.error('Error en /api/solicitudes/items/delete-image POST:', error);
    return NextResponse.json({ message: 'Error interno del servidor al eliminar la imagen.' }, { status: 500 });
  }
}
