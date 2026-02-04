import { NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import path from 'path';
import db from '@/lib/db';
import { verifySessionToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function DELETE(request, { params }) {
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

    const { id } = params;

    if (!id) {
      return NextResponse.json({ message: 'Falta el ID de la factura.' }, { status: 400 });
    }

    // 1. Obtener la información de la factura de la base de datos
    const facturaStmt = db.prepare('SELECT path_archivo FROM facturas WHERE id = ?');
    const factura = facturaStmt.get(id);

    if (!factura) {
      return NextResponse.json({ message: 'Factura no encontrada.' }, { status: 404 });
    }

    // 2. Eliminar el archivo del sistema de archivos
    try {
      await unlink(factura.path_archivo);
      console.log(`Archivo eliminado: ${factura.path_archivo}`);
    } catch (fileError) {
      console.warn(`No se pudo eliminar el archivo ${factura.path_archivo}: ${fileError.message}`);
      // Continuar con la eliminación de la base de datos incluso si el archivo no se encuentra
    }

    // 3. Eliminar la entrada de la base de datos
    const deleteStmt = db.prepare('DELETE FROM facturas WHERE id = ?');
    const result = deleteStmt.run(id);

    if (result.changes === 0) {
      return NextResponse.json({ message: 'Factura no encontrada en la base de datos.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Factura eliminada correctamente.' }, { status: 200 });

  } catch (error) {
    console.error('Error en /api/facturas/[id] DELETE:', error);
    return NextResponse.json({ message: 'Error interno del servidor al eliminar la factura.' }, { status: 500 });
  }
}