import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { 
  getSecurityConfig,
  getPasswordRequirements,
  isIpAllowed,
  removeIpFromAccessControl,
  toggleIpAccessControl,
  getFailedLoginStats,
  getRecentFailedAttempts,
  cleanOldFailedAttempts
} from '@/lib/security';
import { logAudit } from '@/lib/audit';

// Verificar que sea super admin
async function checkSuperAdminAuth(request) {
  const user = await getSession(request);
  
  if (!user || !user.is_super_admin) {
    return { authorized: false, message: 'Acceso denegado. Se requiere privilegios de super administrador.' };
  }
  
  return { authorized: true, user };
}

// GET: Obtener configuraciones y estadísticas de seguridad
export async function GET(request) {
  try {
    const auth = await checkSuperAdminAuth(request);
    if (!auth.authorized) {
      return NextResponse.json({ message: auth.message }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Obtener configuración completa
    if (action === 'config') {
      const config = getSecurityConfig();
      return NextResponse.json({ config });
    }

    // Obtener requisitos de contraseña
    if (action === 'password-requirements') {
      const requirements = getPasswordRequirements();
      return NextResponse.json({ requirements });
    }

    // Obtener lista de IPs
    if (action === 'ip-list') {
      const type = searchParams.get('type');
      return NextResponse.json({ ipList: [], message: 'Función no implementada' });
    }

    // Obtener estadísticas de intentos fallidos
    if (action === 'failed-login-stats') {
      const stats = getFailedLoginStats();
      return NextResponse.json(stats);
    }

    // Obtener intentos fallidos recientes
    if (action === 'recent-failed-attempts') {
      const limit = parseInt(searchParams.get('limit')) || 100;
      const attempts = getRecentFailedAttempts(limit);
      return NextResponse.json({ attempts });
    }

    // Limpiar intentos antiguos
    if (action === 'clean-old-attempts') {
      const days = parseInt(searchParams.get('days')) || 30;
      const result = cleanOldFailedAttempts(days);
      
      if (result.success && result.deleted > 0) {
        logAudit({
          userId: auth.user.id,
          userName: auth.user.nombre,
          action: 'DELETE',
          entityType: 'SECURITY',
          details: `${result.deleted} intentos fallidos antiguos eliminados (>${days} días)`
        });
      }
      
      return NextResponse.json(result);
    }

    // Por defecto, devolver configuración y estadísticas
    const config = getSecurityConfig();
    const stats = getFailedLoginStats();
    return NextResponse.json({ config, stats, ipList: [] });

  } catch (error) {
    console.error('Error en GET /api/super-admin/security:', error);
    return NextResponse.json(
      { message: 'Error al obtener configuración de seguridad' },
      { status: 500 }
    );
  }
}

// POST: Actualizar configuraciones o agregar IPs
export async function POST(request) {
  try {
    const auth = await checkSuperAdminAuth(request);
    if (!auth.authorized) {
      return NextResponse.json({ message: auth.message }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    // Actualizar configuración de seguridad
    if (action === 'update-config') {
      const { config } = body;
      return NextResponse.json({ success: false, message: 'Función no implementada' });
    }

    // Agregar IP a control de acceso
    if (action === 'add-ip') {
      const { ipAddress, type, reason, expiresAt } = body;
      
      return NextResponse.json({ success: false, message: 'Función no implementada' });
    }

    // Activar/desactivar IP
    if (action === 'toggle-ip') {
      const { id, isActive } = body;
      
      const success = toggleIpAccessControl(id, isActive);
      
      if (success) {
        logAudit({
          userId: auth.user.id,
          userName: auth.user.nombre,
          action: 'UPDATE',
          entityType: 'IP_ACCESS',
          entityId: id,
          details: `IP ${isActive ? 'activada' : 'desactivada'}`
        });
      }
      
      return NextResponse.json({ 
        success, 
        message: success ? 'Estado actualizado' : 'Error al actualizar'
      });
    }

    return NextResponse.json({ message: 'Acción no válida' }, { status: 400 });

  } catch (error) {
    console.error('Error en POST /api/super-admin/security:', error);
    return NextResponse.json(
      { message: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar IP del control de acceso
export async function DELETE(request) {
  try {
    const auth = await checkSuperAdminAuth(request);
    if (!auth.authorized) {
      return NextResponse.json({ message: auth.message }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id'));

    if (!id) {
      return NextResponse.json({ message: 'ID requerido' }, { status: 400 });
    }

    const success = removeIpFromAccessControl(id);
    
    if (success) {
      logAudit({
        userId: auth.user.id,
        userName: auth.user.nombre,
        action: 'DELETE',
        entityType: 'IP_ACCESS',
        entityId: id,
        details: 'IP removida del control de acceso'
      });
    }
    
    return NextResponse.json({ 
      success, 
      message: success ? 'IP eliminada correctamente' : 'Error al eliminar IP'
    });

  } catch (error) {
    console.error('Error en DELETE /api/super-admin/security:', error);
    return NextResponse.json(
      { message: 'Error al eliminar IP' },
      { status: 500 }
    );
  }
}
