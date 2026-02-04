'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Table, Badge, Alert, Modal, Tabs, Tab } from 'react-bootstrap';
import styles from './security.module.css';

export default function SecurityConfiguration() {
  const [config, setConfig] = useState({});
  const [stats, setStats] = useState(null);
  const [ipList, setIpList] = useState([]);
  const [recentAttempts, setRecentAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Modal para agregar IP
  const [showIpModal, setShowIpModal] = useState(false);
  const [newIp, setNewIp] = useState({ ipAddress: '', type: 'blacklist', reason: '', expiresAt: '' });

  // Cargar datos
  const loadData = async () => {
    try {
      setLoading(true);
      const [configRes, statsRes, ipRes, attemptsRes] = await Promise.all([
        fetch('/api/super-admin/security?action=config'),
        fetch('/api/super-admin/security?action=failed-login-stats'),
        fetch('/api/super-admin/security?action=ip-list'),
        fetch('/api/super-admin/security?action=recent-failed-attempts&limit=50')
      ]);

      if (!configRes.ok || !statsRes.ok || !ipRes.ok || !attemptsRes.ok) {
        throw new Error('Error al cargar datos');
      }

      const configData = await configRes.json();
      const statsData = await statsRes.json();
      const ipData = await ipRes.json();
      const attemptsData = await attemptsRes.json();

      setConfig(configData.config || {});
      setStats(statsData);
      setIpList(ipData.ipList || []);
      setRecentAttempts(attemptsData.attempts || []);
      setError('');
    } catch (err) {
      setError('Error al cargar la configuración: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Guardar configuración
  const handleSaveConfig = async () => {
    try {
      setSaving(true);
      
      // Convertir objeto de config a formato simple para enviar
      const configToSend = {};
      Object.keys(config).forEach(key => {
        configToSend[key] = config[key].value;
      });
      
      const res = await fetch('/api/super-admin/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-config',
          config: configToSend
        })
      });

      if (!res.ok) throw new Error('Error al guardar configuración');

      const data = await res.json();
      setSuccess('Configuración guardada correctamente');
      setTimeout(() => setSuccess(''), 3000);
      loadData();
    } catch (err) {
      setError('Error al guardar la configuración: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Actualizar valor de configuración local
  const updateConfigValue = (key, value) => {
    setConfig(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        value: value
      }
    }));
  };

  // Agregar IP
  const handleAddIp = async () => {
    try {
      if (!newIp.ipAddress) {
        setError('La dirección IP es requerida');
        return;
      }

      const res = await fetch('/api/super-admin/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add-ip',
          ...newIp
        })
      });

      if (!res.ok) throw new Error('Error al agregar IP');

      const data = await res.json();
      if (data.success) {
        setSuccess(`IP agregada a ${newIp.type === 'whitelist' ? 'lista blanca' : 'lista negra'}`);
        setShowIpModal(false);
        setNewIp({ ipAddress: '', type: 'blacklist', reason: '', expiresAt: '' });
        loadData();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Error al agregar IP');
      }
    } catch (err) {
      setError('Error al agregar IP: ' + err.message);
    }
  };

  // Eliminar IP
  const handleDeleteIp = async (id) => {
    if (!confirm('¿Estás seguro de eliminar esta IP?')) return;

    try {
      const res = await fetch(`/api/super-admin/security?id=${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Error al eliminar IP');

      const data = await res.json();
      setSuccess('IP eliminada correctamente');
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Error al eliminar IP: ' + err.message);
    }
  };

  // Toggle IP activa/inactiva
  const handleToggleIp = async (id, currentState) => {
    try {
      const res = await fetch('/api/super-admin/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle-ip',
          id,
          isActive: !currentState
        })
      });

      if (!res.ok) throw new Error('Error al cambiar estado');

      setSuccess('Estado actualizado');
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Error al cambiar estado: ' + err.message);
    }
  };

  // Limpiar intentos antiguos
  const handleCleanOldAttempts = async () => {
    if (!confirm('¿Eliminar intentos de login con más de 30 días?')) return;

    try {
      const res = await fetch('/api/super-admin/security?action=clean-old-attempts&days=30');
      if (!res.ok) throw new Error('Error al limpiar');

      const data = await res.json();
      setSuccess(`${data.deleted} registros eliminados`);
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Error al limpiar: ' + err.message);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && Object.keys(config).length === 0) {
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
          <i className="bi bi-shield-lock me-2"></i>
          Configuración de Seguridad
        </h2>
        <p className={styles.subtitle}>
          Gestiona políticas de contraseñas, control de acceso y seguridad del sistema
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

      <Tabs defaultActiveKey="password" className="mb-4">
        {/* TAB: Políticas de Contraseña */}
        <Tab eventKey="password" title={<span><i className="bi bi-key me-2"></i>Contraseñas</span>}>
          <Card>
            <Card.Body>
              <h5 className="mb-4">Políticas de Contraseña</h5>
              
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Longitud Mínima</Form.Label>
                    <Form.Control
                      type="number"
                      min="4"
                      max="128"
                      value={config.password_min_length?.value || '8'}
                      onChange={(e) => updateConfigValue('password_min_length', e.target.value)}
                    />
                    <Form.Text className="text-muted">
                      {config.password_min_length?.description}
                    </Form.Text>
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Expiración de Contraseña (días)</Form.Label>
                    <Form.Control
                      type="number"
                      min="0"
                      value={config.password_expiration_days?.value || '0'}
                      onChange={(e) => updateConfigValue('password_expiration_days', e.target.value)}
                    />
                    <Form.Text className="text-muted">
                      0 = sin expiración
                    </Form.Text>
                  </Form.Group>
                </Col>
              </Row>

              <h6 className="mt-3 mb-3">Requisitos de Complejidad</h6>
              
              <Form.Check
                type="switch"
                id="require-uppercase"
                label="Requerir al menos una letra mayúscula"
                checked={config.password_require_uppercase?.value === 'true'}
                onChange={(e) => updateConfigValue('password_require_uppercase', e.target.checked ? 'true' : 'false')}
                className="mb-2"
              />

              <Form.Check
                type="switch"
                id="require-lowercase"
                label="Requerir al menos una letra minúscula"
                checked={config.password_require_lowercase?.value === 'true'}
                onChange={(e) => updateConfigValue('password_require_lowercase', e.target.checked ? 'true' : 'false')}
                className="mb-2"
              />

              <Form.Check
                type="switch"
                id="require-numbers"
                label="Requerir al menos un número"
                checked={config.password_require_numbers?.value === 'true'}
                onChange={(e) => updateConfigValue('password_require_numbers', e.target.checked ? 'true' : 'false')}
                className="mb-2"
              />

              <Form.Check
                type="switch"
                id="require-special"
                label="Requerir al menos un caracter especial"
                checked={config.password_require_special?.value === 'true'}
                onChange={(e) => updateConfigValue('password_require_special', e.target.checked ? 'true' : 'false')}
                className="mb-2"
              />

              <Form.Check
                type="switch"
                id="force-change-first-login"
                label="Forzar cambio de contraseña en primer login"
                checked={config.force_password_change_first_login?.value === 'true'}
                onChange={(e) => updateConfigValue('force_password_change_first_login', e.target.checked ? 'true' : 'false')}
                className="mb-2"
              />

              <Button variant="danger" onClick={handleSaveConfig} disabled={saving} className="mt-4">
                {saving ? 'Guardando...' : 'Guardar Configuración'}
              </Button>
            </Card.Body>
          </Card>
        </Tab>

        {/* TAB: Sesiones y Acceso */}
        <Tab eventKey="sessions" title={<span><i className="bi bi-clock-history me-2"></i>Sesiones</span>}>
          <Card>
            <Card.Body>
              <h5 className="mb-4">Control de Sesiones</h5>
              
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Timeout de Sesión (minutos)</Form.Label>
                    <Form.Control
                      type="number"
                      min="5"
                      max="1440"
                      value={config.session_timeout_minutes?.value || '60'}
                      onChange={(e) => updateConfigValue('session_timeout_minutes', e.target.value)}
                    />
                    <Form.Text className="text-muted">
                      Tiempo de inactividad antes de cerrar sesión automáticamente
                    </Form.Text>
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Máximo Intentos de Login</Form.Label>
                    <Form.Control
                      type="number"
                      min="3"
                      max="20"
                      value={config.max_login_attempts?.value || '5'}
                      onChange={(e) => updateConfigValue('max_login_attempts', e.target.value)}
                    />
                    <Form.Text className="text-muted">
                      Intentos fallidos antes de bloqueo temporal
                    </Form.Text>
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Duración del Bloqueo (minutos)</Form.Label>
                    <Form.Control
                      type="number"
                      min="5"
                      max="1440"
                      value={config.lockout_duration_minutes?.value || '30'}
                      onChange={(e) => updateConfigValue('lockout_duration_minutes', e.target.value)}
                    />
                    <Form.Text className="text-muted">
                      Tiempo de bloqueo tras exceder intentos
                    </Form.Text>
                  </Form.Group>
                </Col>
              </Row>

              <Button variant="danger" onClick={handleSaveConfig} disabled={saving} className="mt-3">
                {saving ? 'Guardando...' : 'Guardar Configuración'}
              </Button>
            </Card.Body>
          </Card>

          {/* Estadísticas de intentos fallidos */}
          {stats && (
            <Card className="mt-4">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="mb-0">Intentos de Login Fallidos</h5>
                  <Button variant="outline-danger" size="sm" onClick={handleCleanOldAttempts}>
                    <i className="bi bi-trash me-1"></i>
                    Limpiar Antiguos
                  </Button>
                </div>
                
                <Row>
                  <Col md={6}>
                    <div className={styles.statBox}>
                      <div className={styles.statValue}>{stats.last24h}</div>
                      <div className={styles.statLabel}>Últimas 24 horas</div>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className={styles.statBox}>
                      <div className={styles.statValue}>{stats.last7days}</div>
                      <div className={styles.statLabel}>Últimos 7 días</div>
                    </div>
                  </Col>
                </Row>

                {recentAttempts.length > 0 && (
                  <div className="mt-4">
                    <h6>Intentos Recientes</h6>
                    <div className="table-responsive" style={{ maxHeight: '300px', overflow: 'auto' }}>
                      <Table size="sm" hover>
                        <thead>
                          <tr>
                            <th>Fecha</th>
                            <th>Usuario</th>
                            <th>IP</th>
                            <th>Razón</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentAttempts.map((attempt) => (
                            <tr key={attempt.id}>
                              <td>{formatDate(attempt.attempted_at)}</td>
                              <td><code>{attempt.username}</code></td>
                              <td><code>{attempt.ip_address}</code></td>
                              <td><small className="text-muted">{attempt.failure_reason}</small></td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  </div>
                )}
              </Card.Body>
            </Card>
          )}
        </Tab>

        {/* TAB: Control de IPs */}
        <Tab eventKey="ip" title={<span><i className="bi bi-hdd-network me-2"></i>Control de IPs</span>}>
          <Card>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="mb-0">Control de Acceso por IP</h5>
                <Button variant="danger" size="sm" onClick={() => setShowIpModal(true)}>
                  <i className="bi bi-plus-circle me-1"></i>
                  Agregar IP
                </Button>
              </div>

              <Row className="mb-4">
                <Col md={6}>
                  <Form.Check
                    type="switch"
                    id="enable-whitelist"
                    label="Activar Lista Blanca (solo IPs permitidas pueden acceder)"
                    checked={config.enable_ip_whitelist?.value === 'true'}
                    onChange={(e) => updateConfigValue('enable_ip_whitelist', e.target.checked ? 'true' : 'false')}
                  />
                </Col>
                <Col md={6}>
                  <Form.Check
                    type="switch"
                    id="enable-blacklist"
                    label="Activar Lista Negra (IPs bloqueadas no pueden acceder)"
                    checked={config.enable_ip_blacklist?.value === 'true'}
                    onChange={(e) => updateConfigValue('enable_ip_blacklist', e.target.checked ? 'true' : 'false')}
                  />
                </Col>
              </Row>

              <Button variant="danger" onClick={handleSaveConfig} disabled={saving} className="mb-4">
                {saving ? 'Guardando...' : 'Guardar Configuración'}
              </Button>

              <div className="table-responsive">
                <Table hover>
                  <thead>
                    <tr>
                      <th>IP</th>
                      <th>Tipo</th>
                      <th>Razón</th>
                      <th>Fecha</th>
                      <th>Expira</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ipList.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center text-muted">
                          No hay IPs registradas
                        </td>
                      </tr>
                    ) : (
                      ipList.map((ip) => (
                        <tr key={ip.id}>
                          <td><code>{ip.ip_address}</code></td>
                          <td>
                            <Badge bg={ip.type === 'whitelist' ? 'success' : 'danger'}>
                              {ip.type === 'whitelist' ? 'Lista Blanca' : 'Lista Negra'}
                            </Badge>
                          </td>
                          <td><small>{ip.reason || '-'}</small></td>
                          <td><small>{formatDate(ip.created_at)}</small></td>
                          <td><small>{formatDate(ip.expires_at)}</small></td>
                          <td>
                            <Badge bg={ip.is_active ? 'success' : 'secondary'}>
                              {ip.is_active ? 'Activa' : 'Inactiva'}
                            </Badge>
                          </td>
                          <td>
                            <Button
                              variant="outline-warning"
                              size="sm"
                              className="me-1"
                              onClick={() => handleToggleIp(ip.id, ip.is_active)}
                              title={ip.is_active ? 'Desactivar' : 'Activar'}
                            >
                              <i className={`bi bi-${ip.is_active ? 'pause' : 'play'}-circle`}></i>
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDeleteIp(ip.id)}
                              title="Eliminar"
                            >
                              <i className="bi bi-trash"></i>
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </Tab>

        {/* TAB: Opciones Avanzadas */}
        <Tab eventKey="advanced" title={<span><i className="bi bi-gear me-2"></i>Avanzado</span>}>
          <Card>
            <Card.Body>
              <h5 className="mb-4">Opciones Avanzadas</h5>
              
              <Form.Check
                type="switch"
                id="enable-2fa"
                label="Activar Autenticación de Dos Factores (2FA)"
                checked={config.enable_two_factor?.value === 'true'}
                onChange={(e) => updateConfigValue('enable_two_factor', e.target.checked ? 'true' : 'false')}
                className="mb-3"
              />

              <Form.Group className="mb-3">
                <Form.Label>Historial de Contraseñas</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  max="24"
                  value={config.password_history_count?.value || '0'}
                  onChange={(e) => updateConfigValue('password_history_count', e.target.value)}
                />
                <Form.Text className="text-muted">
                  Número de contraseñas anteriores que no se pueden reutilizar (0 = sin límite)
                </Form.Text>
              </Form.Group>

              <Button variant="danger" onClick={handleSaveConfig} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar Configuración'}
              </Button>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

      {/* Modal para agregar IP */}
      <Modal show={showIpModal} onHide={() => setShowIpModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Agregar IP al Control de Acceso</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Dirección IP *</Form.Label>
            <Form.Control
              type="text"
              placeholder="192.168.1.100"
              value={newIp.ipAddress}
              onChange={(e) => setNewIp({ ...newIp, ipAddress: e.target.value })}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Tipo *</Form.Label>
            <Form.Select
              value={newIp.type}
              onChange={(e) => setNewIp({ ...newIp, type: e.target.value })}
            >
              <option value="whitelist">Lista Blanca (Permitir)</option>
              <option value="blacklist">Lista Negra (Bloquear)</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Razón</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              placeholder="Motivo del bloqueo o autorización..."
              value={newIp.reason}
              onChange={(e) => setNewIp({ ...newIp, reason: e.target.value })}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Fecha de Expiración (opcional)</Form.Label>
            <Form.Control
              type="datetime-local"
              value={newIp.expiresAt}
              onChange={(e) => setNewIp({ ...newIp, expiresAt: e.target.value })}
            />
            <Form.Text className="text-muted">
              Dejar vacío para que sea permanente
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowIpModal(false)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleAddIp}>
            Agregar IP
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
