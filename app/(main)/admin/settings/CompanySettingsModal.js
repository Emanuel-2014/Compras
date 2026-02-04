'use client';

import { useState, useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap';

const companySettings = [
  {
    key: 'company_name',
    label: 'Nombre de la Empresa',
    description: 'Nombre completo de la empresa.',
    type: 'text',
    defaultValue: 'Pollos al Día S.A.S.',
  },
  {
    key: 'company_nit',
    label: 'NIT de la Empresa',
    description: 'Número de Identificación Tributaria de la empresa.',
    type: 'text',
    defaultValue: '',
  },
  {
    key: 'company_address',
    label: 'Dirección de la Empresa',
    description: 'Dirección física de la empresa.',
    type: 'text',
    defaultValue: 'Calle 123 # 45-67, Bogotá D.C.',
  },
  {
    key: 'company_phone',
    label: 'Teléfono de la Empresa',
    description: 'Número de teléfono de contacto de la empresa.',
    type: 'text',
    defaultValue: '+57 1 234 5678',
  },
  {
    key: 'company_email',
    label: 'Email de la Empresa',
    description: 'Correo electrónico de contacto de la empresa.',
    type: 'text',
    defaultValue: 'info@pollosaldia.com',
  },
];

export default function CompanySettingsModal({ show, onHide, currentSettings, onSave }) {
  const [data, setData] = useState({});
  const [logoFile, setLogoFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (show && currentSettings) {
      // Inicializar datos con los valores actuales
      const initialData = {};
      companySettings.forEach(config => {
        initialData[config.key] = currentSettings[config.key] || config.defaultValue;
      });
      setData(initialData);
    }
  }, [show, currentSettings]);

  const handleChange = (key, value) => {
    setData(prev => ({ ...prev, [key]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setLogoFile(e.target.files[0]);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage('');

    try {
      const formData = new FormData();

      // Agregar los datos de texto
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, value);
      });

      // Agregar el logo si hay uno nuevo
      if (logoFile) {
        formData.append('company_logo', logoFile);
      }

      const response = await fetch('/api/settings', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al guardar la configuración de la empresa.');
      }

      const result = await response.json();
      setSuccessMessage(result.message);

      // Recargar los datos actualizados desde el servidor antes de notificar
      const updatedResponse = await fetch('/api/settings');
      const updatedData = await updatedResponse.json();

      // Notificar al componente padre con los datos actualizados completos
      if (onSave) {
        onSave(updatedData);
      }

      // Cerrar modal después de 1 segundo
      setTimeout(() => {
        onHide();
      }, 1000);

    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
        <Modal.Title style={{ color: '#212529', fontWeight: 'bold' }}>Configuración de Empresa</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ backgroundColor: '#ffffff', padding: '1.5rem' }}>
        {error && <div className="alert alert-danger">{error}</div>}
        {successMessage && <div className="alert alert-success">{successMessage}</div>}

        <div className="alert alert-info" style={{ marginBottom: '1.5rem' }}>
          <strong>Información de la empresa:</strong> Esta información aparecerá en reportes y documentos exportados.
        </div>

        {companySettings.map(config => (
          <div
            key={config.key}
            style={{
              marginBottom: '1.5rem',
              padding: '1rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              border: '1px solid #dee2e6',
            }}
          >
            <label
              htmlFor={config.key}
              style={{
                fontWeight: '600',
                color: '#212529',
                fontSize: '1rem',
                marginBottom: '0.5rem',
                display: 'block',
              }}
            >
              {config.label}
            </label>
            <p style={{
              fontSize: '0.85rem',
              color: '#6c757d',
              marginBottom: '0.75rem',
            }}>
              {config.description}
            </p>
            <input
              type="text"
              id={config.key}
              value={data[config.key] || ''}
              onChange={(e) => handleChange(config.key, e.target.value)}
              className="form-control"
              style={{
                fontSize: '0.95rem',
                padding: '0.75rem',
                border: '1px solid #ced4da',
                borderRadius: '6px',
              }}
            />
          </div>
        ))}

        {/* Logo Upload Section */}
        <div
          style={{
            marginBottom: '1rem',
            padding: '1rem',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #dee2e6',
          }}
        >
          <label
            style={{
              fontWeight: '600',
              color: '#212529',
              fontSize: '1rem',
              marginBottom: '0.5rem',
              display: 'block',
            }}
          >
            Logo de la Empresa
          </label>
          <p style={{
            fontSize: '0.85rem',
            color: '#6c757d',
            marginBottom: '0.75rem',
          }}>
            Ruta del logo actual de la empresa. Sube un nuevo archivo para cambiarlo.
          </p>

          {currentSettings?.company_logo_path && (
            <div style={{ marginBottom: '1rem' }}>
              <img
                src={currentSettings.company_logo_path}
                alt="Logo actual"
                style={{
                  maxWidth: '200px',
                  maxHeight: '100px',
                  border: '2px solid #dee2e6',
                  padding: '0.5rem',
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                }}
              />
            </div>
          )}

          <input
            type="file"
            onChange={handleFileChange}
            accept="image/png, image/jpeg, image/gif"
            className="form-control"
            style={{
              fontSize: '0.95rem',
              padding: '0.5rem',
              border: '1px solid #ced4da',
              borderRadius: '6px',
            }}
          />
        </div>
      </Modal.Body>
      <Modal.Footer style={{ backgroundColor: '#f8f9fa', borderTop: '2px solid #dee2e6', padding: '1rem' }}>
        <Button variant="outline-secondary" onClick={onHide} disabled={isSaving} size="lg">
          Cancelar
        </Button>
        <Button variant="outline-success" onClick={handleSave} disabled={isSaving} size="lg">
          {isSaving ? 'Guardando...' : 'Actualizar'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
