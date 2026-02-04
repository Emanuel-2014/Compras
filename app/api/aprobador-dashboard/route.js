import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(request) {
  const session = await getSession();

  if (!session || (session.rol && session.rol.toLowerCase() !== 'aprobador')) {
    return new NextResponse(JSON.stringify({ message: 'No autorizado o no eres aprobador.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { authorized_dependencia_ids } = session;

  if (!authorized_dependencia_ids || authorized_dependencia_ids.length === 0) {
    return new NextResponse(JSON.stringify({ message: 'El aprobador no tiene dependencias autorizadas asignadas.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Asegurarse de que los IDs son números para evitar inyección SQL.
  const dependenciaIds = authorized_dependencia_ids.map(id => Number(id)).filter(id => !isNaN(id));

  if (dependenciaIds.length === 0) {
    return new NextResponse(JSON.stringify({ message: 'Los IDs de dependencia proporcionados no son válidos.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
    });
  }

  const placeholders = dependenciaIds.map(() => '?').join(',');

  try {
    // 1. Contar solicitudes por estado para las dependencias autorizadas
    const solicitudesPorEstado = db.prepare(`
      SELECT
        s.estado,
        COUNT(s.id) AS count
      FROM solicitudes s
      JOIN usuarios u ON s.id_usuario = u.id
      WHERE u.dependencia_id IN (${placeholders})
      GROUP BY s.estado
    `).all(...dependenciaIds);

    // 2. Contar solicitudes por necesidad para las dependencias autorizadas
    const solicitudesPorNecesidad = db.prepare(`
      SELECT
        si.necesidad,
        COUNT(si.id) AS count
      FROM solicitud_items si
      JOIN solicitudes s ON si.id_solicitud = s.id
      JOIN usuarios u ON s.id_usuario = u.id
      WHERE u.dependencia_id IN (${placeholders})
      GROUP BY si.necesidad
    `).all(...dependenciaIds);

    // 3. Contar solicitudes por solicitante para las dependencias autorizadas
    const solicitudesPorSolicitante = db.prepare(`
      SELECT
        u.nombre AS solicitante,
        COUNT(s.id) AS count
      FROM solicitudes s
      JOIN usuarios u ON s.id_usuario = u.id
      WHERE u.dependencia_id IN (${placeholders})
      GROUP BY u.nombre
      ORDER BY count DESC
      LIMIT 10
    `).all(...dependenciaIds);

    // 4. Solicitudes por día (últimos 30 días) para las dependencias autorizadas
    const solicitudesPorDia = db.prepare(`
      SELECT
          strftime('%Y-%m-%d', s.fecha_solicitud) AS fecha,
          COUNT(s.id) AS count
      FROM solicitudes s
      JOIN usuarios u ON s.id_usuario = u.id
      WHERE u.dependencia_id IN (${placeholders})
        AND s.fecha_solicitud >= DATE('now', '-30 days')
      GROUP BY fecha
      ORDER BY fecha ASC
    `).all(...dependenciaIds);

    // 5. Últimas solicitudes en las dependencias autorizadas
    const ultimasSolicitudes = db.prepare(`
      SELECT
        s.id,
        s.solicitud_id,
        s.fecha_solicitud,
        u.nombre AS solicitante,
        d.nombre AS dependencia,
        s.estado,
        (
          SELECT SUM(si.cantidad * si.precio_unitario)
          FROM solicitud_items si
          WHERE si.id_solicitud = s.id
        ) AS total
      FROM solicitudes s
      JOIN usuarios u ON s.id_usuario = u.id
      JOIN dependencias d ON u.dependencia_id = d.id
      WHERE u.dependencia_id IN (${placeholders})
      ORDER BY s.fecha_solicitud DESC
      LIMIT 15
    `).all(...dependenciaIds);

    return NextResponse.json({
      solicitudesPorEstado,
      solicitudesPorNecesidad,
      solicitudesPorSolicitante,
      solicitudesPorDia,
      ultimasSolicitudes,
    });

  } catch (error) {
    console.error('Error al obtener datos del dashboard del aprobador:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, {
      status: 500
    });
  }
}
