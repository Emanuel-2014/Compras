
import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const estados = db.prepare(`
      SELECT DISTINCT estado
      FROM solicitudes
      WHERE estado IS NOT NULL
    `).all();

    return NextResponse.json(estados.map(e => e.estado), { status: 200 });
  } catch (error) {
    console.error('Error fetching estados:', error);
    return NextResponse.json({ message: 'Error interno del servidor al obtener los estados.' }, { status: 500 });
  }
}
