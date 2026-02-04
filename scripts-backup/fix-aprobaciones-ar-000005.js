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
console.log('Base de datos cifrada: Acceso concedido.\n');

console.log('=== REASIGNANDO APROBACIONES PARA AR-000005 ===\n');

// 1. Obtener la solicitud
const solicitud = db.prepare('SELECT * FROM solicitudes WHERE solicitud_id = ?').get('AR-000005');
const usuario = db.prepare('SELECT dependencia_id FROM usuarios WHERE id = ?').get(solicitud.id_usuario);

console.log(`Solicitud: AR-000005`);
console.log(`Dependencia del usuario: ${usuario.dependencia_id}`);

// 2. Buscar usuarios que autorizan/aprueban de esa dependencia
// Orden: Aprobadores (autorizan) primero, Administradores (aprueban) después
const aprobadores = db.prepare(`
  SELECT DISTINCT u.id, u.nombre, u.rol
  FROM usuarios u
  JOIN aprobador_dependencias ad ON u.id = ad.usuario_id
  WHERE ad.dependencia_id = ?
    AND u.rol IN ('aprobador', 'APROBADOR', 'administrador', 'ADMINISTRADOR')
  ORDER BY 
    CASE 
      WHEN UPPER(u.rol) = 'APROBADOR' THEN 1
      WHEN UPPER(u.rol) = 'ADMINISTRADOR' THEN 2
      ELSE 3
    END,
    u.id
`).all(usuario.dependencia_id);

console.log(`\n📋 Aprobadores encontrados para dependencia ${usuario.dependencia_id}:`);
if (aprobadores.length === 0) {
  console.log('   ❌ NO HAY APROBADORES ASIGNADOS A ESTA DEPENDENCIA');
  console.log('\n⚠️  La solicitud no podrá ser aprobada sin aprobadores asignados.');
  db.close();
  process.exit(0);
}

aprobadores.forEach((a, index) => {
  console.log(`   ${index + 1}. ${a.nombre} (ID: ${a.id})`);
});

// 3. Eliminar aprobaciones existentes
db.prepare('DELETE FROM solicitud_aprobaciones WHERE solicitud_id = ?').run('AR-000005');
console.log('\n✅ Aprobaciones anteriores eliminadas');

// 4. Crear aprobaciones para cada aprobador
console.log('\n🔄 Creando aprobaciones...');
const insertStmt = db.prepare(`
  INSERT INTO solicitud_aprobaciones (solicitud_id, aprobador_id, orden, estado)
  VALUES (?, ?, ?, 'pendiente')
`);

aprobadores.forEach((aprobador, index) => {
  const orden = index + 1;
  insertStmt.run('AR-000005', aprobador.id, orden);
  console.log(`   ✅ Orden ${orden}: ${aprobador.nombre}`);
});

// 5. Verificar resultado final
const aprobacionesFinales = db.prepare(`
  SELECT sa.*, u.nombre as aprobador_nombre 
  FROM solicitud_aprobaciones sa
  JOIN usuarios u ON sa.aprobador_id = u.id
  WHERE sa.solicitud_id = ?
  ORDER BY sa.orden
`).all('AR-000005');

console.log('\n✅ APROBACIONES FINALES:');
aprobacionesFinales.forEach(a => {
  console.log(`   - Orden ${a.orden}: ${a.aprobador_nombre} - Estado: ${a.estado}`);
});

console.log('\n✅ Proceso completado exitosamente\n');
db.close();
