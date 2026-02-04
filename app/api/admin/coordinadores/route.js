
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const user = await getSession();

  if (!user || user.rol?.toLowerCase() !== 'administrador') {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  }

  try {
    const stmt = db.prepare("SELECT id, nombre FROM usuarios WHERE rol = 'aprobador' OR rol = 'administrador'");
    const coordinadores = stmt.all();
    return NextResponse.json(coordinadores);
  } catch (error) {
    console.error('Error al obtener los coordinadores:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}
