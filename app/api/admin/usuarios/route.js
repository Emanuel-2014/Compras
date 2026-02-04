import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// GET: Obtener todos los usuarios
export async function GET() {
  const user = await getSession();
  const rolLower = user?.rol?.toLowerCase();

  const allowedRoles = ['administrador', 'coordinador', 'aprobador']; // Aprobador también puede ver usuarios
  if (!user || !allowedRoles.includes(rolLower)) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  }

  try {
    let query;
    let params = [];

    if (rolLower === 'administrador') {
        query = `
            SELECT u.id, u.nombre, u.codigo_personal, u.rol, u.nivel_aprobador,
                   u.coordinador_id, c.nombre as nombre_coordinador,
                   d.nombre as dependencia_nombre, u.dependencia_id
            FROM usuarios u
            LEFT JOIN usuarios c ON u.coordinador_id = c.id
            LEFT JOIN dependencias d ON u.dependencia_id = d.id
        `;
    } else if (rolLower === 'coordinador') {

        // y a los solicitantes que le tienen asignado como coordinador.
        query = `
            SELECT DISTINCT u.id, u.nombre, u.codigo_personal, u.rol, u.nivel_aprobador,
                            u.coordinador_id, c.nombre as nombre_coordinador,
                            d.nombre as dependencia_nombre, u.dependencia_id
            FROM usuarios u
            LEFT JOIN usuarios c ON u.coordinador_id = c.id
            LEFT JOIN dependencias d ON u.dependencia_id = d.id
            WHERE u.dependencia_id = ? OR u.coordinador_id = ?
        `;
        params.push(user.dependencia_id, user.id);
    } else if (rolLower === 'aprobador') {
      // Un aprobador puede ver a los solicitantes de su misma dependencia
        query = `
            SELECT u.id, u.nombre, u.codigo_personal, u.rol, u.nivel_aprobador,
                   u.coordinador_id, c.nombre as nombre_coordinador,
                   d.nombre as dependencia_nombre, u.dependencia_id
            FROM usuarios u
            LEFT JOIN usuarios c ON u.coordinador_id = c.id
            LEFT JOIN dependencias d ON u.dependencia_id = d.id
            WHERE u.dependencia_id = ?
        `;
        params.push(user.dependencia_id);
    } else {
        // Si el rol no está cubierto o no debería ver usuarios
        return NextResponse.json({ message: 'No tienes permiso para ver usuarios.' }, { status: 403 });
    }

    const usuarios = db.prepare(query).all(params);
    return NextResponse.json(usuarios);
  } catch (error) {
    console.error('Error al obtener los usuarios:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}

// POST: Crear un nuevo usuario
export async function POST(req) {
  const user = await getSession();
  const rolLower = user?.rol?.toLowerCase();
  if (!user || rolLower !== 'administrador') {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const nombre = body.nombre ? body.nombre.toUpperCase() : body.nombre;
    const dependencia_id = body.dependencia_id;
    const codigo_personal = body.codigo_personal;
    const password = body.password;
    const rol = body.rol ? body.rol.toLowerCase() : body.rol;
    const coordinador_id = body.coordinador_id;
    const nivel_aprobador = body.nivel_aprobador;

    if (!nombre || !codigo_personal || !password || !rol) {
      return NextResponse.json({ message: 'Faltan campos obligatorios.' }, { status: 400 });
    }
    if ((rol === 'solicitante' || rol === 'aprobador') && !dependencia_id) {
      return NextResponse.json({ message: 'La dependencia es obligatoria para este rol.' }, { status: 400 });
    }
    if (rol === 'solicitante' && !coordinador_id) {
      return NextResponse.json({ message: 'El coordinador es obligatorio para los solicitantes.' }, { status: 400 });
    }    if (rol === 'aprobador' && !coordinador_id) {
      return NextResponse.json({ message: 'El coordinador es obligatorio para los aprobadores.' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const stmt = db.prepare(
      'INSERT INTO usuarios (nombre, dependencia_id, codigo_personal, password, rol, coordinador_id, nivel_aprobador) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    const result = stmt.run(nombre, dependencia_id || null, codigo_personal, hashedPassword, rol, coordinador_id || null, nivel_aprobador || null);

    // Si es APROBADOR, crear automáticamente el registro en aprobador_dependencias
    if (rol === 'aprobador' && dependencia_id) {
      const aprobadorDepStmt = db.prepare(
        'INSERT INTO aprobador_dependencias (usuario_id, dependencia_id) VALUES (?, ?)'
      );
      aprobadorDepStmt.run(result.lastInsertRowid, dependencia_id);
    }

    return NextResponse.json({ message: 'Usuario creado exitosamente', id: result.lastInsertRowid }, { status: 201 });
  } catch (error) {
    console.error('Error al crear el usuario:', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return NextResponse.json({ message: 'El código de personal ya existe.' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}
