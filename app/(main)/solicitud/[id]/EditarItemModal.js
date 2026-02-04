import { Modal, Button, Form, Row, Col, Alert } from 'react-bootstrap';
import { useState, useEffect } from 'react';

export default function EditarItemModal({ show, onHide, item, onSave, loading }) {
  const [formData, setFormData] = useState({
    descripcion: '',
    especificaciones: '',
    cantidad: '',
    observaciones: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (item) {
      setFormData({
        descripcion: item.descripcion || '',
        especificaciones: item.especificaciones || '',
        cantidad: item.cantidad || '',
        observaciones: item.observaciones || '',
      });
      setError('');
    }
  }, [item]);

  if (!item) return null;

  const handleSave = () => {
    if (!formData.descripcion || !formData.cantidad || Number(formData.cantidad) <= 0) {
      setError('La descripción y la cantidad son obligatorias. La cantidad debe ser mayor a cero.');
      return;
    }
    setError('');
    onSave({
      id: item.id,
      ...formData,
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Editar Ítem</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Descripción</Form.Label>
            <Form.Control
              type="text"
              name="descripcion"
              value={formData.descripcion}
              onChange={handleChange}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Especificaciones</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              name="especificaciones"
              value={formData.especificaciones}
              onChange={handleChange}
            />
          </Form.Group>
          <Row>
            <Col md={12}>
              <Form.Group className="mb-3">
                <Form.Label>Cantidad</Form.Label>
                <Form.Control
                  type="number"
                  name="cantidad"
                  value={formData.cantidad}
                  onChange={handleChange}
                  required
                />
              </Form.Group>
            </Col>
          </Row>
          <Form.Group className="mb-3">
            <Form.Label>Observaciones</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              name="observaciones"
              value={formData.observaciones}
              onChange={handleChange}
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onHide}>Cancelar</Button>
        <Button variant="outline-primary" onClick={handleSave} disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
