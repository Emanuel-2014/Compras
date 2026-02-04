import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db'; // CORREGIDO: Importación por defecto

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
    const { id_proveedor, items, notas: notas_adicionales, tipo } = await request.json();
    const { id: id_usuario } = session; // CORREGIDO: Obtener id directamente de session (que es el usuario)

    if (!id_proveedor || !items || items.length === 0) {
      return new NextResponse(JSON.stringify({ message: 'Faltan datos requeridos para crear la solicitud.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const settingsStmt = db.prepare('SELECT key, value FROM app_settings WHERE key IN (?, ?, ?)');
    const settings = settingsStmt.all('enable_duplicate_check', 'duplicate_check_grace_period_end_date', 'duplicate_check_days');
    const config = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});

    console.log('DEBUG: Configuración de duplicados:', config);

    let duplicateWarningMessage = null; // Inicializar la variable

    if (config.enable_duplicate_check === 'true') {
      const checkDays = parseInt(config.duplicate_check_days, 10) || 7;
      const checkDate = new Date();
      checkDate.setDate(checkDate.getDate() - checkDays);
      const checkDateISO = checkDate.toISOString().split('T')[0]; // YYYY-MM-DD

      console.log(`DEBUG: Validando duplicados desde ${checkDateISO} (últimos ${checkDays} días)`);

      // Validación: solo compara descripción y especificaciones (case-insensitive)
      const checkDuplicateStmt = db.prepare(`
        SELECT si.descripcion, si.especificaciones, s.fecha_solicitud
        FROM solicitud_items si
        JOIN solicitudes s ON si.id_solicitud = s.id
        WHERE s.id_usuario = ?
          AND LOWER(TRIM(si.descripcion)) = LOWER(TRIM(?))
          AND LOWER(TRIM(COALESCE(si.especificaciones, ''))) = LOWER(TRIM(COALESCE(?, '')))
          AND s.fecha_solicitud >= ?
          AND s.estado != 'rechazada'
        LIMIT 1
      `);

      for (const item of items) {
        console.log(`DEBUG: Verificando duplicado para: "${item.descripcion}" / "${item.especificaciones || ''}"`);

        const duplicate = checkDuplicateStmt.get(
          id_usuario,
          item.descripcion || '',
          item.especificaciones || '',
          checkDateISO
        );

        if (duplicate) {
          console.log('DEBUG: DUPLICADO ENCONTRADO:', duplicate);

          const gracePeriodEndStr = config.duplicate_check_grace_period_end_date;
          const now = new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const day = String(now.getDate()).padStart(2, '0');
          const todayStr = `${year}-${month}-${day}`;

          const isGracePeriodActive = gracePeriodEndStr && todayStr <= gracePeriodEndStr;

          console.log(`DEBUG: Período de gracia activo: ${isGracePeriodActive} (fin: ${gracePeriodEndStr}, hoy: ${todayStr})`);

          if (!isGracePeriodActive) {
            return new NextResponse(JSON.stringify({
              message: `Ya solicitaste "${item.descripcion}"${item.especificaciones ? ` (${item.especificaciones})` : ''} en los últimos ${checkDays} días. No puedes solicitar el mismo ítem nuevamente en este período.`,
              isDuplicate: true,
              isBlocked: true
            }), {
              status: 409,
              headers: { 'Content-Type': 'application/json' },
            });
          } else {
            console.warn(`ADVERTENCIA: Solicitud duplicada para "${item.descripcion}" dentro del período de gracia.`);
          }
        } else {
          console.log('DEBUG: No se encontró duplicado');
        }
      }
    }

    // Usar una transacción para asegurar la integridad de los datos
    const createSolicitud = db.transaction((solicitud) => {

      const es_urgente = solicitud.items.some(item => {
        const prioridad = (item.prioridad || item.necesidad || '').toLowerCase();
        return prioridad === 'urgencia';
      }) ? 1 : 0;

      // 1. Obtener información del usuario que crea la solicitud
      const userStmt = db.prepare('SELECT id, nombre, rol, dependencia, dependencia_id, coordinador_id FROM usuarios WHERE id = ?');
      const user = userStmt.get(solicitud.id_usuario);

      if (!user) {
        throw new Error('El usuario no se encontró.');
      }

      // 2. Determinar la cadena de aprobación
      const aprobadores = [];
      let orden = 1;

      // 2.1 Buscar aprobadores de dependencia usando la tabla aprobador_dependencias
      // Los APROBADORES revisan y AUTORIZAN la solicitud (Orden 1)
      // LÓGICA CORREGIDA: Si el usuario es APROBADOR, debe auto-autorizarse
      if (user.dependencia_id) {
        const dependencyApproverStmt = db.prepare(`
          SELECT ad.usuario_id
          FROM aprobador_dependencias ad
          JOIN usuarios u ON ad.usuario_id = u.id
          WHERE ad.dependencia_id = ? AND UPPER(u.rol) = 'APROBADOR'
        `);
        const dependencyApprovers = dependencyApproverStmt.all(user.dependencia_id);

        console.log('DEBUG: Aprobadores de dependencia encontrados para dependencia_id', user.dependencia_id, ':', dependencyApprovers);

        const userIsApprover = user.rol?.toLowerCase() === 'aprobador';
        const userInApproversList = dependencyApprovers.some(approver => approver.usuario_id === user.id);

        if (userIsApprover && userInApproversList) {

          aprobadores.push({ id: user.id, orden: orden });
          console.log(`DEBUG: Auto-autorización configurada para usuario aprobador ${user.nombre} (ID: ${user.id})`);
        } else {
          // Lógica original para usuarios no aprobadores
          const validApprovers = dependencyApprovers.filter(approver => approver.usuario_id !== user.id);

          if (validApprovers.length > 0) {
            // Crear un registro de aprobación para CADA aprobador de la dependencia
            // Todos tendrán el mismo orden, lo que significa que cualquiera puede autorizar
            validApprovers.forEach(approver => {
              aprobadores.push({ id: approver.usuario_id, orden: orden });
            });
          }
        }

        if (aprobadores.length > 0) {
          orden++;
        }
      }

      let adminToAdd = null;

      // SI EL USUARIO ES ADMINISTRADOR: se auto-asigna como aprobador
      if (user.rol?.toLowerCase() === 'administrador') {
        adminToAdd = { id: user.id };
        console.log('DEBUG: Usuario es administrador, auto-asignándose como aprobador');
      }
      // SI NO ES ADMINISTRADOR: usar el coordinador_id asignado al usuario
      else if (user.coordinador_id) {
        const coordinadorStmt = db.prepare(`
          SELECT id, rol FROM usuarios
          WHERE id = ? AND (LOWER(rol) = 'administrador' OR LOWER(rol) = 'aprobador')
        `);
        const coordinador = coordinadorStmt.get(user.coordinador_id);

        if (coordinador && coordinador.id !== user.id) {
          adminToAdd = coordinador;
          console.log('DEBUG: Usando coordinador asignado:', coordinador);
        }
      }

      // Fallback: Si aún no hay aprobador, buscar cualquier administrador
      if (!adminToAdd) {
        const adminStmt = db.prepare(`SELECT id FROM usuarios WHERE LOWER(rol) = 'administrador' LIMIT 1`);
        adminToAdd = adminStmt.get();
        console.log('DEBUG: Usando administrador por defecto:', adminToAdd);
      }

      if (adminToAdd && !aprobadores.some(a => a.id === adminToAdd.id)) {
        aprobadores.push({ id: adminToAdd.id, orden: orden });
        orden++;
      }

      // 3. Determinar el estado inicial y el coordinador a asignar (si aplica)
      const needsApproval = aprobadores.length > 0;
      const initialState = needsApproval ? 'PENDIENTE_APROBACION' : 'EN_APROBACION';

      // Si el usuario es administrador o coordinador, se auto-asigna como coordinador
      // Si es solicitante u otro rol, usa su coordinador_id asignado
      let coordinadorParaAsignar = user.coordinador_id || null;
      if (user.rol?.toUpperCase() === 'ADMINISTRADOR' || user.rol?.toUpperCase() === 'COORDINADOR') {
        coordinadorParaAsignar = user.id;
      }

      // 4. Insertar la solicitud principal y obtener su ID de fila
      const solicitudStmt = db.prepare(
        `INSERT INTO solicitudes (id_usuario, id_proveedor, fecha_solicitud, estado, notas_adicionales, coordinador_id, tipo, es_urgente)
         VALUES (?, ?, DATE('now', 'localtime'), ?, ?, ?, ?, ?)`
      );
      const result = solicitudStmt.run(solicitud.id_usuario, solicitud.id_proveedor, initialState, solicitud.notas_adicionales ? solicitud.notas_adicionales.toUpperCase() : solicitud.notas_adicionales, coordinadorParaAsignar, (solicitud.tipo || 'compra').toUpperCase(), es_urgente);
      const newSolicitudRowId = result.lastInsertRowid;

      // 5. Insertar los ítems asociados a la solicitud
      const itemsParaInsertar = solicitud.items.map(item => ({
        ...item,
        necesidad: item.prioridad, // Mapeo de 'prioridad' a 'necesidad'
      }));

      const itemStmt = db.prepare(
        `INSERT INTO solicitud_items (id_solicitud, descripcion, especificaciones, cantidad, necesidad, observaciones, ruta_imagen)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      );

      for (const item of itemsParaInsertar) {
        itemStmt.run(
          newSolicitudRowId,
          item.descripcion ? item.descripcion.toUpperCase() : item.descripcion,
          item.especificaciones ? item.especificaciones.toUpperCase() : item.especificaciones,
          item.cantidad,
          item.necesidad ? item.necesidad.toUpperCase() : item.necesidad,
          item.observaciones ? item.observaciones.toUpperCase() : item.observaciones,
          item.ruta_imagen || null
        );
      }

      const nameParts = user.nombre.trim().split(' ');
      const initials = (nameParts[0].charAt(0) + (nameParts.length > 1 ? nameParts[1].charAt(0) : '')).toUpperCase();

      // La longitud de las iniciales + el guion. 'RT-' -> 3, 'R-' -> 2
      const prefixLength = initials.length;

      const lastIdStmt = db.prepare(`
        SELECT solicitud_id FROM solicitudes
        WHERE solicitud_id LIKE ?
        ORDER BY CAST(SUBSTR(solicitud_id, INSTR(solicitud_id, '-') + 1) AS INTEGER) DESC
        LIMIT 1
      `);
      const lastSolicitud = lastIdStmt.get(`${initials}-%`);

      let newConsecutivo = 1;
      if (lastSolicitud && lastSolicitud.solicitud_id) {
          const parts = lastSolicitud.solicitud_id.split('-');
          if (parts.length === 2) {
              // Forzar la conversión a número de la forma más segura posible.
              const lastNumber = Number(parts[1]);
              if (!isNaN(lastNumber)) {
                  // Forzar a que la suma sea numérica.
                  newConsecutivo = lastNumber + 1;
              }
          }
      }

      // Asegurarse de que el formateo es correcto.
      const formattedConsecutivo = String(newConsecutivo).padStart(6, '0');
      const solicitud_id_string = `${initials}-${formattedConsecutivo}`;

      const updateIdStmt = db.prepare('UPDATE solicitudes SET solicitud_id = ? WHERE id = ?');
      updateIdStmt.run(solicitud_id_string, newSolicitudRowId);

      // 7. Si se necesita aprobación, crear los registros de aprobación
      console.log('Aprobadores finales a insertar:', aprobadores);
      if (needsApproval) {
        const aprobacionStmt = db.prepare(
          `INSERT INTO solicitud_aprobaciones (solicitud_id, aprobador_id, estado, orden)
           VALUES (?, ?, ?, ?)`
        );
        for (const aprobador of aprobadores) {

          // marcarlo como 'aprobado' automáticamente para auto-autorizar
          const esCreadorYAprobador = aprobador.id === user.id && aprobador.orden === 1;
          const estadoInicial = esCreadorYAprobador ? 'aprobado' : 'pendiente';

          aprobacionStmt.run(solicitud_id_string, aprobador.id, estadoInicial, aprobador.orden);

          if (esCreadorYAprobador) {
            console.log(`DEBUG: Auto-autorización aplicada para usuario ${user.nombre} (ID: ${user.id}) en solicitud ${solicitud_id_string}`);
          }
        }
      }

      return { id: solicitud_id_string, lastInsertRowid: newSolicitudRowId };
    });

    const nuevaSolicitud = createSolicitud({
      id_usuario,
      id_proveedor,
      items,
      notas_adicionales,
      tipo
    });

    const responseBody = { ...nuevaSolicitud };
    if (duplicateWarningMessage) {
        responseBody.warningMessage = duplicateWarningMessage;
    }

    return new NextResponse(JSON.stringify(responseBody), {
      status: 201, // 201 Created
      headers: { 'Content-Type': 'application/json' },
    });

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

    const stmt = db.prepare(
      'UPDATE solicitudes SET estado = ?, comentario_admin = ? WHERE solicitud_id = ?'
    );
    const result = stmt.run(
      estado ? estado.toUpperCase() : estado,
      comentario_admin ? comentario_admin.toUpperCase() : comentario_admin,
      solicitud_id
    );

    if (result.changes === 0) {
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