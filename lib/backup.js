import db from './db.js';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const BACKUPS_DIR = path.join(process.cwd(), 'backups');

// Asegurar que el directorio de backups existe
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

/**
 * Crea un backup de la base de datos
 * @param {string} description - Descripción del backup
 * @param {number} userId - ID del usuario que crea el backup
 * @param {string} userName - Nombre del usuario
 * @returns {Object} Información del backup creado
 */
export function createBackup(description = '', userId = null, userName = null) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup_${timestamp}.db`;
    const filepath = path.join(BACKUPS_DIR, filename);
    
    // Hacer checkpoint WAL antes del backup
    db.pragma('wal_checkpoint(TRUNCATE)');
    
    // Copiar la base de datos
    const dbPath = path.join(process.cwd(), 'database.db');
    fs.copyFileSync(dbPath, filepath);
    
    // Verificar el backup
    const backupDb = new Database(filepath, { readonly: true });
    const tables = backupDb.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'").get();
    backupDb.close();
    
    const stats = fs.statSync(filepath);
    
    return {
      success: true,
      filename,
      filepath,
      size: stats.size,
      created: new Date().toISOString(),
      description,
      userId,
      userName,
      tablesCount: tables.count
    };
  } catch (error) {
    console.error('Error al crear backup:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Lista todos los backups disponibles
 * @returns {Array} Lista de backups
 */
export function listBackups() {
  try {
    if (!fs.existsSync(BACKUPS_DIR)) {
      return [];
    }
    
    const files = fs.readdirSync(BACKUPS_DIR);
    const backups = files
      .filter(file => file.endsWith('.db'))
      .map(file => {
        const filepath = path.join(BACKUPS_DIR, file);
        const stats = fs.statSync(filepath);
        
        return {
          filename: file,
          filepath,
          size: stats.size,
          created: stats.mtime.toISOString(),
          age: Date.now() - stats.mtime.getTime()
        };
      })
      .sort((a, b) => new Date(b.created) - new Date(a.created));
    
    return backups;
  } catch (error) {
    console.error('Error al listar backups:', error);
    return [];
  }
}

/**
 * Elimina un backup
 * @param {string} filename - Nombre del archivo a eliminar
 * @returns {Object} Resultado de la operación
 */
export function deleteBackup(filename) {
  try {
    const filepath = path.join(BACKUPS_DIR, filename);
    
    // Verificar que el archivo existe y está en el directorio de backups
    if (!fs.existsSync(filepath) || !filepath.startsWith(BACKUPS_DIR)) {
      return {
        success: false,
        error: 'Backup no encontrado o ruta inválida'
      };
    }
    
    fs.unlinkSync(filepath);
    
    return {
      success: true,
      message: 'Backup eliminado correctamente'
    };
  } catch (error) {
    console.error('Error al eliminar backup:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Restaura la base de datos desde un backup
 * @param {string} filename - Nombre del archivo de backup
 * @returns {Object} Resultado de la operación
 */
export function restoreBackup(filename) {
  try {
    const backupPath = path.join(BACKUPS_DIR, filename);
    
    // Verificar que el backup existe
    if (!fs.existsSync(backupPath) || !backupPath.startsWith(BACKUPS_DIR)) {
      return {
        success: false,
        error: 'Backup no encontrado o ruta inválida'
      };
    }
    
    // Verificar que el backup es válido
    let backupDb;
    try {
      backupDb = new Database(backupPath, { readonly: true });
      backupDb.prepare("SELECT COUNT(*) FROM sqlite_master").get();
      backupDb.close();
    } catch (error) {
      return {
        success: false,
        error: 'El archivo de backup está corrupto o no es válido'
      };
    }
    
    const dbPath = path.join(process.cwd(), 'database.db');
    
    // Crear backup de seguridad de la BD actual antes de restaurar
    const safetyBackupName = `pre-restore_${new Date().toISOString().replace(/[:.]/g, '-')}.db`;
    const safetyBackupPath = path.join(BACKUPS_DIR, safetyBackupName);
    
    db.pragma('wal_checkpoint(TRUNCATE)');
    fs.copyFileSync(dbPath, safetyBackupPath);
    
    // Cerrar todas las conexiones (esto reiniciará el servidor)
    db.close();
    
    // Restaurar el backup
    fs.copyFileSync(backupPath, dbPath);
    
    return {
      success: true,
      message: 'Base de datos restaurada correctamente. Por favor, reinicia el servidor.',
      safetyBackup: safetyBackupName
    };
  } catch (error) {
    console.error('Error al restaurar backup:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Obtiene información de la base de datos actual
 * @returns {Object} Información de la BD
 */
export function getDatabaseInfo() {
  try {
    const dbPath = path.join(process.cwd(), 'database.db');
    const stats = fs.statSync(dbPath);
    
    // Contar tablas
    const tables = db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'").get();
    
    // Obtener tamaño de cada tabla
    const tableNames = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
    const tableSizes = tableNames.map(t => {
      const count = db.prepare(`SELECT COUNT(*) as count FROM ${t.name}`).get();
      return {
        name: t.name,
        rows: count.count
      };
    });
    
    return {
      size: stats.size,
      modified: stats.mtime.toISOString(),
      tables: tables.count,
      tableSizes,
      path: dbPath
    };
  } catch (error) {
    console.error('Error al obtener información de la BD:', error);
    return null;
  }
}

/**
 * Limpia backups antiguos (más de X días)
 * @param {number} daysToKeep - Días a mantener
 * @returns {Object} Resultado de la limpieza
 */
export function cleanOldBackups(daysToKeep = 30) {
  try {
    const backups = listBackups();
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    
    let deleted = 0;
    backups.forEach(backup => {
      if (new Date(backup.created).getTime() < cutoffTime) {
        const result = deleteBackup(backup.filename);
        if (result.success) deleted++;
      }
    });
    
    return {
      success: true,
      deleted,
      message: `Se eliminaron ${deleted} backups antiguos`
    };
  } catch (error) {
    console.error('Error al limpiar backups antiguos:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
