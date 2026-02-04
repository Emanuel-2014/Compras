'use client';

import { useState, useEffect } from 'react';
import { Modal, Button, Table, Form, Spinner, Alert } from 'react-bootstrap';

export default function RecepcionModal({ show, onHide, solicitud, onReceptionSuccess }) {
  const [items, setItems] = useState([]);
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (show && solicitud) {
      // 1. Inicializar los items para la recepción
      const itemsToReceive = solicitud.items
        .map(item => ({
          ...item,
          cantidad_recibida: '', // Input para el usuario
          prefijo_manual: '',
          numero_factura_manual: '',
          usar_factura_existente: true, // Toggle entre usar factura existente o manual
          factura_compra_seleccionada: '', // Usaremos este para el valor a mostrar/enviar
          cantidad_pendiente: item.cantidad - (item.cantidad_recibida || 0),
        }))
        .filter(item => item.cantidad_pendiente > 0);

      setItems(itemsToReceive);

      // 2. Cargar las facturas del proveedor
      async function fetchFacturas() {
        if (!solicitud.proveedor_id) return;
        try {
          const res = await fetch(`/api/facturas-compras/list?proveedorId=${solicitud.proveedor_id}`);
          if (!res.ok) throw new Error('No se pudieron cargar las facturas del proveedor.');
          const data = await res.json();

          setFacturas(data);
        } catch (err) {
          setError(err.message);
        }
      }
      fetchFacturas();
    }
  }, [show, solicitud]);

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    // Filtrar solo los items que el usuario ha marcado para recibir
    const recepcionesParaEnviar = items
      .filter(item => Number(item.cantidad_recibida) > 0)
      .map(item => {
        let prefijo = null;
        let numero = null;

        if (item.usar_factura_existente && item.factura_compra_seleccionada) {
          // Usar factura de la lista
          const parts = item.factura_compra_seleccionada.split('-');
          if (parts.length >= 2) {
            prefijo = parts[0];
            numero = parts.slice(1).join('-');
          }
        } else if (!item.usar_factura_existente) {
          // Usar factura manual
          prefijo = item.prefijo_manual || null;
          numero = item.numero_factura_manual || null;
        }

        return {
          id_solicitud_item: item.id,
          cantidad_recibida: Number(item.cantidad_recibida),
          prefijo_factura_recepcion: prefijo,
          numero_factura_recepcion: numero,
        };
      });

    if (recepcionesParaEnviar.length === 0) {
      setError('Debe especificar la cantidad recibida para al menos un artículo.');
      setLoading(false);
      return;
    }

    // Validar que la cantidad recibida no exceda la pendiente
    for (const item of items) {
        if (Number(item.cantidad_recibida) > item.cantidad_pendiente) {
            setError(`La cantidad recibida para "${item.descripcion}" no puede exceder la cantidad pendiente (${item.cantidad_pendiente}).`);
            setLoading(false);
            return;
        }
    }

    try {
      const res = await fetch('/api/recepciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recepcionesParaEnviar),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Error al registrar la recepción.');
      }

      onReceptionSuccess(); // Callback para refrescar los datos de la solicitud
      onHide(); // Cerrar el modal

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>Registrar Recepción de Artículos</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}

        <h5>Solicitud: {solicitud?.solicitud_id}</h5>
        <p>Proveedor: {solicitud?.proveedor_nombre}</p>

        <Form>
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>Descripción</th>
                <th style={{ width: '100px' }}>Cant. Pendiente</th>
                <th style={{ width: '120px' }}>Cant. Recibida</th>
                <th style={{ width: '100px' }}>Tipo Factura</th>
                <th style={{ width: '300px' }}>Factura</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id}>
                  <td>{item.descripcion}</td>
                  <td>{item.cantidad_pendiente}</td>
                  <td>
                    <Form.Control
                      type="number"
                      min="0"
                      max={item.cantidad_pendiente}
                      value={item.cantidad_recibida}
                      onChange={(e) => handleItemChange(index, 'cantidad_recibida', e.target.value)}
                    />
                  </td>
                  <td>
                    <Form.Check
                      type="radio"
                      label="Lista"
                      name={`tipoFactura${item.id}`}
                      checked={item.usar_factura_existente}
                      onChange={() => handleItemChange(index, 'usar_factura_existente', true)}
                    />
                    <Form.Check
                      type="radio"
                      label="Manual"
                      name={`tipoFactura${item.id}`}
                      checked={!item.usar_factura_existente}
                      onChange={() => handleItemChange(index, 'usar_factura_existente', false)}
                    />
                  </td>
                  <td>
                    {item.usar_factura_existente ? (
                      <Form.Select
                        value={item.factura_compra_seleccionada}
                        onChange={(e) => handleItemChange(index, 'factura_compra_seleccionada', e.target.value)}
                      >
                        <option value="">Sin Factura</option>
                        {facturas.map(f => (
                          <option key={f.id} value={`${f.prefijo}-${f.numero_factura}`}>
                            {f.prefijo}-{f.numero_factura}
                          </option>
                        ))}
                      </Form.Select>
                    ) : (
                      <div className="d-flex gap-2">
                        <Form.Control
                          type="text"
                          placeholder="Prefijo"
                          value={item.prefijo_manual}
                          onChange={(e) => handleItemChange(index, 'prefijo_manual', e.target.value)}
                          style={{ width: '80px' }}
                        />
                        <Form.Control
                          type="text"
                          placeholder="Número"
                          value={item.numero_factura_manual}
                          onChange={(e) => handleItemChange(index, 'numero_factura_manual', e.target.value)}
                        />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center">Todos los artículos de esta solicitud ya han sido recibidos.</td>
                </tr>
              )}
            </tbody>
          </Table>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={loading}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={handleSubmit} disabled={loading || items.length === 0}>
          {loading ? <Spinner as="span" size="sm" /> : 'Guardar Recepción'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
