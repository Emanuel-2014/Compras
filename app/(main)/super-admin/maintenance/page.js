'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './maintenance.module.css';
import { FaTools, FaDatabase, FaBroom, FaCheckCircle, FaCog } from 'react-icons/fa';

export default function MaintenancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [executing, setExecuting] = useState(false);
  const [lastOperation, setLastOperation] = useState(null);
  
  // Parámetros de limpieza
  const [auditDays, setAuditDays] = useState(90);
  const [failedLoginDays, setFailedLoginDays] = useState(30);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/super-admin/maintenance');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const executeOperation = async (action, params = {}) => {
    if (!confirm(`¿Ejecutar operación: ${action}?\n\nEsta operación puede tomar varios segundos.`)) {
      return;
    }

    setExecuting(true);
    setLastOperation(null);

    try {
      const res = await fetch('/api/super-admin/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, params })
      });

      if (res.ok) {
        const result = await res.json();
        setLastOperation(result);
        loadStats(); // Recargar estadísticas
      } else {
        alert('Error al ejecutar operación');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al ejecutar operación');
    } finally {
      setExecuting(false);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Cargando...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <FaTools className={styles.titleIcon} />
          <h1>Mantenimiento del Sistema</h1>
        </div>
        <button onClick={() => router.push('/super-admin')} className={styles.backButton}>
          Volver al Dashboard
        </button>
      </div>

      {/* Estadísticas de la BD */}
      {stats && (
        <div className={styles.statsSection}>
          <h3><FaDatabase /> Estadísticas de la Base de Datos</h3>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Tamaño del Archivo</div>
              <div className={styles.statValue}>{formatBytes(stats.fileSize)}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Espacio Libre</div>
              <div className={styles.statValue}>
                {formatBytes(stats.freeSpace)}
                <span className={styles.statExtra}>({stats.freeSpacePercentage}%)</span>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Total de Tablas</div>
              <div className={styles.statValue}>{stats.totalTables}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Total de Registros</div>
              <div className={styles.statValue}>{stats.totalRecords.toLocaleString()}</div>
            </div>
          </div>

          <div className={styles.tablesSection}>
            <h4>Detalle de Tablas</h4>
            <div className={styles.tableList}>
              {stats.tables && stats.tables.map((table, index) => (
                <div key={index} className={styles.tableItem}>
                  <span className={styles.tableName}>{table.name}</span>
                  <span className={styles.tableRows}>{table.rows.toLocaleString()} registros</span>
                  <span className={styles.tableIndexes}>{table.indexes} índices</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Resultado de última operación */}
      {lastOperation && (
        <div className={`${styles.resultCard} ${lastOperation.success ? styles.success : styles.error}`}>
          <FaCheckCircle className={styles.resultIcon} />
          <div>
            <h4>{lastOperation.success ? 'Operación Exitosa' : 'Error'}</h4>
            <p>{lastOperation.message}</p>
            {lastOperation.duration && (
              <small>Duración: {lastOperation.duration}ms</small>
            )}
          </div>
        </div>
      )}

      {/* Operaciones de Optimización */}
      <div className={styles.operationsSection}>
        <h3><FaCog /> Operaciones de Optimización</h3>
        
        <div className={styles.operationCard}>
          <h4>🔧 VACUUM</h4>
          <p>Reconstruye la base de datos para recuperar espacio no utilizado</p>
          <button
            onClick={() => executeOperation('vacuum')}
            disabled={executing}
            className={styles.operationButton}
          >
            Ejecutar VACUUM
          </button>
        </div>

        <div className={styles.operationCard}>
          <h4>🔄 REINDEX</h4>
          <p>Reconstruye todos los índices para mejorar el rendimiento de consultas</p>
          <button
            onClick={() => executeOperation('reindex')}
            disabled={executing}
            className={styles.operationButton}
          >
            Ejecutar REINDEX
          </button>
        </div>

        <div className={styles.operationCard}>
          <h4>📊 ANALYZE</h4>
          <p>Actualiza estadísticas de la base de datos para optimizar consultas</p>
          <button
            onClick={() => executeOperation('analyze')}
            disabled={executing}
            className={styles.operationButton}
          >
            Ejecutar ANALYZE
          </button>
        </div>

        <div className={styles.operationCard}>
          <h4>⚡ Optimización Completa</h4>
          <p>Ejecuta VACUUM + REINDEX + ANALYZE en secuencia</p>
          <button
            onClick={() => executeOperation('full-optimization')}
            disabled={executing}
            className={`${styles.operationButton} ${styles.primary}`}
          >
            Optimización Completa
          </button>
        </div>
      </div>

      {/* Operaciones de Limpieza */}
      <div className={styles.operationsSection}>
        <h3><FaBroom /> Limpieza de Datos</h3>
        
        <div className={styles.operationCard}>
          <h4>📝 Limpiar Logs de Auditoría</h4>
          <p>Elimina registros de auditoría antiguos</p>
          <div className={styles.paramControl}>
            <label>Mantener últimos:</label>
            <input
              type="number"
              value={auditDays}
              onChange={(e) => setAuditDays(parseInt(e.target.value))}
              min="1"
              className={styles.paramInput}
            />
            <span>días</span>
          </div>
          <button
            onClick={() => executeOperation('clean-audit-logs', { daysToKeep: auditDays })}
            disabled={executing}
            className={styles.operationButton}
          >
            Limpiar Logs
          </button>
        </div>

        <div className={styles.operationCard}>
          <h4>👤 Limpiar Sesiones Expiradas</h4>
          <p>Elimina sesiones que ya han expirado</p>
          <button
            onClick={() => executeOperation('clean-sessions')}
            disabled={executing}
            className={styles.operationButton}
          >
            Limpiar Sesiones
          </button>
        </div>

        <div className={styles.operationCard}>
          <h4>🔒 Limpiar Intentos Fallidos</h4>
          <p>Elimina registros antiguos de intentos de login fallidos</p>
          <div className={styles.paramControl}>
            <label>Mantener últimos:</label>
            <input
              type="number"
              value={failedLoginDays}
              onChange={(e) => setFailedLoginDays(parseInt(e.target.value))}
              min="1"
              className={styles.paramInput}
            />
            <span>días</span>
          </div>
          <button
            onClick={() => executeOperation('clean-failed-logins', { daysToKeep: failedLoginDays })}
            disabled={executing}
            className={styles.operationButton}
          >
            Limpiar Intentos
          </button>
        </div>
      </div>
    </div>
  );
}
