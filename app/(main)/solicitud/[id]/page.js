'use client';

import { useEffect, useState, use } from 'react';
import { Container, Card, Spinner, Alert, Row, Col, Table, Modal, Form, ProgressBar, Button, ListGroup, Badge, Dropdown, Accordion } from 'react-bootstrap';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import styles from './page.module.css';
import PrintableSolicitud from '@/components/PrintableSolicitud';
import RegistroFacturaModal from '@/components/RegistroFacturaModal';
import FacturaViewerModal from '@/components/FacturaViewerModal';
import { useAppSettings } from '../../../context/SettingsContext';
import EditarItemModal from './EditarItemModal';
import { preloadImagesForPrint } from '@/lib/imagePreloader';

// Helper function to get a Bootstrap badge color based on the status
const getStatusBadge = (status) => {
  switch (status) {
    case 'aprobada':
    case 'aprobado':
      return 'success';
    case 'autorizado':
    case 'autorizada':
      return 'info';
    case 'rechazada':
    case 'rechazado':
      return 'danger';
    case 'en proceso':
      return 'primary';
    case 'pendiente':
      return 'warning';
    case 'cerrada':
      return 'dark';
    case 'cancelado':
      return 'secondary';
    case 'omitido':
      return 'light';
    default:
      return 'secondary';
  }
};

