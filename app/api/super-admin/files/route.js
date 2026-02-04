import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  getStorageStats,
  listAllFiles,
  findOrphanFiles,
  deleteFile,
  deleteMultipleFiles,
  cleanOrphanFiles,
  deleteOldFiles,
  cleanEmptyDirectories,
  searchFiles
} from '@/lib/files';
import { logAudit } from '@/lib/audit';

// Verificar que sea super admin
async function checkSuperAdminAuth(request) {
  const user = await getSession(request);
  
  if (!user || !user.is_super_admin) {
    return { authorized: false, message: 'Acceso denegado. Se requiere privilegios de super administrador.' };
  }
  
  return { authorized: true, user };
}

// GET: Obtener información de archivos
export async function GET(request) {
  try {
    const auth = await checkSuperAdminAuth(request);
    if (!auth.authorized) {
      return NextResponse.json({ message: auth.message }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Estadísticas de almacenamiento
    if (action === 'stats') {
      const stats = getStorageStats();
      return NextResponse.json(stats);
    }

    // Listar todos los archivos
    if (action === 'list') {
      const sortBy = searchParams.get('sortBy') || 'name';
      const order = searchParams.get('order') || 'asc';
      const files = listAllFiles(sortBy, order);
      return NextResponse.json({ files, count: files.length });
    }

    // Buscar archivos huérfanos
    if (action === 'orphans') {
      const result = findOrphanFiles();
      return NextResponse.json(result);
    }

    // Buscar archivos
    if (action === 'search') {
      const query = searchParams.get('query') || '';
      const searchIn = searchParams.get('searchIn') || 'name';
      const results = searchFiles(query, searchIn);
      return NextResponse.json({ files: results, count: results.length });
    }

    // Por defecto, devolver estadísticas
    const stats = getStorageStats();
    return NextResponse.json(stats);

  } catch (error) {
    console.error('Error en GET /api/super-admin/files:', error);
    return NextResponse.json(
      { message: 'Error al obtener información de archivos' },
      { status: 500 }
    );
  }
}

// POST: Ejecutar acciones de limpieza
export async function POST(request) {
  try {
    const auth = await checkSuperAdminAuth(request);
    if (!auth.authorized) {
      return NextResponse.json({ message: auth.message }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    // Limpiar archivos huérfanos
    if (action === 'clean-orphans') {
      const result = cleanOrphanFiles();
      
      if (result.success > 0) {
        logAudit({
          userId: auth.user.id,
          userName: auth.user.nombre,
          action: 'DELETE',
          entityType: 'FILE',
          details: `${result.success} archivo(s) huérfano(s) eliminado(s)`
        });
      }
      
      return NextResponse.json({
        success: true,
        deleted: result.success,
        failed: result.failed,
        errors: result.errors,
        message: `${result.success} archivo(s) eliminado(s), ${result.failed} fallo(s)`
      });
    }

    // Eliminar archivos antiguos
    if (action === 'delete-old') {
      const days = body.days || 365;
      const result = deleteOldFiles(days);
      
      if (result.success > 0) {
        logAudit({
          userId: auth.user.id,
          userName: auth.user.nombre,
          action: 'DELETE',
          entityType: 'FILE',
          details: `${result.success} archivo(s) antiguo(s) eliminado(s) (>${days} días)`
        });
      }
      
      return NextResponse.json({
        success: true,
        deleted: result.success,
        failed: result.failed,
        errors: result.errors,
        message: `${result.success} archivo(s) eliminado(s), ${result.failed} fallo(s)`
      });
    }

    // Limpiar directorios vacíos
    if (action === 'clean-empty-dirs') {
      const cleaned = cleanEmptyDirectories();
      
      if (cleaned > 0) {
        logAudit({
          userId: auth.user.id,
          userName: auth.user.nombre,
          action: 'DELETE',
          entityType: 'DIRECTORY',
          details: `${cleaned} directorio(s) vacío(s) eliminado(s)`
        });
      }
      
      return NextResponse.json({
        success: true,
        cleaned,
        message: `${cleaned} directorio(s) vacío(s) eliminado(s)`
      });
    }

    // Eliminar archivos específicos
    if (action === 'delete-files') {
      const { files } = body;
      
      if (!files || !Array.isArray(files)) {
        return NextResponse.json({ message: 'Lista de archivos requerida' }, { status: 400 });
      }

      const result = deleteMultipleFiles(files);
      
      if (result.success > 0) {
        logAudit({
          userId: auth.user.id,
          userName: auth.user.nombre,
          action: 'DELETE',
          entityType: 'FILE',
          details: `${result.success} archivo(s) eliminado(s) manualmente`
        });
      }
      
      return NextResponse.json({
        success: true,
        deleted: result.success,
        failed: result.failed,
        errors: result.errors,
        message: `${result.success} archivo(s) eliminado(s), ${result.failed} fallo(s)`
      });
    }

    return NextResponse.json({ message: 'Acción no válida' }, { status: 400 });

  } catch (error) {
    console.error('Error en POST /api/super-admin/files:', error);
    return NextResponse.json(
      { message: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar un archivo específico
export async function DELETE(request) {
  try {
    const auth = await checkSuperAdminAuth(request);
    if (!auth.authorized) {
      return NextResponse.json({ message: auth.message }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');

    if (!filePath) {
      return NextResponse.json({ message: 'Ruta de archivo requerida' }, { status: 400 });
    }

    const result = deleteFile(filePath);
    
    if (result.success) {
      logAudit({
        userId: auth.user.id,
        userName: auth.user.nombre,
        action: 'DELETE',
        entityType: 'FILE',
        details: `Archivo eliminado: ${filePath}`
      });
    }
    
    return NextResponse.json(result);

  } catch (error) {
    console.error('Error en DELETE /api/super-admin/files:', error);
    return NextResponse.json(
      { message: 'Error al eliminar archivo' },
      { status: 500 }
    );
  }
}
