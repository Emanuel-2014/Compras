import Database from 'better-sqlite3-multiple-ciphers';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'database.db');
const db = new Database(dbPath);

// Establecer la clave de cifrado ANTES de cualquier operación
const password = 'P0ll0s@lD14-S3cur3!';
db.pragma(`key="${password}"`);
db.pragma(`cipher='aes256cbc'`);
db.pragma(`legacy=4`);

// Verificar que la base de datos esté accesible
try {
  db.prepare('SELECT 1').get();
  console.log('Base de datos cifrada: Acceso concedido.\n');
} catch (e) {
  console.error('❌ Error al acceder a la base de datos:', e.message);
  process.exit(1);
}

console.log('\n=== VERIFICANDO SOLICITUD AR-000005 ===\n');

// 1. Verificar si existe la solicitud
const solicitud = db.prepare('SELECT * FROM solicitudes WHERE solicitud_id = ?').get('AR-000005');
if (!solicitud) {
  console.log('❌ La solicitud AR-000005 NO EXISTE en la base de datos');
  process.exit(0);
}

console.log('✅ Solicitud encontrada:');
console.log(`   ID: ${solicitud.solicitud_id}`);
console.log(`   Usuario ID: ${solicitud.id_usuario}`);
console.log(`   Estado: ${solicitud.estado}`);
console.log(`   Fecha: ${solicitud.fecha_solicitud}`);

// 2. Verificar el usuario de la solicitud
const usuario = db.prepare('SELECT id, nombre, dependencia_id FROM usuarios WHERE id = ?').get(solicitud.id_usuario);
console.log('\n✅ Usuario solicitante:');
console.log(`   Nombre: ${usuario.nombre}`);
console.log(`   Dependencia ID: ${usuario.dependencia_id}`);

// 3. Verificar las aprobaciones de esta solicitud
const aprobaciones = db.prepare(`
  SELECT sa.*, u.nombre as aprobador_nombre 
  FROM solicitud_aprobaciones sa
  JOIN usuarios u ON sa.aprobador_id = u.id
  WHERE sa.solicitud_id = ?
  ORDER BY sa.orden
`).all('AR-000005');

console.log('\n📋 Aprobaciones en solicitud_aprobaciones:');
if (aprobaciones.length === 0) {
  console.log('   ❌ NO HAY REGISTROS DE APROBACIONES para AR-000005');
} else {
  aprobaciones.forEach(a => {
    console.log(`   - Orden ${a.orden}: ${a.aprobador_nombre} (ID: ${a.aprobador_id}) - Estado: ${a.estado}`);
  });
}

// 4. Verificar el aprobador GUSTAVO LOPEZ
const aprobador = db.prepare(`
  SELECT id, nombre, rol 
  FROM usuarios 
  WHERE nombre LIKE '%GUSTAVO%LOPEZ%'
`).get();

if (aprobador) {
  console.log('\n✅ Aprobador GUSTAVO LOPEZ:');
  console.log(`   ID: ${aprobador.id}`);
  console.log(`   Rol: ${aprobador.rol}`);
  
  // Verificar si tiene aprobaciones asignadas para esta solicitud
  const suAprobacion = aprobaciones.find(a => a.aprobador_id === aprobador.id);
  if (suAprobacion) {
    console.log(`   ✅ TIENE una aprobación asignada para AR-000005`);
    console.log(`      - Orden: ${suAprobacion.orden}`);
    console.log(`      - Estado: ${suAprobacion.estado}`);
  } else {
    console.log(`   ❌ NO TIENE aprobaciones asignadas para AR-000005`);
  }
}

// 5. Verificar si hay aprobaciones pendientes anteriores
if (aprobaciones.length > 0) {
  const aprobacionesPendientesAnteriores = aprobaciones.filter(a => a.estado === 'pendiente' && a.aprobador_id !== aprobador?.id);
  if (aprobacionesPendientesAnteriores.length > 0) {
    console.log('\n⚠️  HAY APROBACIONES PENDIENTES ANTERIORES:');
    aprobacionesPendientesAnteriores.forEach(a => {
      console.log(`   - ${a.aprobador_nombre} debe aprobar primero (orden ${a.orden})`);
    });
  }
}

console.log('\n');
db.close();
