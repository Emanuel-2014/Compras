
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

export async function POST(request) {
  const session = await getSession();
  if (!session) {
    return new NextResponse(JSON.stringify({ message: 'No autorizado. Debes iniciar sesión.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Permitir a administradores y solicitantes registrar facturas
  const rolLower = session.rol?.toLowerCase();
  if (rolLower !== 'administrador' && rolLower !== 'solicitante') {
    return new NextResponse(JSON.stringify({ message: 'Acción no permitida para tu rol.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { proveedor_id, prefijo, numero_factura, fecha_emision, items, archivo_path, id_solicitud, iva_percentage: frontendIvaPercentage, subtotal: frontendSubtotal, total_iva_calculated: frontendTotalIvaCalculated, total: frontendTotal } = await request.json();
    const { id: usuario_id } = session;

    console.log('[Registro Factura] Fecha recibida:', fecha_emision, '(tipo:', typeof fecha_emision, ')');
    console.log('[Registro Factura] Valores recibidos del frontend:');
    console.log('  - subtotal:', frontendSubtotal);
    console.log('  - total_iva_calculated:', frontendTotalIvaCalculated);
    console.log('  - total:', frontendTotal);
    console.log('  - iva_percentage:', frontendIvaPercentage);

    // 1. Obtener el porcentaje de IVA de la configuración
    const ivaSettingStmt = db.prepare("SELECT value FROM app_settings WHERE key = 'iva_percentage'");
    const ivaSetting = ivaSettingStmt.get();
    const currentIvaPercentage = ivaSetting ? parseFloat(ivaSetting.value) : 0.19;

    const finalSubtotal = frontendSubtotal !== undefined ? parseFloat(frontendSubtotal) : 0;
    const finalTotalIvaCalculated = frontendTotalIvaCalculated !== undefined ? parseFloat(frontendTotalIvaCalculated) : 0;
    const finalTotal = frontendTotal !== undefined ? parseFloat(frontendTotal) : 0;
    const finalIvaPercentage = frontendIvaPercentage !== undefined ? parseFloat(frontendIvaPercentage) : currentIvaPercentage;

    console.log('[Registro Factura] Valores finales a guardar:');
    console.log('  - finalSubtotal:', finalSubtotal);
    console.log('  - finalTotalIvaCalculated:', finalTotalIvaCalculated);
    console.log('  - finalTotal:', finalTotal);
    console.log('  - finalIvaPercentage:', finalIvaPercentage);

    // Validación de datos de entrada
    if (!proveedor_id || !numero_factura || !fecha_emision || !items || !Array.isArray(items) || items.length === 0) {
      return new NextResponse(JSON.stringify({ message: 'Faltan datos requeridos (proveedor, número de factura, fecha de emisión o artículos).' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    for (const item of items) {
      if (item.cantidad == null || item.precio_unitario == null || !item.descripcion) {
        return new NextResponse(JSON.stringify({ message: 'Cada artículo debe tener descripción, cantidad y precio.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Comprobar si ya existe una factura con el mismo número, prefijo y proveedor
    const checkStmt = db.prepare(`
      SELECT id FROM facturas_compras
      WHERE proveedor_id = ?
      AND numero_factura = ?
      AND IFNULL(prefijo, '') = ?
    `);
    const existingFactura = checkStmt.get(proveedor_id, numero_factura, prefijo || '');

    if (existingFactura) {
      return new NextResponse(JSON.stringify({ message: 'Ya existe una factura registrada con este número y prefijo para el proveedor seleccionado.' }), {
        status: 409, // 409 Conflict
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const createFacturaCompra = db.transaction((factura) => {
      // 1. Insertar la factura principal y obtener su ID
      const facturaStmt = db.prepare(
        `INSERT INTO facturas_compras (proveedor_id, prefijo, numero_factura, fecha_emision, archivo_path, usuario_id, id_solicitud, iva_percentage, subtotal, total_iva_calculated, total, fecha_creacion)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))`
      );
      const result = facturaStmt.run(factura.proveedor_id, factura.prefijo ? factura.prefijo.toUpperCase() : factura.prefijo, factura.numero_factura ? factura.numero_factura.toUpperCase() : factura.numero_factura, factura.fecha_emision, factura.archivo_path || null, factura.usuario_id, factura.id_solicitud || null, finalIvaPercentage, finalSubtotal, finalTotalIvaCalculated, finalTotal);
      const newFacturaId = result.lastInsertRowid;

      if (!newFacturaId) {
        throw new Error('No se pudo crear el registro de la factura.');
      }

      // 2. Insertar los ítems asociados a la factura
      const itemStmt = db.prepare(
        `INSERT INTO factura_compra_items (factura_compra_id, descripcion, cantidad, precio_unitario, incluye_iva)
         VALUES (?, ?, ?, ?, ?)`
      );

      for (const item of factura.items) {
        itemStmt.run(newFacturaId, item.descripcion ? item.descripcion.toUpperCase() : item.descripcion, item.cantidad, item.precio_unitario, item.incluye_iva ? 1 : 0);
      }

      return { id: newFacturaId, numero_factura: factura.numero_factura };
    });

    // Ejecutar la transacción
    const nuevaFactura = createFacturaCompra({
      proveedor_id,
      prefijo,
      numero_factura,
      fecha_emision,
      archivo_path,
      usuario_id,
      id_solicitud,
      items,
      finalIvaPercentage,
      finalSubtotal,
      finalTotalIvaCalculated,
      finalTotal
    });

    return new NextResponse(JSON.stringify({ message: 'Factura registrada exitosamente', factura: nuevaFactura }), {
      status: 201, // 201 Created
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {

    if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
        return new NextResponse(JSON.stringify({ message: 'Error: El proveedor seleccionado no es válido.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    console.error('Error al registrar la factura de compra:', error);
    return new NextResponse(JSON.stringify({ message: 'Error interno del servidor al registrar la factura.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
