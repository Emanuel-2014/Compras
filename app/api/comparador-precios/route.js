
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

// Helper to get a setting from the app_settings table
const getSetting = (key, defaultValue) => {
  try {
    const stmt = db.prepare('SELECT value FROM app_settings WHERE key = ?');
    const setting = stmt.get(key);
    return setting ? setting.value : defaultValue;
  } catch (error) {
    console.error(`Error getting setting ${key}:`, error);
    return defaultValue;
  }
};

export async function GET(request) {
  const session = await getSession();
  if (!session) {
    return new NextResponse(JSON.stringify({ message: 'No autorizado.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Restringir acceso solo a administradores
  if (session.rol?.toLowerCase() !== 'administrador') {
    return new NextResponse(JSON.stringify({ message: 'Acceso denegado. Recurso solo para administradores.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { searchParams } = new URL(request.url);
  const descripcion = searchParams.get('descripcion');

  try {
    // 1. Obtener la tasa de IVA de la configuración
    const ivaPercentageString = getSetting('iva_percentage', '19');
    const ivaRate = parseFloat(ivaPercentageString) / 100;
    if (isNaN(ivaRate)) {
        throw new Error('El valor de IVA configurado no es un número válido.');
    }

    let items = [];

    if (!descripcion || descripcion.trim() === '') {
      // Si no hay descripción, buscar todos los items de las facturas más recientes
      const allItemsQuery = `
        SELECT
          fci.id,
          fci.descripcion,
          fci.precio_unitario,
          fci.incluye_iva,
          fc.fecha_emision,
          p.nombre AS proveedor_nombre
        FROM factura_compra_items AS fci
        JOIN facturas_compras AS fc ON fci.factura_compra_id = fc.id
        JOIN proveedores AS p ON fc.proveedor_id = p.id
        ORDER BY fc.fecha_emision DESC;
      `;
      items = db.prepare(allItemsQuery).all();

      if (items.length === 0) {
        return NextResponse.json([]); // No items found at all
      }
    } else {
      // 2. Construir y ejecutar la consulta SQL basada en el término de búsqueda
      const query = `
        SELECT
          fci.id,
          fci.descripcion,
          fci.precio_unitario,
          fci.incluye_iva,
          fc.fecha_emision,
          p.nombre AS proveedor_nombre
        FROM factura_compra_items AS fci
        JOIN facturas_compras AS fc ON fci.factura_compra_id = fc.id
        JOIN proveedores AS p ON fc.proveedor_id = p.id
        WHERE LOWER(fci.descripcion) LIKE LOWER(?)
        ORDER BY fc.fecha_emision DESC;
      `;

      // Usamos '%' para buscar coincidencias parciales
      const searchTermWithWildcards = `%${descripcion}%`;
      const stmt = db.prepare(query);
      items = stmt.all(searchTermWithWildcards);
    }

    // 3. Procesar los resultados para calcular el precio final con IVA
    const resultsWithFinalPrice = items.map(item => {
      const precioUnitario = parseFloat(item.precio_unitario);
      let precioFinalConIva;

      if (item.incluye_iva) { // El precio ya tiene IVA
        precioFinalConIva = precioUnitario;
      } else { // El precio no tiene IVA, hay que sumarlo
        precioFinalConIva = precioUnitario * (1 + ivaRate);
      }

      return {
        id: item.id,
        descripcion: item.descripcion,
        proveedor_nombre: item.proveedor_nombre,
        fecha_emision: item.fecha_emision,
        precio_registrado: precioUnitario,
        incluye_iva: !!item.incluye_iva, // Convertir a booleano
        precio_final_con_iva: precioFinalConIva,
      };
    });

    // 4. Agrupar por descripción similar y encontrar el mejor precio por grupo
    if (resultsWithFinalPrice.length === 0) {
      return NextResponse.json([]);
    }

    // Agrupar artículos por descripción (case-insensitive y sin espacios extra)
    const groupedItems = {};
    resultsWithFinalPrice.forEach(item => {
      const normalizedDescription = item.descripcion.toLowerCase().trim();
      if (!groupedItems[normalizedDescription]) {
        groupedItems[normalizedDescription] = [];
      }
      groupedItems[normalizedDescription].push(item);
    });

    // 5. Calcular diferencias dentro de cada grupo
    const results = [];

    Object.values(groupedItems).forEach(group => {
      // Encontrar el mejor precio dentro de este grupo específico
      const bestPriceInGroup = Math.min(...group.map(item => item.precio_final_con_iva));

      // Calcular diferencias para cada item del grupo
      const groupResults = group.map(item => {
        const diferencia = item.precio_final_con_iva - bestPriceInGroup;
        // Calcular porcentaje de diferencia respecto al mejor precio del grupo
        const diferencia_porcentaje = bestPriceInGroup > 0 ? (diferencia / bestPriceInGroup) * 100 : 0;

        return {
          ...item,
          diferencia_precio: diferencia,
          diferencia_porcentaje: diferencia_porcentaje,
          es_mejor_precio_grupo: Math.abs(item.precio_final_con_iva - bestPriceInGroup) < 0.01
        };
      });

      results.push(...groupResults);
    });

    return NextResponse.json(results);

  } catch (error) {
    console.error('Error al obtener la comparación de precios:', error);
    return new NextResponse(JSON.stringify({ message: 'Error interno del servidor al procesar la solicitud.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
