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

db.prepare('SELECT 1').get();

console.log('ESTRUCTURA DE aprobador_dependencias:');
const columns = db.prepare(`PRAGMA table_info(aprobador_dependencias)`).all();
columns.forEach(c => console.log(`  - ${c.name} (${c.type})`));

console.log('\n\nDATOS EN aprobador_dependencias:');
const data = db.prepare(`SELECT * FROM aprobador_dependencias`).all();
console.log(data);

db.close();
