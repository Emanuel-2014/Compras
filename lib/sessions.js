import pool from './db.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Registra una nueva sesión activa
 */
export function createSession(token, userId, userName, ipAddress, userAgent) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const expiresAt = new Date(decoded.exp * 1000).toISOString();
    const query = `INSERT INTO active_sessions (
      session_token, user_id, user_name, ip_address, user_agent, expires_at
    ) VALUES ($1, $2, $3, $4, $5, $6)`;
    const values = [token, userId, userName, ipAddress || 'unknown', userAgent || 'unknown', expiresAt];
    pool.query(query, values);
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
    const query = `UPDATE active_sessions SET last_activity = CURRENT_TIMESTAMP WHERE session_token = $1 AND is_active = 1`;
    pool.query(query, [token]);
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
    const query = `UPDATE active_sessions SET is_active = 0 WHERE session_token = $1`;
    return pool.query(query, [token]).then(res => res.rowCount > 0);
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
    const query = `UPDATE active_sessions SET is_active = 0 WHERE user_id = $1 AND is_active = 1`;
    return pool.query(query, [userId]).then(res => ({ success: true, closed: res.rowCount })).catch(() => ({ success: false, closed: 0 }));
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
    const query = `
      SELECT 
        s.*,
        u.rol,
        u.dependencia,
        CASE 
          WHEN s.expires_at < NOW() THEN 'expired'
          WHEN s.is_active = 0 THEN 'closed'
          ELSE 'active'
        END as status
      FROM active_sessions s
      LEFT JOIN usuarios u ON s.user_id = u.id
      WHERE s.is_active = 1
      ORDER BY s.last_activity DESC
    `;
    return pool.query(query).then(res => res.rows);
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
    let sql = `SELECT * FROM active_sessions WHERE user_id = $1`;
    if (!includeInactive) {
      sql += ' AND is_active = 1';
    }
    sql += ' ORDER BY last_activity DESC';
    return pool.query(sql, [userId]).then(res => res.rows);
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
    const query = `UPDATE active_sessions SET is_active = 0 WHERE expires_at < NOW() AND is_active = 1`;
    return pool.query(query).then(res => ({ success: true, cleaned: res.rowCount })).catch(() => ({ success: false, cleaned: 0 }));
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
    const query = `DELETE FROM active_sessions WHERE last_activity < NOW() - INTERVAL '$1 days'`;
    return pool.query(query, [days]).then(res => ({ success: true, deleted: res.rowCount })).catch(() => ({ success: false, deleted: 0 }));
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
    return Promise.all([
      pool.query('SELECT COUNT(*) as count FROM active_sessions WHERE is_active = 1 AND expires_at > NOW()'),
      pool.query('SELECT COUNT(*) as count FROM active_sessions WHERE is_active = 1 AND expires_at <= NOW()'),
      pool.query('SELECT user_name, COUNT(*) as count FROM active_sessions WHERE is_active = 1 GROUP BY user_id, user_name ORDER BY count DESC LIMIT 10'),
      pool.query("SELECT COUNT(*) as count FROM active_sessions WHERE created_at >= NOW() - INTERVAL '1 day'")
    ]).then(([activeRes, expiredRes, byUserRes, last24hRes]) => ({
      active: activeRes.rows[0]?.count || 0,
      expired: expiredRes.rows[0]?.count || 0,
      byUser: byUserRes.rows,
      last24h: last24hRes.rows[0]?.count || 0
    }));
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
    const query = `SELECT * FROM active_sessions WHERE session_token = $1 AND is_active = 1 AND expires_at > NOW()`;
    return pool.query(query, [token]).then(res => !!res.rows[0]);
  } catch (error) {
    console.error('Error al verificar sesión:', error);
    return false;
  }
}
