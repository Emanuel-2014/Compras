// app/api/solicitudes/pendientes/route.js
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifySessionToken } from '@/lib/auth';

export async function GET(req) {
  try {
    // 1. Obtener y verificar la sesión del usuario desde la cookie
    const cookie = req.headers.get('cookie');
    const token = cookie?.split('; ').find(c => c.startsWith('session='))?.split('=')[1];

    if (!token) {
      return NextResponse.json({ message: 'No autorizado: No se encontró token de sesión.' }, { status: 401 });
    }

    const session = verifySessionToken(token);
    if (!session || !session.id) {
      return NextResponse.json({ message: 'No autorizado: Sesión inválida o corrupta.' }, { status: 401 });
    }
    const userId = session.id;

    // 2. Obtener las solicitudes pendientes para el usuario donde es su turno de aprobar.
    const pendingApprovalsRes = await pool.query(`
      SELECT s.*, u.nombre as nombre_solicitante, p.nombre as nombre_proveedor
      FROM solicitudes s
      JOIN solicitud_aprobaciones sa ON s.solicitud_id = sa.solicitud_id
      JOIN usuarios u ON s.id_usuario = u.id
      JOIN proveedores p ON s.id_proveedor = p.id
      WHERE sa.aprobador_id = $1 
        AND sa.estado = 'pendiente'
      ORDER BY s.fecha_solicitud DESC
    `, [userId]);
    const pendingApprovals = pendingApprovalsRes.rows;

    const solicitudesConItems = [];
    for (const solicitud of pendingApprovals) {
      const itemsRes = await pool.query(`
        SELECT id, id_solicitud, necesidad, descripcion, especificaciones, cantidad, observaciones
        FROM solicitud_items
        WHERE id_solicitud = $1
      `, [solicitud.solicitud_id]);
      solicitudesConItems.push({ ...solicitud, items: itemsRes.rows });
    }
    return NextResponse.json(solicitudesConItems, { status: 200 });

  } catch (error) {
    console.error('Error al obtener las solicitudes pendientes:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}