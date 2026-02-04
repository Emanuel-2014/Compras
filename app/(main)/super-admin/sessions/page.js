'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Alert, Modal, Form } from 'react-bootstrap';
import styles from './sessions.module.css';

export default function SessionsManagement() {
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [showCloseUserModal, setShowCloseUserModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUserName, setSelectedUserName] = useState('');
  const [showCleanModal, setShowCleanModal] = useState(false);
  const [cleanDays, setCleanDays] = useState(30);

  // Cargar sesiones y estadísticas
  const loadSessions = async () => {
    try {
      setLoading(true);
      const [sessionsRes, statsRes] = await Promise.all([
        fetch('/api/super-admin/sessions'),
        fetch('/api/super-admin/sessions?action=stats')
      ]);

      if (!sessionsRes.ok || !statsRes.ok) {
        throw new Error('Error al cargar sesiones');
      }

      const sessionsData = await sessionsRes.json();
      const statsData = await statsRes.json();

      setSessions(sessionsData.sessions || []);
      setStats(statsData);
      setError('');
    } catch (err) {
      setError('Error al cargar las sesiones: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
    
    // Actualizar cada 30 segundos
    const interval = setInterval(loadSessions, 30000);
    return () => clearInterval(interval);
  }, []);

  // Cerrar sesión específica
  const handleCloseSession = async () => {
    if (!selectedSession) return;

    try {
      const res = await fetch('/api/super-admin/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'close-session',
          sessionToken: selectedSession.session_token
        })
      });

      if (!res.ok) throw new Error('Error al cerrar sesión');

      const data = await res.json();
      setSuccess(`Sesión de ${selectedSession.user_name} cerrada correctamente`);
      setShowCloseModal(false);
      setSelectedSession(null);
      loadSessions();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Error al cerrar la sesión: ' + err.message);
    }
  };

  // Cerrar todas las sesiones de un usuario
  const handleCloseUserSessions = async () => {
    if (!selectedUserId) return;

    try {
      const res = await fetch('/api/super-admin/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'close-user-sessions',
          userId: selectedUserId
        })
      });

      if (!res.ok) throw new Error('Error al cerrar sesiones del usuario');

      const data = await res.json();
      setSuccess(`${data.closed} sesión(es) de ${selectedUserName} cerrada(s)`);
      setShowCloseUserModal(false);
      setSelectedUserId(null);
      setSelectedUserName('');
      loadSessions();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Error al cerrar sesiones: ' + err.message);
    }
  };

  // Limpiar sesiones expiradas
  const handleCleanExpired = async () => {
    try {
      const res = await fetch('/api/super-admin/sessions?action=clean');
      if (!res.ok) throw new Error('Error al limpiar sesiones');

      const data = await res.json();
      setSuccess(`${data.cleaned} sesión(es) expirada(s) limpiada(s)`);
      loadSessions();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Error al limpiar sesiones: ' + err.message);
    }
  };

  // Eliminar sesiones antiguas
  const handleDeleteOld = async () => {
    try {
      const res = await fetch(`/api/super-admin/sessions?action=delete-old&days=${cleanDays}`);
      if (!res.ok) throw new Error('Error al eliminar sesiones antiguas');

      const data = await res.json();
      setSuccess(`${data.deleted} sesión(es) antigua(s) eliminada(s)`);
      setShowCleanModal(false);
      loadSessions();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Error al eliminar sesiones: ' + err.message);
    }
  };

  // Formatear fecha
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Formatear duración
  const formatDuration = (createdAt) => {
    if (!createdAt) return '-';
    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now - created;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins} min`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} h`;
    return `${Math.floor(diffMins / 1440)} días`;
  };

  // Extraer navegador del user agent
  const getBrowser = (userAgent) => {
    if (!userAgent) return 'Desconocido';
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Otro';
  };

  // Verificar si la sesión está por expirar
  const isExpiringSoon = (expiresAt) => {
    if (!expiresAt) return false;
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires - now;
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours < 24; // Menos de 24 horas
  };

  if (loading && sessions.length === 0) {
    return (
      <Container className="py-4">
        <div className="text-center">
          <div className="spinner-border text-danger" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <div className={styles.header}>
        <h2 className={styles.title}>
          <i className="bi bi-person-check me-2"></i>
          Gestión de Sesiones Activas
        </h2>
        <p className={styles.subtitle}>
          Monitorea y administra las sesiones activas de los usuarios
        </p>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Estadísticas */}
      {stats && (
        <Row className="mb-4">
          <Col md={3}>
            <Card className={styles.statCard}>
              <Card.Body>
                <div className={styles.statIcon}>
                  <i className="bi bi-check-circle-fill text-success"></i>
                </div>
                <div className={styles.statContent}>
                  <div className={styles.statValue}>{stats.activeSessions}</div>
                  <div className={styles.statLabel}>Sesiones Activas</div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className={styles.statCard}>
              <Card.Body>
                <div className={styles.statIcon}>
                  <i className="bi bi-clock-history text-warning"></i>
                </div>
                <div className={styles.statContent}>
                  <div className={styles.statValue}>{stats.expiredSessions}</div>
                  <div className={styles.statLabel}>Sesiones Expiradas</div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className={styles.statCard}>
              <Card.Body>
                <div className={styles.statIcon}>
                  <i className="bi bi-people-fill text-info"></i>
                </div>
                <div className={styles.statContent}>
                  <div className={styles.statValue}>{stats.totalUsers}</div>
                  <div className={styles.statLabel}>Usuarios Conectados</div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className={styles.statCard}>
              <Card.Body>
                <div className={styles.statIcon}>
                  <i className="bi bi-graph-up text-primary"></i>
                </div>
                <div className={styles.statContent}>
                  <div className={styles.statValue}>
                    {stats.topUsers && stats.topUsers.length > 0 
                      ? stats.topUsers[0].user_name 
                      : '-'}
                  </div>
                  <div className={styles.statLabel}>Usuario Más Activo</div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Acciones rápidas */}
      <Card className="mb-4">
        <Card.Body>
          <h5 className="mb-3">
            <i className="bi bi-lightning-fill me-2 text-warning"></i>
            Acciones Rápidas
          </h5>
          <div className="d-flex gap-2 flex-wrap">
            <Button 
              variant="outline-primary" 
              size="sm"
              onClick={loadSessions}
            >
              <i className="bi bi-arrow-clockwise me-1"></i>
              Actualizar
            </Button>
            <Button 
              variant="outline-warning" 
              size="sm"
              onClick={handleCleanExpired}
            >
              <i className="bi bi-trash me-1"></i>
              Limpiar Expiradas
            </Button>
            <Button 
              variant="outline-danger" 
              size="sm"
              onClick={() => setShowCleanModal(true)}
            >
              <i className="bi bi-calendar-x me-1"></i>
              Eliminar Antiguas
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* Tabla de sesiones */}
      <Card>
        <Card.Body>
          <h5 className="mb-3">
            <i className="bi bi-table me-2"></i>
            Sesiones Activas ({sessions.length})
          </h5>
          
          {sessions.length === 0 ? (
            <Alert variant="info">
              No hay sesiones activas en este momento
            </Alert>
          ) : (
            <div className="table-responsive">
              <Table hover className={styles.sessionsTable}>
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>IP</th>
                    <th>Navegador</th>
                    <th>Inicio de Sesión</th>
                    <th>Última Actividad</th>
                    <th>Duración</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => (
                    <tr key={session.id} className={!session.is_active ? styles.inactiveRow : ''}>
                      <td>
                        <strong>{session.user_name}</strong>
                        <br />
                        <small className="text-muted">ID: {session.user_id}</small>
                      </td>
                      <td>
                        <code>{session.ip_address || 'N/A'}</code>
                      </td>
                      <td>
                        <i className={`bi bi-browser-${getBrowser(session.user_agent).toLowerCase()} me-1`}></i>
                        {getBrowser(session.user_agent)}
                      </td>
                      <td>{formatDate(session.created_at)}</td>
                      <td>{formatDate(session.last_activity)}</td>
                      <td>{formatDuration(session.created_at)}</td>
                      <td>
                        {session.is_active ? (
                          <Badge bg={isExpiringSoon(session.expires_at) ? 'warning' : 'success'}>
                            Activa
                          </Badge>
                        ) : (
                          <Badge bg="secondary">Cerrada</Badge>
                        )}
                      </td>
                      <td>
                        {session.is_active && (
                          <div className="d-flex gap-1">
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => {
                                setSelectedSession(session);
                                setShowCloseModal(true);
                              }}
                              title="Cerrar sesión"
                            >
                              <i className="bi bi-x-circle"></i>
                            </Button>
                            <Button
                              variant="outline-warning"
                              size="sm"
                              onClick={() => {
                                setSelectedUserId(session.user_id);
                                setSelectedUserName(session.user_name);
                                setShowCloseUserModal(true);
                              }}
                              title="Cerrar todas las sesiones del usuario"
                            >
                              <i className="bi bi-person-x"></i>
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Modal: Confirmar cerrar sesión */}
      <Modal show={showCloseModal} onHide={() => setShowCloseModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Cerrar Sesión</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedSession && (
            <p>
              ¿Estás seguro de que deseas cerrar la sesión de <strong>{selectedSession.user_name}</strong>?
              <br />
              <small className="text-muted">
                IP: {selectedSession.ip_address} | Navegador: {getBrowser(selectedSession.user_agent)}
              </small>
            </p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCloseModal(false)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleCloseSession}>
            Cerrar Sesión
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal: Confirmar cerrar todas las sesiones del usuario */}
      <Modal show={showCloseUserModal} onHide={() => setShowCloseUserModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Cerrar Todas las Sesiones</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            ¿Estás seguro de que deseas cerrar <strong>TODAS</strong> las sesiones activas de <strong>{selectedUserName}</strong>?
          </p>
          <Alert variant="warning">
            Esta acción cerrará todas las sesiones del usuario en todos los dispositivos.
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCloseUserModal(false)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleCloseUserSessions}>
            Cerrar Todas
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal: Eliminar sesiones antiguas */}
      <Modal show={showCleanModal} onHide={() => setShowCleanModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Eliminar Sesiones Antiguas</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Eliminar sesiones inactivas con más de:</Form.Label>
            <Form.Select 
              value={cleanDays} 
              onChange={(e) => setCleanDays(parseInt(e.target.value))}
            >
              <option value="7">7 días</option>
              <option value="15">15 días</option>
              <option value="30">30 días</option>
              <option value="60">60 días</option>
              <option value="90">90 días</option>
            </Form.Select>
          </Form.Group>
          <Alert variant="info" className="mt-3 mb-0">
            Esta acción eliminará permanentemente las sesiones inactivas de la base de datos.
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCleanModal(false)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleDeleteOld}>
            Eliminar
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
