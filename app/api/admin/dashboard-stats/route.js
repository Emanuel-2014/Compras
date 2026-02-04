import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifySessionToken } from '@/lib/auth';
import { cookies } from 'next/headers';

async function checkAdminAuth() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');
  if (!sessionCookie) {
    return { authorized: false, message: 'No hay sesión activa.' };
  }
  const user = verifySessionToken(sessionCookie.value);
  const allowedRoles = ['administrador', 'coordinador de compras', 'aprobador'];
  if (!user || !allowedRoles.includes(user.rol?.toLowerCase())) {
    return { authorized: false, message: 'Acceso denegado. Se requiere rol de administrador, coordinador o aprobador.' };
  }
  return { authorized: true, user };
}

export async function GET(req) {
  try {
    const auth = await checkAdminAuth();
    if (!auth.authorized) {
      return NextResponse.json({ message: auth.message }, { status: 403 });
    }
    const { user } = auth;

    const { searchParams } = new URL(req.url);
    const filterUsuarioId = searchParams.get('usuarioId');
    const filterDependencia = searchParams.get('dependencia');
    const filterNecesidad = searchParams.get('necesidad');

    let baseWhereClauses = [];
    let baseParams = [];

    const coordinatorRoles = ['administrador', 'coordinador de compras'];
    if (coordinatorRoles.includes(user.rol)) {
        baseWhereClauses.push('s.coordinador_id = ?');
        baseParams.push(user.id);
    }

    if (filterUsuarioId) {
      baseWhereClauses.push('s.id_usuario = ?');
      baseParams.push(filterUsuarioId);
    }
    if (filterDependencia) {
      baseWhereClauses.push('u.dependencia = ?');
      baseParams.push(filterDependencia);
    }
    if (filterNecesidad) {
      baseWhereClauses.push('s.id IN (SELECT id_solicitud FROM solicitud_items WHERE necesidad = ?)');
      baseParams.push(filterNecesidad);
    }

    const baseWhereString = baseWhereClauses.length > 0 ? `WHERE ${baseWhereClauses.join(' AND ')}` : '';

    // Total Solicitudes
    const totalSolicitudes = db.prepare(`SELECT COUNT(DISTINCT s.id) as count FROM solicitudes s JOIN usuarios u ON s.id_usuario = u.id ${baseWhereString}`).get(...baseParams).count;

    // Solicitudes por Estado
    const solicitudesPorEstado = db.prepare(`
      SELECT estado, COUNT(*) as count
      FROM solicitudes s JOIN usuarios u ON s.id_usuario = u.id
      ${baseWhereString}
      GROUP BY estado
    `).all(...baseParams).reduce((acc, row) => {
      acc[row.estado] = row.count;
      return acc;
    }, {});

    // Solicitudes por Necesidad
    const solicitudesPorNecesidad = db.prepare(`
      SELECT LOWER(si.necesidad) as necesidad, COUNT(DISTINCT s.id) as count
      FROM solicitud_items si
      JOIN solicitudes s ON si.id_solicitud = s.id
      JOIN usuarios u ON s.id_usuario = u.id
      ${baseWhereString}
      GROUP BY LOWER(si.necesidad)
    `).all(...baseParams).reduce((acc, row) => {
      acc[row.necesidad] = row.count;
      return acc;
    }, {});

    // Solicitudes por Dependencia
    const dependenciaQuery = `
      SELECT UPPER(u.dependencia) as dependencia, COUNT(DISTINCT s.id) as count
      FROM solicitudes s
      JOIN usuarios u ON s.id_usuario = u.id
      ${baseWhereString}
      ${baseWhereString ? 'AND' : 'WHERE'} u.dependencia IS NOT NULL AND u.dependencia != ''
      GROUP BY UPPER(u.dependencia)
    `;
    const solicitudesPorDependencia = db.prepare(dependenciaQuery).all(...baseParams).reduce((acc, row) => {
        acc[row.dependencia] = row.count;
        return acc;
    }, {});

    // Urgent Solicitudes
    let urgentWhereClauses = ["s.id IN (SELECT DISTINCT id_solicitud FROM solicitud_items WHERE necesidad = 'urgencia')", "s.estado = 'pendiente'"];
    let urgentParams = [];

    if (coordinatorRoles.includes(user.rol)) {
        urgentWhereClauses.push('s.coordinador_id = ?');
        urgentParams.push(user.id);
    }

    const urgentSolicitudes = db.prepare(`
      SELECT s.solicitud_id, s.fecha_solicitud, u.nombre as solicitante, s.estado
      FROM solicitudes s
      JOIN usuarios u ON s.id_usuario = u.id
      WHERE ${urgentWhereClauses.join(' AND ')}
      ORDER BY s.fecha_solicitud DESC
      LIMIT 5
    `).all(...urgentParams);

    return NextResponse.json({
      totalSolicitudes,
      solicitudesPorEstado,
      solicitudesPorNecesidad,
      solicitudesPorDependencia,
      urgentSolicitudes,
    }, { status: 200 });
  } catch (error) {
    console.error('Error en /api/admin/dashboard-stats (GET):', error.message, error.stack);
    return NextResponse.json(
      { message: 'Error interno del servidor al obtener las estadísticas del dashboard.' },
      { status: 500 }
    );
  }
}
