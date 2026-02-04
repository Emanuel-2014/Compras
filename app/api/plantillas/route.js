// app/api/plantillas/route.js
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(req) {
  try {
    const user = await getSession(req);
    if (!user) {
      return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
    }

    const plantillas = db.prepare(`
      SELECT
        p.id,
        p.nombre,
        p.proveedor_id,
        pr.nombre as proveedor_nombre
      FROM plantillas p
      JOIN proveedores pr ON p.proveedor_id = pr.id
      WHERE p.usuario_id = ?
    `).all(user.id);

    const plantillaItemsStmt = db.prepare(`
      SELECT id, descripcion, especificaciones
      FROM plantilla_items
      WHERE plantilla_id = ?
    `);

    const results = plantillas.map(plantilla => {
      const items = plantillaItemsStmt.all(plantilla.id);
      return { ...plantilla, items };
    });

    return NextResponse.json(results, { status: 200 });

  } catch (error) {
    console.error('Error al obtener las plantillas:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = await getSession(req);
    if (!user) {
      return NextResponse.json({ message: 'No autorizado para crear plantillas.' }, { status: 403 });
    }

    // Block users with the 'aprobador' role from creating templates
    if (user.rol?.toLowerCase() === 'aprobador') {
      return NextResponse.json({ message: 'Los aprobadores no pueden crear plantillas.' }, { status: 403 });
    }

    const body = await req.json();
    const nombre = body.nombre ? body.nombre.toUpperCase() : body.nombre;
    const proveedor_id = body.proveedor_id;
    const items = body.items;

    if (!nombre || !proveedor_id || !items || items.length === 0) {
      return NextResponse.json({
        message: 'Faltan datos obligatorios (nombre, proveedor, items).',
        received: {
          nombre: !!nombre,
          proveedor_id: !!proveedor_id,
          items_count: items?.length || 0
        }
      }, { status: 400 });
    }

    // Check for existing template with the same name
    const existingPlantilla = db.prepare('SELECT id FROM plantillas WHERE LOWER(nombre) = LOWER(?)').get(nombre);
    if (existingPlantilla) {
        return NextResponse.json({ message: `Ya existe una plantilla con el nombre "${nombre}".` }, { status: 409 });
    }

    const transaction = db.transaction(() => {
      const plantillaStmt = db.prepare('INSERT INTO plantillas (nombre, usuario_id, proveedor_id) VALUES (?, ?, ?)');
      const plantillaResult = plantillaStmt.run(nombre, user.id, proveedor_id);
      const plantillaId = plantillaResult.lastInsertRowid;

      const plantillaItemStmt = db.prepare('INSERT INTO plantilla_items (plantilla_id, descripcion, especificaciones) VALUES (?, ?, ?)');
      for (const item of items) {
        plantillaItemStmt.run(
          plantillaId,
          item.descripcion ? item.descripcion.toUpperCase() : item.descripcion,
          item.especificaciones ? item.especificaciones.toUpperCase() : (item.especificaciones || '')
        );
      }
      return plantillaId;
    });

    const newPlantillaId = transaction();

    return NextResponse.json({ message: 'Plantilla guardada exitosamente.', id: newPlantillaId }, { status: 201 });

  } catch (error) {
    console.error('Error al guardar la plantilla:', error);
    return NextResponse.json({ message: error.message || 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const user = await getSession(req);
    if (!user || user.rol?.toLowerCase() === 'aprobador') {
      return NextResponse.json({ message: 'No autorizado para actualizar plantillas.' }, { status: 403 });
    }

    const body = await req.json();
    const id = body.id;
    const nombre = body.nombre ? body.nombre.toUpperCase() : body.nombre;
    const proveedor_id = body.proveedor_id;
    const items = body.items;

    if (!id || !nombre || !proveedor_id || !items || items.length === 0) {
      return NextResponse.json({ message: 'Faltan datos obligatorios (id, nombre, proveedor, items).' }, { status: 400 });
    }

    // Verify the template belongs to the user
    const plantilla = db.prepare('SELECT id, usuario_id FROM plantillas WHERE id = ?').get(id);
    if (!plantilla || plantilla.usuario_id !== user.id) {
        return NextResponse.json({ message: 'Plantilla no encontrada o no tiene permiso para editarla.' }, { status: 404 });
    }

    // Check for existing template with the same name but different ID
    const existingPlantilla = db.prepare('SELECT id FROM plantillas WHERE LOWER(nombre) = LOWER(?) AND id != ?').get(nombre, id);
    if (existingPlantilla) {
        return NextResponse.json({ message: `Ya existe otra plantilla con el nombre "${nombre}".` }, { status: 409 });
    }

    const transaction = db.transaction(() => {
      // Update plantilla details
      db.prepare('UPDATE plantillas SET nombre = ?, proveedor_id = ? WHERE id = ?')
        .run(nombre, proveedor_id, id);

      // Delete old items
      db.prepare('DELETE FROM plantilla_items WHERE plantilla_id = ?').run(id);

      // Insert new items
      const plantillaItemStmt = db.prepare('INSERT INTO plantilla_items (plantilla_id, descripcion, especificaciones) VALUES (?, ?, ?)');
      for (const item of items) {
        plantillaItemStmt.run(
          id,
          item.descripcion ? item.descripcion.toUpperCase() : item.descripcion,
          item.especificaciones ? item.especificaciones.toUpperCase() : (item.especificaciones || '')
        );
      }
    });

    transaction();

    return NextResponse.json({ message: 'Plantilla actualizada exitosamente.' }, { status: 200 });

  } catch (error) {
    console.error('Error al actualizar la plantilla:', error);
    return NextResponse.json({ message: error.message || 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function DELETE(req) {
    try {
        const user = await getSession(req);
        if (!user || user.rol?.toLowerCase() === 'aprobador') {
            return NextResponse.json({ message: 'No autorizado para eliminar plantillas.' }, { status: 403 });
        }

        const { id } = await req.json();

        if (!id) {
            return NextResponse.json({ message: 'Falta el ID de la plantilla.' }, { status: 400 });
        }

        // Verify the template belongs to the user
        const plantilla = db.prepare('SELECT id, usuario_id FROM plantillas WHERE id = ?').get(id);
        if (!plantilla || plantilla.usuario_id !== user.id) {
            return NextResponse.json({ message: 'Plantilla no encontrada o no tiene permiso para eliminarla.' }, { status: 404 });
        }

        const transaction = db.transaction(() => {
            // First, delete associated items
            db.prepare('DELETE FROM plantilla_items WHERE plantilla_id = ?').run(id);
            // Then, delete the template itself
            db.prepare('DELETE FROM plantillas WHERE id = ?').run(id);
        });

        transaction();

        return NextResponse.json({ message: 'Plantilla eliminada exitosamente.' }, { status: 200 });

    } catch (error) {
        console.error('Error al eliminar la plantilla:', error);
        return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
    }
}
