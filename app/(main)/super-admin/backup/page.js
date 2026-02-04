'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Row, Col, Card, Table, Button, Modal, Form, Badge, Spinner, Alert, ProgressBar } from 'react-bootstrap';
import styles from './backup.module.css';

export default function BackupPage() {
  const router = useRouter();
  const [backups, setBackups] = useState([]);
  const [dbInfo, setDbInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [description, setDescription] = useState('');
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });

  useEffect(() => {
    checkAuth();
    loadData();
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

  async function loadData() {
    try {
      setLoading(true);
      const [backupsRes, infoRes] = await Promise.all([
        fetch('/api/super-admin/backup'),
        fetch('/api/super-admin/backup?action=info')
      ]);

      if (backupsRes.ok) {
        const data = await backupsRes.json();
        setBackups(data.backups || []);
      }

      if (infoRes.ok) {
        const info = await infoRes.json();
        setDbInfo(info);
      }
    } catch (err) {
      console.error('Error al cargar datos:', err);
      showAlert('danger', 'Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  }

  function showAlert(type, message) {
    setAlert({ show: true, type, message });
    setTimeout(() => setAlert({ show: false, type: '', message: '' }), 5000);
  }

  async function handleCreateBackup() {
    try {
      setCreating(true);
      const res = await fetch('/api/super-admin/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description })
      });

      const data = await res.json();

      if (data.success) {
        showAlert('success', '✅ Backup creado exitosamente');
        setShowCreateModal(false);
        setDescription('');
        loadData();
      } else {
        showAlert('danger', data.error || 'Error al crear el backup');
      }
    } catch (err) {
      console.error('Error al crear backup:', err);
      showAlert('danger', 'Error al crear el backup');
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteBackup(filename) {
    if (!confirm(`¿Estás seguro de eliminar el backup "${filename}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/super-admin/backup?filename=${filename}`, {
        method: 'DELETE'
      });

      const data = await res.json();

      if (data.success) {
        showAlert('success', '✅ Backup eliminado correctamente');
        loadData();
      } else {
        showAlert('danger', data.error || 'Error al eliminar el backup');
      }
    } catch (err) {
      console.error('Error al eliminar backup:', err);
      showAlert('danger', 'Error al eliminar el backup');
    }
  }

  async function handleDownloadBackup(filename) {
    try {
      const res = await fetch(`/api/super-admin/backup?action=download&filename=${filename}`);
      
      if (!res.ok) {
        showAlert('danger', 'Error al descargar el backup');
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      showAlert('success', '✅ Backup descargado correctamente');
    } catch (err) {
      console.error('Error al descargar backup:', err);
      showAlert('danger', 'Error al descargar el backup');
    }
  }

  async function handleRestoreBackup() {
    try {
      setCreating(true);
      const res = await fetch('/api/super-admin/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'restore', 
          filename: selectedBackup.filename 
        })
      });

      const data = await res.json();

      if (data.success) {
        showAlert('warning', '⚠️ Base de datos restaurada. El servidor se reiniciará automáticamente en 5 segundos...');
        setShowRestoreModal(false);
        setTimeout(() => {
          window.location.href = '/super-admin/backup';
        }, 5000);
      } else {
        showAlert('danger', data.error || 'Error al restaurar el backup');
      }
    } catch (err) {
      console.error('Error al restaurar backup:', err);
      showAlert('danger', 'Error al restaurar el backup');
    } finally {
      setCreating(false);
    }
  }

  async function handleCleanOldBackups() {
    if (!confirm('¿Eliminar todos los backups con más de 30 días de antigüedad?')) {
      return;
    }

    try {
      const res = await fetch('/api/super-admin/backup?action=clean&days=30');
      const data = await res.json();

      if (data.success) {
        showAlert('success', `✅ ${data.message}`);
        loadData();
      } else {
        showAlert('danger', data.error || 'Error al limpiar backups antiguos');
      }
    } catch (err) {
      console.error('Error al limpiar backups:', err);
      showAlert('danger', 'Error al limpiar backups antiguos');
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
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getTimeAgo(created) {
    const now = Date.now();
    const diff = now - new Date(created).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `hace ${days} día${days > 1 ? 's' : ''}`;
    if (hours > 0) return `hace ${hours} hora${hours > 1 ? 's' : ''}`;
    return 'hace menos de 1 hora';
  }

  return (
    <Container fluid className="py-4">
      {alert.show && (
        <Alert variant={alert.type} onClose={() => setAlert({ show: false })} dismissible>
          {alert.message}
        </Alert>
      )}

      <Row className="mb-4">
        <Col>
          <div className={styles.header}>
            <h2>💾 BACKUP Y RESTAURACIÓN</h2>
            <Button variant="outline-secondary" onClick={() => router.push('/super-admin')}>
              ← VOLVER AL PANEL
            </Button>
          </div>
        </Col>
      </Row>

      {/* Información de la BD */}
      {dbInfo && (
        <Row className="mb-4">
          <Col md={3}>
            <Card className={styles.statCard}>
              <Card.Body>
                <div className={styles.statTitle}>Tamaño de la BD</div>
                <div className={styles.statValue}>{formatBytes(dbInfo.size)}</div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className={styles.statCard}>
              <Card.Body>
                <div className={styles.statTitle}>Total de Tablas</div>
                <div className={styles.statValue}>{dbInfo.tables}</div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className={styles.statCard}>
              <Card.Body>
                <div className={styles.statTitle}>Backups Disponibles</div>
                <div className={styles.statValue}>{backups.length}</div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className={styles.statCard}>
              <Card.Body>
                <div className={styles.statTitle}>Última Modificación</div>
                <div className={styles.statValue} style={{ fontSize: '1.2rem' }}>
                  {getTimeAgo(dbInfo.modified)}
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Acciones rápidas */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Body>
              <h5 className="mb-3">⚡ ACCIONES RÁPIDAS</h5>
              <div className="d-flex gap-2 flex-wrap">
                <Button 
                  variant="outline-primary" 
                  onClick={() => setShowCreateModal(true)}
                  disabled={creating}
                >
                  ➕ CREAR BACKUP AHORA
                </Button>
                <Button 
                  variant="outline-warning" 
                  onClick={handleCleanOldBackups}
                >
                  🧹 LIMPIAR BACKUPS ANTIGUOS
                </Button>
                <Button 
                  variant="outline-info" 
                  onClick={loadData}
                >
                  🔄 ACTUALIZAR LISTA
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Lista de backups */}
      <Card>
        <Card.Body>
          <h5 className="mb-3">📦 LISTA DE BACKUPS</h5>
          
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3">Cargando backups...</p>
            </div>
          ) : backups.length === 0 ? (
            <Alert variant="info">
              No hay backups disponibles. Crea uno usando el botón "Crear Backup Ahora".
            </Alert>
          ) : (
            <div className={styles.tableWrapper}>
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th>Archivo</th>
                    <th>Fecha de Creación</th>
                    <th>Antigüedad</th>
                    <th>Tamaño</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map(backup => (
                    <tr key={backup.filename}>
                      <td>
                        <strong>{backup.filename}</strong>
                      </td>
                      <td className={styles.dateCell}>
                        {formatDate(backup.created)}
                      </td>
                      <td>
                        <Badge bg={backup.age < 86400000 ? 'success' : backup.age < 604800000 ? 'info' : 'secondary'}>
                          {getTimeAgo(backup.created)}
                        </Badge>
                      </td>
                      <td>{formatBytes(backup.size)}</td>
                      <td>
                        <div className="d-flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline-success"
                            onClick={() => handleDownloadBackup(backup.filename)}
                          >
                            ⬇️ Descargar
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline-warning"
                            onClick={() => {
                              setSelectedBackup(backup);
                              setShowRestoreModal(true);
                            }}
                          >
                            ♻️ Restaurar
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline-danger"
                            onClick={() => handleDeleteBackup(backup.filename)}
                          >
                            🗑️ Eliminar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Modal crear backup */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>➕ Crear Nuevo Backup</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Descripción (opcional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej: Backup antes de actualización..."
              />
            </Form.Group>
          </Form>
          <Alert variant="info" className="mb-0">
            <small>
              ℹ️ El backup incluirá toda la base de datos actual. Se creará automáticamente con un nombre único basado en la fecha y hora.
            </small>
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
            CANCELAR
          </Button>
          <Button 
            variant="primary" 
            onClick={handleCreateBackup}
            disabled={creating}
          >
            {creating ? <Spinner animation="border" size="sm" /> : 'CREAR BACKUP'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal restaurar backup */}
      <Modal show={showRestoreModal} onHide={() => setShowRestoreModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>⚠️ Restaurar Backup</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="danger">
            <strong>¡ADVERTENCIA!</strong> Esta acción reemplazará completamente la base de datos actual con el backup seleccionado.
          </Alert>
          {selectedBackup && (
            <div>
              <p><strong>Archivo:</strong> {selectedBackup.filename}</p>
              <p><strong>Fecha:</strong> {formatDate(selectedBackup.created)}</p>
              <p><strong>Tamaño:</strong> {formatBytes(selectedBackup.size)}</p>
            </div>
          )}
          <Alert variant="info" className="mb-0">
            <small>
              ℹ️ Se creará automáticamente un backup de seguridad de la base de datos actual antes de restaurar. El servidor se reiniciará automáticamente.
            </small>
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRestoreModal(false)}>
            CANCELAR
          </Button>
          <Button 
            variant="danger" 
            onClick={handleRestoreBackup}
            disabled={creating}
          >
            {creating ? <Spinner animation="border" size="sm" /> : 'SÍ, RESTAURAR'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
