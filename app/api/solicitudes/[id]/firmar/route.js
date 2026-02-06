// app/api/solicitudes/[id]/firmar/route.js
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifySessionToken } from '@/lib/auth';

export async function POST(req, { params }) {
  try {
    // 1. Autenticación y autorización
    const cookie = req.headers.get('cookie');
    const token = cookie?.split('; ').find(c => c.startsWith('session='))?.split('=')[1];
    if (!token) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }
    const session = verifySessionToken(token);
    if (!session || !session.id) {
      return NextResponse.json({ message: 'Sesión inválida' }, { status: 401 });
    }
    const userId = session.id;
    const solicitudId = params.id;

    // 2. Obtener datos del cuerpo de la petición
    const { decision: rawDecision, comentario: rawComentario } = await req.json();
    const decision = rawDecision ? rawDecision.toUpperCase() : rawDecision;
    const comentario = rawComentario ? rawComentario.toUpperCase() : rawComentario;

    if (!['APROBADO', 'RECHAZADO'].includes(decision)) {
      return NextResponse.json({ message: "La decisión debe ser 'APROBADO' o 'RECHAZADO'." }, { status: 400 });
    }

    await pool.query('BEGIN');
    try {
      // 3. Verificar que el usuario es el aprobador correcto y que es su turno
      const aprobacionActualRes = await pool.query(
        `SELECT * FROM solicitud_aprobaciones WHERE solicitud_id = $1 AND aprobador_id = $2 AND estado = 'pendiente'`,
        [solicitudId, userId]
      );
      const aprobacionActual = aprobacionActualRes.rows[0];
      if (!aprobacionActual) {
        await pool.query('ROLLBACK');
        return NextResponse.json({ message: 'No tienes una aprobación pendiente para esta solicitud.' }, { status: 403 });
      }
      // Lógica de aprobación por niveles
      const previousOrdenLevelsRes = await pool.query(
        `SELECT DISTINCT orden FROM solicitud_aprobaciones WHERE solicitud_id = $1 AND orden < $2 ORDER BY orden`,
        [solicitudId, aprobacionActual.orden]
      );
      for (const level of previousOrdenLevelsRes.rows) {
        const levelApprovedRes = await pool.query(
          `SELECT COUNT(*) as count FROM solicitud_aprobaciones WHERE solicitud_id = $1 AND orden = $2 AND estado = 'APROBADO'`,
          [solicitudId, level.orden]
        );
        if (levelApprovedRes.rows[0].count === 0) {
          await pool.query('ROLLBACK');
          return NextResponse.json({ message: `No se puede procesar su decisión. El nivel de aprobación ${level.orden} aún está pendiente.` }, { status: 403 });
        }
      }
      // 4. Actualizar la aprobación actual
      await pool.query(
        `UPDATE solicitud_aprobaciones SET estado = $1, comentario = $2, fecha_decision = CURRENT_TIMESTAMP WHERE id = $3`,
        [decision, comentario, aprobacionActual.id]
      );
      // 5. Lógica de cascada
      if (decision === 'RECHAZADO') {
        await pool.query(
          'UPDATE solicitudes SET estado = $1 WHERE solicitud_id = $2',
          ['RECHAZADA', solicitudId]
        );
      } else {
        const currentLevelApprovalsRes = await pool.query(
          `SELECT COUNT(*) as count FROM solicitud_aprobaciones WHERE solicitud_id = $1 AND orden = $2 AND estado = 'APROBADO'`,
          [solicitudId, aprobacionActual.orden]
        );
        const pendingInCurrentLevelRes = await pool.query(
          `SELECT COUNT(*) as count FROM solicitud_aprobaciones WHERE solicitud_id = $1 AND orden = $2 AND estado = 'pendiente'`,
          [solicitudId, aprobacionActual.orden]
        );
        const nextOrdenLevelsPendingRes = await pool.query(
          `SELECT COUNT(*) as count FROM solicitud_aprobaciones WHERE solicitud_id = $1 AND orden > $2 AND estado = 'pendiente'`,
          [solicitudId, aprobacionActual.orden]
        );
        if (pendingInCurrentLevelRes.rows[0].count === 0 && nextOrdenLevelsPendingRes.rows[0].count === 0) {
          await pool.query(
            'UPDATE solicitudes SET estado = $1 WHERE solicitud_id = $2',
            ['APROBADA', solicitudId]
          );
        }
      }
      await pool.query('COMMIT');
      return NextResponse.json({ message: 'Decisión registrada correctamente.' });
    } catch (error) {
      await pool.query('ROLLBACK');
      return NextResponse.json({ message: error.message }, { status: 403 });
    }

  } catch (error) {
    console.error(`Error en POST /api/solicitudes/${params.id}/firmar:`, error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}
