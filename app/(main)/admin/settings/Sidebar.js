
"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { FaPowerOff, FaHome, FaPlusSquare, FaListAlt, FaChartBar, FaUsers, FaTruck, FaCheckSquare, FaFileAlt } from 'react-icons/fa';
import styles from './Sidebar.module.css';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch('/api/session');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          router.push('/login');
        }
      } catch (error) {
        console.error("Error fetching user session for sidebar", error);
        router.push('/login');
      }
    };
    fetchSession();
  }, [pathname, router]);

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

  const isAdmin = user?.rol?.toLowerCase() === 'administrador';

  if (!user) {
    return null; // O un spinner de carga
  }

  return (
    <nav className={`app-sidebar ${styles.sidebar}`}>
      <div className={styles.sidebarHeader}>
        <Image src="/logo.png" alt="LOGO POLLOS AL DÍA" width={150} height={50} className={styles.logo} />
        <p className={styles.userInfo}>
          <span translate="no">BIENVENID@, <span className={styles.userName}>{user.nombre}</span></span><br />
          <span className={styles.userRole} translate="no">({user.rol})</span>
        </p>
      </div>

      <ul className={styles.navList}>
        <li><Link href="/dashboard" className={pathname === '/dashboard' ? styles.active : ''}><FaHome className={styles.navIcon} /> PANEL</Link></li>
        {user && user.rol?.toLowerCase() !== 'aprobador' && (
          <li><Link href="/solicitud/nueva" className={pathname === '/solicitud/nueva' ? styles.active : ''}><FaPlusSquare className={styles.navIcon} /> NUEVA SOLICITUD</Link></li>
        )}
        <li><Link href="/mis-solicitudes" className={pathname === '/mis-solicitudes' ? styles.active : ''}><FaListAlt className={styles.navIcon} /> MIS SOLICITUDES</Link></li>
        <li><Link href="/plantillas" className={pathname === '/plantillas' ? styles.active : ''}><FaFileAlt className={styles.navIcon} /> MIS PLANTILLAS</Link></li>

        {user && user.rol?.toLowerCase() === 'aprobador' && (
          <li><Link href="/admin/aprobaciones" className={pathname === '/admin/aprobaciones' ? styles.active : ''}><FaCheckSquare className={styles.navIcon} /> APROBACIONES</Link></li>
        )}

        {isAdmin && (
          <>
            <li className={styles.separator}>ADMIN</li>
            <li><Link href="/admin/dashboard" className={pathname === '/admin/dashboard' ? styles.active : ''}><FaChartBar className={styles.navIcon} /> PANEL ADMIN</Link></li>
            <li><Link href="/admin/solicitudes" className={pathname === '/admin/solicitudes' ? styles.active : ''}><FaListAlt className={styles.navIcon} /> GESTIÓN SOLICITUDES</Link></li>
            <li><Link href="/admin/usuarios" className={pathname === '/admin/usuarios' ? styles.active : ''}><FaUsers className={styles.navIcon} /> GESTIÓN USUARIOS</Link></li>
            <li><Link href="/admin/proveedores" className={pathname === '/admin/proveedores' ? styles.active : ''}><FaTruck className={styles.navIcon} /> GESTIÓN PROVEEDORES</Link></li>
          </>
        )}
      </ul>

      <div className={styles.sidebarFooter}>
        <button className={`${styles.navLink} ${styles.logoutNavLink}`} onClick={handleLogout} title="Cerrar Sesión">
          <FaPowerOff className={styles.navIcon} /> CERRAR SESIÓN
        </button>
      </div>
    </nav>
  );
}