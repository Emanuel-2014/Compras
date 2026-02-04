"use client";

import { useState, useEffect } from 'react';
import { Button, Form, Table, Alert, Spinner, Modal } from 'react-bootstrap';
import Swal from 'sweetalert2';
import styles from './page.module.css'; // Asegúrate de tener este archivo o ajusta el nombre

export default function AdminDependenciasPage() {
  const [dependencias, setDependencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [showFormModal, setShowFormModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentDependenciaId, setCurrentDependenciaId] = useState(null);
  const [nombreDependencia, setNombreDependencia] = useState('');

  const fetchDependencias = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/dependencias');
      if (res.ok) {
        const data = await res.json();
        const sortedData = data.sort((a, b) => a.id - b.id);
        setDependencias(sortedData);
      } else if (res.status === 403) {
        Swal.fire('Acceso Denegado', 'No tienes permisos de administrador para ver las dependencias.', 'error');
        // router.push('/'); // Redirigir si no tiene permisos
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al cargar las dependencias.');
      }
    } catch (err) {
      console.error('Error fetching dependencias:', err);
      setError(err.message || 'Error de conexión al cargar dependencias.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDependencias();
  }, []);

  const handleNewClick = () => {
    setIsEditing(false);
    setCurrentDependenciaId(null);
    setNombreDependencia('');
    setShowFormModal(true);
  };

  const handleEditClick = (dependencia) => {
    setIsEditing(true);
    setCurrentDependenciaId(dependencia.id);
    setNombreDependencia(dependencia.nombre);
    setShowFormModal(true);
  };

  const handleCancelForm = () => {
    setShowFormModal(false);
    setNombreDependencia('');
    setCurrentDependenciaId(null);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!nombreDependencia.trim()) {
      setError('El nombre de la dependencia no puede estar vacío.');
      setLoading(false);
      return;
    }

    try {
      const method = isEditing ? 'PUT' : 'POST';
      const url = '/api/admin/dependencias';
      const body = isEditing ? { id: currentDependenciaId, nombre: nombreDependencia.trim() } : { nombre: nombreDependencia.trim() };

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        Swal.fire({
          title: `¡Dependencia ${isEditing ? 'Actualizada' : 'Creada'}!`,
          text: `La dependencia ha sido ${isEditing ? 'actualizada' : 'creada'} exitosamente.`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
        handleCancelForm();
        fetchDependencias();
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || `Error al ${isEditing ? 'actualizar' : 'crear'} la dependencia.`);
      }
    } catch (err) {
      console.error('Error submitting form:', err);
      setError(err.message || 'Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = async (dependenciaId) => {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      html: `Está a punto de eliminar esta dependencia.<br/><b>¡Esta acción es irreversible!</b>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, ¡eliminar!',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) {
      return;
    }
    
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/admin/dependencias', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: dependenciaId }),
      });

      if (res.ok) {
        Swal.fire(
          '¡Eliminada!',
          'La dependencia ha sido eliminada.',
          'success'
        );
        fetchDependencias();
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al eliminar la dependencia.');
      }
    } catch (err) {
      console.error('Error deleting dependencia:', err);
      setError(err.message || 'Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !dependencias.length) { // Solo mostrar spinner si está cargando por primera vez
    return <div className={styles.container}><Spinner animation="border" /> Cargando dependencias...</div>;
  }

  if (error && !showFormModal) { // Mostrar error solo si no está el modal abierto (evita superponer)
    return <div className={styles.container}><Alert variant="danger">Error: {error}</Alert></div>;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>GESTIÓN DE DEPENDENCIAS</h1>

      <Button onClick={handleNewClick} variant="outline-primary" style={{ marginBottom: '2rem' }}>CREAR NUEVA DEPENDENCIA</Button>

      {error && <Alert variant="danger">{error}</Alert>} {/* Mostrar errores de operaciones CRUD */}

      {dependencias.length === 0 && !loading ? (
        <p>No hay dependencias registradas.</p>
      ) : (
        <Table striped bordered hover responsive className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>NOMBRE</th>
              <th>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {dependencias.map((dep) => (
              <tr key={dep.id}>
                <td>{dep.id}</td>
                <td>{dep.nombre}</td>
                <td>
                  <Button onClick={() => handleEditClick(dep)} variant="outline-primary" size="sm" className="me-2">EDITAR</Button>
                  <Button onClick={() => handleDeleteClick(dep.id)} variant="outline-danger" size="sm">ELIMINAR</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {/* Modal para Crear/Editar Dependencia */}
      <Modal show={showFormModal} onHide={handleCancelForm} centered>
        <Modal.Header closeButton>
          <Modal.Title>{isEditing ? 'EDITAR DEPENDENCIA' : 'CREAR NUEVA DEPENDENCIA'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmitForm}>
            <Form.Group className="mb-3">
              <Form.Label>NOMBRE DE LA DEPENDENCIA</Form.Label>
              <Form.Control
                type="text"
                value={nombreDependencia}
                onChange={(e) => setNombreDependencia(e.target.value.toUpperCase())}
                placeholder="Ej: Gerencia, Producción, Compras"
                required
                autoFocus
              />
            </Form.Group>
            {loading && <Spinner animation="border" size="sm" className="me-2" />}
            {error && <Alert variant="danger" className="mt-3">{error}</Alert>}
            <Modal.Footer>
              <Button variant="outline-secondary" onClick={handleCancelForm} disabled={loading}>
                Cancelar
              </Button>
              <Button variant="outline-success" type="submit" disabled={loading}>
                {isEditing ? 'Guardar Cambios' : 'Crear Dependencia'}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
}
