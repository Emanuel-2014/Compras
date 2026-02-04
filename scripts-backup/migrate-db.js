import db from './lib/db.js';
import fs from 'fs'; // Importar el módulo 'fs' para verificar archivos

async function runMigrations() {
  try {
    console.log("Iniciando migraciones de base de datos...");

    // Verifica si la base de datos existe antes de intentar las migraciones
    if (!fs.existsSync('./database.db')) {
      console.error("Error: La base de datos 'database.db' no existe. Por favor, asegúrate de que la base de datos esté inicializada.");
      process.exit(1);
    }

    // Migración 1: Añadir columna es_urgente a la tabla solicitudes
    try {
      db.prepare("ALTER TABLE solicitudes ADD COLUMN es_urgente BOOLEAN DEFAULT 0;").run();
      console.log("Columna 'es_urgente' añadida a la tabla 'solicitudes'.");
    } catch (error) {
      if (error.message.includes("duplicate column name: es_urgente")) {
        console.warn("La columna 'es_urgente' ya existe en la tabla 'solicitudes'. Saltando migración.");
      } else {
        throw error; // Relanzar otros errores
      }
    }

    // Migración 2: Añadir columna dependencia a la tabla solicitudes
    try {
      db.prepare("ALTER TABLE solicitudes ADD COLUMN dependencia TEXT;").run();
      console.log("Columna 'dependencia' añadida a la tabla 'solicitudes'.");
    } catch (error) {
      if (error.message.includes("duplicate column name: dependencia")) {
        console.warn("La columna 'dependencia' ya existe en la tabla 'solicitudes'. Saltando migración.");
      } else {
        throw error; // Relanzar otros errores
      }
    }

    // Migración 3: Añadir columna comentario_administrador a la tabla solicitud_items
    try {
      db.prepare("ALTER TABLE solicitud_items ADD COLUMN comentario_administrador TEXT;").run();
      console.log("Columna 'comentario_administrador' añadida a la tabla 'solicitud_items'.");
    } catch (error) {
      if (error.message.includes("duplicate column name: comentario_administrador")) {
        console.warn("La columna 'comentario_administrador' ya existe en la tabla 'solicitud_items'. Saltando migración.");
      } else {
        throw error; // Relanzar otros errores
      }
    }

    // Migración 4: Añadir columna numero_factura a la tabla solicitud_items
    try {
      db.prepare("ALTER TABLE solicitud_items ADD COLUMN numero_factura TEXT;").run();
      console.log("Columna 'numero_factura' añadida a la tabla 'solicitud_items'.");
    } catch (error) {
      if (error.message.includes("duplicate column name: numero_factura")) {
        console.warn("La columna 'numero_factura' ya existe en la tabla 'solicitud_items'. Saltando migración.");
      } else {
        throw error; // Relanzar otros errores
      }
    }

    // Migración 5: Añadir columna rechazo_comentario a la tabla solicitudes
    try {
      db.prepare("ALTER TABLE solicitudes ADD COLUMN rechazo_comentario TEXT;").run();
      console.log("Columna 'rechazo_comentario' añadida a la tabla 'solicitudes'.");
    } catch (error) {
      if (error.message.includes("duplicate column name: rechazo_comentario")) {
        console.warn("La columna 'rechazo_comentario' ya existe en la tabla 'solicitudes'. Saltando migración.");
      } else {
        throw error; // Relanzar otros errores
      }
    }
    
    // Migración 6: Crear tabla facturas_compras
    try {
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
      console.log("Tabla 'facturas_compras' verificada/creada.");
    } catch (error) {
      console.error("Error creando tabla 'facturas_compras':", error.message);
      throw error;
    }

    // Migración 7: Crear tabla factura_compra_items
    try {
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
      console.log("Tabla 'factura_compra_items' verificada/creada.");
    } catch (error) {
      console.error("Error creando tabla 'factura_compra_items':", error.message);
      throw error;
    }

    // Migración 8: Normalizar solicitud_id para asegurar formato consistente XX-000000
    try {
      console.log("Normalizando IDs de solicitudes...");
      const solicitudes = db.prepare('SELECT id, solicitud_id FROM solicitudes WHERE solicitud_id IS NOT NULL').all();
      const updateStmt = db.prepare('UPDATE solicitudes SET solicitud_id = ? WHERE id = ?');
      
      let actualizadas = 0;
      for (const sol of solicitudes) {
        const parts = sol.solicitud_id.split('-');
        if (parts.length === 2 && parts[0].match(/^[A-Z]{1,2}$/)) {
          const numPart = parseInt(parts[1], 10);
          if (!isNaN(numPart)) {
            const normalizedId = `${parts[0]}-${String(numPart).padStart(6, '0')}`;
            if (normalizedId !== sol.solicitud_id) {
              updateStmt.run(normalizedId, sol.id);
              actualizadas++;
            }
          }
        }
      }
      console.log(`IDs de solicitudes normalizados: ${actualizadas} actualizadas.`);
    } catch (error) {
      console.error("Error normalizando IDs de solicitudes:", error.message);
      // No es un error crítico, solo informar
    }

    console.log("Migraciones completadas exitosamente.");
  } catch (error) {
    console.error("Error crítico durante las migraciones:", error);
    process.exit(1);
  } finally {
    db.close();
  }
}

runMigrations();
