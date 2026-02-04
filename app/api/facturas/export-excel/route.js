import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import ExcelJS from 'exceljs';
import { addCompanyHeader } from '@/lib/excelUtilsServer';

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

    let query = `
      SELECT
        fc.id,
        fc.prefijo,
        fc.numero_factura,
        fc.fecha_emision,
        fc.fecha_creacion,
        p.nombre AS proveedor_nombre,
        u.nombre AS usuario_nombre,
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

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY fc.fecha_emision DESC, fc.id DESC';

    const stmt = db.prepare(query);
    const facturas = stmt.all(params);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Facturas');

    const headerRows = await addCompanyHeader(worksheet);
    const tableStartRow = headerRows + 1;

    const columns = [
      { header: 'Prefijo', key: 'prefijo', width: 10 },
      { header: 'Nº Factura', key: 'numero_factura', width: 20 },
      { header: 'Proveedor', key: 'proveedor_nombre', width: 30 },
      { header: 'Fecha de Emisión', key: 'fecha_emision', width: 15, style: { numFmt: 'dd/mm/yyyy' } },
      { header: 'Valor Total', key: 'valor_total', width: 20, style: { numFmt: '"$"#,##0' } },
      { header: 'Registrado por', key: 'usuario_nombre', width: 25 },
      { header: 'Fecha de Registro', key: 'fecha_creacion', width: 20, style: { numFmt: 'dd/mm/yyyy h:mm AM/PM' } },
    ];

    worksheet.columns = columns.map(c => ({ width: c.width }));

    const dataForTable = facturas.map(factura => ({
        ...factura,
        fecha_emision: new Date(factura.fecha_emision),
        fecha_creacion: new Date(factura.fecha_creacion),
        valor_total: Number(factura.valor_total) || 0
    }));

    worksheet.addTable({
        name: 'Facturas',
        ref: `A${tableStartRow}`,
        headerRow: true,
        style: {
          theme: 'TableStyleLight9',
          showRowStripes: true,
        },
        columns: columns.map(c => ({ name: c.header, filterButton: true })),
        rows: dataForTable.map(row => columns.map(c => row[c.key])),
    });

    // Apply specific cell formatting after adding the table
    const valorTotalColIndex = columns.findIndex(c => c.key === 'valor_total') + 1;
    const fechaEmisionColIndex = columns.findIndex(c => c.key === 'fecha_emision') + 1;
    const fechaCreacionColIndex = columns.findIndex(c => c.key === 'fecha_creacion') + 1;

    worksheet.getColumn(valorTotalColIndex).numFmt = '"$"#,##0.00';
    worksheet.getColumn(fechaEmisionColIndex).numFmt = 'DD/MM/YYYY';
    worksheet.getColumn(fechaCreacionColIndex).numFmt = 'DD/MM/YYYY hh:mm AM/PM';

    const buffer = await workbook.xlsx.writeBuffer();

    const headers = new Headers();
    headers.append('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    headers.append('Content-Disposition', 'attachment; filename="reporte_facturas.xlsx"');

    return new NextResponse(buffer, { status: 200, headers });

  } catch (error) {
    console.error('Error al exportar facturas a Excel:', error);
    return new NextResponse(JSON.stringify({ message: 'Error interno del servidor' }), { status: 500 });
  }
}
