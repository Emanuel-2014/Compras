import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { 
  getSystemStats, 
  getServerInfo, 
  getActivityStats, 
  getDatabaseMetrics,
  getUserStats,
  getTopActiveUsers,
  getStorageStats
} from '@/lib/monitor';

// Verificar que sea super admin
async function checkSuperAdminAuth(request) {
  const user = await getSession(request);
  
  if (!user || !user.is_super_admin) {
    return { authorized: false, message: 'Acceso denegado. Se requiere privilegios de super administrador.' };
  }
  
  return { authorized: true, user };
}

export async function GET(request) {
  try {
    const auth = await checkSuperAdminAuth(request);
    if (!auth.authorized) {
      return NextResponse.json({ message: auth.message }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    // Estadísticas del sistema
    if (type === 'system') {
      const stats = getSystemStats();
      return NextResponse.json(stats);
    }

    // Información del servidor
    if (type === 'server') {
      const info = getServerInfo();
      return NextResponse.json(info);
    }

    // Estadísticas de actividad
    if (type === 'activity') {
      const days = parseInt(searchParams.get('days')) || 7;
      const activity = getActivityStats(days);
      return NextResponse.json(activity);
    }

    // Métricas de la base de datos
    if (type === 'database') {
      const metrics = getDatabaseMetrics();
      return NextResponse.json(metrics);
    }

    // Estadísticas de usuarios
    if (type === 'users') {
      const userStats = getUserStats();
      return NextResponse.json(userStats);
    }

    // Top usuarios activos
    if (type === 'top-users') {
      const limit = parseInt(searchParams.get('limit')) || 10;
      const topUsers = getTopActiveUsers(limit);
      return NextResponse.json(topUsers);
    }

    // Estadísticas de almacenamiento
    if (type === 'storage') {
      const storage = getStorageStats();
      return NextResponse.json(storage);
    }

    // Por defecto, devolver todas las estadísticas
    const systemStats = getSystemStats();
    const serverInfo = getServerInfo();
    const userStats = getUserStats();
    const storage = getStorageStats();

    return NextResponse.json({
      system: systemStats,
      server: serverInfo,
      users: userStats,
      storage
    });

  } catch (error) {
    console.error('Error en GET /api/super-admin/monitor:', error);
    return NextResponse.json(
      { message: 'Error al obtener información del sistema' },
      { status: 500 }
    );
  }
}
