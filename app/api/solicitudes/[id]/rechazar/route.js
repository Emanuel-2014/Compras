
// app/api/solicitudes/[id]/rechazar/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth';
import pool from '@/lib/db';

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

    // 3. Lógica de rechazo en una transacción PostgreSQL
    await pool.query('BEGIN');
    try {
      if (user.rol?.toLowerCase() === 'administrador') {
        const result = await pool.query(
          'UPDATE solicitudes SET estado = $1, rechazo_comentario = $2 WHERE solicitud_id = $3',
          ['rechazada', upperComentario, id]
        );
        if (result.rowCount === 0) {
          await pool.query('ROLLBACK');
          throw new Error('La solicitud no fue encontrada.');
        }
      } else {
        const aprobacionRes = await pool.query(
          'SELECT id FROM solicitud_aprobaciones WHERE solicitud_id = $1 AND aprobador_id = $2 AND estado = $3',
          [id, user.id, 'pendiente']
        );
        const aprobacion = aprobacionRes.rows[0];
        if (!aprobacion) {
          await pool.query('ROLLBACK');
          throw new Error('No tiene permiso para rechazar esta solicitud o ya ha sido procesada.');
        }
        await pool.query(
          `UPDATE solicitud_aprobaciones SET estado = $1, fecha_decision = CURRENT_TIMESTAMP, comentario = $2 WHERE id = $3`,
          ['rechazado', upperComentario, aprobacion.id]
        );
        await pool.query(
          'UPDATE solicitudes SET estado = $1, rechazo_comentario = $2 WHERE solicitud_id = $3',
          ['rechazada', upperComentario, id]
        );
      }
      await pool.query('COMMIT');
      return NextResponse.json(
        { message: `Solicitud ${id} ha sido rechazada.` },
        { status: 200 }
      );
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error(`Error al rechazar la solicitud ${id}:`, error);
    return NextResponse.json(
      { message: error.message || 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}
