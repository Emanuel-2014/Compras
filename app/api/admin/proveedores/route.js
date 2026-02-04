// app/api/admin/proveedores/route.js
import { NextResponse } from 'next/server';
import db from '@/lib/db'; // Importamos nuestra conexión a la base de datos
import { verifySessionToken } from '@/lib/auth'; // Para verificar la sesión del usuario
import { cookies } from 'next/headers'; // Para acceder a las cookies

async function checkAdminAuth() {
  const cookieStore = await cookies(); // Await cookies()
  const sessionCookie = cookieStore.get('session');

  if (!sessionCookie) {
    return { authorized: false, message: 'No hay sesión activa.' };
  }

  const user = verifySessionToken(sessionCookie.value);

  if (!user || user.rol?.toLowerCase() !== 'administrador') {
    return { authorized: false, message: 'Acceso denegado. Se requiere rol de administrador.' };
  }

  return { authorized: true, user };
}

export async function GET() {
  try {
    const auth = await checkAdminAuth();
    if (!auth.authorized) {
      return NextResponse.json({ message: auth.message }, { status: 403 });
    }

    const stmt = db.prepare('SELECT id, nombre, nit, nit_dv, nombre_asesor, contacto FROM proveedores');
    const proveedores = stmt.all();

    return NextResponse.json(proveedores, { status: 200 });
  } catch (error) {
    console.error('Error en /api/admin/proveedores (GET):', error);
    return NextResponse.json(
      { message: 'Error interno del servidor al obtener la lista de proveedores.' },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const auth = await checkAdminAuth();
    if (!auth.authorized) {
      return NextResponse.json({ message: auth.message }, { status: 403 });
    }

    const body = await req.json();
    const nombre = body.nombre ? body.nombre.toUpperCase() : body.nombre;
    const nit = body.nit;
    const nit_dv = body.nit_dv;
    const nombre_asesor = body.nombre_asesor ? body.nombre_asesor.toUpperCase() : body.nombre_asesor;
    const contacto = body.contacto ? body.contacto.toUpperCase() : body.contacto;

    if (!nombre) {
      return NextResponse.json(
        { message: 'El nombre del proveedor es obligatorio.' },
        { status: 400 }
      );
    }

    const stmt = db.prepare(
      'INSERT INTO proveedores (nombre, nit, nit_dv, nombre_asesor, contacto) VALUES (?, ?, ?, ?, ?)'
    );
    const result = stmt.run(nombre, nit || null, nit_dv || null, nombre_asesor || null, contacto || null);

    return NextResponse.json(
      { message: 'Proveedor creado exitosamente.', id: result.lastInsertRowid },
      { status: 201 }
    );
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed: proveedores.nombre')) {
      return NextResponse.json(
        { message: 'Ya existe un proveedor con este nombre.' },
        { status: 409 }
      );
    }
    console.error('Error en /api/admin/proveedores (POST):', error);
    return NextResponse.json(
      { message: 'Error interno del servidor al crear el proveedor.' },
      { status: 500 }
    );
  }
}

// --- PUT: Actualizar un proveedor existente (para administradores) ---
export async function PUT(req) {
  try {
    const auth = await checkAdminAuth();
    if (!auth.authorized) {
      return NextResponse.json({ message: auth.message }, { status: 403 });
    }

    const body = await req.json();
    const id = body.id;
    const nombre = body.nombre ? body.nombre.toUpperCase() : body.nombre;
    const nit = body.nit;
    const nit_dv = body.nit_dv;
    const nombre_asesor = body.nombre_asesor ? body.nombre_asesor.toUpperCase() : body.nombre_asesor;
    const contacto = body.contacto ? body.contacto.toUpperCase() : body.contacto;

    if (!id || !nombre) {
      return NextResponse.json(
        { message: 'ID y nombre del proveedor son obligatorios para la actualización.' },
        { status: 400 }
      );
    }

    const stmt = db.prepare(
      'UPDATE proveedores SET nombre = ?, nit = ?, nit_dv = ?, nombre_asesor = ?, contacto = ? WHERE id = ?'
    );
    const result = stmt.run(nombre, nit || null, nit_dv || null, nombre_asesor || null, contacto || null, id);

    if (result.changes === 0) {
      return NextResponse.json(
        { message: 'No se encontró el proveedor o no hubo cambios para actualizar.' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Proveedor actualizado exitosamente.' },
      { status: 200 }
    );
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed: proveedores.nombre')) {
      return NextResponse.json(
        { message: 'Ya existe otro proveedor con este nombre.' },
        { status: 409 }
      );
    }
    console.error('Error en /api/admin/proveedores (PUT):', error);
    return NextResponse.json(
      { message: 'Error interno del servidor al actualizar el proveedor.' },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  try {
    const auth = await checkAdminAuth();
    if (!auth.authorized) {
      return NextResponse.json({ message: auth.message }, { status: 403 });
    }

    const { id } = await req.json();

    if (!id) {
      return NextResponse.json(
        { message: 'ID del proveedor es obligatorio para la eliminación.' },
        { status: 400 }
      );
    }

    const stmt = db.prepare('DELETE FROM proveedores WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes === 0) {
      return NextResponse.json(
        { message: 'No se encontró el proveedor para eliminar.' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Proveedor eliminado exitosamente.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error en /api/admin/proveedores (DELETE):', error);
    return NextResponse.json(
      { message: 'Error interno del servidor al eliminar el proveedor.' },
      { status: 500 }
    );
  }
}