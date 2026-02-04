// app/api/upload-factura/route.js
import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import db from '@/lib/db';
import { verifySessionToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie) {
      return NextResponse.json({ message: 'No hay sesión activa.' }, { status: 401 });
    }

    const user = verifySessionToken(sessionCookie.value);
    if (!user || !user.id) {
      return NextResponse.json({ message: 'Sesión inválida.' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('facturaFile');
    const id_solicitud = formData.get('id_solicitud'); // Changed from id_solicitud_item
    const numero_factura = formData.get('numero_factura');
    const fecha_factura = formData.get('fecha_factura');
    const valor_factura = formData.get('valor_factura');

    if (!file || !id_solicitud || !numero_factura || !fecha_factura || !valor_factura) {
      return NextResponse.json({ message: 'Faltan datos requeridos para subir la factura.' }, { status: 400 });
    }

    // 1. Guardar el archivo en el servidor
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Crear un nombre de archivo único para evitar colisiones
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const originalFilename = file.name;
    const fileExtension = path.extname(originalFilename);
    const newFilename = `${path.basename(originalFilename, fileExtension)}-${uniqueSuffix}${fileExtension}`;

    const uploadDir = path.join(process.cwd(), 'uploads');
    const filePath = path.join(uploadDir, newFilename);

    // Asegurarse de que el directorio de subida exista
    await mkdir(uploadDir, { recursive: true });

    await writeFile(filePath, buffer);

    // 2. Guardar la metadata en la base de datos
    const stmt = db.prepare(`
      INSERT INTO facturas
      (id_solicitud, numero_factura, fecha_factura, valor_factura, nombre_archivo_original, nombre_archivo_guardado, path_archivo, mimetype)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(id_solicitud, numero_factura, fecha_factura, valor_factura, originalFilename, newFilename, filePath, file.type);

    return NextResponse.json({
      message: 'Archivo subido y registrado correctamente.',
      fileId: result.lastInsertRowid
    }, { status: 201 });

  } catch (error) {
    console.error('Error en /api/upload-factura POST:', error);
    // Comprobar si el error es por la tabla que no existe
    if (error.message.includes('no such table: facturas')) {
        return NextResponse.json({ message: 'Error del servidor: La tabla \'facturas\' no existe. Asegúrate de haber actualizado la base de datos.' }, { status: 500 });
    }
    return NextResponse.json({ message: 'Error interno del servidor al subir el archivo.' }, { status: 500 });
  }
}
