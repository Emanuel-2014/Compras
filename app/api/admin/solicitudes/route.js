// app/api/admin/solicitudes/route.js
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifySessionToken } from '@/lib/auth';
import { cookies } from 'next/headers';

async function checkAdminAuth() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');
  if (!sessionCookie) {
    return { authorized: false, message: 'No hay sesión activa.' };
  }
  const user = verifySessionToken(sessionCookie.value);
  if (!user || !['administrador', 'coordinador', 'aprobador'].includes(user.rol)) { // Allow approvers
    return { authorized: false, message: 'Acceso denegado. Se requiere rol de administrador, coordinador o aprobador.' };
  }
  return { authorized: true, user };
}

export async function GET(req) {
  try {
    const auth = await checkAdminAuth();
    if (!auth.authorized) {
      return NextResponse.json({ message: auth.message }, { status: 403 });
    }
    const { user } = auth; // Get the logged-in user

    const { searchParams } = new URL(req.url);
    const dependencia = searchParams.get('dependencia');
    const solicitanteId = searchParams.get('solicitanteId');
    const fecha = searchParams.get('fecha');
    const estado = searchParams.get('estado');
    const item_descripcion = searchParams.get('item_descripcion');
    const proveedorId = searchParams.get('proveedorId');
    const coordinadorId = searchParams.get('coordinadorId');

    let whereClauses = [];
    let params = [];

    // Role-based filtering
    if (user.rol?.toLowerCase() === 'aprobador') {
      const stmtDeps = db.prepare('SELECT dependencia_id FROM aprobador_dependencias WHERE usuario_id = ?');
      const userDeps = stmtDeps.all(user.id).map(d => d.dependencia_id);

      if (userDeps.length > 0) {
        // Filter requests from users belonging to the approver's dependencies
        whereClauses.push(`u.dependencia_id IN (${userDeps.map(() => '?').join(',')})`);
        params.push(...userDeps);
      } else {
        // If an approver has no dependencies assigned, they see no requests.
        return NextResponse.json({ solicitudes: [], filtros: {} }, { status: 200 });
      }
    }

    if (dependencia) {
      whereClauses.push('u.dependencia = ?');
      params.push(dependencia);
    }
    if (solicitanteId) {
      whereClauses.push('u.id = ?');
      params.push(solicitanteId);
    }
    if (fecha) {
      whereClauses.push('s.fecha_solicitud = ?');
      params.push(fecha);
    }
    if (estado) {
      whereClauses.push('s.estado = ?');
      params.push(estado);
    }
    if (item_descripcion) {
      whereClauses.push('si.descripcion LIKE ?');
      params.push(`%${item_descripcion}%`);
    }
    if (proveedorId) {
      whereClauses.push('p.id = ?');
      params.push(proveedorId);
    }
    if (coordinadorId) {
      // Mostrar solo las solicitudes de los usuarios asignados al coordinador/aprobador
      whereClauses.push('u.coordinador_id = ?');
      params.push(coordinadorId);
    }
    // Excluir las solicitudes creadas por el propio administrador/coordinador
    if (user.rol?.toLowerCase() === 'administrador' || user.rol?.toLowerCase() === 'coordinador') {
      whereClauses.push('s.id_usuario != ?');
      params.push(user.id);
    }

    // Exclude 'rechazada' (rejected) requests by default
    whereClauses.push('s.estado != ?');
    params.push('rechazada');

    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const stmtSolicitudes = db.prepare(`
      SELECT DISTINCT
        s.id,
        s.solicitud_id,
        s.fecha_solicitud,
        s.notas_adicionales,
        s.estado,
        s.es_urgente,
        s.comentario_admin,
        sa.comentario_rechazo AS rechazo_comentario,
        u.nombre AS solicitante_nombre,
        u.dependencia AS solicitante_dependencia,
        p.nombre AS proveedor_nombre,
        p.id AS proveedor_id,
        p.nit AS proveedor_nit,
        p.contacto AS proveedor_contacto
      FROM solicitudes s
      JOIN usuarios u ON s.id_usuario = u.id
      LEFT JOIN proveedores p ON s.id_proveedor = p.id
      LEFT JOIN solicitud_items si ON s.id = si.id_solicitud
      LEFT JOIN solicitud_aprobaciones sa ON s.solicitud_id = sa.solicitud_id
      ${whereString}
      ORDER BY s.fecha_solicitud DESC, s.id DESC
    `);
    const solicitudes = stmtSolicitudes.all(...params);

    const solicitudesConItems = [];
    const stmtItems = db.prepare(`
      SELECT
        id,
        id_solicitud,
        necesidad,
        descripcion,
        especificaciones,
        cantidad,
        observaciones,
        estado_recepcion,
        comentario_recepcion_usuario,
        numero_factura,
        comentario_administrador
      FROM solicitud_items
      WHERE id_solicitud = ?
    `);

    for (const solicitud of solicitudes) {
      const items = stmtItems.all(solicitud.id);
      solicitudesConItems.push({ ...solicitud, items });
    }

    const sanitizedSolicitudes = solicitudesConItems.map(solicitud => {
      // Clona el objeto para evitar mutaciones directas.
      const newSolicitud = { ...solicitud };
      if (newSolicitud.solicitud_id) {
        const parts = newSolicitud.solicitud_id.trim().split('-');
        if (parts.length === 2 && parts[0].match(/^[A-Z]{1,2}$/)) {
          let numPartString = parts[1];
          // Elimina el cero final si la parte numérica es más larga de 6 caracteres.
          if (numPartString.length > 6 && numPartString.endsWith('0')) {
            numPartString = numPartString.slice(0, -1);
          }
          const numPart = parseInt(numPartString, 10);
          if (!isNaN(numPart)) {
            // Reconstruye el ID con el formato correcto XX-000000.
            newSolicitud.solicitud_id = `${parts[0]}-${String(numPart).padStart(6, '0')}`;
          }
        }
      }
      return newSolicitud;
    });

    // Fetch filter options
    const stmtSolicitantes = db.prepare("SELECT id, nombre FROM usuarios WHERE rol = 'solicitante' ORDER BY nombre");
    const solicitantes = stmtSolicitantes.all();

    const stmtDependencias = db.prepare("SELECT DISTINCT dependencia FROM usuarios WHERE dependencia IS NOT NULL ORDER BY dependencia");
    const dependencias = stmtDependencias.all().map(row => row.dependencia);

    const stmtProveedores = db.prepare("SELECT id, nombre FROM proveedores ORDER BY nombre");
    const proveedores = stmtProveedores.all();

    return NextResponse.json({
      solicitudes: sanitizedSolicitudes,
      filtros: {
        solicitantes,
        dependencias,
        proveedores
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error en /api/admin/solicitudes (GET):', error.message, error.stack);
    return NextResponse.json(
      { message: 'Error interno del servidor al obtener las solicitudes.' },
      { status: 500 }
    );
  }
}

export async function PUT(req) {
  try {
    const auth = await checkAdminAuth();
    if (!auth.authorized) {
      return NextResponse.json({ message: auth.message }, { status: 403 });
    }

    const { solicitud_id, estado, comentario_admin, items } = await req.json();

    if (!solicitud_id) {
      return NextResponse.json(
        { message: 'ID de solicitud es obligatorio para la actualización.' },
        { status: 400 }
      );
    }

    const transaction = db.transaction(() => {
      if (estado || comentario_admin) {
        const stmtUpdateSolicitud = db.prepare(
          'UPDATE solicitudes SET estado = COALESCE(?, estado), comentario_admin = ? WHERE solicitud_id = ?'
        );
        stmtUpdateSolicitud.run(estado, comentario_admin ? comentario_admin.toUpperCase() : comentario_admin, solicitud_id);
      }

      if (items && items.length > 0) {
        const stmtUpdateItem = db.prepare(
          'UPDATE solicitud_items SET comentario_administrador = COALESCE(?, comentario_administrador), precio_unitario = COALESCE(?, precio_unitario) WHERE id = ? AND id_solicitud = ?'
        );
        for (const item of items) {

          if (item.id_solicitud === solicitud_id) {
            stmtUpdateItem.run(
              item.comentario_administrador ? item.comentario_administrador.toUpperCase() : null,
              item.precio_unitario || null,
              item.id,
              solicitud_id
            );
          }
        }
      }
    });

    transaction();
    return NextResponse.json({ message: 'Solicitud actualizada correctamente.' }, { status: 200 });
  } catch (error) {
    console.error('Error en /api/admin/solicitudes (PUT):', error.message, error.stack);
    return NextResponse.json(
      { message: 'Error interno del servidor al actualizar la solicitud.' },
      { status: 500 }
    );
  }
}
