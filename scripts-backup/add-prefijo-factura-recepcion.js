import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'pollos.db');
const db = new Database(dbPath, { verbose: console.log });

console.log('Agregando columna prefijo_factura_recepcion a la tabla recepciones_item...');

try {
  db.exec(`
    ALTER TABLE recepciones_item 
    ADD COLUMN prefijo_factura_recepcion TEXT;
  `);
  console.log('✅ Columna prefijo_factura_recepcion agregada exitosamente.');
  
  // Migrar datos existentes: separar el prefijo del número de factura
  console.log('\nMigrando datos existentes...');
  const rows = db.prepare("SELECT id, numero_factura_recepcion FROM recepciones_item WHERE numero_factura_recepcion IS NOT NULL AND numero_factura_recepcion != ''").all();
  
  const updateStmt = db.prepare('UPDATE recepciones_item SET prefijo_factura_recepcion = ?, numero_factura_recepcion = ? WHERE id = ?');
  
  let migrated = 0;
  for (const row of rows) {
    const parts = row.numero_factura_recepcion.split('-');
    if (parts.length >= 2) {
      const prefijo = parts[0];
      const numero = parts.slice(1).join('-'); // Por si el número tiene guiones
      updateStmt.run(prefijo, numero, row.id);
      migrated++;
      console.log(`  Migrado ID ${row.id}: "${row.numero_factura_recepcion}" → Prefijo: "${prefijo}", Número: "${numero}"`);
    }
  }
  
  console.log(`\n✅ ${migrated} registros migrados exitosamente.`);
  
} catch (error) {
  if (error.message.includes('duplicate column')) {
    console.log('⚠️ La columna prefijo_factura_recepcion ya existe.');
  } else {
    console.error('❌ Error al agregar la columna:', error.message);
  }
}

db.close();
console.log('\n✅ Proceso completado.');
