
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import pool from '@/lib/db';

// Eliminado: ALTER TABLE y métodos SQLite

export async function POST(request, { params }) {
  const session = await getSession();
  if (!session) {
    return new NextResponse(JSON.stringify({ message: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { id } = params;
  const { id: approverId, rol: approverRol } = session;

  try {
    const { comentario } = await request.json();
    const upperComentario = comentario ? comentario.toUpperCase() : comentario;

    await pool.query('BEGIN');
    if (approverRol?.toLowerCase() === 'administrador') {
      const result = await pool.query(
        `UPDATE solicitudes SET estado = 'aprobada', comentario_admin = $1, aprobado_por_usuario_id = $2, fecha_aprobacion = CURRENT_TIMESTAMP WHERE solicitud_id = $3`,
        [`APROBADO POR ADMINISTRADOR: ${upperComentario || ''}`, approverId, id]
      );
      if (result.rowCount === 0) {
        await pool.query('ROLLBACK');
        throw new Error('Solicitud no encontrada o ya aprobada.');
      }
      await pool.query(
        `UPDATE solicitud_aprobaciones SET estado = 'aprobado', comentario = 'Anulado y aprobado por administrador' WHERE solicitud_id = $1 AND estado = 'pendiente'`,
        [id]
      );
      await pool.query('COMMIT');
      return NextResponse.json({ message: 'Solicitud aprobada correctamente.' });
    }

    // Obtener la aprobación actual del usuario
    const userApprovalRes = await pool.query(
      `SELECT * FROM solicitud_aprobaciones WHERE solicitud_id = $1 AND usuario_id = $2 AND estado = 'pendiente'`,
      [id, approverId]
    );
    const userApproval = userApprovalRes.rows[0];
    if (!userApproval) {
      await pool.query('ROLLBACK');
      throw new Error('No hay aprobación pendiente para este usuario.');
    }

    // Verificar si hay aprobaciones previas pendientes
    const previousPendingRes = await pool.query(
      `SELECT COUNT(*) as count FROM solicitud_aprobaciones WHERE solicitud_id = $1 AND orden < $2 AND estado = 'pendiente'`,
      [id, userApproval.orden]
    );
    if (previousPendingRes.rows[0].count > 0) {
      await pool.query('ROLLBACK');
      throw new Error('No es su turno para aprobar esta solicitud. Hay aprobaciones previas pendientes.');
    }

    // Actualizar el estado de la aprobación actual
    await pool.query(
      `UPDATE solicitud_aprobaciones SET estado = 'aprobado', fecha_decision = CURRENT_TIMESTAMP, comentario = $1 WHERE id = $2`,
      [comentario || null, userApproval.id]
    );

    // Omitir otros usuarios del mismo nivel
    await pool.query(
      `UPDATE solicitud_aprobaciones SET estado = 'omitido', fecha_decision = CURRENT_TIMESTAMP, comentario = 'APROBADO POR OTRO USUARIO DEL MISMO NIVEL' WHERE solicitud_id = $1 AND orden = $2 AND estado = 'pendiente' AND id != $3`,
      [id, userApproval.orden, userApproval.id]
    );

    // Verificar si quedan más aprobaciones pendientes
    const pendingApprovalsRes = await pool.query(
      `SELECT COUNT(*) as count FROM solicitud_aprobaciones WHERE solicitud_id = $1 AND estado = 'pendiente'`,
      [id]
    );
    if (pendingApprovalsRes.rows[0].count === 0) {
      await pool.query(
        `UPDATE solicitudes SET estado = 'aprobada', aprobado_por_usuario_id = $1, fecha_aprobacion = CURRENT_TIMESTAMP WHERE solicitud_id = $2`,
        [approverId, id]
      );
    }
    await pool.query('COMMIT');
    return NextResponse.json({ message: 'Solicitud aprobada correctamente.' });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error al aprobar la solicitud:', error);
    if (error.message && (error.message.includes('No hay aprobaciones pendientes') || error.message.includes('No es su turno') || error.message.includes('Solicitud no encontrada'))) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }
    return NextResponse.json({ message: error.message || 'Error interno del servidor al aprobar la solicitud.' }, { status: 500 });
  }
}
