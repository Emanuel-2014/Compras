import Database from 'better-sqlite3-multiple-ciphers';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'database.db');
const db = new Database(dbPath);

// Establecer la clave de cifrado
const password = 'P0ll0s@lD14-S3cur3!';
db.pragma(`key="${password}"`);
db.pragma(`cipher='aes256cbc'`);
db.pragma(`legacy=4`);

// Verificar acceso
try {
  db.prepare('SELECT 1').get();
  console.log('Base de datos cifrada: Acceso concedido.\n');
} catch (e) {
  console.error('❌ Error al acceder a la base de datos:', e.message);
  process.exit(1);
}

console.log('=== REASIGNANDO APROBACIONES PARA AR-000005 ===\n');

// 1. Obtener la solicitud
const solicitud = db.prepare('SELECT * FROM solicitudes WHERE solicitud_id = ?').get('AR-000005');
if (!solicitud) {
  console.log('❌ Solicitud no encontrada');
  process.exit(1);
}

// 2. Obtener la dependencia del usuario
const usuario = db.prepare('SELECT dependencia_id FROM usuarios WHERE id = ?').get(solicitud.id_usuario);
console.log(`Dependencia del usuario: ${usuario.dependencia_id}`);

// 3. Eliminar aprobaciones existentes
db.prepare('DELETE FROM solicitud_aprobaciones WHERE solicitud_id = ?').run('AR-000005');
console.log('✅ Aprobaciones anteriores eliminadas');

// 4. Obtener configuración de aprobaciones para la dependencia
const aprobacionesConfig = db.prepare(`
  SELECT orden, aprobador_id 
  FROM aprobador_dependencias 
  WHERE dependencia_id = ?
  ORDER BY orden
`).all(usuario.dependencia_id);

if (aprobacionesConfig.length === 0) {
  console.log('❌ No hay configuración de aprobadores para esta dependencia');
  process.exit(1);
}

console.log(`\n📋 Configuración de aprobadores para dependencia ${usuario.dependencia_id}:`);
aprobacionesConfig.forEach(config => {
  const aprobador = db.prepare('SELECT nombre FROM usuarios WHERE id = ?').get(config.aprobador_id);
  console.log(`   - Orden ${config.orden}: ${aprobador.nombre} (ID: ${config.aprobador_id})`);
});

// 5. Crear las aprobaciones
console.log('\n🔄 Creando aprobaciones...');
const insertStmt = db.prepare(`
  INSERT INTO solicitud_aprobaciones (solicitud_id, aprobador_id, orden, estado)
  VALUES (?, ?, ?, 'pendiente')
`);

for (const config of aprobacionesConfig) {
  insertStmt.run('AR-000005', config.aprobador_id, config.orden);
  const aprobador = db.prepare('SELECT nombre FROM usuarios WHERE id = ?').get(config.aprobador_id);
  console.log(`   ✅ Creada aprobación orden ${config.orden} para ${aprobador.nombre}`);
}

// 6. Verificar resultado
console.log('\n✅ Aprobaciones reasignadas correctamente');

// 7. Mostrar aprobaciones finales
const aprobacionesFinales = db.prepare(`
  SELECT sa.*, u.nombre as aprobador_nombre 
  FROM solicitud_aprobaciones sa
  JOIN usuarios u ON sa.aprobador_id = u.id
  WHERE sa.solicitud_id = ?
  ORDER BY sa.orden
`).all('AR-000005');

console.log('\n📋 Aprobaciones finales:');
aprobacionesFinales.forEach(a => {
  console.log(`   - Orden ${a.orden}: ${a.aprobador_nombre} - Estado: ${a.estado}`);
});

console.log('\n');
db.close();
