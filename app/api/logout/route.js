// app/api/logout/route.js
import { NextResponse } from 'next/server';
import { closeSession } from '@/lib/sessions';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    await Promise.resolve(); // Workaround for Turbopack bug
    
    // Obtener el token y cerrar la sesión en la base de datos
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    if (token) {
      closeSession(token);
    }
    
    const response = NextResponse.json({ message: 'Sesión cerrada exitosamente.' }, { status: 200 });
    response.cookies.set('session', '', { expires: new Date(0), path: '/' });
    response.cookies.set('token', '', { expires: new Date(0), path: '/' });
    return response;
  } catch (error) {
    console.error('Error en /api/logout:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor al cerrar sesión.' },
      { status: 500 }
    );
  }
}