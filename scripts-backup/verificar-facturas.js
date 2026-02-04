import Database from 'better-sqlite3-multiple-ciphers';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'database.db');
const DB_PASSWORD = process.env.DB_PASSWORD || 'MiEmpresa-S3gur@-2026!';

const db = new Database(dbPath);
db.pragma(`key = '${DB_PASSWORD}'`);

console.log('\n=== VERIFICACIÓN DE FACTURAS EN LA BASE DE DATOS ===\n');

// 1. Contar facturas totales
const totalFacturas = db.prepare('SELECT COUNT(*) as total FROM facturas_compras').get();
console.log(`Total de facturas registradas: ${totalFacturas.total}\n`);

// 2. Mostrar todas las facturas
if (totalFacturas.total > 0) {
  console.log('Lista de facturas:');
  const facturas = db.prepare(`
    SELECT 
      fc.id,
      fc.numero_factura,
      fc.prefijo,
      fc.fecha_emision,
      fc.fecha_creacion,
      p.nombre AS proveedor_nombre,
      u.nombre AS usuario_nombre,
      fc.proveedor_id,
      fc.usuario_id
    FROM facturas_compras fc
    LEFT JOIN proveedores p ON fc.proveedor_id = p.id
    LEFT JOIN usuarios u ON fc.usuario_id = u.id
    ORDER BY fc.fecha_emision DESC
  `).all();
  
  facturas.forEach((f, idx) => {
    console.log(`\n${idx + 1}. Factura ${f.prefijo}-${f.numero_factura}`);
    console.log(`   Proveedor: ${f.proveedor_nombre || 'N/A'} (ID: ${f.proveedor_id})`);
    console.log(`   Registrado por: ${f.usuario_nombre || 'N/A'} (ID: ${f.usuario_id})`);
    console.log(`   Fecha emisión: ${f.fecha_emision}`);
    console.log(`   Fecha registro: ${f.fecha_creacion}`);
    
    // Obtener items de esta factura
    const items = db.prepare(`
      SELECT descripcion, cantidad, precio_unitario
      FROM factura_compra_items
      WHERE factura_compra_id = ?
    `).all(f.id);
    
    if (items.length > 0) {
      console.log(`   Items:`);
      let total = 0;
      items.forEach(item => {
        const subtotal = item.cantidad * item.precio_unitario;
        total += subtotal;
        console.log(`     - ${item.descripcion}: ${item.cantidad} x $${item.precio_unitario} = $${subtotal}`);
      });
      console.log(`   TOTAL: $${total}`);
    } else {
      console.log(`   Sin items registrados`);
    }
  });
}

// 3. Verificar sumas para últimos períodos
console.log('\n\n=== TOTALES POR PERÍODO ===\n');

const now = new Date();
const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
const lastYear = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();

console.log(`Fecha actual: ${now.toISOString()}`);
console.log(`Últimos 7 días desde: ${last7Days}`);
console.log(`Últimos 30 días desde: ${last30Days}`);
console.log(`Último año desde: ${lastYear}\n`);

// Usar la columna 'total' que debería estar en facturas_compras
const total7 = db.prepare(`
  SELECT COALESCE(SUM(total), 0) as total
  FROM facturas_compras
  WHERE fecha_emision >= ?
`).get(last7Days)?.total || 0;

const total30 = db.prepare(`
  SELECT COALESCE(SUM(total), 0) as total
  FROM facturas_compras
  WHERE fecha_emision >= ?
`).get(last30Days)?.total || 0;

const totalYear = db.prepare(`
  SELECT COALESCE(SUM(total), 0) as total
  FROM facturas_compras
  WHERE fecha_emision >= ?
`).get(lastYear)?.total || 0;

console.log(`Total últimos 7 días: $${total7}`);
console.log(`Total últimos 30 días: $${total30}`);
console.log(`Total último año: $${totalYear}`);

// 4. Verificar estructura de la tabla
console.log('\n\n=== ESTRUCTURA DE LA TABLA facturas_compras ===\n');
const schema = db.prepare("PRAGMA table_info(facturas_compras)").all();
schema.forEach(col => {
  console.log(`  ${col.name} (${col.type})${col.pk ? ' [PRIMARY KEY]' : ''}${col.notnull ? ' [NOT NULL]' : ''}`);
});

db.close();
console.log('\n✅ Verificación completada\n');
