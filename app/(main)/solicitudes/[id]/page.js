'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Container, Row, Col, Card, Table, Button, Spinner, Form, InputGroup, Badge } from 'react-bootstrap';
import Link from 'next/link';
import PrintableSolicitud from '@/components/PrintableSolicitud';
import RecepcionModal from '@/components/RecepcionModal'; // Importar el nuevo modal
import styles from './page.module.css'; // Import the CSS module
import { preloadImagesForPrint } from '@/lib/imagePreloader';

export default function SolicitudDetallePage() {
  const { id } = useParams();
  const [solicitud, setSolicitud] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [printingSolicitud, setPrintingSolicitud] = useState(null);
  const [readyToPrint, setReadyToPrint] = useState(false);

  // Estados para el modal de recepción
  const [showRecepcionModal, setShowRecepcionModal] = useState(false);

  // Estados para la acción de aprobación
  const [isApproving, setIsApproving] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState('');
  const [approvalComment, setApprovalComment] = useState('');
  const [approvalVariant, setApprovalVariant] = useState('info'); // Estado para el color de la alerta de aprobación

  const [isEditingItems, setIsEditingItems] = useState(false); // Nuevo estado para controlar el modo de edición de ítems
  const [editedItems, setEditedItems] = useState([]); // Nuevo estado para los ítems editados temporalmente
  const [isSavingItems, setIsSavingItems] = useState(false); // Nuevo estado para el guardado de ítems
  const [itemEditError, setItemEditError] = useState(''); // Nuevo estado para errores de edición de ítems

  const fetchData = async () => {
    setLoading(true);
    try {
      const sessionResponse = await fetch('/api/session');
      if (sessionResponse.ok) {
        const { user } = await sessionResponse.json();
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
      }

      const response = await fetch(`/api/solicitudes/${id}`);
      if (!response.ok) {
        throw new Error('No se pudieron cargar los detalles de la solicitud.');
      }
      const data = await response.json();
      setSolicitud(data);
      // Initialize editedItems with a deep copy
      setEditedItems(data.items ? data.items.map(item => ({ ...item })) : []);

    } catch (err) {
      console.error('Error al obtener detalles de solicitud o sesión:', err);
      setError(err.message || 'Error al cargar los detalles de la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const handleApprove = async () => {
    setIsApproving(true);
    setApprovalMessage('Procesando aprobación...');
    setApprovalVariant('info');

    try {
      const response = await fetch(`/api/solicitudes/${id}/aprobar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comentario: approvalComment }),
      });

      const result = await response.json();

      if (response.ok) {
        setApprovalMessage('Aprobación registrada con éxito.');
        setApprovalVariant('success');
        await fetchData(); // Recargar todos los datos
        setTimeout(() => setApprovalMessage(''), 5000); // Clear after 5 seconds
      } else {
        throw new Error(result.message || 'Error al registrar la aprobación.');
      }
    } catch (err) {
      console.error('Error al aprobar:', err);
      setApprovalMessage(err.message);
      setApprovalVariant('danger');
    } finally {
      setIsApproving(false);
    }
  };

  const handleItemChange = (itemId, field, value) => {
    setEditedItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId ? { ...item, [field]: value } : item
      )
    );
  };

  const handleSaveItems = async () => {
    setIsSavingItems(true);
    setItemEditError('');
    try {
      const response = await fetch(`/api/solicitudes/${solicitud.solicitud_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          solicitud_id: solicitud.solicitud_id, // Ensure this matches the API's expectation
          items: editedItems.map(item => ({
            id: item.id,
            necesidad: item.necesidad,
            descripcion: item.descripcion,
            especificaciones: item.especificaciones,
            cantidad: parseInt(item.cantidad),
            observaciones: item.observaciones,
            ruta_imagen: item.ruta_imagen,
          })),
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setIsEditingItems(false);
        await fetchData(); // Recargar todos los datos para reflejar los cambios guardados
      } else {
        throw new Error(result.message || 'Error al guardar los ítems.');
      }
    } catch (err) {
      console.error('Error al guardar ítems:', err);
      setItemEditError(err.message);
    } finally {
      setIsSavingItems(false);
    }
  };

  const handleCancelEditItems = () => {
    setIsEditingItems(false);
    setEditedItems(solicitud.items ? solicitud.items.map(item => ({ ...item })) : []); // Reset to original
    setItemEditError('');
  };

  const handlePrint = async () => {
    if (solicitud) {
      console.log('🖨️ Preparando impresión de solicitud...');

      // Precargar imágenes
      try {
        await preloadImagesForPrint(['/logo.png']);
        console.log('✅ Logo precargado para solicitud');
      } catch (error) {
        console.warn('⚠️ Error precargando logo:', error);
      }

      setReadyToPrint(false);
      setPrintingSolicitud(solicitud);
    }
  };

  // Callback para cuando la imagen del logo esté cargada
  const handleImageLoad = () => {
    setReadyToPrint(true);
  };

  const handleReceptionSuccess = () => {
    fetchData(); // Recargar los datos para mostrar la información actualizada
  };

  useEffect(() => {
    const handleAfterPrint = () => {
      document.body.classList.remove('is-printing');
      setPrintingSolicitud(null);
      setReadyToPrint(false);
    };

    if (printingSolicitud && readyToPrint) {
      document.body.classList.add('is-printing');
      window.addEventListener('afterprint', handleAfterPrint, { once: true });
      // Pequeño delay para asegurar el renderizado completo
      setTimeout(() => {
        window.print();
      }, 100);
    } else if (printingSolicitud && !readyToPrint) {
      // Si aún no está lista la imagen, forzar después de un tiempo
      setTimeout(() => {
        if (!readyToPrint) {
          document.body.classList.add('is-printing');
          window.addEventListener('afterprint', handleAfterPrint, { once: true });
          window.print();
        }
      }, 500);
    }

    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
      document.body.classList.remove('is-printing');
    };
  }, [printingSolicitud, readyToPrint]);

  if (loading) {
    return (
      <Container className="my-5 text-center">
        <Spinner animation="border" />
        <p>Cargando detalles de solicitud...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="my-5">
        <Alert variant="danger">{error}</Alert>
        <Button as={Link} href="/mis-solicitudes" variant="secondary">Volver</Button>
      </Container>
    );
  }

  if (!solicitud) {
    return (
      <Container className="my-5">
        <Alert variant="warning">Solicitud no encontrada.</Alert>
        <Button as={Link} href="/mis-solicitudes" variant="secondary">Volver</Button>
      </Container>
    );
  }

  // Lógica para determinar si el usuario actual puede aprobar
  const nextApproval = solicitud.historial_firmas?.find(firma => firma.estado === 'pendiente');
  const canApprove = nextApproval && currentUser && nextApproval.aprobador_id === currentUser.id;
  const canReceive = solicitud.estado === 'aprobada' && (currentUser?.rol?.toLowerCase() === 'administrador' || currentUser?.rol?.toLowerCase() === 'bodega');

  return (
    <>
      {printingSolicitud && <PrintableSolicitud solicitud={printingSolicitud} assetBaseUrl={window.location.origin} />}

      <RecepcionModal
        show={showRecepcionModal}
        onHide={() => setShowRecepcionModal(false)}
        solicitud={solicitud}
        onReceptionSuccess={handleReceptionSuccess}
      />

      <Container className="my-5 nonPrintable">
        <Card className="shadow-sm">
          <Card.Header as="h2" className="d-flex justify-content-between align-items-center">
            <span>Detalle de Solicitud - {solicitud.solicitud_id}</span>
            {canReceive && (
              <Button variant="success" onClick={() => setShowRecepcionModal(true)}>
                Registrar Recepción
              </Button>
            )}
          </Card.Header>
          <Card.Body>
            <Row className="mb-3">
              <Col md={6}>
                <p><strong>DEPENDENCIA:</strong> {solicitud.usuario_dependencia}</p>
                <p><strong>SOLICITANTE:</strong> {solicitud.usuario_nombre}</p>
                <p><strong>FECHA:</strong> {new Date(solicitud.fecha_solicitud).toLocaleDateString()}</p>
              </Col>
              <Col md={6}>
                <p><strong>PROVEEDOR:</strong> {solicitud.proveedor_nombre}</p>
                <p><strong>ESTADO:</strong> <Badge bg={solicitud.estado === 'aprobada' ? 'success' : 'warning'}>{solicitud.estado.replace('_', ' ').toUpperCase()}</Badge></p>
              </Col>
            </Row>

            <h4 className="mt-4 mb-3">Productos Solicitados</h4>
            {itemEditError && <Alert variant="danger">{itemEditError}</Alert>}
            {canApprove && (
              <div className="d-flex justify-content-end mb-3">
                {!isEditingItems ? (
                  <Button variant="outline-primary" size="sm" onClick={() => setIsEditingItems(true)}>
                    Editar Items
                  </Button>
                ) : (
                  <>
                    <Button variant="outline-secondary" size="sm" onClick={handleCancelEditItems} className="me-2" disabled={isSavingItems}>
                      Cancelar Edición
                    </Button>
                    <Button variant="outline-primary" size="sm" onClick={handleSaveItems} disabled={isSavingItems}>
                      {isSavingItems ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> : 'Guardar Cambios'}
                    </Button>
                  </>
                )}
              </div>
            )}
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>Descripción</th>
                  <th>Especificaciones</th>
                  <th className="text-center">Cant. Solicitada</th>
                  <th className="text-center">Cant. Recibida</th>
                  <th className="text-center">Cant. Pendiente</th>
                </tr>
              </thead>
              <tbody>
                {(isEditingItems ? editedItems : solicitud.items)?.map(item => {
                  const cantidadRecibida = item.cantidad_recibida || 0;
                  const cantidadPendiente = item.cantidad - cantidadRecibida;
                  return (
                    <tr key={item.id}>
                      <td>
                        {isEditingItems ? (
                          <Form.Control
                            type="text"
                            name="descripcion"
                            value={item.descripcion}
                            onChange={(e) => handleItemChange(item.id, 'descripcion', e.target.value)}
                            disabled={isSavingItems}
                          />
                        ) : (
                          item.descripcion
                        )}
                      </td>
                      <td>
                        {isEditingItems ? (
                          <Form.Control
                            type="text"
                            name="especificaciones"
                            value={item.especificaciones || ''}
                            onChange={(e) => handleItemChange(item.id, 'especificaciones', e.target.value)}
                            disabled={isSavingItems}
                          />
                        ) : (
                          item.especificaciones
                        )}
                      </td>
                      <td className="text-center">
                        {isEditingItems ? (
                          <Form.Control
                            type="number"
                            name="cantidad"
                            value={item.cantidad}
                            onChange={(e) => handleItemChange(item.id, 'cantidad', e.target.value)}
                            disabled={isSavingItems}
                          />
                        ) : (
                          item.cantidad
                        )}
                      </td>
                      <td className="text-center">{cantidadRecibida}</td>
                      <td className="text-center">{cantidadPendiente}</td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>

            {solicitud.notas_adicionales && (
                <p><strong>Notas Adicionales:</strong> {solicitud.notas_adicionales}</p>
            )}

          </Card.Body>

          {/* SECCIÓN DE HISTORIAL DE APROBACIONES */}
          {solicitud.historial_firmas && solicitud.historial_firmas.length > 0 && (
            <Card.Footer>
              <h4 className="mb-3">Historial de Aprobaciones</h4>
              <Table striped bordered size="sm">
                <thead>
                  <tr>
                    <th>Orden</th>
                    <th>Aprobador</th>
                    <th>Estado</th>
                    <th>Fecha</th>
                    <th>Comentario</th>
                  </tr>
                </thead>
                <tbody>
                  {solicitud.historial_firmas.map(firma => (
                    <tr key={firma.orden}>
                      <td>{firma.orden}</td>
                      <td>{firma.nombre_aprobador}</td>
                      <td>
                        <Badge bg={firma.estado === 'aprobado' ? 'success' : 'warning'}>
                          {firma.estado.toUpperCase()}
                        </Badge>
                      </td>
                      <td>{firma.fecha_decision ? new Date(firma.fecha_decision).toLocaleString() : 'N/A'}</td>
                      <td>{firma.comentario || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Footer>
          )}

          {/* SECCIÓN DE ACCIÓN DE APROBACIÓN */}
          {canApprove && (
            <Card.Footer className="bg-light">
              <h4 className="mb-3">Acción Requerida: Aprobar Solicitud</h4>
              {approvalMessage && (
                <div className={styles.successContainer}>
                  <h2 className={styles.successTitle}>¡Aprobación Exitosa!</h2>
                  <p className={styles.successInfo}>{approvalMessage}</p>
                </div>
              )}
              <Form.Group className="mb-3">
                <Form.Label>Añadir Comentario (Opcional)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  disabled={isApproving}
                />
              </Form.Group>
              <Button variant="success" onClick={handleApprove} disabled={isApproving}>
                {isApproving ? <><Spinner as="span" animation="border" size="sm" /> Aprobando...</> : 'Aprobar y Firmar Digitalmente'}
              </Button>
            </Card.Footer>
          )}

          <Card.Footer className="text-end">
            <Button variant="info" className="me-2" onClick={handlePrint}>Imprimir</Button>
            <Button as={Link} href="/solicitudes" variant="outline-secondary">Volver a Solicitudes</Button>
          </Card.Footer>
        </Card>
      </Container>
    </>
  );
}