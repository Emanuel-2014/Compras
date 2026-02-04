// app/api/admin/proveedores/export/route.js
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifySessionToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import ExcelJS from 'exceljs';
import { addCompanyHeader } from '@/lib/excelUtilsServer';

async function checkAdminAuth() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');

  if (!sessionCookie) {
    return { authorized: false, message: 'No hay sesión activa.' };
  }

  const user = verifySessionToken(sessionCookie.value);

  if (!user || user.rol?.toLowerCase() !== 'administrador') {
    return { authorized: false, message: 'Acceso denegado. Se requiere rol de administrador.' };
  }

  return { authorized: true, user };
}

export async function GET() {
  try {
    const auth = await checkAdminAuth();
    if (!auth.authorized) {
      return NextResponse.json({ message: auth.message }, { status: 403 });
    }

    const stmt = db.prepare('SELECT id, nombre, nit, nit_dv, nombre_asesor, contacto FROM proveedores ORDER BY nombre ASC');
    const proveedores = stmt.all();

    // Formatear NITs con DV
    const proveedoresFormateados = proveedores.map(prov => {
      let nitFormateado = 'N/A';
      if (prov.nit) {
        // Formatear con puntos
        const nitConPuntos = prov.nit.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        // Agregar DV si existe
        nitFormateado = prov.nit_dv ? `${nitConPuntos}-${prov.nit_dv}` : nitConPuntos;
      }

      return {
        id: prov.id,
        nombre: prov.nombre,
        nit: nitFormateado,
        nombre_asesor: prov.nombre_asesor || 'N/A',
        contacto: prov.contacto || 'N/A'
      };
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Proveedores');

    const headerRows = await addCompanyHeader(worksheet);
    const tableStartRow = headerRows + 1;

    const columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'PROVEEDOR', key: 'nombre', width: 30 },
      { header: 'NIT-DV', key: 'nit', width: 20 },
      { header: 'NOMBRE DE ASESOR', key: 'nombre_asesor', width: 30 },
      { header: 'NÚMERO DE CONTACTO', key: 'contacto', width: 20 },
    ];

    worksheet.columns = columns.map(c => ({ width: c.width }));

    worksheet.addTable({
        name: 'Proveedores',
        ref: `A${tableStartRow}`,
        headerRow: true,
        style: {
          theme: 'TableStyleLight9',
          showRowStripes: true,
        },
        columns: columns.map(c => ({ name: c.header, filterButton: true })),
        rows: proveedoresFormateados.map(row => columns.map(c => row[c.key])),
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename=proveedores.xlsx',
      },
    });

  } catch (error) {
    console.error('Error en /api/admin/proveedores/export (GET):', error);
    return NextResponse.json(
      { message: 'Error interno del servidor al exportar los proveedores.' },
      { status: 500 }
    );
  }
}
