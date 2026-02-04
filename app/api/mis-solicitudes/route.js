// app/api/mis-solicitudes/route.js
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifySessionToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// GET handler for fetching the list of solicitations with all filters
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie) return NextResponse.json({ message: 'No hay sesión activa.' }, { status: 401 });

    const user = verifySessionToken(sessionCookie.value);
    if (!user || !user.id) return NextResponse.json({ message: 'Sesión inválida.' }, { status: 401 });

    const { searchParams } = new URL(request.url);

    // Get all filter parameters
    const fecha = searchParams.get('fecha');
    const solicitudId = searchParams.get('solicitud_id');
    const estado = searchParams.get('estado');
    const dependencia = searchParams.get('dependencia');
    const itemDescripcion = searchParams.get('item_descripcion');
    const solicitanteId = searchParams.get('solicitanteId');
    const coordinadorId = searchParams.get('coordinadorId');

    let query = `
      SELECT
        s.solicitud_id,
        s.id as solicitud_db_id,
        u.nombre as usuario_nombre,
        s.fecha_solicitud,
        s.estado,
        s.rechazo_comentario
      FROM solicitudes s
      LEFT JOIN usuarios u ON s.id_usuario = u.id
    `;

    let params = [];
    let whereClauses = [];

    // Conditionally join solicitud_items only if filtering by item description
    if (itemDescripcion) {
      query += ` LEFT JOIN solicitud_items si ON s.id = si.id_solicitud`;
    }

    // Mostrar solo las solicitudes creadas por el usuario actual
    whereClauses.push('s.id_usuario = ?');
    params.push(user.id);

    // Apply filters
    if (fecha) {
      whereClauses.push('date(s.fecha_solicitud) = ?');
      params.push(fecha);
    }
    if (solicitudId) {
      whereClauses.push('s.solicitud_id LIKE ?');
      params.push(`%${solicitudId}%`);
    }
    if (estado) {
      whereClauses.push('s.estado = ?');
      params.push(estado);
    }
    if (dependencia && user.rol?.toLowerCase() !== 'aprobador') {
      whereClauses.push('u.dependencia = ?');
      params.push(dependencia);
    }
    if (itemDescripcion) {
      whereClauses.push('si.descripcion LIKE ?');
      params.push(`%${itemDescripcion}%`);
    }
    if (solicitanteId) {
      whereClauses.push('s.id_usuario = ?');
      params.push(solicitanteId);
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    query += ` ORDER BY s.id DESC`;

    const stmt = db.prepare(query);
    const rows = stmt.all(params);

    const solicitudes = rows.map(row => {
      let sanitizedSolicitudId = row.solicitud_id;
      if (sanitizedSolicitudId) {
        const parts = sanitizedSolicitudId.split('-');
        if (parts.length === 2 && parts[0].match(/^[A-Z]{1,2}$/)) {
          let numPartString = parts[1];
          if (numPartString.length > 6 && numPartString.endsWith('0')) {
            numPartString = numPartString.slice(0, -1);
          }
          const numPart = parseInt(numPartString, 10);
          if (!isNaN(numPart)) {
            sanitizedSolicitudId = `${parts[0]}-${String(numPart).padStart(6, '0')}`;
          }
        }
      }
      return { ...row, solicitud_id: sanitizedSolicitudId, facturas: [] };
    });

    // Fetch all solicitantes for filter dropdown
    let solicitantesQuery = 'SELECT id, nombre FROM usuarios WHERE rol = \'solicitante\'';
    const solicitantesParams = [];

    if ((user.rol?.toLowerCase() === 'administrador' || user.rol?.toLowerCase() === 'coordinador') && coordinadorId) {
      solicitantesQuery += ' AND coordinador_id = ?';
      solicitantesParams.push(coordinadorId);
    }
    solicitantesQuery += ' ORDER BY nombre ASC';
    const solicitantes = db.prepare(solicitantesQuery).all(solicitantesParams);

    const dependencias = db.prepare('SELECT DISTINCT dependencia FROM usuarios WHERE dependencia IS NOT NULL AND dependencia != \'\' ORDER BY dependencia ASC').all().map(row => row.dependencia);

    return NextResponse.json({ solicitudes, filtros: { solicitantes, dependencias } }, { status: 200 });

  } catch (error) {
    console.error('Error en /api/mis-solicitudes GET:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}

// POST handler for creating a new partial receipt (remains unchanged)
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie) {
      return NextResponse.json({ message: 'No hay sesión activa.' }, { status: 401 });
    }

    const user = verifySessionToken(sessionCookie.value);
    if (!user || !user.id) {
      return NextResponse.json({ message: 'Sesión inválida.' }, { status: 401 });
    }

    const { id_solicitud_item, cantidad_recibida, numero_factura, comentario, precio_unitario, prefijo_factura_recepcion, numero_factura_recepcion } = await request.json();

    if (!id_solicitud_item || !cantidad_recibida || Number(cantidad_recibida) <= 0) {
      return NextResponse.json({ message: 'ID del ítem y una cantidad positiva son obligatorios.' }, { status: 400 });
    }

    const transaction = db.transaction(() => {
      // 1. Validar el item y la solicitud
      const itemInfo = db.prepare(`
        SELECT si.cantidad as cantidad_solicitada, s.estado as estado_solicitud, s.solicitud_id, s.id as solicitud_db_id
        FROM solicitud_items si
        JOIN solicitudes s ON si.id_solicitud = s.id
        WHERE si.id = ?
      `).get(id_solicitud_item);

      if (!itemInfo) throw new Error('El ítem de la solicitud no existe.');
      if (itemInfo.estado_solicitud === 'cerrada') throw new Error('La solicitud ya está cerrada y no puede recibir más items.');
      if (itemInfo.estado_solicitud !== 'aprobada' && itemInfo.estado_solicitud !== 'en proceso') {
        throw new Error(`No se puede registrar recepción para una solicitud en estado '${itemInfo.estado_solicitud}'.`);
      }

      // 2. Validar que la cantidad no exceda lo pendiente
      const totalRecibidoResult = db.prepare('SELECT SUM(cantidad_recibida) as total FROM recepciones_item WHERE id_solicitud_item = ?').get(id_solicitud_item);
      const totalYaRecibido = totalRecibidoResult.total || 0;

      if ((totalYaRecibido + Number(cantidad_recibida)) > itemInfo.cantidad_solicitada) {
        throw new Error(`La cantidad recibida (${cantidad_recibida}) excede la cantidad pendiente (${itemInfo.cantidad_solicitada - totalYaRecibido}).`);
      }

      // 3. Insertar la nueva recepción
      const stmtInsert = db.prepare(
        `INSERT INTO recepciones_item (id_solicitud_item, cantidad_recibida, comentario, fecha_recepcion, usuario_id, prefijo_factura_recepcion, numero_factura_recepcion) VALUES (?, ?, ?, date('now'), ?, ?, ?)`
      );
      stmtInsert.run(
        id_solicitud_item,
        cantidad_recibida,
        comentario ? comentario.toUpperCase() : null,
        user.id,
        prefijo_factura_recepcion ? prefijo_factura_recepcion.toUpperCase() : null,
        numero_factura_recepcion ? numero_factura_recepcion.toUpperCase() : null
      );

      // 4. Actualizar el precio unitario del item de la solicitud si se proporciona
      if (precio_unitario && Number(precio_unitario) > 0) {
        db.prepare('UPDATE solicitud_items SET precio_unitario = ? WHERE id = ?').run(precio_unitario, id_solicitud_item);
      }

      const solicitudId = itemInfo.solicitud_id;
      const solicitudDbId = itemInfo.solicitud_db_id;

      // 4. Actualizar estado a 'en proceso' si corresponde
      if (itemInfo.estado_solicitud === 'aprobada') {
        db.prepare('UPDATE solicitudes SET estado = ? WHERE solicitud_id = ?').run('en proceso', solicitudId);
        console.log(`Solicitud ${solicitudId} marcada como 'en proceso'.`);
      }

      // 5. Verificar si la solicitud está completa para cerrarla
      const allItems = db.prepare('SELECT id, cantidad FROM solicitud_items WHERE id_solicitud = ?').all(solicitudDbId);
      const totalSolicitado = allItems.reduce((sum, item) => sum + (item.cantidad || 0), 0);

      const totalRecibidoQuery = db.prepare(`
        SELECT SUM(r.cantidad_recibida) as total
        FROM recepciones_item r
        JOIN solicitud_items si ON r.id_solicitud_item = si.id
        WHERE si.id_solicitud = ?
      `).get(solicitudDbId);
      const totalRecibido = totalRecibidoQuery.total || 0;

      if (totalRecibido >= totalSolicitado) {
        db.prepare('UPDATE solicitudes SET estado = ? WHERE solicitud_id = ?').run('cerrada', solicitudId);
        console.log(`Solicitud ${solicitudId} marcada como 'cerrada'.`);
      }
    });

    try {
        transaction();
        return NextResponse.json({ message: 'Recepción registrada correctamente.' }, { status: 201 });
    } catch (err) {
        return NextResponse.json({ message: err.message }, { status: 400 });
    }

  } catch (error) {
    console.error('Error en /api/mis-solicitudes POST:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}