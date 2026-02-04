import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createBackup, listBackups, deleteBackup, restoreBackup, getDatabaseInfo, cleanOldBackups } from '@/lib/backup';
import { logAudit } from '@/lib/audit';
import fs from 'fs';
import path from 'path';

// Verificar que sea super admin
async function checkSuperAdminAuth(request) {
  const user = await getSession(request);
  
  if (!user || !user.is_super_admin) {
    return { authorized: false, message: 'Acceso denegado. Se requiere privilegios de super administrador.' };
  }
  
  return { authorized: true, user };
}

// GET: Listar backups o descargar un backup específico
export async function GET(request) {
  try {
    const auth = await checkSuperAdminAuth(request);
    if (!auth.authorized) {
      return NextResponse.json({ message: auth.message }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const filename = searchParams.get('filename');

    // Descargar backup
    if (action === 'download' && filename) {
      const backupPath = path.join(process.cwd(), 'backups', filename);
      
      if (!fs.existsSync(backupPath) || !backupPath.includes('backups')) {
        return NextResponse.json({ message: 'Backup no encontrado' }, { status: 404 });
      }

      const fileBuffer = fs.readFileSync(backupPath);
      
      // Registrar auditoría
      logAudit({
        userId: auth.user.id,
        userName: auth.user.nombre,
        action: 'VIEW',
        entityType: 'BACKUP',
        details: `Descarga de backup: ${filename}`
      });

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'application/x-sqlite3',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': fileBuffer.length.toString()
        }
      });
    }

    // Obtener información de la BD
    if (action === 'info') {
      const info = getDatabaseInfo();
      return NextResponse.json(info);
    }

    // Limpiar backups antiguos
    if (action === 'clean') {
      const days = parseInt(searchParams.get('days')) || 30;
      const result = cleanOldBackups(days);
      
      if (result.success) {
        logAudit({
          userId: auth.user.id,
          userName: auth.user.nombre,
          action: 'DELETE',
          entityType: 'BACKUP',
          details: `Limpieza automática: ${result.deleted} backups eliminados (>${days} días)`
        });
      }
      
      return NextResponse.json(result);
    }

    // Listar backups
    const backups = listBackups();
    return NextResponse.json({ backups });

  } catch (error) {
    console.error('Error en GET /api/super-admin/backup:', error);
    return NextResponse.json(
      { message: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}

// POST: Crear un nuevo backup
export async function POST(request) {
  try {
    const auth = await checkSuperAdminAuth(request);
    if (!auth.authorized) {
      return NextResponse.json({ message: auth.message }, { status: 403 });
    }

    const { description, action, filename } = await request.json();

    // Restaurar backup
    if (action === 'restore' && filename) {
      const result = await restoreBackup(filename);
      
      if (result.success) {
        logAudit({
          userId: auth.user.id,
          userName: auth.user.nombre,
          action: 'UPDATE',
          entityType: 'DATABASE',
          details: `Base de datos restaurada desde: ${filename}. Backup de seguridad: ${result.safetyBackup}`
        });
      }
      
      return NextResponse.json(result);
    }

    // Crear backup
    const result = createBackup(description, auth.user.id, auth.user.nombre);
    
    if (result.success) {
      logAudit({
        userId: auth.user.id,
        userName: auth.user.nombre,
        action: 'CREATE',
        entityType: 'BACKUP',
        details: `Backup creado: ${result.filename}. Tamaño: ${(result.size / 1024 / 1024).toFixed(2)} MB. Descripción: ${description || 'Sin descripción'}`
      });
    }

    return NextResponse.json(result, { status: result.success ? 201 : 500 });

  } catch (error) {
    console.error('Error en POST /api/super-admin/backup:', error);
    return NextResponse.json(
      { message: 'Error al crear el backup' },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar un backup
export async function DELETE(request) {
  try {
    const auth = await checkSuperAdminAuth(request);
    if (!auth.authorized) {
      return NextResponse.json({ message: auth.message }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json({ message: 'Nombre de archivo requerido' }, { status: 400 });
    }

    const result = deleteBackup(filename);
    
    if (result.success) {
      logAudit({
        userId: auth.user.id,
        userName: auth.user.nombre,
        action: 'DELETE',
        entityType: 'BACKUP',
        details: `Backup eliminado: ${filename}`
      });
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error en DELETE /api/super-admin/backup:', error);
    return NextResponse.json(
      { message: 'Error al eliminar el backup' },
      { status: 500 }
    );
  }
}
