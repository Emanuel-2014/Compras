import { NextResponse } from 'next/server';
import db from '@/lib/db';
import ExcelJS from 'exceljs';
import { addCompanyHeader } from '@/lib/excelUtilsServer';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    // Construir filtros desde query params
    const filters = {
      estado: searchParams.get('estado') || '',
      fecha: searchParams.get('fecha') || '',
      solicitanteId: searchParams.get('solicitanteId') || searchParams.get('usuario_id') || '',
      dependencia: searchParams.get('dependencia') || '',
      item_descripcion: searchParams.get('item_descripcion') || '',
      proveedorId: searchParams.get('proveedorId') || searchParams.get('proveedor_id') || ''
    };

    // Construir la query SQL basada en los filtros
    let query = `
      SELECT
        s.solicitud_id,
        u.nombre as usuario_nombre,
        s.fecha_solicitud,
        s.estado,
        d.nombre as solicitante_dependencia,
        p.nombre as proveedor_nombre
      FROM solicitudes s
      LEFT JOIN usuarios u ON s.id_usuario = u.id
      LEFT JOIN dependencias d ON u.dependencia_id = d.id
      LEFT JOIN proveedores p ON s.id_proveedor = p.id
      WHERE 1=1
    `;

    const params = [];

    if (filters.estado) {
      query += ' AND s.estado = ?';
      params.push(filters.estado);
    }
    if (filters.fecha) {
      query += ' AND DATE(s.fecha_solicitud) = ?';
      params.push(filters.fecha);
    }
    if (filters.solicitanteId) {
      query += ' AND s.id_usuario = ?';
      params.push(parseInt(filters.solicitanteId));
    }
    if (filters.dependencia) {
      query += ' AND d.nombre = ?';
      params.push(filters.dependencia);
    }
    if (filters.proveedorId) {
      query += ' AND s.id_proveedor = ?';
      params.push(parseInt(filters.proveedorId));
    }

    query += ' ORDER BY s.fecha_solicitud DESC';

    const stmt = db.prepare(query);
    const solicitudes = stmt.all(...params);

    // Crear el workbook de ExcelJS
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Solicitudes');

    // Agregar encabezado estándar con logo y configuración de la empresa
    const headerRows = await addCompanyHeader(worksheet);
    const tableStartRow = headerRows + 1;

    // Definir columnas
    const columns = [
      { header: 'ID SOLICITUD', key: 'solicitud_id', width: 15 },
      { header: 'USUARIO', key: 'usuario_nombre', width: 25 },
      { header: 'FECHA', key: 'fecha_solicitud', width: 15 },
      { header: 'ESTADO', key: 'estado', width: 25 },
      { header: 'DEPENDENCIA', key: 'solicitante_dependencia', width: 25 },
      { header: 'PROVEEDOR', key: 'proveedor_nombre', width: 30 }
    ];

    worksheet.columns = columns.map(c => ({ width: c.width }));

    // Agregar tabla con datos
    worksheet.addTable({
      name: 'Solicitudes',
      ref: `A${tableStartRow}`,
      headerRow: true,
      style: {
        theme: 'TableStyleLight9',
        showRowStripes: true,
      },
      columns: columns.map(c => ({ name: c.header, filterButton: true })),
      rows: solicitudes.map(sol => [
        sol.solicitud_id,
        sol.usuario_nombre,
        new Date(sol.fecha_solicitud).toLocaleDateString('es-CO'),
        sol.estado,
        sol.solicitante_dependencia || 'N/A',
        sol.proveedor_nombre || 'N/A'
      ]),
    });

    // Generar el buffer del Excel
    const buffer = await workbook.xlsx.writeBuffer();

    // Retornar el archivo
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Gestion_Solicitudes.xlsx"'
      }
    });

  } catch (error) {
    console.error('Error generating Excel:', error);
    return NextResponse.json(
      { error: 'Error al generar el archivo Excel', details: error.message },
      { status: 500 }
    );
  }
}
