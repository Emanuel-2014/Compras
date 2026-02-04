import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { 
  getActiveSessions, 
  getUserSessions, 
  closeSession, 
  closeUserSessions,
  cleanExpiredSessions,
  deleteOldSessions,
  getSessionStats
} from '@/lib/sessions';
import { logAudit } from '@/lib/audit';

// Verificar que sea super admin
async function checkSuperAdminAuth(request) {
  const user = await getSession(request);
  
  if (!user || !user.is_super_admin) {
    return { authorized: false, message: 'Acceso denegado. Se requiere privilegios de super administrador.' };
  }
  
  return { authorized: true, user };
}

// GET: Obtener sesiones activas
export async function GET(request) {
  try {
    const auth = await checkSuperAdminAuth(request);
    if (!auth.authorized) {
      return NextResponse.json({ message: auth.message }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');

    // Estadísticas de sesiones
    if (action === 'stats') {
      const stats = getSessionStats();
      return NextResponse.json(stats);
    }

    // Limpiar sesiones expiradas
    if (action === 'clean') {
      const result = cleanExpiredSessions();
      
      if (result.success && result.cleaned > 0) {
        logAudit({
          userId: auth.user.id,
          userName: auth.user.nombre,
          action: 'DELETE',
          entityType: 'SESSION',
          details: `${result.cleaned} sesiones expiradas limpiadas`
        });
      }
      
      return NextResponse.json(result);
    }

    // Eliminar sesiones antiguas
    if (action === 'delete-old') {
      const days = parseInt(searchParams.get('days')) || 30;
      const result = deleteOldSessions(days);
      
      if (result.success && result.deleted > 0) {
        logAudit({
          userId: auth.user.id,
          userName: auth.user.nombre,
          action: 'DELETE',
          entityType: 'SESSION',
          details: `${result.deleted} sesiones antiguas eliminadas (>${days} días)`
        });
      }
      
      return NextResponse.json(result);
    }

    // Sesiones de un usuario específico
    if (userId) {
      const sessions = getUserSessions(parseInt(userId));
      return NextResponse.json({ sessions });
    }

    // Todas las sesiones activas
    const sessions = getActiveSessions();
    return NextResponse.json({ sessions });

  } catch (error) {
    console.error('Error en GET /api/super-admin/sessions:', error);
    return NextResponse.json(
      { message: 'Error al obtener sesiones' },
      { status: 500 }
    );
  }
}

// POST: Cerrar sesión(es)
export async function POST(request) {
  try {
    const auth = await checkSuperAdminAuth(request);
    if (!auth.authorized) {
      return NextResponse.json({ message: auth.message }, { status: 403 });
    }

    const body = await request.json();
    const { action, sessionToken, userId } = body;

    // Cerrar sesión específica
    if (action === 'close-session' && sessionToken) {
      const success = closeSession(sessionToken);
      
      if (success) {
        logAudit({
          userId: auth.user.id,
          userName: auth.user.nombre,
          action: 'DELETE',
          entityType: 'SESSION',
          details: 'Sesión cerrada manualmente por super admin'
        });
      }
      
      return NextResponse.json({ 
        success, 
        message: success ? 'Sesión cerrada correctamente' : 'No se pudo cerrar la sesión'
      });
    }

    // Cerrar todas las sesiones de un usuario
    if (action === 'close-user-sessions' && userId) {
      const result = closeUserSessions(userId);
      
      if (result.success && result.closed > 0) {
        logAudit({
          userId: auth.user.id,
          userName: auth.user.nombre,
          action: 'DELETE',
          entityType: 'SESSION',
          details: `${result.closed} sesiones cerradas para usuario ID: ${userId}`
        });
      }
      
      return NextResponse.json({
        success: result.success,
        closed: result.closed,
        message: `${result.closed} sesión(es) cerrada(s)`
      });
    }

    return NextResponse.json({ message: 'Acción no válida' }, { status: 400 });

  } catch (error) {
    console.error('Error en POST /api/super-admin/sessions:', error);
    return NextResponse.json(
      { message: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}
