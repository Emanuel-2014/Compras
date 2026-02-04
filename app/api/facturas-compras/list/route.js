// app/api/facturas-compras/list/route.js
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(request) {
  const session = await getSession();
  if (!session) {
    return new NextResponse(JSON.stringify({ message: 'No autorizado' }), { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const proveedorId = searchParams.get('proveedorId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const searchTerm = searchParams.get('searchTerm');
    const registeredByUserId = searchParams.get('registeredByUserId');

    let query = `
      SELECT
        fc.id,
        fc.numero_factura,
        fc.prefijo,
        fc.fecha_emision,
        fc.fecha_creacion,
        p.nombre AS proveedor_nombre,
        u.nombre AS usuario_nombre,
        u.id AS usuario_id,
        (SELECT SUM(fci.cantidad * fci.precio_unitario) FROM factura_compra_items fci WHERE fci.factura_compra_id = fc.id) AS valor_total
      FROM facturas_compras fc
      JOIN proveedores p ON fc.proveedor_id = p.id
      JOIN usuarios u ON fc.usuario_id = u.id
    `;

    const params = [];
    const conditions = [];

    if (proveedorId) {
      conditions.push('fc.proveedor_id = ?');
      params.push(proveedorId);
    }
    if (startDate) {
      conditions.push('fc.fecha_emision >= ?');
      params.push(startDate);
    }
    if (endDate) {
      conditions.push('fc.fecha_emision <= ?');
      params.push(endDate);
    }
    if (searchTerm) {
      conditions.push('fc.numero_factura LIKE ?');
      params.push(`%${searchTerm}%`);
    }
    if (registeredByUserId) {
      conditions.push('fc.usuario_id = ?');
      params.push(registeredByUserId);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY fc.fecha_creacion DESC, fc.id DESC';

    const stmt = db.prepare(query);
    const facturas = stmt.all(params);

    return NextResponse.json(facturas, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Error al obtener la lista de facturas de compra:', error);
    return new NextResponse(
      JSON.stringify({ message: 'Error interno del servidor' }),
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  }
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
