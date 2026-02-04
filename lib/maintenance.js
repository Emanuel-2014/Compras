import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'solicitudes.db');

// Ejecutar VACUUM para optimizar la base de datos
export function vacuumDatabase() {
  const db = new Database(dbPath);
  
  try {
    const startTime = Date.now();
    const statsBefore = fs.statSync(dbPath);
    const sizeBefore = statsBefore.size;
    
    db.prepare('VACUUM').run();
    
    const statsAfter = fs.statSync(dbPath);
    const sizeAfter = statsAfter.size;
    const duration = Date.now() - startTime;
    const spaceSaved = sizeBefore - sizeAfter;
    
    db.close();
    
    return {
      success: true,
      sizeBefore,
      sizeAfter,
      spaceSaved,
      duration,
      message: `VACUUM completado. ${formatBytes(spaceSaved)} liberados en ${duration}ms`
    };
  } catch (error) {
    db.close();
    throw error;
  }
}

// Ejecutar REINDEX para reconstruir índices
export function reindexDatabase() {
  const db = new Database(dbPath);
  
  try {
    const startTime = Date.now();
    
    // Obtener todas las tablas
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `).all();
    
    const reindexed = [];
    
    for (const table of tables) {
      try {
        db.prepare(`REINDEX ${table.name}`).run();
        reindexed.push(table.name);
      } catch (error) {
        console.error(`Error reindexing ${table.name}:`, error);
      }
    }
    
    const duration = Date.now() - startTime;
    
    db.close();
    
    return {
      success: true,
      tablesReindexed: reindexed.length,
      tables: reindexed,
      duration,
      message: `${reindexed.length} tablas reindexadas en ${duration}ms`
    };
  } catch (error) {
    db.close();
    throw error;
  }
}

// Analizar base de datos para actualizar estadísticas
export function analyzeDatabase() {
  const db = new Database(dbPath);
  
  try {
    const startTime = Date.now();
    
    db.prepare('ANALYZE').run();
    
    const duration = Date.now() - startTime;
    
    db.close();
    
    return {
      success: true,
      duration,
      message: `Análisis completado en ${duration}ms`
    };
  } catch (error) {
    db.close();
    throw error;
  }
}

// Verificar integridad de la base de datos
export function checkIntegrity() {
  const db = new Database(dbPath);
  
  try {
    const startTime = Date.now();
    
    const result = db.prepare('PRAGMA integrity_check').all();
    const isOk = result.length === 1 && result[0].integrity_check === 'ok';
    
    const duration = Date.now() - startTime;
    
    db.close();
    
    return {
      success: true,
      isOk,
      issues: isOk ? [] : result.map(r => r.integrity_check),
      duration,
      message: isOk 
        ? `Base de datos íntegra (${duration}ms)` 
        : `${result.length} problemas encontrados (${duration}ms)`
    };
  } catch (error) {
    db.close();
    throw error;
  }
}

// Obtener estadísticas de la base de datos
export function getDatabaseStats() {
  const db = new Database(dbPath);
  
  try {
    // Tamaño del archivo
    const stats = fs.statSync(dbPath);
    const fileSize = stats.size;
    
    // Número de páginas y tamaño de página
    const pageCount = db.prepare('PRAGMA page_count').pluck().get();
    const pageSize = db.prepare('PRAGMA page_size').pluck().get();
    
    // Espacio libre
    const freelistCount = db.prepare('PRAGMA freelist_count').pluck().get();
    const freeSpace = freelistCount * pageSize;
    
    // Información de tablas
    const tables = db.prepare(`
      SELECT 
        name,
        (SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND tbl_name=m.name) as index_count
      FROM sqlite_master m
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all();
    
    // Contar registros por tabla
    const tableCounts = [];
    for (const table of tables) {
      try {
        const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).pluck().get();
        tableCounts.push({
          name: table.name,
          rows: count,
          indexes: table.index_count
        });
      } catch (error) {
        tableCounts.push({
          name: table.name,
          rows: 0,
          indexes: table.index_count,
          error: error.message
        });
      }
    }
    
    // Total de registros
    const totalRecords = tableCounts.reduce((sum, t) => sum + t.rows, 0);
    
    db.close();
    
    return {
      fileSize,
      pageCount,
      pageSize,
      freeSpace,
      freeSpacePercentage: ((freeSpace / fileSize) * 100).toFixed(2),
      totalTables: tables.length,
      totalRecords,
      tables: tableCounts
    };
  } catch (error) {
    db.close();
    throw error;
  }
}

// Limpiar registros antiguos de auditoría
export function cleanOldAuditLogs(daysToKeep = 90) {
  const db = new Database(dbPath);
  
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffISO = cutoffDate.toISOString();
    
    const result = db.prepare(`
      DELETE FROM audit_logs 
      WHERE created_at < ?
    `).run(cutoffISO);
    
    db.close();
    
    return {
      success: true,
      deleted: result.changes,
      daysKept: daysToKeep,
      message: `${result.changes} registros eliminados (anteriores a ${daysToKeep} días)`
    };
  } catch (error) {
    db.close();
    throw error;
  }
}

// Limpiar sesiones expiradas
export function cleanExpiredSessions() {
  const db = new Database(dbPath);
  
  try {
    const now = new Date().toISOString();
    
    const result = db.prepare(`
      DELETE FROM active_sessions 
      WHERE expires_at < ?
    `).run(now);
    
    db.close();
    
    return {
      success: true,
      deleted: result.changes,
      message: `${result.changes} sesiones expiradas eliminadas`
    };
  } catch (error) {
    db.close();
    throw error;
  }
}

// Limpiar intentos de login fallidos antiguos
export function cleanOldFailedLogins(daysToKeep = 30) {
  const db = new Database(dbPath);
  
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffISO = cutoffDate.toISOString();
    
    const result = db.prepare(`
      DELETE FROM failed_login_attempts 
      WHERE attempt_time < ?
    `).run(cutoffISO);
    
    db.close();
    
    return {
      success: true,
      deleted: result.changes,
      daysKept: daysToKeep,
      message: `${result.changes} intentos fallidos eliminados (anteriores a ${daysToKeep} días)`
    };
  } catch (error) {
    db.close();
    throw error;
  }
}

// Optimización completa (VACUUM + REINDEX + ANALYZE)
export function fullOptimization() {
  const results = [];
  
  try {
    // 1. VACUUM
    const vacuumResult = vacuumDatabase();
    results.push({ operation: 'VACUUM', ...vacuumResult });
    
    // 2. REINDEX
    const reindexResult = reindexDatabase();
    results.push({ operation: 'REINDEX', ...reindexResult });
    
    // 3. ANALYZE
    const analyzeResult = analyzeDatabase();
    results.push({ operation: 'ANALYZE', ...analyzeResult });
    
    return {
      success: true,
      operations: results,
      message: 'Optimización completa finalizada exitosamente'
    };
  } catch (error) {
    return {
      success: false,
      operations: results,
      error: error.message,
      message: 'Error durante la optimización'
    };
  }
}

// Helper para formatear bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
