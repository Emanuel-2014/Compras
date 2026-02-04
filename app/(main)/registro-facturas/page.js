
'use client';

import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Row, Col, Table, Alert, Spinner, Modal } from 'react-bootstrap';
import Swal from 'sweetalert2';
import 'bootstrap/dist/css/bootstrap.min.css';
import styles from './page.module.css';

function RegistroFacturasPage() {
  const [proveedores, setProveedores] = useState([]);
  const [proveedorId, setProveedorId] = useState('');
  const [prefijo, setPrefijo] = useState('');
  const [numeroFactura, setNumeroFactura] = useState('');
  const [fechaEmision, setFechaEmision] = useState('');
  const [items, setItems] = useState([
    { descripcion: '', cantidad: '', precio_unitario: '' }
  ]);
  const [facturaFile, setFacturaFile] = useState(null);
  const [ivaOpcion, setIvaOpcion] = useState('precios_sin_iva'); // precios_sin_iva | precios_con_iva
  const [tasaIva, setTasaIva] = useState('19'); // '19', '5', '0'

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingProveedores, setLoadingProveedores] = useState(true);

  const [showNewProveedorModal, setShowNewProveedorModal] = useState(false);
  const [newProveedor, setNewProveedor] = useState({ nombre: '', nit: '', nit_dv: '', nombre_asesor: '', contacto: '' });

  // Cargar proveedores al montar el componente
  useEffect(() => {
    async function fetchProveedores() {
      try {
        const res = await fetch('/api/proveedores');
        if (!res.ok) {
          throw new Error('No se pudo cargar la lista de proveedores.');
        }
        const data = await res.json();
        setProveedores(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingProveedores(false);
      }
    }
    fetchProveedores();
  }, []);

  const handleProveedorSelectChange = (e) => {
    const value = e.target.value;
    if (value === 'new') {
      setShowNewProveedorModal(true);
      setProveedorId(''); // Limpiar la selección actual si se elige crear uno nuevo
    } else {
      setProveedorId(value);
    }
  };

  const handleNewProveedorChange = (e) => {
    const { name, value } = e.target;
    setNewProveedor(prev => ({ ...prev, [name]: value.toUpperCase() }));
  };

  const handleSaveNewProveedor = async () => {
    if (!newProveedor.nombre) {
      setError('EL NOMBRE DEL NUEVO PROVEEDOR ES OBLIGATORIO.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/proveedores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProveedor),
      });
      if (!res.ok) {
        const errorData = await res.json();
        if (res.status === 409) {
          setShowNewProveedorModal(false);
          setError(errorData.message); // Mostrar error de duplicado en el modal principal
          return;
        }
        throw new Error(errorData.message || 'ERROR AL CREAR EL NUEVO PROVEEDOR.');
      }
      const newProvResult = await res.json();
      const savedProveedor = { id: newProvResult.id, ...newProveedor };

      setProveedores(prev => [...prev, savedProveedor]);
      setProveedorId(savedProveedor.id);
      setShowNewProveedorModal(false);
      setNewProveedor({ nombre: '', nit: '', nit_dv: '', nombre_asesor: '', contacto: '' });
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

  // Manejar cambios en los items
  const handleItemChange = (index, event) => {
    const { name, value } = event.target;
    const newItems = [...items];

    let finalValue = value;
    if (name === 'descripcion') {
      finalValue = value.toUpperCase();
    }

    newItems[index][name] = finalValue;
    setItems(newItems);
  };

  const handleFileChange = (e) => {
    setFacturaFile(e.target.files[0]);
  };

  // Añadir un nuevo item a la lista
  const handleAddItem = () => {
    setItems([...items, { descripcion: '', cantidad: '', precio_unitario: '' }]);
  };

  // Eliminar un item de la lista
  const handleRemoveItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  // Manejar el envío del formulario
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Validaciones
    if (!proveedorId || !numeroFactura || !fechaEmision) {
      setError('Por favor, complete los datos de la factura (proveedor, número y fecha).');
      setLoading(false);
      return;
    }
    if (items.some(item => !item.descripcion || item.cantidad <= 0 || item.precio_unitario <= 0)) {
        setError('Todos los artículos deben tener descripción, y la cantidad y precio deben ser mayores a cero.');
        setLoading(false);
        return;
    }

    // Lógica de IVA
    const incluyeIvaParaApi = ivaOpcion === 'precios_con_iva';

    // Si los precios no incluyen IVA, se calcula el precio con IVA para el backend
    // El backend espera que el precio unitario sea el final (con iva si aplica)
    const itemsParaApi = items.map(item => {
        const precioUnitarioNum = parseFloat(item.precio_unitario);
        let precioFinal = precioUnitarioNum;

        if (ivaOpcion === 'precios_sin_iva') {
            const tasa = parseFloat(tasaIva) / 100;
            precioFinal = precioUnitarioNum * (1 + tasa);
        }

        return {
            ...item,
            cantidad: parseFloat(item.cantidad),
            precio_unitario: precioFinal,
            incluye_iva: true, // Siempre será true porque el precio ya lo lleva calculado
        };
    });

    try {
        // PASO 1: Registrar los datos de la factura
      const res = await fetch('/api/facturas-compras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proveedor_id: parseInt(proveedorId),
          prefijo,
          numero_factura: numeroFactura,
          fecha_emision: fechaEmision,
          items: itemsParaApi
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Error al registrar la factura.');
      }

      const newFacturaId = data.factura.id;

      // PASO 2: Subir el archivo si existe
      if (facturaFile && newFacturaId) {
        const formData = new FormData();
        formData.append('facturaFile', facturaFile);
        formData.append('facturaCompraId', newFacturaId);
        formData.append('numeroFactura', numeroFactura);

        const resFile = await fetch('/api/upload-factura-compra', {
          method: 'POST',
          body: formData,
        });

        if (!resFile.ok) {
          const fileError = await resFile.json();
          throw new Error(fileError.message || 'Los datos se guardaron, pero falló la subida del archivo.');
        }
      }

      setSuccess('Factura registrada exitosamente');
      // Resetear formulario
      setProveedorId('');
      setPrefijo('');
      setNumeroFactura('');
      setFechaEmision('');
      setFacturaFile(null);
      if (document.getElementById('formFile')) {
        document.getElementById('formFile').value = '';
      }
      setItems([{ descripcion: '', cantidad: '', precio_unitario: '' }]);
      setIvaOpcion('precios_sin_iva');
      setTasaIva('19');

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const subtotal = items.reduce((acc, item) => {
    const cantidad = parseFloat(item.cantidad) || 0;
    const precio = parseFloat(item.precio_unitario) || 0;
    return acc + (cantidad * precio);
  }, 0);

  const montoIva = ivaOpcion === 'precios_sin_iva'
    ? subtotal * (parseFloat(tasaIva) / 100)
    : subtotal - (subtotal / (1 + (parseFloat(tasaIva) / 100)));

  const totalFactura = ivaOpcion === 'precios_sin_iva'
    ? subtotal + montoIva
    : subtotal;

  return (
    <Container fluid className="p-4">
      <h1 className="mb-4">Registro de Facturas</h1>

      {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

      <Form onSubmit={handleSubmit}>
        <Row className="mb-3 p-3 border rounded">
          <Col md={4}>
            <Form.Group controlId="formProveedor">
              <Form.Label>Proveedor</Form.Label>
              <Form.Select
                value={proveedorId}
                onChange={handleProveedorSelectChange}
                required
                disabled={loadingProveedores}
              >
                <option value="">{loadingProveedores ? 'Cargando...' : 'Seleccione un proveedor'}</option>
                {proveedores.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
                <option value="new">-- CREAR NUEVO PROVEEDOR --</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={2}>
            <Form.Group controlId="formPrefijo">
              <Form.Label>Prefijo</Form.Label>
              <Form.Control
                type="text"
                value={prefijo}
                onChange={(e) => setPrefijo(e.target.value.toUpperCase())}
                style={{ textTransform: 'uppercase' }}
              />
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group controlId="formNumeroFactura">
              <Form.Label>Número de Factura</Form.Label>
              <Form.Control
                type="text"
                value={numeroFactura}
                onChange={(e) => setNumeroFactura(e.target.value.toUpperCase())}
                required
                style={{ textTransform: 'uppercase' }}
              />
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group controlId="formFechaEmision">
              <Form.Label>Fecha de Emisión</Form.Label>
              <Form.Control
                type="date"
                value={fechaEmision}
                onChange={(e) => setFechaEmision(e.target.value)}
                required
              />
            </Form.Group>
          </Col>
           <Col md={12} className="mt-3">
            <Form.Group controlId="formFile">
              <Form.Label>Archivo de Factura (PDF/Imagen)</Form.Label>
              <Form.Control
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.jpg,.jpeg,.png"
              />
            </Form.Group>
          </Col>
        </Row>

        <Row className="p-3 border rounded mb-3">
            <Col md={12}>
                <Form.Group>
                    <Form.Label className="fw-bold">Configuración de IVA para esta factura</Form.Label>
                    <div className="d-flex align-items-center">
                        <Form.Check
                            type="radio"
                            id="precios_sin_iva"
                            name="ivaOpcion"
                            label="Los precios unitarios NO incluyen IVA."
                            value="precios_sin_iva"
                            checked={ivaOpcion === 'precios_sin_iva'}
                            onChange={(e) => setIvaOpcion(e.target.value)}
                            className="me-4"
                        />
                        <Form.Check
                            type="radio"
                            id="precios_con_iva"
                            name="ivaOpcion"
                            label="Los precios unitarios YA incluyen IVA."
                            value="precios_con_iva"
                            checked={ivaOpcion === 'precios_con_iva'}
                            onChange={(e) => setIvaOpcion(e.target.value)}
                        />
                    </div>
                </Form.Group>
            </Col>
        </Row>

        <h3 className="mt-4">Artículos de la Factura</h3>
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th style={{width: '60%'}}>Descripción</th>
              <th>Cantidad</th>
              <th>Precio Unitario</th>
              <th className="text-center">Acción</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index}>
                <td>
                  <Form.Control type="text" name="descripcion" value={item.descripcion} onChange={e => handleItemChange(index, e)} required style={{ textTransform: 'uppercase' }} />
                </td>
                <td>
                  <Form.Control type="number" name="cantidad" value={item.cantidad} onChange={e => handleItemChange(index, e)} required min="0.01" step="0.01" />
                </td>
                <td>
                  <Form.Control type="number" name="precio_unitario" value={item.precio_unitario} onChange={e => handleItemChange(index, e)} required min="0.01" step="0.01" />
                </td>
                <td className="text-center align-middle">
                  <Button variant="danger" size="sm" onClick={() => handleRemoveItem(index)} disabled={items.length === 1}>
                    Eliminar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>

        <Button variant="outline-secondary" onClick={handleAddItem} className="me-2 mb-3">
          Añadir Artículo
        </Button>

        <Row className="justify-content-end mt-3">
            <Col md={5}>
                <Table>
                    <tbody>
                        <tr>
                            <td className="fw-bold">SUBTOTAL</td>
                            <td className="text-end">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(ivaOpcion === 'precios_sin_iva' ? subtotal : totalFactura - montoIva)}</td>
                        </tr>
                        <tr>
                            <td className="d-flex align-items-center">
                                <span className="fw-bold me-2">IVA</span>
                                <Form.Select size="sm" value={tasaIva} onChange={(e) => setTasaIva(e.target.value)} style={{width: '80px'}}>
                                    <option value="19">19%</option>
                                    <option value="5">5%</option>
                                    <option value="0">0%</option>
                                </Form.Select>
                            </td>
                            <td className="text-end">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(montoIva)}</td>
                        </tr>
                        <tr>
                            <td className="fw-bold fs-5">TOTAL</td>
                            <td className="text-end fw-bold fs-5">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(totalFactura)}</td>
                        </tr>
                    </tbody>
                </Table>
            </Col>
        </Row>

        <hr className="my-4" />

        <div className="text-end">
            <Button type="submit" variant="success" disabled={loading}>
                {loading ? <><Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> Registrando...</> : 'Registrar Factura'}
            </Button>
        </div>
      </Form>

        {/* Modal para Crear Nuevo Proveedor */}
        <Modal show={showNewProveedorModal} onHide={() => setShowNewProveedorModal(false)} centered>
            <Modal.Header closeButton>
                <Modal.Title>NUEVO PROVEEDOR</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form.Group className="mb-3">
                    <Form.Label>NOMBRE</Form.Label>
                    <Form.Control
                        type="text"
                        name="nombre"
                        value={newProveedor.nombre}
                        onChange={handleNewProveedorChange}
                        className="text-uppercase"
                        required
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
                                className="text-uppercase"
                                placeholder="Ej: 900900900"
                            />
                        </Col>
                        <Col xs={3}>
                            <Form.Control
                                type="text"
                                name="nit_dv"
                                value={newProveedor.nit_dv}
                                onChange={handleNewProveedorChange}
                                className="text-uppercase"
                                placeholder="DV"
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
            </Modal.Body>
            <Modal.Footer>
                <Button variant="outline-secondary" onClick={() => setShowNewProveedorModal(false)} disabled={loading} size="sm">
                    Cancelar
                </Button>
                <Button variant="outline-primary" onClick={handleSaveNewProveedor} disabled={loading} size="sm">
                    {loading ? <><Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> Guardando...</> : 'Guardar Proveedor'}
                </Button>
            </Modal.Footer>
        </Modal>
    </Container>
  );
}

export default RegistroFacturasPage;
