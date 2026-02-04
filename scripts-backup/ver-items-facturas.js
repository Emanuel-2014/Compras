import Database from 'better-sqlite3-multiple-ciphers';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const dbPath = path.join(process.cwd(), 'database.db');
const DB_PASSWORD = process.env.DB_PASSWORD;

const db = new Database(dbPath);
db.pragma(`key = '${DB_PASSWORD}'`);

console.log('\n🔍 DETALLES DE FACTURAS CON ITEMS\n');
console.log('='.repeat(80));

const facturas = db.prepare(`
  SELECT id, numero_factura, prefijo, total
  FROM facturas_compras
  ORDER BY id
`).all();

for (const factura of facturas) {
  console.log(`\n📄 Factura: ${factura.prefijo}-${factura.numero_factura} (ID: ${factura.id})`);
  console.log(`   Total en BD: $${factura.total || 0}`);
  
  const items = db.prepare(`
    SELECT descripcion, cantidad, precio_unitario
    FROM factura_compra_items
    WHERE factura_compra_id = ?
  `).all(factura.id);
  
  if (items.length > 0) {
    console.log(`   Items:`);
    let calculado = 0;
    items.forEach(item => {
      const subtotal = item.cantidad * item.precio_unitario;
      calculado += subtotal;
      console.log(`     - ${item.descripcion}: ${item.cantidad} x $${item.precio_unitario} = $${subtotal}`);
    });
    console.log(`   Total calculado: $${calculado}`);
    
    if (factura.total !== calculado) {
      console.log(`   ⚠️  INCONSISTENCIA: Total en BD ($${factura.total}) ≠ Total calculado ($${calculado})`);
    }
  } else {
    console.log(`   ⚠️  Sin items registrados`);
  }
}

console.log('\n' + '='.repeat(80));
console.log('\n💡 Solución: Ejecutar script fix-factura-totales.js para recalcular\n');

db.close();
