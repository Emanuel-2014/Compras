import Database from 'better-sqlite3-multiple-ciphers';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const dbPath = path.join(process.cwd(), 'database.db');
const DB_PASSWORD = process.env.DB_PASSWORD;

const db = new Database(dbPath);
db.pragma(`key = '${DB_PASSWORD}'`);

console.log('\n🔧 RECALCULANDO TOTALES DE TODAS LAS FACTURAS\n');
console.log('='.repeat(80));

const facturas = db.prepare('SELECT id, numero_factura, prefijo FROM facturas_compras').all();

for (const factura of facturas) {
  console.log(`\n📄 Procesando: ${factura.prefijo}-${factura.numero_factura} (ID: ${factura.id})`);
  
  // Obtener todos los items de la factura
  const items = db.prepare(`
    SELECT cantidad, precio_unitario, incluye_iva
    FROM factura_compra_items
    WHERE factura_compra_id = ?
  `).all(factura.id);
  
  if (items.length === 0) {
    console.log('   ⚠️  Sin items, omitiendo...');
    continue;
  }
  
  const IVA_RATE = 0.19;
  let subtotal = 0;
  let totalIva = 0;
  
  items.forEach(item => {
    const itemTotal = item.cantidad * item.precio_unitario;
    
    if (item.incluye_iva) {
      // El precio ya incluye IVA, extraerlo
      const precioSinIva = itemTotal / (1 + IVA_RATE);
      const ivaDelItem = itemTotal - precioSinIva;
      subtotal += precioSinIva;
      totalIva += ivaDelItem;
    } else {
      // El precio no incluye IVA, agregarlo
      subtotal += itemTotal;
      totalIva += itemTotal * IVA_RATE;
    }
  });
  
  const total = subtotal + totalIva;
  
  console.log(`   Subtotal: $${subtotal.toFixed(2)}`);
  console.log(`   IVA (19%): $${totalIva.toFixed(2)}`);
  console.log(`   Total: $${total.toFixed(2)}`);
  
  // Actualizar la factura
  const updateStmt = db.prepare(`
    UPDATE facturas_compras 
    SET subtotal = ?, total_iva_calculated = ?, total = ?, iva_percentage = ?
    WHERE id = ?
  `);
  
  updateStmt.run(subtotal, totalIva, total, IVA_RATE, factura.id);
  console.log('   ✅ Actualizado');
}

console.log('\n' + '='.repeat(80));
console.log('\n✅ Recálculo completado. Verifica los resultados en la aplicación.\n');

db.close();
