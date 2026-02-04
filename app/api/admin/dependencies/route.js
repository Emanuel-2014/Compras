// app/api/admin/dependencies/route.js
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request) {
  try {
    const user = await getSession(request);
    if (!user || user.rol?.toLowerCase() !== 'administrador') {
      return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
    }

    const stmt = db.prepare('SELECT id, nombre FROM dependencias ORDER BY nombre ASC');
    const dependencies = stmt.all();

    return NextResponse.json(dependencies, { status: 200 });
  } catch (error) {
    console.error('Error en /api/admin/dependencies (GET):', error);
    return NextResponse.json(
      { message: 'Error interno del servidor al obtener la lista de dependencias.' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = await getSession(request);
    if (!user || user.rol?.toLowerCase() !== 'administrador') {
      return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
    }

    const { nombre } = await request.json();

    if (!nombre || nombre.trim() === '') {
      return NextResponse.json(
        { message: 'El nombre de la dependencia es obligatorio.' },
        { status: 400 }
      );
    }

    const stmt = db.prepare('INSERT INTO dependencias (nombre) VALUES (?)');
    const result = stmt.run(nombre.trim().toUpperCase());

    return NextResponse.json(
      { message: 'Dependencia creada exitosamente.', id: result.lastInsertRowid },
      { status: 201 }
    );
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed: dependencias.nombre')) {
      return NextResponse.json(
        { message: 'Ya existe una dependencia con este nombre.' },
        { status: 409 } // 409 Conflict
      );
    }
    console.error('Error en /api/admin/dependencies (POST):', error);
    return NextResponse.json(
      { message: 'Error interno del servidor al crear la dependencia.' },
      { status: 500 }
    );
  }
}
