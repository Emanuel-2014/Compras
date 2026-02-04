import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

// Helper function to check authorization
async function checkAuth(session, itemId) {
  if (!session) {
    return { authorized: false, message: 'Acceso no autorizado: No hay sesión activa.' };
  }

  // Get the solicitud associated with the item
  const getSolicitudStmt = db.prepare(`
    SELECT s.id, s.solicitud_id, s.estado, s.id_usuario AS creador_id
    FROM solicitudes s
    JOIN solicitud_items si ON s.id = si.id_solicitud
    WHERE si.id = ?
  `);
  const solicitud = getSolicitudStmt.get(itemId);

  if (!solicitud) {
    return { authorized: false, message: 'Ítem o solicitud no encontrada.' };
  }

  const { solicitud_id, estado, creador_id } = solicitud;
  const estadoUpper = estado.toUpperCase();

  if (['APROBADA', 'EN PROCESO', 'CERRADA'].includes(estadoUpper)) {
    return { authorized: false, message: 'No se pueden modificar los ítems de una solicitud que ya ha sido aprobada.' };
  }

  // In editable states ('BORRADOR', 'PENDIENTE_APROBACION', 'RECHAZADO')...
  // Rule 1: Admin can edit.
  if (session.rol?.toLowerCase() === 'administrador') {
    return { authorized: true };
  }

  // Rule 2: The creator can edit if the solicitud is DRAFT or REJECTED.
  if (session.id === creador_id) {
    if (estadoUpper === 'BORRADOR' || estadoUpper === 'RECHAZADO') {
      return { authorized: true };
    }
  }

  // Rule 3: The current approver can edit if the solicitud is PENDING APPROVAL.
  if (session.rol?.toLowerCase() === 'aprobador' && estadoUpper === 'PENDIENTE_APROBACION') {
    const nextApprovalStmt = db.prepare(`
      SELECT aprobador_id FROM solicitud_aprobaciones
      WHERE solicitud_id = ? AND estado = 'pendiente' ORDER BY orden ASC LIMIT 1
    `);
    const nextApproval = nextApprovalStmt.get(solicitud_id);
    if (nextApproval && nextApproval.aprobador_id === session.id) {
      return { authorized: true };
    }
  }

  return { authorized: false, message: 'No tiene permiso para modificar este ítem en el estado actual de la solicitud.' };
}

export async function PUT(request, context) {
  const id = context.params.id;
  const session = await getSession();

  const auth = await checkAuth(session, id);
  if (!auth.authorized) {
      return NextResponse.json({ message: auth.message }, { status: 403 });
  }

  let { descripcion, cantidad, especificaciones, observaciones, precio_unitario } = await request.json();

  // El precio unitario es opcional durante la edición por un aprobador.
  if (!descripcion || !cantidad) {
    return NextResponse.json({ message: 'La descripción y la cantidad son campos obligatorios.' }, { status: 400 });
  }

  // Convertir a mayúsculas
  if (descripcion) descripcion = descripcion.toUpperCase();
  if (especificaciones) especificaciones = especificaciones.toUpperCase();
  if (observaciones) observaciones = observaciones.toUpperCase();

  try {
    const stmt = db.prepare(`
      UPDATE solicitud_items
      SET
        descripcion = COALESCE(?, descripcion),
        cantidad = COALESCE(?, cantidad),
        especificaciones = COALESCE(?, especificaciones),
        observaciones = COALESCE(?, observaciones),
        precio_unitario = COALESCE(?, precio_unitario)
      WHERE id = ?
    `);
    const info = stmt.run(descripcion, cantidad, especificaciones, observaciones, precio_unitario, id);

    if (info.changes === 0) {
      return NextResponse.json({ message: 'Ítem no encontrado o sin cambios para actualizar' }, { status: 404 });
    }

    // This will only run if precio_unitario and cantidad were updated
    if (precio_unitario !== undefined && cantidad !== undefined) {
        const updateSolicitudTotalStmt = db.prepare(`
        UPDATE solicitudes
        SET
            valor_total = (SELECT SUM(cantidad * precio_unitario) FROM solicitud_items WHERE id_solicitud = solicitudes.id)
        WHERE id = (SELECT id_solicitud FROM solicitud_items WHERE id = ?)
        `);
        updateSolicitudTotalStmt.run(id);
    }

    return NextResponse.json({ message: 'Ítem actualizado correctamente' });
  } catch (error) {
    console.error('Error updating item:', error);
    return NextResponse.json({ message: 'Error interno del servidor al actualizar el ítem' }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  const id = context.params.id;
  const session = await getSession();

  const auth = await checkAuth(session, id);
  if (!auth.authorized) {
    return NextResponse.json({ message: auth.message }, { status: 403 });
  }

  try {
    // Get id_solicitud before deleting the item to update solicitud total
    const getSolicitudIdStmt = db.prepare('SELECT id_solicitud FROM solicitud_items WHERE id = ?');
    const { id_solicitud } = getSolicitudIdStmt.get(id);

    const stmt = db.prepare('DELETE FROM solicitud_items WHERE id = ?');
    const info = stmt.run(id);

    if (info.changes === 0) {
      return NextResponse.json({ message: 'Ítem no encontrado' }, { status: 404 });
    }

    // After deleting the item, update the total amount of the solicitud
    const updateSolicitudTotalStmt = db.prepare(`
      UPDATE solicitudes
      SET
        valor_total = (SELECT SUM(cantidad * precio_unitario) FROM solicitud_items WHERE id_solicitud = ?)
      WHERE id = ?
    `);
    updateSolicitudTotalStmt.run(id_solicitud, id_solicitud);

    return NextResponse.json({ message: 'Ítem eliminado correctamente' });
  } catch (error) {
    console.error('Error deleting item:', error);
    return NextResponse.json({ message: 'Error interno del servidor al eliminar el ítem' }, { status: 500 });
  }
}
