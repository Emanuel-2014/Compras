'use client';
import React, { useEffect, useState } from 'react';
import styles from './PrintableSolicitud.module.css';

const PrintableSolicitud = ({ solicitud, companySettings: propSettings, onImageLoad }) => {
  const [companySettings, setCompanySettings] = useState(propSettings || {
    company_name: 'Pollos al Día S.A.S.',
    company_logo_path: '/logo.png',
    company_address: 'Carrera 22a # 15-61 Pasto (Nariño)',
    company_phone: '3112163767',
    company_email: 'polloaldiacompras@gmail.com'
  });

  const [imageLoaded, setImageLoaded] = useState(false);
  const [imagePreloaded, setImagePreloaded] = useState(false);

  // Precargar la imagen antes de renderizar
  useEffect(() => {
    if (companySettings.company_logo_path) {
      const img = new Image();
      img.onload = () => {        setImagePreloaded(true);
      };
      img.onerror = () => {
        console.warn('Error precargando logo, continuando con impresión');
        setImagePreloaded(true); // Permitir continuar aunque falle
      };
      img.src = companySettings.company_logo_path;
    }
  }, [companySettings.company_logo_path]);

  useEffect(() => {
    // Solo cargar la configuración si no fue pasada como prop
    if (!propSettings) {
      fetch('/api/public-settings')
        .then(res => res.json())
        .then(data => setCompanySettings(data))
        .catch(err => console.error('Error loading company settings:', err));
    }
  }, [propSettings]);

  useEffect(() => {
    if (imageLoaded && imagePreloaded && onImageLoad) {      onImageLoad();
    }
  }, [imageLoaded, imagePreloaded, onImageLoad]);

  const handleImageLoad = () => {    setImageLoaded(true);
  };

  const handleImageError = () => {
    console.warn('No se pudo cargar el logo en DOM, continuando con la impresión');
    setImageLoaded(true); // Permitir impresión aunque falle el logo
  };

  if (!solicitud) {
    return <div>Cargando...</div>;
  }

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'UTC' };
    return new Date(dateString).toLocaleDateString('es-ES', options);
  };

  // El tipo viene en mayúsculas desde la base de datos (SERVICIO, COMPRA)
  const tipoSolicitud = (solicitud.tipo || 'COMPRA').toUpperCase();
  const titulo = tipoSolicitud === 'SERVICIO'
    ? 'SOLICITUD DE SERVICIO'
    : 'SOLICITUD DE COMPRAS';

  let recibidoPorNombre = '';
  if (solicitud.items && solicitud.items.some(item => item.recepciones && item.recepciones.length > 0)) {
    const firstItemWithReception = solicitud.items.find(item => item.recepciones && item.recepciones.length > 0);
    if (firstItemWithReception) {
      recibidoPorNombre = firstItemWithReception.recepciones[0].usuario_nombre;
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.logoContainer}>
          <img
            src={companySettings.company_logo_path}
            alt="Logo de la empresa"
            style={{ maxWidth: '250px', height: 'auto' }}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
          {companySettings.company_nit && (
            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>
              NIT: {companySettings.company_nit}
            </p>
          )}
        </div>
        <div className={styles.companyInfo}>
          <h1>{titulo}</h1>
          <p>{companySettings.company_name}</p>
          <p>{companySettings.company_address}</p>
          <p>{companySettings.company_phone}</p>
          <p>{companySettings.company_email}</p>
        </div>
      </div>
      {/* Contenido principal del documento */}
      <main>
        <section className={styles.detailsSection}>
          <div className={styles.detailRow}>
            <span><strong>DEPENDENCIA:</strong> {solicitud.usuario_dependencia || 'N/A'}</span>
            <span><strong>ID DE SOLICITUD:</strong> {solicitud.solicitud_id}</span>
            <span><strong>FECHA:</strong> {formatDate(solicitud.fecha_solicitud)}</span>
          </div>
          <div className={styles.detailRow}>
            <span><strong>PROVEEDOR:</strong> {solicitud.proveedor_nombre}</span>
            <span><strong>RESPONSABLE:</strong> {solicitud.usuario_nombre}</span>
          </div>
        </section>
        <section className={styles.itemsSection}>
          <table className={styles.itemsTable}>
            <thead>
              <tr>
                <th>PRIORIDAD</th>
                <th>DESCRIPCION</th>
                <th>ESPECIFICACIONES</th>
                <th>CANTIDAD</th>
                <th>OBSERVACIONES</th>
              </tr>
            </thead>
            <tbody>
              {solicitud.items && solicitud.items.map((item) => (
                <tr key={item.id}>
                  <td>{(item.prioridad || item.necesidad || '').toUpperCase()}</td>
                  <td>{item.descripcion}</td>
                  <td>{item.especificaciones}</td>
                  <td>{item.cantidad}</td>
                  <td>{item.observaciones}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className={styles.notesSection}>
          <h3>Notas:</h3>
          <p>{solicitud.notas_adicionales || 'No hay notas adicionales.'}</p>
        </section>

        {solicitud.items && solicitud.items.some(item => item.recepciones && item.recepciones.length > 0) && (
          <>
            <hr className={styles.receptionHr} />
            <section className={styles.receptionSection}>
              <h2 className={styles.receptionTitle}>Registro de Recepción y Conformidad</h2>
              <p className={styles.receptionSubtitle}>
                El siguiente listado detalla los artículos o servicios recibidos y validados por el usuario solicitante.
              </p>
              <table className={styles.receptionTable}>
                <thead>
                  <tr>
                    <th>Ítem</th>
                    <th>Cantidad Recibida</th>
                    <th>Recibido por</th>
                    <th>Fecha de Recepción</th>
                  </tr>
                </thead>
                <tbody>
                  {solicitud.items.map(item =>
                    item.recepciones && item.recepciones.map(recepcion => (
                      <tr key={`${item.id}-${recepcion.id}`}>
                        <td>{item.descripcion}</td>
                        <td>{recepcion.cantidad_recibida}</td>
                        <td>{recepcion.usuario_nombre}</td>
                        <td>{formatDate(recepcion.fecha_recepcion)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </section>
          </>
        )}
        <section className={styles.signaturesSection}>
          {solicitud.historial_firmas && solicitud.historial_firmas
            .filter(firma => ['aprobada', 'aprobado', 'autorizado'].includes(firma.estado?.toLowerCase()))
            .map(firma => (
              <div className={styles.signatureBox} key={firma.id}>
                <div className={styles.signatureName}>{firma.nombre_aprobador || ''}</div>
                <div className={styles.signatureLine}></div>
                <p>
                  {
                    firma.aprobador_rol?.toLowerCase() === 'administrador' ? 'Aprobado por' :
                    firma.aprobador_rol?.toLowerCase() === 'aprobador' ? 'Autorizado por' : ''
                  }
                </p>
              </div>
            ))
          }
          {recibidoPorNombre && (
            <div className={styles.signatureBox}>
              <div className={styles.signatureName}>{recibidoPorNombre}</div>
              <div className={styles.signatureLine}></div>
              <p>Recibido Por</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

PrintableSolicitud.displayName = 'PrintableSolicitud';
export default PrintableSolicitud;