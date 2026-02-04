import Database from 'better-sqlite3-multiple-ciphers';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'database.db');
const db = new Database(dbPath);

const password = 'P0ll0s@lD14-S3cur3!';
db.pragma(`key="${password}"`);
db.pragma(`cipher='aes256cbc'`);
db.pragma(`legacy=4`);

try {
  db.prepare('SELECT 1').get();
  console.log('✅ Base de datos accesible\n');
} catch (e) {
  console.error('❌ Error:', e.message);
  process.exit(1);
}

// Ver tablas
const tables = db.prepare(`
  SELECT name FROM sqlite_master 
  WHERE type='table' 
  ORDER BY name
`).all();

console.log('TABLAS EN LA BASE DE DATOS:');
tables.forEach(t => console.log(`  - ${t.name}`));

// Ver estructura de usuarios (para authorized_dependencia_ids)
console.log('\n\nESTRUCTURA DE USUARIOS:');
const userColumns = db.prepare(`PRAGMA table_info(usuarios)`).all();
userColumns.forEach(c => console.log(`  - ${c.name} (${c.type})`));

db.close();
