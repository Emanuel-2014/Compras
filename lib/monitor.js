import pool from './db.js';
import os from 'os';

/**
 * Obtiene estadísticas generales del sistema
 */
export function getSystemStats() {
  return Promise.all([
    pool.query('SELECT COUNT(*) as count FROM usuarios'),
    pool.query('SELECT COUNT(*) as count FROM solicitudes'),
    pool.query('SELECT COUNT(*) as count FROM proveedores'),
    pool.query('SELECT COUNT(*) as count FROM audit_logs'),
    pool.query('SELECT estado, COUNT(*) as count FROM solicitudes GROUP BY estado'),
    pool.query('SELECT COUNT(*) as count FROM solicitudes WHERE es_urgente = true'),
    pool.query("SELECT COUNT(*) as count FROM audit_logs WHERE timestamp >= NOW() - INTERVAL '1 day'"),
    pool.query("SELECT COUNT(DISTINCT user_id) as count FROM audit_logs WHERE timestamp >= NOW() - INTERVAL '7 days'")
  ]).then(([
    usuariosRes,
    solicitudesRes,
    proveedoresRes,
    auditLogsRes,
    solicitudesPorEstadoRes,
    solicitudesUrgentesRes,
    actividadRecienteRes,
    usuariosActivosRes
  ]) => ({
    database: {
      tables: {
        usuarios: usuariosRes.rows[0]?.count || 0,
        solicitudes: solicitudesRes.rows[0]?.count || 0,
        proveedores: proveedoresRes.rows[0]?.count || 0,
        auditLogs: auditLogsRes.rows[0]?.count || 0
      }
    },
    solicitudes: {
      porEstado: solicitudesPorEstadoRes.rows,
      urgentes: solicitudesUrgentesRes.rows[0]?.count || 0
    },
    actividadReciente: actividadRecienteRes.rows[0]?.count || 0,
    usuariosActivos: usuariosActivosRes.rows[0]?.count || 0
  })).catch(error => {
    console.error('Error al obtener estadísticas del sistema:', error);
    return {};
  });
        total: solicitudes.count,
        porEstado: solicitudesPorEstado,
        urgentes: solicitudesUrgentes.count
      },
      actividad: {
        reciente: actividadReciente.count,
        usuariosActivos: usuariosActivos.count
      }
    };
  } catch (error) {
    console.error('Error al obtener estadísticas del sistema:', error);
    return null;
  }
}

/**
 * Obtiene información del servidor
 */
export function getServerInfo() {
  try {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    
    return {
      node: {
        version: process.version,
        platform: process.platform,
        arch: process.arch
      },
      process: {
        pid: process.pid,
        uptime: uptime,
        uptimeFormatted: formatUptime(uptime),
        memory: {
          rss: memoryUsage.rss,
          heapTotal: memoryUsage.heapTotal,
          heapUsed: memoryUsage.heapUsed,
          external: memoryUsage.external
        }
      },
      system: {
        platform: os.platform(),
        release: os.release(),
        hostname: os.hostname(),
        cpus: os.cpus().length,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        uptime: os.uptime()
      }
    };
  } catch (error) {
    console.error('Error al obtener información del servidor:', error);
    return null;
  }
}

/**
 * Obtiene estadísticas de actividad por fecha
 */
export function getActivityStats(days = 7) {
  try {
    const stats = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const logins = db.prepare(`
        SELECT COUNT(*) as count 
        FROM audit_logs 
        WHERE action = 'LOGIN' 
        AND DATE(timestamp) = ?
      `).get(dateStr);
      
      const solicitudesCreadas = db.prepare(`
        SELECT COUNT(*) as count 
        FROM solicitudes 
        WHERE DATE(fecha_solicitud) = ?
      `).get(dateStr);
      
      stats.push({
        date: dateStr,
        logins: logins?.count || 0,
        solicitudes: solicitudesCreadas?.count || 0
      });
    }
    
    return stats;
  } catch (error) {
    console.error('Error al obtener estadísticas de actividad:', error);
    return [];
  }
}

/**
 * Obtiene métricas de rendimiento de la base de datos
 */
