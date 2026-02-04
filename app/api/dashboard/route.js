import { NextResponse } from 'next/server';
import db from '../../../lib/db';
import { getSession } from '../../../lib/auth';

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    let stats;
    const { id: userId, rol: userRol } = session;
    const rolLower = userRol.toLowerCase();

    // Administrador y Coordinador ven solicitudes donde son coordinador_id
    if (rolLower === 'administrador' || rolLower === 'coordinador') {
      const query = `
        SELECT
          COUNT(*) as totalRequests,
          SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) as pendingRequests,
          SUM(CASE WHEN estado = 'aprobada' THEN 1 ELSE 0 END) as approvedRequests,
          SUM(CASE WHEN estado = 'rechazada' THEN 1 ELSE 0 END) as rejectedRequests
        FROM solicitudes
        WHERE coordinador_id = ?;
      `;
      stats = db.prepare(query).get(userId);
    } else if (rolLower === 'solicitante') {
      const query = `
        SELECT
          COUNT(*) as totalRequests,
          SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) as pendingRequests,
          SUM(CASE WHEN estado = 'aprobada' THEN 1 ELSE 0 END) as approvedRequests,
          SUM(CASE WHEN estado = 'rechazada' THEN 1 ELSE 0 END) as rejectedRequests
        FROM solicitudes
        WHERE id_usuario = ?;
      `;
      stats = db.prepare(query).get(userId);
    } else if (rolLower === 'aprobador') {

      stats = {
        totalRequests: 0,
        pendingRequests: 0,
        approvedRequests: 0,
        rejectedRequests: 0,
        message: 'Use el dashboard de aprobador'
      };
    } else {
        return NextResponse.json({ error: 'Rol no soportado' }, { status: 403 });
    }

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
