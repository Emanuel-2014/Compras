import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  vacuumDatabase,
  reindexDatabase,
  analyzeDatabase,
  checkIntegrity,
  getDatabaseStats,
  cleanOldAuditLogs,
  cleanExpiredSessions,
  cleanOldFailedLogins,
  fullOptimization
} from '@/lib/maintenance';
import { logAudit } from '@/lib/audit';

// Verificar que sea super admin
async function checkSuperAdminAuth(request) {
  const user = await getSession(request);
  
  if (!user || !user.is_super_admin) {
    return { authorized: false, message: 'Acceso denegado. Se requiere privilegios de super administrador.' };
  }
  
  return { authorized: true, user };
}

// GET: Obtener estadísticas de la base de datos
export async function GET(request) {
  try {
    const auth = await checkSuperAdminAuth(request);
    if (!auth.authorized) {
      return NextResponse.json({ message: auth.message }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Verificar integridad
    if (action === 'integrity') {
      const result = checkIntegrity();
      return NextResponse.json(result);
    }

    // Estadísticas de la base de datos (por defecto)
    const stats = getDatabaseStats();
    return NextResponse.json(stats);

  } catch (error) {
    console.error('Error en GET /api/super-admin/maintenance:', error);
    return NextResponse.json(
      { message: 'Error al obtener información de mantenimiento' },
      { status: 500 }
    );
  }
}

// POST: Ejecutar operaciones de mantenimiento
export async function POST(request) {
  try {
    const auth = await checkSuperAdminAuth(request);
    if (!auth.authorized) {
      return NextResponse.json({ message: auth.message }, { status: 403 });
    }

    const body = await request.json();
    const { action, params = {} } = body;

    let result;

    switch (action) {
      case 'vacuum':
        result = vacuumDatabase();
        logAudit({
          userId: auth.user.id,
          userName: auth.user.nombre,
          action: 'MAINTENANCE',
          entityType: 'DATABASE',
          details: 'VACUUM ejecutado: ' + result.message
        });
        break;

      case 'reindex':
        result = reindexDatabase();
        logAudit({
          userId: auth.user.id,
          userName: auth.user.nombre,
          action: 'MAINTENANCE',
          entityType: 'DATABASE',
          details: 'REINDEX ejecutado: ' + result.message
        });
        break;

      case 'analyze':
        result = analyzeDatabase();
        logAudit({
          userId: auth.user.id,
          userName: auth.user.nombre,
          action: 'MAINTENANCE',
          entityType: 'DATABASE',
          details: 'ANALYZE ejecutado: ' + result.message
        });
        break;

      case 'full-optimization':
        result = fullOptimization();
        logAudit({
          userId: auth.user.id,
          userName: auth.user.nombre,
          action: 'MAINTENANCE',
          entityType: 'DATABASE',
          details: 'Optimización completa ejecutada'
        });
        break;

      case 'clean-audit-logs':
        const daysToKeep = params.daysToKeep || 90;
        result = cleanOldAuditLogs(daysToKeep);
        logAudit({
          userId: auth.user.id,
          userName: auth.user.nombre,
          action: 'MAINTENANCE',
          entityType: 'DATA',
          details: result.message
        });
        break;

      case 'clean-sessions':
        result = cleanExpiredSessions();
        logAudit({
          userId: auth.user.id,
          userName: auth.user.nombre,
          action: 'MAINTENANCE',
          entityType: 'DATA',
          details: result.message
        });
        break;

      case 'clean-failed-logins':
        const failedLoginDays = params.daysToKeep || 30;
        result = cleanOldFailedLogins(failedLoginDays);
        logAudit({
          userId: auth.user.id,
          userName: auth.user.nombre,
          action: 'MAINTENANCE',
          entityType: 'DATA',
          details: result.message
        });
        break;

      default:
        return NextResponse.json({ message: 'Acción no válida' }, { status: 400 });
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error en POST /api/super-admin/maintenance:', error);
    return NextResponse.json(
      { message: 'Error al ejecutar operación de mantenimiento: ' + error.message },
      { status: 500 }
    );
  }
}
