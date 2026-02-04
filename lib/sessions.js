import db from './db.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Registra una nueva sesión activa
 */
export function createSession(token, userId, userName, ipAddress, userAgent) {
  try {
    // Decodificar el token para obtener la fecha de expiración
    const decoded = jwt.verify(token, JWT_SECRET);
    const expiresAt = new Date(decoded.exp * 1000).toISOString();
    
    const stmt = db.prepare(`
      INSERT INTO active_sessions (
        session_token, user_id, user_name, ip_address, user_agent, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(token, userId, userName, ipAddress || 'unknown', userAgent || 'unknown', expiresAt);
    return true;
  } catch (error) {
    console.error('Error al crear sesión:', error);
    return false;
  }
}

/**
 * Actualiza la última actividad de una sesión
 */
export function updateSessionActivity(token) {
  try {
    const stmt = db.prepare(`
      UPDATE active_sessions 
      SET last_activity = CURRENT_TIMESTAMP 
      WHERE session_token = ? AND is_active = 1
    `);
    
    stmt.run(token);
    return true;
  } catch (error) {
    console.error('Error al actualizar actividad de sesión:', error);
    return false;
  }
}

/**
 * Cierra una sesión específica
 */
export function closeSession(token) {
  try {
    const stmt = db.prepare(`
      UPDATE active_sessions 
      SET is_active = 0 
      WHERE session_token = ?
    `);
    
    const result = stmt.run(token);
    return result.changes > 0;
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    return false;
  }
}

/**
 * Cierra todas las sesiones de un usuario
 */
export function closeUserSessions(userId) {
  try {
    const stmt = db.prepare(`
      UPDATE active_sessions 
      SET is_active = 0 
      WHERE user_id = ? AND is_active = 1
    `);
    
    const result = stmt.run(userId);
    return { success: true, closed: result.changes };
  } catch (error) {
    console.error('Error al cerrar sesiones del usuario:', error);
    return { success: false, closed: 0 };
  }
}

/**
 * Obtiene todas las sesiones activas
 */
export function getActiveSessions() {
  try {
    const sessions = db.prepare(`
      SELECT 
        s.*,
        u.rol,
        u.dependencia,
        CASE 
          WHEN datetime(s.expires_at) < datetime('now') THEN 'expired'
          WHEN s.is_active = 0 THEN 'closed'
          ELSE 'active'
        END as status
      FROM active_sessions s
      LEFT JOIN usuarios u ON s.user_id = u.id
      WHERE s.is_active = 1
      ORDER BY s.last_activity DESC
    `).all();
    
    return sessions;
  } catch (error) {
    console.error('Error al obtener sesiones activas:', error);
    return [];
  }
}

/**
 * Obtiene sesiones de un usuario específico
 */
export function getUserSessions(userId, includeInactive = false) {
  try {
    let sql = `
      SELECT * FROM active_sessions 
      WHERE user_id = ?
    `;
    
    if (!includeInactive) {
      sql += ' AND is_active = 1';
    }
    
    sql += ' ORDER BY last_activity DESC';
    
    const sessions = db.prepare(sql).all(userId);
    return sessions;
  } catch (error) {
    console.error('Error al obtener sesiones del usuario:', error);
    return [];
  }
}

/**
 * Limpia sesiones expiradas
 */
export function cleanExpiredSessions() {
  try {
    const stmt = db.prepare(`
      UPDATE active_sessions 
      SET is_active = 0 
      WHERE datetime(expires_at) < datetime('now') AND is_active = 1
    `);
    
    const result = stmt.run();
    return { success: true, cleaned: result.changes };
  } catch (error) {
    console.error('Error al limpiar sesiones expiradas:', error);
    return { success: false, cleaned: 0 };
  }
}

/**
 * Elimina sesiones antiguas (más de 30 días inactivas)
 */
export function deleteOldSessions(days = 30) {
  try {
    const stmt = db.prepare(`
      DELETE FROM active_sessions 
      WHERE datetime(last_activity) < datetime('now', '-' || ? || ' days')
    `);
    
    const result = stmt.run(days);
    return { success: true, deleted: result.changes };
  } catch (error) {
    console.error('Error al eliminar sesiones antiguas:', error);
    return { success: false, deleted: 0 };
  }
}

/**
 * Obtiene estadísticas de sesiones
 */
export function getSessionStats() {
  try {
    const totalActive = db.prepare(`
      SELECT COUNT(*) as count 
      FROM active_sessions 
      WHERE is_active = 1 AND datetime(expires_at) > datetime('now')
    `).get();
    
    const totalExpired = db.prepare(`
      SELECT COUNT(*) as count 
      FROM active_sessions 
      WHERE is_active = 1 AND datetime(expires_at) <= datetime('now')
    `).get();
    
    const byUser = db.prepare(`
      SELECT user_name, COUNT(*) as count 
      FROM active_sessions 
      WHERE is_active = 1 
      GROUP BY user_id, user_name 
      ORDER BY count DESC 
      LIMIT 10
    `).all();
    
    const last24h = db.prepare(`
      SELECT COUNT(*) as count 
      FROM active_sessions 
      WHERE datetime(created_at) >= datetime('now', '-1 day')
    `).get();
    
    return {
      active: totalActive.count,
      expired: totalExpired.count,
      byUser,
      last24h: last24h.count
    };
  } catch (error) {
    console.error('Error al obtener estadísticas de sesiones:', error);
    return {
      active: 0,
      expired: 0,
      byUser: [],
      last24h: 0
    };
  }
}

/**
 * Verifica si una sesión está activa
 */
export function isSessionActive(token) {
  try {
    const session = db.prepare(`
      SELECT * FROM active_sessions 
      WHERE session_token = ? 
      AND is_active = 1 
      AND datetime(expires_at) > datetime('now')
    `).get(token);
    
    return !!session;
  } catch (error) {
    console.error('Error al verificar sesión:', error);
    return false;
  }
}
