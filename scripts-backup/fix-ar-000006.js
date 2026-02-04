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

console.log('=== CORRIGIENDO SOLICITUD AR-000006 ===\n');

// 1. Obtener ID de Gustavo López
const gustavo = db.prepare(`
  SELECT id FROM usuarios WHERE nombre LIKE '%GUSTAVO%LOPEZ%'
`).get();

if (!gustavo) {
  console.log('❌ No se encontró a Gustavo López');
  db.close();
  process.exit(1);
}

console.log(`✅ Gustavo López ID: ${gustavo.id}`);

// 2. Verificar aprobaciones actuales
const aprobacionesActuales = db.prepare(`
  SELECT * FROM solicitud_aprobaciones
  WHERE solicitud_id = 'AR-000006'
  ORDER BY orden
`).all();

console.log(`\n📋 Aprobaciones actuales:`);
aprobacionesActuales.forEach(a => {
  const usuario = db.prepare('SELECT nombre FROM usuarios WHERE id = ?').get(a.aprobador_id);
  console.log(`   - Orden ${a.orden}: ${usuario.nombre} - Estado: ${a.estado}`);
});

// 3. Eliminar aprobaciones existentes
db.prepare('DELETE FROM solicitud_aprobaciones WHERE solicitud_id = ?').run('AR-000006');
console.log('\n🗑️  Aprobaciones anteriores eliminadas');

// 4. Crear las aprobaciones correctas
console.log('\n✨ Creando aprobaciones correctas...');

// Gustavo López (aprobador) - Orden 1
db.prepare(`
  INSERT INTO solicitud_aprobaciones (solicitud_id, aprobador_id, orden, estado)
  VALUES ('AR-000006', ?, 1, 'pendiente')
`).run(gustavo.id);
console.log('   ✅ Orden 1: Gustavo López (aprobador)');

// Rolando Torres (administrador) - Orden 2
const rolando = db.prepare(`SELECT id FROM usuarios WHERE nombre LIKE '%ROLANDO%TORRES%'`).get();
db.prepare(`
  INSERT INTO solicitud_aprobaciones (solicitud_id, aprobador_id, orden, estado)
  VALUES ('AR-000006', ?, 2, 'pendiente')
`).run(rolando.id);
console.log('   ✅ Orden 2: Rolando Torres (administrador)');

// 5. Verificar resultado
const aprobacionesFinales = db.prepare(`
  SELECT sa.*, u.nombre, u.rol
  FROM solicitud_aprobaciones sa
  JOIN usuarios u ON sa.aprobador_id = u.id
  WHERE sa.solicitud_id = 'AR-000006'
  ORDER BY sa.orden
`).all();

console.log('\n📝 Aprobaciones finales:');
aprobacionesFinales.forEach(a => {
  console.log(`   - Orden ${a.orden}: ${a.nombre} (${a.rol}) - Estado: ${a.estado}`);
});

console.log('\n✅ SOLICITUD AR-000006 CORREGIDA\n');

db.close();
