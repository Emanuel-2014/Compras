import db from './db.js';

/**
 * Registra un evento de auditoría en la base de datos
 * 
 * @param {Object} params - Parámetros del log
 * @param {number} params.userId - ID del usuario que realiza la acción
 * @param {string} params.userName - Nombre del usuario
 * @param {string} params.action - Acción realizada (LOGIN, CREATE, UPDATE, DELETE, etc.)
 * @param {string} [params.entityType] - Tipo de entidad afectada (SOLICITUD, USUARIO, PROVEEDOR, etc.)
 * @param {number} [params.entityId] - ID de la entidad afectada
 * @param {string|Object} [params.details] - Detalles adicionales (se convierte a JSON si es objeto)
 * @param {string} [params.ipAddress] - Dirección IP del cliente
 * @param {string} [params.userAgent] - User agent del navegador
 */
export function logAudit({
  userId,
  userName,
  action,
  entityType = null,
  entityId = null,
  details = null,
  ipAddress = null,
  userAgent = null
}) {
  try {
    const detailsStr = typeof details === 'object' ? JSON.stringify(details) : details;
    
    const stmt = db.prepare(`
      INSERT INTO audit_logs (
        user_id, user_name, action, entity_type, entity_id, details, ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      userId,
      userName,
      action,
      entityType,
      entityId,
      detailsStr,
      ipAddress,
      userAgent
    );
    
    return true;
  } catch (error) {
    console.error('Error al registrar log de auditoría:', error);
    return false;
  }
}

/**
 * Obtiene logs de auditoría con filtros opcionales
 * 
 * @param {Object} filters - Filtros de búsqueda
 * @param {number} [filters.userId] - Filtrar por usuario
 * @param {string} [filters.action] - Filtrar por acción
 * @param {string} [filters.entityType] - Filtrar por tipo de entidad
 * @param {string} [filters.startDate] - Fecha de inicio (ISO format)
 * @param {string} [filters.endDate] - Fecha de fin (ISO format)
 * @param {number} [filters.limit=100] - Límite de resultados
 * @param {number} [filters.offset=0] - Offset para paginación
 * @returns {Array} Array de logs
 */
export function getAuditLogs(filters = {}) {
  try {
    let sql = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];
    
    if (filters.userId) {
      sql += ' AND user_id = ?';
      params.push(filters.userId);
    }
    
    if (filters.action) {
      sql += ' AND action = ?';
      params.push(filters.action);
    }
    
    if (filters.entityType) {
      sql += ' AND entity_type = ?';
      params.push(filters.entityType);
    }
    
    if (filters.startDate) {
      sql += ' AND timestamp >= ?';
      params.push(filters.startDate);
    }
    
    if (filters.endDate) {
      sql += ' AND timestamp <= ?';
      params.push(filters.endDate);
    }
    
    sql += ' ORDER BY timestamp DESC';
    
    const limit = filters.limit || 100;
    const offset = filters.offset || 0;
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const stmt = db.prepare(sql);
    return stmt.all(...params);
  } catch (error) {
    console.error('Error al obtener logs de auditoría:', error);
    return [];
  }
}

/**
 * Cuenta el total de logs según filtros
 */
export function countAuditLogs(filters = {}) {
  try {
    let sql = 'SELECT COUNT(*) as total FROM audit_logs WHERE 1=1';
    const params = [];
    
    if (filters.userId) {
      sql += ' AND user_id = ?';
      params.push(filters.userId);
    }
    
    if (filters.action) {
      sql += ' AND action = ?';
      params.push(filters.action);
    }
    
    if (filters.entityType) {
      sql += ' AND entity_type = ?';
      params.push(filters.entityType);
    }
    
    if (filters.startDate) {
      sql += ' AND timestamp >= ?';
      params.push(filters.startDate);
    }
    
    if (filters.endDate) {
      sql += ' AND timestamp <= ?';
      params.push(filters.endDate);
    }
    
    const stmt = db.prepare(sql);
    const result = stmt.get(...params);
    return result?.total || 0;
  } catch (error) {
    console.error('Error al contar logs de auditoría:', error);
    return 0;
  }
}

/**
 * Obtiene estadísticas de auditoría
 */
export function getAuditStats() {
  try {
    
    // Total de logs
    const totalLogs = db.prepare('SELECT COUNT(*) as total FROM audit_logs').get()?.total || 0;
    
    // Logs por acción
    const byAction = db.prepare(`
      SELECT action, COUNT(*) as count 
      FROM audit_logs 
      GROUP BY action 
      ORDER BY count DESC
    `).all();
    
    // Logs por usuario (top 10)
    const byUser = db.prepare(`
      SELECT user_name, COUNT(*) as count 
      FROM audit_logs 
      GROUP BY user_id, user_name 
      ORDER BY count DESC 
      LIMIT 10
    `).all();
    
    // Logs de las últimas 24 horas
    const last24h = db.prepare(`
      SELECT COUNT(*) as count 
      FROM audit_logs 
      WHERE timestamp >= datetime('now', '-1 day')
    `).get()?.count || 0;
    
    return {
      totalLogs,
      byAction,
      byUser,
      last24h
    };
  } catch (error) {
    console.error('Error al obtener estadísticas de auditoría:', error);
    return {
      totalLogs: 0,
      byAction: [],
      byUser: [],
      last24h: 0
    };
  }
}
