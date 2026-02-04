import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  exportUsers,
  exportProviders,
  exportRequests,
  importUsers,
  importProviders,
  getUserTemplate,
  getProviderTemplate
} from '@/lib/import-export';
import { logAudit } from '@/lib/audit';

// Verificar que sea super admin
async function checkSuperAdminAuth(request) {
  const user = await getSession(request);
  
  if (!user || !user.is_super_admin) {
    return { authorized: false, message: 'Acceso denegado. Se requiere privilegios de super administrador.' };
  }
  
  return { authorized: true, user };
}

// GET: Exportar datos o descargar plantillas
export async function GET(request) {
  try {
    const auth = await checkSuperAdminAuth(request);
    if (!auth.authorized) {
      return NextResponse.json({ message: auth.message }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const type = searchParams.get('type');

    // Descargar plantillas
    if (action === 'template') {
      let buffer;
      let filename;

      if (type === 'users') {
        buffer = await getUserTemplate();
        filename = 'plantilla_usuarios.xlsx';
      } else if (type === 'providers') {
        buffer = await getProviderTemplate();
        filename = 'plantilla_proveedores.xlsx';
      } else {
        return NextResponse.json({ message: 'Tipo de plantilla no válido' }, { status: 400 });
      }

      logAudit({
        userId: auth.user.id,
        userName: auth.user.nombre,
        action: 'DOWNLOAD',
        entityType: 'TEMPLATE',
        details: `Plantilla descargada: ${type}`
      });

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      });
    }

    // Exportar datos
    if (action === 'export') {
      let buffer;
      let filename;
      let entityName;

      if (type === 'users') {
        buffer = await exportUsers();
        filename = `usuarios_${Date.now()}.xlsx`;
        entityName = 'usuarios';
      } else if (type === 'providers') {
        buffer = await exportProviders();
        filename = `proveedores_${Date.now()}.xlsx`;
        entityName = 'proveedores';
      } else if (type === 'requests') {
        const filters = {
          estado: searchParams.get('estado'),
          fechaInicio: searchParams.get('fechaInicio'),
          fechaFin: searchParams.get('fechaFin'),
          dependenciaId: searchParams.get('dependenciaId')
        };
        buffer = await exportRequests(filters);
        filename = `solicitudes_${Date.now()}.xlsx`;
        entityName = 'solicitudes';
      } else {
        return NextResponse.json({ message: 'Tipo de exportación no válido' }, { status: 400 });
      }

      logAudit({
        userId: auth.user.id,
        userName: auth.user.nombre,
        action: 'EXPORT',
        entityType: 'DATA',
        details: `Exportación de ${entityName}`
      });

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      });
    }

    return NextResponse.json({ message: 'Acción no válida' }, { status: 400 });

  } catch (error) {
    console.error('Error en GET /api/super-admin/import-export:', error);
    return NextResponse.json(
      { message: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}

// POST: Importar datos desde Excel
export async function POST(request) {
  try {
    const auth = await checkSuperAdminAuth(request);
    if (!auth.authorized) {
      return NextResponse.json({ message: auth.message }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const type = formData.get('type');

    if (!file) {
      return NextResponse.json({ message: 'Archivo no proporcionado' }, { status: 400 });
    }

    // Convertir el archivo a buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let results;
    let entityName;

    if (type === 'users') {
      results = await importUsers(buffer);
      entityName = 'usuarios';
    } else if (type === 'providers') {
      results = await importProviders(buffer);
      entityName = 'proveedores';
    } else {
      return NextResponse.json({ message: 'Tipo de importación no válido' }, { status: 400 });
    }

    logAudit({
      userId: auth.user.id,
      userName: auth.user.nombre,
      action: 'IMPORT',
      entityType: 'DATA',
      details: `Importación de ${entityName}: ${results.success} exitosos, ${results.errors.length} errores`
    });

    return NextResponse.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('Error en POST /api/super-admin/import-export:', error);
    return NextResponse.json(
      { message: 'Error al importar datos: ' + error.message },
      { status: 500 }
    );
  }
}
