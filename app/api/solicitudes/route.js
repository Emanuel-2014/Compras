import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import pool from '@/lib/db';

let cachedDependencias = null;
let cachedSolicitantes = null;
let cachedCoordinadores = null;

function getCachedDependencias() {
  if (cachedDependencias) {
    return cachedDependencias;
  }
  console.log('CACHE MISS: Recargando dependencias desde la BD.');
  const dependencias = db.prepare('SELECT DISTINCT dependencia FROM usuarios WHERE dependencia IS NOT NULL').all();
  cachedDependencias = dependencias.map(d => d.dependencia);
  return cachedDependencias;
}

function getCachedSolicitantes() {
  if (cachedSolicitantes) {
    return cachedSolicitantes;
  }
  console.log('CACHE MISS: Recargando solicitantes desde la BD.');
  cachedSolicitantes = db.prepare('SELECT id, nombre FROM usuarios WHERE rol = \'solicitante\' OR rol = \'aprobador\'').all();
  return cachedSolicitantes;
}

function getCachedCoordinadores() {
  if (cachedCoordinadores) {
    return cachedCoordinadores;
  }
  console.log('CACHE MISS: Recargando coordinadores desde la BD.');
  cachedCoordinadores = db.prepare("SELECT id, nombre FROM usuarios WHERE rol = 'aprobador'").all();
  return cachedCoordinadores;
}

