import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifySessionToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET() {
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

    // Only administrators can access this endpoint
    if (!user || user.rol?.toLowerCase() !== 'administrador') {
      return NextResponse.json(
        { message: 'Acceso denegado. Solo administradores pueden ver esta información.' },
        { status: 403 } // 403 Forbidden
      );
    }

    // MODIFIED: Include 'dependencia' and 'rol' in the SELECT statement
    const users = db.prepare('SELECT id, nombre, codigo_personal, dependencia, rol FROM usuarios').all();

    return NextResponse.json(users, { status: 200 });
  } catch (error) {
    console.error('Error fetching users for admin:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor al obtener la lista de usuarios.' },
      { status: 500 }
    );
  }
}