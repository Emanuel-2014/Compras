// app/api/solicitudes/[id]/firmar/route.js
import { NextResponse } from 'next/server';
import db from '@/lib/db';
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

    const transaction = db.transaction(() => {
      // 3. Verificar que el usuario es el aprobador correcto y que es su turno
      const aprobacionActual = db.prepare(`
        SELECT * FROM solicitud_aprobaciones
        WHERE solicitud_id = ? AND aprobador_id = ? AND estado = 'pendiente'
      `).get(solicitudId, userId);

      if (!aprobacionActual) {
        throw new Error('No tienes una aprobación pendiente para esta solicitud.');
      }

      // NOVEDAD: Lógica de aprobación por niveles.
      // Para cada nivel de 'orden' anterior al actual, verificar que al menos uno esté aprobado.
      const previousOrdenLevels = db.prepare(`
        SELECT DISTINCT orden FROM solicitud_aprobaciones
        WHERE solicitud_id = ? AND orden < ?
        ORDER BY orden
      `).all(solicitudId, aprobacionActual.orden);

      for (const level of previousOrdenLevels) {
        const levelApproved = db.prepare(
          `SELECT COUNT(*) as count FROM solicitud_aprobaciones WHERE solicitud_id = ? AND orden = ? AND estado = 'APROBADO'`
        ).get(solicitudId, level.orden);

        if (levelApproved.count === 0) {
          throw new Error(`No se puede procesar su decisión. El nivel de aprobación ${level.orden} aún está pendiente.`);
        }
      }

      // 4. Actualizar la aprobación actual
      const updateStmt = db.prepare(`
        UPDATE solicitud_aprobaciones
        SET estado = ?, comentario = ?, fecha_decision = datetime('now')
        WHERE id = ?
      `);
      updateStmt.run(decision, comentario, aprobacionActual.id);

      // 5. Lógica de cascada
      if (decision === 'RECHAZADO') {
        // Si se rechaza, la solicitud principal se rechaza
        db.prepare('UPDATE solicitudes SET estado = ? WHERE solicitud_id = ?').run('RECHAZADA', solicitudId);
      } else { // decision === 'APROBADO'
        // Verificar si *todos* los aprobadores del nivel actual han tomado una decisión (APROBADO o RECHAZADO)
        // O si al menos uno del nivel actual ya aprobó.
        // Si el nivel actual ya tiene una aprobación, y no es este usuario, no debería afectar al estado de la solicitud global.
        
        // Comprobar si hay al menos una aprobación en el nivel actual para esta solicitud
        const currentLevelApprovals = db.prepare(`
            SELECT COUNT(*) as count FROM solicitud_aprobaciones
            WHERE solicitud_id = ? AND orden = ? AND estado = 'APROBADO'
        `).get(solicitudId, aprobacionActual.orden);

        // Buscar si hay aprobadores pendientes en el nivel actual (excluyendo al que acaba de aprobar)
        const pendingInCurrentLevel = db.prepare(`
            SELECT COUNT(*) as count FROM solicitud_aprobaciones
            WHERE solicitud_id = ? AND orden = ? AND estado = 'pendiente'
        `).get(solicitudId, aprobacionActual.orden);

        // Buscar si hay niveles de orden superior que estén pendientes
        const nextOrdenLevelsPending = db.prepare(`
            SELECT COUNT(*) as count FROM solicitud_aprobaciones
            WHERE solicitud_id = ? AND orden > ? AND estado = 'pendiente'
        `).get(solicitudId, aprobacionActual.orden);


        // Si NO hay más aprobadores pendientes en el nivel actual (o el nivel actual ya tiene una aprobación)
        // Y NO hay niveles superiores pendientes
        if (pendingInCurrentLevel.count === 0 && nextOrdenLevelsPending.count === 0) {
             // Todos los del nivel actual han decidido y no hay niveles superiores pendientes
            db.prepare('UPDATE solicitudes SET estado = ? WHERE solicitud_id = ?').run('APROBADA', solicitudId);
        }
        // Si hay más aprobadores en el nivel actual o niveles superiores, la solicitud permanece en su estado actual (pendiente/en proceso)
      }
      return { success: true };
    });

    try {
      transaction();
      return NextResponse.json({ message: 'Decisión registrada correctamente.' });
    } catch (error) {
      return NextResponse.json({ message: error.message }, { status: 403 }); // 403 Forbidden si no es su turno o no es aprobador
    }

  } catch (error) {
    console.error(`Error en POST /api/solicitudes/${params.id}/firmar:`, error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}
