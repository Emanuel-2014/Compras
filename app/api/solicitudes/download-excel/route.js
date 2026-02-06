import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import ExcelJS from 'exceljs';
import { verifySessionToken } from '@/lib/auth';
import { parse } from 'cookie';
import { addCompanyHeader } from '@/lib/excelUtilsServer';

export async function GET(request) {
  try {
    const cookies = parse(request.headers.get('cookie') || '');
    const sessionToken = cookies.session;

    if (!sessionToken) {
      return NextResponse.json({ message: 'No autorizado: No se encontró token de sesión.' }, { status: 401 });
    }

    const user = verifySessionToken(sessionToken);

    if (!user) {
      return NextResponse.json({ message: 'No autorizado: Token de sesión inválido o expirado.' }, { status: 401 });
    }

    if (user.rol?.toLowerCase() !== 'administrador') {
      return NextResponse.json({ message: 'Acceso denegado: Se requiere rol de administrador.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const usuarioIdFilter = searchParams.get('usuarioId') || searchParams.get('usuario_id');
    const dependenciaFilter = searchParams.get('dependencia');
    const faltanteFilter = searchParams.get('faltante'); // 'true' or 'false'

    let query = `
      SELECT
        s.solicitud_id,
        s.fecha_solicitud,
        s.notas_adicionales,
        s.estado AS solicitud_estado,
        s.comentario_admin AS solicitud_comentario_admin,
        u.nombre AS usuario_nombre,
        u.dependencia AS usuario_dependencia,
        p.nombre AS proveedor_nombre,
        si.id AS item_id,
        si.necesidad,
        si.descripcion,
        si.especificaciones,
        si.cantidad,
        si.observaciones,
        si.estado_recepcion,
        si.comentario_recepcion_usuario,
        si.numero_factura,
        si.comentario_administrador AS item_comentario_administrador
      FROM solicitudes s
      LEFT JOIN usuarios u ON s.id_usuario = u.id
      LEFT JOIN proveedores p ON s.id_proveedor = p.id
      LEFT JOIN solicitud_items si ON s.solicitud_id = si.id_solicitud
      WHERE 1=1
    `;
    const params = [];

    if (usuarioIdFilter) {
      query += ' AND u.id = $' + (params.length + 1);
      params.push(parseInt(usuarioIdFilter));
    }
    if (dependenciaFilter) {
      query += ' AND u.dependencia LIKE $' + (params.length + 1);
      params.push(`%${dependenciaFilter}%`);
    }
    if (faltanteFilter) {
      if (faltanteFilter === 'true') {
        query += ` AND si.estado_recepcion IN ('pendiente', 'no_recibido')`;
      } else if (faltanteFilter === 'false') {
        query += ` AND si.estado_recepcion NOT IN ('pendiente', 'no_recibido')`;
      }
    }

    query += ' ORDER BY s.solicitud_id, si.id';

    const dataRes = await pool.query(query, params);
    const data = dataRes.rows;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Solicitudes y Items');

    // Add company header and get the number of rows used
    const headerRows = await addCompanyHeader(worksheet);
    const tableStartRow = headerRows + 1;

    const columns = [
      { header: 'ID Solicitud', key: 'solicitud_id', width: 15 },
      { header: 'Fecha Solicitud', key: 'fecha_solicitud', width: 20 },
      { header: 'Estado Solicitud', key: 'solicitud_estado', width: 20 },
      { header: 'Comentario Admin Solicitud', key: 'solicitud_comentario_admin', width: 30 },
      { header: 'Nombre Solicitante', key: 'usuario_nombre', width: 30 },
      { header: 'Dependencia Solicitante', key: 'usuario_dependencia', width: 25 },
      { header: 'Nombre Proveedor', key: 'proveedor_nombre', width: 30 },
      { header: 'Notas Adicionales Solicitud', key: 'notas_adicionales', width: 40 },
      { header: 'ID Item', key: 'item_id', width: 10 },
      { header: 'Necesidad Item', key: 'necesidad', width: 15 },
      { header: 'Descripción Item', key: 'descripcion', width: 40 },
      { header: 'Especificaciones Item', key: 'especificaciones', width: 30 },
      { header: 'Cantidad Item', key: 'cantidad', width: 15 },
      { header: 'Observaciones Item', key: 'observaciones', width: 30 },
      { header: 'Estado Recepción Item', key: 'estado_recepcion', width: 20 },
      { header: 'Comentario Usuario Recepción', key: 'comentario_recepcion_usuario', width: 30 },
      { header: 'Número Factura Item', key: 'numero_factura', width: 20 },
      { header: 'Comentario Admin Item', key: 'item_comentario_administrador', width: 30 },
    ];

    // Set column widths
    worksheet.columns = columns.map(c => ({ width: c.width }));

    // Add data as a table
    worksheet.addTable({
      name: 'SolicitudesData',
      ref: `A${tableStartRow}`,
      headerRow: true,
      style: {
        theme: 'TableStyleLight9',
        showRowStripes: true,
      },
      columns: columns.map(c => ({ name: c.header, filterButton: true })),
      rows: data.map(row => columns.map(c => row[c.key])),
    });

    const buffer = await workbook.xlsx.writeBuffer();

    const headers = new Headers();
    headers.append('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    headers.append('Content-Disposition', 'attachment; filename="solicitudes_detallado.xlsx"');

    return new NextResponse(buffer, {
      status: 200,
      headers: headers,
    });

  } catch (error) {
    console.error('Error generating Excel file:', error);
    return NextResponse.json({ message: 'Error interno del servidor al generar el archivo Excel.', details: error.message }, { status: 500 });
  }
}