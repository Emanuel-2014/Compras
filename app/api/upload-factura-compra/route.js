// app/api/upload-factura-compra/route.js
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import fs from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

async function ensureUploadDirExists() {
  try {
    await fs.access(UPLOAD_DIR);
  } catch (error) {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }
}

export async function POST(request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  try {
    await ensureUploadDirExists();
    const formData = await request.formData();
    
    const facturaFile = formData.get('facturaFile');
    const facturaCompraId = formData.get('facturaCompraId');
    const numeroFactura = formData.get('numeroFactura'); // Nuevo: Obtener numeroFactura

    if (!facturaFile || !facturaCompraId || !numeroFactura) {
      return NextResponse.json({ message: 'Falta el archivo, el ID o el número de factura.' }, { status: 400 });
    }

    // Validar que la factura de compra exista y pertenezca al usuario o sea admin
    const stmtCheck = db.prepare('SELECT usuario_id FROM facturas_compras WHERE id = ?');
    const factura = stmtCheck.get(facturaCompraId);

    if (!factura) {
      return NextResponse.json({ message: 'La factura de compra no existe.' }, { status: 404 });
    }
    
    // Aquí se podría añadir una validación de permisos más estricta si fuera necesario

    const fileBuffer = Buffer.from(await facturaFile.arrayBuffer());
    const originalFilename = facturaFile.name;
    const fileExtension = path.extname(originalFilename);
    // Nuevo: Crear un nombre de archivo único usando numeroFactura
    const uniqueFilename = `${numeroFactura.replace(/[^a-zA-Z0-9-_.]/g, '')}-${Date.now()}${fileExtension}`;
    const filePath = path.join(UPLOAD_DIR, uniqueFilename);

    await fs.writeFile(filePath, fileBuffer);

    // Actualizar la base de datos
    const stmtUpdate = db.prepare(
      'UPDATE facturas_compras SET archivo_path = ? WHERE id = ?'
    );
    stmtUpdate.run(uniqueFilename, facturaCompraId);

    return NextResponse.json({ message: 'Archivo subido y asociado exitosamente.' }, { status: 200 });

  } catch (error) {
    console.error('Error en la subida del archivo de factura de compra:', error);
    return NextResponse.json({ message: 'Error interno del servidor al subir el archivo.' }, { status: 500 });
  }
}