export async function POST(request) {
  const session = await getSession();
  if (!session) { // CORREGIDO: Verificar si el usuario existe
    return new NextResponse(JSON.stringify({ message: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // MIGRADO: Transacción PostgreSQL para crear solicitud, ítems y aprobaciones
    const client = await pool.connect();
    let responseBody = {};
    try {
      await client.query('BEGIN');

      const es_urgente = items.some(item => {
        const prioridad = (item.prioridad || item.necesidad || '').toLowerCase();
        return prioridad === 'urgencia';
      }) ? 1 : 0;

      // 1. Obtener información del usuario
      const userRes = await client.query(
        'SELECT id, nombre, rol, dependencia, dependencia_id, coordinador_id FROM usuarios WHERE id = $1',
        [id_usuario]
      );
      const user = userRes.rows[0];
      if (!user) throw new Error('El usuario no se encontró.');

      // 2. Determinar la cadena de aprobación
      const aprobadores = [];
      let orden = 1;
      if (user.dependencia_id) {
        const dependencyAproversRes = await client.query(
          `SELECT ad.usuario_id
           FROM aprobador_dependencias ad
           JOIN usuarios u ON ad.usuario_id = u.id
           WHERE ad.dependencia_id = $1 AND UPPER(u.rol) = 'APROBADOR'`,
          [user.dependencia_id]
        );
        const dependencyApprovers = dependencyAproversRes.rows;
        const userIsApprover = user.rol?.toLowerCase() === 'aprobador';
        const userInApproversList = dependencyApprovers.some(approver => approver.usuario_id === user.id);
        if (userIsApprover && userInApproversList) {
          aprobadores.push({ id: user.id, orden });
        } else {
          const validApprovers = dependencyApprovers.filter(approver => approver.usuario_id !== user.id);
          validApprovers.forEach(approver => {
            aprobadores.push({ id: approver.usuario_id, orden });
          });
        }
        if (aprobadores.length > 0) orden++;
      }

      let adminToAdd = null;
      if (user.rol?.toLowerCase() === 'administrador') {
        adminToAdd = { id: user.id };
      } else if (user.coordinador_id) {
        const coordinadorRes = await client.query(
          `SELECT id, rol FROM usuarios WHERE id = $1 AND (LOWER(rol) = 'administrador' OR LOWER(rol) = 'aprobador')`,
          [user.coordinador_id]
        );
        const coordinador = coordinadorRes.rows[0];
        if (coordinador && coordinador.id !== user.id) {
          adminToAdd = coordinador;
        }
      }
      if (!adminToAdd) {
        const adminRes = await client.query(`SELECT id FROM usuarios WHERE LOWER(rol) = 'administrador' LIMIT 1`);
        adminToAdd = adminRes.rows[0];
      }
      if (adminToAdd && !aprobadores.some(a => a.id === adminToAdd.id)) {
        aprobadores.push({ id: adminToAdd.id, orden });
        orden++;
      }

      // 3. Estado inicial y coordinador
      const needsApproval = aprobadores.length > 0;
      const initialState = needsApproval ? 'PENDIENTE_APROBACION' : 'EN_APROBACION';
      let coordinadorParaAsignar = user.coordinador_id || null;
      if (user.rol?.toUpperCase() === 'ADMINISTRADOR' || user.rol?.toUpperCase() === 'COORDINADOR') {
        coordinadorParaAsignar = user.id;
      }

      // 4. Insertar solicitud principal
      const solicitudRes = await client.query(
        `INSERT INTO solicitudes (id_usuario, id_proveedor, fecha_solicitud, estado, notas_adicionales, coordinador_id, tipo, es_urgente)
         VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, $6, $7) RETURNING id`,
        [id_usuario, id_proveedor, initialState, notas_adicionales ? notas_adicionales.toUpperCase() : notas_adicionales, coordinadorParaAsignar, (tipo || 'compra').toUpperCase(), es_urgente]
      );
      const newSolicitudRowId = solicitudRes.rows[0].id;

      // 5. Insertar ítems asociados
      for (const item of items) {
        await client.query(
          `INSERT INTO solicitud_items (id_solicitud, descripcion, especificaciones, cantidad, necesidad, observaciones, ruta_imagen)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            newSolicitudRowId,
            item.descripcion ? item.descripcion.toUpperCase() : item.descripcion,
            item.especificaciones ? item.especificaciones.toUpperCase() : item.especificaciones,
            item.cantidad,
            (item.prioridad || item.necesidad) ? (item.prioridad || item.necesidad).toUpperCase() : null,
            item.observaciones ? item.observaciones.toUpperCase() : item.observaciones,
            item.ruta_imagen || null
          ]
        );
      }

      // 6. Generar solicitud_id único
      const nameParts = user.nombre.trim().split(' ');
      const initials = (nameParts[0].charAt(0) + (nameParts.length > 1 ? nameParts[1].charAt(0) : '')).toUpperCase();
      const lastIdRes = await client.query(
        `SELECT solicitud_id FROM solicitudes WHERE solicitud_id LIKE $1 ORDER BY CAST(SPLIT_PART(solicitud_id, '-', 2) AS INTEGER) DESC LIMIT 1`,
        [`${initials}-%`]
      );
      let newConsecutivo = 1;
      if (lastIdRes.rows.length > 0 && lastIdRes.rows[0].solicitud_id) {
        const parts = lastIdRes.rows[0].solicitud_id.split('-');
        if (parts.length === 2) {
          const lastNumber = Number(parts[1]);
          if (!isNaN(lastNumber)) {
            newConsecutivo = lastNumber + 1;
          }
        }
      }
      const formattedConsecutivo = String(newConsecutivo).padStart(6, '0');
      const solicitud_id_string = `${initials}-${formattedConsecutivo}`;
      await client.query('UPDATE solicitudes SET solicitud_id = $1 WHERE id = $2', [solicitud_id_string, newSolicitudRowId]);

      // 7. Insertar aprobaciones
      if (needsApproval) {
        for (const aprobador of aprobadores) {
          const esCreadorYAprobador = aprobador.id === user.id && aprobador.orden === 1;
          const estadoInicial = esCreadorYAprobador ? 'aprobado' : 'pendiente';
          await client.query(
            `INSERT INTO solicitud_aprobaciones (solicitud_id, aprobador_id, estado, orden)
             VALUES ($1, $2, $3, $4)`,
            [solicitud_id_string, aprobador.id, estadoInicial, aprobador.orden]
          );
        }
      }

      await client.query('COMMIT');
      responseBody = { id: solicitud_id_string, lastInsertRowid: newSolicitudRowId };
      if (duplicateWarningMessage) {
        responseBody.warningMessage = duplicateWarningMessage;
      }
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return new NextResponse(JSON.stringify(responseBody), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
          const esCreadorYAprobador = aprobador.id === user.id && aprobador.orden === 1;
          const estadoInicial = esCreadorYAprobador ? 'aprobado' : 'pendiente';

          aprobacionStmt.run(solicitud_id_string, aprobador.id, estadoInicial, aprobador.orden);

      // ...código SQLite eliminado...

  } catch (error) {
    console.error('Error al crear la solicitud:', error);
    return new NextResponse(JSON.stringify({ message: 'Error interno del servidor al crear la solicitud.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function GET(request) {
  const session = await getSession();

  if (!session || (session.rol.toUpperCase() !== 'ADMINISTRADOR' && session.rol.toUpperCase() !== 'APROBADOR' && session.rol.toUpperCase() !== 'CREATOR')) {
    return new NextResponse(JSON.stringify({ message: 'No autorizado' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { searchParams } = new URL(request.url);
  const dependencia = searchParams.get('dependencia');
  const solicitanteId = searchParams.get('solicitanteId');
  const fechaInicio = searchParams.get('fechaInicio');
  const fechaFin = searchParams.get('fechaFin');
  const coordinadorId = searchParams.get('coordinadorId'); // Nuevo filtro

  try {
    // Paso 1: Construir y ejecutar la consulta principal de solicitudes
    let query = `
      SELECT
        s.id, -- Necesitamos el ID interno para las consultas secundarias
        s.solicitud_id,
        s.fecha_solicitud,
        s.estado,
        s.rechazo_comentario,
        s.tipo,
        s.es_urgente,
        u.nombre as solicitante_nombre,
        u.dependencia as solicitante_dependencia,
        p.nombre as proveedor_nombre
      FROM solicitudes s
      JOIN usuarios u ON s.id_usuario = u.id
      JOIN proveedores p ON s.id_proveedor = p.id
    `;

    const params = [];
    const conditions = [];

    // Lógica de autorización y filtro
    if (session.rol.toUpperCase() === 'CREATOR') {
      conditions.push('s.id_usuario = ?');
      params.push(session.id);
    } else if (session.rol.toUpperCase() === 'APROBADOR') {

      if (session.authorized_dependencia_ids && session.authorized_dependencia_ids.length > 0) {
        conditions.push(`u.dependencia_id IN (${session.authorized_dependencia_ids.join(',')})`);
      } else {
        // Si el aprobador no tiene dependencias autorizadas, no debería ver nada.
        return NextResponse.json({
          solicitudes: [],
          filtros: {
            dependencias: getCachedDependencias(),
            solicitantes: getCachedSolicitantes(),
            coordinadores: getCachedCoordinadores(),
          }
        });
      }
    } else if (session.rol.toUpperCase() === 'ADMINISTRADOR') {
      // Un administrador puede ver todas las solicitudes.
      // Si se pasa un coordinadorId específico, se añade como filtro.
      if (coordinadorId) {
        conditions.push('s.coordinador_id = ?');
        params.push(coordinadorId);
      }
    }

    if (dependencia) {
      conditions.push('u.dependencia = ?');
      params.push(dependencia);
    }
    if (solicitanteId) {
      conditions.push('s.id_usuario = ?');
      params.push(solicitanteId);
    }
    if (fechaInicio) {
      conditions.push('s.fecha_solicitud >= ?');
      params.push(fechaInicio);
    }
    if (fechaFin) {
      conditions.push('s.fecha_solicitud <= ?');
      params.push(fechaFin);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY s.id DESC';

    const stmt = db.prepare(query);
    const solicitudes = stmt.all(params);

    if (solicitudes.length > 0) {
      const solicitudIds = solicitudes.map(s => s.id);

      // Paso 2: Obtener información de facturas para esas solicitudes
      const facturasInfoStmt = db.prepare(`
        SELECT
          id_solicitud,
          id,
          numero_factura,
          fecha_factura,
          valor_factura,
          nombre_archivo_guardado
        FROM facturas
        WHERE id_solicitud IN (${solicitudIds.map(() => '?').join(',')})
      `);
      const facturasInfo = facturasInfoStmt.all(solicitudIds);

      // Paso 3: Procesar y mapear la información adicional de facturas
      const facturasMap = new Map();
      for (const factura of facturasInfo) {
        if (!facturasMap.has(factura.id_solicitud)) {
          facturasMap.set(factura.id_solicitud, []);
        }
        facturasMap.get(factura.id_solicitud).push(factura);
      }

      // Paso 4: Unir la información en el resultado final
      for (const solicitud of solicitudes) {
        solicitud.facturas = facturasMap.get(solicitud.id) || [];

      }
    }

    // También obtener listas para los filtros (con cache)
    const dependencias = getCachedDependencias();
    const solicitantes = getCachedSolicitantes();
    const coordinadores = getCachedCoordinadores(); // Obtener coordinadores

    return NextResponse.json({
      solicitudes,
      filtros: {
        dependencias,
        solicitantes,
        coordinadores, // Añadir a la respuesta
      }
    });

  } catch (error) {
    console.error('Error al obtener las solicitudes:', error);
    return new NextResponse(JSON.stringify({ message: 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function PUT(request) {
  const session = await getSession();

  if (!session || (session.rol?.toLowerCase() !== 'administrador' && session.rol?.toLowerCase() !== 'aprobador')) {
    return new NextResponse(JSON.stringify({ message: 'No autorizado' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { solicitud_id, estado, comentario_admin } = await request.json();

    if (!solicitud_id || !estado) {
      return new NextResponse(JSON.stringify({ message: 'Faltan parámetros requeridos' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const currentSolicitudStmt = db.prepare('SELECT estado FROM solicitudes WHERE solicitud_id = ?');
    const currentSolicitud = currentSolicitudStmt.get(solicitud_id);

    if (!currentSolicitud) {
      return new NextResponse(JSON.stringify({ message: 'Solicitud no encontrada' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const estadosEnProcesoDeAprobacion = ['PENDIENTE_APROBACION', 'EN_APROBACION', 'APROBADA', 'RECHAZADA']; // Definir estados "finales" o en proceso.

    if (session.rol?.toLowerCase() === 'administrador' && estadosEnProcesoDeAprobacion.includes(currentSolicitud.estado.toUpperCase())) {

      // o ya ha sido decidida, se le deniega el permiso.
      return new NextResponse(JSON.stringify({ message: 'Los administradores no pueden modificar el estado de solicitudes en proceso de aprobación o ya decididas.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (session.rol?.toLowerCase() === 'aprobador') {

        // La lógica de aprobación específica se tratará en la Tarea 4.
    }

    // La edición completa de una solicitud será manejada en el [id]/route.js (PUT).

    // MIGRADO: Actualización de estado de solicitud a PostgreSQL
    const updateRes = await pool.query(
      'UPDATE solicitudes SET estado = $1, comentario_admin = $2 WHERE solicitud_id = $3',
      [estado ? estado.toUpperCase() : estado, comentario_admin ? comentario_admin.toUpperCase() : comentario_admin, solicitud_id]
    );
    if (updateRes.rowCount === 0) {
      return new NextResponse(JSON.stringify({ message: 'Solicitud no encontrada' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return NextResponse.json({ message: 'Solicitud actualizada correctamente' });

  } catch (error) {
    console.error('Error al actualizar la solicitud:', error);
    return new NextResponse(JSON.stringify({ message: 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}