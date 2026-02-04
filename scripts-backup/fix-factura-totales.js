import Database from 'better-sqlite3-multiple-ciphers';

const DB_PASSWORD = 'P0ll0s@lD14-S3cur3!';
const db = new Database('database.db');
db.pragma(`key = '${DB_PASSWORD}'`);

console.log('\n=== ANTES DE LA CORRECCIÓN ===\n');
const before = db.prepare('SELECT id, numero_factura, subtotal, total_iva_calculated, total FROM facturas_compras').all();
before.forEach(f => {
  console.log(`Factura ${f.numero_factura}: Subtotal=$${f.subtotal}, IVA=$${f.total_iva_calculated}, Total=$${f.total}`);
});

// Obtener los items de la factura
const items = db.prepare(`
  SELECT cantidad, precio_unitario, incluye_iva
  FROM factura_compra_items
  WHERE factura_compra_id = 1
`).all();

const IVA_RATE = 0.19;
let subtotal = 0;
let totalIva = 0;

items.forEach(item => {
  const itemTotal = item.cantidad * item.precio_unitario;
  
  if (item.incluye_iva) {
    // Extraer IVA del precio
    const precioSinIva = itemTotal / (1 + IVA_RATE);
    const ivaDelItem = itemTotal - precioSinIva;
    subtotal += precioSinIva;
    totalIva += ivaDelItem;
  } else {
    // Agregar IVA al precio
    subtotal += itemTotal;
    totalIva += itemTotal * IVA_RATE;
  }
});

const total = subtotal + totalIva;

console.log('\n=== VALORES CALCULADOS ===\n');
console.log(`Subtotal: $${subtotal.toFixed(2)}`);
console.log(`IVA (19%): $${totalIva.toFixed(2)}`);
console.log(`Total: $${total.toFixed(2)}`);

// Actualizar la factura
const updateStmt = db.prepare(`
  UPDATE facturas_compras 
  SET subtotal = ?, total_iva_calculated = ?, total = ?, iva_percentage = ?
  WHERE id = 1
`);

updateStmt.run(subtotal, totalIva, total, IVA_RATE);

console.log('\n✅ Factura actualizada exitosamente\n');

console.log('=== DESPUÉS DE LA CORRECCIÓN ===\n');
const after = db.prepare('SELECT id, numero_factura, subtotal, total_iva_calculated, total FROM facturas_compras').all();
after.forEach(f => {
  console.log(`Factura ${f.numero_factura}: Subtotal=$${f.subtotal}, IVA=$${f.total_iva_calculated}, Total=$${f.total}`);
});

db.close();
