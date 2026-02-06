
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

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
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      if (approverRol?.toLowerCase() === 'administrador') {
        // Admin: aprueba toda la solicitud
        const result = await client.query(
          `UPDATE solicitudes
           SET estado = 'aprobada', comentario_admin = $1, aprobado_por_usuario_id = $2, fecha_aprobacion = CURRENT_TIMESTAMP
           WHERE solicitud_id = $3 AND estado != 'aprobada'`,
          [`APROBADO POR ADMINISTRADOR: ${upperComentario || ''}`, approverId, id]
        );
        if (result.rowCount === 0) {
          throw new Error('Solicitud no encontrada o ya aprobada.');
        }
        await client.query(
          `UPDATE solicitud_aprobaciones
           SET estado = 'aprobado', comentario = 'Anulado y aprobado por administrador'
           WHERE solicitud_id = $1 AND estado = 'pendiente'`,
          [id]
        );
        await client.query('COMMIT');
        return new NextResponse(JSON.stringify({ message: 'Solicitud aprobada correctamente.' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // 1. Verificar si es el turno del aprobador actual
      const { rows: userApprovalRows } = await client.query(
        `SELECT id, aprobador_id, orden
         FROM solicitud_aprobaciones
         WHERE solicitud_id = $1
           AND aprobador_id = $2
           AND estado = 'pendiente'
         LIMIT 1`,
        [id, approverId]
      );
      const userApproval = userApprovalRows[0];
      if (!userApproval) {
        throw new Error('No tiene una aprobación pendiente para esta solicitud o no es su turno.');
      }

      // 2. Verificar que no haya aprobaciones pendientes de orden inferior
      const { rows: previousPendingRows } = await client.query(
        `SELECT COUNT(*) as count
         FROM solicitud_aprobaciones
         WHERE solicitud_id = $1
           AND estado = 'pendiente'
           AND orden < $2`,
        [id, userApproval.orden]
      );
      if (parseInt(previousPendingRows[0].count) > 0) {
        throw new Error('Debe esperar a que los aprobadores anteriores completen su aprobación.');
      }

      // 3. Actualizar el estado de la aprobación actual
      await client.query(
        `UPDATE solicitud_aprobaciones
         SET estado = 'aprobado', comentario = $1
         WHERE id = $2`,
        [upperComentario, userApproval.id]
      );

      // 4. Si no quedan aprobaciones pendientes, aprobar la solicitud
      const { rows: remainingRows } = await client.query(
        `SELECT COUNT(*) as count
         FROM solicitud_aprobaciones
         WHERE solicitud_id = $1
           AND estado = 'pendiente'`,
        [id]
      );
      if (parseInt(remainingRows[0].count) === 0) {
        await client.query(
          `UPDATE solicitudes
           SET estado = 'aprobada', aprobado_por_usuario_id = $1, fecha_aprobacion = CURRENT_TIMESTAMP
           WHERE solicitud_id = $2`,
          [approverId, id]
        );
      }

      await client.query('COMMIT');
      return new NextResponse(JSON.stringify({ message: 'Solicitud aprobada correctamente.' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    return new NextResponse(JSON.stringify({ message: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function POST(request, { params }) {
  const session = await getSession();
  if (!session) {
    return new NextResponse(JSON.stringify({ message: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { id } = await params;
  const { id: approverId, rol: approverRol } = session;

  try {
    const { comentario } = await request.json();
    const upperComentario = comentario ? comentario.toUpperCase() : comentario;

    // Iniciar transacción
    const approveTransaction = db.transaction(() => {
      // Si el usuario es administrador, tiene permiso para aprobar directamente.
      if (approverRol?.toLowerCase() === 'administrador') {
        // Admin Override: Aprueba toda la solicitud
        const updateSolicitudStmt = db.prepare(`
          UPDATE solicitudes
          SET estado = 'aprobada', comentario_admin = ?, aprobado_por_usuario_id = ?, fecha_aprobacion = CURRENT_TIMESTAMP
          WHERE solicitud_id = ?
        `);
        const result = updateSolicitudStmt.run(`APROBADO POR ADMINISTRADOR: ${upperComentario || ''}`, approverId, id);

        if (result.changes === 0) {
          throw new Error('Solicitud no encontrada o ya aprobada.');
        }

        db.prepare(`
          UPDATE solicitud_aprobaciones
          SET estado = 'aprobado', comentario = 'Anulado y aprobado por administrador'
          WHERE solicitud_id = ? AND estado = 'pendiente'
        `).run(id);

        return; // Termina la transacción para el admin
      }

      import { NextResponse } from 'next/server';
      import { getSession } from '@/lib/auth';
      import db from '@/lib/db';

      // Removed ALTER TABLE statements as they are not needed in PostgreSQL

        SELECT COUNT(*) as count
        FROM solicitud_aprobaciones
        WHERE solicitud_id = ?
          AND orden < ?
          AND estado = 'pendiente'
      `);
      const previousPending = previousPendingStmt.get(id, userApproval.orden);

      if (previousPending.count > 0) {
        throw new Error('No es su turno para aprobar esta solicitud. Hay aprobaciones previas pendientes.');
      }

      // 2. Actualizar el estado de la aprobación actual del usuario
      const updateApprovalStmt = db.prepare(`
        UPDATE solicitud_aprobaciones
        SET estado = 'aprobado', fecha_decision = CURRENT_TIMESTAMP, comentario = ?
        WHERE id = ?
      `);
      updateApprovalStmt.run(comentario || null, userApproval.id);

      const omitirOtrosStmt = db.prepare(`
        UPDATE solicitud_aprobaciones
        SET estado = 'omitido',
            fecha_decision = CURRENT_TIMESTAMP,
            comentario = 'APROBADO POR OTRO USUARIO DEL MISMO NIVEL'
        WHERE solicitud_id = ?
          AND orden = ?
          AND estado = 'pendiente'
          AND id != ?
      `);
      omitirOtrosStmt.run(id, userApproval.orden, userApproval.id);

      // 3. Verificar si quedan más aprobaciones pendientes
      const pendingApprovalsStmt = db.prepare(`
        SELECT COUNT(*) as count
        FROM solicitud_aprobaciones
        WHERE solicitud_id = ? AND estado = 'pendiente'
      `);
      const pendingCount = pendingApprovalsStmt.get(id).count;

      // 4. Si no hay más pendientes, actualizar el estado de la solicitud principal
      if (pendingCount === 0) {
        const updateSolicitudStmt = db.prepare(`
          UPDATE solicitudes
          SET estado = 'aprobada', aprobado_por_usuario_id = ?, fecha_aprobacion = CURRENT_TIMESTAMP
          WHERE solicitud_id = ?
        `);
        updateSolicitudStmt.run(approverId, id);
      }
    });

    // Ejecutar la transacción
    approveTransaction();

    return NextResponse.json({ message: 'Solicitud aprobada correctamente.' });

  } catch (error) {
    console.error('Error al aprobar la solicitud:', error);
    // Distinguir entre errores de lógica de negocio y errores del servidor
    if (error.message.includes('No hay aprobaciones pendientes') || error.message.includes('No es su turno') || error.message.includes('Solicitud no encontrada')) {
      return new NextResponse(JSON.stringify({ message: error.message }), {
        status: 403, // Forbidden
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new NextResponse(JSON.stringify({ message: 'Error interno del servidor al aprobar la solicitud.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
