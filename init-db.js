import Database from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DATABASE_PATH || path.resolve(__dirname, 'solicitud_compras.db');

// Conexión sin cifrado ni contraseña
const db = new Database(dbPath);
async function initDb() {
  console.log('Iniciando configuración de la base de datos...');
  let plantaDepId, gustavoId, andresId;

  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      dependencia TEXT,
      codigo_personal TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      rol TEXT NOT NULL DEFAULT 'solicitante',
      nivel_aprobador TEXT,
      coordinador_id INTEGER,
      FOREIGN KEY (coordinador_id) REFERENCES usuarios(id)
    );
  `);
  console.log('Tabla "usuarios" verificada/creada.');

  const alterUserTable = (sql, columnName) => {
    try {
      db.exec(sql);
    } catch (e) {
      if (!e.message.includes('duplicate column')) {
        console.error(`Error alterando tabla usuarios con ${columnName}: ${e.message}`);
      }
    }
  };
  alterUserTable('ALTER TABLE usuarios ADD COLUMN puede_crear_plantillas INTEGER DEFAULT 0', 'puede_crear_plantillas');
  alterUserTable('ALTER TABLE usuarios ADD COLUMN reset_token TEXT', 'reset_token');
  alterUserTable('ALTER TABLE usuarios ADD COLUMN reset_token_expires INTEGER', 'reset_token_expires');
  alterUserTable('ALTER TABLE usuarios ADD COLUMN dependencia_id INTEGER REFERENCES dependencias(id)', 'dependencia_id');
  alterUserTable('ALTER TABLE usuarios ADD COLUMN is_super_admin INTEGER DEFAULT 0', 'is_super_admin');

  db.exec(`
    CREATE TABLE IF NOT EXISTS dependencias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE
    );
  `);
  console.log('Tabla "dependencias" verificada/creada.');

  const dependenciasEjemplo = ['OTROS', 'VEHICULOS', 'SST', 'RECURSOS HUMANOS', 'BODEGA PRINCIPAL', 'MANTEMINIEMTO PAD', 'SISTEMAS', 'PLANTA'];
  const stmtDependencias = db.prepare('INSERT OR IGNORE INTO dependencias (nombre) VALUES (?)');
  dependenciasEjemplo.forEach(dep => stmtDependencias.run(dep));
  console.log('Dependencias de ejemplo verificadas/creadas.');

  const updateUsuarioDependenciaStmt = db.prepare(`
    UPDATE usuarios SET dependencia_id = (SELECT id FROM dependencias WHERE nombre = usuarios.dependencia)
    WHERE usuarios.dependencia IS NOT NULL AND usuarios.dependencia_id IS NULL
  `);
  updateUsuarioDependenciaStmt.run();
  console.log('Usuarios existentes actualizados con dependencia_id.');

  plantaDepId = db.prepare("SELECT id FROM dependencias WHERE nombre = 'PLANTA'").get()?.id;
  const usersToInsert = [
    { nombre: 'ROLANDO TORRES', codigo: 'admin', pass: 'admin', rol: 'administrador', nivel: null, depId: null },
    { nombre: 'GUSTAVO LOPEZ', codigo: 'Lopez', pass: '123', rol: 'aprobador', nivel: 'Nivel 1', depId: plantaDepId },
    { nombre: 'ANDRES RODRIGUEZ', codigo: 'Andres', pass: '123', rol: 'solicitante', nivel: null, depId: plantaDepId }
  ];
  const stmtUser = db.prepare('INSERT OR IGNORE INTO usuarios (nombre, codigo_personal, password, rol, nivel_aprobador, dependencia_id) VALUES (?, ?, ?, ?, ?, ?)');
  for (const user of usersToInsert) {
    const hashedPassword = await bcrypt.hash(user.pass, 10);
    stmtUser.run(user.nombre, user.codigo, hashedPassword, user.rol, user.nivel, user.depId);
    console.log(`Usuario "${user.nombre}" verificado/creado.`);
  }

  // Marcar al usuario admin como super administrador
  const adminId = db.prepare("SELECT id FROM usuarios WHERE codigo_personal = 'admin'").get()?.id;
  if (adminId) {
    db.prepare("UPDATE usuarios SET is_super_admin = 1 WHERE id = ?").run(adminId);
    console.log('Usuario admin marcado como super administrador.');
  }

  gustavoId = db.prepare("SELECT id FROM usuarios WHERE codigo_personal = 'Lopez'").get()?.id;
  andresId = db.prepare("SELECT id FROM usuarios WHERE codigo_personal = 'Andres'").get()?.id;
  // --- Tabla y Lógica de Aprobador-Dependencia ---
  db.exec(`
    CREATE TABLE IF NOT EXISTS aprobador_dependencias (
      usuario_id INTEGER NOT NULL,
      dependencia_id INTEGER NOT NULL,
      PRIMARY KEY (usuario_id, dependencia_id),
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
      FOREIGN KEY (dependencia_id) REFERENCES dependencias(id) ON DELETE CASCADE
    );
  `);
  console.log('Tabla "aprobador_dependencias" verificada/creada.');
  if (gustavoId && plantaDepId) {
    const stmtAprobadorDependencia = db.prepare('INSERT OR IGNORE INTO aprobador_dependencias (usuario_id, dependencia_id) VALUES (?, ?)');
    stmtAprobadorDependencia.run(gustavoId, plantaDepId);
    console.log(`Vinculando Aprobador (ID: ${gustavoId}) con Dependencia (ID: ${plantaDepId}).`);
  }

  db.exec(`CREATE TABLE IF NOT EXISTS proveedores (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL UNIQUE, nit TEXT, nombre_asesor TEXT, contacto TEXT, nit_dv TEXT);`);
  console.log('Tabla "proveedores" verificada/creada.');

  // Proveedores de ejemplo eliminados - Base de datos limpia
  db.exec(`CREATE TABLE IF NOT EXISTS solicitudes (id INTEGER PRIMARY KEY AUTOINCREMENT, solicitud_id TEXT UNIQUE, id_usuario INTEGER NOT NULL, id_proveedor INTEGER NOT NULL, fecha_solicitud TEXT NOT NULL, notas_adicionales TEXT, estado TEXT NOT NULL DEFAULT 'pendiente', comentario_admin TEXT, coordinador_id INTEGER, tipo TEXT NOT NULL DEFAULT 'compra', aprobado_por_usuario_id INTEGER, fecha_aprobacion TEXT, rechazo_comentario TEXT, es_urgente BOOLEAN DEFAULT 0, FOREIGN KEY (id_usuario) REFERENCES usuarios(id), FOREIGN KEY (id_proveedor) REFERENCES proveedores(id), FOREIGN KEY (coordinador_id) REFERENCES usuarios(id), FOREIGN KEY (aprobado_por_usuario_id) REFERENCES usuarios(id));`);
  console.log('Tabla "solicitudes" verificada/creada.');
  db.exec(`CREATE TABLE IF NOT EXISTS solicitud_items (id INTEGER PRIMARY KEY AUTOINCREMENT, id_solicitud INTEGER NOT NULL, necesidad TEXT NOT NULL, descripcion TEXT NOT NULL, especificaciones TEXT, cantidad INTEGER NOT NULL, precio_unitario REAL DEFAULT 0, observaciones TEXT, ruta_imagen TEXT, estado_recepcion TEXT NOT NULL DEFAULT 'pendiente', comentario_recepcion_usuario TEXT, comentario_administrador TEXT, numero_factura TEXT, FOREIGN KEY (id_solicitud) REFERENCES solicitudes(id));`);
  console.log('Tabla "solicitud_items" verificada/creada.');
  db.exec(`CREATE TABLE IF NOT EXISTS solicitud_aprobaciones (id INTEGER PRIMARY KEY AUTOINCREMENT, solicitud_id TEXT NOT NULL, aprobador_id INTEGER NOT NULL, estado TEXT NOT NULL DEFAULT 'pendiente', orden INTEGER NOT NULL DEFAULT 0, fecha_decision TEXT, comentario TEXT, comentario_rechazo TEXT, FOREIGN KEY (solicitud_id) REFERENCES solicitudes(solicitud_id), FOREIGN KEY (aprobador_id) REFERENCES usuarios(id));`);
  console.log('Tabla "solicitud_aprobaciones" verificada/creada.');

  // Solicitud de ejemplo eliminada - Base de datos limpia

  db.exec(`CREATE TABLE IF NOT EXISTS recepciones_item (id INTEGER PRIMARY KEY AUTOINCREMENT, id_solicitud_item INTEGER NOT NULL, cantidad_recibida INTEGER NOT NULL, comentario TEXT, fecha_recepcion TEXT NOT NULL, usuario_id INTEGER NOT NULL, prefijo_factura_recepcion TEXT, numero_factura_recepcion TEXT, FOREIGN KEY (id_solicitud_item) REFERENCES solicitud_items(id), FOREIGN KEY (usuario_id) REFERENCES usuarios(id));`);
  console.log('Tabla "recepciones_item" verificada/creada.');
  db.exec(`CREATE TABLE IF NOT EXISTS facturas (id INTEGER PRIMARY KEY AUTOINCREMENT, id_solicitud INTEGER NOT NULL, numero_factura TEXT NOT NULL, fecha_factura TEXT NOT NULL, valor_factura REAL NOT NULL, nombre_archivo_original TEXT NOT NULL, nombre_archivo_guardado TEXT NOT NULL, path_archivo TEXT NOT NULL, mimetype TEXT NOT NULL, fecha_carga DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (id_solicitud) REFERENCES solicitudes(id));`);
  console.log('Tabla "facturas" verificada/creada.');
  db.exec(`CREATE TABLE IF NOT EXISTS plantillas (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL, usuario_id INTEGER NOT NULL, proveedor_id INTEGER NOT NULL, FOREIGN KEY(usuario_id) REFERENCES usuarios(id), FOREIGN KEY(proveedor_id) REFERENCES proveedores(id));`);
  console.log('Tabla "plantillas" verificada/creada.');
  db.exec(`CREATE TABLE IF NOT EXISTS plantilla_items (id INTEGER PRIMARY KEY AUTOINCREMENT, plantilla_id INTEGER NOT NULL, descripcion TEXT NOT NULL, especificaciones TEXT, FOREIGN KEY(plantilla_id) REFERENCES plantillas(id));`);
  console.log('Tabla "plantilla_items" verificada/creada.');
  db.exec(`CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);`);
  console.log('Tabla "app_settings" verificada/creada.');
  const settings = [
    { key: 'iva_percentage', value: '0.19' }, // Añadido para permitir la modificación del porcentaje de IVA
    { key: 'enable_duplicate_check', value: 'true' },
    { key: 'company_name', value: 'Pollos al Día S.A.S.' },
    { key: 'company_address', value: 'Calle 123 # 45-67, Bogotá D.C.' },
    { key: 'company_phone', value: '+57 1 234 5678' },
    { key: 'company_email', value: 'info@pollosaldia.com' },
    { key: 'company_logo_path', value: '/logo.png' }
  ];
  const stmtSettings = db.prepare('INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)');
  settings.forEach(setting => stmtSettings.run(setting.key, setting.value));
  console.log('Configuraciones iniciales de la app verificadas/creadas.');

  db.exec(`
    CREATE TABLE IF NOT EXISTS facturas_compras (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      proveedor_id INTEGER NOT NULL,
      prefijo TEXT,
      numero_factura TEXT NOT NULL,
      fecha_emision TEXT NOT NULL,
      archivo_path TEXT,
      usuario_id INTEGER NOT NULL,
      id_solicitud INTEGER,
      fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (proveedor_id) REFERENCES proveedores(id),
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
      FOREIGN KEY (id_solicitud) REFERENCES solicitudes(id)
    );
  `);
  console.log('Tabla "facturas_compras" verificada/creada.');

  const alterFacturasComprasTable = (sql, columnName) => {
    try {
      db.exec(sql);
    } catch (e) {
      if (!e.message.includes('duplicate column')) {
        console.error(`Error alterando tabla facturas_compras con ${columnName}: ${e.message}`);
      }
    }
  };
  alterFacturasComprasTable('ALTER TABLE facturas_compras ADD COLUMN iva_percentage REAL DEFAULT 0', 'iva_percentage');
  alterFacturasComprasTable('ALTER TABLE facturas_compras ADD COLUMN subtotal REAL DEFAULT 0', 'subtotal');
  alterFacturasComprasTable('ALTER TABLE facturas_compras ADD COLUMN total_iva_calculated REAL DEFAULT 0', 'total_iva_calculated');
  alterFacturasComprasTable('ALTER TABLE facturas_compras ADD COLUMN total REAL DEFAULT 0', 'total');
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS factura_compra_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      factura_compra_id INTEGER NOT NULL,
      descripcion TEXT NOT NULL,
      cantidad REAL NOT NULL,
      precio_unitario REAL NOT NULL,
      incluye_iva BOOLEAN DEFAULT 0,
      FOREIGN KEY (factura_compra_id) REFERENCES facturas_compras(id) ON DELETE CASCADE
    );
  `);
  console.log('Tabla "factura_compra_items" verificada/creada.');

  // Crear tabla de licencias para super admin
  db.exec(`
    CREATE TABLE IF NOT EXISTS licenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      license_key TEXT NOT NULL UNIQUE,
      applied_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      applied_by_user_id INTEGER NOT NULL,
      expires_on TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      notes TEXT,
      FOREIGN KEY (applied_by_user_id) REFERENCES usuarios(id)
    );
  `);
  console.log('Tabla "licenses" verificada/creada.');

  // Crear tabla de logs de auditoría
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      user_id INTEGER,
      user_name TEXT,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id INTEGER,
      details TEXT,
      ip_address TEXT,
      user_agent TEXT,
      FOREIGN KEY (user_id) REFERENCES usuarios(id)
    );
  `);
  console.log('Tabla "audit_logs" verificada/creada.');

  // Crear índices para mejorar búsquedas de auditoría
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
    CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
  `);
  console.log('Índices de auditoría creados.');

  // Crear tabla de sesiones activas
  db.exec(`
    CREATE TABLE IF NOT EXISTS active_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_token TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      user_name TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      is_active INTEGER DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES usuarios(id)
    );
  `);
  console.log('Tabla "active_sessions" verificada/creada.');

  // Crear índices para sesiones
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_session_token ON active_sessions(session_token);
    CREATE INDEX IF NOT EXISTS idx_session_user ON active_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_session_active ON active_sessions(is_active);
    CREATE INDEX IF NOT EXISTS idx_session_expires ON active_sessions(expires_at);
  `);
  console.log('Índices de sesiones creados.');

  // Crear tabla de configuración de seguridad
  db.exec(`
    CREATE TABLE IF NOT EXISTS security_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL,
      description TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_by INTEGER,
      FOREIGN KEY (updated_by) REFERENCES usuarios(id)
    );
  `);
  console.log('Tabla "security_config" verificada/creada.');

  // Crear tabla de IP bloqueadas/permitidas
  db.exec(`
    CREATE TABLE IF NOT EXISTS ip_access_control (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip_address TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('whitelist', 'blacklist')),
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_by INTEGER,
      expires_at DATETIME,
      is_active INTEGER DEFAULT 1,
      FOREIGN KEY (created_by) REFERENCES usuarios(id)
    );
  `);
  console.log('Tabla "ip_access_control" verificada/creada.');

  // Crear índices para control de acceso
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_ip_address ON ip_access_control(ip_address);
    CREATE INDEX IF NOT EXISTS idx_ip_type ON ip_access_control(type);
    CREATE INDEX IF NOT EXISTS idx_ip_active ON ip_access_control(is_active);
  `);
  console.log('Índices de control de acceso creados.');

  // Crear tabla de intentos de login fallidos
  db.exec(`
    CREATE TABLE IF NOT EXISTS failed_login_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      ip_address TEXT,
      attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      user_agent TEXT,
      failure_reason TEXT
    );
  `);
  console.log('Tabla "failed_login_attempts" verificada/creada.');

  // Crear índices para intentos fallidos
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_failed_username ON failed_login_attempts(username);
    CREATE INDEX IF NOT EXISTS idx_failed_ip ON failed_login_attempts(ip_address);
    CREATE INDEX IF NOT EXISTS idx_failed_time ON failed_login_attempts(attempted_at);
  `);
  console.log('Índices de intentos fallidos creados.');

  // Insertar configuraciones de seguridad por defecto si no existen
  const defaultSecurityConfig = [
    ['password_min_length', '8', 'Longitud mínima de contraseña'],
    ['password_require_uppercase', 'false', 'Requerir mayúsculas en contraseña'],
    ['password_require_lowercase', 'false', 'Requerir minúsculas en contraseña'],
    ['password_require_numbers', 'false', 'Requerir números en contraseña'],
    ['password_require_special', 'false', 'Requerir caracteres especiales en contraseña'],
    ['password_expiration_days', '0', 'Días hasta expiración de contraseña (0 = nunca)'],
    ['session_timeout_minutes', '60', 'Tiempo de inactividad antes de cerrar sesión'],
    ['max_login_attempts', '5', 'Intentos de login fallidos antes de bloqueo temporal'],
    ['lockout_duration_minutes', '30', 'Duración del bloqueo tras intentos fallidos'],
    ['enable_ip_whitelist', 'false', 'Activar whitelist de IPs'],
    ['enable_ip_blacklist', 'false', 'Activar blacklist de IPs'],
    ['enable_two_factor', 'false', 'Activar autenticación de dos factores'],
    ['force_password_change_first_login', 'false', 'Forzar cambio de contraseña en primer login'],
    ['password_history_count', '0', 'Número de contraseñas anteriores que no se pueden reutilizar (0 = sin límite)']
  ];

  const insertConfig = db.prepare(`
    INSERT OR IGNORE INTO security_config (key, value, description) 
    VALUES (?, ?, ?)
  `);

  for (const [key, value, description] of defaultSecurityConfig) {
    insertConfig.run(key, value, description);
  }
  console.log('Configuraciones de seguridad por defecto insertadas.');

  console.log('\nConfiguración de la base de datos completada.');
  db.close();
  console.log('Conexión a la base de datos cerrada.');
  console.log('init-db.js terminado exitosamente.');
  process.exit(0);
}
initDb().catch(err => {
  console.error('Hubo un error al inicializar la base de datos:', err.message);
  if (db && db.open) {
    db.close();
    console.log('Conexión a la base de datos cerrada debido a un error.');
  }
  process.exit(1);
});