'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Row, Col, Card, Table, Badge, Spinner, ProgressBar, Alert } from 'react-bootstrap';
import styles from './monitor.module.css';

export default function MonitorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [systemStats, setSystemStats] = useState(null);
  const [serverInfo, setServerInfo] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [storageStats, setStorageStats] = useState(null);
  const [activityData, setActivityData] = useState([]);
  const [topUsers, setTopUsers] = useState([]);
  const [dbMetrics, setDbMetrics] = useState(null);

  useEffect(() => {
    checkAuth();
    loadAllData();
    
    // Actualizar cada 30 segundos
    const interval = setInterval(() => {
      loadAllData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  async function checkAuth() {
    try {
      const res = await fetch('/api/session');
      const data = await res.json();
      if (!data.user || !data.user.is_super_admin) {
        router.push('/');
      }
    } catch (err) {
      console.error('Error verificando sesión:', err);
      router.push('/');
    }
  }

  async function loadAllData() {
    try {
      setLoading(true);
      
      const [
        systemRes,
        serverRes,
        usersRes,
        storageRes,
        activityRes,
        topUsersRes,
        dbMetricsRes
      ] = await Promise.all([
        fetch('/api/super-admin/monitor?type=system'),
        fetch('/api/super-admin/monitor?type=server'),
        fetch('/api/super-admin/monitor?type=users'),
        fetch('/api/super-admin/monitor?type=storage'),
        fetch('/api/super-admin/monitor?type=activity&days=7'),
        fetch('/api/super-admin/monitor?type=top-users&limit=10'),
        fetch('/api/super-admin/monitor?type=database')
      ]);

      if (systemRes.ok) setSystemStats(await systemRes.json());
      if (serverRes.ok) setServerInfo(await serverRes.json());
      if (usersRes.ok) setUserStats(await usersRes.json());
      if (storageRes.ok) setStorageStats(await storageRes.json());
      if (activityRes.ok) setActivityData(await activityRes.json());
      if (topUsersRes.ok) setTopUsers(await topUsersRes.json());
      if (dbMetricsRes.ok) setDbMetrics(await dbMetricsRes.json());

    } catch (err) {
      console.error('Error al cargar datos:', err);
    } finally {
      setLoading(false);
    }
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getMemoryPercentage() {
    if (!serverInfo) return 0;
    const used = serverInfo.system.totalMemory - serverInfo.system.freeMemory;
    return ((used / serverInfo.system.totalMemory) * 100).toFixed(2);
  }

  function getHeapPercentage() {
    if (!serverInfo) return 0;
    return ((serverInfo.process.memory.heapUsed / serverInfo.process.memory.heapTotal) * 100).toFixed(2);
  }

  if (loading && !systemStats) {
    return (
      <Container className="mt-5">
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Cargando información del sistema...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <div className={styles.header}>
            <div>
              <h2>📊 MONITOR DEL SISTEMA</h2>
              <p className="text-muted mb-0">
                <small>Actualización automática cada 30 segundos</small>
              </p>
            </div>
            <button 
              className="btn btn-outline-secondary"
              onClick={() => router.push('/super-admin')}
            >
              ← VOLVER AL PANEL
            </button>
          </div>
        </Col>
      </Row>

      {/* Estadísticas principales */}
      {systemStats && (
        <Row className="mb-4">
          <Col md={3}>
            <Card className={styles.statCard}>
              <Card.Body>
                <div className={styles.statIcon}>👥</div>
                <div className={styles.statValue}>{systemStats.database.tables.usuarios}</div>
                <div className={styles.statTitle}>Usuarios</div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className={styles.statCard}>
              <Card.Body>
                <div className={styles.statIcon}>📋</div>
                <div className={styles.statValue}>{systemStats.database.tables.solicitudes}</div>
                <div className={styles.statTitle}>Solicitudes</div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className={styles.statCard}>
              <Card.Body>
                <div className={styles.statIcon}>🏪</div>
                <div className={styles.statValue}>{systemStats.database.tables.proveedores}</div>
                <div className={styles.statTitle}>Proveedores</div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className={styles.statCard}>
              <Card.Body>
                <div className={styles.statIcon}>📝</div>
                <div className={styles.statValue}>{systemStats.database.tables.auditLogs}</div>
                <div className={styles.statTitle}>Logs de Auditoría</div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      <Row className="mb-4">
        {/* Servidor */}
        {serverInfo && (
          <Col md={6}>
            <Card className="h-100">
              <Card.Body>
                <h5 className="mb-3">🖥️ INFORMACIÓN DEL SERVIDOR</h5>
                <Table size="sm" bordered>
                  <tbody>
                    <tr>
                      <td><strong>Node.js</strong></td>
                      <td>{serverInfo.node.version}</td>
                    </tr>
                    <tr>
                      <td><strong>Plataforma</strong></td>
                      <td>{serverInfo.node.platform} ({serverInfo.node.arch})</td>
                    </tr>
                    <tr>
                      <td><strong>Hostname</strong></td>
                      <td>{serverInfo.system.hostname}</td>
                    </tr>
                    <tr>
                      <td><strong>CPUs</strong></td>
                      <td>{serverInfo.system.cpus} cores</td>
                    </tr>
                    <tr>
                      <td><strong>Uptime Proceso</strong></td>
                      <td>{serverInfo.process.uptimeFormatted}</td>
                    </tr>
                    <tr>
                      <td><strong>PID</strong></td>
                      <td>{serverInfo.process.pid}</td>
                    </tr>
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Col>
        )}

        {/* Memoria */}
        {serverInfo && (
          <Col md={6}>
            <Card className="h-100">
              <Card.Body>
                <h5 className="mb-3">💾 USO DE MEMORIA</h5>
                
                <div className="mb-3">
                  <div className="d-flex justify-content-between mb-1">
                    <small><strong>Memoria del Sistema</strong></small>
                    <small>{getMemoryPercentage()}%</small>
                  </div>
                  <ProgressBar 
                    now={getMemoryPercentage()} 
                    variant={getMemoryPercentage() > 80 ? 'danger' : getMemoryPercentage() > 60 ? 'warning' : 'success'}
                  />
                  <small className="text-muted">
                    {formatBytes(serverInfo.system.totalMemory - serverInfo.system.freeMemory)} / {formatBytes(serverInfo.system.totalMemory)}
                  </small>
                </div>

                <div className="mb-3">
                  <div className="d-flex justify-content-between mb-1">
                    <small><strong>Heap del Proceso</strong></small>
                    <small>{getHeapPercentage()}%</small>
                  </div>
                  <ProgressBar 
                    now={getHeapPercentage()} 
                    variant={getHeapPercentage() > 80 ? 'danger' : getHeapPercentage() > 60 ? 'warning' : 'info'}
                  />
                  <small className="text-muted">
                    {formatBytes(serverInfo.process.memory.heapUsed)} / {formatBytes(serverInfo.process.memory.heapTotal)}
                  </small>
                </div>

                <Table size="sm" className="mb-0">
                  <tbody>
                    <tr>
                      <td>RSS</td>
                      <td className="text-end">{formatBytes(serverInfo.process.memory.rss)}</td>
                    </tr>
                    <tr>
                      <td>External</td>
                      <td className="text-end">{formatBytes(serverInfo.process.memory.external)}</td>
                    </tr>
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Col>
        )}
      </Row>

      <Row className="mb-4">
        {/* Almacenamiento */}
        {storageStats && (
          <Col md={6}>
            <Card className="h-100">
              <Card.Body>
                <h5 className="mb-3">💿 ALMACENAMIENTO</h5>
                <Table striped bordered hover size="sm">
                  <thead>
                    <tr>
                      <th>Categoría</th>
                      <th>Tamaño</th>
                      <th>Elementos</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Base de Datos</strong></td>
                      <td>{formatBytes(storageStats.database.size)}</td>
                      <td>—</td>
                    </tr>
                    <tr>
                      <td><strong>Uploads</strong></td>
                      <td>{formatBytes(storageStats.uploads.size)}</td>
                      <td>{storageStats.uploads.count} archivos</td>
                    </tr>
                    <tr>
                      <td><strong>Backups</strong></td>
                      <td>{formatBytes(storageStats.backups.size)}</td>
                      <td>{storageStats.backups.count} backups</td>
                    </tr>
                    <tr className="table-info">
                      <td><strong>TOTAL</strong></td>
                      <td><strong>{formatBytes(storageStats.total)}</strong></td>
                      <td>—</td>
                    </tr>
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Col>
        )}

        {/* Usuarios */}
        {userStats && (
          <Col md={6}>
            <Card className="h-100">
              <Card.Body>
                <h5 className="mb-3">👥 ESTADÍSTICAS DE USUARIOS</h5>
                <Row className="mb-3">
                  <Col xs={6}>
                    <div className={styles.miniStat}>
                      <div className={styles.miniStatValue}>{userStats.total}</div>
                      <div className={styles.miniStatLabel}>Total Usuarios</div>
                    </div>
                  </Col>
                  <Col xs={6}>
                    <div className={styles.miniStat}>
                      <div className={styles.miniStatValue}>{systemStats?.actividad.usuariosActivos || 0}</div>
                      <div className={styles.miniStatLabel}>Activos (7 días)</div>
                    </div>
                  </Col>
                </Row>
                
                <h6 className="mb-2">Por Rol:</h6>
                <Table size="sm" className="mb-0">
                  <tbody>
                    {userStats.porRol.map(rol => (
                      <tr key={rol.rol}>
                        <td>
                          <Badge bg="secondary">{rol.rol.toUpperCase()}</Badge>
                        </td>
                        <td className="text-end"><strong>{rol.count}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Col>
        )}
      </Row>

      {/* Actividad reciente */}
      {activityData.length > 0 && (
        <Row className="mb-4">
          <Col>
            <Card>
              <Card.Body>
                <h5 className="mb-3">📈 ACTIVIDAD DE LOS ÚLTIMOS 7 DÍAS</h5>
                <div className={styles.chartContainer}>
                  {activityData.map((day, index) => {
                    const maxValue = Math.max(...activityData.map(d => Math.max(d.logins, d.solicitudes)));
                    const loginsHeight = maxValue > 0 ? (day.logins / maxValue) * 150 : 0;
                    const solicitudesHeight = maxValue > 0 ? (day.solicitudes / maxValue) * 150 : 0;
                    
                    return (
                      <div key={index} className={styles.chartBar}>
                        <div className={styles.barGroup}>
                          <div 
                            className={styles.bar}
                            style={{ 
                              height: `${loginsHeight}px`,
                              backgroundColor: '#DC143C'
                            }}
                            title={`${day.logins} logins`}
                          >
                            {day.logins > 0 && <span>{day.logins}</span>}
                          </div>
                          <div 
                            className={styles.bar}
                            style={{ 
                              height: `${solicitudesHeight}px`,
                              backgroundColor: '#4A90E2'
                            }}
                            title={`${day.solicitudes} solicitudes`}
                          >
                            {day.solicitudes > 0 && <span>{day.solicitudes}</span>}
                          </div>
                        </div>
                        <small className={styles.barLabel}>
                          {new Date(day.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                        </small>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 d-flex gap-3 justify-content-center">
                  <div><span className={styles.legendDot} style={{backgroundColor: '#DC143C'}}></span> Logins</div>
                  <div><span className={styles.legendDot} style={{backgroundColor: '#4A90E2'}}></span> Solicitudes</div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Top usuarios y métricas de BD */}
      <Row className="mb-4">
        {/* Top usuarios */}
        {topUsers.length > 0 && (
          <Col md={6}>
            <Card className="h-100">
              <Card.Body>
                <h5 className="mb-3">🏆 TOP 10 USUARIOS MÁS ACTIVOS</h5>
                <small className="text-muted">(Últimos 30 días)</small>
                <Table striped hover size="sm" className="mt-2">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Usuario</th>
                      <th>Acciones</th>
                      <th>Última Actividad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topUsers.map((user, index) => (
                      <tr key={index}>
                        <td>{index + 1}</td>
                        <td><strong>{user.user_name}</strong></td>
                        <td><Badge bg="primary">{user.actions}</Badge></td>
                        <td><small>{formatDate(user.last_activity)}</small></td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Col>
        )}

        {/* Métricas de BD */}
        {dbMetrics && (
          <Col md={6}>
            <Card className="h-100">
              <Card.Body>
                <h5 className="mb-3">🗄️ MÉTRICAS DE LA BASE DE DATOS</h5>
                <Table size="sm" bordered className="mb-3">
                  <tbody>
                    <tr>
                      <td><strong>Páginas</strong></td>
                      <td>{dbMetrics.sqlite.pageCount.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td><strong>Tamaño de Página</strong></td>
                      <td>{formatBytes(dbMetrics.sqlite.pageSize)}</td>
                    </tr>
                    <tr>
                      <td><strong>Fragmentación</strong></td>
                      <td>
                        <Badge bg={dbMetrics.sqlite.fragmentationPercent > 10 ? 'warning' : 'success'}>
                          {dbMetrics.sqlite.fragmentationPercent}%
                        </Badge>
                      </td>
                    </tr>
                  </tbody>
                </Table>
                
                <h6 className="mb-2">Registros por Tabla (Top 5):</h6>
                <Table size="sm" className="mb-0">
                  <tbody>
                    {dbMetrics.tables
                      .sort((a, b) => b.rows - a.rows)
                      .slice(0, 5)
                      .map(table => (
                        <tr key={table.name}>
                          <td>{table.name}</td>
                          <td className="text-end"><strong>{table.rows.toLocaleString()}</strong></td>
                        </tr>
                      ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Col>
        )}
      </Row>
    </Container>
  );
}
