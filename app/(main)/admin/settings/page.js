// app/(main)/admin/settings/page.js
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from 'react-bootstrap';
import ColorSettingsModal from './ColorSettingsModal';
import CompanySettingsModal from './CompanySettingsModal';

const settingsConfig = [
  {
    key: 'iva_percentage',
    label: 'Porcentaje de IVA (Ej. 0.19 para 19%)',
    description: 'Valor decimal del porcentaje de IVA a aplicar en las facturas de compra.',
    type: 'number',
    defaultValue: '0.19',
  },
  // Los datos de la empresa ahora se manejan en el modal CompanySettingsModal
  // {
  //   key: 'company_name',
  //   label: 'Nombre de la Empresa',
  //   description: 'Nombre completo de la empresa.',
  //   type: 'text',
  //   defaultValue: 'Pollos al Día S.A.S.',
  // },
  // {
  //   key: 'company_address',
  //   label: 'Dirección de la Empresa',
  //   description: 'Dirección física de la empresa.',
  //   type: 'text',
  //   defaultValue: 'Calle 123 # 45-67, Bogotá D.C.',
  // },
  // {
  //   key: 'company_phone',
  //   label: 'Teléfono de la Empresa',
  //   description: 'Número de teléfono de contacto de la empresa.',
  //   type: 'text',
  //   defaultValue: '+57 1 234 5678',
  // },
  // {
  //   key: 'company_email',
  //   label: 'Email de la Empresa',
  //   description: 'Correo electrónico de contacto de la empresa.',
  //   type: 'text',
  //   defaultValue: 'info@pollosaldia.com',
  // },
  // {
  //   key: 'company_logo_path',
  //   label: 'Logo de la Empresa',

  //   type: 'image_upload',
  //   defaultValue: '/logo.png',
  // },
  {
    key: 'show_instructions_modal',
    label: 'Mostrar Mensaje de Instrucciones',
    description: 'Si se activa, mostrará un mensaje al crear una nueva solicitud pidiendo descripciones claras.',
    type: 'toggle',
    defaultValue: true,
  },
  {
    key: 'enable_duplicate_check',
    label: 'Validar Solicitudes Duplicadas',
    description: 'Impide que un usuario solicite el mismo ítem más de una vez por semana (después del periodo de gracia).',
    type: 'toggle',
    defaultValue: false,
  },
  {
    key: 'duplicate_check_grace_period_end_date',
    label: 'Fecha Fin Periodo de Gracia',
    description: 'Hasta esta fecha, la validación de duplicados solo advertirá. Después, bloqueará la solicitud.',
    type: 'date',
    defaultValue: '',
  },
  {
    key: 'duplicate_check_days',
    label: 'Días de Validación de Duplicados',
    description: 'Número de días hacia atrás para comprobar si una solicitud es duplicada. Por defecto es 7.',
    type: 'text',
    defaultValue: '7',
  }
  // Los colores ahora se manejan en el modal ColorSettingsModal
  // {
  //   key: 'primary_color',
  //   label: 'Color Primario',
  //   description: 'Color principal de botones, enlaces y elementos destacados.',
  //   type: 'color',
  //   defaultValue: '#0056b3',
  // },
  // {
  //   key: 'sidebar_background_color',
  //   label: 'Color de Fondo de Barra Lateral',
  //   description: 'Color de fondo de la barra de navegación lateral.',
  //   type: 'color',
  //   defaultValue: '#1a1a1a',
  // },
  // {
  //   key: 'sidebar_text_color',
  //   label: 'Color de Texto de Barra Lateral',
  //   description: 'Color del texto en la barra de navegación lateral.',
  //   type: 'color',
  //   defaultValue: '#ffffff',
  // },
  // {
  //   key: 'accent_color',
  //   label: 'Color de Acento',
  //   description: 'Color para elementos secundarios y bordes.',
  //   type: 'color',
  //   defaultValue: '#28a745',
  // },
  // {
  //   key: 'card_background_color',
  //   label: 'Color de Fondo de Tarjetas',
  //   description: 'Color de fondo de los contenedores de contenido.',
  //   type: 'color',
  //   defaultValue: '#ffffff',
  // },
  // {
  //   key: 'success_color',
  //   label: 'Color de Éxito',
  //   description: 'Color para mensajes y botones de confirmación.',
  //   type: 'color',
  //   defaultValue: '#28a745',
  // },
  // {
  //   key: 'danger_color',
  //   label: 'Color de Peligro',
  //   description: 'Color para mensajes de error y advertencias.',
  //   type: 'color',
  //   defaultValue: '#dc3545',
  // }
];

