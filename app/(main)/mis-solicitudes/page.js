'use client';
import { useEffect, useState } from 'react';
import { useSession } from '@/hooks/useSession';
import { Container, Card, Spinner, Alert, Table, Form, Row, Col, Button } from 'react-bootstrap';
import { useRouter } from 'next/navigation';
import DatePicker, { registerLocale } from 'react-datepicker';
import { es } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import styles from './page.module.css';
import FacturaViewerModal from '@/components/FacturaViewerModal';
registerLocale('es', es);
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}
const getStatusClass = (status) => {
  const statusClass = styles[`status-${status.replace(/\s+/g, '-').toLowerCase()}`] || styles['status-pendiente'];
  return `${styles.status} ${statusClass}`;
};
export default function Page() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();
  const [filters, setFilters] = useState({
    estado: '',
    fecha: '',
    solicitanteId: '',
    dependencia: '',
    item_descripcion: ''
  });
  const [solicitantes, setSolicitantes] = useState([]);
  const [dependencias, setDependencias] = useState([]);
  const [showFacturaViewerModal, setShowFacturaViewerModal] = useState(false);
  const [facturaToView, setFacturaToView] = useState(null);
  const { session, loading: sessionLoading } = useSession();
  const debouncedFilters = useDebounce(filters, 500);
  useEffect(() => {
    if (sessionLoading) return; // Wait for session to load
    const fetchSolicitudes = async () => {
      setLoading(true);
      try {
        const cleanFilters = Object.entries(debouncedFilters).reduce((acc, [key, value]) => {
          if (value) acc[key] = value;
          return acc;
        }, {});
        if (session && session.user) {
          if (session.user.rol?.toLowerCase() === 'administrador' || session.user.rol?.toLowerCase() === 'coordinador') {
            cleanFilters.coordinadorId = session.user.id;
          } else if (session.user.rol?.toLowerCase() === 'aprobador' || session.user.rol?.toLowerCase() === 'solicitante') {
            cleanFilters.id_usuario = session.user.id;
          }
        }
        const query = new URLSearchParams(cleanFilters).toString();
        const response = await fetch(`/api/mis-solicitudes?${query}`);
        if (response.ok) {
          const data = await response.json();
          setSolicitudes(data.solicitudes);
          setSolicitantes(data.filtros.solicitantes);
          setDependencias(data.filtros.dependencias);
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Error al cargar las solicitudes.');
        }
      } catch (err) {
        setError('Error de red o servidor inalcanzable.');
      }
      finally {
        setLoading(false);
      }
    };
    fetchSolicitudes();
  }, [debouncedFilters, session, sessionLoading]); // Effect now depends on debounced filters, session and sessionLoading
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };
  const handleDateChange = (date) => {
    const formattedDate = date ? date.toISOString().split('T')[0] : '';
    setFilters((prev) => ({
      ...prev,
      fecha: formattedDate
    }));
  };
  const handleShowFacturaViewerModal = (filename) => {
    setFacturaToView(filename);
    setShowFacturaViewerModal(true);
  };
  const handleCloseFacturaViewerModal = () => {
    setFacturaToView(null);
    setShowFacturaViewerModal(false);
  };
    return (
      <>
        <Container className="mt-5">
          <Card className="shadow-sm">
            <Card.Header as="h2" className={`text-center ${styles.pageTitle}`}>MIS SOLICITUDES DE COMPRA</Card.Header>
            <Card.Body>
              <div className={styles.filters}>
                <Form className="mb-4">
                  <Row className="align-items-end gy-3">
                    <Col md={2} sm={6}>
                      <Form.Group>
                        <Form.Label>Dependencia</Form.Label>
                        <Form.Select name="dependencia" value={filters.dependencia} onChange={handleFilterChange}>
                          <option value="">Todas</option>
                          {dependencias.map(dep => <option key={dep} value={dep}>{dep}</option>)}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={3} sm={6}>
                      <Form.Group>
                        <Form.Label>Solicitante</Form.Label>
                        <Form.Select name="solicitanteId" value={filters.solicitanteId} onChange={handleFilterChange}>
                          <option value="">Todos</option>
                          {solicitantes.map(sol => <option key={sol.id} value={sol.id}>{sol.nombre}</option>)}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={3} sm={6}>
                      <Form.Group>
                        <Form.Label>Descripción de Item</Form.Label>
                        <Form.Control type="text" name="item_descripcion" value={filters.item_descripcion} onChange={handleFilterChange} placeholder="Ej: computador, tornillo"/>
                      </Form.Group>
                    </Col>
                    <Col md={2} sm={6}>
                      <Form.Group>
                        <Form.Label>Estado</Form.Label>
                        <Form.Select name="estado" value={filters.estado} onChange={handleFilterChange}>
                          <option value="">Todos</option>
                          <option value="pendiente">Pendiente</option>
                          <option value="aprobada">Aprobada</option>
                          <option value="rechazada">Rechazada</option>
                          <option value="completada">Completada</option>
                          <option value="en proceso">En Proceso</option>
                          <option value="cerrada">Cerrada</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={2} sm={6}>
                      <Form.Group>
                        <Form.Label>Fecha</Form.Label>
                        <DatePicker
                          selected={filters.fecha ? new Date(filters.fecha + 'T00:00:00-05:00') : null}
                          onChange={handleDateChange}
                          dateFormat="yyyy-MM-dd"
                          className="form-control"
                          placeholderText="Seleccione una fecha"
                          isClearable
                          locale="es"
                          showMonthDropdown
                          showYearDropdown
                          dropdownMode="select"
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </Form>
              </div>
              {loading ? (
                <div className="text-center">
                    <Spinner animation="border" />
                    <p>Cargando solicitudes...</p>
                </div>
              ) : error ? (
                <Alert variant="danger">{error}</Alert>
              ) : solicitudes.length === 0 ? (
                <Alert variant="info">No se encontraron solicitudes con los filtros aplicados.</Alert>
              ) : (
                <Table striped bordered hover responsive className={styles.solicitudesTable}>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Fecha</th>
                      <th>Estado</th>
                      <th>Comentario de Rechazo</th>
                      <th>Factura</th>
                    </tr>
                  </thead>
                  <tbody>
                    {solicitudes.map((solicitud, index) => (
                      <tr key={`${solicitud.solicitud_id}-${index}`} className={styles.clickableRow} onClick={() => router.push(`/solicitud/${solicitud.solicitud_id}`)}>
                        <td>{solicitud.solicitud_id}</td>
                        <td>{new Date(solicitud.fecha_solicitud).toLocaleDateString()}</td>
                        <td><span className={getStatusClass(solicitud.estado)}>{solicitud.estado}</span></td>
                        <td>
                          {solicitud.estado === 'rechazada' && solicitud.rechazo_comentario ? (
                            <span className={styles['rejection-comment']}>{solicitud.rechazo_comentario}</span>
                          ) : (
                            'N/A'
                          )}
                        </td>
                         <td>
                        {solicitud.facturas && solicitud.facturas.length > 0 ? (
                        <Button
                        variant="outline-info"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleShowFacturaViewerModal(solicitud.facturas[0].nombre_archivo_guardado); }}
                         >
                        Ver Factura
                        </Button>
                        ) : (
                        'N/A'
                        )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Container>
        <FacturaViewerModal
          show={showFacturaViewerModal}
          onHide={handleCloseFacturaViewerModal}
          filename={facturaToView}
        />
      </>
    );
  }