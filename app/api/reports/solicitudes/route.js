import { NextResponse } from 'next/server';
import db from '@/lib/db';
import ExcelJS from 'exceljs';

// Helper function to get a setting value or return a default
function getSetting(key, defaultValue = '') {
  try {
    const stmt = db.prepare('SELECT value FROM app_settings WHERE key = ?');
    const row = stmt.get(key);
    return row ? row.value : defaultValue;
  } catch (error) {
    console.error('Error fetching setting:', error);
    return defaultValue;
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    // Construir filtros desde query params
    const filters = {
      dependencia: searchParams.get('dependencia') || '',
      solicitanteId: searchParams.get('solicitanteId') || '',
      fechaInicio: searchParams.get('fechaInicio') || '',
      fechaFin: searchParams.get('fechaFin') || '',
      coordinadorId: searchParams.get('coordinadorId') || ''
    };

    // Construir la query SQL basada en los filtros
    let query = `
      SELECT
        s.solicitud_id,
        s.fecha_solicitud,
        u.nombre as solicitante_nombre,
        d.nombre as solicitante_dependencia,
        p.nombre as proveedor_nombre,
        s.tipo,
        s.estado,
        s.comentario_admin
      FROM solicitudes s
      LEFT JOIN usuarios u ON s.usuario_id = u.id
      LEFT JOIN dependencias d ON u.dependencia_id = d.id
      LEFT JOIN proveedores p ON s.proveedor_id = p.id
      WHERE 1=1
    `;

    const params = [];

    if (filters.dependencia) {
      query += ' AND d.nombre = ?';
      params.push(filters.dependencia);
    }
    if (filters.solicitanteId) {
      query += ' AND s.usuario_id = ?';
      params.push(filters.solicitanteId);
    }
    if (filters.fechaInicio) {
      query += ' AND DATE(s.fecha_solicitud) >= ?';
      params.push(filters.fechaInicio);
    }
    if (filters.fechaFin) {
      query += ' AND DATE(s.fecha_solicitud) <= ?';
      params.push(filters.fechaFin);
    }
    if (filters.coordinadorId) {
      query += ' AND s.coordinador_id = ?';
      params.push(filters.coordinadorId);
    }

    query += ' ORDER BY s.fecha_solicitud DESC';

    const stmt = db.prepare(query);
    const solicitudes = stmt.all(...params);

    // Obtener configuración de la empresa
    const companyName = getSetting('company_name', 'Pollos al Día S.A.S.');
    const companyAddress = getSetting('company_address', 'Carrera 22a # 15-61 Pasto (Nariño)');
    const companyPhone = getSetting('company_phone', '3112163767');
    const companyEmail = getSetting('company_email', 'polloaldiacompras@gmail.com');

    // Crear el workbook de ExcelJS
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Solicitudes');

    // Encabezado de la empresa
    worksheet.addRow([companyName]);
    worksheet.addRow([companyAddress]);
    worksheet.addRow([`Tel: ${companyPhone} | Email: ${companyEmail}`]);
    worksheet.addRow(['Reporte de Solicitudes']);
    worksheet.addRow([]); // Línea vacía

    // Aplicar estilos al encabezado
    worksheet.getRow(1).font = { bold: true, size: 14 };
    worksheet.getRow(4).font = { bold: true, size: 12 };

    // Encabezados de columnas
    worksheet.addRow([
      'ID SOLICITUD',
      'FECHA',
      'SOLICITANTE',
      'DEPENDENCIA',
      'PROVEEDOR',
      'TIPO',
      'ESTADO',
      'COMENTARIO ADMIN'
    ]);
    const headerRow = worksheet.lastRow;
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Datos
    solicitudes.forEach(sol => {
      worksheet.addRow([
        sol.solicitud_id,
        new Date(sol.fecha_solicitud).toLocaleDateString('es-CO'),
        sol.solicitante_nombre,
        sol.solicitante_dependencia,
        sol.proveedor_nombre,
        sol.tipo?.toUpperCase(),
        sol.estado.toUpperCase(),
        sol.comentario_admin
      ]);
    });

    // Ajustar ancho de columnas
    worksheet.columns.forEach(column => {
      column.width = 18;
    });

    // Generar el buffer del Excel
    const buffer = await workbook.xlsx.writeBuffer();

    // Retornar el archivo
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Solicitudes_Filtradas.xlsx"'
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
