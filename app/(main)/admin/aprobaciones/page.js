// app/admin/aprobaciones/page.js
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from 'react-bootstrap';
import styles from './page.module.css';

export default function AprobacionesPage() {
  const router = useRouter();
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedRequest, setExpandedRequest] = useState(null);

  useEffect(() => {
    const fetchPendientes = async () => {
      try {
        const res = await fetch('/api/solicitudes/pendientes');
        if (res.ok) {
          const data = await res.json();
          setSolicitudes(data);
        } else if (res.status === 401 || res.status === 403) {
          router.push('/login');
        } else {
          throw new Error('No se pudieron cargar las solicitudes pendientes.');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPendientes();
  }, [router]);

  const handleAction = async (id, action) => {
    try {
      const res = await fetch(`/api/solicitudes/${id}/${action}`, {
        method: 'PUT',
      });

      if (res.ok) {
        alert(`Solicitud ${action}da exitosamente.`);
        setSolicitudes(prev => prev.filter(s => s.solicitud_id !== id));
      } else {
        const errorData = await res.json();
        alert(`Error al ${action}r la solicitud: ${errorData.message}`);
      }
    } catch (err) {
      alert(`Error de conexión al ${action}r la solicitud.`);
    }
  };

  const toggleExpand = (solicitudId) => {
    setExpandedRequest(expandedRequest === solicitudId ? null : solicitudId);
  };

  if (loading) {
    return <div className={styles.container}>Cargando aprobaciones pendientes...</div>;
  }

  if (error) {
    return <div className={styles.container} style={{ color: 'red' }}>Error: {error}</div>;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>Aprobaciones Pendientes</h1>
      {solicitudes.length === 0 ? (
        <p>No tienes solicitudes pendientes de aprobación.</p>
      ) : (
        <div className={styles.solicitudesList}>
          {solicitudes.map((solicitud) => (
            <div key={solicitud.solicitud_id} className={styles.solicitudCard}>
              <div className={styles.cardHeader}>
                <h2>SOLICITUD ID: {solicitud.solicitud_id}</h2>
                <p><strong>FECHA:</strong> {solicitud.fecha_solicitud}</p>
              </div>
              <p><strong>SOLICITANTE:</strong> {solicitud.nombre_solicitante}</p>
              <p><strong>PROVEEDOR:</strong> {solicitud.nombre_proveedor}</p>
              <p><strong>ESTADO:</strong> <span className={`${styles.status} ${styles[solicitud.estado]}`}>{solicitud.estado}</span></p>
              <div className={styles.actionButtons}>
                <button onClick={() => handleAction(solicitud.solicitud_id, 'aprobar')} className={styles.approveButton}>Aprobar</button>
                <button onClick={() => handleAction(solicitud.solicitud_id, 'rechazar')} className={styles.rejectButton}>Rechazar</button>
                <Button onClick={() => toggleExpand(solicitud.solicitud_id)} variant="outline-info" size="sm">
                  {expandedRequest === solicitud.solicitud_id ? 'OCULTAR DETALLES' : 'VER DETALLES'}
                </Button>
              </div>
              {expandedRequest === solicitud.solicitud_id && (
                <div className={styles.detailsSection}>
                  <h3>ÍTEMS DE LA SOLICITUD:</h3>
                  <div className={styles.tableWrapper}>
                    <table className={styles.itemsTable}>
                      <thead>
                        <tr>
                          <th>PRIORIDAD</th>
                          <th>DESCRIPCIÓN</th>
                          <th>ESPECIFICACIONES</th>
                          <th>CANTIDAD</th>
                          <th>OBSERVACIONES</th>
                        </tr>
                      </thead>
                      <tbody>
                        {solicitud.items.map((item) => (
                          <tr key={item.id}>
                            <td>{item.necesidad}</td>
                            <td>{item.descripcion}</td>
                            <td>{item.especificaciones}</td>
                            <td>{item.cantidad}</td>
                            <td>{item.observaciones}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}