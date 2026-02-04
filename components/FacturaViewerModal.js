import { Modal, Button } from 'react-bootstrap';

function FacturaViewerModal({ show, onHide, filename, tipoFactura }) {
  const fileUrl = filename ? (tipoFactura === 'compra' ? `/api/download-factura-compra/${filename}` : `/api/download-factura/${filename}`) : '';

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>Visualizar Factura</Modal.Title>
      </Modal.Header>
      <Modal.Body className="d-flex justify-content-center align-items-center" style={{ minHeight: '70vh' }}>
        {filename ? (
          <iframe
            src={fileUrl}
            width="100%"
            height="100%"
            style={{ border: 'none' }}
            title="Visualizador de Factura"
          ></iframe>
        ) : (
          <p>No hay archivo para mostrar.</p>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onHide}>Cerrar</Button>
        {filename && (
          <Button variant="outline-secondary" href={fileUrl} target="_blank" rel="noopener noreferrer">Descargar</Button>
        )}
      </Modal.Footer>
    </Modal>
  );
}

export default FacturaViewerModal;