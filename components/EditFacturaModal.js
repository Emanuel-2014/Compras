'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Container, Form, Button, Row, Col, Table, Alert, Spinner } from 'react-bootstrap';
import Swal from 'sweetalert2';

export default function EditFacturaModal({ show, onHide, facturaId, onFacturaUpdated }) {
  const [proveedores, setProveedores] = useState([]);
  const [proveedorId, setProveedorId] = useState('');
  const [prefijo, setPrefijo] = useState('');
  const [numeroFactura, setNumeroFactura] = useState('');
  const [fechaEmision, setFechaEmision] = useState('');
  const [facturaFile, setFacturaFile] = useState(null);
  const [items, setItems] = useState([
    { descripcion: '', cantidad: '', precio_unitario: '', incluye_iva: false }
  ]);

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [ivaPercentage, setIvaPercentage] = useState(19); // Initialize with a default value
  const [subtotal, setSubtotal] = useState(0);
  const [totalIvaCalculated, setTotalIvaCalculated] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (show && facturaId) {
      // Cargar datos de la factura, proveedores y configuración
      async function fetchData() {
        setLoadingData(true);
        try {
          // Fetch settings for IVA
          const settingsRes = await fetch('/api/settings');
          if (!settingsRes.ok) throw new Error('No se pudo cargar la configuración de la aplicación.');
          const settingsData = await settingsRes.json();
          setIvaPercentage(parseFloat(settingsData.iva_percentage) || 0);

          // Fetch providers
          const provRes = await fetch('/api/proveedores');
          if (!provRes.ok) throw new Error('No se pudo cargar la lista de proveedores.');
          const provData = await provRes.json();
          setProveedores(provData);

          // Fetch factura data
          const factRes = await fetch(`/api/facturas-compras/${facturaId}`);
          if (!factRes.ok) throw new Error('No se pudieron cargar los datos de la factura.');
          const factData = await factRes.json();

          setProveedorId(factData.proveedor_id);
          setPrefijo(factData.prefijo || '');
          setNumeroFactura(factData.numero_factura || '');
          // The date from DB is 'YYYY-MM-DD ...', needs to be 'YYYY-MM-DD' for the input
          setFechaEmision(factData.fecha_emision ? factData.fecha_emision.split('T')[0] : '');
          setItems(factData.items.length > 0 ? factData.items : [{ descripcion: '', cantidad: '', precio_unitario: '', incluye_iva: false }]);
          setIvaPercentage(factData.iva_percentage || 19); // Load IVA from factura data or default to 19
          setSubtotal(0); // Reset totals
          setTotalIvaCalculated(0); // Reset totals
          setTotal(0); // Reset totals

        } catch (err) {
          Swal.fire({
            title: 'Error',
            text: err.message,
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
        } finally {
          setLoadingData(false);
        }
      }
      fetchData();
    }
  }, [show, facturaId]);

  useEffect(() => {
    let currentSubtotal = 0;
    let currentTotalIva = 0;

    items.forEach(item => {
      const cantidad = parseFloat(item.cantidad) || 0;
      const precio_unitario = parseFloat(item.precio_unitario) || 0;
      const baseValue = cantidad * precio_unitario;

      if (baseValue > 0) {
        if (item.incluye_iva) {

          const ivaRate = ivaPercentage / 100;
          const itemSubtotalBeforeIva = baseValue / (1 + ivaRate);
          const itemIva = baseValue - itemSubtotalBeforeIva;
          currentSubtotal += itemSubtotalBeforeIva;
          currentTotalIva += itemIva;
        } else {

          const itemIva = baseValue * (ivaPercentage / 100);
          currentSubtotal += baseValue;
          currentTotalIva += itemIva;
        }
      }
    });

    setSubtotal(currentSubtotal);
    setTotalIvaCalculated(currentTotalIva);
    setTotal(currentSubtotal + currentTotalIva);
  }, [items, ivaPercentage]);

  const handleItemChange = (index, event) => {
    const { name, value, type, checked } = event.target;
    const newItems = [...items];

    if (name === 'incluye_iva') {
      newItems[index].incluye_iva = checked;
    } else {
      let finalValue = value;
      if (name === 'descripcion') {
        finalValue = value.toUpperCase();
      }
      newItems[index][name] = finalValue;
    }

    setItems(newItems);
  };

  const handleFileChange = (e) => {
    setFacturaFile(e.target.files[0]);
  };

  const handleAddItem = () => {
    setItems([...items, { descripcion: '', cantidad: '', precio_unitario: '', incluye_iva: false }]);
  };

  const handleRemoveItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

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

    try {
      // PASO 1: Actualizar los datos de la factura
      const resData = await fetch(`/api/facturas-compras/${facturaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proveedor_id: parseInt(proveedorId),
          prefijo: prefijo.toUpperCase(),
          numero_factura: numeroFactura.toUpperCase(),
          fecha_emision: fechaEmision,
          subtotal: subtotal,
          total_iva_calculated: totalIvaCalculated,
          total: total,
          iva_percentage: ivaPercentage,
          items: items.map(item => ({
            ...item,
            cantidad: parseFloat(item.cantidad),
            precio_unitario: parseFloat(item.precio_unitario)
          }))
        }),
      });

      const data = await resData.json();
      if (!resData.ok) {
        throw new Error(data.message || 'Error al actualizar la factura.');
      }

      // PASO 2: Subir un nuevo archivo si se seleccionó uno
      if (facturaFile) {
        const formData = new FormData();
        formData.append('facturaFile', facturaFile);
        formData.append('facturaCompraId', facturaId);
        formData.append('numeroFactura', numeroFactura);

        const resFile = await fetch('/api/upload-factura-compra', {
          method: 'POST',
          body: formData,
        });

        if (!resFile.ok) {
          const fileError = await resFile.json();
          throw new Error(fileError.message || 'Los datos se guardaron, pero falló la subida del nuevo archivo.');
        }
      }

      await Swal.fire({
        title: '¡Factura Actualizada!',
        text: 'La factura ha sido actualizada exitosamente.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });

      onFacturaUpdated();
      onHide();

    } catch (err) {
      Swal.fire({
        title: 'Error',
        text: err.message,
        icon: 'error',
        confirmButtonText: 'Aceptar'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="xl">
      <Modal.Header closeButton>
        <Modal.Title>Editar Factura de Compra</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {loadingData ? (
          <div className="text-center"><Spinner /> Cargando datos...</div>
        ) : (
          <Container fluid>
              <Form onSubmit={handleSubmit}>
                  <Row className="mb-3">
                  <Col md={6}>
                      <Form.Group controlId="formProveedorEdit">
                      <Form.Label>Proveedor</Form.Label>
                          <Form.Select value={proveedorId} onChange={(e) => setProveedorId(e.target.value)} required>
                              <option value="">Seleccione un proveedor</option>
                              {proveedores.map(p => (
                                <option key={p.id} value={p.id}>{p.nombre}</option>
                              ))}
                          </Form.Select>
                      </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group>
                        <Form.Label>Número de Factura</Form.Label>
                        <Row>
                            <Col xs={5}>
                                <Form.Control
                                    type="text"
                                    placeholder="Prefijo"
                                    value={prefijo}
                                    onChange={(e) => setPrefijo(e.target.value.toUpperCase())}
                                    style={{ textTransform: 'uppercase' }}
                                />
                            </Col>
                            <Col xs={7}>
                                <Form.Control
                                    type="text"
                                    placeholder="Número"
                                    value={numeroFactura}
                                    onChange={(e) => setNumeroFactura(e.target.value.toUpperCase())}
                                    required
                                    style={{ textTransform: 'uppercase' }}
                                />
                            </Col>
                        </Row>
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                      <Form.Group controlId="formFechaEmisionEdit">
                      <Form.Label>Fecha de Emisión</Form.Label>
                      <Form.Control
                          type="date"
                          value={fechaEmision}
                          onChange={(e) => setFechaEmision(e.target.value)}
                          required
                      />
                      </Form.Group>
                  </Col>
                  </Row>

                  <Form.Group as={Row} className="mb-3">
                      <Form.Label column sm="3">Reemplazar Archivo (PDF/Imagen)</Form.Label>
                      <Col sm="9">
                          <Form.Control type="file" onChange={handleFileChange} accept=".pdf,.jpg,.jpeg,.png" />
                      </Col>
                  </Form.Group>

                  <h4 className="mt-4">Artículos de la Factura</h4>
                  <Table striped bordered hover responsive>
                  <thead>
                      <tr>
                        <th style={{width: '50%'}}>Descripción</th>
                        <th>Cantidad</th>
                        <th>Precio Unitario</th>
                        <th className="text-center">Incluye IVA</th>
                        <th className="text-center">Acción</th>
                      </tr>
                  </thead>
                  <tbody>
                      {items.map((item, index) => (
                      <tr key={index}>
                          <td>
                            <Form.Control type="text" name="descripcion" value={item.descripcion} onChange={e => handleItemChange(index, e)} required style={{ textTransform: 'uppercase' }}/>
                          </td>
                          <td>
                            <Form.Control type="number" name="cantidad" value={item.cantidad} onChange={e => handleItemChange(index, e)} required min="0.01" step="0.01" />
                          </td>
                          <td>
                            <Form.Control type="number" name="precio_unitario" value={item.precio_unitario} onChange={e => handleItemChange(index, e)} required min="0.01" step="0.01" />
                          </td>
                          <td className="text-center align-middle">
                            <Form.Check type="checkbox" name="incluye_iva" checked={item.incluye_iva} onChange={e => handleItemChange(index, e)} />
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

                  <Button variant="outline-secondary" onClick={handleAddItem}>
                    Añadir Artículo
                  </Button>

                  <div className="mt-4 p-3 border rounded">
                      <h5>Resumen de la Factura</h5>
                      <Row>
                          <Col md={9} className="text-end"><strong>Subtotal:</strong></Col>
                          <Col md={3} className="text-end">{subtotal.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</Col>
                      </Row>
                      <Row>
                          <Col md={9} className="text-end"><strong>IVA ({ivaPercentage}%):</strong></Col>
                          <Col md={3} className="text-end">{totalIvaCalculated.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</Col>
                      </Row>
                      <Row>
                          <Col md={9} className="text-end"><h4>Total:</h4></Col>
                          <Col md={3} className="text-end"><h4>{total.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</h4></Col>
                      </Row>
                  </div>

                  <div className="d-flex justify-content-end mt-4">
                      <Button variant="outline-secondary" onClick={onHide} className="me-2" disabled={loading}>Cancelar</Button>
                      <Button variant="primary" type="submit" disabled={loading}>
                          {loading ? <><Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> Guardando...</> : 'Guardar Cambios'}
                      </Button>
                  </div>
              </Form>
          </Container>
        )}
      </Modal.Body>
    </Modal>
  );
}
