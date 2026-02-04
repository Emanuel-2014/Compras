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

console.log('\n=== CONFIGURACIÓN DE APROBADORES PARA DEPENDENCIA 8 ===\n');

// Ver configuración de aprobadores
const aprobadores = db.prepare(`
  SELECT u.id, u.nombre, u.rol
  FROM usuarios u
  JOIN aprobador_dependencias ad ON u.id = ad.usuario_id
  WHERE ad.dependencia_id = 8
  ORDER BY 
    CASE 
      WHEN UPPER(u.rol) = 'APROBADOR' THEN 1
      WHEN UPPER(u.rol) = 'ADMINISTRADOR' THEN 2
      ELSE 3
    END,
    u.id
`).all();

console.log('Aprobadores asignados a dependencia 8:');
aprobadores.forEach(a => {
  console.log(`  - ${a.nombre} (ID: ${a.id}) - Rol: ${a.rol}`);
});

console.log('\n=== VERIFICANDO APROBACIONES DE AR-000002 ===\n');

const aprobacionesAR2 = db.prepare(`
  SELECT sa.*, u.nombre as aprobador_nombre
  FROM solicitud_aprobaciones sa
  JOIN usuarios u ON sa.aprobador_id = u.id
  WHERE sa.solicitud_id = 'AR-000002'
  ORDER BY sa.orden
`).all();

console.log('Aprobaciones configuradas para AR-000002:');
if (aprobacionesAR2.length === 0) {
  console.log('  ❌ NO HAY APROBACIONES');
} else {
  aprobacionesAR2.forEach(a => {
    console.log(`  - Orden ${a.orden}: ${a.aprobador_nombre} - Estado: ${a.estado}`);
  });
}

console.log('\n');
db.close();
