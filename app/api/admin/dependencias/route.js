import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth'; // Importar getSession para protección de rutas

// GET: Obtener todas las dependencias
export async function GET() {
  const user = await getSession();
  if (!user || user.rol?.toLowerCase() !== 'administrador') {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  }

  try {
    const dependencias = db.prepare(`
      SELECT id, nombre
      FROM dependencias
      ORDER BY nombre ASC
    `).all();

    return NextResponse.json(dependencias, { status: 200 });
  } catch (error) {
    console.error('Error fetching dependencias:', error);
    return NextResponse.json({ message: 'Error interno del servidor al obtener las dependencias.' }, { status: 500 });
  }
}

// POST: Crear una nueva dependencia
export async function POST(req) {
  const user = await getSession();
  if (!user || user.rol?.toLowerCase() !== 'administrador') {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  }

  try {
    const { nombre: nombreRaw } = await req.json();
    const nombre = nombreRaw ? nombreRaw.trim().toUpperCase() : nombreRaw;

    if (!nombre || nombre.trim() === '') {
      return NextResponse.json({ message: 'El nombre de la dependencia no puede estar vacío.' }, { status: 400 });
    }

    const stmt = db.prepare('INSERT INTO dependencias (nombre) VALUES (?)');
    const result = stmt.run(nombre);

    return NextResponse.json({ message: 'Dependencia creada exitosamente', id: result.lastInsertRowid }, { status: 201 });
  } catch (error) {
    console.error('Error al crear la dependencia:', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return NextResponse.json({ message: 'Ya existe una dependencia con este nombre.' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}

// PUT: Actualizar una dependencia existente
export async function PUT(req) {
  const user = await getSession();
  if (!user || user.rol?.toLowerCase() !== 'administrador') {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  }

  try {
    const { id, nombre: nombreRaw } = await req.json();
    const nombre = nombreRaw ? nombreRaw.trim().toUpperCase() : nombreRaw;

    if (!id || !nombre || nombre.trim() === '') {
      return NextResponse.json({ message: 'ID y nombre de la dependencia son obligatorios.' }, { status: 400 });
    }

    const stmt = db.prepare('UPDATE dependencias SET nombre = ? WHERE id = ?');
    const result = stmt.run(nombre, id);

    if (result.changes === 0) {
      return NextResponse.json({ message: 'Dependencia no encontrada o sin cambios.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Dependencia actualizada exitosamente' });
  } catch (error) {
    console.error('Error al actualizar la dependencia:', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return NextResponse.json({ message: 'Ya existe una dependencia con este nombre.' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}

// DELETE: Eliminar una dependencia
export async function DELETE(req) {
  const user = await getSession();
  if (!user || user.rol?.toLowerCase() !== 'administrador') {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  }

  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ message: 'El ID de la dependencia es obligatorio.' }, { status: 400 });
    }

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
      return NextResponse.json({ message: 'Dependencia no encontrada.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Dependencia eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar la dependencia:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}