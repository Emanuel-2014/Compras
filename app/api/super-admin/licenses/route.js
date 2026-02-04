// app/api/super-admin/licenses/route.js
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import { logAudit } from '@/lib/audit';

const JWT_SECRET = process.env.JWT_SECRET;

// Verificar que el usuario sea super admin
async function checkSuperAdminAuth() {
  const user = await getSession();
  
  if (!user || !user.is_super_admin) {
    return { authorized: false, message: 'Acceso denegado. Se requiere privilegios de super administrador.' };
  }
  
  return { authorized: true, user };
}

// GET: Obtener todas las licencias aplicadas
export async function GET() {
  try {
    const auth = await checkSuperAdminAuth();
    if (!auth.authorized) {
      return NextResponse.json({ message: auth.message }, { status: 403 });
    }

    const stmt = db.prepare(`
      SELECT 
        l.id,
        l.license_key,
        l.applied_date,
        l.expires_on,
        l.status,
        l.notes,
        u.nombre as applied_by_user_name
      FROM licenses l
      LEFT JOIN usuarios u ON l.applied_by_user_id = u.id
      ORDER BY l.applied_date DESC
    `);

    const licenses = stmt.all();

    return NextResponse.json(licenses, { status: 200 });
  } catch (error) {
    console.error('Error al obtener licencias:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor al obtener licencias.' },
      { status: 500 }
    );
  }
}

// POST: Aplicar una nueva licencia
export async function POST(request) {
  try {
    const auth = await checkSuperAdminAuth();
    if (!auth.authorized) {
      return NextResponse.json({ message: auth.message }, { status: 403 });
    }

    const { license_key, notes } = await request.json();

    if (!license_key) {
      return NextResponse.json({ message: 'La clave de licencia es obligatoria.' }, { status: 400 });
    }

    // Verificar que el JWT_SECRET esté configurado
    if (!JWT_SECRET) {
      return NextResponse.json({ message: 'Error de configuración del servidor.' }, { status: 500 });
    }

    // Verificar que la licencia sea válida
    let decoded;
    try {
      decoded = jwt.verify(license_key, JWT_SECRET);
    } catch (error) {
      return NextResponse.json({ message: 'La licencia no es válida o está corrupta.' }, { status: 400 });
    }

    // Verificar que tenga fecha de expiración
    if (!decoded.expiresOn) {
      return NextResponse.json({ message: 'La licencia no tiene fecha de expiración válida.' }, { status: 400 });
    }

    const expirationDate = new Date(decoded.expiresOn);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Verificar que no esté expirada
    if (expirationDate < today) {
      return NextResponse.json({ message: 'La licencia ya ha expirado.' }, { status: 400 });
    }

    // Verificar que la licencia no esté ya registrada
    const existingLicense = db.prepare('SELECT id FROM licenses WHERE license_key = ?').get(license_key);
    if (existingLicense) {
      return NextResponse.json({ message: 'Esta licencia ya ha sido aplicada anteriormente.' }, { status: 400 });
    }

    // Insertar la licencia en la base de datos
    const stmt = db.prepare(`
      INSERT INTO licenses (license_key, applied_by_user_id, expires_on, status, notes)
      VALUES (?, ?, ?, 'active', ?)
    `);

    const result = stmt.run(license_key, auth.user.id, decoded.expiresOn, notes || '');

    // Registrar en auditoría
    logAudit({
      userId: auth.user.id,
      userName: auth.user.nombre,
      action: 'CREATE',
      entityType: 'LICENSE',
      entityId: result.lastInsertRowid,
      details: `Licencia aplicada. Expira: ${decoded.expiresOn}`
    });

    // Actualizar el archivo .env.local con la nueva licencia
    try {
      const envPath = '.env.local';
      let envContent = '';

      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
      }

      // Actualizar o agregar LICENSE_KEY
      if (envContent.includes('LICENSE_KEY=')) {
        envContent = envContent.replace(/LICENSE_KEY=.*/g, `LICENSE_KEY="${license_key}"`);
      } else {
        envContent += `\nLICENSE_KEY="${license_key}"\n`;
      }

      fs.writeFileSync(envPath, envContent);
      console.log('Licencia actualizada en .env.local');

    } catch (error) {
      console.error('Error al actualizar .env.local:', error);
      return NextResponse.json({ 
        message: 'Licencia guardada en la base de datos, pero no se pudo actualizar el archivo .env.local. Deberás hacerlo manualmente.' 
      }, { status: 207 });
    }

    return NextResponse.json({ 
      message: 'Licencia aplicada exitosamente.',
      license: {
        id: result.lastInsertRowid,
        expires_on: decoded.expiresOn,
        status: 'active'
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error al aplicar licencia:', error);
    return NextResponse.json(
      { message: error.message || 'Error interno del servidor al aplicar la licencia.' },
      { status: 500 }
    );
  }
}

// DELETE: Desactivar una licencia (cambiar status a 'revoked')
export async function DELETE(request) {
  try {
    const auth = await checkSuperAdminAuth();
    if (!auth.authorized) {
      return NextResponse.json({ message: auth.message }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const licenseId = searchParams.get('id');

    if (!licenseId) {
      return NextResponse.json({ message: 'ID de licencia requerido.' }, { status: 400 });
    }

    const stmt = db.prepare('UPDATE licenses SET status = ? WHERE id = ?');
    const result = stmt.run('revoked', licenseId);

    if (result.changes === 0) {
      return NextResponse.json({ message: 'Licencia no encontrada.' }, { status: 404 });
    }

    // Registrar en auditoría
    logAudit({
      userId: auth.user.id,
      userName: auth.user.nombre,
      action: 'DELETE',
      entityType: 'LICENSE',
      entityId: parseInt(licenseId),
      details: 'Licencia revocada'
    });

    return NextResponse.json({ message: 'Licencia revocada exitosamente.' }, { status: 200 });

  } catch (error) {
    console.error('Error al revocar licencia:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor al revocar la licencia.' },
      { status: 500 }
    );
  }
}
