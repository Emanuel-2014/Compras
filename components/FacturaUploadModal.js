import { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Row, Col, Spinner } from 'react-bootstrap';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

function FacturaUploadModal({ show, onHide, id_solicitud, onFacturaUploaded }) {
  const [facturaFile, setFacturaFile] = useState(null);
  const [numeroFactura, setNumeroFactura] = useState('');
  const [fechaFactura, setFechaFactura] = useState(new Date());
  const [valorFactura, setValorFactura] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!show) {
      // Reset form when modal is hidden
      setFacturaFile(null);
      setNumeroFactura('');
      setFechaFactura(new Date());
      setValorFactura('');
      setError('');
    }
  }, [show]);

  const handleFileChange = (e) => {
    setFacturaFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!facturaFile || !numeroFactura || !fechaFactura || !valorFactura) {
      setError('Todos los campos son obligatorios.');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('facturaFile', facturaFile);
    formData.append('id_solicitud', id_solicitud);
    formData.append('numero_factura', numeroFactura);
    formData.append('fecha_factura', fechaFactura.toISOString().split('T')[0]);
    formData.append('valor_factura', valorFactura);

    try {
      const response = await fetch('/api/upload-factura', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Error al subir la factura.');
      }

      onFacturaUploaded(); // Notify parent component to refresh data
      onHide(); // Close modal
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Subir Nueva Factura</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
        <Form onSubmit={handleSubmit}>
          <Form.Group as={Row} className="mb-3">
            <Form.Label column sm="4">Número de Factura:</Form.Label>
            <Col sm="8">
              <Form.Control
                type="text"
                value={numeroFactura}
                onChange={(e) => setNumeroFactura(e.target.value)}
                required
              />
            </Col>
          </Form.Group>

          <Form.Group as={Row} className="mb-3">
            <Form.Label column sm="4">Fecha de Factura:</Form.Label>
            <Col sm="8">
              <DatePicker
                selected={fechaFactura}
                onChange={(date) => setFechaFactura(date)}
                className="form-control"
                dateFormat="yyyy-MM-dd"
                required
              />
            </Col>
          </Form.Group>

          <Form.Group as={Row} className="mb-3">
            <Form.Label column sm="4">Valor Total de Factura:</Form.Label>
            <Col sm="8">
              <Form.Control
                type="number"
                step="0.01"
                value={valorFactura}
                onChange={(e) => setValorFactura(e.target.value)}
                required
              />
            </Col>
          </Form.Group>

          <Form.Group as={Row} className="mb-3">
            <Form.Label column sm="4">Archivo de Factura (PDF/Imagen):</Form.Label>
            <Col sm="8">
              <Form.Control
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.jpg,.jpeg,.png"
                required
              />
            </Col>
          </Form.Group>

          <div className="d-flex justify-content-end mt-4">
            <Button variant="outline-secondary" onClick={onHide} className="me-2" disabled={loading}>Cancelar</Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> : 'Subir Factura'}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
}

export default FacturaUploadModal;
