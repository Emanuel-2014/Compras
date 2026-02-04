'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Card, Button, Form, Table, Alert, Badge, Modal } from 'react-bootstrap';
import styles from './licenses.module.css';

export default function LicensesPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [licenses, setLicenses] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [licenseKey, setLicenseKey] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', variant: 'info' });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/session', { credentials: 'include' });
      if (!response.ok) {
        router.replace('/');
        return;
      }

      const data = await response.json();
      if (!data.user || !data.user.is_super_admin) {
        router.replace('/');
        return;
      }

      setUser(data.user);
      loadLicenses();
    } catch (error) {
      console.error('Error al verificar autenticación:', error);
      router.replace('/');
    }
  };

  const loadLicenses = async () => {
    try {
      const response = await fetch('/api/super-admin/licenses', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setLicenses(data);
      }
    } catch (error) {
      console.error('Error al cargar licencias:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyLicense = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setAlert({ show: false, message: '', variant: 'info' });

    try {
      const response = await fetch('/api/super-admin/licenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ license_key: licenseKey.trim(), notes: notes.trim() })
      });

      const data = await response.json();

      if (response.ok) {
        setAlert({ show: true, message: '✅ ' + data.message, variant: 'success' });
        setLicenseKey('');
        setNotes('');
        setShowAddModal(false);
        loadLicenses();
        
        // Mostrar mensaje de éxito y sugerir reinicio
        setTimeout(() => {
          setAlert({ 
            show: true, 
            message: '⚠️ Licencia aplicada. Se recomienda reiniciar la aplicación para que los cambios tomen efecto.', 
            variant: 'warning' 
          });
        }, 2000);
      } else {
        setAlert({ show: true, message: '❌ ' + data.message, variant: 'danger' });
      }
    } catch (error) {
      console.error('Error al aplicar licencia:', error);
      setAlert({ show: true, message: '❌ Error al aplicar la licencia.', variant: 'danger' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeLicense = async (licenseId) => {
    if (!confirm('¿Estás seguro de que deseas revocar esta licencia?')) {
      return;
    }

    try {
      const response = await fetch(`/api/super-admin/licenses?id=${licenseId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok) {
        setAlert({ show: true, message: '✅ ' + data.message, variant: 'success' });
        loadLicenses();
      } else {
        setAlert({ show: true, message: '❌ ' + data.message, variant: 'danger' });
      }
    } catch (error) {
      console.error('Error al revocar licencia:', error);
      setAlert({ show: true, message: '❌ Error al revocar la licencia.', variant: 'danger' });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status, expiresOn) => {
    const expirationDate = new Date(expiresOn);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (status === 'revoked') {
      return <Badge bg="secondary">REVOCADA</Badge>;
    }

    if (expirationDate < today) {
      return <Badge bg="danger">EXPIRADA</Badge>;
    }

    return <Badge bg="success">ACTIVA</Badge>;
  };

  if (loading) {
    return (
      <Container className="mt-5">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className={styles.container}>
      <div className="py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1 className="h2 mb-1">🔑 Gestión de Licencias</h1>
            <p className="text-muted">Administra y aplica las licencias del sistema</p>
          </div>
          <Button 
            variant="outline-primary" 
            onClick={() => setShowAddModal(true)}
          >
            APLICAR NUEVA LICENCIA
          </Button>
        </div>

        {alert.show && (
          <Alert 
            variant={alert.variant} 
            dismissible 
            onClose={() => setAlert({ ...alert, show: false })}
            className="mb-4"
          >
            {alert.message}
          </Alert>
        )}

        <Card className="shadow-sm">
          <Card.Header style={{ background: 'linear-gradient(135deg, #DC143C 0%, #1a1a1a 100%)', color: 'white' }}>
            <h5 className="mb-0">📋 Historial de Licencias Aplicadas</h5>
          </Card.Header>
          <Card.Body>
            {licenses.length === 0 ? (
              <div className="text-center py-5">
                <p className="text-muted mb-0">No hay licencias registradas</p>
              </div>
            ) : (
              <div className="table-responsive">
                <Table striped hover className="mb-0">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Fecha de Aplicación</th>
                      <th>Fecha de Expiración</th>
                      <th>Estado</th>
                      <th>Aplicada Por</th>
                      <th>Notas</th>
                      <th>Clave de Licencia</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {licenses.map((license) => (
                      <tr key={license.id}>
                        <td>{license.id}</td>
                        <td>{formatDate(license.applied_date)}</td>
                        <td>{formatDate(license.expires_on)}</td>
                        <td>{getStatusBadge(license.status, license.expires_on)}</td>
                        <td>{license.applied_by_user_name || 'N/A'}</td>
                        <td>{license.notes || '-'}</td>
                        <td>
                          <code className={styles.licenseKey}>
                            {license.license_key.substring(0, 30)}...
                          </code>
                        </td>
                        <td>
                          {license.status === 'active' && (
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleRevokeLicense(license.id)}
                            >
                              Revocar
                            </Button>
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
      </div>

      {/* Modal para aplicar nueva licencia */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>🔑 Aplicar Nueva Licencia</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleApplyLicense}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Clave de Licencia *</Form.Label>
              <Form.Control
                as="textarea"
                rows={5}
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                placeholder="Pega aquí la clave de licencia completa..."
                required
                disabled={submitting}
              />
              <Form.Text className="text-muted">
                Debe ser una licencia válida generada con el sistema de licencias.
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Notas (Opcional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Agrega notas sobre esta licencia (ej: cliente, propósito, etc.)"
                disabled={submitting}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button 
              variant="outline-secondary" 
              onClick={() => setShowAddModal(false)}
              disabled={submitting}
            >
              CANCELAR
            </Button>
            <Button 
              variant="outline-primary" 
              type="submit"
              disabled={submitting}
            >
              {submitting ? 'APLICANDO...' : 'APLICAR LICENCIA'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
}
