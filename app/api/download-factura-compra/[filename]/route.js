import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import fs from 'fs';
import path from 'path';
export async function GET(request, { params }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  const { filename } = params;

  if (!filename) {
    return NextResponse.json({ message: 'El nombre del archivo es obligatorio.' }, { status: 400 });
  }

  try {
    const factura = db.prepare(`
        SELECT archivo_path 
        FROM facturas_compras 
        WHERE archivo_path = ?
    `).get(filename);

    if (!factura) {
        return NextResponse.json({ message: 'Archivo no encontrado en la base de datos.' }, { status: 404 });
    }
    
    const uploadsDir = path.resolve(process.cwd(), 'uploads');
    const filePath = path.join(uploadsDir, filename);

    if (!fs.existsSync(filePath)) {
      console.error(`File not found at path: ${filePath}`);
      return NextResponse.json({ message: 'El archivo no se encuentra en el servidor.' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    
    // Default to PDF for viewing, browser can often handle images anyway.
    const mimeType = 'application/pdf'; 

    const headers = new Headers();
    headers.append('Content-Type', mimeType);
    headers.append('Content-Disposition', `inline; filename="${filename}"`);

    return new NextResponse(fileBuffer, { status: 200, headers });

  } catch (error) {
    console.error('Error en /api/download-factura-compra GET:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}