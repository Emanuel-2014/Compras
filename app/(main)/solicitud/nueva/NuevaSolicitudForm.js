// app/solicitud/nueva/NuevaSolicitudForm.js
"use client";

import { useState, useEffect, useRef, Suspense, useLayoutEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

// Importar componentes de react-bootstrap para la nueva UI
import { Card, Form, Button, Row, Col, InputGroup, Badge, Table } from 'react-bootstrap';
import Swal from 'sweetalert2';
// Iconos de Font Awesome para mejor UX
import { FaFileAlt, FaCog, FaHashtag, FaExclamationCircle, FaImage, FaPlus, FaPlusCircle, FaEdit, FaTrash, FaCheckCircle } from 'react-icons/fa';

import styles from './page.module.css';
import PrintableSolicitud from '@/components/PrintableSolicitud';
import { preloadImagesForPrint } from '@/lib/imagePreloader';

// Componente principal del formulario
export default function NuevaSolicitudForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [usuario, setUsuario] = useState(null);
  const [fechaSolicitud, setFechaSolicitud] = useState('');
  const [proveedores, setProveedores] = useState([]);
  const [selectedProveedor, setSelectedProveedor] = useState('');
  const [showProveedorModal, setShowProveedorModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [newProveedor, setNewProveedor] = useState({ nombre: '', nit: '', nit_dv: '', nombre_asesor: '', contacto: '' });
  const [items, setItems] = useState([]);
  const [editingItemId, setEditingItemId] = useState(null);
  const [tipo, setTipo] = useState('compra');
  const [newItem, setNewItem] = useState({
    prioridad: 'programada',
    descripcion: '',
    especificaciones: '',
    cantidad: 1,
    observaciones: '',
    ruta_imagen: ''
  });
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recentItems, setRecentItems] = useState([]);
  const [notasAdicionales, setNotasAdicionales] = useState('');
  const [infoModal, setInfoModal] = useState({ show: true, title: '¡ATENCIÓN!', message: 'Para agilizar el proceso de compra y evitar errores, por favor asegúrese de que la descripción y las especificaciones de cada ítem sean lo más claras y completas posible.<br /><br />El departamento de compras no puede adivinar las características de los productos que necesita.<br /><br />¡Gracias por su colaboración!' });
  const hideInfoModal = () => setInfoModal({ show: false, title: '', message: '' });
  const [solicitudCreada, setSolicitudCreada] = useState(null);
  const [printingInfo, setPrintingInfo] = useState(null);
  const [companySettings, setCompanySettings] = useState(null);
  const [readyToPrint, setReadyToPrint] = useState(false);

  const triggerPrint = async (solicitud) => {
    const assetBaseUrl = window.location.origin;
    //find proveedor name
    const proveedor = proveedores.find(p => p.id.toString() === selectedProveedor.toString());
    const fullSolicitud = {
      ...solicitud,
      solicitud_id: solicitud.id,
      proveedor_nombre: proveedor?.nombre,
      usuario_nombre: usuario?.nombre,
      usuario_codigo_personal: usuario?.codigo_personal,
      usuario_dependencia: usuario?.dependencia,
      fecha_solicitud: fechaSolicitud,
      notas: notasAdicionales,
      items: items.map(item => ({
        ...item,
        id_solicitud: solicitud.id
      })),
      tipo: tipo
    }

    // Precargar las imágenes antes de mostrar el componente de impresión
    console.log('🖨️ Iniciando proceso de impresión...');
    const imagesToPreload = [
      companySettings?.company_logo_path || '/logo.png',
      ...items.filter(item => item.ruta_imagen).map(item => item.ruta_imagen)
    ];

    try {
      await preloadImagesForPrint(imagesToPreload);
      console.log('✅ Imágenes precargadas, procediendo con impresión');
      setPrintingInfo({ solicitud: fullSolicitud, assetBaseUrl });
      setReadyToPrint(false); // Resetear el estado
    } catch (error) {
      console.warn('⚠️ Error precargando imágenes, procediendo de todas formas:', error);
      setPrintingInfo({ solicitud: fullSolicitud, assetBaseUrl });
      setReadyToPrint(false);
    }
  };

  // Callback para cuando la imagen del logo esté cargada
  const handleImageLoad = () => {
    console.log('📸 Imagen cargada completamente, listo para imprimir');
    setReadyToPrint(true);
  };

  useEffect(() => {
    if (printingInfo && !readyToPrint) {
      console.log('⏱️ Iniciando timeout de seguridad (1000ms)');
      const timeout = setTimeout(() => {
        console.log('⚠️ Timeout alcanzado, forzando impresión');
        setReadyToPrint(true);
      }, 1000);

      return () => clearTimeout(timeout);
    }
  }, [printingInfo, readyToPrint]);

  // Dispara la impresión cuando tanto printingInfo como readyToPrint estén listos
  useLayoutEffect(() => {
    if (printingInfo && readyToPrint) {
      console.log('🖨️ Todo listo para imprimir, iniciando en 200ms...');
      // Delay mayor para asegurar el renderizado completo
      setTimeout(() => {
        console.log('🖨️ Ejecutando window.print()');
        window.print();
      }, 200);
    }
  }, [printingInfo, readyToPrint]);

  // Escucha el evento 'afterprint' para limpiar el estado
  useEffect(() => {
    const handleAfterPrint = () => {
      // Usa la forma funcional de setState para evitar problemas de 'stale closure'.
      // Esto asegura que siempre tengamos el valor más reciente del estado.
      setPrintingInfo(currentPrintingInfo => {
        if (currentPrintingInfo !== null) {
          return null; // Si estábamos imprimiendo, volvemos al estado normal.
        }
        return currentPrintingInfo; // Si no, no hacemos nada.
      });
    };

    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []); // <-- El array vacío asegura que el efecto solo se ejecuta una vez (al montar/desmontar).

  useEffect(() => {
    const getFormattedDate = () => {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };
    setFechaSolicitud(getFormattedDate());

    const fetchSession = async () => {
      try {
        const res = await fetch('/api/session', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setUsuario(data.user);
        } else {
          router.push('/login');
        }
      } catch (err) {
        console.error('Error al obtener la sesión:', err);
        router.push('/login');
      }
    };

    const fetchProveedores = async () => {
      try {
        const res = await fetch('/api/proveedores', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setProveedores(data);
        } else {
          setError('NO SE PUDIERON CARGAR LOS PROVEEDORES.');
        }
      } catch (err) {
        setError('ERROR DE CONEXIÓN AL CARGAR PROVEEDORES.');
      } finally {
        setLoading(false);
      }
    };

    const fetchCompanySettings = async () => {
      try {
        const res = await fetch('/api/public-settings');
        if (res.ok) {
          const data = await res.json();
          setCompanySettings(data);
        }
      } catch (err) {
        console.error('Error loading company settings:', err);
      }
    };

    fetchSession();
    fetchProveedores();
    fetchCompanySettings();
  }, [router]);

  useEffect(() => {
    const proveedorId = searchParams.get('proveedor');
    const itemsJson = searchParams.get('items');

    if (proveedorId && proveedores.length > 0) {
        setSelectedProveedor(proveedorId);
    }

    if (itemsJson) {
        try {
            const plantillaItems = JSON.parse(itemsJson);
            const newItems = plantillaItems.map((item, index) => ({
                id: Date.now() + index,
                descripcion: item.descripcion,
                especificaciones: item.especificaciones || '',
                cantidad: 1,
                prioridad: 'programada',
                observaciones: ''
            }));
            setItems(newItems);
        } catch (e) {
            console.error("Error parsing items from template", e);
        }
    }
  }, [searchParams, proveedores]);

  useEffect(() => {
    const fetchRecentItems = async (userId) => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoISO = sevenDaysAgo.toISOString().split('T')[0];

      try {
        const res = await fetch(`/api/mis-solicitudes?userId=${userId}&fecha=${sevenDaysAgoISO}`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          const solicitudes = data.solicitudes;
          const items = solicitudes.flatMap(s => (s.items || []).map(i => ({
            descripcion: i.descripcion.toLowerCase(),
            especificaciones: (i.especificaciones || '').toLowerCase()
          })));
          setRecentItems(items);
        }
      } catch (err) {
        console.error('Error fetching recent items:', err);
      }
    };

    if (usuario) {
      fetchRecentItems(usuario.id);
    }
  }, [usuario]);

  const handleProveedorChange = (e) => {
    const value = e.target.value;
    if (value === 'new') {
      setShowProveedorModal(true);
      setSelectedProveedor('');
    } else {
      setShowProveedorModal(false);
      setSelectedProveedor(value);
    }
  };

  const formatNit = (nit) => {
    if (!nit) return '';
    const cleanNit = nit.replace(/[^0-9]/g, '');
    return cleanNit.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleNewProveedorChange = (e) => {
    const { name, value } = e.target;
    if (name === 'nit') {
      const formatted = formatNit(value);
      setNewProveedor(prev => ({ ...prev, [name]: formatted }));
    } else {
      setNewProveedor(prev => ({ ...prev, [name]: value.toUpperCase() }));
    }
  };

  const handleSaveNewProveedor = async () => {
    if (!newProveedor.nombre) {
      alert('EL NOMBRE DEL NUEVO PROVEEDOR ES OBLIGATORIO.');
      return;
    }
    setLoading(true);

    // Limpiar el NIT antes de enviarlo
    const cleanNit = newProveedor.nit.replace(/\./g, '');
    const proveedorData = { ...newProveedor, nit: cleanNit };

    try {
      const res = await fetch('/api/proveedores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proveedorData),
        credentials: 'include'
      });
      if (!res.ok) {
        const errorData = await res.json();
        if (res.status === 409) {
          setShowProveedorModal(false);
          setInfoModal({ show: true, title: 'Proveedor Duplicado', message: errorData.message });
          return;
        }
        // Para otros errores, lanzar el error para que sea manejado por el bloque catch
        throw new Error(errorData.message || 'ERROR AL CREAR EL NUEVO PROVEEDOR.');
      }
      const newProvResult = await res.json();
      const savedProveedor = { id: newProvResult.id, ...newProveedor };

      setProveedores(prev => [...prev, savedProveedor]);
      setSelectedProveedor(savedProveedor.id);
      setShowProveedorModal(false);
      setNewProveedor({ nombre: '', nit: '', nombre_asesor: '', contacto: '' });
      Swal.fire({
        title: '¡Proveedor Creado!',
        text: 'El nuevo proveedor ha sido creado y seleccionado exitosamente.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err) {
      console.error('Error al guardar nuevo proveedor:', err);
      setError(err.message || 'ERROR DESCONOCIDO AL GUARDAR EL PROVEEDOR.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!usuario) {
      alert('NO HAY USUARIO LOGUEADO. POR FAVOR, INICIE SESIÓN.');
      router.push('/login');
      return;
    }
    if (!selectedProveedor) {
      alert('DEBE SELECCIONAR UN PROVEEDOR.');
      return;
    }
    if (items.length === 0) {
      alert('DEBE AÑADIR AL MENOS UN ÍTEM A LA SOLICITUD.');
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false);
    setLoading(true);

    try {
      const solicitudData = {
        id_usuario: usuario.id,
        id_proveedor: selectedProveedor,
        fecha_solicitud: fechaSolicitud,
        items: items.map(({ id, ...rest }) => rest),
        notas: notasAdicionales,
        tipo: tipo,
      };

      const resSolicitud = await fetch('/api/solicitudes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(solicitudData),
        credentials: 'include'
      });

      if (!resSolicitud.ok) {
        if (resSolicitud.status === 401) {
          window.dispatchEvent(new CustomEvent('session-expired'));
          return;
        }
        const errorData = await resSolicitud.json();
        // Manejo específico para el error de duplicado
        if (resSolicitud.status === 409) {
          setInfoModal({ show: true, title: 'Error de Duplicado', message: errorData.message });
          return; // Detener la ejecución aquí
        }
        throw new Error(errorData.message || 'ERROR AL ENVIAR LA SOLICITUD.');
      }

      const dataCreada = await resSolicitud.json();
      setSolicitudCreada(dataCreada);

    } catch (err) {
      console.error('Error al enviar la solicitud:', err);
      setInfoModal({ show: true, title: 'Error Inesperado', message: err.message || 'Ocurrió un error desconocido al enviar la solicitud.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!selectedProveedor) {
      alert('DEBE SELECCIONAR UN PROVEEDOR PARA GUARDAR LA PLANTILLA.');
      return;
    }

    if (items.length === 0) {
      alert('DEBE AÑADIR AL MENOS UN ÍTEM PARA GUARDAR LA PLANTILLA.');
      return;
    }

    const provider = proveedores.find(p => p.id.toString() === selectedProveedor.toString());
    if (!provider) {
      alert('PROVEEDOR SELECCIONADO NO VÁLIDO.');
      return;
    }
    const templateName = provider.nombre;

    setLoading(true);
    try {
      const templateData = {
        nombre: templateName,
        proveedor_id: selectedProveedor,
        items: items.map(item => ({
          descripcion: item.descripcion,
          especificaciones: item.especificaciones || ''
        })),
      };

      const res = await fetch('/api/plantillas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData),
        credentials: 'include'
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'ERROR AL GUARDAR LA PLANTILLA.');
      }

      alert(`PLANTILLA "${templateName}" GUARDADA EXITOSAMENTE!`);

    } catch (err) {
      console.error('Error al guardar la plantilla:', err);
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleNewItemChange = (e) => {
    const { name, value } = e.target;
    if (name === 'cantidad') {
      if (value === '' || /^[0-9]+$/.test(value)) {
        setNewItem(prev => ({ ...prev, cantidad: value === '' ? '' : parseInt(value, 10) }));
      }
    } else if (name === 'prioridad') {
      setNewItem(prev => ({ ...prev, [name]: value }));
    } else {
      setNewItem(prev => ({ ...prev, [name]: value.toUpperCase() }));
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('itemImage', file);

    try {
      const res = await fetch('/api/upload-item-image', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al subir la imagen.');
      }

      const data = await res.json();
      setNewItem(prev => ({ ...prev, ruta_imagen: data.filePath }));

    } catch (err) {
      console.error('Error de subida:', err);
      alert(`Error al subir la imagen: ${err.message}`);
    } finally {
      setUploading(false);
      // Limpiar el valor del input para permitir subir el mismo archivo de nuevo
      e.target.value = null;
    }
  };

  const handleSaveItem = () => {
    const { descripcion, especificaciones, cantidad } = newItem;

    if (descripcion && especificaciones && cantidad > 0) {

      const isDuplicate = recentItems.some(
        item => item.descripcion === newItem.descripcion.toLowerCase() &&
                item.especificaciones === (newItem.especificaciones || '').toLowerCase()
      );
      if (isDuplicate) {
        alert('Advertencia: Ya ha solicitado un ítem con la misma descripción y especificaciones en la última semana.');
      }

      if (editingItemId) {
        setItems(prev => prev.map(item =>
          item.id === editingItemId ? { ...newItem, id: editingItemId } : item
        ));
        setEditingItemId(null);
      } else {
        setItems(prev => [...prev, { ...newItem, id: Date.now() }]);
      }
      setNewItem({
        prioridad: 'programada',
        descripcion: '',
        especificaciones: '',
        cantidad: 1,
        observaciones: '',
        ruta_imagen: ''
      });
    } else {
      let message = '';
      if (!descripcion && !especificaciones) {
        message = 'LA DESCRIPCIÓN Y ESPECIFICACIONES DEL ÍTEM SON OBLIGATORIAS.';
      } else if (!descripcion) {
        message = 'LA DESCRIPCIÓN DEL ÍTEM ES OBLIGATORIA.';
      } else if (!especificaciones) {
        message = 'LAS ESPECIFICACIONES DEL ÍTEM SON OBLIGATORIAS.';
      }
      setInfoModal({ show: true, title: '¡ATENCIÓN!', message });
    }
  };

  const handleEditItem = (id) => {
    const itemToEdit = items.find(item => item.id === id);
    if (itemToEdit) {
      setNewItem(itemToEdit);
      setEditingItemId(id);
    }
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setNewItem({
      prioridad: 'programada',
      descripcion: '',
      especificaciones: '',
      cantidad: 1,
      observaciones: '',
      ruta_imagen: ''
    });
  };

  const handleDeleteItem = (id) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const resetForm = () => {
    setSolicitudCreada(null);
    setItems([]);
    setNewItem({ prioridad: 'programada', descripcion: '', especificaciones: '', cantidad: 1, observaciones: '', ruta_imagen: '' });
    setSelectedProveedor('');
    setNotasAdicionales('');
  };

  const pageContent = (
    <div className={styles.container}>
      <h1 className="mb-4" style={{ textAlign: 'center' }}>Nueva Solicitud</h1>
      {infoModal.show && !solicitudCreada && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: '500px', textAlign: 'center' }}>
            <h3 style={{ fontWeight: 'bold', fontSize: '1.5rem', margin: '1rem 0', color: '#333' }}>{infoModal.title}</h3>
            <div style={{ textAlign: 'center', lineHeight: '1.6' }} dangerouslySetInnerHTML={{ __html: infoModal.message }} />
            <div className={styles.modalActions} style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Button
                type="button"
                variant="outline-danger"
                size="sm"
                onClick={hideInfoModal}>
              ENTENDIDO</Button>
            </div>
          </div>
        </div>
      )}

      {solicitudCreada ? (
        <div className={styles.successContainer}>
            <h2 className={styles.successTitle}>¡Solicitud Creada con Éxito!</h2>
            <p className={styles.successInfo}>El ID de su solicitud es: <strong>{solicitudCreada.id}</strong></p>
                        <div className={styles.actionButtons}>
                            <Button onClick={() => triggerPrint(solicitudCreada)} variant="outline-primary" size="sm">
                                Imprimir Solicitud
                            </Button>
                            <Button onClick={resetForm} variant="outline-secondary" size="sm">
                                Crear Otra Solicitud
                            </Button>
                        </div>
                    </div>
                  ) : (        <div className={styles.nonPrintable}>
          <Form onSubmit={handleSubmit}>
            <Card className="mb-4" style={{ boxShadow: '0 4px 8px rgba(0,0,0,0.1)', border: 'none' }}>
              <Card.Header style={{ background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)', color: 'white', fontSize: '1.1rem', fontWeight: '600', padding: '1rem', textAlign: 'center' }}>
                PROVEEDOR
              </Card.Header>
              <Card.Body style={{ padding: '1rem', backgroundColor: 'white' }}>
                <Row className="g-3 align-items-center">
                  <Col xs="auto">
                    <Form.Label htmlFor="proveedor" style={{ fontWeight: '600', fontSize: '0.9rem', color: '#212529', marginBottom: 0 }}>
                      SELECCIONAR PROVEEDOR:
                    </Form.Label>
                  </Col>
                  <Col>
                    <Form.Select
                      id="proveedor"
                      value={selectedProveedor}
                      onChange={handleProveedorChange}
                      style={{ borderColor: '#dc3545', color: '#212529', fontWeight: '600', backgroundColor: 'white' }}
                    >
                      <option value="">-- SELECCIONE UN PROVEEDOR --</option>
                      {proveedores.map(prov => (
                        <option key={prov.id} value={prov.id}>{prov.nombre}</option>
                      ))}
                      <option value="new">-- CREAR NUEVO PROVEEDOR --</option>
                    </Form.Select>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            {/* --- INICIO: SECCIÓN DE ÍTEMS REDISEÑADA CON MEJOR UI --- */}
            <Card className="mb-4" style={{ boxShadow: '0 4px 8px rgba(0,0,0,0.1)', border: 'none' }}>
              <Card.Header style={{ background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)', color: 'white', fontSize: '1.1rem', fontWeight: '600', padding: '1rem', textAlign: 'center' }}>
                <FaPlus className="me-2" />ITEMS DE LA SOLICITUD {items.length > 0 && <Badge bg="light" text="dark" className="ms-2">{items.length} ítem{items.length !== 1 ? 's' : ''}</Badge>}
              </Card.Header>
              <Card.Body style={{ padding: '1.5rem', backgroundColor: '#f8f9fa' }}>
                <Row className="g-3 mb-3">
                  <Col md={12}>
                    <div style={{ padding: '1rem', backgroundColor: 'white', borderRadius: '8px', border: '2px dashed #dee2e6' }}>
                      <Row className="g-3">
                        <Col md={6} lg={2}>
                          <Form.Group>
                            <Form.Label htmlFor="tipo" style={{ fontWeight: '600', fontSize: '0.9rem', color: '#212529' }}>
                              <FaFileAlt className="me-2" style={{ color: '#dc3545' }} />TIPO
                            </Form.Label>
                            <Form.Select
                              id="tipo"
                              name="tipo"
                              value={tipo}
                              onChange={(e) => setTipo(e.target.value)}
                              style={{
                                borderColor: '#dc3545',
                                color: '#000000',
                                fontWeight: '700',
                                backgroundColor: 'white',
                                fontSize: '0.95rem'
                              }}>
                              <option value="compra" style={{ color: '#000000', backgroundColor: 'white' }}>COMPRA</option>
                              <option value="servicio" style={{ color: '#000000', backgroundColor: 'white' }}>SERVICIO</option>
                            </Form.Select>
                          </Form.Group>
                        </Col>
                        <Col md={6} lg={5}>
                          <Form.Group>
                            <Form.Label htmlFor="descripcion" style={{ fontWeight: '600', fontSize: '0.9rem', color: '#212529' }}>
                              <FaFileAlt className="me-2" style={{ color: '#dc3545' }} />DESCRIPCIÓN*
                            </Form.Label>
                            <Form.Control
                              type="text"
                              id="descripcion"
                              name="descripcion"
                              value={newItem.descripcion}
                              onChange={handleNewItemChange}
                              className="text-uppercase"
                              placeholder="INGRESE LA DESCRIPCIÓN DEL ÍTEM"
                              style={{ borderColor: '#dc3545', color: '#000', fontWeight: '600', backgroundColor: 'white' }}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={12} lg={5}>
                          <Form.Group>
                            <Form.Label htmlFor="especificaciones" style={{ fontWeight: '600', fontSize: '0.9rem', color: '#212529' }}>
                              <FaCog className="me-2" style={{ color: '#dc3545' }} />ESPECIFICACIONES*
                            </Form.Label>
                            <Form.Control
                              type="text"
                              id="especificaciones"
                              name="especificaciones"
                              value={newItem.especificaciones}
                              onChange={handleNewItemChange}
                              className="text-uppercase"
                              placeholder="DETALLES Y CARACTERÍSTICAS"
                              style={{ borderColor: '#dc3545', color: '#000', fontWeight: '600', backgroundColor: 'white' }}
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                      <Row className="g-3 mt-1">
                        <Col md={6} lg={2}>
                          <Form.Group>
                            <Form.Label htmlFor="cantidad" style={{ fontWeight: '600', fontSize: '0.9rem', color: '#212529' }}>
                              <FaHashtag className="me-2" style={{ color: '#dc3545' }} />CANTIDAD
                            </Form.Label>
                            <Form.Control
                              type="number"
                              id="cantidad"
                              name="cantidad"
                              min="1"
                              value={newItem.cantidad}
                              onChange={handleNewItemChange}
                              style={{ borderColor: '#dc3545', fontSize: '1.1rem', fontWeight: '600', color: '#212529', backgroundColor: 'white' }}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6} lg={3}>
                          <Form.Group>
                            <Form.Label style={{ fontWeight: '600', fontSize: '0.9rem', display: 'block', color: '#212529' }}>
                              <FaExclamationCircle className="me-2" style={{ color: '#dc3545' }} />PRIORIDAD
                            </Form.Label>
                            <div className="d-flex gap-2 mt-2">
                              <Button
                                variant={newItem.prioridad === 'programada' ? 'success' : 'outline-success'}
                                onClick={() => setNewItem(prev => ({ ...prev, prioridad: 'programada' }))}
                                style={{ flex: 1, fontWeight: '600', borderWidth: '2px', fontSize: '0.85rem', padding: '0.5rem 0.25rem' }}
                              >
                                <FaCheckCircle className="me-1" />PROG
                              </Button>
                              <Button
                                variant={newItem.prioridad === 'urgencia' ? 'danger' : 'outline-danger'}
                                onClick={() => setNewItem(prev => ({ ...prev, prioridad: 'urgencia' }))}
                                style={{ flex: 1, fontWeight: '600', borderWidth: '2px', fontSize: '0.85rem', padding: '0.5rem 0.25rem' }}
                              >
                                <FaExclamationCircle className="me-1" />URG
                              </Button>
                            </div>
                          </Form.Group>
                        </Col>
                        <Col md={12} lg={3}>
                          <Form.Group>
                            <Form.Label style={{ fontWeight: '600', fontSize: '0.9rem', color: '#212529' }}>
                              <FaImage className="me-2" style={{ color: '#dc3545' }} />IMAGEN (opcional)
                            </Form.Label>
                            {!newItem.ruta_imagen ? (
                              <div style={{ border: '2px dashed #dc3545', borderRadius: '8px', padding: '1rem', textAlign: 'center', backgroundColor: '#f8f9fa', cursor: 'pointer' }}
                                onClick={() => document.getElementById('itemImage').click()}>
                                <FaImage size={30} style={{ color: '#dc3545', marginBottom: '0.25rem' }} />
                                <p style={{ margin: 0, color: '#dc3545', fontWeight: '600', fontSize: '0.85rem' }}>Click para seleccionar</p>
                                <Form.Control
                                  type="file"
                                  id="itemImage"
                                  onChange={handleImageUpload}
                                  accept="image/*"
                                  style={{ display: 'none' }}
                                />
                              </div>
                            ) : (
                              <div style={{ position: 'relative', border: '2px solid #28a745', borderRadius: '8px', padding: '0.5rem', backgroundColor: '#f8f9fa' }}>
                                <img 
                                  src={newItem.ruta_imagen} 
                                  alt="Previsualización"
                                  style={{ width: '100%', maxHeight: '120px', objectFit: 'cover', borderRadius: '4px' }}
                                />
                                <Button
                                  variant="danger"
                                  size="sm"
                                  style={{ position: 'absolute', top: '5px', right: '5px', padding: '0.25rem 0.5rem' }}
                                  onClick={() => setNewItem(prev => ({ ...prev, ruta_imagen: '', imagen_file: null }))}
                                >
                                  ✕
                                </Button>
                              </div>
                            )}
                          </Form.Group>
                        </Col>
                        <Col md={12} lg={4}>
                          <Form.Group>
                            <Form.Label style={{ fontWeight: '600', fontSize: '0.9rem', color: '#212529' }}>
                              <FaFileAlt className="me-2" style={{ color: '#dc3545' }} />OBSERVACIONES
                            </Form.Label>
                            <Form.Control
                              as="textarea"
                              id="observaciones"
                              name="observaciones"
                              value={newItem.observaciones || ''}
                              onChange={handleNewItemChange}
                              className="text-uppercase"
                              placeholder="NOTAS ADICIONALES SOBRE EL ÍTEM"
                              style={{ 
                                borderColor: '#dc3545', 
                                color: '#000', 
                                fontWeight: '600', 
                                backgroundColor: 'white',
                                height: '97px',
                                resize: 'none',
                                '--placeholder-color': '#000',
                                '--placeholder-opacity': '0.6'
                              }}
                            />
                          </Form.Group>
                        </Col>
                      </Row>

                      <Row className="mb-3 mt-3">
                        <Col md={12} lg={4} className="mx-auto">
                          <div className="d-grid">
                            <Button 
                              variant="success" 
                              onClick={handleSaveItem}
                              disabled={!newItem.descripcion.trim() || !newItem.especificaciones.trim() || !newItem.cantidad}
                            >
                              <FaPlusCircle className="me-2" />Agregar Ítem
                            </Button>
                          </div>
                        </Col>
                      </Row>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            {/* --- INICIO: LISTA DE ÍTEMS EN TABLA CON MEJOR DISEÑO --- */}
            {items.length > 0 && (
              <Card className="mb-4" style={{ boxShadow: '0 4px 8px rgba(0,0,0,0.1)', border: 'none' }}>
                <Card.Header style={{ background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)', color: 'white', fontSize: '1.1rem', fontWeight: '600', padding: '1rem' }}>
                  <FaCheckCircle className="me-2" />Listado de Ítems Agregados
                </Card.Header>
                <Card.Body style={{ padding: 0 }}>
                  <Table striped bordered hover responsive className="mb-0">
                    <thead style={{ backgroundColor: '#f8f9fa' }}>
                      <tr>
                        <th style={{ fontWeight: '600', color: '#495057', fontSize: '0.75rem' }}><FaImage className="me-2" />IMAGEN</th>
                        <th style={{ fontWeight: '600', color: '#495057', fontSize: '0.75rem' }}><FaExclamationCircle className="me-2" />PRIORIDAD</th>
                        <th style={{ fontWeight: '600', color: '#495057', fontSize: '0.75rem' }}><FaFileAlt className="me-2" />DESCRIPCIÓN</th>
                        <th style={{ fontWeight: '600', color: '#495057', fontSize: '0.75rem' }}><FaCog className="me-2" />ESPECIFICACIONES</th>
                        <th style={{ fontWeight: '600', color: '#495057', fontSize: '0.75rem' }}><FaHashtag className="me-2" />CANTIDAD</th>
                        <th style={{ fontWeight: '600', color: '#495057', fontSize: '0.75rem' }}>OBSERVACIONES</th>
                        <th style={{ fontWeight: '600', color: '#495057', fontSize: '0.75rem' }}>ACCIONES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={item.id} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa' }}>
                          <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                            {item.ruta_imagen ? (
                              <a href={item.ruta_imagen} target="_blank" rel="noopener noreferrer">
                                <Image src={item.ruta_imagen} alt="Imagen del ítem" width={50} height={50} style={{ borderRadius: '8px', objectFit: 'cover', border: '2px solid #dee2e6' }} />
                              </a>
                            ) : (
                              <FaImage size={30} style={{ color: '#dee2e6' }} />
                            )}
                          </td>
                          <td style={{ verticalAlign: 'middle' }}>
                            <Badge bg={item.prioridad === 'urgencia' ? 'danger' : 'success'} style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}>
                              {item.prioridad === 'urgencia' ? <FaExclamationCircle className="me-2" /> : <FaCheckCircle className="me-2" />}
                              {item.prioridad.toUpperCase()}
                            </Badge>
                          </td>
                          <td style={{ verticalAlign: 'middle', fontWeight: '600', fontSize: '0.8rem' }}>{item.descripcion}</td>
                          <td style={{ verticalAlign: 'middle', fontSize: '0.8rem' }}>{item.especificaciones}</td>
                          <td style={{ verticalAlign: 'middle', textAlign: 'center', fontSize: '0.85rem', fontWeight: '600' }}>{item.cantidad}</td>
                          <td style={{ verticalAlign: 'middle', fontSize: '0.8rem' }}>{item.observaciones}</td>
                          <td style={{ verticalAlign: 'middle' }}>
                            <div className="d-flex gap-2">
                              <Button variant="outline-primary" size="sm" onClick={() => handleEditItem(item.id)} style={{ fontWeight: '600', borderWidth: '2px', fontSize: '0.75rem' }}>
                                <FaEdit className="me-1" />Editar
                              </Button>
                              <Button variant="outline-danger" size="sm" onClick={() => handleDeleteItem(item.id)} style={{ fontWeight: '600', borderWidth: '2px', fontSize: '0.75rem' }}>
                                <FaTrash className="me-1" />Eliminar
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            )}
            {/* --- FIN: LISTA DE ÍTEMS EN TABLA CON MEJOR DISEÑO --- */}

            <Card className="mb-4" style={{ boxShadow: '0 4px 8px rgba(0,0,0,0.1)', border: 'none', backgroundColor: 'white' }}>
              <Card.Body style={{ backgroundColor: 'white' }}>
                <Form.Group>
                  <Form.Label htmlFor="notasAdicionales" style={{ fontWeight: '600', fontSize: '0.9rem', color: '#212529', backgroundColor: 'white' }}>
                    <FaFileAlt className="me-2" style={{ color: '#dc3545' }} />NOTAS:
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    id="notasAdicionales"
                    value={notasAdicionales}
                    onChange={(e) => setNotasAdicionales(e.target.value.toUpperCase())}
                    rows={3}
                    placeholder="AÑADIR NOTAS O INSTRUCCIONES GENERALES PARA ESTA SOLICITUD"
                    className="text-uppercase"
                    style={{ borderColor: '#dc3545', color: '#212529', fontWeight: '600', backgroundColor: 'white' }}
                  />
                </Form.Group>
              </Card.Body>
            </Card>

            <div className={styles.actionButtons}>
              <Button type="submit" variant="outline-success" disabled={loading} size="lg">
                {loading ? 'Enviando...' : 'Enviar Solicitud'}
              </Button>
              <Button type="button" variant="outline-secondary" onClick={handleSaveAsTemplate} disabled={loading} size="sm">
                  {loading ? 'Guardando...' : 'Guardar como Plantilla'}
              </Button>
            </div>
          </Form>

          {showConfirmModal && (
            <div className={styles.modalOverlay}>
              <div className={styles.modalContent}>
                <h3>Confirmar Solicitud</h3>
                <p>Por favor, revise los detalles de la solicitud antes de enviarla.</p>

                <div className={styles.confirmDetails}>
                  <strong>Proveedor:</strong> {proveedores.find(p => p.id.toString() === selectedProveedor)?.nombre || 'N/A'}
                </div>

                <div className={styles.itemsList} style={{ marginTop: '1rem' }}>
                  <strong>Ítems:</strong>
                  <ul style={{ listStyle: 'decimal', paddingLeft: '20px' }}>
                    {items.map(item => (
                      <li key={item.id}>
                        {item.cantidad}x {item.descripcion} ({item.especificaciones}) - <em>{item.prioridad}</em>
                      </li>
                    ))}
                  </ul>
                </div>

                {notasAdicionales && (
                  <div className={styles.confirmDetails} style={{ marginTop: '1rem' }}>
                    <strong>Notas Adicionales:</strong>
                    <p>{notasAdicionales}</p>
                  </div>
                )}

                <div className={styles.modalActions}>
                  <Button variant="outline-primary" onClick={handleConfirmSubmit} disabled={loading} size="sm">
                    {loading ? 'Enviando...' : 'Confirmar y Enviar'}
                  </Button>
                  <Button variant="outline-secondary" onClick={() => setShowConfirmModal(false)} disabled={loading} size="sm">
                    Editar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {showProveedorModal && (
            <div className={styles.modalOverlay}>
              <div className={styles.modalContent}>
                <h3>NUEVO PROVEEDOR</h3>
                <Form.Group className="mb-3">
                  <Form.Label>NOMBRE</Form.Label>
                  <Form.Control
                    type="text"
                    name="nombre"
                    value={newProveedor.nombre}
                    onChange={handleNewProveedorChange}
                    className="text-uppercase"
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>NIT</Form.Label>
                  <Row>
                    <Col xs={9}>
                      <Form.Control
                        type="text"
                        name="nit"
                        value={newProveedor.nit}
                        onChange={handleNewProveedorChange}
                        placeholder="Ej: 900900900"
                        className="text-uppercase"
                      />
                    </Col>
                    <Col xs={3}>
                      <Form.Control
                        type="text"
                        name="nit_dv"
                        value={newProveedor.nit_dv}
                        onChange={handleNewProveedorChange}
                        placeholder="DV"
                        maxLength="1"
                        className="text-uppercase"
                      />
                    </Col>
                  </Row>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>ASESOR</Form.Label>
                  <Form.Control
                    type="text"
                    name="nombre_asesor"
                    value={newProveedor.nombre_asesor}
                    onChange={handleNewProveedorChange}
                    className="text-uppercase"
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>CONTACTO</Form.Label>
                  <Form.Control
                    type="text"
                    name="contacto"
                    value={newProveedor.contacto}
                    onChange={handleNewProveedorChange}
                    className="text-uppercase"
                  />
                </Form.Group>
                <div className={styles.modalActions}>
                  <Button variant="outline-primary" onClick={handleSaveNewProveedor} size="sm">
                    Guardar Proveedor
                  </Button>
                  <Button variant="outline-secondary" onClick={() => setShowProveedorModal(false)} size="sm">
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      {printingInfo ? (
        <div className="printable-area">
          <PrintableSolicitud
            solicitud={printingInfo.solicitud}
            currentUser={usuario}
            assetBaseUrl={printingInfo.assetBaseUrl}
            companySettings={companySettings}
            onImageLoad={handleImageLoad}
          />
        </div>
      ) : (
        pageContent
      )}
    </>
  );
}