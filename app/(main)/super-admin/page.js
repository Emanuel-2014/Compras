'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Row, Col, Card, Badge } from 'react-bootstrap';
import styles from './superadmin.module.css';

export default function SuperAdminPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSolicitudes: 0,
    totalProveedores: 0,
    activeLicenses: 0
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/session', { credentials: 'include' });
      if (!response.ok) {
        router.replace('/');
        return;
      }

      const data = await response.json();
      if (!data.user || !data.user.is_super_admin) {
        router.replace('/');
        return;
      }

      setUser(data.user);
      loadStats();
    } catch (error) {
      console.error('Error al verificar autenticación:', error);
      router.replace('/');
    }
  };

  const loadStats = async () => {
    try {
      // Cargar estadísticas básicas
      const [usersRes, licenseRes] = await Promise.all([
        fetch('/api/admin/usuarios', { credentials: 'include' }),
        fetch('/api/super-admin/licenses', { credentials: 'include' })
      ]);

      let totalUsers = 0;
      let activeLicenses = 0;

      if (usersRes.ok) {
        const users = await usersRes.json();
        totalUsers = users.length;
      }

      if (licenseRes.ok) {
        const licenses = await licenseRes.json();
        activeLicenses = licenses.filter(l => l.status === 'active').length;
      }

      setStats(prev => ({
        ...prev,
        totalUsers,
        activeLicenses
      }));
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container className="mt-5">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
        </div>
      </Container>
    );
  }

  const adminSections = [
    {
      title: 'Gestión de Licencias',
      description: 'Aplicar, visualizar y gestionar las licencias del sistema',
      link: '/super-admin/licenses',
      icon: '🔑'
    },
    {
      title: 'Logs de Auditoría',
      description: 'Ver historial completo de acciones del sistema',
      link: '/super-admin/audit',
      icon: '📝'
    },
    {
      title: 'Backup y Restauración',
      description: 'Crear y gestionar copias de seguridad de la base de datos',
      link: '/super-admin/backup',
      icon: '💾'
    },
    {
      title: 'Monitor del Sistema',
      description: 'Ver estadísticas en tiempo real y métricas de rendimiento',
      link: '/super-admin/monitor',
      icon: '📊'
    },
    {
      title: 'Sesiones Activas',
      description: 'Monitorear y gestionar las sesiones de usuarios conectados',
      link: '/super-admin/sessions',
      icon: '👤'
    },
    {
      title: 'Configuración de Seguridad',
      description: 'Políticas de contraseñas, timeouts y control de acceso por IP',
      link: '/super-admin/security',
      icon: '🔐'
    },
    {
      title: 'Gestión de Archivos',
      description: 'Explorar, monitorear y limpiar archivos del sistema',
      link: '/super-admin/files',
      icon: '📁'
    },
    {
      title: 'Importación/Exportación',
      description: 'Importar y exportar datos masivamente en Excel',
      link: '/super-admin/import-export',
      icon: '🔄'
    },
    {
      title: 'Mantenimiento del Sistema',
      description: 'VACUUM, REINDEX, optimización y limpieza de la base de datos',
      link: '/super-admin/maintenance',
      icon: '🔧'
    },
    {
      title: 'Gestión de Usuarios',
      description: 'Administrar todos los usuarios del sistema',
      link: '/admin/usuarios',
      icon: '👥'
    },
    {
      title: 'Gestión de Dependencias',
      description: 'Administrar departamentos y áreas de la empresa',
      link: '/admin/dependencias',
      icon: '🏢'
    },
    {
      title: 'Gestión de Proveedores',
      description: 'Administrar la lista de proveedores',
      link: '/admin/proveedores',
      icon: '🏪'
    },
    {
      title: 'Configuración General',
      description: 'Configurar ajustes generales de la aplicación',
      link: '/settings',
      icon: '⚙️'
    },
    {
      title: 'Dashboard Completo',
      description: 'Ver todas las solicitudes y estadísticas del sistema',
      link: '/admin/dashboard',
      icon: '📊'
    },
    {
      title: 'Todas las Solicitudes',
      description: 'Gestionar todas las solicitudes del sistema',
      link: '/admin/solicitudes',
      icon: '📋'
    },
    {
      title: 'Reportes Avanzados',
      description: 'Generar reportes detallados y análisis',
      link: '/admin/reportes',
      icon: '📑'
    }
  ];

  return (
    <Container fluid className={styles.container}>
      <div className="py-4">
        {/* Header */}
        <div className="mb-5">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h1 className="h2 mb-1">🔐 Panel de Super Administrador</h1>
              <p className="text-muted mb-0">
                Bienvenido, <strong>{user?.nombre}</strong>
              </p>
            </div>
            <Badge bg="danger" className="px-3 py-2">
              SUPER ADMIN
            </Badge>
          </div>
          <hr />
        </div>

        {/* Stats Cards */}
        <Row className="mb-4">
          <Col md={3}>
            <Card className={styles.statCard}>
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <p className="text-muted mb-1">Usuarios Totales</p>
                    <h3 className="mb-0">{stats.totalUsers}</h3>
                  </div>
                  <div className={styles.statIcon}>👥</div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className={styles.statCard}>
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <p className="text-muted mb-1">Licencias Activas</p>
                    <h3 className="mb-0">{stats.activeLicenses}</h3>
                  </div>
                  <div className={styles.statIcon}>🔑</div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Admin Sections Grid */}
        <Row>
          {adminSections.map((section, index) => (
            <Col key={index} md={6} lg={4} xl={2} className="mb-4">
              <Card 
                className={`${styles.sectionCard} h-100`}
                onClick={() => router.push(section.link)}
              >
                <Card.Body className="d-flex flex-column text-center">
                  <div className={styles.cardIcon}>{section.icon}</div>
                  <Card.Title className="h6 mt-3">{section.title}</Card.Title>
                  <Card.Text className="text-muted small flex-grow-1">
                    {section.description}
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>

        {/* Info Alert */}
        <div className="mt-4">
          <Card className="border-warning">
            <Card.Body>
              <div className="d-flex align-items-start">
                <div className="me-3 fs-3">⚠️</div>
                <div>
                  <h6 className="mb-2">Acceso de Super Administrador</h6>
                  <p className="mb-0 text-muted small">
                    Como super administrador, tienes acceso completo a todas las funcionalidades del sistema, 
                    incluyendo gestión de licencias, configuración avanzada y acceso a todos los datos sin restricciones.
                    Usa estos privilegios con responsabilidad.
                  </p>
                </div>
              </div>
            </Card.Body>
          </Card>
        </div>
      </div>
    </Container>
  );
}
