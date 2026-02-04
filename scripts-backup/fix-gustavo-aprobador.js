import Database from 'better-sqlite3';
const db = new Database('./pollos.db');

console.log('=== Agregando registro a aprobador_dependencias ===');

// GUSTAVO LOPEZ tiene id=13 y dependencia_id=8 (PLANTA)
const stmt = db.prepare('INSERT INTO aprobador_dependencias (usuario_id, dependencia_id) VALUES (?, ?)');
const result = stmt.run(13, 8);

console.log(`Registro creado: usuario_id=13, dependencia_id=8`);
console.log(`Rows affected: ${result.changes}`);

// Verificar
const check = db.prepare('SELECT * FROM aprobador_dependencias WHERE usuario_id = 13').all();
console.log('\n=== Verificación ===');
console.log(check);

db.close();
console.log('\n✅ Completado');
