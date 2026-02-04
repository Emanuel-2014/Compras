'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Table, Spinner, Alert, Row, Col, Form, Button, Card } from 'react-bootstrap';
import styles from '../layout.module.css';
import FacturaDetalleModal from '@/components/FacturaDetalleModal';
import { useSession } from '@/hooks/useSession';
import EditFacturaModal from '@/components/EditFacturaModal';

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

export default function FacturasPage() {
  const { session } = useSession();
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // States for filters
  const [proveedores, setProveedores] = useState([]);
  const [users, setUsers] = useState([]); // New state for users
  const [proveedorId, setProveedorId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [registeredByUserId, setRegisteredByUserId] = useState(''); // New state for user filter

  // State for detail modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedFacturaId, setSelectedFacturaId] = useState(null);

  // States for edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFacturaId, setEditFacturaId] = useState(null);

  // Fetch providers for the filter dropdown
  useEffect(() => {
    async function fetchProveedores() {
      try {
        const response = await fetch('/api/proveedores');
        if (!response.ok) throw new Error('No se pudo cargar los proveedores.');
        const data = await response.json();
        setProveedores(data);
      } catch (err) {
        console.error("Error fetching providers:", err);
      }
    }
    fetchProveedores();
  }, []);

  // Fetch users for the filter dropdown
  useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await fetch('/api/admin/usuarios');
        if (!response.ok) throw new Error('No se pudo cargar los usuarios.');
        const data = await response.json();
        setUsers(data);
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    }
    fetchUsers();
  }, []);

  const fetchFacturas = useCallback(async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        proveedorId,
        startDate,
        endDate,
        searchTerm,
        registeredByUserId,
        _t: new Date().getTime() // Timestamp para evitar caché
      }).toString();

      const response = await fetch(`/api/facturas-compras/list?${query}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (!response.ok) {
        throw new Error('No se pudo obtener la lista de facturas.');
      }
      const data = await response.json();
      setFacturas(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [proveedorId, startDate, endDate, searchTerm, registeredByUserId]);

  useEffect(() => {
    fetchFacturas();
  }, [fetchFacturas]);

  // Recargar facturas cuando se cierra el modal de edición
  useEffect(() => {
    if (!showEditModal && !showDetailModal) {
      fetchFacturas();
    }
  }, [showEditModal, showDetailModal, fetchFacturas]);

  const totalFacturado = useMemo(() => {
    return facturas.reduce((sum, factura) => sum + (Number(factura.valor_total) || 0), 0);
  }, [facturas]);

  const handleClearFilters = () => {
    setProveedorId('');
    setStartDate('');
    setEndDate('');
    setSearchTerm('');
    setRegisteredByUserId(''); // Clear new filter
  };

  const handleRowClick = (facturaId) => {
    setSelectedFacturaId(facturaId);
    setShowDetailModal(true);
  };

  const handleEditClick = (facturaId) => {
    setShowDetailModal(false); // Cerrar modal de detalles primero
    setEditFacturaId(facturaId);
    setShowEditModal(true);
  };

  const handleExcelExport = () => {
    const query = new URLSearchParams({
      proveedorId,
      startDate,
      endDate,
      searchTerm,
      registeredByUserId, // Include new filter
    }).toString();

    window.location.href = `/api/facturas/export-excel?${query}`;
  };

  return (
    <>
      <div className={styles.container}>
        <h1 className={styles.title}>Registro y Reporte de Facturas</h1>

        <Card className="mb-4">
          <Card.Header as="div" className="d-flex justify-content-between align-items-center">
            <span>Filtros y Reportes</span>
            <Button variant="outline-success" size="sm" onClick={handleExcelExport}>
              Descargar Excel
            </Button>
          </Card.Header>
          <Card.Body>
            <Row className="g-2">
              <Col md={2}>
                <Form.Group controlId="searchTerm">
                  <Form.Label>Buscar por # Factura</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Escriba el número..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group controlId="proveedorFilter">
                  <Form.Label>Proveedor</Form.Label>
                  <Form.Select value={proveedorId} onChange={e => setProveedorId(e.target.value)}>
                    <option value="">Todos</option>
                    {proveedores.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group controlId="userFilter">
                  <Form.Label>Registrado por</Form.Label>
                  <Form.Select value={registeredByUserId} onChange={e => setRegisteredByUserId(e.target.value)}>
                    <option value="">Todos</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>{user.nombre}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group controlId="startDate">
                  <Form.Label>Fecha Inicio</Form.Label>
                  <Form.Control type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group controlId="endDate">
                  <Form.Label>Fecha Fin</Form.Label>
                  <Form.Control type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </Form.Group>
              </Col>
              <Col md={2} className="d-flex align-items-end">
                <Button variant="outline-secondary" size="sm" onClick={handleClearFilters}>Limpiar</Button>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        <Card className="mb-3">
          <Card.Body className="text-center">
              <h5 className="mb-0">Total Facturado (Filtrado)</h5>
              <p className="h3 mb-0">{formatCurrency(totalFacturado)}</p>
          </Card.Body>
        </Card>

        {loading && (
          <div className="text-center my-4">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Cargando...</span>
            </Spinner>
          </div>
        )}

        {error && <Alert variant="danger">Error: {error}</Alert>}

        {!loading && !error && (
          <Table striped bordered hover responsive className={styles.smallFontTable}>
            <thead>
              <tr className={styles.tableHeader}>
                <th>PREFIJO</th>
                <th># FACTURA</th>
                <th>PROVEEDOR</th>
                <th>FECHA DE EMISIÓN</th>
                <th>VALOR TOTAL</th>
                <th>REGISTRADO POR</th>
                <th>FECHA DE REGISTRO</th>
              </tr>
            </thead>
            <tbody>
              {facturas.length > 0 ? (
                facturas.map(factura => (
                  <tr key={factura.id} style={{ cursor: 'pointer' }}>
                    <td onClick={() => handleRowClick(factura.id)}>{factura.prefijo}</td>
                    <td onClick={() => handleRowClick(factura.id)}>{factura.numero_factura}</td>
                    <td onClick={() => handleRowClick(factura.id)}>{factura.proveedor_nombre}</td>
                    <td onClick={() => handleRowClick(factura.id)}>{new Date(factura.fecha_emision).toLocaleDateString('es-CO')}</td>
                    <td onClick={() => handleRowClick(factura.id)}>{formatCurrency(factura.valor_total)}</td>
                    <td onClick={() => handleRowClick(factura.id)}>{factura.usuario_nombre}</td>
                                        <td onClick={() => handleRowClick(factura.id)}>{new Date(factura.fecha_creacion).toLocaleDateString('es-CO')}</td></tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="text-center">No hay facturas que coincidan con los filtros.</td>
                </tr>
              )}
            </tbody>
          </Table>
        )}
      </div>

      <FacturaDetalleModal
        show={showDetailModal}
        facturaId={selectedFacturaId}
        onHide={() => setShowDetailModal(false)}
        onEditClick={handleEditClick}
      />

      <EditFacturaModal
        show={showEditModal}
        facturaId={editFacturaId}
        onHide={() => setShowEditModal(false)}
        onFacturaUpdated={fetchFacturas}
      />
    </>
  );
}
