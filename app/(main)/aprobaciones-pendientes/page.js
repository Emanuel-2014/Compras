"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Table, Spinner, Alert } from 'react-bootstrap';
import styles from './AprobacionesPage.module.css';

export default function AprobacionesPendientesPage() {
  const router = useRouter();
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAprobaciones = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/aprobaciones-pendientes');
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || 'Error al cargar las solicitudes pendientes');
        }
        const data = await res.json();
        setSolicitudes(data);
      } catch (err) {
        setError(err.message);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAprobaciones();
  }, []);

  const handleVerSolicitud = (solicitudId) => {
    router.push(`/solicitud/${solicitudId}`);
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Cargando...</span>
        </Spinner>
      </div>
    );
  }

  if (error) {
    return <Alert variant="danger">Error: {error}</Alert>;
  }

  return (
    <div className={styles.container} style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <h1 className={styles.title} style={{ color: '#212529' }}>Aprobaciones Pendientes</h1>
      <p style={{ color: '#212529', marginBottom: '1.5rem' }}>
        A continuación se muestran las solicitudes que requieren su revisión y aprobación.
      </p>

      {solicitudes.length > 0 ? (
        <div style={{ marginTop: '2rem', overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              backgroundColor: '#ffffff',
              border: '1px solid #dee2e6',
              borderCollapse: 'collapse',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#e9ecef' }}>
                <th style={{
                  color: '#212529',
                  padding: '12px',
                  border: '1px solid #dee2e6',
                  fontWeight: 600
                }}>ID de Solicitud</th>
                <th style={{
                  color: '#212529',
                  padding: '12px',
                  border: '1px solid #dee2e6',
                  fontWeight: 600
                }}>Solicitante</th>
                <th style={{
                  color: '#212529',
                  padding: '12px',
                  border: '1px solid #dee2e6',
                  fontWeight: 600
                }}>Proveedor</th>
                <th style={{
                  color: '#212529',
                  padding: '12px',
                  border: '1px solid #dee2e6',
                  fontWeight: 600
                }}>Fecha de Solicitud</th>
                <th style={{
                  color: '#212529',
                  padding: '12px',
                  border: '1px solid #dee2e6',
                  fontWeight: 600
                }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {solicitudes.map((sol, index) => (
                <tr
                  key={`${sol.solicitud_id}-${index}`}
                  onClick={() => handleVerSolicitud(sol.solicitud_id)}
                  style={{
                    cursor: 'pointer',
                    backgroundColor: '#ffffff',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                >
                  <td style={{
                    color: '#212529',
                    padding: '12px',
                    border: '1px solid #dee2e6'
                  }}>{sol.solicitud_id}</td>
                  <td style={{
                    color: '#212529',
                    padding: '12px',
                    border: '1px solid #dee2e6'
                  }}>{sol.solicitante_nombre}</td>
                  <td style={{
                    color: '#212529',
                    padding: '12px',
                    border: '1px solid #dee2e6'
                  }}>{sol.proveedor_nombre}</td>
                  <td style={{
                    color: '#212529',
                    padding: '12px',
                    border: '1px solid #dee2e6'
                  }}>{new Date(sol.fecha_solicitud).toLocaleDateString()}</td>
                  <td style={{
                    color: '#212529',
                    padding: '12px',
                    border: '1px solid #dee2e6',
                    textAlign: 'center'
                  }}>
                    <span style={{
                      backgroundColor: '#ffc107',
                      color: '#000',
                      padding: '4px 12px',
                      borderRadius: '4px',
                      fontWeight: 600,
                      fontSize: '12px'
                    }}>PENDIENTE</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{
          backgroundColor: '#d1ecf1',
          color: '#0c5460',
          padding: '12px 20px',
          borderRadius: '4px',
          border: '1px solid #bee5eb',
          marginTop: '1rem'
        }}>
          No tiene solicitudes pendientes de aprobación en este momento.
        </div>
      )}
    </div>
  );
}
