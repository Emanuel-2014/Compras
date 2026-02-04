import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import db from './lib/db.js';

// La clave secreta ahora se lee desde las variables de entorno para mayor seguridad.
const JWT_SECRET = process.env.JWT_SECRET;

// Función para actualizar actividad de sesión
function updateSessionActivity(token) {
  try {
    const stmt = db.prepare(`
      UPDATE active_sessions 
      SET last_activity = CURRENT_TIMESTAMP 
      WHERE session_token = ? AND is_active = 1
    `);
    stmt.run(token);
  } catch (error) {
    console.error('Error al actualizar actividad de sesión:', error);
  }
}

export default function proxy(request) {
  if (!JWT_SECRET) {
    console.error('CRITICAL_ERROR: JWT_SECRET no está definido en las variables de entorno.');
    // En un entorno de producción, podrías redirigir a una página de error genérica.
    // Por ahora, bloqueamos el acceso para dejar claro el problema de configuración.
    const absoluteUrl = new URL('/license-expired', request.url);
    return NextResponse.redirect(absoluteUrl);
  }

  const { pathname } = request.nextUrl;

  // Rutas que no queremos proteger (la propia página de expiración y archivos estáticos)
  if (
    pathname.startsWith('/license-expired') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/api/')
  ) {
    return NextResponse.next();
  }

  // Trackear actividad de sesión si hay token
  const token = request.cookies.get('token')?.value;
  if (token) {
    updateSessionActivity(token);
  }

  const licenseKey = process.env.LICENSE_KEY;
  const absoluteUrl = new URL('/license-expired', request.url);

  if (!licenseKey) {
    console.error('LICENSE_ERROR: No se encontró la variable de entorno LICENSE_KEY.');
    return NextResponse.redirect(absoluteUrl);
  }

  try {
    const decoded = jwt.verify(licenseKey, JWT_SECRET);
    const expirationDate = new Date(decoded.expiresOn);
    const today = new Date();

    // La hora se establece a 0 para comparar solo las fechas
    today.setHours(0, 0, 0, 0);
    
    if (expirationDate < today) {
      console.warn('LICENSE_EXPIRED: La licencia ha expirado el', decoded.expiresOn);
      return NextResponse.redirect(absoluteUrl);
    }

    // Si la licencia es válida, permite que la solicitud continúe
    return NextResponse.next();

  } catch (error) {
    console.error('LICENSE_INVALID: La licencia no es válida o está corrupta.', error.message);
    return NextResponse.redirect(absoluteUrl);
  }
}

// Configuración para que el middleware se aplique a todas las rutas excepto las de la API
export const config = {
  matcher: '/((?!api).*)',
};
