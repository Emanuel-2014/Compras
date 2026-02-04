
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request, { params }) {
  const user = await getSession();
  const { id } = params;

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    let stmt;
    let plantilla;

    // Admin can get any template, users can only get their own
    if (user.role === 'admin') {
      stmt = db.prepare('SELECT * FROM plantillas WHERE id = ?');
      plantilla = stmt.get(id);
    } else {
      stmt = db.prepare('SELECT * FROM plantillas WHERE id = ? AND usuario_id = ?');
      plantilla = stmt.get(id, user.id);
    }

    if (!plantilla) {
      return NextResponse.json({ error: 'Plantilla no encontrada o sin permisos' }, { status: 404 });
    }

    return NextResponse.json(plantilla);
  } catch (error) {
    console.error(`Error al obtener la plantilla ${id}:`, error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const user = await getSession();
  const { id } = params;

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { nombre, contenido } = await request.json();

    if (!nombre || !contenido) {
      return NextResponse.json({ error: 'El nombre y el contenido son obligatorios' }, { status: 400 });
    }

    // Normalizar a mayúsculas
    const nombreUpper = nombre.toUpperCase();
    const contenidoUpper = contenido.toUpperCase();

    let stmt;
    let info;

    // Admin can update any template, users can only update their own
    if (user.role === 'admin') {
      stmt = db.prepare('UPDATE plantillas SET nombre = ?, contenido = ? WHERE id = ?');
      info = stmt.run(nombreUpper, contenidoUpper, id);
    } else {
      stmt = db.prepare('UPDATE plantillas SET nombre = ?, contenido = ? WHERE id = ? AND usuario_id = ?');
      info = stmt.run(nombreUpper, contenidoUpper, id, user.id);
    }

    if (info.changes === 0) {
      return NextResponse.json({ error: 'Plantilla no encontrada o no tienes permiso para editarla' }, { status: 404 });
    }

    // Return a success response with the updated data
    return NextResponse.json({ success: true, id, nombre: nombreUpper, contenido: contenidoUpper });
  } catch (error) {
    console.error(`Error al actualizar la plantilla ${id}:`, error);
    // Handle JSON parsing errors or other unexpected issues
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Cuerpo de la solicitud mal formado' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const user = await getSession();
  const { id } = params;

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    let stmt;
    let info;

    // Admin can delete any template, users can only delete their own
    if (user.role === 'admin') {
      stmt = db.prepare('DELETE FROM plantillas WHERE id = ?');
      info = stmt.run(id);
    } else {
      stmt = db.prepare('DELETE FROM plantillas WHERE id = ? AND usuario_id = ?');
      info = stmt.run(id, user.id);
    }

    if (info.changes === 0) {
      return NextResponse.json({ error: 'Plantilla no encontrada o no tienes permiso para eliminarla' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Plantilla eliminada correctamente' });
  } catch (error) {
    console.error(`Error al eliminar la plantilla ${id}:`, error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
