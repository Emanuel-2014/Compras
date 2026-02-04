// app/api/admin/usuarios/[id]/route.js
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// PUT: Actualizar un usuario existente
export async function PUT(req, { params }) {
  const user = await getSession();
  if (!user || user.rol?.toLowerCase() !== 'administrador') {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  }

  try {
    const { id: userId } = await params; // Obtener el ID desde los parámetros de la URL
    const body = await req.json();
    const nombre = body.nombre ? body.nombre.toUpperCase() : body.nombre;
    const dependencia_id = body.dependencia_id;
    const codigo_personal = body.codigo_personal;
    const password = body.password;
    const rol = body.rol ? body.rol.toLowerCase() : body.rol;
    const coordinador_id = body.coordinador_id;
    const nivel_aprobador = body.nivel_aprobador;

    if (!userId || !nombre || !codigo_personal || !rol) {
      return NextResponse.json({ message: 'Faltan campos obligatorios (id, nombre, codigo_personal, rol).' }, { status: 400 });
    }
    if ((rol === 'solicitante' || rol === 'aprobador') && !dependencia_id) {
      return NextResponse.json({ message: 'La dependencia es obligatoria para este rol.' }, { status: 400 });
    }
    if (rol === 'solicitante' && !coordinador_id) {
        return NextResponse.json({ message: 'El coordinador es obligatorio para los solicitantes.' }, { status: 400 });
    }    if (rol === 'aprobador' && !coordinador_id) {
        return NextResponse.json({ message: 'El coordinador es obligatorio para los aprobadores.' }, { status: 400 });
    }
    if (password) {
      // Si se proporciona una nueva contraseña, hashearla y actualizarla
      const hashedPassword = await bcrypt.hash(password, 10);
      const stmt = db.prepare(
        'UPDATE usuarios SET nombre = ?, dependencia_id = ?, codigo_personal = ?, password = ?, rol = ?, coordinador_id = ?, nivel_aprobador = ? WHERE id = ?'
      );
      stmt.run(nombre, dependencia_id || null, codigo_personal, hashedPassword, rol, coordinador_id || null, nivel_aprobador || null, userId);
    } else {
      // Si no se proporciona contraseña, actualizar los otros campos
      const stmt = db.prepare(
        'UPDATE usuarios SET nombre = ?, dependencia_id = ?, codigo_personal = ?, rol = ?, coordinador_id = ?, nivel_aprobador = ? WHERE id = ?'
      );
      stmt.run(nombre, dependencia_id || null, codigo_personal, rol, coordinador_id || null, nivel_aprobador || null, userId);
    }

    return NextResponse.json({ message: 'Usuario actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar el usuario:', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return NextResponse.json({ message: 'El código de personal ya existe.' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}

// DELETE: Eliminar un usuario
export async function DELETE(req, { params }) {
    const user = await getSession();
    if (!user || user.rol?.toLowerCase() !== 'administrador') {
      return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
    }

    try {
      const { id: userId } = await params; // Obtener el ID desde los parámetros de la URL

      if (!userId) {
        return NextResponse.json({ message: 'ID de usuario no proporcionado.' }, { status: 400 });
      }

      const stmt = db.prepare('DELETE FROM usuarios WHERE id = ?');
      const result = stmt.run(userId);

      if (result.changes === 0) {
        return NextResponse.json({ message: 'Usuario no encontrado.' }, { status: 404 });
      }

      return NextResponse.json({ message: 'Usuario eliminado exitosamente' });
    } catch (error) {
      console.error('Error al eliminar el usuario:', error);
      // Check for foreign key constraint error
      if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
        return NextResponse.json({ message: 'No se puede eliminar el usuario porque tiene solicitudes u otros registros asociados.' }, { status: 409 });
      }
      return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
    }
  }