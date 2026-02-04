import Database from 'better-sqlite3-multiple-ciphers';

const DB_PASSWORD = 'P0ll0s@lD14-S3cur3!';

async function diagnosticar() {
  console.log('=== DIAGNÓSTICO Y CORRECCIÓN DE APROBADOR ===\n');

  try {
    const db = new Database('./database.db');
    
    // Abrir la base de datos cifrada
    db.pragma(`key = '${DB_PASSWORD}'`);
    // Verificar que la contraseña sea correcta
    db.prepare('SELECT count(*) FROM sqlite_master').get();
    console.log('✓ Base de datos cifrada: Acceso concedido.\n');

    // 1. Verificar usuarios aprobadores
    console.log('1. Usuarios con rol APROBADOR:');
    const aprobadores = db.prepare(`
      SELECT id, nombre, codigo_personal, rol, dependencia_id 
      FROM usuarios 
      WHERE LOWER(rol) = 'aprobador'
    `).all();
    
    console.log(aprobadores);
    console.log('');

    if (aprobadores.length === 0) {
      console.log('❌ NO hay usuarios con rol APROBADOR\n');
      db.close();
      return;
    }

  const aprobador = aprobadores[0];
  console.log(`✓ Aprobador encontrado: ${aprobador.nombre} (ID: ${aprobador.id})\n`);

  // 2. Verificar dependencias asignadas al aprobador
  console.log('2. Dependencias asignadas al aprobador:');
  const dependenciasAsignadas = db.prepare(`
    SELECT ad.*, d.nombre as dependencia_nombre
    FROM aprobador_dependencias ad
    JOIN dependencias d ON ad.dependencia_id = d.id
    WHERE ad.usuario_id = ?
  `).all(aprobador.id);
  
  console.log(dependenciasAsignadas);
  console.log('');

  // 3. Si no tiene dependencias asignadas, obtener todas las dependencias y asignarlas
  if (dependenciasAsignadas.length === 0) {
    console.log('❌ El aprobador NO tiene dependencias asignadas');
    console.log('📝 Asignando todas las dependencias al aprobador...\n');
    
    const todasDependencias = db.prepare('SELECT id, nombre FROM dependencias').all();
    console.log('Dependencias disponibles:', todasDependencias);
    
    const insertStmt = db.prepare('INSERT OR IGNORE INTO aprobador_dependencias (usuario_id, dependencia_id) VALUES (?, ?)');
    
    for (const dep of todasDependencias) {
      insertStmt.run(aprobador.id, dep.id);
      console.log(`  ✓ Asignada: ${dep.nombre} (ID: ${dep.id})`);
    }
    console.log('');
  } else {
    console.log('✓ El aprobador tiene dependencias asignadas\n');
  }

  // 4. Verificar solicitudes pendientes de aprobación
  console.log('3. Solicitudes en estado PENDIENTE_APROBACION:');
  const solicitudesPendientes = db.prepare(`
    SELECT s.solicitud_id, s.fecha_solicitud, s.estado,
           u.nombre as solicitante, u.dependencia_id,
           d.nombre as dependencia_nombre
    FROM solicitudes s
    JOIN usuarios u ON s.id_usuario = u.id
    LEFT JOIN dependencias d ON u.dependencia_id = d.id
    WHERE UPPER(s.estado) = 'PENDIENTE_APROBACION'
  `).all();
  
  console.log(solicitudesPendientes);
  console.log('');

  if (solicitudesPendientes.length === 0) {
    console.log('❌ NO hay solicitudes en estado PENDIENTE_APROBACION\n');
  }

  // 5. Verificar aprobaciones pendientes para el aprobador
  console.log('4. Aprobaciones pendientes asignadas al aprobador:');
  const dependenciasIds = dependenciasAsignadas.length > 0 
    ? dependenciasAsignadas.map(d => d.dependencia_id)
    : db.prepare('SELECT id FROM dependencias').all().map(d => d.id);

  const placeholders = dependenciasIds.map(() => '?').join(',');
  
  const aprobacionesPendientes = db.prepare(`
    SELECT DISTINCT
      s.solicitud_id,
      s.fecha_solicitud,
      s.estado,
      u.nombre as solicitante_nombre,
      u.dependencia_id,
      d.nombre as dependencia_nombre,
      sa.id as aprobacion_id,
      sa.estado as estado_aprobacion,
      sa.orden as orden_aprobacion,
      sa.aprobador_id
    FROM solicitudes s
    JOIN usuarios u ON s.id_usuario = u.id
    LEFT JOIN dependencias d ON u.dependencia_id = d.id
    JOIN solicitud_aprobaciones sa ON sa.solicitud_id = s.solicitud_id
    WHERE u.dependencia_id IN (${placeholders})
      AND sa.estado = 'pendiente'
      AND sa.aprobador_id = ?
      AND NOT EXISTS (
        SELECT 1 FROM solicitud_aprobaciones sa2 
        WHERE sa2.solicitud_id = s.solicitud_id 
          AND sa2.orden < sa.orden 
          AND sa2.estado = 'pendiente'
      )
    ORDER BY s.fecha_solicitud DESC
  `).all(...dependenciasIds, aprobador.id);
  
  console.log(aprobacionesPendientes);
  console.log('');

  if (aprobacionesPendientes.length === 0) {
    console.log('❌ NO hay aprobaciones pendientes para el aprobador\n');
    
    // 6. Verificar si hay solicitudes que necesitan aprobaciones
    console.log('5. Verificando solicitudes sin aprobaciones asignadas:');
    const solicitudesSinAprobaciones = db.prepare(`
      SELECT s.solicitud_id, s.estado, u.dependencia_id, d.nombre as dependencia_nombre
      FROM solicitudes s
      JOIN usuarios u ON s.id_usuario = u.id
      LEFT JOIN dependencias d ON u.dependencia_id = d.id
      WHERE UPPER(s.estado) = 'PENDIENTE_APROBACION'
        AND NOT EXISTS (
          SELECT 1 FROM solicitud_aprobaciones sa
          WHERE sa.solicitud_id = s.solicitud_id
        )
    `).all();
    
    console.log(solicitudesSinAprobaciones);
    console.log('');

    if (solicitudesSinAprobaciones.length > 0) {
      console.log('📝 Asignando aprobaciones a estas solicitudes...\n');
      
      const insertAprobacion = db.prepare(`
        INSERT INTO solicitud_aprobaciones (solicitud_id, aprobador_id, estado, orden)
        VALUES (?, ?, 'pendiente', 1)
      `);
      
      for (const sol of solicitudesSinAprobaciones) {
        insertAprobacion.run(sol.solicitud_id, aprobador.id);
        console.log(`  ✓ Aprobación asignada a solicitud ${sol.solicitud_id}`);
      }
      console.log('');
    }
  } else {
    console.log(`✓ Hay ${aprobacionesPendientes.length} aprobaciones pendientes para el aprobador\n`);
  }

  console.log('=== DIAGNÓSTICO COMPLETADO ===');
  console.log('\nAhora cierra sesión y vuelve a iniciar sesión como aprobador.');
  
  db.close();

} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
}

diagnosticar();
