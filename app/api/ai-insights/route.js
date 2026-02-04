import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request) {
  try {
    const session = await getSession();
    if (!session || session.rol?.toLowerCase() !== 'administrador') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date();
    const last7Days = new Date(today);
    last7Days.setDate(today.getDate() - 7);
    const last30Days = new Date(today);
    last30Days.setDate(today.getDate() - 30);
    const lastYear = new Date(today);
    lastYear.setFullYear(today.getFullYear() - 1);

    const formatDate = (date) => date.toISOString().split('T')[0];
    const formattedLastYear = formatDate(lastYear);

    const totalsQuery = db.prepare(`
      SELECT
        SUM(CASE WHEN fc.fecha_emision >= ? THEN fi.cantidad * fi.precio_unitario ELSE 0 END) AS totalLast7Days,
        SUM(CASE WHEN fc.fecha_emision >= ? THEN fi.cantidad * fi.precio_unitario ELSE 0 END) AS totalLast30Days,
        SUM(CASE WHEN fc.fecha_emision >= ? THEN fi.cantidad * fi.precio_unitario ELSE 0 END) AS totalLastYear
      FROM facturas_compras fc
      JOIN factura_compra_items fi ON fc.id = fi.factura_compra_id;
    `);
    const { totalLast7Days, totalLast30Days, totalLastYear } = totalsQuery.get(
      formatDate(last7Days),
      formatDate(last30Days),
      formattedLastYear
    );

    const topProvidersQuery = db.prepare(`
      SELECT
        p.nombre AS proveedor_nombre,
        SUM(fi.cantidad * fi.precio_unitario) AS total_gastado
      FROM facturas_compras fc
      JOIN factura_compra_items fi ON fc.id = fi.factura_compra_id
      JOIN proveedores p ON fc.proveedor_id = p.id
      WHERE fc.fecha_emision >= ?
      GROUP BY p.nombre
      ORDER BY total_gastado DESC
      LIMIT 5;
    `);
    const topProvidersLast30Days = topProvidersQuery.all(formatDate(last30Days));

    const kraljicQuery = db.prepare(`
      SELECT
        fi.descripcion,
        SUM(fi.cantidad * fi.precio_unitario) as financial_impact,
        COUNT(DISTINCT fc.proveedor_id) as supply_risk
      FROM factura_compra_items fi
      JOIN facturas_compras fc ON fi.factura_compra_id = fc.id
      WHERE fc.fecha_emision >= ?
      GROUP BY fi.descripcion
      HAVING financial_impact > 0;
    `);
    const kraljicData = kraljicQuery.all(formattedLastYear);

    return NextResponse.json({
      totalLast7Days: totalLast7Days || 0,
      totalLast30Days: totalLast30Days || 0,
      totalLastYear: totalLastYear || 0,
      topProvidersLast30Days: topProvidersLast30Days,
      kraljicData: kraljicData, // Add new data to the response
    });

  } catch (error) {
    console.error('Error fetching AI insights:', error);
    return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
  }
}
