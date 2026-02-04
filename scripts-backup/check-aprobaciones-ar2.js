import Database from 'better-sqlite3';
const db = new Database('./pollos.db');

console.log('=== Aprobaciones para AR-000002 ===');
const aprobaciones = db.prepare(`
  SELECT sa.*, u.nombre, u.rol 
  FROM solicitud_aprobaciones sa
  JOIN usuarios u ON sa.aprobador_id = u.id
  WHERE sa.solicitud_id = 'AR-000002'
  ORDER BY sa.orden
`).all();

console.log(JSON.stringify(aprobaciones, null, 2));

console.log('\n=== Estado de la solicitud ===');
const solicitud = db.prepare("SELECT solicitud_id, estado FROM solicitudes WHERE solicitud_id = 'AR-000002'").get();
console.log(solicitud);

db.close();
