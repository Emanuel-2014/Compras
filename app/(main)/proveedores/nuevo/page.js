// app/(main)/proveedores/nuevo/page.js
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from 'react-bootstrap';
import styles from './page.module.css';

export default function NuevoProveedorPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    nombre: '',
    nit: '',
    nombre_asesor: '',
    contacto: '',
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCancel = () => {
    router.push('/mis-solicitudes');
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();

    if (!formData.nombre) {
      alert('El nombre del proveedor es obligatorio.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/proveedores', { // Using a new API route
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include',
      });

      if (res.ok) {
        alert('¡ATENCIÓN! Para agilizar el proceso de compra y evitar errores, por favor asegúrese de que la descripción y las especificaciones de cada ítem sean lo más claras y completas posible. El departamento de compras no puede adivinar las características de los productos que necesita. ¡Gracias por su colaboración!');
        router.push('/dashboard'); // Redirect to dashboard after creation
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al crear el proveedor.');
      }
    } catch (err) {
      console.error('Error al crear proveedor:', err);
      setError(err.message || 'Error de conexión.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>CREAR NUEVO PROVEEDOR</h1>

      <div className={styles.formContainer}>
        <p className={styles.pageDescription}>
          Complete el formulario para registrar un nuevo proveedor en el sistema. Los datos serán revisados por un administrador.
        </p>
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
            <input
              type="text"
              id="nit"
              name="nit"
              value={formData.nit}
              onChange={handleInputChange}
              className={styles.input}
            />
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
          {error && <p className={styles.errorText}>{error}</p>}
          <div className={styles.actionButtons}>
            <Button variant="outline-primary" type="submit" disabled={submitting}>
              {submitting ? 'CREANDO...' : 'CREAR PROVEEDOR'}
            </Button>
            <Button variant="outline-secondary" type="button" onClick={handleCancel} disabled={submitting}>
              CANCELAR
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}