'use client';

import { useState, useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap';

const colorSettings = [
  {
    key: 'primary_color',
    label: 'Color Primario',
    description: 'Color principal de botones, enlaces y elementos destacados.',
    defaultValue: '#0056b3',
  },
  {
    key: 'sidebar_background_color',
    label: 'Color de Fondo de Barra Lateral',
    description: 'Color de fondo de la barra de navegación lateral.',
    defaultValue: '#1a1a1a',
  },
  {
    key: 'sidebar_text_color',
    label: 'Color de Texto de Barra Lateral',
    description: 'Color del texto y los iconos en la barra lateral.',
    defaultValue: '#ffffff',
  },
  {
    key: 'accent_color',
    label: 'Color de Acento',
    description: 'Color para elementos hover, bordes activos y estados seleccionados.',
    defaultValue: '#007bff',
  },
  {
    key: 'card_background_color',
    label: 'Color de Fondo de Tarjetas',
    description: 'Color de fondo de las tarjetas y paneles del contenido principal.',
    defaultValue: '#ffffff',
  },
  {
    key: 'success_color',
    label: 'Color de Éxito',
    description: 'Color para mensajes y estados de éxito.',
    defaultValue: '#28a745',
  },
  {
    key: 'danger_color',
    label: 'Color de Peligro/Error',
    description: 'Color para mensajes y estados de error o peligro.',
    defaultValue: '#dc3545',
  },
];

export default function ColorSettingsModal({ show, onHide, currentSettings, onSave }) {
  const [colors, setColors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (show && currentSettings) {
      // Inicializar colores con los valores actuales
      const initialColors = {};
      colorSettings.forEach(config => {
        initialColors[config.key] = currentSettings[config.key] || config.defaultValue;
      });
      setColors(initialColors);
    }
  }, [show, currentSettings]);

  useEffect(() => {
    // Aplicar colores temporalmente en tiempo real
    if (show) {
      Object.entries(colors).forEach(([key, value]) => {
        const cssVarMap = {
          'primary_color': '--primary-color',
          'sidebar_background_color': '--sidebar-bg-color',
          'sidebar_text_color': '--sidebar-text-color',
          'accent_color': '--accent-color',
          'card_background_color': '--card-bg-color',
          'success_color': '--success-color',
          'danger_color': '--danger-color',
        };
        const cssVar = cssVarMap[key];
        if (cssVar && value) {
          document.documentElement.style.setProperty(cssVar, value);
        }
      });
    }
  }, [colors, show]);

  const handleColorChange = (key, value) => {
    setColors(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage('');

    try {
      const formData = new FormData();
      Object.entries(colors).forEach(([key, value]) => {
        formData.append(key, value);
      });

      const response = await fetch('/api/settings', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al guardar la configuración de colores.');
      }

      const result = await response.json();
      setSuccessMessage(result.message);

      // Notificar al componente padre que se guardaron los cambios
      if (onSave) {
        onSave(colors);
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

  const handleCancel = () => {
    // Revertir colores a los valores originales
    if (currentSettings) {
      Object.entries(currentSettings).forEach(([key, value]) => {
        const cssVarMap = {
          'primary_color': '--primary-color',
          'sidebar_background_color': '--sidebar-bg-color',
          'sidebar_text_color': '--sidebar-text-color',
          'accent_color': '--accent-color',
          'card_background_color': '--card-bg-color',
          'success_color': '--success-color',
          'danger_color': '--danger-color',
        };
        const cssVar = cssVarMap[key];
        if (cssVar && value) {
          document.documentElement.style.setProperty(cssVar, value);
        }
      });
    }
    onHide();
  };

  return (
    <Modal show={show} onHide={handleCancel} size="lg" centered>
      <Modal.Header closeButton style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
        <Modal.Title style={{ color: '#212529', fontWeight: 'bold' }}>Personalizar Colores</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto', backgroundColor: '#ffffff', padding: '1.5rem' }}>
        {error && <div className="alert alert-danger">{error}</div>}
        {successMessage && <div className="alert alert-success">{successMessage}</div>}

        <div className="alert alert-info" style={{ marginBottom: '1.5rem' }}>
          <strong>Vista previa en tiempo real:</strong> Los cambios se aplican automáticamente.
          Haz clic en "Actualizar" para guardar permanentemente.
        </div>

        {colorSettings.map(config => (
          <div
            key={config.key}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1.25rem',
              marginBottom: '0.75rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              border: '1px solid #dee2e6',
            }}
          >
            <div style={{ flex: 1, marginRight: '1rem' }}>
              <label
                htmlFor={config.key}
                style={{
                  fontWeight: '600',
                  color: '#212529',
                  fontSize: '1rem',
                  marginBottom: '0.25rem',
                  display: 'block',
                }}
              >
                {config.label}
              </label>
              <p style={{
                fontSize: '0.85rem',
                color: '#6c757d',
                margin: 0,
              }}>
                {config.description}
              </p>
            </div>
            <input
              type="color"
              id={config.key}
              value={colors[config.key] || config.defaultValue}
              onChange={(e) => handleColorChange(config.key, e.target.value)}
              style={{
                padding: '0.3rem',
                height: '55px',
                width: '110px',
                border: '2px solid #adb5bd',
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: '#ffffff',
              }}
            />
          </div>
        ))}
      </Modal.Body>
      <Modal.Footer style={{ backgroundColor: '#f8f9fa', borderTop: '2px solid #dee2e6', padding: '1rem' }}>
        <Button variant="outline-secondary" onClick={handleCancel} disabled={isSaving} size="lg">
          Cancelar
        </Button>
        <Button variant="outline-success" onClick={handleSave} disabled={isSaving} size="lg">
          {isSaving ? 'Guardando...' : 'Actualizar'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
