// app/admin/usuarios/page.js
"use client"; // Indica que este componente se ejecuta en el cliente

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Form, Row, Col, Modal } from 'react-bootstrap';
import Swal from 'sweetalert2';
import styles from './page.module.css'; // Si tienes estilos específicos para esta página

export default function AdminUsuariosPage() {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dependencias, setDependencias] = useState([]);
  const [coordinadores, setCoordinadores] = useState([]); // Estado para coordinadores

  // Estados para el formulario de creación/edición
  const [showForm, setShowForm] = useState(false); // Mostrar/ocultar formulario
  const [isEditing, setIsEditing] = useState(false); // Modo edición o creación
  const [currentUserId, setCurrentUserId] = useState(null); // ID del usuario que se está editando
  const [formData, setFormData] = useState({
    nombre: '',
    dependencia_id: '', // Ahora usamos el ID de la dependencia
    codigo_personal: '',
    password: '',
    rol: 'solicitante', // Rol por defecto
    nivel_aprobador: null,
    coordinador_id: '', // Añadir coordinador_id
  });

  // Estados para el modal de dependencias
  const [showDependencyModal, setShowDependencyModal] = useState(false);
  const [isEditingDependency, setIsEditingDependency] = useState(false);
  const [currentDependencyId, setCurrentDependencyId] = useState(null);
  const [dependencyFormData, setDependencyFormData] = useState({ nombre: '' });

  const fetchAllUsuarios = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/usuarios');
      if (res.ok) {
        const data = await res.json();
        setUsuarios(data);
      } else if (res.status === 403) {
        Swal.fire('Acceso Denegado', 'No tienes permisos de administrador.', 'error');
        router.push('/'); // Redirigir a la página principal o login
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || 'ERROR AL CARGAR LOS USUARIOS.');
      }
    } catch (err) {
      console.error('ERROR AL OBTENER USUARIOS:', err);
      setError(err.message || 'ERROR DE CONEXIÓN AL CARGAR USUARIOS.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDependencias = async () => {
    try {
      const res = await fetch('/api/admin/dependencias');
      if (res.ok) {
        const data = await res.json();
        setDependencias(data);
      } else {
        console.error('Error al cargar las dependencias');
      }
    } catch (error) {
      console.error('Error de conexión al cargar dependencias:', error);
    }
  };

  const fetchCoordinadores = async () => {
    try {
      const res = await fetch('/api/admin/coordinadores');
      if (res.ok) {
        const data = await res.json();
        setCoordinadores(data);
      } else {
        console.error('Error al cargar los coordinadores');
      }
    } catch (error) {
      console.error('Error de conexión al cargar coordinadores:', error);
    }
  };

  useEffect(() => {
    fetchAllUsuarios();
    fetchDependencias();
    fetchCoordinadores(); // Cargar coordinadores
  }, []); // Se ejecuta una vez al montar el componente

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNewUserClick = () => {
    setShowForm(true);
    setIsEditing(false);
    setCurrentUserId(null);
    setFormData({
      nombre: '',
      dependencia_id: '', // Usar dependencia_id
      codigo_personal: '',
      password: '',
      rol: 'solicitante',
      nivel_aprobador: null,
      coordinador_id: '',
    });
  };

  const handleEditClick = (user) => {
    setShowForm(true);
    setIsEditing(true);
    setCurrentUserId(user.id);
    setFormData({
      nombre: user.nombre || '',
      dependencia_id: user.dependencia_id || '', // Cargar el ID de la dependencia
      codigo_personal: user.codigo_personal || '',
      password: '', // No precargamos la contraseña por seguridad
      rol: user.rol || 'solicitante',
      nivel_aprobador: user.nivel_aprobador || null,
      coordinador_id: user.coordinador_id || '',
    });
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setIsEditing(false);
    setCurrentUserId(null);
    setFormData({
      nombre: '',
      dependencia_id: '', // Resetear con dependencia_id
      codigo_personal: '',
      password: '',
      rol: 'solicitante',
      nivel_aprobador: null,
      coordinador_id: '',
    });
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();

    if (!formData.nombre || !formData.codigo_personal || !formData.rol || (!isEditing && !formData.password)) {
      Swal.fire('Campos Obligatorios', 'Por favor, complete todos los campos obligatorios (nombre, código personal, rol y contraseña para nuevos usuarios).', 'warning');
      return;
    }

    if (formData.rol === 'aprobador' && !formData.dependencia_id) { // Validar dependencia_id
      Swal.fire('Campo Obligatorio', 'Por favor, seleccione una dependencia para el aprobador.', 'warning');
      return;
    }

    if (formData.rol === 'solicitante' && !formData.coordinador_id) {
        Swal.fire('Campo Obligatorio', 'Por favor, seleccione un coordinador para el solicitante.', 'warning');
        return;
    }

    if (formData.rol === 'aprobador' && !formData.coordinador_id) {
        Swal.fire('Campo Obligatorio', 'Por favor, seleccione un coordinador (administrador) para el aprobador. Las solicitudes que cree este aprobador irán a este administrador.', 'warning');
        return;
    }

    try {
      const method = isEditing ? 'PUT' : 'POST';
      const url = isEditing ? `/api/admin/usuarios/${currentUserId}` : '/api/admin/usuarios'; // Cambiar URL para PUT
      const body = isEditing ? { ...formData } : formData; // Ya tenemos el ID en currentUserId si es edición

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        Swal.fire({
          title: `¡Usuario ${isEditing ? 'Actualizado' : 'Creado'}!`,
          text: `El usuario ha sido ${isEditing ? 'actualizado' : 'creado'} exitosamente.`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
        handleCancelForm(); // Cerrar formulario y resetear estados
        fetchAllUsuarios(); // Recargar la lista de usuarios
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || `ERROR AL ${isEditing ? 'ACTUALIZAR' : 'CREAR'} EL USUARIO.`);
      }
    } catch (err) {
      console.error(`ERROR AL ${isEditing ? 'ACTUALIZAR' : 'CREAR'} USUARIO:`, err);
      setError(err.message || 'ERROR DE CONEXIÓN.');
    }
  };

  const handleDeleteClick = async (userId) => {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      html: `Está a punto de eliminar este usuario. <br/> <b>Esta acción es irreversible.</b>`,
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

    try {
      const res = await fetch(`/api/admin/usuarios/${userId}`, { // Usar URL con ID
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        Swal.fire(
          '¡Eliminado!',
          'El usuario ha sido eliminado.',
          'success'
        );
        fetchAllUsuarios(); // Recargar la lista de usuarios
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || 'ERROR AL ELIMINAR EL USUARIO.');
      }
    } catch (err) {
      console.error('ERROR AL ELIMINAR USUARIO:', err);
      setError(err.message || 'ERROR DE CONEXIÓN.');
    }
  };

  if (loading) {
    return <div className={styles.container}>CARGANDO USUARIOS...</div>;
  }

  if (error) {
    return <div className={styles.container} style={{ color: 'red' }}>Error: {error}</div>;
  }

  // Manejadores para gestión de dependencias
  const handleNewDependencyClick = () => {
    setShowDependencyModal(true);
    setIsEditingDependency(false);
    setCurrentDependencyId(null);
    setDependencyFormData({ nombre: '' });
  };

  const handleEditDependencyClick = (dep) => {
    setShowDependencyModal(true);
    setIsEditingDependency(true);
    setCurrentDependencyId(dep.id);
    setDependencyFormData({ nombre: dep.nombre });
  };

  const handleCancelDependencyForm = () => {
    setShowDependencyModal(false);
    setIsEditingDependency(false);
    setCurrentDependencyId(null);
    setDependencyFormData({ nombre: '' });
  };

  const handleSubmitDependencyForm = async (e) => {
    e.preventDefault();

    if (!dependencyFormData.nombre || dependencyFormData.nombre.trim() === '') {
      Swal.fire('Campo Obligatorio', 'Por favor, ingrese el nombre de la dependencia.', 'warning');
      return;
    }

    try {
      const method = isEditingDependency ? 'PUT' : 'POST';
      const body = isEditingDependency
        ? { id: currentDependencyId, nombre: dependencyFormData.nombre }
        : { nombre: dependencyFormData.nombre };

      const res = await fetch('/api/admin/dependencias', {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        Swal.fire({
          title: `¡Dependencia ${isEditingDependency ? 'Actualizada' : 'Creada'}!`,
          text: `La dependencia ha sido ${isEditingDependency ? 'actualizada' : 'creada'} exitosamente.`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
        handleCancelDependencyForm();
        fetchDependencias();
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || `ERROR AL ${isEditingDependency ? 'ACTUALIZAR' : 'CREAR'} LA DEPENDENCIA.`);
      }
    } catch (err) {
      console.error(`ERROR AL ${isEditingDependency ? 'ACTUALIZAR' : 'CREAR'} DEPENDENCIA:`, err);
      Swal.fire('Error', err.message, 'error');
    }
  };

  const handleDeleteDependencyClick = async (depId) => {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      html: `Está a punto de eliminar esta dependencia. <br/> <b>Esta acción es irreversible.</b>`,
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

    try {
      const res = await fetch('/api/admin/dependencias', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: depId }),
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
        throw new Error(errorData.message || 'ERROR AL ELIMINAR LA DEPENDENCIA.');
      }
    } catch (err) {
      console.error('ERROR AL ELIMINAR DEPENDENCIA:', err);
      Swal.fire('Error', err.message, 'error');
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>GESTIÓN DE USUARIOS Y DEPENDENCIAS</h1>

      {/* Sección de Dependencias */}
      <div style={{ marginBottom: '3rem', padding: '1.5rem', border: '1px solid #dee2e6', borderRadius: '8px' }}>
        <h2 style={{ marginBottom: '1rem' }}>GESTIÓN DE DEPENDENCIAS</h2>
        <Button onClick={handleNewDependencyClick} variant="outline-success" style={{ marginBottom: '1rem' }}>
          CREAR NUEVA DEPENDENCIA
        </Button>

        {dependencias.length === 0 ? (
          <p>NO HAY DEPENDENCIAS REGISTRADAS.</p>
        ) : (
          <table className={styles.table} style={{ marginTop: '1rem' }}>
            <thead>
              <tr>
                <th>ID</th>
                <th>NOMBRE</th>
                <th>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {[...dependencias].sort((a, b) => a.id - b.id).map((dep) => (
                <tr key={dep.id}>
                  <td>{dep.id}</td>
                  <td>{dep.nombre}</td>
                  <td>
                    <Button
                      onClick={() => handleEditDependencyClick(dep)}
                      variant="outline-primary"
                      size="sm"
                      className="me-2"
                    >
                      EDITAR
                    </Button>
                    <Button
                      onClick={() => handleDeleteDependencyClick(dep.id)}
                      variant="outline-danger"
                      size="sm"
                    >
                      ELIMINAR
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Sección de Usuarios */}
      <h2 style={{ marginBottom: '1rem' }}>GESTIÓN DE USUARIOS</h2>
      <Button onClick={handleNewUserClick} variant="outline-primary" style={{ marginBottom: '2rem' }}>CREAR NUEVO USUARIO</Button>

      {showForm && (
        <div className={styles.formContainer}>
          <h2>{isEditing ? 'EDITAR USUARIO' : 'CREAR NUEVO USUARIO'}</h2>
          <Form onSubmit={handleSubmitForm}>
            <Row className="mb-3">
              <Form.Group as={Col} md="6">
                <Form.Label>NOMBRE</Form.Label>
                <Form.Control
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  required
                />
              </Form.Group>
              <Form.Group as={Col} md="6">
                <Form.Label>CÓDIGO PERSONAL</Form.Label>
                <Form.Control
                  type="text"
                  name="codigo_personal"
                  value={formData.codigo_personal}
                  onChange={handleInputChange}
                  required
                />
              </Form.Group>
            </Row>
            <Row className="mb-3">
              <Form.Group as={Col} md="6">
                <Form.Label>CONTRASEÑA {isEditing && '(DEJAR EN BLANCO PARA NO CAMBIAR)'}</Form.Label>
                <Form.Control
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required={!isEditing}
                />
                {isEditing && <Form.Text className="text-warning">ADVERTENCIA: LA CONTRASEÑA SE GUARDARÁ EN TEXTO PLANO. ¡IMPLEMENTAR HASHING!</Form.Text>}
              </Form.Group>
              <Form.Group as={Col} md="6">
                <Form.Label>ROL</Form.Label>
                <Form.Select name="rol" value={formData.rol} onChange={handleInputChange}>
                  <option value="solicitante">SOLICITANTE</option>
                  <option value="aprobador">APROBADOR</option>
                  <option value="administrador">ADMINISTRADOR</option>
                </Form.Select>
              </Form.Group>
            </Row>

            {(formData.rol === 'aprobador' || formData.rol === 'solicitante') && ( // Aprobadores y Solicitantes ahora seleccionan de la lista maestra
              <Row className="mb-3">
                <Form.Group as={Col} md="6">
                  <Form.Label>DEPENDENCIA</Form.Label>
                  <Form.Select name="dependencia_id" value={formData.dependencia_id} onChange={handleInputChange} required>
                    <option value="">Seleccione una dependencia</option>
                    {dependencias.map(dep => (
                      <option key={dep.id} value={dep.id}>{dep.nombre}</option>
                    ))}
                  </Form.Select>
                </Form.Group>

                {/* Coordinador también para aprobadores */}
                <Form.Group as={Col} md="6">
                  <Form.Label>
                    COORDINADOR ASIGNADO
                    {formData.rol === 'aprobador' && (
                      <small className="text-warning d-block" style={{ fontWeight: '500' }}>
                        (Las solicitudes que cree este aprobador irán a este administrador)
                      </small>
                    )}
                  </Form.Label>
                  <Form.Select name="coordinador_id" value={formData.coordinador_id} onChange={handleInputChange} required>
                    <option value="">Seleccione un coordinador</option>
                    {coordinadores.map(coord => (
                      <option key={coord.id} value={coord.id}>{coord.nombre}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Row>
            )}

            <div className="d-flex justify-content-end gap-2 mt-4">
              <Button type="submit" variant="outline-success">{isEditing ? 'GUARDAR CAMBIOS' : 'CREAR USUARIO'}</Button>
              <Button type="button" onClick={handleCancelForm} variant="outline-secondary">CANCELAR</Button>
            </div>
          </Form>
        </div>
      )}

      <div className={styles.usersList}>
        <h2>USUARIOS EXISTENTES</h2>
        {usuarios.length === 0 ? (
          <p>NO HAY USUARIOS REGISTRADOS.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>NOMBRE</th>
                <th>DEPENDENCIA</th>
                <th>CÓDIGO</th>
                <th>ROL</th>
                <th>COORDINADOR</th>
                <th>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((user) => {
                return (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{user.nombre}</td>
                    <td>{user.dependencia_nombre || 'N/A'}</td>
                    <td>{user.codigo_personal}</td>
                    <td>{user.rol}</td>
                    <td>{user.nombre_coordinador || 'N/A'}</td>
                    <td className="d-flex">
                      <Button onClick={() => handleEditClick(user)} variant="outline-primary" size="sm" className="me-2">EDITAR</Button>
                      <Button onClick={() => handleDeleteClick(user.id)} variant="outline-danger" size="sm">ELIMINAR</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal para gestionar dependencias */}
      <Modal show={showDependencyModal} onHide={handleCancelDependencyForm} centered>
        <Modal.Header closeButton>
          <Modal.Title>{isEditingDependency ? 'EDITAR DEPENDENCIA' : 'CREAR NUEVA DEPENDENCIA'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmitDependencyForm} id="dependencyForm">
            <Form.Group className="mb-3">
              <Form.Label>NOMBRE DE LA DEPENDENCIA</Form.Label>
              <Form.Control
                type="text"
                value={dependencyFormData.nombre}
                onChange={(e) => setDependencyFormData({ nombre: e.target.value })}
                placeholder="Ej: PRODUCCIÓN, MANTENIMIENTO, etc."
                required
                autoFocus
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={handleCancelDependencyForm}>
            CANCELAR
          </Button>
          <Button variant="outline-success" type="submit" form="dependencyForm">
            {isEditingDependency ? 'GUARDAR CAMBIOS' : 'CREAR DEPENDENCIA'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
