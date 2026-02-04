'use client';

import { useEffect, useState, useCallback } from 'react';
import { Container, Card, Spinner, Alert, Table, Button, Form, Row, Col, Badge } from 'react-bootstrap';
import { useRouter } from 'next/navigation';
import DatePicker, { registerLocale } from 'react-datepicker';
import { es } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import { useSession } from '@/hooks/useSession';
import styles from './page.module.css';

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

// Helper function to get a Bootstrap badge color based on the status
const getStatusBadge = (status) => {
  switch (status) {
    case 'aprobada':
      return 'success';
    case 'rechazada':
      return 'danger';
    case 'en proceso':
      return 'primary';
    case 'pendiente':
      return 'warning';
    case 'cerrada':
      return 'dark';
    default:
      return 'secondary';
  }
};

export default function SolicitudesAdminPage() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();
  const { session, loading: sessionLoading } = useSession();
  const [filters, setFilters] = useState({
    estado: '',
    fecha: '',
    solicitanteId: '',
    dependencia: '',
    item_descripcion: '',
    proveedorId: ''
  });
  const [solicitantes, setSolicitantes] = useState([]);
  const [dependencias, setDependencias] = useState([]);
  const [proveedores, setProveedores] = useState([]);

  const debouncedFilters = useDebounce(filters, 500);

  const fetchSolicitudes = useCallback(async () => {
    setLoading(true);
    try {
      const cleanFilters = Object.entries(debouncedFilters).reduce((acc, [key, value]) => {
        if (value) acc[key] = value;
        return acc;
      }, {});

      if (session && session.user && session.user.rol?.toLowerCase() === 'coordinador') {
        cleanFilters.coordinadorId = session.user.id;
      }
      // El administrador también actúa como coordinador y debe ver sus solicitudes
      if (session && session.user && session.user.rol?.toLowerCase() === 'administrador') {
        cleanFilters.coordinadorId = session.user.id;
      }

      const query = new URLSearchParams(cleanFilters).toString();
      const response = await fetch(`/api/solicitudes?${query}`, { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        setSolicitudes(data.solicitudes || data);
        setSolicitantes(data.filtros?.solicitantes || []);
        setDependencias(data.filtros?.dependencias || []);
        setProveedores(data.filtros?.proveedores || []);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Error al cargar las solicitudes.');
      }
    } catch (err) {
      setError('Error de red o servidor inalcanzable.');
    } finally {
      setLoading(false);
    }
  }, [debouncedFilters, session, sessionLoading]);

  useEffect(() => {
    if (sessionLoading) return;
    fetchSolicitudes();
  }, [fetchSolicitudes, sessionLoading]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (date) => {
    const formattedDate = date ? date.toISOString().split('T')[0] : '';
    setFilters(prev => ({ ...prev, fecha: formattedDate }));
  };

  const handleExportExcel = async () => {
    if (!solicitudes.length) {
      alert("No hay solicitudes para exportar.");
      return;
    }

    try {
      // Construir los filtros actuales
      const cleanFilters = Object.entries(debouncedFilters).reduce((acc, [key, value]) => {
        if (value) acc[key] = value;
        return acc;
      }, {});

      if (session && session.user && session.user.rol?.toLowerCase() === 'coordinador') {
        cleanFilters.coordinadorId = session.user.id;
      }
      if (session && session.user && session.user.rol?.toLowerCase() === 'administrador') {
        cleanFilters.coordinadorId = session.user.id;
      }

      const query = new URLSearchParams(cleanFilters).toString();
      const response = await fetch(`/api/reports/solicitudes-admin?${query}`);

      if (!response.ok) {
        throw new Error('Error al generar el archivo Excel');
      }

      // Descargar el archivo
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Gestion_Solicitudes.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Error al exportar a Excel');
    }
  };

  const renderFilters = () => (
    <div className={styles.filters}>
      <Form className="mb-4">
        <Row className="g-3 align-items-end">
          <Col md={2} sm={6}>
            <Form.Group>
              <Form.Label>Dependencia</Form.Label>
              <Form.Select name="dependencia" value={filters.dependencia} onChange={handleFilterChange}>
                <option value="">Todas</option>
                {dependencias.map(dep => <option key={dep} value={dep}>{dep}</option>)}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={2} sm={6}>
            <Form.Group>
              <Form.Label>Solicitante</Form.Label>
              <Form.Select name="solicitanteId" value={filters.solicitanteId} onChange={handleFilterChange}>
                <option value="">Todos</option>
                {solicitantes.map(sol => <option key={sol.id} value={sol.id}>{sol.nombre}</option>)}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={2} sm={6}>
            <Form.Group>
              <Form.Label>Proveedor</Form.Label>
              <Form.Select name="proveedorId" value={filters.proveedorId} onChange={handleFilterChange}>
                <option value="">Todos</option>
                {proveedores.map(prov => <option key={prov.id} value={prov.id}>{prov.nombre}</option>)}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={2} sm={6}>
            <Form.Group>
              <Form.Label>Descripción de Item</Form.Label>
              <Form.Control type="text" name="item_descripcion" value={filters.item_descripcion} onChange={handleFilterChange} placeholder="EJ: COMPUTADOR, TORNILLO"/>
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
                placeholderText="SELECCIONE UNA FECHA"
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
  );

  const urgentSolicitudes = solicitudes.filter(s => s.es_urgente === 1 && s.estado !== 'cerrada' && s.estado !== 'rechazada');

  return (
    <Container className="mt-5">
      <Card className="shadow-sm">
        <Card.Header as="h2" className={`text-center ${styles.pageTitle}`}>ADMINISTRAR SOLICITUDES DE COMPRA</Card.Header>
        <Card.Body>
          {urgentSolicitudes.length > 0 && (
            <div className="mb-4">
              {urgentSolicitudes.map(sol => (
                <Alert
                  variant="danger"
                  key={`urgent-${sol.solicitud_id}`}
                  onClick={() => router.push(`/solicitud/${sol.solicitud_id}`)}
                  className={styles.clickableAlert}
                >
                  <strong>¡Atención!</strong> La solicitud <strong>{sol.solicitud_id}</strong> es urgente y requiere su gestión. Haga clic aquí para verla.
                </Alert>
              ))}
            </div>
          )}

          {renderFilters()}
          <div className="mb-3 d-flex justify-content-end">
             <Button onClick={handleExportExcel} variant="outline-success" size="sm">Exportar a Excel</Button>
          </div>
          {loading ? (
             <div className="text-center">
                <Spinner animation="border" role="status">
                  <span className="visually-hidden">Cargando...</span>
                </Spinner>
                <p>Cargando solicitudes...</p>
            </div>
          ) : error ? (
            <Alert variant="danger">{error}</Alert>
          ) : solicitudes.length === 0 ? (
            <Alert variant="info">No se encontraron solicitudes con los filtros actuales.</Alert>
          ) : (
            <Table striped bordered hover responsive className={styles.solicitudesTable}>
              <thead>
                <tr>
                  <th className={styles.noWrapCell}>ID</th>
                  <th className={styles.noWrapCell}>Usuario</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th>Motivo de Rechazo</th>
                </tr>
              </thead>
              <tbody>
                {solicitudes.map((solicitud) => (
                  <tr
                    key={solicitud.solicitud_id}
                    className={`${styles.clickableRow} ${solicitud.es_urgente ? styles.urgentRow : ''}`}
                    onClick={() => router.push(`/solicitud/${solicitud.solicitud_id}`)}
                  >
                    <td className={styles.noWrapCell}>
                      {solicitud.solicitud_id}
                      {solicitud.es_urgente && <Badge bg="danger" className="ms-2">Urgente</Badge>}
                    </td>
                    <td className={styles.noWrapCell}>{solicitud.solicitante_nombre}</td>
                    <td>{new Date(solicitud.fecha_solicitud).toLocaleDateString()}</td>
                    <td>
                      <Badge bg={getStatusBadge(solicitud.estado)}>
                        {solicitud.estado}
                      </Badge>
                    </td>
                    <td>
                      {solicitud.estado === 'rechazada' && solicitud.rechazo_comentario ? solicitud.rechazo_comentario : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
}