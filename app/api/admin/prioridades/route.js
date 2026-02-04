
import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const prioridades = db.prepare(`
      SELECT DISTINCT necesidad
      FROM solicitud_items
      WHERE necesidad IS NOT NULL
    `).all();

    return NextResponse.json(prioridades.map(p => p.necesidad), { status: 200 });
  } catch (error) {
    console.error('Error fetching prioridades:', error);
    return NextResponse.json({ message: 'Error interno del servidor al obtener las prioridades.' }, { status: 500 });
  }
}
