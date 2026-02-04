import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifySessionToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');

    if (!sessionCookie) {
      return NextResponse.json(
        { message: 'No hay sesión activa. Por favor, inicie sesión.' },
        { status: 401 }
      );
    }

    const user = verifySessionToken(sessionCookie.value);

    if (user.rol?.toLowerCase() !== 'administrador' && user.rol?.toLowerCase() !== 'coordinador') {
        return NextResponse.json(
          { message: 'No tienes permiso para ver esta información.' },
          { status: 403 }
        );
    }

    const { searchParams } = new URL(request.url);
    const dependencias = searchParams.get('dependencias')?.split(',');
    const estados = searchParams.get('estados')?.split(',');
    const prioridades = searchParams.get('prioridades')?.split(',');
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');

    let whereClauses = [];
    let params = [];

    if (dependencias && dependencias.length > 0) {
        whereClauses.push(`u.dependencia IN (${dependencias.map(() => '?').join(',')})`);
        params.push(...dependencias);
    }

    if (estados && estados.length > 0) {
        whereClauses.push(`s.estado IN (${estados.map(() => '?').join(',')})`);
        params.push(...estados);
    }

    if (prioridades && prioridades.length > 0) {
        whereClauses.push(`si.necesidad IN (${prioridades.map(() => '?').join(',')})`);
        params.push(...prioridades);
    }

    if (fechaInicio) {
        whereClauses.push('s.fecha_solicitud >= ?');
        params.push(fechaInicio);
    }

    if (fechaFin) {
        whereClauses.push('s.fecha_solicitud <= ?');
        params.push(fechaFin);
    }

    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const solicitudesPorDependenciaQuery = `
      SELECT u.dependencia, COUNT(s.solicitud_id) as count
      FROM solicitudes s
      JOIN usuarios u ON s.id_usuario = u.id
      ${whereString}
      GROUP BY u.dependencia
    `;
    const solicitudesPorDependencia = db.prepare(solicitudesPorDependenciaQuery).all(...params);

    const solicitudesPorEstadoQuery = `
      SELECT s.estado, COUNT(s.solicitud_id) as count
      FROM solicitudes s
      JOIN usuarios u ON s.id_usuario = u.id
      ${whereString}
      GROUP BY s.estado
    `;
    const solicitudesPorEstado = db.prepare(solicitudesPorEstadoQuery).all(...params);

    const solicitudesPorPrioridadQuery = `
        SELECT si.necesidad, COUNT(si.id) as count
        FROM solicitud_items si
        JOIN solicitudes s ON si.id_solicitud = s.solicitud_id
        JOIN usuarios u ON s.id_usuario = u.id
        ${whereString}
        GROUP BY si.necesidad
    `;

    const solicitudesPorPrioridad = db.prepare(solicitudesPorPrioridadQuery).all(...params);

    return NextResponse.json({
      solicitudesPorDependencia,
      solicitudesPorEstado,
      solicitudesPorPrioridad,
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching report data:', error);
    return NextResponse.json({ message: 'Error interno del servidor al obtener los datos para los reportes.' }, { status: 500 });
  }
}