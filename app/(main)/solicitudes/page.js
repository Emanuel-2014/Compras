'use client';
import { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Table, Alert, Spinner, Modal } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import DatePicker, { registerLocale } from 'react-datepicker';
import { es } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import { useSession } from '@/hooks/useSession'; // Importar el hook

registerLocale('es', es);

export default function GestionSolicitudesPage() {
  const { session, loading: sessionLoading } = useSession(); // Usar el hook
  const [solicitudes, setSolicitudes] = useState([]);
  const [filtros, setFiltros] = useState({ dependencias: [], solicitantes: [], coordinadores: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // State for filters
  const [activeFilters, setActiveFilters] = useState({
    dependencia: '',
    solicitanteId: '',
    fechaInicio: '',
    fechaFin: '',
    coordinadorId: '', // Añadir filtro de coordinador
  });
  const [fechaInicio, setFechaInicio] = useState(null);
  const [fechaFin, setFechaFin] = useState(null);
  // State for modal
  const [showModal, setShowModal] = useState(false);
  const [selectedSolicitud, setSelectedSolicitud] = useState(null);
  const [comentarioAdmin, setComentarioAdmin] = useState('');
  const [newState, setNewState] = useState('');

  const fetchSolicitudes = async (filters) => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams(filters).toString();
      const response = await fetch(`/api/solicitudes?${query}`);
      if (response.status === 403) {
        throw new Error('No tienes permiso para ver esta página.');
      }
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al obtener las solicitudes.');
      }
      const data = await response.json();
      setSolicitudes(data.solicitudes);
      // Actualizar todos los filtros, incluyendo coordinadores
      setFiltros(data.filtros || { dependencias: [], solicitantes: [], coordinadores: [] });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    // Solo buscar solicitudes si la sesión ha sido cargada
    if (!sessionLoading) {
      fetchSolicitudes(activeFilters);
    }
  }, [sessionLoading]); // Depender de sessionLoading
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setActiveFilters(prev => ({ ...prev, [name]: value }));
  };
  const handleApplyFilters = () => {
    let filtersToApply = {...activeFilters};
    if (fechaInicio) {
      filtersToApply.fechaInicio = fechaInicio.toISOString().split('T')[0];
    }
    if (fechaFin) {
      filtersToApply.fechaFin = fechaFin.toISOString().split('T')[0];
    }
    fetchSolicitudes(filtersToApply);
  };
  const handleShowModal = (solicitud, state) => {
    setSelectedSolicitud(solicitud);
    setNewState(state);
    setComentarioAdmin(solicitud.comentario_admin || '');
    setShowModal(true);
  };
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedSolicitud(null);
    setComentarioAdmin('');
    setNewState('');
  };
  const handleUpdateSolicitud = async () => {
    if (!selectedSolicitud) return;
    try {
      const response = await fetch('/api/solicitudes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          solicitud_id: selectedSolicitud.solicitud_id,
          estado: newState,
          comentario_admin: comentarioAdmin,
        }),
      });
      if (!response.ok) {
        throw new Error('Error al actualizar la solicitud.');
      }
      handleApplyFilters(); // Re-fetch data with current filters
      handleCloseModal();

    } catch (err) {
      setError(err.message);
    }
  };
  const handleExportExcel = async () => {
    if (!solicitudes.length) {
      alert("No hay solicitudes para exportar.");
      return;
    }

    try {
      // Construir filtros actuales para la exportación
      let filtersToApply = {...activeFilters};
      if (fechaInicio) {
        filtersToApply.fechaInicio = fechaInicio.toISOString().split('T')[0];
      }
      if (fechaFin) {
        filtersToApply.fechaFin = fechaFin.toISOString().split('T')[0];
      }

      const query = new URLSearchParams(filtersToApply).toString();
      const response = await fetch(`/api/reports/solicitudes?${query}`);

      if (!response.ok) {
        throw new Error('Error al generar el archivo Excel');
      }

      // Descargar el archivo
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Solicitudes_Filtradas.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Error al exportar a Excel');
    }
  };
  if (loading || sessionLoading) { // Mostrar carga mientras la sesión o los datos se cargan
    return <Container className="text-center mt-5"><Spinner animation="border" /> <p>Cargando...</p></Container>;
  }
  if (error) {
    return <Container className="mt-5"><Alert variant="danger">{error}</Alert></Container>;
  }
  return (
    <Container fluid className="mt-4">
      <h1 className="mb-4">Gestión de Solicitudes</h1>
      <div className="p-3 mb-4 bg-light rounded border">
        <Row className="g-3 align-items-end">
          {session?.rol?.toLowerCase() === 'administrador' && (
            <Col md={3}>
              <Form.Group>
                <Form.Label>Coordinador</Form.Label>
                <Form.Select name="coordinadorId" value={activeFilters.coordinadorId} onChange={handleFilterChange}>
                  <option value="">Todos</option>
                  {filtros.coordinadores.map(coord => <option key={coord.id} value={coord.id}>{coord.nombre}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
          )}
          <Col md={3}>
            <Form.Group>
              <Form.Label>Dependencia</Form.Label>
              <Form.Select name="dependencia" value={activeFilters.dependencia} onChange={handleFilterChange}>
                <option value="">Todas</option>
                {filtros.dependencias.map(dep => <option key={dep} value={dep}>{dep}</option>)}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group>
              <Form.Label>Solicitante</Form.Label>
              <Form.Select name="solicitanteId" value={activeFilters.solicitanteId} onChange={handleFilterChange}>
                <option value="">Todos</option>
                {filtros.solicitantes.map(sol => <option key={sol.id} value={sol.id}>{sol.nombre}</option>)}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={2}>
            <Form.Group className="d-flex flex-column">
              <Form.Label>Fecha Inicio</Form.Label>
              <DatePicker
                selected={fechaInicio}
                onChange={(date) => setFechaInicio(date)}
                className="form-control"
                dateFormat="yyyy-MM-dd"
                locale="es"
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
                isClearable
                placeholderText="Desde"
              />
            </Form.Group>
          </Col>
          <Col md={2}>
            <Form.Group className="d-flex flex-column">
              <Form.Label>Fecha Fin</Form.Label>
              <DatePicker
                selected={fechaFin}
                onChange={(date) => setFechaFin(date)}
                className="form-control"
                dateFormat="yyyy-MM-dd"
                locale="es"
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
                isClearable
                placeholderText="Hasta"
              />
            </Form.Group>
          </Col>
          <Col md={2} className="d-flex flex-column">
            <Button onClick={handleApplyFilters} className="w-100">Filtrar</Button>
          </Col>
        </Row>
      </div>
      <div className="mb-3 d-flex justify-content-between align-items-center">
        <Button onClick={handleExportExcel} variant="success">Exportar a Excel</Button>
        {loading && <Spinner animation="border" size="sm" />}
      </div>
      <Table striped bordered hover responsive size="sm">
        <thead>
          <tr>
            <th>ID Solicitud</th>
            <th>Fecha</th>
            <th>Solicitante</th>
            <th>Dependencia</th>
            <th>Proveedor</th>
            <th>Tipo</th>
            <th>Estado</th>
            <th>Comentario</th>
            <th>Factura</th>
            <th>Acciones</th>
            <th>Urgente</th>
          </tr>
        </thead>
        <tbody>
          {solicitudes.length > 0 ? (
            solicitudes.map(sol => (
              <tr key={sol.solicitud_id}>
                <td>{sol.solicitud_id}</td>
                <td>{new Date(sol.fecha_solicitud).toLocaleDateString()}</td>
                <td>{sol.solicitante_nombre}</td>
                <td>{sol.solicitante_dependencia}</td>
                <td>{sol.proveedor_nombre}</td>
                <td>
                  <span className={`badge bg-${sol.tipo === 'servicio' ? 'info text-dark' : 'secondary'}`}>
                    {sol.tipo?.toUpperCase()}
                  </span>
                </td>
                <td>
                  <span className={`badge bg-${sol.estado === 'aprobada' ? 'success' : sol.estado === 'rechazada' ? 'danger' : 'warning'}`}>
                    {sol.estado}
                  </span>
                </td>
                <td>{sol.comentario_admin}</td>
                <td>{/* Columna de factura vacía por ahora */}</td>
                <td>
                  {sol.es_urgente === 1 && <span className="badge bg-danger">URGENTE</span>}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="10" className="text-center">No se encontraron solicitudes con los filtros actuales.</td>
            </tr>
          )}
        </tbody>
      </Table>
      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>Actualizar Solicitud: {selectedSolicitud?.solicitud_id}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Estás a punto de marcar esta solicitud como <strong>{newState}</strong>.</p>
          <Form.Group>
            <Form.Label>Añadir o editar comentario:</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={comentarioAdmin}
              onChange={(e) => setComentarioAdmin(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>Cancelar</Button>
          <Button variant="primary" onClick={handleUpdateSolicitud}>Guardar Cambios</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}