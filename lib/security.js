import pool from './db.js';

// ==================== CONFIGURACIÓN DE SEGURIDAD ====================

/**
 * Obtener todas las configuraciones de seguridad
 */
export function getSecurityConfig() {
  try {
    return pool.query('SELECT * FROM security_config ORDER BY key').then(res => {
      const configObj = {};
      res.rows.forEach(config => {
        configObj[config.key] = {
          value: config.value,
          description: config.description,
          updated_at: config.updated_at,
          updated_by: config.updated_by
        };
      });
      return configObj;
    });
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
    return pool.query('SELECT value FROM security_config WHERE key = $1', [key])
      .then(res => res.rows[0] ? res.rows[0].value : defaultValue)
      .catch(() => defaultValue);
  } catch (error) {
    console.error(`Error al obtener configuración ${key}:`, error);
    return defaultValue;
  }
}

/**
 * Actualizar una configuración de seguridad
 */
export function updateSecurityConfig(key, value, userId = null) {
  const query = `UPDATE security_config SET value = $1, updated_at = CURRENT_TIMESTAMP, updated_by = $2 WHERE key = $3`;
  return pool.query(query, [value, userId, key])
    .then(res => res.rowCount > 0)
    .catch(error => {
      console.error(`Error al actualizar configuración ${key}:`, error);
      return false;
    });
}

/**
 * Actualizar múltiples configuraciones
          return configObj;
        });
      } catch (error) {
        console.error('Error al obtener configuración de seguridad:', error);
        return {};
      }
    `);
    
// Eliminado: transacciones y métodos SQLite. Migrado a PostgreSQL.
}

// ==================== VALIDACIÓN DE CONTRASEÑAS ====================

/**
 * Validar contraseña según políticas de seguridad
        const query = `UPDATE security_config SET value = $1, updated_at = CURRENT_TIMESTAMP, updated_by = $2 WHERE key = $3`;
        return pool.query(query, [value, userId, key]).then(res => res.rowCount > 0).catch(() => false);
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
  return getSecurityConfig().then(config => {
    const requirements = [];
    const minLength = parseInt(config.password_min_length?.value || '8');
    requirements.push(`Mínimo ${minLength} caracteres`);
    if (config.password_require_uppercase?.value === 'true') requirements.push('Al menos una letra mayúscula');
    if (config.password_require_lowercase?.value === 'true') requirements.push('Al menos una letra minúscula');
    if (config.password_require_numbers?.value === 'true') requirements.push('Al menos un número');
    if (config.password_require_special?.value === 'true') requirements.push('Al menos un caracter especial');
    return requirements;
  });
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
  try {
    return getSecurityConfig().then(config => {
      const whitelistEnabled = config.enable_ip_whitelist?.value === 'true';
      const blacklistEnabled = config.enable_ip_blacklist?.value === 'true';
      if (!whitelistEnabled && !blacklistEnabled) {
        return { allowed: true, reason: null };
      }
      if (blacklistEnabled) {
        return pool.query(
          `SELECT * FROM ip_access_control WHERE ip_address = $1 AND type = 'blacklist' AND is_active = 1 AND (expires_at IS NULL OR expires_at > NOW())`,
          [ipAddress]
        ).then(res => {
          if (res.rows[0]) {
            return { allowed: false, reason: res.rows[0].reason || 'IP bloqueada' };
          }
          if (whitelistEnabled) {
            return pool.query(
              `SELECT * FROM ip_access_control WHERE ip_address = $1 AND type = 'whitelist' AND is_active = 1 AND (expires_at IS NULL OR expires_at > NOW())`,
              [ipAddress]
            ).then(res2 => {
              if (!res2.rows[0]) {
                return { allowed: false, reason: 'IP no autorizada' };
              }
              return { allowed: true, reason: null };
            });
          }
          return { allowed: true, reason: null };
        });
      }
      if (whitelistEnabled) {
        return pool.query(
          `SELECT * FROM ip_access_control WHERE ip_address = $1 AND type = 'whitelist' AND is_active = 1 AND (expires_at IS NULL OR expires_at > NOW())`,
          [ipAddress]
        ).then(res => {
          if (!res.rows[0]) {
            return { allowed: false, reason: 'IP no autorizada' };
          }
          return { allowed: true, reason: null };
        });
      }
      return { allowed: true, reason: null };
    });
  } catch (error) {
    return { allowed: true, reason: null };
  }
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
  return pool.query('DELETE FROM ip_access_control WHERE id = $1', [id])
    .then(res => res.rowCount > 0)
    .catch(error => {
      console.error('Error al remover IP:', error);
      return false;
    });
}

/**
 * Activar/desactivar IP en control de acceso
 */
