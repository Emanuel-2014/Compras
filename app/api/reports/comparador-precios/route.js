import { NextResponse } from 'next/server';
import db from '@/lib/db';
import ExcelJS from 'exceljs';
import { addCompanyHeader } from '@/lib/excelUtilsServer';

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
  try {
    const { searchParams } = new URL(request.url);
    const searchTerm = searchParams.get('descripcion');

    if (!searchTerm) {
      return NextResponse.json({ message: 'El término de búsqueda es requerido.' }, { status: 400 });
    }

    // Obtener la tasa de IVA de la configuración
    const ivaPercentageString = getSetting('iva_percentage', '19');
    const ivaRate = parseFloat(ivaPercentageString) / 100;
    if (isNaN(ivaRate)) {
      throw new Error('El valor de IVA configurado no es un número válido.');
    }

    const query = `
      SELECT
        i.id,
        i.descripcion,
        p.nombre AS proveedor_nombre,
        f.fecha_emision,
        i.precio_unitario,
        i.incluye_iva
      FROM factura_compra_items i
      JOIN facturas_compras f ON i.factura_compra_id = f.id
      JOIN proveedores p ON f.proveedor_id = p.id
      WHERE i.descripcion LIKE ?
      ORDER BY i.descripcion, i.precio_unitario ASC
    `;

    const stmt = db.prepare(query);
    const results = stmt.all(`%${searchTerm}%`);

    const processedResults = results.map(item => ({
      ...item,
      // The price with IVA is calculated using the configured rate
      precio_final_con_iva: item.incluye_iva ? item.precio_unitario : item.precio_unitario * (1 + ivaRate)
    }));

    // Sort by the final price
    processedResults.sort((a, b) => a.precio_final_con_iva - b.precio_final_con_iva);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Comparación de Precios');

    // Add company header
    const headerRows = await addCompanyHeader(worksheet);

    // Add report title
    const titleRow = headerRows + 1;
    worksheet.mergeCells(`A${titleRow}:E${titleRow}`);
    const titleCell = worksheet.getCell(`A${titleRow}`);
    titleCell.value = `Informe de Comparación de Precios para "${searchTerm}"`;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center' };

    const tableStartRow = titleRow + 2; // Add some space after title

    const columns = [
        { header: '#', key: 'index', width: 5 },
        { header: 'Descripción', key: 'descripcion', width: 40 },
        { header: 'Proveedor', key: 'proveedor_nombre', width: 30 },
        { header: 'Fecha de Factura', key: 'fecha_emision', width: 20 },
        { header: 'Precio Final (IVA incl.)', key: 'precio_final_con_iva', width: 25 },
    ];

    worksheet.columns = columns.map(c => ({ width: c.width }));

    const dataForTable = processedResults.map((item, index) => ({
        index: index + 1,
        ...item,
        fecha_emision: new Date(item.fecha_emision).toLocaleDateString('es-CO'),
        precio_final_con_iva: new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(item.precio_final_con_iva)
    }));

    worksheet.addTable({
        name: 'ComparadorPrecios',
        ref: `A${tableStartRow}`,
        headerRow: true,
        style: {
          theme: 'TableStyleLight9',
          showRowStripes: true,
        },
        columns: columns.map(c => ({ name: c.header, filterButton: true })),
        rows: dataForTable.map(row => columns.map(c => row[c.key])),
    });

    // Highlight the best price (first row)
    const firstDataRow = worksheet.getRow(tableStartRow + 1);
    firstDataRow.font = { bold: true, color: { argb: 'FF008000' } };
    firstDataRow.eachCell(cell => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEAFDE3' }
      };
    });

    const buffer = await workbook.xlsx.writeBuffer();

    const headers = new Headers();
    headers.append('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    headers.append('Content-Disposition', `attachment; filename="comparacion_precios_${searchTerm}.xlsx"`);

    return new NextResponse(buffer, {
      status: 200,
      headers: headers,
    });

  } catch (error) {
    console.error('Error generating Excel file:', error);
    return NextResponse.json({ message: 'Error interno del servidor al generar el archivo Excel.', details: error.message }, { status: 500 });
  }
}
