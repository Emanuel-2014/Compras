import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(request, { params }) {
  const session = await getSession();
  if (!session) {
    return new NextResponse(JSON.stringify({ message: 'No autorizado' }), { status: 401 });
  }

  const { id: facturaId } = await params; // Await params as suggested by the error message

  try {
    const facturaStmt = db.prepare(`
      SELECT
                fc.id,
                fc.proveedor_id,
                fc.prefijo,
                fc.numero_factura,
                fc.fecha_emision,
                fc.archivo_path,
                fc.usuario_id,
                fc.fecha_creacion,
                p.nombre AS proveedor_nombre,
                u.nombre AS usuario_nombre
              FROM facturas_compras fc
              JOIN proveedores p ON fc.proveedor_id = p.id
              LEFT JOIN usuarios u ON fc.usuario_id = u.id      WHERE fc.id = ?
    `);
    const factura = facturaStmt.get(facturaId);

    if (!factura) {
      return new NextResponse(JSON.stringify({ message: 'Factura no encontrada' }), { status: 404 });
    }

    const rolLower = session.rol?.toLowerCase();
    if (rolLower !== 'administrador' && factura.usuario_id !== session.id) {
        return new NextResponse(JSON.stringify({ message: 'No autorizado para ver esta factura.' }), { status: 403 });
    }

    const itemsStmt = db.prepare(`
      SELECT
        id,
        descripcion,
        cantidad,
        precio_unitario,
        incluye_iva
      FROM factura_compra_items
      WHERE factura_compra_id = ?
    `);
    const items = itemsStmt.all(facturaId);

    return NextResponse.json({ ...factura, items }, { status: 200 });
  } catch (error) {
    console.error(`Error al obtener la factura ${facturaId}:`, error);
    return new NextResponse(JSON.stringify({ message: 'Error interno del servidor' }), { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const session = await getSession();
  if (!session) {
    return new NextResponse(JSON.stringify({ message: 'No autorizado. Debes iniciar sesión.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { id: facturaId } = await params;

  // Autorización: solo el administrador puede editar facturas.
  const rolLower = session.rol?.toLowerCase();
  if (rolLower !== 'administrador') {
    return new NextResponse(JSON.stringify({ message: 'Acción no permitida para tu rol. Solo administradores pueden editar facturas.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const proveedor_id = body.proveedor_id;
    const prefijo = body.prefijo ? body.prefijo.toUpperCase() : body.prefijo;
    const numero_factura = body.numero_factura ? body.numero_factura.toUpperCase() : body.numero_factura;
    const fecha_emision = body.fecha_emision;
    const items = body.items.map(item => ({
        ...item,
        descripcion: item.descripcion ? item.descripcion.toUpperCase() : item.descripcion
    }));

    // Valores calculados por el frontend
    const frontendSubtotal = body.subtotal;
    const frontendTotalIvaCalculated = body.total_iva_calculated;
    const frontendTotal = body.total;
    const frontendIvaPercentage = body.iva_percentage;

    // Validaciones
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

    // Obtener el porcentaje de IVA de la configuración
    const ivaSettingStmt = db.prepare("SELECT value FROM app_settings WHERE key = 'iva_percentage'");
    const ivaSetting = ivaSettingStmt.get();
    const currentIvaPercentage = ivaSetting ? parseFloat(ivaSetting.value) : 0.19;

    // Usar los valores proporcionados por el frontend
    const calculatedSubtotal = frontendSubtotal !== undefined ? parseFloat(frontendSubtotal) : 0;
    const calculatedIvaTotal = frontendTotalIvaCalculated !== undefined ? parseFloat(frontendTotalIvaCalculated) : 0;
    const calculatedTotal = frontendTotal !== undefined ? parseFloat(frontendTotal) : 0;
    const finalIvaPercentage = frontendIvaPercentage !== undefined ? parseFloat(frontendIvaPercentage) : currentIvaPercentage;

    const checkStmt = db.prepare(`
      SELECT id FROM facturas_compras
      WHERE proveedor_id = ?
        AND numero_factura = ?
        AND IFNULL(prefijo, '') = ?
        AND id != ?
    `);

    const existingFactura = checkStmt.get(proveedor_id, numero_factura, prefijo || '', facturaId);

    if (existingFactura) {
      return new NextResponse(JSON.stringify({ message: 'Ya existe otra factura registrada con este número y prefijo para el proveedor seleccionado.' }), {
        status: 409, // 409 Conflict
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const updateFacturaCompra = db.transaction((facturaData) => {
      // 1. Actualizar la factura principal con los valores calculados
      const facturaStmt = db.prepare(`
        UPDATE facturas_compras
        SET
          proveedor_id = ?,
          prefijo = ?,
          numero_factura = ?,
          fecha_emision = ?,
          iva_percentage = ?,
          subtotal = ?,
          total_iva_calculated = ?,
          total = ?
        WHERE id = ?
      `);
      facturaStmt.run(
        facturaData.proveedor_id,
        facturaData.prefijo,
        facturaData.numero_factura,
        facturaData.fecha_emision,
        facturaData.iva_percentage,
        facturaData.subtotal,
        facturaData.total_iva,
        facturaData.total,
        facturaId
      );

      // 2. Eliminar items existentes de la factura
      const deleteItemsStmt = db.prepare('DELETE FROM factura_compra_items WHERE factura_compra_id = ?');
      deleteItemsStmt.run(facturaId);

      // 3. Insertar los nuevos ítems asociados a la factura
      const itemStmt = db.prepare(
        `INSERT INTO factura_compra_items (factura_compra_id, descripcion, cantidad, precio_unitario, incluye_iva)
         VALUES (?, ?, ?, ?, ?)`
      );
      for (const item of facturaData.items) {
        itemStmt.run(facturaId, item.descripcion, item.cantidad, item.precio_unitario, item.incluye_iva ? 1 : 0);
      }

      return { id: facturaId, numero_factura: facturaData.numero_factura };
    });

    // Ejecutar la transacción
    const updatedFactura = updateFacturaCompra({
      proveedor_id,
      prefijo,
      numero_factura,
      fecha_emision,
      items,
      iva_percentage: finalIvaPercentage,
      subtotal: calculatedSubtotal,
      total_iva: calculatedIvaTotal,
      total: calculatedTotal
    });

    return new NextResponse(JSON.stringify({ message: 'Factura actualizada exitosamente.', factura: updatedFactura }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error(`Error al actualizar la factura ${facturaId}:`, error);
    return new NextResponse(JSON.stringify({ message: 'Error interno del servidor' }), { status: 500 });
  }
}