// Componente para el modal de gestión de un solo item
function GestionarItemModal({ show, onHide, item, onSave, loading, proveedorId }) {
  const [nuevaRecepcion, setNuevaRecepcion] = useState({
    cantidad_recibida: '',
    comentario: '',
    precio_unitario: '',
    prefijo_factura: '',
    numero_factura: '',
    usar_factura_existente: true
  });
  const [error, setError] = useState('');
  const [facturas, setFacturas] = useState([]);
  const [preciosHistoricos, setPreciosHistoricos] = useState([]);

  // Cargar facturas del proveedor
  useEffect(() => {
    if (show && proveedorId) {
      fetch(`/api/facturas-compras/list?proveedorId=${proveedorId}`)
        .then(res => res.json())
        .then(data => setFacturas(data))
        .catch(err => console.error('Error cargando facturas:', err));
    }
  }, [show, proveedorId]);

  // Cargar precios históricos del producto
  useEffect(() => {
    if (show && item && item.descripcion) {
      fetch(`/api/comparador-precios-simple?descripcion=${encodeURIComponent(item.descripcion)}`)
        .then(res => res.json())
        .then(data => {
          if (data.historial_precios) {
            setPreciosHistoricos(data.historial_precios);
          }
        })
        .catch(err => console.error('Error cargando precios históricos:', err));
    }
  }, [show, item]);

  // Reset state when item changes
  useEffect(() => {
    if (item) {
      setNuevaRecepcion({
        cantidad_recibida: '',
        comentario: '',
        precio_unitario: item.precio_unitario || '',
        prefijo_factura: '',
        numero_factura: '',
        usar_factura_existente: true
      });
      setError('');
    }
  }, [item]);

  if (!item) return null;

  const handleSave = () => {
    if (!nuevaRecepcion.cantidad_recibida || Number(nuevaRecepcion.cantidad_recibida) <= 0) {
      setError('La cantidad recibida es obligatoria y debe ser mayor a cero.');
      return;
    }

    // Validación de precio: alertar si difiere más del 20% del precio original
    const precioOriginal = parseFloat(item.precio_unitario) || 0;
    const precioNuevo = parseFloat(nuevaRecepcion.precio_unitario) || 0;

    if (precioOriginal > 0 && precioNuevo > 0) {
      const diferencia = Math.abs((precioNuevo - precioOriginal) / precioOriginal) * 100;
      if (diferencia > 20) {
        const confirmar = window.confirm(
          `⚠️ ALERTA DE PRECIO:\n\n` +
          `Precio original: $${precioOriginal.toLocaleString()}\n` +
          `Precio nuevo: $${precioNuevo.toLocaleString()}\n` +
          `Diferencia: ${diferencia.toFixed(1)}%\n\n` +
          `¿Está seguro de continuar con este precio?`
        );
        if (!confirmar) return;
      }
    }

    setError('');
    onSave(item.id, nuevaRecepcion);
  };

  const cantidadPendiente = item.cantidad - item.cantidad_recibida;

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Gestionar Ítem: {item.descripcion}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
        <Row className="mb-3">
            <Col><strong>Cantidad Solicitada:</strong> {item.cantidad}</Col>
            <Col><strong>Cantidad Recibida:</strong> {item.cantidad_recibida}</Col>
            <Col><strong>Cantidad Pendiente:</strong> {cantidadPendiente}</Col>
        </Row>

        <h5>Historial de Recepciones</h5>
        <Table striped bordered size="sm">
          <thead><tr><th>Fecha</th><th>Cantidad</th><th>Factura</th><th>Comentario</th></tr></thead>
          <tbody>
            {item.recepciones && item.recepciones.length > 0 ? (
              item.recepciones.map(r => {
                const facturaDisplay = r.prefijo_factura_recepcion && r.numero_factura_recepcion
                  ? `${r.prefijo_factura_recepcion}-${r.numero_factura_recepcion}`
                  : r.numero_factura_recepcion || 'N/A';
                return (
                  <tr key={r.id}>
                    <td>{new Date(r.fecha_recepcion).toLocaleDateString()}</td>
                    <td>{r.cantidad_recibida}</td>
                    <td>{facturaDisplay}</td>
                    <td>{r.comentario}</td>
                  </tr>
                );
              })
            ) : (
              <tr><td colSpan="4" className="text-center">No hay recepciones registradas.</td></tr>
            )}
          </tbody>
        </Table>

        <hr />

        <h5>Añadir Nueva Recepción</h5>
        {cantidadPendiente > 0 ? (
            <Form>
                <Row className="gy-3">
                    <Col md={4}>
                        <Form.Group>
                            <Form.Label>Cantidad Recibida</Form.Label>
                            <Form.Control required type="number" value={nuevaRecepcion.cantidad_recibida} onChange={e => setNuevaRecepcion({...nuevaRecepcion, cantidad_recibida: e.target.value})} placeholder={`Max: ${cantidadPendiente}`} />
                        </Form.Group>
                    </Col>
                     <Col md={4}>
                        <Form.Group>
                            <Form.Label>
                              Precio Unitario Real
                              {item.precio_unitario && (
                                <small className="text-muted d-block">
                                  Estimado: ${parseFloat(item.precio_unitario).toLocaleString()}
                                </small>
                              )}
                            </Form.Label>
                            <div className="d-flex gap-2">
                              <Form.Control
                                type="number"
                                step="0.01"
                                value={nuevaRecepcion.precio_unitario}
                                onChange={e => setNuevaRecepcion({...nuevaRecepcion, precio_unitario: e.target.value})}
                                placeholder={item.precio_unitario || "Ej: 15000"}
                                className={(() => {
                                  const original = parseFloat(item.precio_unitario) || 0;
                                  const actual = parseFloat(nuevaRecepcion.precio_unitario) || 0;
                                  if (original > 0 && actual > 0) {
                                    const diff = Math.abs((actual - original) / original) * 100;
                                    if (diff > 20) return "border-warning";
                                    if (diff > 10) return "border-info";
                                  }
                                  return "";
                                })()}
                              />
                              {preciosHistoricos.length > 0 && (
                                <Button
                                  variant="outline-info"
                                  size="sm"
                                  title="Ver precios históricos"
                                  onClick={() => {
                                    const precios = preciosHistoricos.map(h =>
                                      `$${parseFloat(h.precio_unitario).toLocaleString()} (${h.proveedor_nombre || 'S/P'})`
                                    ).join('\n');
                                    const promedio = preciosHistoricos.reduce((sum, h) => sum + parseFloat(h.precio_unitario), 0) / preciosHistoricos.length;
                                    alert(`📊 PRECIOS HISTÓRICOS:\n\n${precios}\n\n📈 Promedio: $${promedio.toLocaleString()}`);
                                  }}
                                >
                                  📊
                                </Button>
                              )}
                            </div>
                            {(() => {
                              const original = parseFloat(item.precio_unitario) || 0;
                              const actual = parseFloat(nuevaRecepcion.precio_unitario) || 0;
                              if (original > 0 && actual > 0) {
                                const diff = ((actual - original) / original) * 100;
                                if (Math.abs(diff) > 5) {
                                  return (
                                    <small className={`d-block mt-1 ${
                                      Math.abs(diff) > 20 ? 'text-warning fw-bold' :
                                      Math.abs(diff) > 10 ? 'text-info' : 'text-secondary'
                                    }`}>
                                      {diff > 0 ? '📈' : '📉'} {diff > 0 ? '+' : ''}{diff.toFixed(1)}% vs estimado
                                    </small>
                                  );
                                }
                              }
                              return null;
                            })()}
                        </Form.Group>
                    </Col>
                    <Col md={4}>
                        <Form.Group>
                            <Form.Label>Comentario</Form.Label>
                            <Form.Control as="textarea" rows={1} value={nuevaRecepcion.comentario} onChange={e => setNuevaRecepcion({...nuevaRecepcion, comentario: e.target.value.toUpperCase()})} />
                        </Form.Group>
                    </Col>
                </Row>

                <hr />
                <h6>Información de Factura (Opcional)</h6>
                <Row className="gy-3 mb-3">
                    <Col md={12}>
                        <Form.Check
                            type="radio"
                            label="Seleccionar de facturas existentes"
                            name="tipoFactura"
                            checked={nuevaRecepcion.usar_factura_existente}
                            onChange={() => setNuevaRecepcion({...nuevaRecepcion, usar_factura_existente: true, prefijo_factura: '', numero_factura: ''})}
                        />
                        <Form.Check
                            type="radio"
                            label="Ingresar manualmente"
                            name="tipoFactura"
                            checked={!nuevaRecepcion.usar_factura_existente}
                            onChange={() => setNuevaRecepcion({...nuevaRecepcion, usar_factura_existente: false})}
                        />
                    </Col>
                </Row>
                <Row className="gy-3">
                    {nuevaRecepcion.usar_factura_existente ? (
                        <Col md={12}>
                            <Form.Group>
                                <Form.Label>Factura Registrada</Form.Label>
                                <Form.Select
                                    value={`${nuevaRecepcion.prefijo_factura || ''}-${nuevaRecepcion.numero_factura || ''}`}
                                    onChange={e => {
                                        if (e.target.value) {
                                            const parts = e.target.value.split('-');
                                            setNuevaRecepcion({
                                                ...nuevaRecepcion,
                                                prefijo_factura: parts[0] || '',
                                                numero_factura: parts.slice(1).join('-') || ''
                                            });
                                        } else {
                                            setNuevaRecepcion({...nuevaRecepcion, prefijo_factura: '', numero_factura: ''});
                                        }
                                    }}
                                >
                                    <option value="">Sin factura</option>
                                    {facturas.map(f => {
                                      const fecha = f.fecha_emision ? new Date(f.fecha_emision).toLocaleDateString() : 'Sin fecha';
                                      let total = 'Calculando...';

                                      if (f.total && parseFloat(f.total) > 0) {
                                        total = `$${parseFloat(f.total).toLocaleString()}`;
                                      } else if (f.subtotal && parseFloat(f.subtotal) > 0) {
                                        // Si no hay total pero sí subtotal, usarlo como referencia
                                        total = `≈$${parseFloat(f.subtotal).toLocaleString()} (subtotal)`;
                                      } else {
                                        total = '⚠️ Sin calcular';
                                      }

                                      return (
                                        <option key={f.id} value={`${f.prefijo}-${f.numero_factura}`}>
                                            {f.prefijo}-{f.numero_factura} • {fecha} • {total}
                                        </option>
                                      );
                                    })}
                                </Form.Select>
                                {nuevaRecepcion.prefijo_factura && nuevaRecepcion.numero_factura && (
                                  <div className="mt-2">
                                    <small className="text-success d-block">
                                      ✅ <strong>Vinculación configurada:</strong> Esta recepción se asociará a {nuevaRecepcion.prefijo_factura}-{nuevaRecepcion.numero_factura}
                                    </small>
                                    <small className="text-muted d-block mt-1">
                                      💡 <strong>Beneficios:</strong> Trazabilidad contable completa, control de pagos, análisis de costos por factura
                                    </small>
                                  </div>
                                )}
                            </Form.Group>
                        </Col>
                    ) : (
                        <>
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label>Prefijo</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={nuevaRecepcion.prefijo_factura}
                                        onChange={e => setNuevaRecepcion({...nuevaRecepcion, prefijo_factura: e.target.value.toUpperCase()})}
                                        placeholder="Ej: FAC"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={8}>
                                <Form.Group>
                                    <Form.Label>Número de Factura</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={nuevaRecepcion.numero_factura}
                                        onChange={e => setNuevaRecepcion({...nuevaRecepcion, numero_factura: e.target.value.toUpperCase()})}
                                        placeholder="Ej: 123456"
                                    />
                                </Form.Group>
                            </Col>
                        </>
                    )}
                </Row>
            </Form>
        ) : (
            <Alert variant="success">Este ítem ya ha sido completado.</Alert>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onHide}>Cancelar</Button>
        {cantidadPendiente > 0 &&
            <Button variant="outline-primary" onClick={handleSave} disabled={loading}>{loading ? 'Guardando...' : 'Guardar Recepción'}</Button>
        }
      </Modal.Footer>
    </Modal>
  );
}

