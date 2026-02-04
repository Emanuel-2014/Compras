import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST() {
  const session = await getSession();
  if (!session || session.rol?.toLowerCase() !== 'administrador') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    console.log('\n=== RECALCULANDO TOTALES DE FACTURAS ===\n');

    // Obtener el porcentaje de IVA de la configuración
    const ivaSettingStmt = db.prepare("SELECT value FROM app_settings WHERE key = 'iva_percentage'");
    const ivaSetting = ivaSettingStmt.get();
    const ivaRate = ivaSetting ? parseFloat(ivaSetting.value) / 100 : 0.19;

    console.log(`IVA configurado: ${(ivaRate * 100).toFixed(2)}%\n`);

    // Obtener todas las facturas con total = 0 o NULL
    const facturasConProblema = db.prepare(`
      SELECT
        fc.id,
        fc.numero_factura,
        fc.prefijo,
        fc.total,
        p.nombre as proveedor_nombre
      FROM facturas_compras fc
      JOIN proveedores p ON fc.proveedor_id = p.id
      WHERE fc.total = 0 OR fc.total IS NULL
    `).all();

    if (facturasConProblema.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No se encontraron facturas con total = 0',
        facturasActualizadas: 0
      });
    }

    console.log(`Facturas encontradas con total = 0: ${facturasConProblema.length}\n`);

    const updateStmt = db.prepare(`
      UPDATE facturas_compras
      SET subtotal = ?, total_iva_calculated = ?, total = ?
      WHERE id = ?
    `);

    let facturasActualizadas = 0;
    const detalles = [];

    facturasConProblema.forEach(factura => {
      console.log(`\nProcesando Factura ID ${factura.id}: ${factura.prefijo}-${factura.numero_factura}`);

      // Obtener los items de la factura
      const items = db.prepare(`
        SELECT id, descripcion, cantidad, precio_unitario, incluye_iva
        FROM factura_compra_items
        WHERE factura_compra_id = ?
      `).all(factura.id);

      if (items.length === 0) {
        console.log('  ⚠ No se encontraron items para esta factura. Se omite.');
        detalles.push({
          factura: `${factura.prefijo}-${factura.numero_factura}`,
          error: 'Sin items'
        });
        return;
      }

      let subtotal = 0;
      let totalIva = 0;

      items.forEach(item => {
        const cantidad = parseFloat(item.cantidad);
        const precioUnitario = parseFloat(item.precio_unitario);
        const totalItem = cantidad * precioUnitario;

        if (item.incluye_iva) {
          const subtotalItem = totalItem / (1 + ivaRate);
          const ivaItem = totalItem - subtotalItem;
          subtotal += subtotalItem;
          totalIva += ivaItem;
        } else {
          subtotal += totalItem;
          totalIva += totalItem * ivaRate;
        }
      });

      const totalFinal = subtotal + totalIva;

      console.log(`  Total calculado: $${totalFinal.toFixed(2)}`);

      // Actualizar la factura
      try {
        updateStmt.run(subtotal, totalIva, totalFinal, factura.id);
        console.log(`  ✓ Factura actualizada correctamente`);
        facturasActualizadas++;
        detalles.push({
          factura: `${factura.prefijo}-${factura.numero_factura}`,
          proveedor: factura.proveedor_nombre,
          totalAnterior: factura.total,
          totalNuevo: totalFinal,
          subtotal,
          iva: totalIva
        });
      } catch (error) {
        console.log(`  ✗ Error al actualizar: ${error.message}`);
        detalles.push({
          factura: `${factura.prefijo}-${factura.numero_factura}`,
          error: error.message
        });
      }
    });

    console.log(`\n=== RESUMEN ===`);
    console.log(`Facturas procesadas: ${facturasConProblema.length}`);
    console.log(`Facturas actualizadas: ${facturasActualizadas}`);

    return NextResponse.json({
      success: true,
      message: `Se recalcularon ${facturasActualizadas} facturas correctamente`,
      facturasActualizadas,
      totalProcesadas: facturasConProblema.length,
      detalles
    });

  } catch (error) {
    console.error('Error al recalcular totales:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
