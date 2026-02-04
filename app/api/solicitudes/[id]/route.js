// app/api/solicitudes/[id]/route.js
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    // 1. Obtener la solicitud principal
    const stmtSolicitud = db.prepare(`
      SELECT
        s.id,
        s.solicitud_id,
        s.fecha_solicitud,
        s.notas_adicionales,
        s.estado,
        s.rechazo_comentario,
        s.tipo,
        p.id AS proveedor_id,
        p.nombre AS proveedor_nombre,
        p.nit AS proveedor_nit,
        p.contacto AS proveedor_contacto,
        u.nombre AS usuario_nombre,
        COALESCE(d.nombre, 'N/A') AS usuario_dependencia,
        u.codigo_personal AS usuario_codigo_personal,
        u.id AS usuario_id
      FROM solicitudes s
      JOIN proveedores p ON s.id_proveedor = p.id
      JOIN usuarios u ON s.id_usuario = u.id
      LEFT JOIN dependencias d ON u.dependencia_id = d.id
      WHERE s.solicitud_id = ?
    `);
    const solicitud = stmtSolicitud.get(id);

    if (!solicitud) {
      return NextResponse.json({ message: 'Solicitud no encontrada' }, { status: 404 });
    }

    // Sanitize solicitud_id to ensure consistent XX-000000 format
    if (solicitud.solicitud_id) {
      const parts = solicitud.solicitud_id.split('-');
      if (parts.length === 2 && parts[0].match(/^[A-Z]{1,2}$/)) {
        let numPartString = parts[1];
        if (numPartString.length > 6 && numPartString.endsWith('0')) {
          numPartString = numPartString.slice(0, -1);
        }
        const numPart = parseInt(numPartString, 10);
        if (!isNaN(numPart)) {
          solicitud.solicitud_id = `${parts[0]}-${String(numPart).padStart(6, '0')}`;
        }
      }
    }

    // 2. Obtener los items base de la solicitud
    const stmtItems = db.prepare(`
      SELECT
        id,
        id_solicitud,
        necesidad,
        descripcion,
        especificaciones,
        cantidad,
        observaciones,
        ruta_imagen,
        precio_unitario
      FROM solicitud_items
      WHERE id_solicitud = ?
    `);
    const items = stmtItems.all(solicitud.id);

    // 3. Preparar consultas para las nuevas recepciones
    const stmtTotalRecibido = db.prepare('SELECT SUM(cantidad_recibida) as total FROM recepciones_item WHERE id_solicitud_item = ?');
    const stmtRecepciones = db.prepare('SELECT r.*, u.nombre as usuario_nombre FROM recepciones_item r JOIN usuarios u ON r.usuario_id = u.id WHERE r.id_solicitud_item = ?');

    // 4. Obtener todas las facturas adjuntas (sistema antiguo)
    const stmtFacturasSolicitud = db.prepare('SELECT * FROM facturas WHERE id_solicitud = ? ORDER BY fecha_carga DESC');
    const facturasSolicitud = stmtFacturasSolicitud.all(solicitud.id);

    // 4.1 Obtener todas las facturas de compra (sistema nuevo)
    const stmtFacturasCompra = db.prepare('SELECT * FROM facturas_compras WHERE id_solicitud = ? ORDER BY fecha_emision DESC');
    const facturasCompra = stmtFacturasCompra.all(solicitud.id);
    const stmtFacturaItems = db.prepare('SELECT * FROM factura_compra_items WHERE factura_compra_id = ?');
    const facturasCompraConItems = facturasCompra.map(fc => ({
      ...fc,
      items: stmtFacturaItems.all(fc.id)
    }));

    // 5. Enriquecer cada item con sus datos de recepción (sin facturas de item)
    const itemsEnriquecidos = items.map(item => {
      const recepciones = stmtRecepciones.all(item.id);
      const totalRecibidoResult = stmtTotalRecibido.get(item.id);
      const cantidad_recibida = totalRecibidoResult ? totalRecibidoResult.total : 0;

      return {
        ...item,
        cantidad_recibida: cantidad_recibida || 0,
        recepciones: recepciones || [],
      };
    });

    // 6. Calcular el porcentaje de cumplimiento general de la solicitud
    const totalSolicitado = itemsEnriquecidos.reduce((sum, item) => sum + (item.cantidad || 0), 0);
    const totalRecibido = itemsEnriquecidos.reduce((sum, item) => sum + (item.cantidad_recibida || 0), 0);

    const porcentaje_cumplimiento = totalSolicitado > 0 ? (totalRecibido / totalSolicitado) * 100 : 0;

    // 7. Obtener el historial de aprobaciones
    const stmtAprobaciones = db.prepare(`
      SELECT
        sa.id,
        sa.aprobador_id,
        sa.estado,
        sa.orden,
        sa.fecha_decision,
        sa.comentario,
        u.nombre as nombre_aprobador,
        u.rol as aprobador_rol
      FROM solicitud_aprobaciones sa
      JOIN usuarios u ON sa.aprobador_id = u.id
      WHERE sa.solicitud_id = ?
      ORDER BY sa.orden ASC
    `);
    const historial_firmas = stmtAprobaciones.all(id);

    // Find the names of the approver and admin who approved the request
    let revisadoPorNombre = null;
    let autorizadoPorNombre = null;

    // Find the last 'aprobador' and 'administrador' who approved.
    for (const firma of historial_firmas) {
      // Verificar si está aprobado o autorizado
      if (firma.estado === 'aprobado' || firma.estado === 'autorizado') {
        if (firma.aprobador_rol?.toLowerCase() === 'aprobador') {
          revisadoPorNombre = firma.nombre_aprobador; // This will get the last one due to ordering
        }
        if (firma.aprobador_rol?.toLowerCase() === 'administrador') {
          autorizadoPorNombre = firma.nombre_aprobador; // This will get the last one
        }
      }
    }

    const solicitudConTodo = {
      ...solicitud,
      items: itemsEnriquecidos,
      facturas: facturasSolicitud, // Sistema antiguo
      facturas_compras: facturasCompraConItems, // Sistema nuevo
      porcentaje_cumplimiento: Math.round(porcentaje_cumplimiento),
      historial_firmas: historial_firmas || [],
      revisado_por_nombre: revisadoPorNombre,
      autorizado_por_nombre: autorizadoPorNombre,
    };
    return NextResponse.json(solicitudConTodo, { status: 200 });
  } catch (error) {
    console.error(`Error en /api/solicitudes/[id] GET:`, error);
    return NextResponse.json(
      { message: error.message || 'Error interno del servidor al obtener la solicitud.' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
    const session = await getSession();
    const { id: solicitud_public_id } = params; // The public solicitud_id (e.g., RT-000001)

    if (!session) {
        return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    try {
        const { id_proveedor, fecha_solicitud, items, notas: notas_adicionales, tipo } = await request.json();

        // 1. Obtener la solicitud principal para verificar permisos
        const getSolicitudStmt = db.prepare('SELECT id, estado, id_usuario FROM solicitudes WHERE solicitud_id = ?');
        const solicitudPrincipal = getSolicitudStmt.get(solicitud_public_id);

        if (!solicitudPrincipal) {
            return NextResponse.json({ message: 'Solicitud no encontrada.' }, { status: 404 });
        }

        const { id: id_solicitud_numerico, estado: solicitud_estado, id_usuario: creador_id } = solicitudPrincipal;

        let puedeEditar = false;
        let razonDenegado = 'No tiene permiso para editar esta solicitud.';

        // Lógica de permisos
        if (session.rol?.toLowerCase() === 'administrador') {
            puedeEditar = true;
        } else if (session.rol?.toLowerCase() === 'aprobador') {
            if (solicitud_estado.toUpperCase() === 'PENDIENTE_APROBACION') {
                const nextApprovalStmt = db.prepare(`
                    SELECT aprobador_id FROM solicitud_aprobaciones
                    WHERE solicitud_id = ? AND estado = 'pendiente' ORDER BY orden ASC LIMIT 1
                `);
                const nextApproval = nextApprovalStmt.get(solicitud_public_id);
                if (nextApproval && nextApproval.aprobador_id === session.id) {
                    puedeEditar = true;
                } else {
                    razonDenegado = 'No es su turno para editar esta solicitud o ya no está pendiente de su aprobación.';
                }
            } else {
                 razonDenegado = `Un aprobador solo puede editar solicitudes en estado 'PENDIENTE_APROBACION'. Estado actual: ${solicitud_estado}`;
            }
        } else if (session.id === creador_id) {
            const estadoUpper = solicitud_estado.toUpperCase();
            if (estadoUpper === 'BORRADOR' || estadoUpper === 'RECHAZADO') {
                puedeEditar = true;
            } else {
                razonDenegado = `Solo puede editar sus solicitudes si están en estado 'BORRADOR' o 'RECHAZADO'. Estado actual: ${solicitud_estado}`;
            }
        }

        if (!puedeEditar) {
            return NextResponse.json({ message: `Acceso denegado: ${razonDenegado}` }, { status: 403 });
        }

        // Convertir fecha_solicitud a formato YYYY-MM-DD
        const formattedFechaSolicitud = new Date(fecha_solicitud).toISOString().split('T')[0];

        // 2. Iniciar transacción para asegurar la integridad
        const updateSolicitud = db.transaction(() => {
            // Actualizar la tabla 'solicitudes'
            const updateSolicitudStmt = db.prepare(
                `UPDATE solicitudes SET
                    id_proveedor = ?,
                    fecha_solicitud = ?,
                    notas_adicionales = ?,
                    tipo = ?
                 WHERE id = ?`
            );
            updateSolicitudStmt.run(id_proveedor, formattedFechaSolicitud, notas_adicionales ? notas_adicionales.toUpperCase() : notas_adicionales, tipo ? tipo.toUpperCase() : tipo, id_solicitud_numerico);

            // Obtener IDs de items existentes
            const existingItemsStmt = db.prepare('SELECT id FROM solicitud_items WHERE id_solicitud = ?');
            const existingItemIds = new Set(existingItemsStmt.all(id_solicitud_numerico).map(item => item.id));

            const itemsToInsertStmt = db.prepare(
                `INSERT INTO solicitud_items (id_solicitud, necesidad, descripcion, especificaciones, cantidad, observaciones, ruta_imagen)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`
            );
            const itemsToUpdateStmt = db.prepare(
                `UPDATE solicitud_items SET
                    necesidad = ?,
                    descripcion = ?,
                    especificaciones = ?,
                    cantidad = ?,
                    observaciones = ?,
                    ruta_imagen = ?
                 WHERE id = ? AND id_solicitud = ?`
            );

            const processedItemIds = new Set();

            for (const item of items) {
                // Convertir campos de texto a mayúsculas
                const upperDescripcion = item.descripcion ? item.descripcion.toUpperCase() : null;
                const upperEspecificaciones = item.especificaciones ? item.especificaciones.toUpperCase() : null;
                const upperObservaciones = item.observaciones ? item.observaciones.toUpperCase() : null;

                if (item.id && existingItemIds.has(item.id)) {
                    // Actualizar item existente
                    itemsToUpdateStmt.run(
                        item.necesidad,
                        upperDescripcion,
                        upperEspecificaciones,
                        item.cantidad,
                        upperObservaciones,
                        item.ruta_imagen || null,
                        item.id,
                        id_solicitud_numerico
                    );
                    processedItemIds.add(item.id);
                } else {
                    // Insertar nuevo item
                    const newItemResult = itemsToInsertStmt.run(
                        id_solicitud_numerico,
                        item.necesidad,
                        upperDescripcion,
                        upperEspecificaciones,
                        item.cantidad,
                        upperObservaciones,
                        item.ruta_imagen || null
                    );

                    processedItemIds.add(newItemResult.lastInsertRowid);
                }
            }

            // Eliminar items que ya no están en la lista
            const itemsToDelete = [...existingItemIds].filter(id => !processedItemIds.has(id));
            if (itemsToDelete.length > 0) {
                const deleteItemsStmt = db.prepare(`DELETE FROM solicitud_items WHERE id IN (${itemsToDelete.map(() => '?').join(',')}) AND id_solicitud = ?`);
                deleteItemsStmt.run(...itemsToDelete, id_solicitud_numerico);
            }
        });

        updateSolicitud();

        return NextResponse.json({ message: 'Solicitud actualizada correctamente.' }, { status: 200 });

    } catch (error) {
        console.error('Error al actualizar la solicitud:', error);
        return NextResponse.json({ message: 'Error interno del servidor al actualizar la solicitud.' }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
  const session = await getSession();
  const { id: solicitud_public_id } = params; // The public solicitud_id (e.g., RT-000001)

  // 1. Solo usuarios autenticados pueden intentar borrar
  if (!session) {
    return NextResponse.json({ message: 'Acceso no autorizado: No hay sesión activa.' }, { status: 401 });
  }

  try {
    // Obtener el ID numérico interno de la solicitud a partir del ID público
    const getSolicitudInternaIdStmt = db.prepare('SELECT id, estado FROM solicitudes WHERE solicitud_id = ?');
    const solicitudInterna = getSolicitudInternaIdStmt.get(solicitud_public_id);

    if (!solicitudInterna) {
      return NextResponse.json({ message: 'Solicitud no encontrada.' }, { status: 404 });
    }
    const { id: id_solicitud_numerico, estado: solicitud_estado } = solicitudInterna;

    // A. Lógica para administradores
    if (session.rol?.toLowerCase() === 'administrador') {

      if (solicitud_estado === 'pendiente' || solicitud_estado === 'PENDIENTE_APROBACION') {
        return NextResponse.json({ message: 'Los administradores no pueden eliminar solicitudes en estado pendiente de aprobación.' }, { status: 403 });
      }

      // Proceed to deletion logic below
    }
    // C. Otros roles no pueden eliminar
    else {

      return NextResponse.json({ message: 'Acceso no autorizado: Su rol no tiene permiso para eliminar solicitudes.' }, { status: 403 });
    }

    // Usar una transacción para asegurar la integridad de los datos
    const deleteSolicitud = db.transaction(() => {
      // Eliminar los ítems de la solicitud
      db.prepare('DELETE FROM solicitud_items WHERE id_solicitud = ?').run(id_solicitud_numerico);
      // Eliminar los registros de aprobación
      db.prepare('DELETE FROM solicitud_aprobaciones WHERE solicitud_id = ?').run(solicitud_public_id);
      // Eliminar la solicitud principal
      const result = db.prepare('DELETE FROM solicitudes WHERE id = ?').run(id_solicitud_numerico);

      if (result.changes === 0) {
        throw new Error('La solicitud no pudo ser eliminada.');
      }
    });

    deleteSolicitud();

    return NextResponse.json({ message: 'Solicitud eliminada correctamente.' }, { status: 200 });

  } catch (error) {
    console.error('Error al eliminar la solicitud:', error);
    return NextResponse.json({ message: 'Error interno del servidor al eliminar la solicitud.' }, { status: 500 });
  }
}