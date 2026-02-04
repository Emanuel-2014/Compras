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

console.log('=== VERIFICANDO SOLICITUD AR-000006 ===\n');

// 1. Ver datos de la solicitud
const solicitud = db.prepare(`
  SELECT s.*, u.nombre as solicitante_nombre, u.dependencia_id
  FROM solicitudes s
  JOIN usuarios u ON s.id_usuario = u.id
  WHERE s.solicitud_id = 'AR-000006'
`).get();

if (!solicitud) {
  console.log('❌ La solicitud AR-000006 NO EXISTE');
  db.close();
  process.exit(1);
}

console.log('📋 Datos de la solicitud:');
console.log(`   ID: ${solicitud.solicitud_id}`);
console.log(`   Solicitante: ${solicitud.solicitante_nombre}`);
console.log(`   Dependencia: ${solicitud.dependencia_id}`);
console.log(`   Estado: ${solicitud.estado}`);
console.log(`   Fecha: ${solicitud.fecha_solicitud}`);

// 2. Ver aprobaciones asignadas
const aprobaciones = db.prepare(`
  SELECT sa.*, u.nombre as aprobador_nombre, u.rol
  FROM solicitud_aprobaciones sa
  JOIN usuarios u ON sa.aprobador_id = u.id
  WHERE sa.solicitud_id = 'AR-000006'
  ORDER BY sa.orden
`).all();

console.log(`\n📝 Aprobaciones asignadas: ${aprobaciones.length}`);
if (aprobaciones.length === 0) {
  console.log('   ❌ NO HAY APROBACIONES ASIGNADAS');
} else {
  aprobaciones.forEach(a => {
    console.log(`   - Orden ${a.orden}: ${a.aprobador_nombre} (${a.rol}) - Estado: ${a.estado}`);
  });
}

// 3. Ver aprobadores de la dependencia
console.log(`\n👥 Aprobadores configurados para dependencia ${solicitud.dependencia_id}:`);
const aprobadoresDep = db.prepare(`
  SELECT u.id, u.nombre, u.rol
  FROM usuarios u
  JOIN aprobador_dependencias ad ON u.id = ad.usuario_id
  WHERE ad.dependencia_id = ?
  ORDER BY 
    CASE 
      WHEN UPPER(u.rol) = 'APROBADOR' THEN 1
      WHEN UPPER(u.rol) = 'ADMINISTRADOR' THEN 2
      ELSE 3
    END,
    u.id
`).all(solicitud.dependencia_id);

aprobadoresDep.forEach((a, index) => {
  console.log(`   ${index + 1}. ${a.nombre} (${a.rol})`);
});

// 4. Ver si Gustavo López tiene asignación
const gustavo = db.prepare(`
  SELECT * FROM solicitud_aprobaciones
  WHERE solicitud_id = 'AR-000006'
    AND aprobador_id = (SELECT id FROM usuarios WHERE nombre LIKE '%GUSTAVO%LOPEZ%')
`).get();

console.log('\n🔍 Asignación de GUSTAVO LOPEZ:');
if (gustavo) {
  console.log(`   ✅ TIENE asignación - Orden ${gustavo.orden}, Estado: ${gustavo.estado}`);
} else {
  console.log('   ❌ NO TIENE asignación');
}

db.close();
