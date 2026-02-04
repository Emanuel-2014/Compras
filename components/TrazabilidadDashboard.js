// components/TrazabilidadDashboard.js
'use client';

import { useState, useEffect } from 'react';
import { Modal, Row, Col, Card, Table, Alert, Badge, ProgressBar, Button, Spinner, Form } from 'react-bootstrap';

export default function TrazabilidadDashboard({ show, onHide, solicitudId: initialSolicitudId }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('resumen');
  const [solicitudId, setSolicitudId] = useState('');
  const [solicitudes, setSolicitudes] = useState([]);
  const [loadingSolicitudes, setLoadingSolicitudes] = useState(false);

  // Solo establecer la solicitud inicial cuando se pasa como prop
  useEffect(() => {
    if (initialSolicitudId && initialSolicitudId.trim() !== '') {
      setSolicitudId(initialSolicitudId);
      // Si es una solicitud preseleccionada, cargar datos automáticamente
      if (show) {
        setTimeout(() => {
          fetchTrazabilidadData();
        }, 200);
      }
    } else {
      setSolicitudId('');
      setData(null);
      setError('');
    }
  }, [initialSolicitudId, show]);

  // Solo cargar solicitudes cuando se abra el modal SIN solicitud inicial
  useEffect(() => {
    if (show && !initialSolicitudId && solicitudes.length === 0) {
      fetchSolicitudes();
    }
  }, [show, initialSolicitudId]);

  // NO más cargas automáticas - solo manual

  const fetchSolicitudes = async () => {
    setLoadingSolicitudes(true);
    try {
      const response = await fetch('/api/admin/solicitudes');
      if (!response.ok) throw new Error('Error al obtener solicitudes');
      const result = await response.json();
      setSolicitudes(result.solicitudes || []);
    } catch (err) {
      console.error('Error:', err);

      // Solo logging del error
    } finally {
      setLoadingSolicitudes(false);
    }
  };

  const fetchTrazabilidadData = async () => {
    // Usar la solicitud actual, ya sea del estado local o de la prop
    const currentSolicitudId = solicitudId || initialSolicitudId;

    if (!currentSolicitudId || currentSolicitudId.trim() === '') {
      setError('Por favor seleccione una solicitud primero');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/reports/trazabilidad-facturas?solicitudId=${currentSolicitudId}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Error de servidor' }));

        if (response.status === 404) {
          const mensaje = errorData.solicitudesDisponibles
            ? `Solicitud ${currentSolicitudId} no encontrada.\n\nSolicitudes disponibles: ${errorData.solicitudesDisponibles.join(', ')}`
            : `Solicitud ${currentSolicitudId} no encontrada`;
          throw new Error(mensaje);
        }

        throw new Error(errorData.message || `Error ${response.status}: No se pudo cargar la información`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error en fetchTrazabilidadData:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSolicitudChange = (newSolicitudId) => {
    setSolicitudId(newSolicitudId);
    setData(null);
    setError('');
    // NO cargar datos automáticamente
  };

  const getBadgeVariant = (porcentaje) => {
    if (porcentaje >= 90) return 'success';
    if (porcentaje >= 70) return 'warning';
    return 'danger';
  };

  const getVariacionColor = (variacion) => {
    if (Math.abs(variacion) <= 5) return 'success';
    if (Math.abs(variacion) <= 15) return 'warning';
    return 'danger';
  };

  if (loading) {
    return (
      <Modal show={show} onHide={onHide} size="xl" centered>
        <Modal.Body className="text-center py-5">
          <Spinner animation="border" />
          <p className="mt-2">Cargando análisis de trazabilidad...</p>
        </Modal.Body>
      </Modal>
    );
  }

  if (error || !data) {
    return (
      <Modal show={show} onHide={onHide} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Error</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="danger">{error || 'No se pudieron cargar los datos'}</Alert>
        </Modal.Body>
      </Modal>
    );
  }

  return (
    <Modal show={show} onHide={onHide} size="xl" fullscreen="lg-down">
      <Modal.Header closeButton>
        <Modal.Title>
          📊 Dashboard de Trazabilidad - {data.solicitud.solicitud_id}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ maxHeight: '80vh', overflowY: 'auto' }}>
        {/* Selector de solicitud si no hay una preseleccionada */}
        {!initialSolicitudId && (
          <Row className="mb-4">
            <Col>
              <Card className="bg-light">
                <Card.Body>
                  <h6>Seleccionar Solicitud para Análisis</h6>
                  <Form.Group>
                    <Form.Select
                      value={solicitudId}
                      onChange={(e) => handleSolicitudChange(e.target.value)}
                      disabled={loadingSolicitudes}
                    >
                      <option value="">
                        {loadingSolicitudes ? 'Cargando solicitudes...' : 'Seleccione una solicitud...'}
                      </option>
                      {solicitudes.map(sol => (
                        <option key={sol.id} value={sol.solicitud_id}>
                          {sol.solicitud_id} - {sol.solicitante_nombre} - {sol.proveedor_nombre} ({new Date(sol.fecha_solicitud).toLocaleDateString()})
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}

        {/* Mostrar mensaje de carga o error si no hay solicitud seleccionada */}
        {(!solicitudId || solicitudId.trim() === '') && !loading && (
          <Alert variant="info">
            <h5>👆 Seleccione una solicitud arriba para ver su análisis de trazabilidad</h5>
            <p>El dashboard mostrará:</p>
            <ul>
              <li>📊 Métricas de recepción y facturación</li>
              <li>🔍 Trazabilidad completa item por item</li>
              <li>💰 Análisis de variaciones de precios</li>
              <li>✅ Indicadores de cumplimiento</li>
            </ul>
          </Alert>
        )}

        {/* Contenido principal cuando hay solicitud seleccionada Y datos cargados */}
        {solicitudId && solicitudId.trim() !== '' && !loading && !error && data && (
          <>
        {/* Tabs de navegación */}
        <div className="d-flex mb-3 border-bottom">
          <Button
            variant={activeTab === 'resumen' ? 'primary' : 'outline-primary'}
            size="sm"
            className="me-2"
            onClick={() => setActiveTab('resumen')}
          >
            📈 Resumen
          </Button>
          <Button
            variant={activeTab === 'trazabilidad' ? 'primary' : 'outline-primary'}
            size="sm"
            className="me-2"
            onClick={() => setActiveTab('trazabilidad')}
          >
            🔍 Trazabilidad
          </Button>
          <Button
            variant={activeTab === 'precios' ? 'primary' : 'outline-primary'}
            size="sm"
            className="me-2"
            onClick={() => setActiveTab('precios')}
          >
            💰 Precios
          </Button>
          <Button
            variant={activeTab === 'cumplimiento' ? 'primary' : 'outline-primary'}
            size="sm"
            onClick={() => setActiveTab('cumplimiento')}
          >
            ✅ Cumplimiento
          </Button>
        </div>

        {/* Información básica de la solicitud */}
        <Row className="mb-4">
          <Col>
            <Card className="bg-light border">
              <Card.Body>
                <Row>
                  <Col md={3}>
                    <div className="text-dark">
                      <strong>Solicitud:</strong> <span className="text-primary fw-bold">{data.solicitud.solicitud_id}</span><br/>
                      <strong>Estado:</strong> <Badge bg="primary">{data.solicitud.estado}</Badge>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="text-dark">
                      <strong>Fecha:</strong> <span className="text-dark">{new Date(data.solicitud.fecha).toLocaleDateString()}</span><br/>
                      <strong>Solicitante:</strong> <span className="text-dark">{data.solicitud.solicitante}</span>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="text-dark">
                      <strong>Proveedor:</strong> <span className="text-dark">{data.solicitud.proveedor || 'Múltiples'}</span><br/>
                      <strong>Items:</strong> <span className="text-primary fw-bold">{data.metricas_trazabilidad.items_totales}</span>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="text-dark">
                      <strong>Trazabilidad:</strong>
                      <Badge bg={getBadgeVariant(data.beneficios_logrados.trazabilidad_porcentaje)} className="ms-1 fs-6">
                        {data.beneficios_logrados.trazabilidad_porcentaje}%
                      </Badge>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Contenido según tab activo */}
        {activeTab === 'resumen' && (
          <Row>
            <Col md={6}>
              <Card className="mb-3">
                <Card.Header><strong>📊 Métricas de Trazabilidad</strong></Card.Header>
                <Card.Body>
                  <Row className="mb-2">
                    <Col>Items Totales:</Col>
                    <Col><Badge bg="secondary">{data.metricas_trazabilidad.items_totales}</Badge></Col>
                  </Row>
                  <Row className="mb-2">
                    <Col>Items Recibidos:</Col>
                    <Col><Badge bg="info">{data.metricas_trazabilidad.items_recibidos}</Badge></Col>
                  </Row>
                  <Row className="mb-2">
                    <Col>Con Factura Vinculada:</Col>
                    <Col><Badge bg="success">{data.metricas_trazabilidad.items_con_factura}</Badge></Col>
                  </Row>
                  <Row className="mb-3">
                    <Col>Facturas Vinculadas:</Col>
                    <Col><Badge bg="primary">{data.metricas_trazabilidad.facturas_vinculadas}</Badge></Col>
                  </Row>

                  <div className="mb-2">
                    <small className="text-muted">Progreso de Trazabilidad</small>
                    <ProgressBar
                      now={data.beneficios_logrados.trazabilidad_porcentaje}
                      variant={getBadgeVariant(data.beneficios_logrados.trazabilidad_porcentaje)}
                      label={`${data.beneficios_logrados.trazabilidad_porcentaje}%`}
                    />
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6}>
              <Card className="mb-3 border">
                <Card.Header className="bg-success text-white"><strong>💰 Resumen Financiero</strong></Card.Header>
                <Card.Body className="bg-white">
                  <Row className="mb-2">
                    <Col className="text-dark fw-semibold">Valor Estimado:</Col>
                    <Col className="text-end">
                      <strong className="text-dark">${data.resumen_financiero.valor_estimado_total.toLocaleString()}</strong>
                    </Col>
                  </Row>
                  <Row className="mb-2">
                    <Col className="text-dark fw-semibold">Valor Real Recibido:</Col>
                    <Col className="text-end">
                      <strong className="text-dark">${data.resumen_financiero.valor_real_recibido.toLocaleString()}</strong>
                    </Col>
                  </Row>
                  <Row className="mb-2">
                    <Col className="text-dark fw-semibold">Total Facturas:</Col>
                    <Col className="text-end">
                      <strong className="text-dark">${data.resumen_financiero.facturas_registradas_total.toLocaleString()}</strong>
                    </Col>
                  </Row>
                  <hr />
                  <Row>
                    <Col className="text-dark fw-semibold">Diferencia:</Col>
                    <Col className="text-end">
                      {(() => {
                        const diferencia = data.resumen_financiero.valor_real_recibido - data.resumen_financiero.valor_estimado_total;
                        const porcentaje = data.resumen_financiero.valor_estimado_total > 0
                          ? (diferencia / data.resumen_financiero.valor_estimado_total * 100)
                          : 0;
                        return (
                          <span className={diferencia >= 0 ? 'text-success' : 'text-danger'}>
                            <strong>
                              {diferencia >= 0 ? '+' : ''}${diferencia.toLocaleString()}
                              ({porcentaje >= 0 ? '+' : ''}{porcentaje.toFixed(1)}%)
                            </strong>
                          </span>
                        );
                      })()}
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}

        {activeTab === 'trazabilidad' && (
          <Card>
            <Card.Header><strong>🔍 Trazabilidad Completa Items → Recepciones → Facturas</strong></Card.Header>
            <Card.Body>
              <Table striped bordered hover responsive size="sm">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Cant. Solicitada</th>
                    <th>Cant. Recibida</th>
                    <th>Fecha Recepción</th>
                    <th>Factura Vinculada</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {data.trazabilidad_completa.map((item, index) => (
                    <tr key={index}>
                      <td>{item.descripcion}</td>
                      <td>{item.cantidad_solicitada}</td>
                      <td>{item.cantidad_recibida || '-'}</td>
                      <td>{item.fecha_recepcion ? new Date(item.fecha_recepcion).toLocaleDateString() : '-'}</td>
                      <td>
                        {item.prefijo_factura_recepcion && item.numero_factura_recepcion ? (
                          <Badge bg="success">
                            {item.prefijo_factura_recepcion}-{item.numero_factura_recepcion}
                          </Badge>
                        ) : (
                          <Badge bg="secondary">Sin vincular</Badge>
                        )}
                      </td>
                      <td>
                        {!item.recepcion_id ? (
                          <Badge bg="warning">Pendiente</Badge>
                        ) : !item.prefijo_factura_recepcion ? (
                          <Badge bg="info">Recibido</Badge>
                        ) : (
                          <Badge bg="success">Completo</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        )}

        {activeTab === 'precios' && (
          <Card>
            <Card.Header><strong>💰 Análisis de Variaciones de Precios</strong></Card.Header>
            <Card.Body>
              {data.variaciones_precios.length > 0 ? (
                <Table striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Precio Estimado</th>
                      <th>Precio Real</th>
                      <th>Variación</th>
                      <th>Factura</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.variaciones_precios.map((item, index) => (
                      <tr key={index}>
                        <td>{item.item}</td>
                        <td>${item.precio_estimado.toLocaleString()}</td>
                        <td>${item.precio_real.toLocaleString()}</td>
                        <td>
                          <Badge bg={getVariacionColor(item.variacion_porcentaje)}>
                            {item.variacion_porcentaje >= 0 ? '+' : ''}{item.variacion_porcentaje.toFixed(1)}%
                          </Badge>
                        </td>
                        <td>{item.factura}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <Alert variant="info">
                  No hay datos de variación de precios disponibles.
                  Esto ocurre cuando no se han vinculado recepciones a facturas o no hay precios registrados.
                </Alert>
              )}
            </Card.Body>
          </Card>
        )}

        {activeTab === 'cumplimiento' && (
          <Row>
            <Col md={6}>
              <Card className="mb-3">
                <Card.Header><strong>✅ Indicadores de Cumplimiento</strong></Card.Header>
                <Card.Body>
                  <div className="mb-3">
                    <div className="d-flex justify-content-between mb-1">
                      <span>Trazabilidad Completa</span>
                      <Badge bg={data.beneficios_logrados.auditoria_completa ? 'success' : 'warning'}>
                        {data.beneficios_logrados.auditoria_completa ? '✅ SÍ' : '⚠️ NO'}
                      </Badge>
                    </div>
                    <div className="d-flex justify-content-between mb-1">
                      <span>Control de Costos</span>
                      <Badge bg={data.beneficios_logrados.control_costos ? 'success' : 'secondary'}>
                        {data.beneficios_logrados.control_costos ? '✅ SÍ' : '❌ NO'}
                      </Badge>
                    </div>
                    <div className="d-flex justify-content-between mb-1">
                      <span>Conciliación Posible</span>
                      <Badge bg={data.beneficios_logrados.conciliacion_posible ? 'success' : 'secondary'}>
                        {data.beneficios_logrados.conciliacion_posible ? '✅ SÍ' : '❌ NO'}
                      </Badge>
                    </div>
                  </div>

                  <hr />

                  <div className="text-center">
                    <h4>Score de Trazabilidad</h4>
                    <div className="position-relative d-inline-block">
                      <div
                        className={`display-4 fw-bold text-${getBadgeVariant(data.beneficios_logrados.trazabilidad_porcentaje)}`}
                        style={{ fontSize: '3rem' }}
                      >
                        {data.beneficios_logrados.trazabilidad_porcentaje}%
                      </div>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6}>
              <Card className="mb-3">
                <Card.Header><strong>📋 Recomendaciones</strong></Card.Header>
                <Card.Body>
                  {data.beneficios_logrados.trazabilidad_porcentaje < 100 && (
                    <Alert variant="warning">
                      <strong>⚠️ Trazabilidad Incompleta</strong><br/>
                      Faltan {data.metricas_trazabilidad.items_recibidos - data.metricas_trazabilidad.items_con_factura} items por vincular a facturas.
                    </Alert>
                  )}

                  {!data.beneficios_logrados.control_costos && (
                    <Alert variant="info">
                      <strong>💡 Control de Costos</strong><br/>
                      Vincule recepciones a facturas para habilitar análisis de variaciones de precios.
                    </Alert>
                  )}

                  {data.beneficios_logrados.trazabilidad_porcentaje === 100 && (
                    <Alert variant="success">
                      <strong>🎉 ¡Excelente!</strong><br/>
                      Trazabilidad completa lograda. Todos los beneficios están disponibles.
                    </Alert>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}
        </>
        )}

        {/* Mostrar loading si está cargando datos */}
        {solicitudId && solicitudId.trim() !== '' && loading && (
          <div className="text-center py-5">
            <Spinner animation="border" />
            <p className="mt-2">Cargando análisis de trazabilidad para {solicitudId}...</p>
          </div>
        )}

        {/* Mostrar mensaje cuando hay solicitud seleccionada pero sin datos aún */}
        {solicitudId && solicitudId.trim() !== '' && !loading && !error && !data && (
          <Alert variant="info">
            <h6>🔄 Preparando análisis...</h6>
            <p>Solicitud <strong>{solicitudId}</strong> seleccionada. Haga clic en cargar datos para ver el análisis de trazabilidad.</p>
            <Button variant="primary" size="sm" onClick={fetchTrazabilidadData}>
              📊 Cargar Análisis de Trazabilidad
            </Button>
          </Alert>
        )}

        {/* Mostrar error si hay algún error */}
        {error && (
          <Alert variant="danger">
            <strong>❌ Error al cargar datos</strong>
            <div className="mt-2">
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.9em' }}>{error}</pre>
            </div>
            {error.includes('no encontrada') && (
              <div className="mt-3">
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => {
                    setSolicitudId('');
                    setError('');
                    if (!solicitudes.length) fetchSolicitudes();
                  }}
                >
                  🔄 Seleccionar otra solicitud
                </Button>
              </div>
            )}
          </Alert>
        )}
      </Modal.Body>
      <Modal.Footer>
        <small className="text-muted me-auto">
          📊 Dashboard de Trazabilidad - {solicitudId ? `Solicitud: ${solicitudId}` : 'Seleccione una solicitud'}
        </small>
        <Button variant="secondary" onClick={onHide}>
          Cerrar
        </Button>
      </Modal.Footer>
    </Modal>
  );
}