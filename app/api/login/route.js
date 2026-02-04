// app/api/login/route.js

import { NextResponse, NextRequest } from 'next/server'; // Importamos NextRequest
import bcrypt from 'bcryptjs'; // Importamos bcryptjs para el hashing de contraseñas
import db from '@/lib/db';
import { createSessionToken, serializeSessionCookie } from '@/lib/auth'; // Importamos funciones de auth
import { logAudit } from '@/lib/audit'; // Importamos función de auditoría
import { createSession } from '@/lib/sessions'; // Importamos función de sesiones

export async function POST(req) {
  try {
    // 1. Obtenemos los datos del cuerpo de la petición.
    const { codigo, password } = await req.json();

    // Obtener IP y user agent para auditoría
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Validamos que hemos recibido ambos campos.
    if (!codigo || !password) {
      return NextResponse.json(
        { message: 'El código y la contraseña son obligatorios.' },
        { status: 400 } // 400 Bad Request: La petición es incorrecta.
      );
    }

    console.log(`Buscando usuario con código: ${codigo}`);

    const stmt = db.prepare('SELECT * FROM usuarios WHERE codigo_personal = ?');
    const user = stmt.get(codigo);

    if (!user) {
      // Log de intento de login fallido
      logAudit({
        userId: null,
        userName: codigo,
        action: 'LOGIN_FAILED',
        details: 'Usuario no encontrado',
        ipAddress,
        userAgent
      });
      
      return NextResponse.json(
        { message: 'Usuario o contraseña incorrectos.' },
        { status: 401 } // 401 Unauthorized: No autorizado.
      );
    }

    // Comparamos la contraseña proporcionada con la contraseña hasheada almacenada.
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      // Log de intento de login fallido
      logAudit({
        userId: user.id,
        userName: user.nombre,
        action: 'LOGIN_FAILED',
        details: 'Contraseña incorrecta',
        ipAddress,
        userAgent
      });
      
      return NextResponse.json(
        { message: 'Usuario o contraseña incorrectos.' },
        { status: 401 } // 401 Unauthorized
      );
    }

    console.log(`Usuario ${user.nombre} autenticado correctamente.`);

    // ¡NUNCA guardes la contraseña en la sesión!
    const sessionUser = {
      id: user.id,
      nombre: user.nombre.toUpperCase(),
      rol: user.rol.toLowerCase(), // Mantener en minúsculas para consistencia
      dependencia: user.dependencia,
      puede_crear_plantillas: user.puede_crear_plantillas,
      is_super_admin: user.is_super_admin === 1,
    };

    // Si es aprobador, obtener las dependencias autorizadas
    if (user.rol?.toLowerCase() === 'aprobador') {
      const stmtDeps = db.prepare('SELECT dependencia_id FROM aprobador_dependencias WHERE usuario_id = ?');
      const deps = stmtDeps.all(user.id);
      sessionUser.authorized_dependencia_ids = deps.map(d => d.dependencia_id);
    }

    const token = createSessionToken(sessionUser); // Creamos el token JWT.
    const sessionCookie = serializeSessionCookie(token); // Convertimos el token en una cookie.

    // Log de login exitoso
    logAudit({
      userId: user.id,
      userName: user.nombre,
      action: 'LOGIN',
      details: `Rol: ${user.rol}`,
      ipAddress,
      userAgent
    });

    // Registrar sesión activa
    createSession(token, user.id, user.nombre, ipAddress, userAgent);

    // Devolvemos una respuesta de éxito con la cookie de sesión.
    const response = NextResponse.json(
      { message: 'Login exitoso.', user: sessionUser }, // Devolvemos el usuario para el frontend
      { status: 200 } // 200 OK: Todo salió bien.
    );
    response.headers.set('Set-Cookie', sessionCookie); // Añadimos la cookie a la cabecera de la respuesta.
    return response;

  } catch (error) {
    console.error('Error en /api/login:', error);
    return NextResponse.json(
      { message: error.message || 'Error interno del servidor. Por favor, contacta a soporte.' },
      { status: 500 } // 500 Internal Server Error
    );
  }
}