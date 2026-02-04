"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, ListGroup } from 'react-bootstrap';
import styles from './PlantillasPage.module.css';

export default function PlantillasPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [plantillas, setPlantillas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados para el formulario
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPlantillaId, setCurrentPlantillaId] = useState(null);
  const [formData, setFormData] = useState({ nombre: '', proveedor_id: '' });
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({ descripcion: '', especificaciones: '' });
  const [proveedores, setProveedores] = useState([]);

  const fetchPlantillas = async () => {
    try {
        const plantillasRes = await fetch('/api/plantillas');
        if (!plantillasRes.ok) throw new Error('No se pudieron cargar las plantillas.');
        const plantillasData = await plantillasRes.json();
        setPlantillas(plantillasData);
    } catch (err) {
        setError(err.message);
    }
  }

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const sessionRes = await fetch('/api/session');
        if (!sessionRes.ok) throw new Error('No se pudo obtener la sesión.');
        const sessionData = await sessionRes.json();
        setUser(sessionData.user);

        if (!sessionData.user) {
          router.push('/login');
          return;
        }

        await fetchPlantillas();

        if (sessionData.user.rol?.toLowerCase() !== 'aprobador') {
          const provRes = await fetch('/api/proveedores');
          if (!provRes.ok) throw new Error('No se pudieron cargar los proveedores.');
          const provData = await provRes.json();
          setProveedores(provData);
        }

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [router]);

  const handleNewItemChange = (e) => {
    const { name, value } = e.target;
    // Convertir a mayúsculas automáticamente
    setNewItem(prev => ({ ...prev, [name]: value.toUpperCase() }));
  };

  const handleAddItem = () => {
    if (newItem.descripcion) {
      setItems(prev => [...prev, { ...newItem, id: Date.now() }]);
      setNewItem({ descripcion: '', especificaciones: '' });
    }
  };

  const handleDeleteItem = (id) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    // Convertir nombre a mayúsculas, proveedor_id permanece igual
    const newValue = name === 'nombre' ? value.toUpperCase() : value;
    setFormData(prev => ({ ...prev, [name]: newValue }));
  };

  const resetForm = () => {
    setIsEditing(false);
    setCurrentPlantillaId(null);
    setFormData({ nombre: '', proveedor_id: '' });
    setItems([]);
    setShowForm(false);
  }

  const handleCreateNew = () => {
    resetForm();
    setShowForm(true);
  };

  const handleEdit = (plantilla) => {
    setIsEditing(true);
    setCurrentPlantillaId(plantilla.id);
    setFormData({ nombre: plantilla.nombre, proveedor_id: plantilla.proveedor_id });
    setItems(plantilla.items.map(item => ({...item}))); // Create a copy
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Está seguro de que desea eliminar esta plantilla?')) return;

    try {
      const res = await fetch('/api/plantillas', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al eliminar la plantilla');
      }

      await fetchPlantillas(); // Recargar

    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nombre || !formData.proveedor_id || items.length === 0) {
      alert('Nombre, proveedor y al menos un ítem son requeridos.');
      return;
    }

    const method = isEditing ? 'PUT' : 'POST';
    const body = {
      id: currentPlantillaId,
      ...formData,
      items: items.map(({ id, ...rest }) => rest)
    };

    try {
      const res = await fetch('/api/plantillas', {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `Error al ${isEditing ? 'actualizar' : 'crear'} la plantilla`);
      }

      resetForm();
      await fetchPlantillas();

    } catch (err) {
      setError(err.message);
    }
  };

  const handleUseTemplate = (plantilla) => {
    // En lugar de ir directo a crear solicitud, mostrar formulario para editar
    setIsEditing(false); // No es edición de plantilla, es uso de plantilla
    setCurrentPlantillaId(null); // No guardar cambios en la plantilla original
    setFormData({ nombre: `${plantilla.nombre} - ${new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase()}`, proveedor_id: plantilla.proveedor_id });
    setItems(plantilla.items.map(item => ({...item, id: Date.now() + Math.random() }))); // Copiar ítems con nuevos IDs
    setShowForm(true);
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCreateSolicitudFromTemplate = () => {
    // Crear solicitud con los ítems editados
    if (!formData.proveedor_id || items.length === 0) {
      alert('Proveedor y al menos un ítem son requeridos.');
      return;
    }
    const itemsQuery = encodeURIComponent(JSON.stringify(items));
    router.push(`/solicitud/nueva?proveedor=${formData.proveedor_id}&items=${itemsQuery}`);
  };

  if (loading) return <div className={styles.container}>Cargando...</div>;
  if (error) return <div className={styles.container} style={{ color: 'red' }}>Error: {error}</div>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>MIS PLANTILLAS</h1>

      {user?.rol?.toLowerCase() !== 'aprobador' && !showForm && (
        <Button variant="outline-primary" onClick={handleCreateNew} size="sm">Crear Nueva Plantilla</Button>
      )}

      {showForm && (
        <div className={styles.formContainer}>
          <h2>{isEditing ? 'Editar Plantilla' : currentPlantillaId === null && formData.nombre.includes('-') ? 'Usar Plantilla - Editar antes de crear solicitud' : 'Crear Plantilla'}</h2>
          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label>Nombre de la Plantilla</label>
              <input type="text" name="nombre" value={formData.nombre} onChange={handleFormChange} required className={styles.input} />
            </div>
            <div className={styles.formGroup}>
              <label>Proveedor</label>
              <select name="proveedor_id" value={formData.proveedor_id} onChange={handleFormChange} required className={styles.select}>
                <option value="">Seleccione un proveedor</option>
                {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>

            <h3 className={styles.subtitle}>Ítems de la Plantilla</h3>
            <div className={styles.itemForm}>
                <input type="text" name="descripcion" placeholder="Descripción" value={newItem.descripcion} onChange={handleNewItemChange} className={styles.input} />
                <input type="text" name="especificaciones" placeholder="Especificaciones" value={newItem.especificaciones} onChange={handleNewItemChange} className={styles.input} />
                <Button variant="outline-primary" type="button" onClick={handleAddItem} size="sm">Añadir Ítem</Button>
            </div>
            <ul className={styles.itemList}>
              {items.map(item => (
                <li key={item.id}>
                  <span>{item.descripcion} ({item.especificaciones})</span>
                  <Button variant="outline-danger" type="button" onClick={() => handleDeleteItem(item.id)} size="sm">Eliminar</Button>
                </li>
              ))}
            </ul>

            <div className={styles.actionButtons}>
              {!isEditing && currentPlantillaId === null && formData.nombre.includes('-') ? (
                <>
                  <Button variant="outline-success" type="button" onClick={handleCreateSolicitudFromTemplate} size="sm">Crear Solicitud</Button>
                  <Button variant="outline-secondary" type="button" onClick={resetForm} size="sm">Cancelar</Button>
                </>
              ) : (
                <>
                  <Button variant="outline-success" type="submit" size="sm">{isEditing ? 'Actualizar' : 'Guardar'} Plantilla</Button>
                  <Button variant="outline-secondary" type="button" onClick={resetForm} size="sm">Cancelar</Button>
                </>
              )}
            </div>
          </form>
        </div>
      )}

      <div className={styles.plantillasList}>
        {plantillas.map(p => (
          <Card key={p.id} className="mb-3">
            <Card.Header as="h5">{p.nombre}</Card.Header>
            <Card.Body>
              <Card.Subtitle className="mb-2 text-muted">{p.proveedor_nombre}</Card.Subtitle>
              <ListGroup variant="flush">
                {p.items.map(item => (
                  <ListGroup.Item key={item.id}>{item.descripcion}</ListGroup.Item>
                ))}
              </ListGroup>
            </Card.Body>
            <Card.Footer className={styles.plantillaActions}>
                <Button variant="outline-primary" onClick={() => handleUseTemplate(p)} size="sm">Usar</Button>
                {user?.rol?.toLowerCase() !== 'aprobador' &&
                    <>
                        <Button variant="outline-secondary" onClick={() => handleEdit(p)} size="sm">Editar</Button>
                        <Button variant="outline-danger" onClick={() => handleDelete(p.id)} size="sm">Eliminar</Button>
                    </>
                }
            </Card.Footer>
          </Card>
        ))}
      </div>
    </div>
  );
}
