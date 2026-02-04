
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Container, Form, Button, Row, Col, Table, Alert, Spinner, InputGroup, Modal, Badge } from 'react-bootstrap';
import { FaSearch, FaChartLine } from 'react-icons/fa';
import 'bootstrap/dist/css/bootstrap.min.css';
import TrazabilidadDashboard from '@/components/TrazabilidadDashboard';
function ComparadorPreciosPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false); // Para saber si ya se ha realizado una búsqueda
  const [displaySearchTerm, setDisplaySearchTerm] = useState(''); // Para mostrar el término de la búsqueda actual

  // Estados para el dashboard de trazabilidad
  const [showTrazabilidadModal, setShowTrazabilidadModal] = useState(false);
  const [solicitudIdForTrazabilidad, setSolicitudIdForTrazabilidad] = useState('');
  const [solicitudesDisponibles, setSolicitudesDisponibles] = useState([]);
  const [loadingSolicitudes, setLoadingSolicitudes] = useState(false);
  const [showSolicitudesModal, setShowSolicitudesModal] = useState(false);
  const fetchData = useCallback(async (term) => {
    setError('');
    setLoading(true);
    setSearched(true);
    setResults([]);
    let url = `/api/comparador-precios`;
    if (term && term.trim() !== '') {
      url += `?descripcion=${encodeURIComponent(term)}`;
    }
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Error al buscar los precios.');
      }
      // Ordenar resultados por precio final de menor a mayor
      data.sort((a, b) => a.precio_final_con_iva - b.precio_final_con_iva);
      setResults(data);

      // Establecer el displaySearchTerm según si hay búsqueda o no
      if (term && term.trim() !== '') {
        setDisplaySearchTerm(term);
      } else {
        setDisplaySearchTerm(''); // Sin término de búsqueda
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar solicitudes disponibles para trazabilidad
  const fetchSolicitudes = useCallback(async () => {
    setLoadingSolicitudes(true);
    try {
      const res = await fetch('/api/admin/solicitudes');
      if (res.ok) {
        const data = await res.json();
        console.log('Solicitudes cargadas:', data.solicitudes?.length || 0);
        setSolicitudesDisponibles(data.solicitudes.slice(0, 30)); // Solo las primeras 30 para el dropdown
      } else {
        console.error('Error al cargar solicitudes:', res.status);
      }
    } catch (err) {
      console.error('Error cargando solicitudes:', err);
    } finally {
      setLoadingSolicitudes(false);
    }
  }, []);

  const handleCloseTrazabilidadModal = () => {
    setShowTrazabilidadModal(false);
    setSolicitudIdForTrazabilidad('');
  };

  useEffect(() => {
    // Cargar los productos más comprados al inicio
    fetchData('');
    // Cargar solicitudes para trazabilidad
    fetchSolicitudes();
  }, [fetchData, fetchSolicitudes]);
  const handleSearch = (event) => {
    event.preventDefault();
    fetchData(searchTerm);
  };
  const handleExcelExport = async () => {
    if (!displaySearchTerm || displaySearchTerm.trim() === '') {
      setError('No hay resultados para exportar. Por favor, realice una búsqueda.');
      return;
    }
    if (results.length === 0) {
      setError('No hay datos para exportar.');
      return;
    }
    const url = `/api/reports/comparador-precios?descripcion=${encodeURIComponent(displaySearchTerm)}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Error al generar el archivo Excel.');
      }
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `comparacion_precios_${displaySearchTerm}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      setError(error.message);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 2,
    }).format(value);
  };
  return (
    <Container fluid className="p-4">
      <Row className="mb-4">
        <Col>
          <h1 className="mb-2">Comparador de Precios de Artículos</h1>
          <p>Busque un artículo por su descripción para ver un historial de precios de diferentes proveedores.</p>
        </Col>
        <Col xs="auto">
          <Button
            variant="outline-info"
            size="lg"
            onClick={() => handleOpenTrazabilidadModal()}
            className="d-flex align-items-center gap-2"
          >
            <FaChartLine /> Dashboard de Trazabilidad
          </Button>
        </Col>
      </Row>
      <div className="p-3 border rounded mb-4">
        <Row className="mb-3">
          <Col>
            <h5 className="mb-3">📈 Análisis Rápido de Trazabilidad</h5>
            <div className="d-flex gap-2 align-items-end flex-wrap">
              <div style={{ minWidth: '300px', flex: 1 }}>
                <Form.Label>Seleccionar Solicitud:</Form.Label>
                <Form.Select
                  value={solicitudIdForTrazabilidad}
                  onChange={(e) => setSolicitudIdForTrazabilidad(e.target.value)}
                  disabled={loadingSolicitudes}
                >
                  <option value="">
                    {loadingSolicitudes ? 'Cargando solicitudes...' : 'Seleccione una solicitud...'}
                  </option>
                  {solicitudesDisponibles.map(s => (
                    <option key={s.solicitud_id} value={s.solicitud_id}>
                      {s.solicitud_id} - {s.solicitante_nombre} ({new Date(s.fecha_solicitud).toLocaleDateString()})
                    </option>
                  ))}
                </Form.Select>
              </div>
              <Button
                variant="success"
                onClick={() => {
                  if (solicitudIdForTrazabilidad && solicitudIdForTrazabilidad.trim() !== '') {
                    setShowTrazabilidadModal(true);
                  } else {
                    alert('Por favor seleccione una solicitud primero');
                  }
                }}
                disabled={!solicitudIdForTrazabilidad || loadingSolicitudes}
              >
                <FaChartLine className="me-1" /> Ver Dashboard
              </Button>
              <Button
                variant="outline-info"
                onClick={() => {
                  console.log('Solicitudes disponibles:', solicitudesDisponibles);
                  setShowSolicitudesModal(true);
                }}
                size="sm"
              >
                🔍 Ver Disponibles
              </Button>
            </div>
          </Col>
        </Row>
        <hr />
        <h5 className="mb-3">🔍 Comparador de Precios</h5>
        <Form onSubmit={handleSearch}>
          <Row>
            <Col>
              <InputGroup>
                <Form.Control
                  type="text"
                  placeholder="Ej: Bolsas de Empaque, Tornillo 3/4, Guantes de nitrilo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Button variant="outline-primary" type="submit" disabled={loading}>
                  <FaSearch /> Buscar
                </Button>
              </InputGroup>
            </Col>
          </Row>
        </Form>
      </div>
      {error && <Alert variant="danger">{error}</Alert>}
      {loading && (
        <div className="text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Cargando...</span>
          </Spinner>
          <p>Buscando precios...</p>
        </div>
      )}
      {!loading && searched && results.length === 0 && (
        <Alert variant="info">No se encontraron precios para "{searchTerm}".</Alert>
      )}
      {!loading && results.length > 0 && (
        <>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h3 className="mb-0">
            {displaySearchTerm ? `Resultados para "${displaySearchTerm}"` : 'Todos los artículos registrados'}
          </h3>
          <Button variant="outline-success" onClick={handleExcelExport} disabled={!displaySearchTerm}>
            Exportar a Excel
          </Button>
        </div>
        <Table striped bordered hover responsive className="table-sm">
          <thead>
            <tr>
              <th>#</th>
              <th>DESCRIPCIÓN</th>
              <th>PROVEEDOR</th>
              <th>FECHA DE FACTURA</th>
              <th className="text-end">PRECIO FINAL (IVA INCL.)</th>
              <th className="text-end">DIFERENCIA DE PRECIO</th>
              <th className="text-end">DIFERENCIA %</th>
            </tr>
          </thead>
          <tbody>
            {results.map((item, index) => {
              return (
                <tr key={item.id} className={item.es_mejor_precio_grupo ? 'table-success' : ''}>
                  <td>{index + 1}</td>
                  <td>{item.descripcion}</td>
                  <td>{item.proveedor_nombre}</td>
                  <td>{new Date(item.fecha_emision).toLocaleDateString('es-CO')}</td>
                  <td className="text-end fw-bold">
                      {formatCurrency(item.precio_final_con_iva)}
                      {item.es_mejor_precio_grupo && <span className="badge bg-success ms-2">Mejor Precio</span>}
                  </td>
                  <td className="text-end">
                    {item.diferencia_precio > 0 ? formatCurrency(item.diferencia_precio) : '-'}
                  </td>
                  <td className="text-end">
                    {item.diferencia_porcentaje > 0 ? `${item.diferencia_porcentaje.toFixed(2)}%` : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
        </>
      )}

      {/* Modal de Solicitudes Disponibles */}
      <Modal show={showSolicitudesModal} onHide={() => setShowSolicitudesModal(false)} size="lg" centered>
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>
            📈 Solicitudes Disponibles para Análisis
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <Alert variant="info">
              <strong>Total de solicitudes:</strong> {solicitudesDisponibles.length} disponibles
            </Alert>
          </div>

          {solicitudesDisponibles.length > 0 ? (
            <Table striped hover responsive size="sm" className="small">
              <thead>
                <tr>
                  <th>ID Solicitud</th>
                  <th>Solicitante</th>
                  <th>Proveedor</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {solicitudesDisponibles.slice(0, 20).map(sol => (
                  <tr key={sol.id}>
                    <td>
                      <Badge bg="primary" className="font-monospace" style={{ fontSize: '0.75rem' }}>
                        {sol.solicitud_id}
                      </Badge>
                    </td>
                    <td className="text-truncate" style={{ maxWidth: '120px' }}>{sol.solicitante_nombre}</td>
                    <td className="text-truncate" style={{ maxWidth: '140px' }}>{sol.proveedor_nombre}</td>
                    <td>{new Date(sol.fecha_solicitud).toLocaleDateString()}</td>
                    <td>
                      <Badge
                        bg={sol.estado === 'aprobada' ? 'success' :
                            sol.estado === 'pendiente' ? 'warning' : 'secondary'}
                        style={{ fontSize: '0.7rem' }}
                      >
                        {sol.estado}
                      </Badge>
                    </td>
                    <td>
                      <Button
                        variant="outline-success"
                        size="sm"
                        className="py-1 px-2"
                        style={{ fontSize: '0.75rem' }}
                        onClick={(e) => {
                          e.preventDefault();
                          console.log('Click en botón individual para solicitud:', sol.solicitud_id);

                          // Limpiar estado anterior
                          setSolicitudIdForTrazabilidad('');

                          // Cerrar el modal de solicitudes
                          setShowSolicitudesModal(false);

                          // Esperar a que se cierre completamente y luego configurar nueva solicitud
                          setTimeout(() => {
                            console.log('Estableciendo solicitud ID:', sol.solicitud_id);
                            setSolicitudIdForTrazabilidad(sol.solicitud_id);

                            // Abrir modal de trazabilidad con delay adicional
                            setTimeout(() => {
                              console.log('Abriendo modal de trazabilidad');
                              setShowTrazabilidadModal(true);
                            }, 100);
                          }, 200);
                        }}
                      >
                        📈 Analizar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <Alert variant="warning">
              <strong>No hay solicitudes disponibles</strong>
              <p>No se encontraron solicitudes para mostrar. Esto puede deberse a:</p>
              <ul>
                <li>No hay solicitudes creadas en el sistema</li>
                <li>Problemas de permisos de acceso</li>
                <li>Error en la carga de datos</li>
              </ul>
            </Alert>
          )}

          {solicitudesDisponibles.length > 20 && (
            <Alert variant="info" className="mt-3">
              <small>
                ℹ️ Mostrando las primeras 20 solicitudes de {solicitudesDisponibles.length} disponibles.
              </small>
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSolicitudesModal(false)}>
            Cerrar
          </Button>
          <Button
            variant="outline-primary"
            onClick={() => {
              fetchSolicitudes();
            }}
            disabled={loadingSolicitudes}
          >
            {loadingSolicitudes ? 'Actualizando...' : '🔄 Actualizar Lista'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de Dashboard de Trazabilidad */}
      {showTrazabilidadModal && (
        <TrazabilidadDashboard
          show={showTrazabilidadModal}
          onHide={handleCloseTrazabilidadModal}
          solicitudId={solicitudIdForTrazabilidad}
        />
      )}
    </Container>
  );
}
export default ComparadorPreciosPage;