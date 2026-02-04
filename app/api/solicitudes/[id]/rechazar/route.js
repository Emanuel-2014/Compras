
// app/api/solicitudes/[id]/rechazar/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth';
import db from '@/lib/db';

export async function POST(req, { params }) {
  const { id } = await params; // id de la solicitud

  try {
    // 1. Obtener el comentario del cuerpo de la solicitud
    const { comentario } = await req.json();
    if (!comentario) {
      return NextResponse.json({ message: 'El comentario es obligatorio para rechazar.' }, { status: 400 });
    }
    const upperComentario = comentario.toUpperCase();

    // 2. Autenticación y autorización
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    if (!sessionToken) {
      return NextResponse.json({ message: 'No hay sesión activa.' }, { status: 401 });
    }
    const user = verifySessionToken(sessionToken);

    if (!user || (user.rol?.toLowerCase() !== 'aprobador' && user.rol?.toLowerCase() !== 'administrador')) {
      return NextResponse.json({ message: 'No autorizado para rechazar.' }, { status: 403 });
    }

    // 3. Lógica de rechazo en una transacción
    const transaction = db.transaction(() => {
      if (user.rol?.toLowerCase() === 'administrador') {
        // Admin Override: Reject the whole request
        const result = db.prepare(
          'UPDATE solicitudes SET estado = \'rechazada\', rechazo_comentario = ? WHERE solicitud_id = ?'
        ).run(upperComentario, id);

        if (result.changes === 0) {
          throw new Error('La solicitud no fue encontrada.');
        }

      } else { // User is 'aprobador'
        const aprobacionStmt = db.prepare (
          `SELECT id FROM solicitud_aprobaciones WHERE solicitud_id = ? AND aprobador_id = ? AND estado = 'pendiente'`
        );
        const aprobacion = aprobacionStmt.get(id, user.id);

        if (!aprobacion) {
          throw new Error('No tiene permiso para rechazar esta solicitud o ya ha sido procesada.');
        }

        // Update their specific approval to 'rechazado'
        db.prepare (`
          UPDATE solicitud_aprobaciones
          SET estado = 'rechazado', fecha_decision = datetime('now'), comentario = ?
          WHERE id = ?
        `).run(upperComentario, aprobacion.id);

        // Update the main request to 'rechazada'
        db.prepare(
          'UPDATE solicitudes SET estado = \'rechazada\', rechazo_comentario = ? WHERE solicitud_id = ?'
        ).run(upperComentario, id);
      }
    });

    transaction();

    return NextResponse.json(
      { message: `Solicitud ${id} ha sido rechazada.` },
      { status: 200 }
    );

  } catch (error) {
    console.error(`Error al rechazar la solicitud ${id}:`, error);
    return NextResponse.json(
      { message: error.message || 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}
