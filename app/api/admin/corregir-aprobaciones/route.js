import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

export async function POST(request) {
  try {
    // 1. Verificar autenticación y permisos
    const session = await getSession();
    if (!session || session.rol?.toLowerCase() !== 'administrador') {
      return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
    }

    const { solicitudId } = await request.json();
    if (!solicitudId) {
      return NextResponse.json({ message: 'ID de solicitud requerido' }, { status: 400 });
    }

    console.log(`Corrigiendo aprobaciones para solicitud: ${solicitudId}`);

    // 2. Obtener información de la solicitud
    const solicitud = db.prepare(`
      SELECT s.*, u.nombre as creador_nombre, u.rol as creador_rol, u.id as creador_id
      FROM solicitudes s
      JOIN usuarios u ON s.id_usuario = u.id
      WHERE s.solicitud_id = ?
    `).get(solicitudId);

    if (!solicitud) {
      return NextResponse.json({ message: 'Solicitud no encontrada' }, { status: 404 });
    }

    // 3. Verificar que el creador es un aprobador
    if (solicitud.creador_rol?.toLowerCase() !== 'aprobador') {
      return NextResponse.json({
        message: 'Esta corrección solo aplica para solicitudes creadas por aprobadores',
        creador_rol: solicitud.creador_rol
      }, { status: 400 });
    }

    // 4. Verificar aprobaciones actuales
    const aprobacionesAntes = db.prepare(`
      SELECT sa.*, u.nombre, u.rol
      FROM solicitud_aprobaciones sa
      JOIN usuarios u ON sa.aprobador_id = u.id
      WHERE sa.solicitud_id = ?
      ORDER BY sa.orden
    `).all(solicitudId);

    // 5. Encontrar la aprobación de orden 1
    const aprobacionOrden1 = aprobacionesAntes.find(a => a.orden === 1);

    if (!aprobacionOrden1) {
      return NextResponse.json({ message: 'No se encontró aprobación de nivel 1' }, { status: 404 });
    }

    // 6. Corregir si es necesario
    let correcionRealizada = false;
    if (aprobacionOrden1.aprobador_id !== solicitud.creador_id) {
      console.log(`Corrigiendo: Cambiando aprobador de orden 1 de ID ${aprobacionOrden1.aprobador_id} a ID ${solicitud.creador_id}`);

      const result = db.prepare(`
        UPDATE solicitud_aprobaciones
        SET aprobador_id = ?,
            comentario = 'Corregido: Auto-autorizado al crear la solicitud',
            fecha_decision = datetime('now', 'localtime')
        WHERE id = ?
      `).run(solicitud.creador_id, aprobacionOrden1.id);

      correcionRealizada = result.changes > 0;
    }

    // 7. Obtener estado final
    const aprobacionesDespues = db.prepare(`
      SELECT sa.*, u.nombre, u.rol
      FROM solicitud_aprobaciones sa
      JOIN usuarios u ON sa.aprobador_id = u.id
      WHERE sa.solicitud_id = ?
      ORDER BY sa.orden
    `).all(solicitudId);

    return NextResponse.json({
      message: correcionRealizada ? 'Corrección aplicada exitosamente' : 'No se requirió corrección',
      solicitud: {
        id: solicitud.solicitud_id,
        creador: solicitud.creador_nombre,
        rol: solicitud.creador_rol
      },
      correccion_realizada: correcionRealizada,
      aprobaciones_antes: aprobacionesAntes.map(a => ({
        orden: a.orden,
        aprobador: a.nombre,
        estado: a.estado,
        aprobador_id: a.aprobador_id
      })),
      aprobaciones_despues: aprobacionesDespues.map(a => ({
        orden: a.orden,
        aprobador: a.nombre,
        estado: a.estado,
        aprobador_id: a.aprobador_id
      }))
    });

  } catch (error) {
    console.error('Error en corrección de aprobaciones:', error);
    return NextResponse.json({
      message: 'Error interno del servidor',
      error: error.message
    }, { status: 500 });
  }
}