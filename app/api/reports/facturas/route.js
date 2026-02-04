import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request) {
  const session = await getSession();
  if (!session || session.user.rol?.toLowerCase() !== 'administrador') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const dependenciaId = searchParams.get('dependenciaId');
  const solicitanteId = searchParams.get('solicitanteId');
  const proveedorId = searchParams.get('proveedorId') || searchParams.get('proveedor_id');

  try {
    let query = `
      SELECT
        fc.id,
        fc.numero_factura,
        fc.fecha_emision,
        fc.archivo_path,
        fc.id_solicitud,
        p.nombre AS proveedor_nombre,
        u.nombre AS solicitante_nombre,
        u.dependencia AS dependencia_nombre,
        fc.total AS total_factura
      FROM facturas_compras fc
      JOIN proveedores p ON fc.proveedor_id = p.id
      LEFT JOIN solicitudes s ON fc.id_solicitud = s.id
      LEFT JOIN usuarios u ON s.id_usuario = u.id
    `;

    const params = [];
    const whereClauses = [];

    if (startDate) {
      whereClauses.push('fc.fecha_emision >= ?');
      params.push(startDate);
    }
    if (endDate) {
      whereClauses.push('fc.fecha_emision <= ?');
      params.push(endDate);
    }
    if (dependenciaId) {
      whereClauses.push('u.dependencia = ?');
      params.push(dependenciaId);
    }
    if (solicitanteId) {
      whereClauses.push('u.id = ?');
      params.push(solicitanteId);
    }
    if (proveedorId) {
      whereClauses.push('p.id = ?');
      params.push(parseInt(proveedorId));
    }

    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
    }

    query += ' GROUP BY fc.id ORDER BY fc.fecha_emision DESC';

    const facturas = db.prepare(query).all(params);

    // Fetch items for each factura
    for (const factura of facturas) {
      const items = db.prepare('SELECT * FROM factura_compra_items WHERE factura_compra_id = ?').all(factura.id);
      factura.items = items;
    }

    // Calculate summary
    const totalFacturas = facturas.length;
    const valorTotalFacturado = facturas.reduce((sum, factura) => sum + factura.total_factura, 0);

    // Fetch filter options
    const dependencias = db.prepare('SELECT DISTINCT dependencia AS nombre, dependencia AS id FROM usuarios WHERE dependencia IS NOT NULL').all();
    const solicitantes = db.prepare('SELECT id, nombre FROM usuarios WHERE rol = "solicitante" ORDER BY nombre').all(); // Asumiendo rol 'solicitante'
    const proveedores = db.prepare('SELECT id, nombre FROM proveedores ORDER BY nombre').all();

    return NextResponse.json({
      summary: {
        totalFacturas,
        valorTotalFacturado,
      },
      facturas,
      filterOptions: {
        dependencias,
        solicitantes,
        proveedores,
      },
    });

  } catch (error) {
    console.error('Error fetching facturas report:', error);
    return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
  }
}
