import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAuditLogs, countAuditLogs, getAuditStats } from '@/lib/audit';

export async function GET(request) {
  try {
    const user = await getSession(request);
    
    // Verificar que sea super admin
    if (!user || !user.is_super_admin) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    // Si se solicitan estadísticas
    if (action === 'stats') {
      const stats = getAuditStats();
      return NextResponse.json(stats);
    }

    // Obtener filtros
    const filters = {
      userId: searchParams.get('userId') ? parseInt(searchParams.get('userId')) : null,
      action: searchParams.get('filterAction'),
      entityType: searchParams.get('entityType'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')) : 100,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')) : 0
    };

    // Limpiar filtros nulos
    Object.keys(filters).forEach(key => {
      if (filters[key] === null || filters[key] === '') {
        delete filters[key];
      }
    });

    const logs = getAuditLogs(filters);
    const total = countAuditLogs(filters);

    return NextResponse.json({
      logs,
      total,
      limit: filters.limit || 100,
      offset: filters.offset || 0
    });

  } catch (error) {
    console.error('Error en GET /api/super-admin/audit:', error);
    return NextResponse.json(
      { error: 'Error al obtener logs de auditoría' },
      { status: 500 }
    );
  }
}
