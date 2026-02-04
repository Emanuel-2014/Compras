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

console.log('=== CORRIGIENDO TODAS LAS APROBACIONES PENDIENTES ===\n');

// 1. Obtener todas las solicitudes en estado PENDIENTE_APROBACION
const solicitudesPendientes = db.prepare(`
  SELECT s.solicitud_id, s.id_usuario, u.nombre as usuario_nombre, u.dependencia_id
  FROM solicitudes s
  JOIN usuarios u ON s.id_usuario = u.id
  WHERE s.estado = 'PENDIENTE_APROBACION'
  ORDER BY s.solicitud_id
`).all();

console.log(`Solicitudes encontradas: ${solicitudesPendientes.length}\n`);

for (const solicitud of solicitudesPendientes) {
  console.log(`\n━━━ ${solicitud.solicitud_id} ━━━`);
  console.log(`Solicitante: ${solicitud.usuario_nombre}`);
  console.log(`Dependencia: ${solicitud.dependencia_id}`);
  
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
  `).all(solicitud.dependencia_id);
  
  if (aprobadores.length === 0) {
    console.log('⚠️  NO HAY APROBADORES para esta dependencia');
    continue;
  }
  
  // 3. Ver aprobaciones actuales
  const aprobacionesActuales = db.prepare(`
    SELECT aprobador_id, orden, estado 
    FROM solicitud_aprobaciones 
    WHERE solicitud_id = ?
    ORDER BY orden
  `).all(solicitud.solicitud_id);
  
  // 4. Verificar si las aprobaciones están correctas
  const idsEsperados = aprobadores.map(a => a.id).sort().join(',');
  const idsActuales = aprobacionesActuales.map(a => a.aprobador_id).sort().join(',');
  
  if (idsEsperados === idsActuales) {
    console.log('✅ Aprobaciones correctas');
    continue;
  }
  
  console.log('❌ Aprobaciones incorrectas. Corrigiendo...');
  
  // 5. Eliminar y recrear
  db.prepare('DELETE FROM solicitud_aprobaciones WHERE solicitud_id = ?').run(solicitud.solicitud_id);
  
  const insertStmt = db.prepare(`
    INSERT INTO solicitud_aprobaciones (solicitud_id, aprobador_id, orden, estado)
    VALUES (?, ?, ?, 'pendiente')
  `);
  
  aprobadores.forEach((aprobador, index) => {
    const orden = index + 1;
    insertStmt.run(solicitud.solicitud_id, aprobador.id, orden);
    console.log(`   → Orden ${orden}: ${aprobador.nombre}`);
  });
  
  console.log('✅ Corregida');
}

console.log('\n\n✅ PROCESO COMPLETADO\n');
db.close();
