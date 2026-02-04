// app/api/dashboard-aprobador/route.js
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request) {
  try {
    const session = await getSession();
    if (!session || !session.user || session.user.rol?.toLowerCase() !== 'aprobador') {
      return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
    }

    const { dependencia } = session.user;
    if (!dependencia) {
      return NextResponse.json({ message: 'El aprobador no tiene una dependencia asignada.' }, { status: 400 });
    }

    // Solicitudes por Estado
    const porEstadoStmt = db.prepare(`
      SELECT s.estado, COUNT(s.id) as count
      FROM solicitudes s
      JOIN usuarios u ON s.id_usuario = u.id
      WHERE u.dependencia = ?
      GROUP BY s.estado
    `);
    const porEstadoRows = porEstadoStmt.all(dependencia);
    const solicitudesPorEstado = porEstadoRows.reduce((acc, row) => {
      acc[row.estado] = row.count;
      return acc;
    }, {});

    // Solicitudes por Necesidad
    const porNecesidadStmt = db.prepare(`
      SELECT si.necesidad, COUNT(DISTINCT s.id) as count
      FROM solicitudes s
      JOIN solicitud_items si ON s.id = si.id_solicitud
      JOIN usuarios u ON s.id_usuario = u.id
      WHERE u.dependencia = ? AND si.necesidad IS NOT NULL AND si.necesidad != ''
      GROUP BY si.necesidad
    `);
    const porNecesidadRows = porNecesidadStmt.all(dependencia);
    const solicitudesPorNecesidad = porNecesidadRows.reduce((acc, row) => {
      acc[row.necesidad] = row.count;
      return acc;
    }, {});

    // Solicitudes por Usuario
    const porUsuarioStmt = db.prepare(`
      SELECT u.nombre, COUNT(s.id) as count
      FROM solicitudes s
      JOIN usuarios u ON s.id_usuario = u.id
      WHERE u.dependencia = ?
      GROUP BY u.nombre
      ORDER BY count DESC
    `);
    const porUsuarioRows = porUsuarioStmt.all(dependencia);
    const solicitudesPorUsuario = porUsuarioRows.reduce((acc, row) => {
      acc[row.nombre] = row.count;
      return acc;
    }, {});

    return NextResponse.json({
      solicitudesPorEstado,
      solicitudesPorNecesidad,
      solicitudesPorUsuario,
    }, { status: 200 });

  } catch (error) {
    console.error('Error en /api/dashboard-aprobador GET:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
