import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifySessionToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import fs from 'fs';
import path from 'path';

export async function GET(request, { params }) {
  try {
    const sessionCookie = (await cookies()).get('session');
    if (!sessionCookie) {
      return NextResponse.json({ message: 'No hay sesión activa.' }, { status: 401 });
    }

    const user = verifySessionToken(sessionCookie.value);
    if (!user) {
      return NextResponse.json({ message: 'Sesión inválida.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json({ message: 'El nombre del archivo es obligatorio.' }, { status: 400 });
    }

    // Find the invoice file by its saved name
    const facturaInfo = db.prepare(`
      SELECT
        path_archivo,
        nombre_archivo_original,
        mimetype
      FROM facturas
      WHERE nombre_archivo_guardado = ?
    `).get(filename);

    if (!facturaInfo) {
      return NextResponse.json({ message: 'No se encontró la factura con el nombre de archivo especificado.' }, { status: 404 });
    }

    const filePath = path.resolve(facturaInfo.path_archivo);

    if (!fs.existsSync(filePath)) {
      console.error(`File not found at path: ${filePath}`);
      return NextResponse.json({ message: 'El archivo de la factura no se encuentra en el servidor.' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);

    const headers = new Headers();
    headers.append('Content-Type', facturaInfo.mimetype);
    headers.append('Content-Disposition', `attachment; filename="${facturaInfo.nombre_archivo_original}"`);

    return new NextResponse(fileBuffer, { status: 200, headers });

  } catch (error) {
    console.error('Error en /api/download-factura GET:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}