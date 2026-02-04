// app/api/admin/dependencies/[id]/route.js
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function PUT(request, { params }) {
  try {
    const user = await getSession(request);
    if (!user || user.rol?.toLowerCase() !== 'administrador') {
      return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
    }

    const { id } = params;
    const { nombre } = await request.json();

    if (!nombre || nombre.trim() === '') {
      return NextResponse.json(
        { message: 'El nombre de la dependencia es obligatorio.' },
        { status: 400 }
      );
    }

    const stmt = db.prepare('UPDATE dependencias SET nombre = ? WHERE id = ?');
    const result = stmt.run(nombre.trim().toUpperCase(), id);

    if (result.changes === 0) {
      return NextResponse.json(
        { message: 'La dependencia no fue encontrada.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Dependencia actualizada exitosamente.' }, { status: 200 });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed: dependencias.nombre')) {
      return NextResponse.json(
        { message: 'Ya existe una dependencia con este nombre.' },
        { status: 409 }
      );
    }
    console.error(`Error en /api/admin/dependencies/[id] (PUT):`, error);
    return NextResponse.json(
      { message: 'Error interno del servidor al actualizar la dependencia.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getSession(request);
    if (!user || user.rol?.toLowerCase() !== 'administrador') {
      return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
    }

    const { id } = params;

    // Verificar si alguna persona está asignada a esta dependencia
    const checkStmt = db.prepare('SELECT COUNT(*) as count FROM usuarios WHERE dependencia_id = ?');
    const { count } = checkStmt.get(id);

    if (count > 0) {
      return NextResponse.json(
        { message: `No se puede eliminar la dependencia porque está asignada a ${count} usuario(s).` },
        { status: 409 } // 409 Conflict
      );
    }

    const stmt = db.prepare('DELETE FROM dependencias WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes === 0) {
      return NextResponse.json(
        { message: 'La dependencia no fue encontrada.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Dependencia eliminada exitosamente.' }, { status: 200 });
  } catch (error) {
    console.error(`Error en /api/admin/dependencies/[id] (DELETE):`, error);
    return NextResponse.json(
      { message: 'Error interno del servidor al eliminar la dependencia.' },
      { status: 500 }
    );
  }
}
