'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Spinner } from 'react-bootstrap';
import { FaPowerOff, FaHome, FaPlusSquare, FaListAlt, FaChartBar, FaUsers, FaTruck, FaBars, FaCheckSquare, FaFileAlt, FaCog, FaLightbulb, FaFileInvoice, FaTasks, FaBalanceScale, FaBuilding } from 'react-icons/fa';

import styles from './AppNavbar.module.css';

export default function AppNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [appSettings, setAppSettings] = useState({}); // Initialize as empty object

  useEffect(() => {
    if (Object.keys(appSettings).length > 0) {    }
  }, [appSettings]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        // Fetch settings and session in parallel
        const [settingsResponse, sessionResponse] = await Promise.all([
          fetch('/api/settings'),
          fetch('/api/session')
        ]);

        // Process settings
        if (settingsResponse.ok) {
          const settingsData = await settingsResponse.json();
          setAppSettings(settingsData);
        } else {
          console.error('Error fetching app settings:', settingsResponse.statusText);
        }

        // Process session
        if (sessionResponse.ok) {
          const userData = await sessionResponse.json();
          setUser(userData.user);
        } else {
          setUser(null);
          if (pathname !== '/login') {
            router.push('/login');
          }
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
        setUser(null);
        if (pathname !== '/login') {
          router.push('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    if (pathname === '/login') {
      setLoading(false);
      return;
    }

    fetchInitialData();
  }, [pathname, router]); // Re-fetch when path changes

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/logout', { method: 'POST' });
      if (response.ok) {
        setUser(null);
        router.push('/login');
      } else {
        alert('NO SE PUDO CERRAR LA SESIÓN.');
      }
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      alert('ERROR DE CONEXIÓN AL CERRAR SESIÓN.');
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner animation="border" size="sm" className="me-2" /> CARGANDO...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="non-printable">
      {/* Mobile Sidebar Toggle Button */}
      <button className={`${styles.mobileMenuButton} ${isSidebarOpen ? styles.open : ''}`} onClick={toggleSidebar} title="ABRIR/CERRAR MENÚ">
        <FaBars size={24} />
      </button>

      {/* Vertical Sidebar Navigation */}
      <div className={`app-sidebar ${styles.sidebar} ${isSidebarOpen ? styles.open : ''}`}>
        <div className={styles.sidebarHeader}>
          <Image src="/logo.png" alt={appSettings?.company_name || "Logo de la empresa"} width={150} height={50} className={styles.logo} priority={true} style={{ height: 'auto' }} />
          <p className={styles.userInfo}>
            <span translate="no">BIENVENID@, <span className={styles.userName}>{user.nombre}</span></span><br />
            <span className={styles.userRole} translate="no">({user.rol})</span>
          </p>
          {appSettings?.company_name && (
            <p className={styles.companyName}>{appSettings.company_name}</p>
          )}
        </div>

        <nav className={styles.navbarNav}>
          <Link href={user.rol.toLowerCase() === 'aprobador' ? "/aprobador-dashboard" : "/dashboard"} className={styles.navLink} onClick={toggleSidebar}>
            <FaHome className={styles.navIcon} /> <span translate="no">PANEL</span>
          </Link>
          <Link href="/solicitud/nueva" className={styles.navLink} onClick={toggleSidebar}>
              <FaPlusSquare className={styles.navIcon} /> <span translate="no">NUEVA SOLICITUD</span>
            </Link>
          <Link href="/mis-solicitudes" className={styles.navLink} onClick={toggleSidebar}>
            <FaListAlt className={styles.navIcon} /> <span translate="no">MIS SOLICITUDES</span>
          </Link>
          {user && user.rol.toLowerCase() !== 'aprobador' && (
            <Link href="/plantillas" className={styles.navLink} onClick={toggleSidebar}>
              <FaFileAlt className={styles.navIcon} /> <span translate="no">MIS PLANTILLAS</span>
            </Link>
          )}

          {/* Link para Registro de Facturas */}
          {user && user.rol.toLowerCase() !== 'aprobador' && (
            <Link href="/registro-facturas" className={styles.navLink} onClick={toggleSidebar}>
              <FaFileInvoice className={styles.navIcon} /> <span translate="no">REGISTRAR FACTURA</span>
            </Link>
          )}

          {/* Link para Aprobadores */}
          {user && user.rol.toLowerCase() === 'aprobador' && (
            <Link href="/aprobaciones-pendientes" className={styles.navLink} onClick={toggleSidebar}>
              <FaCheckSquare className={styles.navIcon} /> <span translate="no">APROBACIONES</span>
            </Link>
          )}

          {user && user.rol.toLowerCase() === 'administrador' && (
            <>
              <div className={styles.adminSectionHeader} translate="no">ADMINISTRACIÓN</div>
              <Link href="/admin/ai-insights" className={styles.navLink} onClick={toggleSidebar}>
                <FaLightbulb className={styles.navIcon} /> <span translate="no">ANÁLISIS DE COMPRAS</span>
              </Link>
              <Link href="/admin/comparador-precios" className={styles.navLink} onClick={toggleSidebar}>
                <FaBalanceScale className={styles.navIcon} /> <span translate="no">COMPARADOR</span>
              </Link>
              <Link href="/admin/solicitudes" className={styles.navLink} onClick={toggleSidebar}>
                <FaTasks className={styles.navIcon} /> <span translate="no">GESTIÓN SOLICITUDES</span>
              </Link>
              <Link href="/facturas" className={styles.navLink} onClick={toggleSidebar}>
                <FaFileInvoice className={styles.navIcon} /> <span translate="no">GESTIÓN FACTURAS</span>
              </Link>
              <Link href="/admin/usuarios" className={styles.navLink} onClick={toggleSidebar}>
                <FaUsers className={styles.navIcon} /> <span translate="no">GESTIÓN USUARIOS</span>
              </Link>
              <Link href="/admin/proveedores" className={styles.navLink} onClick={toggleSidebar}>
                <FaTruck className={styles.navIcon} /> <span translate="no">PROVEEDORES</span>
              </Link>

              <div className={styles.adminSectionHeader} translate="no">SISTEMA</div>
              <Link href="/admin/settings" className={styles.navLink} onClick={toggleSidebar}>
                <FaCog className={styles.navIcon} /> <span translate="no">CONFIGURACIÓN</span>
              </Link>
            </>
          )}

          {/* Sección Super Admin - Solo visible para super administradores */}
          {user && user.is_super_admin && (
            <>
              <div className={`${styles.adminSectionHeader} ${styles.superAdminHeader}`} translate="no">🔐 SUPER ADMIN</div>
              <Link href="/super-admin" className={`${styles.navLink} ${styles.superAdminLink}`} onClick={toggleSidebar}>
                <span className={styles.navIcon}>🔑</span> <span translate="no">PANEL SUPER ADMIN</span>
              </Link>
            </>
          )}

          {/* Botón de Cerrar Sesión integrado en la navegación */}
          <button className={`${styles.navLink} ${styles.logoutNavLink}`} onClick={handleLogout} title="Cerrar Sesión">
            <FaPowerOff className={styles.navIcon} /> <span translate="no">CERRAR SESIÓN</span>
          </button>
        </nav>

        <div className={styles.footerText}>
          Creado por: Rolando Torres
        </div>
        </div>
    </div>
  );
}