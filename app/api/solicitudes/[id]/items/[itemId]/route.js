
// app/api/solicitudes/[id]/items/[itemId]/route.js
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifySessionToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(req, { params }) {
  const { id: solicitudId, itemId } = params;

  try {
    // 1. Autenticación y autorización (simplificada)
    // En un caso real, verificaríamos si el usuario es el solicitante original.
    const cookieStore = cookies();
    const sessionToken = cookieStore.get('session')?.value;
    const user = verifySessionToken(sessionToken);

    if (!user) {
      return NextResponse.json({ message: 'No autorizado.' }, { status: 403 });
    }

    // 2. Obtener datos del cuerpo de la petición
    const { estado_recepcion, comentario_recepcion_usuario, numero_factura } = await req.json();

    // Validación básica
    if (!estado_recepcion) {
      return NextResponse.json({ message: 'El estado de recepción es obligatorio.' }, { status: 400 });
    }

    // 3. Actualizar el item en la base de datos
    const stmt = db.prepare(`
      UPDATE solicitud_items
      SET
        estado_recepcion = ?,
        comentario_recepcion_usuario = ?,
        numero_factura = ?
      WHERE id = ? AND id_solicitud = ?
    `);

    const result = stmt.run(
      estado_recepcion ? estado_recepcion.toUpperCase() : estado_recepcion,
      comentario_recepcion_usuario ? comentario_recepcion_usuario.toUpperCase() : comentario_recepcion_usuario,
      numero_factura ? numero_factura.toUpperCase() : numero_factura,
      estado_recepcion,
      comentario_recepcion_usuario || null,
      numero_factura || null,
      itemId,
      solicitudId
    );

    if (result.changes === 0) {
      return NextResponse.json({ message: 'El item no fue encontrado o no se pudo actualizar.' }, { status: 404 });
    }

    const allItemsReceived = db.prepare(`
        SELECT COUNT(*) as count FROM solicitud_items
        WHERE id_solicitud = ? AND (estado_recepcion IS NULL OR estado_recepcion = 'Pendiente' OR estado_recepcion = 'Incompleto')
    `).get(solicitudId);

    if (allItemsReceived.count === 0) {
        db.prepare(`
            UPDATE solicitudes
            SET estado = 'completada'
            WHERE solicitud_id = ?
        `).run(solicitudId);
    }

    return NextResponse.json({ message: 'Item actualizado correctamente.' }, { status: 200 });

  } catch (error) {
    console.error(`Error al actualizar el item ${itemId}:`, error);
    return NextResponse.json(
      { message: error.message || 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}
