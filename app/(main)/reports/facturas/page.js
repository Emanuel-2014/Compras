'use client';

import React, { useState, useEffect } from 'react';
import { Container, Card, Spinner, Alert, Table, Form, Row, Col, Button } from 'react-bootstrap';
import { useSession } from '@/hooks/useSession';
import DatePicker, { registerLocale } from 'react-datepicker';
import { es } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';

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

export default function FacturasReportPage() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { session, loading: sessionLoading } = useSession();

  const [filters, setFilters] = useState({
    startDate: null,
    endDate: null,
    dependenciaId: '',
    solicitanteId: '',
    proveedorId: '',
  });

  const [filterOptions, setFilterOptions] = useState({
    dependencias: [],
    solicitantes: [],
    proveedores: [],
  });

  const debouncedFilters = useDebounce(filters, 500);

  useEffect(() => {
    if (sessionLoading) return;

    if (!session || session.user.rol?.toLowerCase() !== 'administrador') {
      setError('Acceso denegado. Solo los administradores pueden ver esta página.');
      setLoading(false);
      return;
    }

    const fetchReport = async () => {
      setLoading(true);
      setError('');
      try {
        const queryParams = new URLSearchParams();
        if (debouncedFilters.startDate) queryParams.append('startDate', debouncedFilters.startDate.toISOString().split('T')[0]);
        if (debouncedFilters.endDate) queryParams.append('endDate', debouncedFilters.endDate.toISOString().split('T')[0]);
        if (debouncedFilters.dependenciaId) queryParams.append('dependenciaId', debouncedFilters.dependenciaId);
        if (debouncedFilters.solicitanteId) queryParams.append('solicitanteId', debouncedFilters.solicitanteId);
        if (debouncedFilters.proveedorId) queryParams.append('proveedorId', debouncedFilters.proveedorId);

        const response = await fetch(`/api/reports/facturas?${queryParams.toString()}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Error al cargar el reporte de facturas.');
        }
        const data = await response.json();
        setReportData(data);
        setFilterOptions(prev => ({
          ...prev,
          dependencias: data.filterOptions.dependencias,
          solicitantes: data.filterOptions.solicitantes,
          proveedores: data.filterOptions.proveedores,
        }));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [debouncedFilters, session, sessionLoading]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (name, date) => {
    setFilters(prev => ({ ...prev, [name]: date }));
  };

  const formatCurrency = (value) => {
    return value.toLocaleString('es-CO', { style: 'currency', currency: 'COP' });
  };

  const calculateItemTotal = (item) => {
    return item.cantidad * item.precio_unitario;
  }

  if (loading || sessionLoading) {
    return <Container className="mt-5 text-center"><Spinner animation="border" /><p>Cargando reporte...</p></Container>;
  }

  if (error) {
    return <Container className="mt-5"><Alert variant="danger">{error}</Alert></Container>;
  }

  return (
    <Container className="mt-5">
      <Card className="shadow-sm">
        <Card.Header as="h2" className="text-center">Reporte de Facturas Registradas</Card.Header>
        <Card.Body>
          <Form className="mb-4">
            <Row className="mb-3">
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Fecha Inicio</Form.Label>
                  <DatePicker
                    selected={filters.startDate}
                    onChange={(date) => handleDateChange('startDate', date)}
                    dateFormat="dd/MM/yyyy"
                    className="form-control"
                    placeholderText="Seleccione fecha inicio"
                    isClearable
                    locale="es"
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Fecha Fin</Form.Label>
                  <DatePicker
                    selected={filters.endDate}
                    onChange={(date) => handleDateChange('endDate', date)}
                    dateFormat="dd/MM/yyyy"
                    className="form-control"
                    placeholderText="Seleccione fecha fin"
                    isClearable
                    locale="es"
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Dependencia</Form.Label>
                  <Form.Select name="dependenciaId" value={filters.dependenciaId} onChange={handleFilterChange}>
                    <option value="">Todas</option>
                    {filterOptions.dependencias.map(dep => <option key={dep.id} value={dep.id}>{dep.nombre}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Solicitante</Form.Label>
                  <Form.Select name="solicitanteId" value={filters.solicitanteId} onChange={handleFilterChange}>
                    <option value="">Todos</option>
                    {filterOptions.solicitantes.map(sol => <option key={sol.id} value={sol.id}>{sol.nombre}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Row className="mb-3">
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Proveedor</Form.Label>
                  <Form.Select name="proveedorId" value={filters.proveedorId} onChange={handleFilterChange}>
                    <option value="">Todos</option>
                    {filterOptions.proveedores.map(prov => <option key={prov.id} value={prov.id}>{prov.nombre}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </Form>

          {reportData && reportData.summary && (
            <Row className="mb-4">
              <Col>
                <Card className="text-center bg-light">
                  <Card.Body>
                    <Card.Title>Total de Facturas</Card.Title>
                    <Card.Text className="h4 text-primary">{reportData.summary.totalFacturas}</Card.Text>
                  </Card.Body>
                </Card>
              </Col>
              <Col>
                <Card className="text-center bg-light">
                  <Card.Body>
                    <Card.Title>Valor Total Facturado</Card.Title>
                    <Card.Text className="h4 text-success">{formatCurrency(reportData.summary.valorTotalFacturado)}</Card.Text>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}

          <h3 className="mb-3">Detalle de Facturas</h3>
          {reportData && reportData.facturas.length > 0 ? (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>Nº Factura</th>
                  <th>Fecha Emisión</th>
                  <th>Proveedor</th>
                  <th>Solicitud ID</th>
                  <th>Solicitante</th>
                  <th>Dependencia</th>
                  <th>Total Factura</th>
                </tr>
              </thead>
              <tbody>
                {reportData.facturas.map(factura => (
                  <React.Fragment key={factura.id}>
                    <tr>
                      <td>{factura.numero_factura}</td>
                      <td>{new Date(factura.fecha_emision).toLocaleDateString()}</td>
                      <td>{factura.proveedor_nombre}</td>
                      <td>{factura.solicitud_id ? factura.solicitud_id : 'N/A'}</td>
                      <td>{factura.solicitante_nombre || 'N/A'}</td>
                      <td>{factura.dependencia_nombre || 'N/A'}</td>
                      <td>{formatCurrency(factura.total_factura)}</td>
                    </tr>
                    {factura.items && factura.items.length > 0 && (
                      <tr>
                        <td colSpan="7" className="p-0">
                          <Table size="sm" className="mb-0">
                            <thead>
                              <tr>
                                <th className="bg-light text-muted ps-4" style={{width: '30%'}}>Descripción</th>
                                <th className="bg-light text-muted" style={{width: '15%'}}>Cantidad</th>
                                <th className="bg-light text-muted" style={{width: '15%'}}>Precio Unit.</th>
                                <th className="bg-light text-muted" style={{width: '15%'}}>IVA</th>
                                <th className="bg-light text-muted" style={{width: '25%'}}>Total Item</th>
                              </tr>
                            </thead>
                            <tbody>
                              {factura.items.map(item => (
                                <tr key={item.id}>
                                  <td className="ps-4">{item.descripcion}</td>
                                  <td>{item.cantidad}</td>
                                  <td>{formatCurrency(item.precio_unitario)}</td>
                                  <td>{item.incluye_iva ? 'Sí' : 'No'}</td>
                                  <td>{formatCurrency(calculateItemTotal(item))}</td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </Table>
          ) : (
            <Alert variant="info">No se encontraron facturas con los filtros aplicados.</Alert>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
}
