// app/(main)/settings/page.js
"use client";

import { useState, useEffect } from 'react';
import { Form, Button, Container, Row, Col, Alert } from 'react-bootstrap';
import Swal from 'sweetalert2';

export default function SettingsPage() {
  const [settings, setSettings] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      } else {
        throw new Error('No se pudo cargar la configuración.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSettingChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        Swal.fire('¡Guardado!', 'La configuración ha sido actualizada.', 'success');
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al guardar la configuración.');
      }
    } catch (err) {
      setError(err.message);
      Swal.fire('Error', err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container className="mt-4">
      <h1>Configuración de la Aplicación</h1>
      {error && <Alert variant="danger">{error}</Alert>}
      <Form onSubmit={handleSubmit}>
        <Row>
          <Col md={6}>
            <h2>Validación de Duplicados</h2>
            <Form.Group controlId="formEnableDuplicateCheck" className="mb-3">
              <Form.Check
                type="switch"
                label="Habilitar Validación de Duplicados"
                name="enable_duplicate_check"
                checked={settings.enable_duplicate_check || false}
                onChange={handleSettingChange}
              />
            </Form.Group>
            <Form.Group controlId="formGracePeriodEndDate" className="mb-3">
              <Form.Label>Fecha Fin Periodo de Gracia</Form.Label>
              <Form.Control
                type="date"
                name="duplicate_check_grace_period_end_date"
                value={settings.duplicate_check_grace_period_end_date || ''}
                onChange={handleSettingChange}
                disabled={!settings.enable_duplicate_check}
              />
              <Form.Text className="text-muted">
                Hasta esta fecha, la validación de duplicados solo advertirá. Después, bloqueará la solicitud.
              </Form.Text>
            </Form.Group>
            <Form.Group controlId="formDuplicateCheckDays" className="mb-3">
              <Form.Label>Período de Días para Validación de Duplicados</Form.Label>
              <Form.Control
                type="number"
                name="duplicate_check_days"
                value={settings.duplicate_check_days || '7'}
                onChange={handleSettingChange}
                disabled={!settings.enable_duplicate_check}
                min="1"
              />
              <Form.Text className="text-muted">
                Número de días hacia atrás para comprobar si un ítem es duplicado. Por defecto: 7.
              </Form.Text>
            </Form.Group>
          </Col>
        </Row>

        <Button variant="primary" type="submit" disabled={isLoading}>
          {isLoading ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </Form>
    </Container>
  );
}
