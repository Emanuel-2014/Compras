// app/api/recepciones/route.js
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  try {
    const recepciones = await request.json(); // Se espera un array de recepciones
    const usuario_id = session.id;

    if (!Array.isArray(recepciones) || recepciones.length === 0) {
      return NextResponse.json({ message: 'Datos inválidos. Se requiere un array de recepciones.' }, { status: 400 });
    }

    // Validar cada recepción en el array
    for (const item of recepciones) {
      if (!item.id_solicitud_item || !item.cantidad_recibida || item.cantidad_recibida <= 0) {
        return NextResponse.json({ message: 'Cada recepción debe tener ID de ítem y una cantidad positiva.' }, { status: 400 });
      }
    }

    // Envuelve todo el proceso en una transacción para garantizar la atomicidad
    const registerReceptionAndUpdateStatus = db.transaction(() => {
      const stmt = db.prepare(
        `INSERT INTO recepciones_item (id_solicitud_item, cantidad_recibida, usuario_id, fecha_recepcion, prefijo_factura_recepcion, numero_factura_recepcion)
         VALUES (?, ?, ?, ?, ?, ?)`
      );

      for (const item of recepciones) {
        stmt.run(
          item.id_solicitud_item,
          item.cantidad_recibida,
          usuario_id,
          new Date().toISOString(),
          item.prefijo_factura_recepcion ? item.prefijo_factura_recepcion.toUpperCase() : null,
          item.numero_factura_recepcion ? item.numero_factura_recepcion.toUpperCase() : null
        );
      }

      // Asumimos que todos los items pertenecen a la misma solicitud
      const firstItemId = recepciones[0].id_solicitud_item;
      const itemStmt = db.prepare('SELECT id_solicitud FROM solicitud_items WHERE id = ?');
      const itemData = itemStmt.get(firstItemId);
      if (!itemData) {
          throw new Error('Ítem de solicitud no encontrado.');
      }
      const { id_solicitud } = itemData;

      const allItemsStmt = db.prepare('SELECT id, cantidad FROM solicitud_items WHERE id_solicitud = ?');
      const allItems = allItemsStmt.all(id_solicitud);

      let totalSolicitado = 0;
      let totalRecibido = 0;
      const receivedQtyStmt = db.prepare('SELECT SUM(cantidad_recibida) as total FROM recepciones_item WHERE id_solicitud_item = ?');

      for (const anItem of allItems) {
          totalSolicitado += anItem.cantidad;
          const received = receivedQtyStmt.get(anItem.id);
          if (received && received.total) {
              totalRecibido += received.total;
          }
      }

      if (totalSolicitado > 0) {
          const cumplimiento = (totalRecibido / totalSolicitado);
          if (cumplimiento >= 1) {
              const updateStmt = db.prepare("UPDATE solicitudes SET estado = 'cerrada' WHERE id = ? AND estado != 'cerrada'");
              updateStmt.run(id_solicitud);
          }
      }
    });

    registerReceptionAndUpdateStatus();

    return NextResponse.json({ message: 'Recepción registrada exitosamente' }, { status: 201 });

  } catch (error) {
    console.error('Error en POST /api/recepciones:', error);
    console.error('Stack trace:', error.stack);
    return NextResponse.json({
      message: error.message || 'Error interno del servidor.',
      error_details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}