import Database from 'better-sqlite3-multiple-ciphers';
import path from 'path';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

const dbPath = path.join(process.cwd(), 'database.db');
const DB_PASSWORD = process.env.DB_PASSWORD;

console.log(`Usando contraseña: ${DB_PASSWORD ? '***' + DB_PASSWORD.slice(-5) : 'NO ENCONTRADA'}`);

try {
  const db = new Database(dbPath);
  db.pragma(`key = '${DB_PASSWORD}'`);
  
  // Verificar que funciona
  db.prepare('SELECT count(*) FROM sqlite_master').get();
  
  console.log('\n✅ Base de datos abierta correctamente\n');
  console.log('='.repeat(60));
  
  // 1. Facturas
  const facturas = db.prepare(`
    SELECT 
      fc.id,
      fc.numero_factura,
      fc.prefijo,
      fc.fecha_emision,
      fc.total,
      p.nombre as proveedor
    FROM facturas_compras fc
    LEFT JOIN proveedores p ON fc.proveedor_id = p.id
    ORDER BY fc.fecha_emision DESC
  `).all();
  
  console.log(`\n📋 FACTURAS REGISTRADAS: ${facturas.length}\n`);
  
  if (facturas.length > 0) {
    facturas.forEach((f, i) => {
      console.log(`${i + 1}. ${f.prefijo}-${f.numero_factura}`);
      console.log(`   Proveedor: ${f.proveedor || 'Sin proveedor'}`);
      console.log(`   Fecha emisión: ${f.fecha_emision}`);
      console.log(`   Total: $${f.total || 0}`);
      console.log('');
    });
    
    const totalGeneral = facturas.reduce((sum, f) => sum + (f.total || 0), 0);
    console.log(`   💰 TOTAL GENERAL: $${totalGeneral}\n`);
  }
  
  // 2. Cálculos de períodos
  console.log('='.repeat(60));
  console.log('\n📊 CÁLCULOS POR PERÍODO\n');
  
  const now = new Date();
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const lastYear = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  
  console.log(`Fecha actual: ${now.toLocaleString('es-CO')}`);
  console.log(`Últimos 7 días desde: ${last7Days.toLocaleString('es-CO')}`);
  console.log(`Últimos 30 días desde: ${last30Days.toLocaleString('es-CO')}`);
  console.log(`Último año desde: ${lastYear.toLocaleString('es-CO')}\n`);
  
  const total7 = db.prepare(`
    SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count
    FROM facturas_compras
    WHERE fecha_emision >= ?
  `).get(last7Days.toISOString());
  
  const total30 = db.prepare(`
    SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count
    FROM facturas_compras
    WHERE fecha_emision >= ?
  `).get(last30Days.toISOString());
  
  const totalYear = db.prepare(`
    SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count
    FROM facturas_compras
    WHERE fecha_emision >= ?
  `).get(lastYear.toISOString());
  
  console.log(`Últimos 7 días: ${total7.count} facturas = $${total7.total}`);
  console.log(`Últimos 30 días: ${total30.count} facturas = $${total30.total}`);
  console.log(`Último año: ${totalYear.count} facturas = $${totalYear.total}`);
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  db.close();
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
