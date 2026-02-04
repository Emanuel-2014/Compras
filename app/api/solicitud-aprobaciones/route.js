import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

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
      return new NextResponse(JSON.stringify({ message: 'Faltan datos requeridos.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const performUpdate = db.transaction(() => {
      // 1. Verificar que la aprobación existe y está pendiente
      const aprobacionStmt = db.prepare(
        'SELECT * FROM solicitud_aprobaciones WHERE id = ? AND estado = ?'
      );
      const aprobacion = aprobacionStmt.get(aprobacionId, 'pendiente');

      if (!aprobacion) {
        throw new Error('Aprobación no encontrada o ya procesada.');
      }

      // 2. Verificar autorización según el rol
      // Si es administrador, puede aprobar cualquier solicitud
      // Si es aprobador, debe ser de la dependencia correcta
      if (rolLower === 'aprobador') {
        const verificarAprobadorStmt = db.prepare(`
          SELECT COUNT(*) as count
          FROM solicitudes s
          JOIN usuarios u ON s.id_usuario = u.id
          JOIN aprobador_dependencias ad ON ad.dependencia_id = u.dependencia_id
          WHERE s.solicitud_id = ? AND ad.usuario_id = ?
        `);
        const verificacion = verificarAprobadorStmt.get(aprobacion.solicitud_id, session.id);

        if (!verificacion || verificacion.count === 0) {
          throw new Error('No tiene autorización para aprobar esta solicitud. Solo los aprobadores de la dependencia del solicitante pueden aprobar.');
        }
      }
      // Si es administrador, no necesita verificación adicional

      const fechaDecision = new Date().toISOString();
      let nuevoEstadoSolicitud;

      // 3. Actualizar la tabla de aprobaciones registrando quién realmente aprobó
      // Diferenciar entre "autorizado" (aprobador) y "aprobado" (administrador)
      const estadoAprobacion = rolLower === 'aprobador' ? 'autorizado' : 'aprobado';

      const updateAprobacionStmt = db.prepare(
        'UPDATE solicitud_aprobaciones SET estado = ?, fecha_decision = ?, comentario = ?, aprobador_id = ? WHERE id = ?'
      );

      if (action === 'aprobar') {
        // Actualizar el registro específico del aprobador que está aprobando
        updateAprobacionStmt.run(estadoAprobacion, fechaDecision, null, session.id, aprobacionId);

        // ya que solo se necesita que UNO apruebe
        const aprobadoresMismoNivelStmt = db.prepare(`
          UPDATE solicitud_aprobaciones
          SET estado = ?, fecha_decision = ?, comentario = 'APROBADO POR OTRO USUARIO DEL MISMO NIVEL'
          WHERE solicitud_id = ?
            AND orden = ?
            AND estado = 'pendiente'
            AND id != ?
        `);
        aprobadoresMismoNivelStmt.run('omitido', fechaDecision, aprobacion.solicitud_id, aprobacion.orden, aprobacionId);

        // Verificar si hay más aprobaciones pendientes en orden superior
        const siguienteAprobacionStmt = db.prepare(`
          SELECT * FROM solicitud_aprobaciones
          WHERE solicitud_id = ? AND orden > ? AND estado = 'pendiente'
          ORDER BY orden ASC
          LIMIT 1
        `);
        const siguienteAprobacion = siguienteAprobacionStmt.get(aprobacion.solicitud_id, aprobacion.orden);

        if (siguienteAprobacion) {
          // Hay más aprobaciones pendientes, mantener en PENDIENTE_APROBACION
          nuevoEstadoSolicitud = 'PENDIENTE_APROBACION';
        } else {
          // No hay más aprobaciones, marcar como APROBADA
          nuevoEstadoSolicitud = 'APROBADA';
        }

        // 4. Actualizar la solicitud principal
        const updateSolicitudStmt = db.prepare(
          'UPDATE solicitudes SET estado = ?, rechazo_comentario = NULL WHERE solicitud_id = ?'
        );
        updateSolicitudStmt.run(nuevoEstadoSolicitud, aprobacion.solicitud_id);
      } else { // rechazar
        updateAprobacionStmt.run('rechazado', fechaDecision, comentario, session.id, aprobacionId);
        nuevoEstadoSolicitud = 'RECHAZADA';

        const updateSolicitudStmt = db.prepare(
          'UPDATE solicitudes SET estado = ?, rechazo_comentario = ? WHERE solicitud_id = ?'
        );
        updateSolicitudStmt.run(
          nuevoEstadoSolicitud,
          comentario,
          aprobacion.solicitud_id
        );

        // Cancelar todas las aprobaciones pendientes restantes
        const cancelarPendientesStmt = db.prepare(
          'UPDATE solicitud_aprobaciones SET estado = ?, comentario = ? WHERE solicitud_id = ? AND estado = ?'
        );
        cancelarPendientesStmt.run('cancelado', 'CANCELADO POR RECHAZO EN ETAPA ANTERIOR', aprobacion.solicitud_id, 'pendiente');
      }

      return { solicitud_id: aprobacion.solicitud_id, nuevoEstado: nuevoEstadoSolicitud };
    });

    const result = performUpdate();

    return NextResponse.json({
      message: `Solicitud ${action === 'aprobar' ? 'aprobada' : 'rechazada'} correctamente.`,
      ...result,
    });

  } catch (error) {
    console.error('Error al procesar la acción del coordinador:', error);
    return new NextResponse(JSON.stringify({ message: error.message || 'Error interno del servidor.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