export function toggleIpAccessControl(id, isActive) {
  return pool.query('UPDATE ip_access_control SET is_active = $1 WHERE id = $2', [isActive ? 1 : 0, id])
    .then(res => res.rowCount > 0)
    .catch(error => {
      console.error('Error al cambiar estado de IP:', error);
      return false;
    });
}

// ==================== INTENTOS DE LOGIN FALLIDOS ====================

/**
 * Registrar intento de login fallido
 */
export function recordFailedLoginAttempt(username, ipAddress, userAgent, reason) {
  return pool.query(
    `INSERT INTO failed_login_attempts (username, ip_address, user_agent, failure_reason) VALUES ($1, $2, $3, $4)`,
    [username, ipAddress, userAgent, reason]
  ).then(() => true)
   .catch(error => {
      console.error('Error al registrar intento fallido:', error);
      return false;
    });
}

/**
 * Verificar si un usuario o IP está bloqueado temporalmente
 */
export function isAccountLocked(username, ipAddress = null) {
  return getSecurityConfig().then(config => {
    const maxAttempts = parseInt(config.max_login_attempts?.value || '5');
    const lockoutDuration = parseInt(config.lockout_duration_minutes?.value || '30');
    return pool.query(
      `SELECT COUNT(*) as count FROM failed_login_attempts WHERE username = $1 AND attempted_at > NOW() - INTERVAL '$2 minutes'`,
      [username, lockoutDuration]
    ).then(res => {
      if (res.rows[0]?.count >= maxAttempts) {
        return {
          locked: true,
          reason: `Demasiados intentos fallidos. Cuenta bloqueada por ${lockoutDuration} minutos.`,
          remainingMinutes: lockoutDuration
        };
      }
      if (ipAddress) {
        return pool.query(
          `SELECT COUNT(*) as count FROM failed_login_attempts WHERE ip_address = $1 AND attempted_at > NOW() - INTERVAL '$2 minutes'`,
          [ipAddress, lockoutDuration]
        ).then(res2 => {
          if (res2.rows[0]?.count >= maxAttempts * 2) {
            return {
              locked: true,
              reason: `Demasiados intentos desde esta IP. Bloqueada por ${lockoutDuration} minutos.`,
              remainingMinutes: lockoutDuration
            };
          }
          return { locked: false, reason: null, remainingMinutes: 0 };
        });
      }
      return { locked: false, reason: null, remainingMinutes: 0 };
    });
  }).catch(error => {
    console.error('Error al verificar bloqueo:', error);
    return { locked: false, reason: null, remainingMinutes: 0 };
  });
}

/**
 * Limpiar intentos de login antiguos
 */
export function cleanOldFailedAttempts(days = 30) {
  return pool.query(
    `DELETE FROM failed_login_attempts WHERE attempted_at < NOW() - INTERVAL '$1 days'`,
    [days]
  ).then(res => ({ success: true, deleted: res.rowCount }))
   .catch(error => {
      console.error('Error al limpiar intentos antiguos:', error);
      return { success: false, deleted: 0 };
    });
}

/**
 * Obtener estadísticas de intentos fallidos
 */
export function getFailedLoginStats() {
  return Promise.all([
    pool.query(`SELECT COUNT(*) as count FROM failed_login_attempts WHERE attempted_at > NOW() - INTERVAL '24 hours'`),
    pool.query(`SELECT COUNT(*) as count FROM failed_login_attempts WHERE attempted_at > NOW() - INTERVAL '7 days'`),
    pool.query(`SELECT username, COUNT(*) as attempts FROM failed_login_attempts WHERE attempted_at > NOW() - INTERVAL '7 days' GROUP BY username ORDER BY attempts DESC LIMIT 5`),
    pool.query(`SELECT ip_address, COUNT(*) as attempts FROM failed_login_attempts WHERE attempted_at > NOW() - INTERVAL '7 days' GROUP BY ip_address ORDER BY attempts DESC LIMIT 5`)
  ]).then(([last24h, last7days, topUsernames, topIps]) => ({
    last24h: last24h.rows[0]?.count || 0,
    last7days: last7days.rows[0]?.count || 0,
    topUsernames: topUsernames.rows,
    topIps: topIps.rows
  })).catch(error => {
    console.error('Error al obtener estadísticas:', error);
    return {
      last24h: 0,
      last7days: 0,
      topUsernames: [],
      topIps: []
    };
  });
}

/**
 * Obtener lista de intentos fallidos recientes
 */
export function getRecentFailedAttempts(limit = 100) {
  return pool.query(
    `SELECT * FROM failed_login_attempts ORDER BY attempted_at DESC LIMIT $1`,
    [limit]
  ).then(res => res.rows)
   .catch(error => {
      console.error('Error al obtener intentos fallidos:', error);
      return [];
    });
}
