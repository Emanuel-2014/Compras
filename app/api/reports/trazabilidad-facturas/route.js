// app/api/reports/trazabilidad-facturas/route.js
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth';

export async function GET(request) {
  try {
    console.log('Trazabilidad API: Iniciando proceso...');

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie) {
      console.log('Trazabilidad API: No hay sesión activa');
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const user = verifySessionToken(sessionCookie.value);
    if (!user) {
      console.log('Trazabilidad API: Sin permisos suficientes', user?.rol);
      return NextResponse.json({ message: 'Sin permisos suficientes' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    // Aceptar ambos formatos para compatibilidad
    const solicitudId = searchParams.get('solicitudId') || searchParams.get('solicitud_id');

    console.log('Trazabilidad API: SolicitudId recibido:', solicitudId);
    console.log('Trazabilidad API: Parámetros recibidos:', {
      solicitudId: searchParams.get('solicitudId'),
      solicitud_id: searchParams.get('solicitud_id')
    });

    if (!solicitudId || solicitudId.trim() === '') {
      console.log('Trazabilidad API: ID de solicitud requerido');
      return NextResponse.json({
        message: 'ID de solicitud requerido',
        error: 'MISSING_SOLICITUD_ID',
        received_params: {
          solicitudId: searchParams.get('solicitudId'),
          solicitud_id: searchParams.get('solicitud_id')
        }
      }, { status: 400 });
    }

    // 1. Información básica de la solicitud
    console.log('Trazabilidad API: Buscando solicitud:', solicitudId);

    let solicitudQuery, solicitud;
    try {
      solicitudQuery = `
        SELECT s.id, s.solicitud_id, s.fecha_solicitud, s.estado, s.id_usuario, s.id_proveedor,
               u.nombre as solicitante_nombre, p.nombre as proveedor_nombre
        FROM solicitudes s
        LEFT JOIN usuarios u ON s.id_usuario = u.id
        LEFT JOIN proveedores p ON s.id_proveedor = p.id
        WHERE s.solicitud_id = ?
      `;

      solicitud = db.prepare(solicitudQuery).get(solicitudId);
      console.log('Trazabilidad API: Solicitud encontrada:', !!solicitud);
    } catch (dbError) {
      console.error('Trazabilidad API: Error en consulta de solicitud:', dbError);
      return NextResponse.json({
        message: 'Error de base de datos',
        error: dbError.message,
        solicitudId
      }, { status: 500 });
    }

    if (!solicitud) {
      console.log('Trazabilidad API: Solicitud no encontrada, buscando disponibles...');

      try {
        // Buscar solicitudes disponibles para ayudar al usuario
        const solicitudesDisponibles = db.prepare(`
          SELECT solicitud_id FROM solicitudes
          ORDER BY fecha_solicitud DESC LIMIT 10
        `).all();

        console.log('Trazabilidad API: Solicitudes disponibles:', solicitudesDisponibles.length);

        return NextResponse.json({
          message: `Solicitud ${solicitudId} no encontrada`,
          error: 'SOLICITUD_NOT_FOUND',
          solicitudId_requested: solicitudId,
          solicitudesDisponibles: solicitudesDisponibles.map(s => s.solicitud_id)
        }, { status: 404 });
      } catch (listError) {
        console.error('Trazabilidad API: Error listando solicitudes disponibles:', listError);
        return NextResponse.json({
          message: `Solicitud ${solicitudId} no encontrada`,
          error: 'SOLICITUD_NOT_FOUND',
          solicitudId_requested: solicitudId
        }, { status: 404 });
      }
    }

    // 2. Obtener items de la solicitud (consulta simple)
    const items = db.prepare(`
      SELECT id, descripcion, cantidad, precio_unitario,
             especificaciones, necesidad
      FROM solicitud_items
      WHERE id_solicitud = ?
    `).all(solicitud.id);

    console.log('Trazabilidad API: Items encontrados:', items.length);

    // 3. Obtener recepciones (consulta simple)
    const recepciones = db.prepare(`
      SELECT ri.*, si.descripcion as item_descripcion
      FROM recepciones_item ri
      JOIN solicitud_items si ON ri.id_solicitud_item = si.id
      WHERE si.id_solicitud = ?
    `).all(solicitud.id);

    console.log('Trazabilidad API: Recepciones encontradas:', recepciones.length);

    // 4. Métricas básicas
    const metricas = {
      items_totales: items.length,
      items_recibidos: recepciones.filter(r => r.cantidad_recibida > 0).length,
      items_con_factura: recepciones.filter(r => r.prefijo_factura_recepcion && r.numero_factura_recepcion).length,
      facturas_vinculadas: [...new Set(recepciones
        .filter(r => r.prefijo_factura_recepcion && r.numero_factura_recepcion)
        .map(r => `${r.prefijo_factura_recepcion}-${r.numero_factura_recepcion}`)
      )].length
    };

    // 5. Trazabilidad simplificada
    const trazabilidadCompleta = items.map(item => {
      const recepcionesItem = recepciones.filter(r => r.id_solicitud_item === item.id);
      const primeraRecepcion = recepcionesItem[0];

      return {
        descripcion: item.descripcion,
        cantidad_solicitada: item.cantidad,
        cantidad_recibida: primeraRecepcion?.cantidad_recibida || null,
        fecha_recepcion: primeraRecepcion?.fecha_recepcion || null,
        prefijo_factura_recepcion: primeraRecepcion?.prefijo_factura_recepcion || null,
        numero_factura_recepcion: primeraRecepcion?.numero_factura_recepcion || null,
        recepcion_id: primeraRecepcion?.id || null
      };
    });

    // 6. Cálculos financieros básicos
    const valorEstimadoTotal = items.reduce((sum, item) => {
      return sum + (parseFloat(item.cantidad || 0) * parseFloat(item.precio_unitario || 0));
    }, 0);

    const resumenFinanciero = {
      valor_estimado_total: valorEstimadoTotal,
      valor_real_recibido: valorEstimadoTotal, // Simplificado por ahora
      facturas_registradas_total: 0 // Simplificado por ahora
    };

    // 7. Beneficios logrados
    const trazabilidadPorcentaje = metricas.items_totales > 0
      ? Math.round((metricas.items_con_factura / metricas.items_totales) * 100)
      : 0;

    const beneficiosLogrados = {
      trazabilidad_porcentaje: trazabilidadPorcentaje,
      control_costos: metricas.items_con_factura > 0,
      auditoria_completa: metricas.items_con_factura === metricas.items_recibidos && metricas.items_recibidos > 0,
      conciliacion_posible: metricas.facturas_vinculadas > 0
    };

    console.log('Trazabilidad API: Procesamiento completado exitosamente');

    return NextResponse.json({
      solicitud: {
        solicitud_id: solicitud.solicitud_id,
        fecha: solicitud.fecha_solicitud,
        estado: solicitud.estado,
        solicitante: solicitud.solicitante_nombre || 'No especificado',
        proveedor: solicitud.proveedor_nombre || 'No especificado'
      },
      trazabilidad_completa: trazabilidadCompleta,
      metricas_trazabilidad: metricas,
      variaciones_precios: [], // Simplificado por ahora
      resumen_financiero: resumenFinanciero,
      beneficios_logrados: beneficiosLogrados
    });

  } catch (error) {
    console.error('Error en reporte de trazabilidad:', error);
    return NextResponse.json({
      message: 'Error interno del servidor',
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}