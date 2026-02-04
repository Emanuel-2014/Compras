// app/api/test-solicitud/route.js
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth';

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const user = verifySessionToken(sessionCookie.value);
    if (!user) {
      return NextResponse.json({ message: 'Sin permisos suficientes' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const solicitudId = searchParams.get('solicitudId');
    // Verificar si existe la solicitud
    const solicitud = db.prepare('SELECT * FROM solicitudes WHERE solicitud_id = ?').get(solicitudId);

    if (!solicitud) {
      // Buscar solicitudes disponibles
      const todasSolicitudes = db.prepare('SELECT solicitud_id FROM solicitudes ORDER BY fecha_solicitud DESC LIMIT 10').all();

      return NextResponse.json({
        message: `Solicitud ${solicitudId} no encontrada`,
        solicitudesDisponibles: todasSolicitudes.map(s => s.solicitud_id)
      }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Solicitud encontrada',
      solicitud: {
        id: solicitud.id,
        solicitud_id: solicitud.solicitud_id,
        fecha_solicitud: solicitud.fecha_solicitud,
        estado: solicitud.estado
      }
    });

  } catch (error) {
    console.error('Error en test-solicitud:', error);
    return NextResponse.json({
      message: 'Error interno',
      error: error.message
    }, { status: 500 });
  }
}