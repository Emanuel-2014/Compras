import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(request) {
  const session = await getSession();
  const rolLower = session?.rol?.toLowerCase();
  if (!session || (rolLower !== 'aprobador' && rolLower !== 'administrador')) {
    return new NextResponse(JSON.stringify({ message: 'No autorizado' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { id: aprobadorId } = session;

    // Si es aprobador, validar que tenga dependencias asignadas
    if (rolLower === 'aprobador' && (!session.authorized_dependencia_ids || session.authorized_dependencia_ids.length === 0)) {
      // If approver has no authorized dependencies, they shouldn't see anything.
      return NextResponse.json([]);
    }

    // Asegurar que los IDs de dependencia son números
    const dependenciaIds = session.authorized_dependencia_ids.map(id => Number(id)).filter(id => !isNaN(id));

    if (dependenciaIds.length === 0) {
      return NextResponse.json([]);
    }

    // Construir el query con placeholders dinámicos
    const placeholders = dependenciaIds.map(() => '?').join(',');

    // y que corresponden al turno actual del usuario según el orden secuencial
    const stmt = db.prepare(`
      SELECT DISTINCT
        s.solicitud_id,
        s.fecha_solicitud,
        s.estado,
        u.nombre as solicitante_nombre,
        p.nombre as proveedor_nombre,
        sa.id as aprobacion_id,
        sa.estado as estado_aprobacion,
        sa.orden as orden_aprobacion
      FROM solicitudes s
      JOIN usuarios u ON s.id_usuario = u.id
      JOIN proveedores p ON s.id_proveedor = p.id
      JOIN solicitud_aprobaciones sa ON sa.solicitud_id = s.solicitud_id
      WHERE u.dependencia_id IN (${placeholders})
        AND sa.estado = 'pendiente'
        AND sa.aprobador_id = ?
        AND NOT EXISTS (
          SELECT 1 FROM solicitud_aprobaciones sa2
          WHERE sa2.solicitud_id = s.solicitud_id
            AND sa2.orden < sa.orden
            AND sa2.estado = 'pendiente'
        )
      ORDER BY s.fecha_solicitud DESC, s.solicitud_id DESC
    `);

    const solicitudesPendientes = stmt.all(...dependenciaIds, aprobadorId);
    return NextResponse.json(solicitudesPendientes);

  } catch (error) {
    console.error('Error al obtener las aprobaciones pendientes:', error);
    return new NextResponse(JSON.stringify({ message: 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
