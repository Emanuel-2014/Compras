// lib/auth.js
// Este archivo contendrá funciones para manejar la sesión del usuario.

import { serialize } from 'cookie';
import { cookies } from 'next/headers';
import { sign, verify } from 'jsonwebtoken';
import db from './db';

// Clave secreta para firmar y verificar el token de sesión.
// ¡IMPORTANTE! En producción, esto debería ser una variable de entorno segura.
const SECRET = process.env.JWT_SECRET || 'supersecretkey'; 

// Duración del token de sesión (ej. 1 hora).
const MAX_AGE = 60 * 60; // 1 hora en segundos

/**
 * Crea un token de sesión JWT (JSON Web Token) con los datos del usuario.
 * @param {object} user - Objeto con los datos del usuario (ej. { id: 1, nombre: 'Admin', rol: 'administrador' }).
 * @returns {string} El token JWT firmado.
 */
export function createSessionToken(user) {
  // Firmamos el token con los datos del usuario y la clave secreta.
  // El token expirará después de MAX_AGE segundos.
  return sign(user, SECRET, { expiresIn: MAX_AGE });
}

/**
 * Verifica un token de sesión JWT.
 * @param {string} token - El token JWT a verificar.
 * @returns {object|null} Los datos del usuario si el token es válido, o null si no lo es.
 */
export function verifySessionToken(token) {
  try {
    // Verificamos el token con la clave secreta.
    return verify(token, SECRET);
  } catch (error) {
    // Si el token es inválido o ha expirado, devuelve null.
    return null;
  }
}

/**
 * Serializa un token de sesión en una cookie para ser enviada al navegador.
 * @param {string} token - El token JWT a serializar.
 * @returns {string} La cadena de la cookie 'Set-Cookie'.
 */
export function serializeSessionCookie(token) {
  return serialize('session', token, {
    httpOnly: true, // La cookie no es accesible desde JavaScript del lado del cliente (seguridad).
    secure: process.env.NODE_ENV === 'production', // Solo se envía sobre HTTPS en producción.
    maxAge: MAX_AGE, // Duración de la cookie.
    path: '/', // La cookie es válida para toda la aplicación.
    sameSite: 'lax', // Protección contra ataques CSRF.
  });
}

/**
 * Serializa una cookie de sesión para destruirla (cerrar sesión).
 * @returns {string} La cadena de la cookie 'Set-Cookie' para expirar la sesión.
 */
export function serializeLogoutCookie() {
  return serialize('session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0, // Establece la edad máxima a 0 para que expire inmediatamente.
    path: '/',
    sameSite: 'lax',
  });
}

/**
 * Obtiene la sesión del usuario a partir de la cookie de sesión.
 * Esta función está diseñada para ser usada en Server Components y API Routes.
 * @returns {Promise<object|null>} El objeto de usuario de la sesión o null si no hay sesión.
 */
export async function getSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');
  console.log('Session cookie in getSession:', sessionCookie);

  if (sessionCookie) {
    const user = verifySessionToken(sessionCookie.value);

    if (user && user.rol && user.rol.toLowerCase().trim().startsWith('aprobador')) {
      const authorizedDependencias = db.prepare(
        'SELECT dependencia_id FROM aprobador_dependencias WHERE usuario_id = ?'
      ).all(user.id);
      user.authorized_dependencia_ids = authorizedDependencias.map(d => d.dependencia_id);
    }

    // Agregar información de super admin si es necesario
    if (user && user.id) {
      const userInfo = db.prepare('SELECT is_super_admin FROM usuarios WHERE id = ?').get(user.id);
      user.is_super_admin = userInfo?.is_super_admin === 1;
    }

    return user;
  }

  return null;
}
