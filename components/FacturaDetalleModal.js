'use client';

import { useState, useEffect } from 'react';
import { Modal, Table, Spinner, Alert, Row, Col, Button } from 'react-bootstrap';
import FacturaViewerModal from './FacturaViewerModal'; // Importar el visor
import { useSession } from '@/hooks/useSession';

function formatCurrency(value) {
  const numericValue = Number(value);
  if (isNaN(numericValue)) {
    return '$ 0';
  }
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numericValue);
}

export default function FacturaDetalleModal({ facturaId, show, onHide, onEditClick }) {
  const { session } = useSession();
  const [factura, setFactura] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showViewer, setShowViewer] = useState(false); // Estado para el visor
  const [ivaPercentage, setIvaPercentage] = useState(0);

  useEffect(() => {
    if (facturaId && show) {
      const fetchFacturaDetalle = async () => {
        setLoading(true);
        setError(null);
        setFactura(null);
        try {
          // Obtener configuración de la app (IVA)
          const settingsRes = await fetch('/api/settings');
          if (!settingsRes.ok) throw new Error('No se pudo cargar la configuración.');
          const settingsData = await settingsRes.json();
          setIvaPercentage(parseFloat(settingsData.iva_percentage) || 0);

          // Obtener detalles de la factura
          const response = await fetch(`/api/facturas-compras/${facturaId}`);
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error al cargar los detalles de la factura.');
          }
          const data = await response.json();
          setFactura(data);
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchFacturaDetalle();
    }
  }, [facturaId, show]);

  const handleHide = () => {
    setFactura(null);
    setError(null);
    onHide();
  }

  const ivaRate = ivaPercentage / 100;

  // Calcula el subtotal de un item, añadiendo IVA si es necesario
  const calculateItemSubtotal = (item) => {
    const price = parseFloat(item.precio_unitario);
    const quantity = parseFloat(item.cantidad);

    if (item.incluye_iva) {
      return price * quantity;
    } else {
      return price * (1 + ivaRate) * quantity;
    }
  };

  // Calcula el total de la factura, añadiendo IVA donde corresponda
  const calculateTotal = (items) => {
    if (!items) return 0;
    return items.reduce((sum, item) => sum + calculateItemSubtotal(item), 0);
  };

  return (
    <>
      <Modal show={show} onHide={handleHide} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Detalles de la Factura (IVA Incluido)</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loading && (
            <div className="text-center">
              <Spinner animation="border" />
              <p>Cargando detalles...</p>
            </div>
          )}
          {error && <Alert variant="danger">{error}</Alert>}
          {factura && (
            <div>
              <Row className="mb-3">
                <Col md={6}>
                  <p><strong>Proveedor:</strong> {factura.proveedor_nombre}</p>
                  <p><strong>Número de Factura:</strong> {factura.numero_factura}</p>
                  <p><strong>Prefijo:</strong> {factura.prefijo || 'N/A'}</p>
                  <p><strong>Registrado por:</strong> {factura.usuario_nombre || 'N/A'}</p>
                </Col>
                <Col md={6}>
                  <p><strong>Fecha de Emisión:</strong> {new Date(factura.fecha_emision).toLocaleDateString('es-CO')}</p>
                  <p><strong>Fecha de Recepción:</strong> {factura.fecha_recepcion ? new Date(factura.fecha_recepcion).toLocaleDateString('es-CO') : 'N/A'}</p>
                  <p><strong>Fecha de Registro:</strong> {factura.fecha_creacion ? new Date(factura.fecha_creacion).toLocaleDateString('es-CO') : 'N/A'}</p>
                </Col>
              </Row>

              <h5 className="mt-4">Artículos (Precios con IVA)</h5>
              <Table striped bordered hover responsive size="sm">
                <thead>
                  <tr>
                    <th>Descripción</th>
                    <th className="text-end">Cantidad</th>
                    <th className="text-end">Precio Unitario (con IVA)</th>
                    <th className="text-end">Subtotal (con IVA)</th>
                  </tr>
                </thead>
                <tbody>
                  {factura.items.map(item => {
                    const precioConIva = item.incluye_iva ? parseFloat(item.precio_unitario) : parseFloat(item.precio_unitario) * (1 + ivaRate);
                    return (
                      <tr key={item.id}>
                        <td>{item.descripcion}</td>
                        <td className="text-end">{item.cantidad}</td>
                        <td className="text-end">{formatCurrency(precioConIva)}</td>
                        <td className="text-end">{formatCurrency(item.cantidad * precioConIva)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <th colSpan="3" className="text-end">Total (IVA Incluido):</th>
                    <th className="text-end">{formatCurrency(calculateTotal(factura.items))}</th>
                  </tr>
                </tfoot>
              </Table>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={handleHide}>
            Cerrar
          </Button>
          {factura && factura.archivo_path && (
            <Button variant="outline-primary" onClick={() => setShowViewer(true)}>
              Ver Archivo Adjunto
            </Button>
          )}
          {session?.user?.rol?.toLowerCase() === 'administrador' && factura && (
            <Button variant="outline-warning" onClick={() => onEditClick(factura.id)}>
              Editar
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      {factura && (
        <FacturaViewerModal
          show={showViewer}
          onHide={() => setShowViewer(false)}
          filename={factura.archivo_path}
          tipoFactura="compra"
        />
      )}
    </>
  );
}
