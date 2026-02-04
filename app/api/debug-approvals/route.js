import { NextResponse, NextRequest } from 'next/server';
import db from '@/lib/db';
import { verifySessionToken } from '@/lib/auth';

export async function GET(request) { // Added 'request' parameter
  let sessionData = null;
  let sessionCookieValue = null;

  try {
    const sessionCookie = request.cookies.get('session');
    if (sessionCookie) {
      sessionCookieValue = sessionCookie.value;
      sessionData = verifySessionToken(sessionCookie.value);
    }

    if (!sessionData) {
      return NextResponse.json({
        message: 'No se pudo verificar la sesión. Posiblemente no hay cookie de sesión o es inválida.',
        sessionCookieValue: sessionCookieValue, // Show the raw cookie value if present
      }, { status: 401 });
    }

    // If sessionData exists, but rol is not approver, return info
    if (sessionData.rol?.toLowerCase() !== 'aprobador') {
      return NextResponse.json({
        message: 'Usuario no es aprobador. Información de sesión (directamente del token):',
        session_info: {
          id: sessionData.id,
          nombre: sessionData.nombre,
          rol: sessionData.rol,
          dependencia: sessionData.dependencia,
        },
        sessionCookieValue: sessionCookieValue,
      });
    }

    // If sessionData exists and rol is approver, proceed with full debug info
    // Fetch authorized_dependencia_ids as getSession() would
    let authorizedDependenciaIds = [];
    if (sessionData.rol?.toLowerCase() === 'aprobador') {
      const authorizedDependencias = db.prepare(
        'SELECT dependencia_id FROM aprobador_dependencias WHERE usuario_id = ?'
      ).all(sessionData.id);
      authorizedDependenciaIds = authorizedDependencias.map(d => d.dependencia_id);
    }

    const estadosSolicitudes = db.prepare('SELECT DISTINCT estado FROM solicitudes').all();
    const estadosSolicitudAprobaciones = db.prepare('SELECT DISTINCT estado FROM solicitud_aprobaciones').all();
    const aprobadorDependencias = db.prepare('SELECT usuario_id, dependencia_id FROM aprobador_dependencias WHERE usuario_id = ?').all(sessionData.id);
    const usuarioDependencias = db.prepare('SELECT id, dependencia_id FROM usuarios WHERE id = ?').all(sessionData.id);

    return NextResponse.json({
      message: 'Información de depuración completa para aprobador:',
      distinct_solicitudes_estados: estadosSolicitudes.map(row => row.estado),
      distinct_solicitud_aprobaciones_estados: estadosSolicitudAprobaciones.map(row => row.estado),
      aprobador_dependencias_for_current_user: aprobadorDependencias,
      current_user_dependencia_id: usuarioDependencias.map(row => row.dependencia_id),
      session_user_id: sessionData.id,
      session_user_rol: sessionData.rol,
      session_authorized_dependencia_ids: authorizedDependenciaIds, // Use the fetched ones
      sessionCookieValue: sessionCookieValue,
    });
  } catch (error) {
    console.error('Error al obtener datos de depuración:', error);
    return new NextResponse(JSON.stringify({ message: 'Error interno del servidor.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
