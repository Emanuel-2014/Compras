// app/admin/proveedores/page.js
"use client"; // Indica que este componente se ejecuta en el cliente

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from 'react-bootstrap';
import Swal from 'sweetalert2';
import styles from './page.module.css'; // Si tienes estilos específicos para esta página

export default function AdminProveedoresPage() {
  const router = useRouter();
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados para el formulario de creación/edición
  const [showForm, setShowForm] = useState(false); // Mostrar/ocultar formulario
  const [isEditing, setIsEditing] = useState(false); // Modo edición o creación
  const [currentProveedorId, setCurrentProveedorId] = useState(null); // ID del proveedor que se está editando
  const [formData, setFormData] = useState({
    nombre: '',
    nit: '',
    nit_dv: '',
    nombre_asesor: '',
    contacto: '',
  });

  const formatNit = (nit) => {
    if (!nit) return '';
    const cleanNit = nit.replace(/[^0-9]/g, '');
    return cleanNit.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const fetchAllProveedores = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/proveedores');
      if (res.ok) {
        const data = await res.json();
        setProveedores(data);
      } else if (res.status === 403) {
        Swal.fire('Acceso Denegado', 'No tienes permisos de administrador.', 'error');
        router.push('/dashboard');
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al cargar los proveedores.');
      }
    } catch (err) {
      console.error('Error al obtener proveedores:', err);
      setError(err.message || 'Error de conexión al cargar proveedores.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllProveedores();
  }, []); // Se ejecuta una vez al montar el componente

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'nit') {
      const formatted = formatNit(value);
      setFormData(prev => ({ ...prev, [name]: formatted }));
    } else if (name === 'nit_dv') {
      // Solo permitir un dígito para el DV
      const dv = value.replace(/[^0-9]/g, '').slice(0, 1);
      setFormData(prev => ({ ...prev, [name]: dv }));
    } else {
      const finalValue = value.toUpperCase();
      setFormData(prev => ({ ...prev, [name]: finalValue }));
    }
  };

  const handleNewProveedorClick = () => {
    setShowForm(true);
    setIsEditing(false);
    setCurrentProveedorId(null);
    setFormData({
      nombre: '',
      nit: '',
      nit_dv: '',
      nombre_asesor: '',
      contacto: '',
    });
  };

  const handleEditClick = (proveedor) => {
    setShowForm(true);
    setIsEditing(true);
    setCurrentProveedorId(proveedor.id);
    setFormData({
      nombre: proveedor.nombre || '',
      nit: proveedor.nit ? formatNit(proveedor.nit.toString()) : '',
      nit_dv: proveedor.nit_dv || '',
      nombre_asesor: proveedor.nombre_asesor || '',
      contacto: proveedor.contacto || '',
    });
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setIsEditing(false);
    setCurrentProveedorId(null);
    setFormData({
      nombre: '',
      nit: '',
      nit_dv: '',
      nombre_asesor: '',
      contacto: '',
    });
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();

    if (!formData.nombre) {
      Swal.fire('Campo Requerido', 'El nombre del proveedor es obligatorio.', 'warning');
      return;
    }

    // Limpiar el NIT antes de enviarlo (remover puntos)
    const cleanNit = formData.nit.replace(/\./g, '');

    try {
      const method = isEditing ? 'PUT' : 'POST';
      const url = '/api/admin/proveedores';
      const body = isEditing
        ? { id: currentProveedorId, nombre: formData.nombre, nit: cleanNit, nit_dv: formData.nit_dv, nombre_asesor: formData.nombre_asesor, contacto: formData.contacto }
        : { nombre: formData.nombre, nit: cleanNit, nit_dv: formData.nit_dv, nombre_asesor: formData.nombre_asesor, contacto: formData.contacto };

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        Swal.fire({
          title: `¡Proveedor ${isEditing ? 'Actualizado' : 'Creado'}!`,
          text: `El proveedor ha sido ${isEditing ? 'actualizado' : 'creado'} exitosamente.`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
        handleCancelForm(); // Cerrar formulario y resetear estados
        fetchAllProveedores(); // Recargar la lista de proveedores
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || `Error al ${isEditing ? 'actualizar' : 'crear'} el proveedor.`);
      }
    } catch (err) {
      console.error(`Error al ${isEditing ? 'actualizar' : 'crear'} proveedor:`, err);
      Swal.fire('Error', err.message, 'error');
    }
  };

  const handleDeleteClick = async (proveedorId) => {
    const result = await Swal.fire({
        title: '¿Está seguro?',
        html: `Está a punto de eliminar al proveedor. <br/> <b>Esta acción es irreversible.</b>`,
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
      const res = await fetch('/api/admin/proveedores', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: proveedorId }),
      });

      if (res.ok) {
        Swal.fire(
          '¡Eliminado!',
          'El proveedor ha sido eliminado.',
          'success'
        );
        fetchAllProveedores(); // Recargar la lista de proveedores
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al eliminar el proveedor.');
      }
    } catch (err) {
      console.error('Error al eliminar proveedor:', err);
      Swal.fire('Error', err.message, 'error');
    }
  };

  const handleDownloadExcel = async () => {
    try {
      const res = await fetch('/api/admin/proveedores/export');
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'proveedores.xlsx';
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al descargar el archivo Excel.');
      }
    } catch (err) {
      console.error('Error al descargar el archivo Excel:', err);
      setError(err.message || 'Error de conexión.');
    }
  };

  if (loading) {
    return <div className={styles.container}>Cargando proveedores...</div>;
  }

  if (error) {
    return <div className={styles.container} style={{ color: 'red' }}>Error: {error}</div>;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>GESTIÓN DE PROVEEDORES</h1>

      <div className={styles.actionHeader}>
        <Button onClick={handleNewProveedorClick} variant="outline-primary" size="sm">NUEVO PROVEEDOR</Button>
        <Button onClick={handleDownloadExcel} variant="outline-secondary" size="sm" className="ms-2">DESCARGAR EXCEL</Button>
      </div>

      {showForm && (
        <div className={styles.formContainer}>
          <h2>{isEditing ? 'EDITAR PROVEEDOR' : 'CREAR NUEVO PROVEEDOR'}</h2>
          <form onSubmit={handleSubmitForm} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="nombre">PROVEEDOR:</label>
              <input
                type="text"
                id="nombre"
                name="nombre"
                value={formData.nombre}
                onChange={handleInputChange}
                required
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="nit">NIT:</label>
              <div className={styles.nitContainer}>
                <input
                  type="text"
                  id="nit"
                  name="nit"
                  value={formData.nit}
                  onChange={handleInputChange}
                  className={styles.input}
                />
                <span className={styles.nitSeparator}>-</span>
                <input
                  type="text"
                  id="nit_dv"
                  name="nit_dv"
                  value={formData.nit_dv}
                  onChange={handleInputChange}
                  className={styles.inputDv}
                  maxLength="1"
                />
              </div>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="nombre_asesor">NOMBRE DE ASESOR:</label>
              <input
                type="text"
                id="nombre_asesor"
                name="nombre_asesor"
                value={formData.nombre_asesor}
                onChange={handleInputChange}
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="contacto">NÚMERO DE CONTACTO:</label>
              <input
                type="text"
                id="contacto"
                name="contacto"
                value={formData.contacto}
                onChange={handleInputChange}
                className={styles.input}
              />
            </div>
            <div className={styles.actionButtons}>
              <Button type="submit" variant="outline-success" size="sm">{isEditing ? 'GUARDAR CAMBIOS' : 'CREAR PROVEEDOR'}</Button>
              <Button type="button" onClick={handleCancelForm} variant="outline-danger" size="sm" className="ms-2">CANCELAR</Button>
            </div>
          </form>
        </div>
      )}

      <div className={styles.proveedoresList}>
        <h2>PROVEEDORES EXISTENTES</h2>
        {proveedores.length === 0 ? (
          <p>NO HAY PROVEEDORES REGISTRADOS.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.idCell}>IDEN</th>
                <th>PROVEEDOR</th>
                <th>NIT</th>
                <th>NOMBRE DE ASESOR</th>
                <th>NÚMERO DE CONTACTO</th>
                <th>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {proveedores.map((prov) => (
                <tr key={prov.id}>
                  <td className={styles.idCell}>{prov.id}</td>
                  <td>{prov.nombre}</td>
                  <td>{prov.nit ? `${formatNit(prov.nit)}-${prov.nit_dv || ''}` : 'N/A'}</td>
                  <td>{prov.nombre_asesor || 'N/A'}</td>
                  <td>{prov.contacto || 'N/A'}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Button style={{ fontSize: '0.8rem' }} onClick={() => handleEditClick(prov)} variant="outline-info" size="sm">EDITAR</Button>
                        <Button style={{ fontSize: '0.8rem' }} onClick={() => handleDeleteClick(prov.id)} variant="outline-danger" size="sm">ELIMINAR</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