export default function SolicitudDetailPage({ params }) {
  const { id } = use(params);
  const [solicitud, setSolicitud] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accionLoading, setAccionLoading] = useState(false);
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [readyToPrint, setReadyToPrint] = useState(false);

  const [showManageItemModal, setShowManageItemModal] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [itemToEdit, setItemToEdit] = useState(null);
  const [showRegistroFacturaModal, setShowRegistroFacturaModal] = useState(false);
  const [showFacturaViewerModal, setShowFacturaViewerModal] = useState(false);
  const [facturaToView, setFacturaToView] = useState(null);
  const [facturaToViewType, setFacturaToViewType] = useState(null); // Nuevo estado
  const { appSettings, loadingAppSettings } = useAppSettings();

  const fetchSolicitud = async () => {
    if (!loading) setLoading(true);
    try {
      const response = await fetch(`/api/solicitudes/${id}`);
      if (response.ok) {
        const data = await response.json();
        setSolicitud(data);
        return data;
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Error al cargar la solicitud.');
      }
    } catch (err) {
      setError('Error de red o servidor inalcanzable.');
    } finally {
      setLoading(false);
    }
    return null;
  };

  useEffect(() => {
    if (id) {
      fetch('/api/session').then(res => res.json()).then(data => setSession(data));
      fetchSolicitud();
    }
  }, [id]);

  const handleAdminAction = async (action) => {
    let body = {};
    let endpoint = `/api/solicitudes/${id}/${action}`;

    if (action === 'rechazar') {
        const { value: reason } = await Swal.fire({
            title: 'Justificar Rechazo',
            input: 'textarea',
            inputLabel: 'Por favor justifica porque fue rechazada la solicitud de compra',
            inputPlaceholder: 'Por ejemplo: no fue autorizada por gerencia general',
            showCancelButton: true,
            confirmButtonText: 'Rechazar Solicitud',
            cancelButtonText: 'Cancelar',
            showLoaderOnConfirm: true,
            buttonsStyling: false,
            customClass: {
                confirmButton: 'btn btn-outline-danger mx-2',
                cancelButton: 'btn btn-outline-secondary mx-2'
            },
            preConfirm: (text) => {
                if (!text) {
                    Swal.showValidationMessage('La justificación es obligatoria');
                }
                return text;
            }
        });

        if (!reason) return;
        body = { comentario: reason };

    } else if (action === 'aprobar') {
        const accionTexto = isCurrentUserApprover ? 'AUTORIZADA' : 'APROBADA';
        const botonTexto = isCurrentUserApprover ? '¡autorizar!' : '¡aprobar!';
        const result = await Swal.fire({
            title: '¿Está seguro?',
            text: `Esta acción marcará la solicitud como ${accionTexto} y notificará al solicitante. ¿Desea continuar?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: `Sí, ${botonTexto}`,
            cancelButtonText: 'Cancelar'
        });

        if (!result.isConfirmed) return;
    }

    setAccionLoading(true);
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || `Error al ${action} la solicitud.`);
        }

        Swal.fire(`¡Acción completada!`, `La solicitud ha sido marcada.`, 'success');
        await fetchSolicitud();
    } catch (err) {
        setError(err.message);
        Swal.fire('Error', err.message, 'error');
    } finally {
        setAccionLoading(false);
    }
  };

  const handleDeleteImage = async (itemId) => {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: "Esta acción eliminará la imagen adjunta a este ítem. La acción no se puede deshacer.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, ¡eliminar imagen!',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    setAccionLoading(true);
    try {
      const response = await fetch('/api/solicitudes/items/delete-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Error al eliminar la imagen.');
      Swal.fire('¡Eliminada!', 'La imagen ha sido eliminada.', 'success');
      await fetchSolicitud();
    } catch (err) {
      setError(err.message);
      Swal.fire('Error', err.message, 'error');
    } finally {
      setAccionLoading(false);
    }
  };

  const handleOpenManageModal = (item) => {
    setCurrentItem(item);
    setShowManageItemModal(true);
  };
  const handleCloseManageModal = () => {
    setCurrentItem(null);
    setShowManageItemModal(false);
  }

  const handleOpenEditItemModal = (item) => {
    setItemToEdit(item);
    setShowEditItemModal(true);
  };

  const handleCloseEditItemModal = () => {
    setItemToEdit(null);
    setShowEditItemModal(false);
  };

  const handleEditItemSave = async (updatedItem) => {
    setAccionLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/solicitudes/items/${updatedItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedItem),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Error al actualizar el ítem.');
      Swal.fire('Éxito', 'Ítem actualizado correctamente', 'success');
      handleCloseEditItemModal();
      await fetchSolicitud();
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    } finally {
      setAccionLoading(false);
    }
  };

  const handleDeleteItem = async (itemId) => {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: "Esta acción eliminará el ítem de la solicitud. ¿Desea continuar?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, ¡eliminar!',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    setAccionLoading(true);
    try {
      const response = await fetch(`/api/solicitudes/items/${itemId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Error al eliminar el ítem.');
      Swal.fire('¡Eliminado!', 'El ítem ha sido eliminado.', 'success');
      await fetchSolicitud();
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    } finally {
      setAccionLoading(false);
    }
  };

  const handleShowRegistroFacturaModal = () => setShowRegistroFacturaModal(true);
  const handleCloseRegistroFacturaModal = () => setShowRegistroFacturaModal(false);

  const handleDeleteFactura = async (facturaId, tipoFactura = 'simple') => {
    const confirmText = '¿Estás seguro de que deseas eliminar esta factura? Esta acción no se puede deshacer.';
    if (!confirm(confirmText)) return;

    setAccionLoading(true);
    try {
      const url = tipoFactura === 'simple' ? `/api/facturas/${facturaId}` : `/api/facturas-compras/${facturaId}`;
      const response = await fetch(url, { method: 'DELETE' });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al eliminar la factura.');
      }
      alert('Factura eliminada correctamente.');
      await fetchSolicitud();
    } catch (err) {
      setError(err.message);
    } finally {
      setAccionLoading(false);
    }
  };

  const handleSaveRecepcion = async (id_solicitud_item, recepcionData) => {
    setAccionLoading(true);
    setError('');
    try {
        const response = await fetch(`/api/mis-solicitudes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...recepcionData,
                id_solicitud_item,
                precio_unitario: recepcionData.precio_unitario,
                prefijo_factura_recepcion: recepcionData.prefijo_factura || null,
                numero_factura_recepcion: recepcionData.numero_factura || null
            }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Error al guardar la recepción.');
        handleCloseManageModal();
        await fetchSolicitud();
    } catch (err) {
        alert(err.message);
    }
    finally {
        setAccionLoading(false);
    }
  }

  const handleApprovalAction = async (action) => {
    let comentario = '';
    if (action === 'rechazar') {
      const { value: reason } = await Swal.fire({
        title: 'Justificar Rechazo',
        input: 'textarea',
        inputLabel: 'Por favor, justifique por qué se rechaza la solicitud.',
        inputPlaceholder: 'Escriba aquí el motivo...',
        showCancelButton: true,
        confirmButtonText: 'Rechazar Solicitud',
        cancelButtonText: 'Cancelar',
        preConfirm: (text) => {
          if (!text) Swal.showValidationMessage('La justificación es obligatoria');
          return text;
        }
      });
      if (!reason) return;
      comentario = reason;
    } else {
      // Determinar si es aprobador o administrador para el mensaje
      const esAprobador = session?.user?.rol?.toLowerCase() === 'aprobador';
      const accion = esAprobador ? 'autorizar' : 'aprobar';
      const accionMayuscula = esAprobador ? 'Autorizar' : 'Aprobar';

      const result = await Swal.fire({
        title: `¿Confirmar ${accionMayuscula}?`,
        text: `La solicitud avanzará al siguiente paso. ¿Desea continuar?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: `Sí, ${accion}`,
        cancelButtonText: 'Cancelar'
      });
      if (!result.isConfirmed) return;
    }

    setAccionLoading(true);
    try {

      // Cualquier aprobador de la dependencia puede tomar la aprobación
      const pendingApprovalTask = solicitud.historial_firmas.find(
        (approval) => approval.estado === 'pendiente'
      );

      if (!pendingApprovalTask) {
        throw new Error('No hay tareas de aprobación pendientes para esta solicitud.');
      }

      const response = await fetch(`/api/solicitud-aprobaciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aprobacionId: pendingApprovalTask.id,
          action: action,
          comentario: comentario,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      // Mensaje de éxito diferenciado
      const esAprobador = session?.user?.rol?.toLowerCase() === 'aprobador';
      const accionRealizada = esAprobador ? 'autorizada' : (action === 'aprobar' ? 'aprobada' : 'rechazada');

      Swal.fire('Éxito', `La solicitud ha sido ${accionRealizada}.`, 'success');
      await fetchSolicitud();
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    } finally {
      setAccionLoading(false);
    }
  };

  const handleShowFacturaViewerModal = (filename, tipo) => {
    setFacturaToView(filename);
    setFacturaToViewType(tipo);
    setShowFacturaViewerModal(true);
  };

  const handleCloseFacturaViewerModal = () => {
    setFacturaToView(null);
    setFacturaToViewType(null); // Resetear el tipo también
    setShowFacturaViewerModal(false);
  };

  const handlePrint = async () => {
    console.log('🖨️ Iniciando impresión...');

    // Precargar imágenes antes de imprimir
    const imagesToPreload = ['/logo.png'];

    try {
      await preloadImagesForPrint(imagesToPreload);
      console.log('✅ Imágenes precargadas para impresión');
    } catch (error) {
      console.warn('⚠️ Error precargando imágenes:', error);
    }

    setReadyToPrint(false);

    setTimeout(() => {
      if (readyToPrint) {
        console.log('✅ Listo para imprimir');
        window.print();
      } else {
        // Si la imagen aún no está cargada, forzar la impresión después de un tiempo
        console.log('⚠️ Forzando impresión después de timeout');
        setTimeout(() => window.print(), 800);
      }
    }, 200);
  };

  const handleImageLoad = () => {
    console.log('📸 Imagen cargada en solicitud individual');
    setReadyToPrint(true);
  };

  if (loading || loadingAppSettings || !session) {
    return <Container className="mt-5 text-center"><Spinner animation="border" /><p>Cargando...</p></Container>;
  }

  if (error) {
    return <Container className="mt-5"><Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert></Container>;
  }

  if (!solicitud) {
    return <Container className="mt-5"><Alert variant="warning">No se encontró la solicitud.</Alert></Container>;
  }

  const esAdmin = session?.user?.rol?.toLowerCase() === 'administrador';

  const pendingApprovalForCurrentUser = solicitud?.historial_firmas?.find(
    (approval) => approval.estado === 'pendiente' && approval.aprobador_id === session?.user?.id
  );

  // El usuario puede aprobar si:
  // 1. Es aprobador (rol)
  // 2. Tiene una tarea de aprobación pendiente específicamente para él
  // 3. La solicitud está en estado PENDIENTE_APROBACION
  const isCurrentUserApprover = session?.user?.rol?.toLowerCase() === 'aprobador' &&
                                !!pendingApprovalForCurrentUser &&
                                solicitud?.estado?.toUpperCase() === 'PENDIENTE_APROBACION';

  const puedeGestionarItemsSolicitante = (solicitud.estado === 'aprobada' || solicitud.estado === 'en proceso') && solicitud.porcentaje_cumplimiento < 100 && session?.user?.id === solicitud.usuario_id;
  const puedeTomarAccion = (esAdmin || isCurrentUserApprover) && !['cerrada'].includes(solicitud.estado);
  const allFacturas = solicitud.facturas || [];
  const facturasCompra = solicitud.facturas_compras || [];

  return (
    <>
      {/* Versión para imprimir - oculta en pantalla, visible en impresión */}
      <div className="d-none d-print-block">
        <PrintableSolicitud solicitud={solicitud} onImageLoad={handleImageLoad} />
      </div>

      {/* Versión para pantalla - visible en pantalla, oculta en impresión */}
      <Container className="mt-5 d-print-none">
        <Card>
          <Card.Header as="h2">
            <Row>
              <Col>Detalle de Solicitud</Col>
              <Col xs="auto" className="non-printable d-flex gap-2">
                  {puedeTomarAccion && (
                    <Dropdown>
                      <Dropdown.Toggle variant="outline-secondary" id="actions-dropdown" disabled={accionLoading}>
                        {accionLoading ? <Spinner as="span" size="sm" animation="border"/> : 'Acciones'}
                      </Dropdown.Toggle>
                      <Dropdown.Menu>
                        <Dropdown.Item onClick={() => handleAdminAction('aprobar')}>
                          {isCurrentUserApprover ? 'Autorizar' : 'Aprobar'}
                        </Dropdown.Item>
                        <Dropdown.Item onClick={() => handleAdminAction('rechazar')}>Rechazar</Dropdown.Item>
                        {esAdmin && (
                          <>
                            <Dropdown.Divider />
                            <Dropdown.Item onClick={() => handleAdminAction('set-en-proceso')}>En Proceso</Dropdown.Item>
                            <Dropdown.Item onClick={() => handleAdminAction('set-pendiente')}>Pendiente</Dropdown.Item>
                          </>
                        )}
                      </Dropdown.Menu>
                    </Dropdown>
                  )}
                  <Button variant="outline-secondary" onClick={() => router.back()}>Regresar</Button>
                  <Button variant="outline-primary" onClick={handlePrint}>Imprimir</Button>
                </Col>
              </Row>
            </Card.Header>
          <Card.Body>
            {error && <Alert variant="danger">{error}</Alert>}

            <Row className="mb-3">
              <Col md={6}>
                <p><strong>ID:</strong> {solicitud.solicitud_id}</p>
                <p><strong>Fecha:</strong> {new Date(solicitud.fecha_solicitud).toLocaleDateString()}</p>
              </Col>
              <Col md={6}>
                <p><strong>Proveedor:</strong> {solicitud.proveedor_nombre}</p>
                <p><strong>Solicitante:</strong> {solicitud.usuario_nombre}</p>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col>
                <p className="mb-1"><strong>Estado General:</strong> <Badge bg={getStatusBadge(solicitud.estado)}>{solicitud.estado}</Badge></p>
                {solicitud.estado === 'rechazada' && (solicitud.rechazo_comentario || solicitud.historial_firmas?.find(f => f.estado === 'rechazada')?.comentario) &&
                  <p className="mb-1 text-danger"><strong>Motivo de Rechazo:</strong> {solicitud.rechazo_comentario || solicitud.historial_firmas?.find(f => f.estado === 'rechazada').comentario}</p>
                }
                <p className="mb-0"><strong>% de Cumplimiento:</strong> {solicitud.porcentaje_cumplimiento}%</p>
                <ProgressBar now={solicitud.porcentaje_cumplimiento} label={`${solicitud.porcentaje_cumplimiento}%`} />
              </Col>
            </Row>

            <hr />
            <h3>Historial de Aprobaciones</h3>
            {solicitud.historial_firmas && solicitud.historial_firmas.length > 0 ? (
              <ListGroup horizontal className="mb-4">
                {solicitud.historial_firmas.map(firma => {
                  // Personalizar el texto mostrado para estados especiales
                  let estadoTexto = firma.estado;
                  if (firma.estado === 'omitido') {
                    estadoTexto = 'no requerido';
                  } else if (firma.estado === 'aprobado' && firma.aprobador_rol?.toLowerCase() === 'aprobador') {

                    estadoTexto = 'autorizado';
                  }

                  return (
                    <ListGroup.Item key={firma.id} variant={getStatusBadge(firma.estado)}>
                      <strong>{firma.nombre_aprobador}</strong> ({estadoTexto})
                      {firma.fecha_decision && <small className="d-block">{new Date(firma.fecha_decision).toLocaleString()}</small>}
                      {firma.estado === 'omitido' && firma.comentario && (
                        <small className="d-block text-muted">{firma.comentario}</small>
                      )}
                    </ListGroup.Item>
                  );
                })}
              </ListGroup>
            ) : (
              <p>Esta solicitud no tiene un flujo de aprobación definido.</p>
            )}

            <hr />
            <h3>Facturas de Compra (Detalladas)</h3>
            {facturasCompra.length > 0 ? (
                <Accordion defaultActiveKey="0" className="mb-4">
                    {facturasCompra.map((factura, index) => (
                        <Accordion.Item eventKey={String(index)} key={factura.id}>
                            <Accordion.Header>
                                Factura N°: {factura.numero_factura} - Fecha: {new Date(factura.fecha_emision).toLocaleDateString()}
                            </Accordion.Header>
                            <Accordion.Body>
                                <Table striped bordered hover responsive size="sm">
                                    <thead>
                                        <tr>
                                            <th>Descripción</th>
                                            <th>Cantidad</th>
                                            <th>Precio Unit.</th>
                                            <th>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {factura.items.map(item => (
                                            <tr key={item.id}>
                                                <td>{item.descripcion}</td>
                                                <td>{item.cantidad}</td>
                                                <td>{item.precio_unitario.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</td>
                                                <td>{(item.cantidad * item.precio_unitario).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                                <Button variant="outline-info" size="sm" onClick={() => handleShowFacturaViewerModal(factura.archivo_path, 'compra')}>
                                                                        Ver Archivo
                                                                    </Button>
                            </Accordion.Body>
                        </Accordion.Item>
                    ))}
                </Accordion>
            ) : (
                <Alert variant="info">No hay facturas de compra detalladas para esta solicitud.</Alert>
            )}
            <Button variant="outline-primary" className="mb-4" onClick={handleShowRegistroFacturaModal} disabled={accionLoading}>
                Registrar Factura de Compra
            </Button>

            <hr />
            <h3>Facturas Adjuntas (Archivos)</h3>
            {allFacturas.length > 0 ? (
              <Table striped bordered hover responsive className="mb-4">
                <thead>
                  <tr>
                    <th>Nº Factura</th>
                    <th>Fecha</th>
                    <th>Valor</th>
                    <th>Archivo</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {allFacturas.map(factura => (
                    <tr key={factura.id}>
                      <td>{factura.numero_factura}</td>
                      <td>{factura.fecha_factura ? new Date(factura.fecha_factura).toLocaleDateString() : 'N/A'}</td>
                      <td>{factura.valor_factura ? factura.valor_factura.toLocaleString('es-CO', { style: 'currency', currency: 'COP' }) : 'N/A'}</td>
                      <td>
                        <Button variant="outline-info" size="sm" onClick={() => handleShowFacturaViewerModal(factura.nombre_archivo_guardado, 'simple')}>
                          Ver Archivo
                        </Button>
                      </td>
                      <td>
                        <Button variant="outline-danger" size="sm" onClick={() => handleDeleteFactura(factura.id, 'simple')} disabled={accionLoading}>
                          Eliminar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <Alert variant="info">No hay archivos de facturas adjuntas para esta solicitud.</Alert>
            )}

            <hr />
            <h3>Items</h3>
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>Imagen</th>
                  <th>Descripción</th><th>Cant. Solicitada</th><th>Cant. Recibida</th><th>% Cumplido</th>
                </tr>
              </thead>
              <tbody>
                {solicitud.items && solicitud.items.map(item => {
                  const porcentaje = item.cantidad > 0 ? Math.round((item.cantidad_recibida / item.cantidad) * 100) : 100;
                  const estadoUpper = solicitud.estado.toUpperCase();
                  const isLocked = ['APROBADA', 'EN PROCESO', 'CERRADA'].includes(estadoUpper);
                  let puedeEditarItem = false;
                  if (!isLocked) {
                    const esCreador = session.user.id === solicitud.usuario_id;
                    puedeEditarItem =
                      session.user.rol?.toLowerCase() === 'administrador' ||
                      isCurrentUserApprover ||
                      (esCreador && (estadoUpper === 'BORRADOR' || estadoUpper === 'RECHAZADO'));
                  }

                  return (
                    <tr key={item.id}
                        onClick={() => {
                            if (puedeEditarItem) {
                                handleOpenEditItemModal(item);
                            } else if (puedeGestionarItemsSolicitante) {
                                handleOpenManageModal(item);
                            }
                        }}
                        className={(puedeEditarItem || puedeGestionarItemsSolicitante) ? styles.clickableRow : ''}
                    >
                      <td>
                        {item.ruta_imagen && (
                          <div className="d-flex flex-column align-items-center">
                            <a href={item.ruta_imagen} target="_blank" rel="noopener noreferrer">
                              <img src={item.ruta_imagen} alt="Imagen del ítem" style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }} />
                            </a>
                          </div>
                        )}
                        {}
                         {puedeEditarItem && item.ruta_imagen && (
                            <Button variant="outline-danger" size="sm" className="mt-1" onClick={(e) => { e.stopPropagation(); handleDeleteImage(item.id); }}>
                                Eliminar Imagen
                            </Button>
                         )}
                      </td>
                      <td>{item.descripcion}</td>
                      <td>{item.cantidad}</td>
                      <td>{item.cantidad_recibida}</td>
                      <td><ProgressBar now={porcentaje} label={`${porcentaje}%`} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      </Container>

      {currentItem && <GestionarItemModal
        show={showManageItemModal}
        onHide={handleCloseManageModal}
        item={currentItem}
        onSave={handleSaveRecepcion}
        loading={accionLoading}
        proveedorId={solicitud?.proveedor_id}
      />}

      {itemToEdit && <EditarItemModal
        show={showEditItemModal}
        onHide={handleCloseEditItemModal}
        item={itemToEdit}
        onSave={handleEditItemSave}
        loading={accionLoading}
      />}

      <RegistroFacturaModal
        show={showRegistroFacturaModal}
        onHide={handleCloseRegistroFacturaModal}
        id_solicitud={solicitud.id}
        proveedor_id={solicitud.proveedor_id}
        onFacturaRegistered={fetchSolicitud}
      />

      <FacturaViewerModal
        show={showFacturaViewerModal}
        onHide={handleCloseFacturaViewerModal}
        filename={facturaToView}
        tipoFactura={facturaToViewType}
      />
    </>
  );
}
