import Database from 'better-sqlite3-multiple-ciphers';

const db = new Database('./database.db');
db.pragma('key = "P0ll0s@lD14-S3cur3!"');

console.log('Asignando aprobaciones pendientes...');

const stmt = db.prepare("INSERT OR IGNORE INTO solicitud_aprobaciones (solicitud_id, aprobador_id, estado, orden) VALUES (?, 6, 'pendiente', 1)");

stmt.run('AR-000002');
stmt.run('AR-000003');
stmt.run('AR-000004');

console.log('✓ Aprobaciones asignadas a GUSTAVO LOPEZ (ID: 6)');
console.log('\n Solicitudes asignadas: AR-000002, AR-000003, AR-000004');
console.log('\nAhora cierra sesión y vuelve a iniciar sesión como aprobador.');

db.close();