export function getDatabaseMetrics() {
  try {
    // Tamaño de cada tabla
    const tables = db.prepare(`
      SELECT name 
      FROM sqlite_master 
      WHERE type='table' 
      AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all();
    
    const tableSizes = tables.map(table => {
      const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
      return {
        name: table.name,
        rows: count.count
      };
    });
    
    // Estadísticas de SQLite
    const pageCount = db.pragma('page_count', { simple: true });
    const pageSize = db.pragma('page_size', { simple: true });
    const freelistCount = db.pragma('freelist_count', { simple: true });
    
    return {
      tables: tableSizes,
      sqlite: {
        pageCount,
        pageSize,
        freelistCount,
        estimatedSize: pageCount * pageSize,
        fragmentationPercent: ((freelistCount / pageCount) * 100).toFixed(2)
      }
    };
  } catch (error) {
    console.error('Error al obtener métricas de la base de datos:', error);
    return null;
  }
}

/**
 * Obtiene estadísticas de usuarios
 */
export function getUserStats() {
  try {
    const totalUsuarios = db.prepare('SELECT COUNT(*) as count FROM usuarios').get();
    
    const usuariosPorRol = db.prepare(`
      SELECT rol, COUNT(*) as count 
      FROM usuarios 
      GROUP BY rol 
      ORDER BY count DESC
    `).all();
    
    const usuariosConPlantillas = db.prepare(`
      SELECT COUNT(*) as count 
      FROM usuarios 
      WHERE puede_crear_plantillas = 1
    `).get();
    
    const superAdmins = db.prepare(`
      SELECT COUNT(*) as count 
      FROM usuarios 
      WHERE is_super_admin = 1
    `).get();
    
    return {
      total: totalUsuarios.count,
      porRol: usuariosPorRol,
      conPlantillas: usuariosConPlantillas.count,
      superAdmins: superAdmins.count
    };
  } catch (error) {
    console.error('Error al obtener estadísticas de usuarios:', error);
    return null;
  }
}

/**
 * Obtiene top usuarios más activos
 */
export function getTopActiveUsers(limit = 10) {
  try {
    const topUsers = db.prepare(`
      SELECT 
        user_name,
        user_id,
        COUNT(*) as actions,
        MAX(timestamp) as last_activity
      FROM audit_logs
      WHERE timestamp >= datetime('now', '-30 days')
      GROUP BY user_id, user_name
      ORDER BY actions DESC
      LIMIT ?
    `).all(limit);
    
    return topUsers;
  } catch (error) {
    console.error('Error al obtener usuarios más activos:', error);
    return [];
  }
}

/**
 * Obtiene estadísticas de almacenamiento
 */
export function getStorageStats() {
  try {
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const backupsDir = path.join(process.cwd(), 'backups');
    
    const dbPath = path.join(process.cwd(), 'database.db');
    const dbSize = fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0;
    
    let uploadsSize = 0;
    let uploadsCount = 0;
    if (fs.existsSync(uploadsDir)) {
      const files = getAllFiles(uploadsDir);
      uploadsCount = files.length;
      uploadsSize = files.reduce((total, file) => {
        try {
          return total + fs.statSync(file).size;
        } catch {
          return total;
        }
      }, 0);
    }
    
    let backupsSize = 0;
    let backupsCount = 0;
    if (fs.existsSync(backupsDir)) {
      const files = fs.readdirSync(backupsDir).filter(f => f.endsWith('.db'));
      backupsCount = files.length;
      backupsSize = files.reduce((total, file) => {
        try {
          return total + fs.statSync(path.join(backupsDir, file)).size;
        } catch {
          return total;
        }
      }, 0);
    }
    
    return {
      database: {
        size: dbSize,
        path: dbPath
      },
      uploads: {
        size: uploadsSize,
        count: uploadsCount,
        path: uploadsDir
      },
      backups: {
        size: backupsSize,
        count: backupsCount,
        path: backupsDir
      },
      total: dbSize + uploadsSize + backupsSize
    };
  } catch (error) {
    console.error('Error al obtener estadísticas de almacenamiento:', error);
    return null;
  }
}

// Función auxiliar para obtener todos los archivos recursivamente
function getAllFiles(dir) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat && stat.isDirectory()) {
        results = results.concat(getAllFiles(filePath));
      } else {
        results.push(filePath);
      }
    });
  } catch (error) {
    // Directorio no existe o sin permisos
  }
  return results;
}

// Función auxiliar para formatear uptime
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}
