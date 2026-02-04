// app/api/comparador-precios-simple/route.js
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
    if (!user) {
      return NextResponse.json({ message: 'Sesión inválida' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const descripcion = searchParams.get('descripcion');

    if (!descripcion || descripcion.trim().length < 3) {
      return NextResponse.json({ message: 'La descripción debe tener al menos 3 caracteres' }, { status: 400 });
    }

    // Buscar precios históricos del mismo producto o similares
    const query = `
      SELECT
        si.precio_unitario,
        s.fecha_solicitud,
        'Solicitud' as tipo_documento,
        ri.fecha_recepcion,
        COUNT(*) as frecuencia
      FROM solicitud_items si
      JOIN solicitudes s ON si.id_solicitud = s.id
      LEFT JOIN recepciones_item ri ON si.id = ri.id_solicitud_item
      WHERE si.descripcion LIKE ?
        AND si.precio_unitario > 0
      GROUP BY si.precio_unitario
      ORDER BY ri.fecha_recepcion DESC, si.precio_unitario ASC
      LIMIT 10
    `;

    const historialPrecios = db.prepare(query).all(`%${descripcion}%`);

    // Calcular estadísticas
    let estadisticas = {
      precio_promedio: 0,
      precio_minimo: 0,
      precio_maximo: 0,
      total_registros: historialPrecios.length,
      recomendacion: ''
    };

    if (historialPrecios.length > 0) {
      const precios = historialPrecios.map(h => parseFloat(h.precio_unitario));
      estadisticas.precio_minimo = Math.min(...precios);
      estadisticas.precio_maximo = Math.max(...precios);
      estadisticas.precio_promedio = precios.reduce((sum, p) => sum + p, 0) / precios.length;

      // Generar recomendación
      if (precios.length >= 3) {
        const rango = estadisticas.precio_maximo - estadisticas.precio_minimo;
        const variacion = (rango / estadisticas.precio_promedio) * 100;

        if (variacion > 30) {
          estadisticas.recomendacion = 'ALTA_VARIACION';
        } else if (variacion > 15) {
          estadisticas.recomendacion = 'VARIACION_MODERADA';
        } else {
          estadisticas.recomendacion = 'PRECIO_ESTABLE';
        }
      }
    }

    return NextResponse.json({
      descripcion_buscada: descripcion,
      historial_precios: historialPrecios,
      estadisticas
    });

  } catch (error) {
    console.error('Error en comparador de precios:', error);
    return NextResponse.json({
      message: 'Error interno del servidor',
      error: error.message
    }, { status: 500 });
  }
}