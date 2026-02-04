import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(req) {
  try {
    const session = await getSession();

    if (!session || session.rol !== 'administrador') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Obtener solicitudes de Jorge
    const solicitudes = db.prepare(`
      SELECT
        id,
        fecha_solicitud,
        usuario_solicitante,
        fecha_creacion,
        estado
      FROM solicitudes_compra
      WHERE usuario_solicitante = ?
      ORDER BY fecha_creacion DESC
      LIMIT 10
    `).all('Jorge');

    const today = new Date().toISOString().split('T')[0];

    return NextResponse.json({
      success: true,
      solicitudes,
      fechaActual: today,
      message: `Se encontraron ${solicitudes.length} solicitudes de Jorge`
    });

  } catch (error) {
    console.error('Error al consultar solicitudes de Jorge:', error);
    return NextResponse.json(
      { error: 'Error al consultar solicitudes', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const session = await getSession();

    if (!session || session.rol !== 'administrador') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { solicitudId, nuevaFecha } = await req.json();

    if (!solicitudId || !nuevaFecha) {
      return NextResponse.json(
        { error: 'Se requiere solicitudId y nuevaFecha' },
        { status: 400 }
      );
    }

    // Actualizar la fecha de la solicitud
    const result = db.prepare(`
      UPDATE solicitudes_compra
      SET fecha_solicitud = ?
      WHERE id = ?
    `).run(nuevaFecha, solicitudId);

    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'No se encontró la solicitud o no se pudo actualizar' },
        { status: 404 }
      );
    }

    // Obtener la solicitud actualizada
    const solicitudActualizada = db.prepare(`
      SELECT id, fecha_solicitud, usuario_solicitante, fecha_creacion, estado
      FROM solicitudes_compra
      WHERE id = ?
    `).get(solicitudId);

    return NextResponse.json({
      success: true,
      message: 'Fecha de solicitud actualizada correctamente',
      solicitud: solicitudActualizada
    });

  } catch (error) {
    console.error('Error al actualizar fecha de solicitud:', error);
    return NextResponse.json(
      { error: 'Error al actualizar solicitud', details: error.message },
      { status: 500 }
    );
  }
}
