import db from './db.js';

// ==================== CONFIGURACIÓN DE SEGURIDAD ====================

/**
 * Obtener todas las configuraciones de seguridad
 */
export function getSecurityConfig() {
  try {
    const configs = db.prepare('SELECT * FROM security_config ORDER BY key').all();
    
    // Convertir a objeto para facilitar el acceso
    const configObj = {};
    configs.forEach(config => {
      configObj[config.key] = {
        value: config.value,
        description: config.description,
        updated_at: config.updated_at,
        updated_by: config.updated_by
      };
    });
    
    return configObj;
  } catch (error) {
    console.error('Error al obtener configuración de seguridad:', error);
    return {};
  }
}

/**
 * Obtener un valor de configuración específico
 */
export function getSecurityConfigValue(key, defaultValue = null) {
  try {
    const config = db.prepare('SELECT value FROM security_config WHERE key = ?').get(key);
    return config ? config.value : defaultValue;
  } catch (error) {
    console.error(`Error al obtener configuración ${key}:`, error);
    return defaultValue;
  }
}

/**
 * Actualizar una configuración de seguridad
 */
export function updateSecurityConfig(key, value, userId = null) {
  try {
    const stmt = db.prepare(`
      UPDATE security_config 
      SET value = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ? 
      WHERE key = ?
    `);
    
    const result = stmt.run(value, userId, key);
    return result.changes > 0;
  } catch (error) {
    console.error(`Error al actualizar configuración ${key}:`, error);
    return false;
  }
}

/**
 * Actualizar múltiples configuraciones
 */
export function updateSecurityConfigBulk(configs, userId = null) {
  try {
    const stmt = db.prepare(`
      UPDATE security_config 
      SET value = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ? 
      WHERE key = ?
    `);
    
    const transaction = db.transaction((configArray) => {
      for (const [key, value] of configArray) {
        stmt.run(value, userId, key);
      }
    });
    
    transaction(Object.entries(configs));
    return true;
  } catch (error) {
    console.error('Error al actualizar configuraciones:', error);
    return false;
  }
}

// ==================== VALIDACIÓN DE CONTRASEÑAS ====================

/**
 * Validar contraseña según políticas de seguridad
 */
