// app/api/solicitudes/[id]/set-pendiente/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth';
import db from '@/lib/db';

export async function POST(req, { params }) {
  const { id } = await params; // id de la solicitud

  try {
    // 1. Autenticación y autorización
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    if (!sessionToken) {
      return NextResponse.json({ message: 'No hay sesión activa.' }, { status: 401 });
    }
    const user = verifySessionToken(sessionToken);

    if (!user || (user.rol?.toLowerCase() !== 'aprobador' && user.rol?.toLowerCase() !== 'administrador')) {
      return NextResponse.json({ message: 'No autorizado para esta acción.' }, { status: 403 });
    }

    // 2. Lógica de cambio de estado
    const stmt = db.prepare('UPDATE solicitudes SET estado = ? WHERE solicitud_id = ?');
    const result = stmt.run('pendiente', id);

    if (result.changes === 0) {
      return NextResponse.json({ message: 'No se encontró la solicitud o no se pudo actualizar.' }, { status: 404 });
    }

    return NextResponse.json({ message: `Solicitud ${id} marcada como 'pendiente'.` }, { status: 200 });

  } catch (error) {
    console.error(`Error al marcar como 'pendiente' la solicitud ${id}:`, error);
    return NextResponse.json(
      { message: error.message || 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}
