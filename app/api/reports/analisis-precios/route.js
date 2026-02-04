// app/api/reports/analisis-precios/route.js
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth';

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const user = verifySessionToken(sessionCookie.value);
    if (!user || (user.rol?.toLowerCase() !== 'administrador' && user.rol?.toLowerCase() !== 'coordinador')) {
      return NextResponse.json({ message: 'Sin permisos suficientes' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const fechaDesde = searchParams.get('fecha_desde') || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const fechaHasta = searchParams.get('fecha_hasta') || new Date().toISOString().split('T')[0];

    // 1. Productos con mayor variación de precio
    const variacionesPrecios = db.prepare(`
      SELECT
        si.descripcion,
        COUNT(DISTINCT si.precio_unitario) as variaciones_precio,
        MIN(si.precio_unitario) as precio_minimo,
        MAX(si.precio_unitario) as precio_maximo,
        AVG(si.precio_unitario) as precio_promedio,
        ((MAX(si.precio_unitario) - MIN(si.precio_unitario)) / AVG(si.precio_unitario) * 100) as porcentaje_variacion,
        COUNT(*) as total_recepciones,
        GROUP_CONCAT(DISTINCT p.nombre) as proveedores
      FROM solicitud_items si
      JOIN solicitudes s ON si.id_solicitud = s.id
      JOIN recepciones_item ri ON si.id = ri.id_solicitud_item
      LEFT JOIN proveedores p ON s.proveedor_id = p.id
      WHERE ri.fecha_recepcion BETWEEN ? AND ?
        AND si.precio_unitario > 0
      GROUP BY si.descripcion
      HAVING COUNT(DISTINCT si.precio_unitario) > 1
      ORDER BY porcentaje_variacion DESC
      LIMIT 20
    `).all(fechaDesde, fechaHasta);

    // 2. Top proveedores por volumen y precio promedio
    const analisisProveedores = db.prepare(`
      SELECT
        p.nombre as proveedor_nombre,
        COUNT(DISTINCT si.descripcion) as productos_diferentes,
        SUM(ri.cantidad_recibida * si.precio_unitario) as valor_total_recibido,
        AVG(si.precio_unitario) as precio_promedio,
        COUNT(ri.id) as total_recepciones,
        SUM(ri.cantidad_recibida) as cantidad_total_recibida
      FROM recepciones_item ri
      JOIN solicitud_items si ON ri.id_solicitud_item = si.id
      JOIN solicitudes s ON si.id_solicitud = s.id
      JOIN proveedores p ON s.proveedor_id = p.id
      WHERE ri.fecha_recepcion BETWEEN ? AND ?
        AND si.precio_unitario > 0
      GROUP BY p.id, p.nombre
      ORDER BY valor_total_recibido DESC
      LIMIT 15
    `).all(fechaDesde, fechaHasta);

    // 3. Productos más comprados (por valor)
    const productosTop = db.prepare(`
      SELECT
        si.descripcion,
        SUM(ri.cantidad_recibida * si.precio_unitario) as valor_total,
        SUM(ri.cantidad_recibida) as cantidad_total,
        AVG(si.precio_unitario) as precio_promedio,
        COUNT(DISTINCT s.proveedor_id) as proveedores_diferentes,
        COUNT(ri.id) as frecuencia_compra
      FROM recepciones_item ri
      JOIN solicitud_items si ON ri.id_solicitud_item = si.id
      JOIN solicitudes s ON si.id_solicitud = s.id
      WHERE ri.fecha_recepcion BETWEEN ? AND ?
        AND si.precio_unitario > 0
      GROUP BY si.descripcion
      ORDER BY valor_total DESC
      LIMIT 20
    `).all(fechaDesde, fechaHasta);

    // 4. Alertas de precios (productos con cambios significativos recientes)
    const alertasPrecios = db.prepare(`
      SELECT
        si.descripcion,
        si.precio_unitario as precio_actual,
        p.nombre as proveedor_nombre,
        ri.fecha_recepcion,
        (
          SELECT AVG(si2.precio_unitario)
          FROM solicitud_items si2
          JOIN recepciones_item ri2 ON si2.id = ri2.id_solicitud_item
          WHERE si2.descripcion = si.descripcion
            AND ri2.fecha_recepcion < ri.fecha_recepcion
            AND si2.precio_unitario > 0
        ) as precio_historico_promedio
      FROM recepciones_item ri
      JOIN solicitud_items si ON ri.id_solicitud_item = si.id
      JOIN solicitudes s ON si.id_solicitud = s.id
      JOIN proveedores p ON s.proveedor_id = p.id
      WHERE ri.fecha_recepcion BETWEEN ? AND ?
        AND si.precio_unitario > 0
      HAVING precio_historico_promedio IS NOT NULL
        AND ABS((si.precio_unitario - precio_historico_promedio) / precio_historico_promedio * 100) > 15
      ORDER BY ri.fecha_recepcion DESC
      LIMIT 10
    `).all(fechaDesde, fechaHasta);

    // Agregar cálculo de porcentaje de cambio a las alertas
    const alertasConPorcentaje = alertasPrecios.map(alerta => ({
      ...alerta,
      porcentaje_cambio: alerta.precio_historico_promedio ?
        ((alerta.precio_actual - alerta.precio_historico_promedio) / alerta.precio_historico_promedio * 100) : 0
    }));

    // 5. Resumen ejecutivo
    const resumen = {
      total_recepciones: db.prepare(`
        SELECT COUNT(*) as count
        FROM recepciones_item
        WHERE fecha_recepcion BETWEEN ? AND ?
      `).get(fechaDesde, fechaHasta)?.count || 0,

      valor_total_periodo: db.prepare(`
        SELECT SUM(ri.cantidad_recibida * si.precio_unitario) as total
        FROM recepciones_item ri
        JOIN solicitud_items si ON ri.id_solicitud_item = si.id
        WHERE ri.fecha_recepcion BETWEEN ? AND ?
          AND si.precio_unitario > 0
      `).get(fechaDesde, fechaHasta)?.total || 0,

      productos_unicos: db.prepare(`
        SELECT COUNT(DISTINCT si.descripcion) as count
        FROM recepciones_item ri
        JOIN solicitud_items si ON ri.id_solicitud_item = si.id
        WHERE ri.fecha_recepcion BETWEEN ? AND ?
      `).get(fechaDesde, fechaHasta)?.count || 0,

      proveedores_activos: db.prepare(`
        SELECT COUNT(DISTINCT s.proveedor_id) as count
        FROM recepciones_item ri
        JOIN solicitud_items si ON ri.id_solicitud_item = si.id
        JOIN solicitudes s ON si.id_solicitud = s.id
        WHERE ri.fecha_recepcion BETWEEN ? AND ?
      `).get(fechaDesde, fechaHasta)?.count || 0
    };

    return NextResponse.json({
      periodo: { fecha_desde: fechaDesde, fecha_hasta: fechaHasta },
      resumen_ejecutivo: resumen,
      variaciones_precios,
      analisis_proveedores,
      productos_top,
      alertas_precios: alertasConPorcentaje
    });

  } catch (error) {
    console.error('Error en análisis de precios:', error);
    return NextResponse.json({
      message: 'Error interno del servidor',
      error: error.message
    }, { status: 500 });
  }
}