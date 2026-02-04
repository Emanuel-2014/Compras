
import { NextResponse } from 'next/server';
import db from '../../../../lib/db';
import { getSession } from '../../../../lib/auth';

export async function GET() {
  const session = await getSession();

  if (!session || session.rol?.toLowerCase() !== 'administrador') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  try {
    // Conteo para hoy
    const today = new Date().toISOString().split('T')[0];
    const todayCount = db.prepare(`
      SELECT COUNT(solicitud_id) as count
      FROM solicitudes
      WHERE estado = 'aprobada' AND date(fecha_solicitud) = ?
    `).get(today);

    // Conteo para la semana actual
    const weekCount = db.prepare(`
      SELECT COUNT(solicitud_id) as count
      FROM solicitudes
      WHERE estado = 'aprobada' AND strftime('%Y-%W', fecha_solicitud) = strftime('%Y-%W', 'now', 'localtime')
    `).get();

    // Conteo para el mes actual
    const monthCount = db.prepare(`
      SELECT COUNT(solicitud_id) as count
      FROM solicitudes
      WHERE estado = 'aprobada' AND strftime('%Y-%m', fecha_solicitud) = strftime('%Y-%m', 'now', 'localtime')
    `).get();

    // Conteo para el año actual
    const yearCount = db.prepare(`
      SELECT COUNT(solicitud_id) as count
      FROM solicitudes
      WHERE estado = 'aprobada' AND strftime('%Y', fecha_solicitud) = strftime('%Y', 'now', 'localtime')
    `).get();

    return NextResponse.json({
      today: todayCount.count,
      week: weekCount.count,
      month: monthCount.count,
      year: yearCount.count,
    });

  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
