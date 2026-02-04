import Database from 'better-sqlite3-multiple-ciphers';

const DB_PASSWORD = 'P0ll0s@lD14-S3cur3!';
const db = new Database('database.db');
db.pragma(`key = '${DB_PASSWORD}'`);

console.log('\n=== FACTURAS REGISTRADAS ===\n');
const facturas = db.prepare('SELECT id, numero_factura, prefijo, fecha_emision, subtotal, total_iva_calculated, total FROM facturas_compras').all();
facturas.forEach(f => {
  console.log(`Factura: ${f.prefijo || ''} ${f.numero_factura}`);
  console.log(`  Fecha: ${f.fecha_emision}`);
  console.log(`  Subtotal: $${f.subtotal?.toLocaleString() || 0}`);
  console.log(`  IVA: $${f.total_iva_calculated?.toLocaleString() || 0}`);
  console.log(`  Total: $${f.total?.toLocaleString() || 0}`);
  console.log('');
});

console.log('\n=== SUMA TOTAL ===');
const suma = db.prepare('SELECT SUM(total) as total FROM facturas_compras').get();
console.log(`Suma de todas las facturas: $${suma.total?.toLocaleString() || 0}`);

console.log('\n=== ITEMS DE FACTURA ===');
const items = db.prepare(`
  SELECT 
    fc.numero_factura,
    fci.descripcion,
    fci.cantidad,
    fci.precio_unitario,
    fci.incluye_iva,
    (fci.cantidad * fci.precio_unitario) as subtotal_item
  FROM factura_compra_items fci
  JOIN facturas_compras fc ON fci.factura_compra_id = fc.id
`).all();

items.forEach(item => {
  console.log(`Factura ${item.numero_factura}: ${item.descripcion}`);
  console.log(`  Cantidad: ${item.cantidad} x $${item.precio_unitario?.toLocaleString()}`);
  console.log(`  Incluye IVA: ${item.incluye_iva ? 'SÍ' : 'NO'}`);
  console.log(`  Subtotal: $${item.subtotal_item?.toLocaleString()}`);
  console.log('');
});

db.close();
