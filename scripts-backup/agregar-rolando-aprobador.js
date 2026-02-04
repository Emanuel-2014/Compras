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
console.log('Base de datos accesible.\n');

console.log('=== AGREGANDO ROLANDO TORRES COMO APROBADOR DE DEPENDENCIA 8 ===\n');

// 1. Verificar si ROLANDO TORRES existe
const rolando = db.prepare(`
  SELECT id, nombre, rol 
  FROM usuarios 
  WHERE nombre LIKE '%ROLANDO%TORRES%'
`).get();

if (!rolando) {
  console.log('❌ ROLANDO TORRES no existe en la base de datos');
  db.close();
  process.exit(1);
}

console.log(`✅ Usuario encontrado: ${rolando.nombre} (ID: ${rolando.id})`);
console.log(`   Rol: ${rolando.rol}`);

// 2. Verificar si ya está asignado a la dependencia 8
const yaAsignado = db.prepare(`
  SELECT * FROM aprobador_dependencias 
  WHERE usuario_id = ? AND dependencia_id = 8
`).get(rolando.id);

if (yaAsignado) {
  console.log('   ℹ️  Ya está asignado a la dependencia 8');
} else {
  // 3. Agregar a la dependencia 8
  db.prepare(`
    INSERT INTO aprobador_dependencias (usuario_id, dependencia_id)
    VALUES (?, 8)
  `).run(rolando.id);
  console.log('   ✅ Agregado a la dependencia 8');
}

// 4. Ver todos los usuarios que pueden aprobar/autorizar de dependencia 8
// Orden: Aprobadores (autorizan) primero, Administradores (aprueban) después
console.log('\n📋 Usuarios de aprobación/autorización de dependencia 8:');
const aprobadores = db.prepare(`
  SELECT u.id, u.nombre, u.rol
  FROM usuarios u
  JOIN aprobador_dependencias ad ON u.id = ad.usuario_id
  WHERE ad.dependencia_id = 8
  ORDER BY 
    CASE 
      WHEN u.rol = 'aprobador' THEN 1
      WHEN u.rol = 'administrador' THEN 2
      ELSE 3
    END,
    u.id
`).all();

aprobadores.forEach((a, index) => {
  console.log(`   ${index + 1}. ${a.nombre} (ID: ${a.id})`);
});

// 5. Actualizar las aprobaciones de todas las solicitudes pendientes de dependencia 8
console.log('\n🔄 Actualizando aprobaciones de solicitudes pendientes...');

const solicitudes = db.prepare(`
  SELECT s.solicitud_id
  FROM solicitudes s
  JOIN usuarios u ON s.id_usuario = u.id
  WHERE u.dependencia_id = 8 
    AND s.estado = 'PENDIENTE_APROBACION'
`).all();

for (const sol of solicitudes) {
  console.log(`\n   Actualizando ${sol.solicitud_id}...`);
  
  // Eliminar aprobaciones existentes
  db.prepare('DELETE FROM solicitud_aprobaciones WHERE solicitud_id = ?').run(sol.solicitud_id);
  
  // Crear nuevas aprobaciones con todos los aprobadores
  const insertStmt = db.prepare(`
    INSERT INTO solicitud_aprobaciones (solicitud_id, aprobador_id, orden, estado)
    VALUES (?, ?, ?, 'pendiente')
  `);
  
  aprobadores.forEach((aprobador, index) => {
    const orden = index + 1;
    insertStmt.run(sol.solicitud_id, aprobador.id, orden);
    console.log(`      → Orden ${orden}: ${aprobador.nombre}`);
  });
}

console.log('\n✅ PROCESO COMPLETADO\n');
db.close();
