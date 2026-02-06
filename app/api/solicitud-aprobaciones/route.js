import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import pool from '@/lib/db';

export async function POST(request) {
  const session = await getSession();
  const rolLower = session?.rol?.toLowerCase();
  if (!session || (rolLower !== 'aprobador' && rolLower !== 'administrador')) {
    return new NextResponse(JSON.stringify({ message: 'No autorizado' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { aprobacionId, action, comentario: comentarioRaw } = await request.json();
    const comentario = comentarioRaw ? comentarioRaw.toUpperCase() : comentarioRaw;

    if (!aprobacionId || !action || (action === 'rechazar' && !comentario)) {
      return NextResponse.json({ message: 'Faltan datos requeridos.' }, { status: 400 });
    }

    await pool.query('BEGIN');
    // 1. Verificar que la aprobación existe y está pendiente
    const aprobacionRes = await pool.query('SELECT * FROM solicitud_aprobaciones WHERE id = $1 AND estado = $2', [aprobacionId, 'pendiente']);
    const aprobacion = aprobacionRes.rows[0];
    if (!aprobacion) {
      await pool.query('ROLLBACK');
      throw new Error('Aprobación no encontrada o ya procesada.');
    }

    // 2. Verificar autorización según el rol
    if (rolLower === 'aprobador') {
      const verificacionRes = await pool.query(`
        SELECT COUNT(*) as count
        FROM solicitudes s
        JOIN usuarios u ON s.id_usuario = u.id
        JOIN aprobador_dependencias ad ON ad.dependencia_id = u.dependencia_id
        WHERE s.solicitud_id = $1 AND ad.usuario_id = $2
      `, [aprobacion.solicitud_id, session.id]);
      if (!verificacionRes.rows[0] || verificacionRes.rows[0].count === 0) {
        await pool.query('ROLLBACK');
        throw new Error('No tiene autorización para aprobar esta solicitud. Solo los aprobadores de la dependencia del solicitante pueden aprobar.');
      }
    }

    const fechaDecision = new Date().toISOString();
    let nuevoEstadoSolicitud;
    const estadoAprobacion = rolLower === 'aprobador' ? 'autorizado' : 'aprobado';

    if (action === 'aprobar') {
      await pool.query(
        'UPDATE solicitud_aprobaciones SET estado = $1, fecha_decision = $2, comentario = $3, aprobador_id = $4 WHERE id = $5',
        [estadoAprobacion, fechaDecision, null, session.id, aprobacionId]
      );
      await pool.query(
        `UPDATE solicitud_aprobaciones SET estado = $1, fecha_decision = $2, comentario = 'APROBADO POR OTRO USUARIO DEL MISMO NIVEL' WHERE solicitud_id = $3 AND orden = $4 AND estado = 'pendiente' AND id != $5`,
        ['omitido', fechaDecision, aprobacion.solicitud_id, aprobacion.orden, aprobacionId]
      );
      const siguienteAprobacionRes = await pool.query(
        `SELECT * FROM solicitud_aprobaciones WHERE solicitud_id = $1 AND orden > $2 AND estado = 'pendiente' ORDER BY orden ASC LIMIT 1`,
        [aprobacion.solicitud_id, aprobacion.orden]
      );
      if (siguienteAprobacionRes.rows[0]) {
        nuevoEstadoSolicitud = 'PENDIENTE_APROBACION';
      } else {
        nuevoEstadoSolicitud = 'APROBADA';
      }
      await pool.query(
        'UPDATE solicitudes SET estado = $1, rechazo_comentario = NULL WHERE solicitud_id = $2',
        [nuevoEstadoSolicitud, aprobacion.solicitud_id]
      );
    } else { // rechazar
      await pool.query(
        'UPDATE solicitud_aprobaciones SET estado = $1, fecha_decision = $2, comentario = $3, aprobador_id = $4 WHERE id = $5',
        ['rechazado', fechaDecision, comentario, session.id, aprobacionId]
      );
      nuevoEstadoSolicitud = 'RECHAZADA';
      await pool.query(
        'UPDATE solicitudes SET estado = $1, rechazo_comentario = $2 WHERE solicitud_id = $3',
        [nuevoEstadoSolicitud, comentario, aprobacion.solicitud_id]
      );
      await pool.query(
        'UPDATE solicitud_aprobaciones SET estado = $1, comentario = $2 WHERE solicitud_id = $3 AND estado = $4',
        ['cancelado', 'CANCELADO POR RECHAZO EN ETAPA ANTERIOR', aprobacion.solicitud_id, 'pendiente']
      );
    }
    await pool.query('COMMIT');
    return NextResponse.json({
      message: `Solicitud ${action === 'aprobar' ? 'aprobada' : 'rechazada'} correctamente.`,
      solicitud_id: aprobacion.solicitud_id,
      nuevoEstado: nuevoEstadoSolicitud,
    });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error al procesar la acción del coordinador:', error);
    return NextResponse.json({ message: error.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
