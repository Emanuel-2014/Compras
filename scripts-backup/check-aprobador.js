import Database from 'better-sqlite3';
const db = new Database('./pollos.db');

console.log('=== USUARIOS APROBADORES ===');
const aprobadores = db.prepare("SELECT id, nombre, rol, dependencia_id FROM usuarios WHERE rol = 'APROBADOR'").all();
console.log(aprobadores);

console.log('\n=== APROBADOR_DEPENDENCIAS ===');
const aprobadorDeps = db.prepare('SELECT * FROM aprobador_dependencias').all();
console.log(aprobadorDeps);

console.log('\n=== DEPENDENCIAS ===');
const dependencias = db.prepare('SELECT id, nombre FROM dependencias').all();
console.log(dependencias);

db.close();
