import Database from 'better-sqlite3';

const db = new Database('pollos.db');

console.log('Agregando registros de aprobación para LORENA RUANO...');

// Verificar solicitudes con GUSTAVO LOPEZ como aprobador orden 1
const solicitudesGustavo = db.prepare(`
  SELECT DISTINCT sa.solicitud_id, sa.orden
  FROM solicitud_aprobaciones sa
  WHERE sa.aprobador_id = 13 
    AND sa.orden = 1
    AND sa.estado = 'pendiente'
`).all();

console.log('\nSolicitudes donde GUSTAVO tiene aprobación pendiente orden 1:');
console.log(JSON.stringify(solicitudesGustavo, null, 2));

// Agregar registro para LORENA RUANO (id 14) en las mismas solicitudes con el mismo orden
const insertStmt = db.prepare(`
  INSERT INTO solicitud_aprobaciones (solicitud_id, aprobador_id, estado, orden)
  VALUES (?, 14, 'pendiente', 1)
`);

solicitudesGustavo.forEach(sol => {
  // Verificar si ya existe
  const existe = db.prepare(`
    SELECT COUNT(*) as count 
    FROM solicitud_aprobaciones 
    WHERE solicitud_id = ? AND aprobador_id = 14
  `).get(sol.solicitud_id);
  
  if (existe.count === 0) {
    insertStmt.run(sol.solicitud_id);
    console.log(`✓ Agregada aprobación para LORENA en ${sol.solicitud_id}`);
  } else {
    console.log(`○ Ya existe aprobación para LORENA en ${sol.solicitud_id}`);
  }
});

// Mostrar resultado final
console.log('\n=== APROBACIONES ACTUALIZADAS ===');
const resultado = db.prepare(`
  SELECT sa.solicitud_id, sa.aprobador_id, u.nombre, sa.estado, sa.orden
  FROM solicitud_aprobaciones sa
  JOIN usuarios u ON sa.aprobador_id = u.id
  WHERE sa.solicitud_id IN (SELECT solicitud_id FROM solicitud_aprobaciones WHERE aprobador_id = 13 AND orden = 1)
  ORDER BY sa.solicitud_id, sa.orden, u.nombre
`).all();

console.log(JSON.stringify(resultado, null, 2));

db.close();
console.log('\n✓ Proceso completado');
