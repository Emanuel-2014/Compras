// app/api/download-factura/[filename]/route.js
import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import db from '@/lib/db';

export async function GET(request, { params }) {
  const { filename } = params;

  if (!filename) {
    return NextResponse.json({ message: 'Nombre de archivo no proporcionado.' }, { status: 400 });
  }

  try {
    // Por seguridad, busca la metadata del archivo en la DB antes de servirlo
    const stmt = db.prepare('SELECT nombre_archivo_original, path_archivo, mimetype FROM facturas WHERE nombre_archivo_guardado = ?');
    const fileInfo = stmt.get(filename);

    if (!fileInfo) {
      return NextResponse.json({ message: 'Archivo no encontrado o acceso denegado.' }, { status: 404 });
    }

    // Validar que el path no intente salir del directorio de uploads (path traversal)
    const uploadDir = path.join(process.cwd(), 'uploads');
    const safeFilePath = path.join(uploadDir, path.basename(filename)); // basename para aplanar la ruta

    if (safeFilePath !== fileInfo.path_archivo) {
        console.warn(`Intento de Path Traversal bloqueado. Solicitado: ${filename}, Path en DB: ${fileInfo.path_archivo}`);
        return NextResponse.json({ message: 'Acceso denegado.' }, { status: 403 });
    }

    const buffer = await readFile(safeFilePath);

    const headers = new Headers();
    headers.set('Content-Type', fileInfo.mimetype);
    headers.set('Content-Disposition', `inline; filename="${fileInfo.nombre_archivo_original}"`);

    return new NextResponse(buffer, { status: 200, headers });

  } catch (error) {
    console.error(`Error en /api/download-factura GET:`, error);
    if (error.code === 'ENOENT') {
        return NextResponse.json({ message: 'El archivo no existe en el servidor.' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