const SettingsPage = () => {
  const [settings, setSettings] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [showColorModal, setShowColorModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/settings`); // No need for ?keys= anymore, API returns all
        const fetchedSettings = await response.json();

        // Initialize settings state with fetched values or default values
        const initialSettings = {};
        settingsConfig.forEach(config => {
          initialSettings[config.key] = fetchedSettings[config.key] ?? config.defaultValue;
        });
        setSettings(initialSettings);

      } catch (err) {
        setError('Error al cargar la configuración. Intente recargar la página.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleFileChange = (e) => {
    setLogoFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true); // Use isLoading for submitting state
    setError(null);
    setSuccessMessage('');

    const formData = new FormData();
    for (const key in settings) {
      if (key === 'company_logo_path') continue; // Don't send path directly
      formData.append(key, settings[key]);
    }
    if (logoFile) {
      formData.append('company_logo', logoFile);
    }

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al guardar la configuración.');
      }

      const result = await response.json();
      setSuccessMessage(result.message);
      setLogoFile(null); // Clear file input

      // Re-fetch settings to get updated logo path
      const updatedResponse = await fetch('/api/settings');
      const updatedFetchedSettings = await updatedResponse.json();
      const updatedInitialSettings = {};
      settingsConfig.forEach(config => {
        updatedInitialSettings[config.key] = updatedFetchedSettings[config.key] ?? config.defaultValue;
      });
      setSettings(updatedInitialSettings);

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const cardStyle = {
    padding: '2rem',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  };

  const settingRowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.5rem 0',
    borderBottom: '1px solid #e2e8f0',
  };

  const labelStyle = {
    fontWeight: '600',
    color: '#2d3748',
  };

  const descriptionStyle = {
    fontSize: '0.875rem',
    color: '#718096',
    marginTop: '0.25rem',
  };

  const toggleSwitchStyle = {
    position: 'relative',
    display: 'inline-block',
    width: '60px',
    height: '34px',
  };

  if (isLoading && !Object.keys(settings).length) {
    return <div style={cardStyle}><p>Cargando configuración...</p></div>;
  }

  return (
    <div style={cardStyle}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem', color: '#2d3748', textAlign: 'center' }}>Configuración de Administrador</h1>

      <form onSubmit={handleSubmit}>
        {error && <p style={{ color: '#e53e3e', marginBottom: '1rem' }}>Error: {error}</p>}
        {successMessage && <p style={{ color: '#48bb78', marginBottom: '1rem' }}>{successMessage}</p>}

        {settingsConfig.map(config => {
          const currentValue = settings[config.key] ?? config.defaultValue;

          let inputComponent;
          switch (config.type) {
            case 'toggle':
              const isChecked = currentValue === 'true' || currentValue === true;
              const sliderStyle = {
                position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: isChecked ? '#48bb78' : '#ccc',
                transition: '.4s', borderRadius: '34px',
              };
              const knobStyle = {
                position: 'absolute', content: '', height: '26px', width: '26px',
                left: isChecked ? '26px' : '4px',
                bottom: '4px', backgroundColor: 'white', transition: '.4s', borderRadius: '50%',
              };
              inputComponent = (
                <label style={toggleSwitchStyle}>
                  <input
                    type="checkbox"
                    id={config.key}
                    checked={isChecked}
                    onChange={() => handleChange(config.key, !isChecked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={sliderStyle}><span style={knobStyle}></span></span>
                </label>
              );
              break;
            case 'date':
              inputComponent = (
                <input
                  type="date"
                  id={config.key}
                  value={(currentValue || '').split('T')[0]}
                  onChange={(e) => handleChange(config.key, e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              );
              break;
            case 'color':
              inputComponent = (
                <input
                  type="color"
                  id={config.key}
                  value={currentValue}
                  onChange={(e) => handleChange(config.key, e.target.value)}
                  style={{ padding: '0.2rem', height: '40px', width: '80px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
              );
              break;
            case 'image_upload':
              inputComponent = (
                <div>
                  {settings.company_logo_path && <img src={settings.company_logo_path} alt="Logo" style={{ width: '100px', height: 'auto', marginBottom: '1rem', border: '1px solid #eee', padding: '5px' }} />}
                  <input
                    type="file"
                    id={config.key}
                    onChange={handleFileChange}
                    accept="image/png, image/jpeg, image/gif"
                    style={{ display: 'block' }}
                  />
                </div>
              );
              break;
            case 'number': // Nuevo caso para tipo numérico
              inputComponent = (
                <input
                  type="number"
                  id={config.key}
                  value={Number(currentValue)} // Asegurarse de que el valor sea numérico
                  onChange={(e) => handleChange(config.key, e.target.value)}
                  step="0.01" // Permite decimales para el IVA
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', width: '200px' }}
                />
              );
              break;
            case 'text':
            default:
              inputComponent = (
                <input
                  type="text"
                  id={config.key}
                  value={currentValue}
                  onChange={(e) => handleChange(config.key, e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', width: '200px' }}
                />
              );
              break;
          }

          return (
            <div key={config.key} style={settingRowStyle}>
              <div>
                <label htmlFor={config.key} style={labelStyle}>
                  {config.label}
                </label>
                <p style={descriptionStyle}>
                  {config.description}
                </p>
              </div>
              {inputComponent}
            </div>
          );
        })}

        <div style={{ textAlign: 'right', marginTop: '2rem' }}>
          <Button type="submit" variant="outline-success" disabled={isLoading}>
            {isLoading ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </form>

      {/* Sección de configuraciones en modales */}
      <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

        {/* Botón para abrir el modal de información de empresa */}
        <div style={{ padding: '1.5rem', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}>
          <h3 style={{ marginBottom: '1rem', color: '#2d3748', fontSize: '1.25rem' }}>Información de Empresa</h3>
          <p style={{ fontSize: '0.875rem', color: '#718096', marginBottom: '1rem' }}>
            Configura el nombre, dirección, teléfono, email y logo de la empresa
          </p>
          <Button
            variant="outline-primary"
            onClick={() => setShowCompanyModal(true)}
            size="lg"
            style={{ width: '100%' }}
          >
            🏢 Configurar Empresa
          </Button>
        </div>

        {/* Botón para abrir el modal de colores */}
        <div style={{ padding: '1.5rem', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}>
          <h3 style={{ marginBottom: '1rem', color: '#2d3748', fontSize: '1.25rem' }}>Personalización de Colores</h3>
          <p style={{ fontSize: '0.875rem', color: '#718096', marginBottom: '1rem' }}>
            Personaliza los colores de la aplicación con vista previa en tiempo real
          </p>
          <Button
            variant="outline-primary"
            onClick={() => setShowColorModal(true)}
            size="lg"
            style={{ width: '100%' }}
          >
            🎨 Personalizar Colores
          </Button>
        </div>
      </div>

      {/* Modal de información de empresa */}
      <CompanySettingsModal
        show={showCompanyModal}
        onHide={() => setShowCompanyModal(false)}
        currentSettings={settings}
        onSave={async (newData) => {
          setShowCompanyModal(false);
          setSuccessMessage('Información de empresa actualizada correctamente');

          // Re-cargar la configuración actualizada desde el servidor
          try {
            const response = await fetch('/api/settings');
            const updatedSettings = await response.json();
            setSettings(updatedSettings);
          } catch (err) {
            console.error('Error al recargar configuración:', err);
            // Si falla la recarga, al menos actualizar los datos de texto
            setSettings({...settings, ...newData});
          }
        }}
      />

      {/* Modal de colores */}
      <ColorSettingsModal
        show={showColorModal}
        onHide={() => setShowColorModal(false)}
        currentSettings={settings}
        onSave={async (newColors) => {
          // Actualizar los settings locales
          setSettings({...settings, ...newColors});
          setShowColorModal(false);
          setSuccessMessage('Colores actualizados correctamente');

          // Re-cargar la página para que ThemeProvider aplique los nuevos colores
          setTimeout(() => {
            window.location.reload();
          }, 500);
        }}
      />
    </div>
  );
};

export default SettingsPage;
