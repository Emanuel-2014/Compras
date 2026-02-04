import Database from 'better-sqlite3-multiple-ciphers';

const db = new Database('database.db');
db.pragma('cipher=\'aes256cbc\'');
db.pragma('key=\'P0ll0s@lD14-S3cur3!\'');

console.log('\n=== VERIFICACIÓN DE SOLICITUDES ===\n');

// Contar todas las solicitudes
const count = db.prepare('SELECT COUNT(*) as total FROM solicitudes').get();
console.log(`Total de solicitudes en la base de datos: ${count.total}`);

// Mostrar las últimas 10 solicitudes
const solicitudes = db.prepare(`
  SELECT 
    id, 
    consecutivo, 
    descripcion, 
    fecha_creacion,
    usuario_id
  FROM solicitudes 
  ORDER BY fecha_creacion DESC 
  LIMIT 10
`).all();

if (solicitudes.length > 0) {
  console.log('\nÚltimas solicitudes:');
  solicitudes.forEach(sol => {
    console.log(`  - ID: ${sol.id} | Consecutivo: ${sol.consecutivo} | Usuario: ${sol.usuario_id}`);
    console.log(`    Descripción: ${sol.descripcion}`);
    console.log(`    Fecha: ${sol.fecha_creacion}\n`);
  });
} else {
  console.log('\nNo hay solicitudes en la base de datos.');
}

// Verificar solicitud_items
const itemsCount = db.prepare('SELECT COUNT(*) as total FROM solicitud_items').get();
console.log(`Total de items en solicitudes: ${itemsCount.total}`);

if (itemsCount.total > 0) {
  const items = db.prepare(`
    SELECT 
      si.id,
      si.solicitud_id,
      si.descripcion,
      s.consecutivo,
      s.fecha_creacion
    FROM solicitud_items si
    JOIN solicitudes s ON s.id = si.solicitud_id
    ORDER BY s.fecha_creacion DESC
    LIMIT 10
  `).all();
  
  console.log('\nÚltimos items de solicitudes:');
  items.forEach(item => {
    console.log(`  - Item: ${item.descripcion}`);
    console.log(`    Solicitud: ${item.consecutivo} | Fecha: ${item.fecha_creacion}\n`);
  });
}

db.close();
console.log('✓ Verificación completada\n');
