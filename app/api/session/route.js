// app/api/session/route.js
import { NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');

    if (!sessionCookie) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    let user = null;
    try {
      user = verifySessionToken(sessionCookie.value);
    } catch (tokenError) {
      console.error('Error al verificar token de sesión:', tokenError);
      // Si el token es inválido, tratamos como si no hubiera sesión
      return NextResponse.json({ user: null }, { status: 200 });
    }

    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    // Devolvemos solo la información necesaria del usuario (sin datos sensibles)
    return NextResponse.json(
      {
        user: {
          id: user.id,
          nombre: user.nombre,
          rol: user.rol,
          dependencia: user.dependencia,
          puede_crear_plantillas: user.puede_crear_plantillas,
          authorized_dependencia_ids: user.authorized_dependencia_ids || [],
          is_super_admin: user.is_super_admin || false,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error en /api/session:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor al obtener la sesión.' },
      { status: 500 }
    );
  }
}