export function validatePassword(password) {
  const config = getSecurityConfig();
  const errors = [];
  
  // Longitud mínima
  const minLength = parseInt(config.password_min_length?.value || '8');
  if (password.length < minLength) {
    errors.push(`La contraseña debe tener al menos ${minLength} caracteres`);
  }
  
  // Mayúsculas
  if (config.password_require_uppercase?.value === 'true' && !/[A-Z]/.test(password)) {
    errors.push('La contraseña debe contener al menos una letra mayúscula');
  }
  
  // Minúsculas
  if (config.password_require_lowercase?.value === 'true' && !/[a-z]/.test(password)) {
    errors.push('La contraseña debe contener al menos una letra minúscula');
  }
  
  // Números
  if (config.password_require_numbers?.value === 'true' && !/\d/.test(password)) {
    errors.push('La contraseña debe contener al menos un número');
  }
  
  // Caracteres especiales
  if (config.password_require_special?.value === 'true' && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('La contraseña debe contener al menos un caracter especial');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Obtener requisitos de contraseña en formato legible
 */
export function getPasswordRequirements() {
  const config = getSecurityConfig();
  const requirements = [];
  
  const minLength = parseInt(config.password_min_length?.value || '8');
  requirements.push(`Mínimo ${minLength} caracteres`);
  
  if (config.password_require_uppercase?.value === 'true') {
    requirements.push('Al menos una mayúscula');
  }
  
  if (config.password_require_lowercase?.value === 'true') {
    requirements.push('Al menos una minúscula');
  }
  
  if (config.password_require_numbers?.value === 'true') {
    requirements.push('Al menos un número');
  }
  
  if (config.password_require_special?.value === 'true') {
    requirements.push('Al menos un caracter especial');
  }
  
  return requirements;
}

// ==================== CONTROL DE ACCESO POR IP ====================

/**
 * Verificar si una IP está permitida
 */
export function isIpAllowed(ipAddress) {
  try {
    const config = getSecurityConfig();
    const whitelistEnabled = config.enable_ip_whitelist?.value === 'true';
    const blacklistEnabled = config.enable_ip_blacklist?.value === 'true';
    
    // Si no hay control de IP activo, permitir
    if (!whitelistEnabled && !blacklistEnabled) {
      return { allowed: true, reason: null };
    }
    
    // Verificar blacklist primero
    if (blacklistEnabled) {
      const blacklisted = db.prepare(`
        SELECT * FROM ip_access_control 
        WHERE ip_address = ? AND type = 'blacklist' AND is_active = 1
        AND (expires_at IS NULL OR datetime(expires_at) > datetime('now'))
      `).get(ipAddress);
      
      if (blacklisted) {
        return { allowed: false, reason: blacklisted.reason || 'IP bloqueada' };
      }
    }
    
    // Verificar whitelist si está activa
    if (whitelistEnabled) {
      const whitelisted = db.prepare(`
        SELECT * FROM ip_access_control 
        WHERE ip_address = ? AND type = 'whitelist' AND is_active = 1
        AND (expires_at IS NULL OR datetime(expires_at) > datetime('now'))
      `).get(ipAddress);
      
      if (!whitelisted) {
        return { allowed: false, reason: 'IP no autorizada' };
      }
    }
    
    return { allowed: true, reason: null };
  } catch (error) {
    console.error('Error al verificar IP:', error);
    return { allowed: true, reason: null }; // En caso de error, permitir acceso
  }
}

/**
 * Obtener lista de IPs controladas
 */
export function getIpAccessList(type = null) {
  try {
    let query = 'SELECT * FROM ip_access_control WHERE 1=1';
    const params = [];
    
    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }
    
    query += ' ORDER BY created_at DESC';
    
    return db.prepare(query).all(...params);
  } catch (error) {
    console.error('Error al obtener lista de IPs:', error);
    return [];
  }
}

/**
 * Agregar IP a whitelist o blacklist
 */
export function addIpToAccessControl(ipAddress, type, reason, userId = null, expiresAt = null) {
  try {
    const stmt = db.prepare(`
      INSERT INTO ip_access_control (ip_address, type, reason, created_by, expires_at) 
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(ipAddress, type, reason, userId, expiresAt);
    return { success: true, id: result.lastInsertRowid };
  } catch (error) {
    console.error('Error al agregar IP:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Remover IP del control de acceso
 */
export function removeIpFromAccessControl(id) {
  try {
    const stmt = db.prepare('DELETE FROM ip_access_control WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  } catch (error) {
    console.error('Error al remover IP:', error);
    return false;
  }
}

/**
 * Activar/desactivar IP en control de acceso
 */
export function toggleIpAccessControl(id, isActive) {
  try {
    const stmt = db.prepare('UPDATE ip_access_control SET is_active = ? WHERE id = ?');
    const result = stmt.run(isActive ? 1 : 0, id);
    return result.changes > 0;
  } catch (error) {
    console.error('Error al cambiar estado de IP:', error);
    return false;
  }
}

// ==================== INTENTOS DE LOGIN FALLIDOS ====================

/**
 * Registrar intento de login fallido
 */
export function recordFailedLoginAttempt(username, ipAddress, userAgent, reason) {
  try {
    const stmt = db.prepare(`
      INSERT INTO failed_login_attempts (username, ip_address, user_agent, failure_reason) 
      VALUES (?, ?, ?, ?)
    `);
    
    stmt.run(username, ipAddress, userAgent, reason);
    return true;
  } catch (error) {
    console.error('Error al registrar intento fallido:', error);
    return false;
  }
}

/**
 * Verificar si un usuario o IP está bloqueado temporalmente
 */
export function isAccountLocked(username, ipAddress = null) {
  try {
    const config = getSecurityConfig();
    const maxAttempts = parseInt(config.max_login_attempts?.value || '5');
    const lockoutDuration = parseInt(config.lockout_duration_minutes?.value || '30');
    
    // Verificar intentos por username
    const userAttempts = db.prepare(`
      SELECT COUNT(*) as count 
      FROM failed_login_attempts 
      WHERE username = ? 
      AND datetime(attempted_at) > datetime('now', '-' || ? || ' minutes')
    `).get(username, lockoutDuration);
    
    if (userAttempts.count >= maxAttempts) {
      return { 
        locked: true, 
        reason: `Demasiados intentos fallidos. Cuenta bloqueada por ${lockoutDuration} minutos.`,
        remainingMinutes: lockoutDuration
      };
    }
    
    // Verificar intentos por IP si se proporciona
    if (ipAddress) {
      const ipAttempts = db.prepare(`
        SELECT COUNT(*) as count 
        FROM failed_login_attempts 
        WHERE ip_address = ? 
        AND datetime(attempted_at) > datetime('now', '-' || ? || ' minutes')
      `).get(ipAddress, lockoutDuration);
      
      if (ipAttempts.count >= maxAttempts * 2) { // Más estricto para IP
        return { 
          locked: true, 
          reason: `Demasiados intentos desde esta IP. Bloqueada por ${lockoutDuration} minutos.`,
          remainingMinutes: lockoutDuration
        };
      }
    }
    
    return { locked: false, reason: null, remainingMinutes: 0 };
  } catch (error) {
    console.error('Error al verificar bloqueo:', error);
    return { locked: false, reason: null, remainingMinutes: 0 };
  }
}

/**
 * Limpiar intentos de login antiguos
 */
export function cleanOldFailedAttempts(days = 30) {
  try {
    const stmt = db.prepare(`
      DELETE FROM failed_login_attempts 
      WHERE datetime(attempted_at) < datetime('now', '-' || ? || ' days')
    `);
    
    const result = stmt.run(days);
    return { success: true, deleted: result.changes };
  } catch (error) {
    console.error('Error al limpiar intentos antiguos:', error);
    return { success: false, deleted: 0 };
  }
}

/**
 * Obtener estadísticas de intentos fallidos
 */
export function getFailedLoginStats() {
  try {
    const last24h = db.prepare(`
      SELECT COUNT(*) as count 
      FROM failed_login_attempts 
      WHERE datetime(attempted_at) > datetime('now', '-24 hours')
    `).get();
    
    const last7days = db.prepare(`
      SELECT COUNT(*) as count 
      FROM failed_login_attempts 
      WHERE datetime(attempted_at) > datetime('now', '-7 days')
    `).get();
    
    const topUsernames = db.prepare(`
      SELECT username, COUNT(*) as attempts 
      FROM failed_login_attempts 
      WHERE datetime(attempted_at) > datetime('now', '-7 days')
      GROUP BY username 
      ORDER BY attempts DESC 
      LIMIT 5
    `).all();
    
    const topIps = db.prepare(`
      SELECT ip_address, COUNT(*) as attempts 
      FROM failed_login_attempts 
      WHERE datetime(attempted_at) > datetime('now', '-7 days')
      GROUP BY ip_address 
      ORDER BY attempts DESC 
      LIMIT 5
    `).all();
    
    return {
      last24h: last24h.count,
      last7days: last7days.count,
      topUsernames,
      topIps
    };
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    return {
      last24h: 0,
      last7days: 0,
      topUsernames: [],
      topIps: []
    };
  }
}

/**
 * Obtener lista de intentos fallidos recientes
 */
export function getRecentFailedAttempts(limit = 100) {
  try {
    return db.prepare(`
      SELECT * FROM failed_login_attempts 
      ORDER BY attempted_at DESC 
      LIMIT ?
    `).all(limit);
  } catch (error) {
    console.error('Error al obtener intentos fallidos:', error);
    return [];
  }
}
