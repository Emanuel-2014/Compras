'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Row, Col, Card, Table, Form, Button, Badge, Spinner, Alert } from 'react-bootstrap';
import styles from './audit.module.css';

export default function AuditLogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filtros
  const [filterAction, setFilterAction] = useState('');
  const [filterEntityType, setFilterEntityType] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 50;

  useEffect(() => {
    checkAuth();
    fetchStats();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [filterAction, filterEntityType, filterStartDate, filterEndDate, currentPage]);

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

  async function fetchStats() {
    try {
      const res = await fetch('/api/super-admin/audit?action=stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error al obtener estadísticas:', err);
    }
  }

  async function fetchLogs() {
    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams();
      if (filterAction) params.append('filterAction', filterAction);
      if (filterEntityType) params.append('entityType', filterEntityType);
      if (filterStartDate) params.append('startDate', filterStartDate);
      if (filterEndDate) params.append('endDate', filterEndDate);
      params.append('limit', logsPerPage);
      params.append('offset', (currentPage - 1) * logsPerPage);

      const res = await fetch(`/api/super-admin/audit?${params.toString()}`);
      
      if (!res.ok) {
        throw new Error('Error al cargar logs');
      }

      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      console.error('Error al cargar logs:', err);
      setError('No se pudieron cargar los logs de auditoría');
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setFilterAction('');
    setFilterEntityType('');
    setFilterStartDate('');
    setFilterEndDate('');
    setCurrentPage(1);
  }

  function getActionBadge(action) {
    const colors = {
      'LOGIN': 'success',
      'LOGOUT': 'secondary',
      'CREATE': 'primary',
      'UPDATE': 'info',
      'DELETE': 'danger',
      'APPROVE': 'success',
      'REJECT': 'warning',
      'VIEW': 'light'
    };
    return colors[action] || 'secondary';
  }

  function formatDate(timestamp) {
    return new Date(timestamp).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <div className={styles.header}>
            <h2>📝 LOGS DE AUDITORÍA</h2>
            <Button variant="outline-secondary" onClick={() => router.push('/super-admin')}>
              ← VOLVER AL PANEL
            </Button>
          </div>
        </Col>
      </Row>

      {/* Estadísticas */}
      {stats && (
        <Row className="mb-4">
          <Col md={3}>
            <Card className={styles.statCard}>
              <Card.Body>
                <div className={styles.statTitle}>Total de Logs</div>
                <div className={styles.statValue}>{stats.totalLogs.toLocaleString()}</div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className={styles.statCard}>
              <Card.Body>
                <div className={styles.statTitle}>Últimas 24h</div>
                <div className={styles.statValue}>{stats.last24h.toLocaleString()}</div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className={styles.statCard}>
              <Card.Body>
                <div className={styles.statTitle}>Acciones Únicas</div>
                <div className={styles.statValue}>{stats.byAction.length}</div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className={styles.statCard}>
              <Card.Body>
                <div className={styles.statTitle}>Usuarios Activos</div>
                <div className={styles.statValue}>{stats.byUser.length}</div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Filtros */}
      <Card className="mb-4">
        <Card.Body>
          <h5 className="mb-3">🔍 FILTROS</h5>
          <Row>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Acción</Form.Label>
                <Form.Select 
                  value={filterAction} 
                  onChange={(e) => { setFilterAction(e.target.value); setCurrentPage(1); }}
                >
                  <option value="">Todas</option>
                  <option value="LOGIN">LOGIN</option>
                  <option value="LOGOUT">LOGOUT</option>
                  <option value="CREATE">CREATE</option>
                  <option value="UPDATE">UPDATE</option>
                  <option value="DELETE">DELETE</option>
                  <option value="APPROVE">APPROVE</option>
                  <option value="REJECT">REJECT</option>
                  <option value="VIEW">VIEW</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Tipo de Entidad</Form.Label>
                <Form.Select 
                  value={filterEntityType} 
                  onChange={(e) => { setFilterEntityType(e.target.value); setCurrentPage(1); }}
                >
                  <option value="">Todas</option>
                  <option value="SOLICITUD">SOLICITUD</option>
                  <option value="USUARIO">USUARIO</option>
                  <option value="PROVEEDOR">PROVEEDOR</option>
                  <option value="FACTURA">FACTURA</option>
                  <option value="LICENSE">LICENSE</option>
                  <option value="DEPENDENCIA">DEPENDENCIA</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group>
                <Form.Label>Fecha Inicio</Form.Label>
                <Form.Control 
                  type="date" 
                  value={filterStartDate}
                  onChange={(e) => { setFilterStartDate(e.target.value); setCurrentPage(1); }}
                />
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group>
                <Form.Label>Fecha Fin</Form.Label>
                <Form.Control 
                  type="date" 
                  value={filterEndDate}
                  onChange={(e) => { setFilterEndDate(e.target.value); setCurrentPage(1); }}
                />
              </Form.Group>
            </Col>
            <Col md={2} className="d-flex align-items-end">
              <Button variant="outline-secondary" onClick={handleReset} className="w-100">
                LIMPIAR FILTROS
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Tabla de logs */}
      <Card>
        <Card.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3">Cargando logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <Alert variant="info">No se encontraron logs con los filtros aplicados.</Alert>
          ) : (
            <>
              <div className={styles.tableWrapper}>
                <Table striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Fecha/Hora</th>
                      <th>Usuario</th>
                      <th>Acción</th>
                      <th>Entidad</th>
                      <th>Detalles</th>
                      <th>IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(log => (
                      <tr key={log.id}>
                        <td>{log.id}</td>
                        <td className={styles.dateCell}>{formatDate(log.timestamp)}</td>
                        <td>
                          <div className={styles.userCell}>
                            <strong>{log.user_name || 'Sistema'}</strong>
                            {log.user_id && <small className="text-muted">ID: {log.user_id}</small>}
                          </div>
                        </td>
                        <td>
                          <Badge bg={getActionBadge(log.action)}>
                            {log.action}
                          </Badge>
                        </td>
                        <td>
                          {log.entity_type ? (
                            <div>
                              <strong>{log.entity_type}</strong>
                              {log.entity_id && <div className="text-muted">#{log.entity_id}</div>}
                            </div>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className={styles.detailsCell}>
                          {log.details ? (
                            <small>{log.details.length > 100 ? log.details.substring(0, 100) + '...' : log.details}</small>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td>
                          <small className="text-muted">{log.ip_address || '—'}</small>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>

              {/* Paginación simple */}
              <div className="d-flex justify-content-between align-items-center mt-3">
                <div className="text-muted">
                  Mostrando página {currentPage} ({logsPerPage} logs por página)
                </div>
                <div>
                  <Button 
                    variant="outline-primary" 
                    size="sm" 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                    className="me-2"
                  >
                    ← ANTERIOR
                  </Button>
                  <Button 
                    variant="outline-primary" 
                    size="sm"
                    disabled={logs.length < logsPerPage}
                    onClick={() => setCurrentPage(p => p + 1)}
                  >
                    SIGUIENTE →
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
}
