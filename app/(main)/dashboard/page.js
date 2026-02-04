'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Row, Col, Card, Button, Spinner, Alert } from 'react-bootstrap';
import Link from 'next/link';
import { FaPlusSquare, FaListAlt, FaHourglassHalf, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import styles from './page.module.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function DashboardPage() {
  const router = useRouter();
  const [summary, setSummary] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [expandedChart, setExpandedChart] = useState(null);
  
  // Chart references
  const statusChartRef = useRef(null);
  const necessityChartRef = useRef(null);
  const dependenciaChartRef = useRef(null);

  // Filter states
  const [users, setUsers] = useState([]);
  const [dependencies, setDependencies] = useState([]);
  const [filterUsuarioId, setFilterUsuarioId] = useState('');
  const [filterDependencia, setFilterDependencia] = useState('');
  const [filterNecesidad, setFilterNecesidad] = useState('');

  const fetchInitialData = async () => {
    try {
      const usersRes = await fetch('/api/admin/usuarios', { credentials: 'include' });
      
      if (!usersRes.ok) {
        if (usersRes.status === 401 || usersRes.status === 403) {
          router.replace('/login');
          return;
        }
      }
      
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        const requesters = usersData.filter(u => u.rol?.toLowerCase() !== 'aprobador');
        const allUsers = usersData;
        setUsers(requesters);
        const uniqueDependencies = [...new Set(allUsers.map(u => u.dependencia).filter(Boolean))];
        setDependencies(uniqueDependencies);
      }
    } catch (err) {
      console.error('ERROR FETCHING INITIAL DATA FOR FILTERS:', err);
      // Si hay error de red, redirigir al login
      router.replace('/login');
    }
  };

  const fetchDashboardStats = async (showLoading = true, currentUsuarioId, currentDependencia, currentNecesidad) => {
    try {
      if (showLoading) setLoading(true);
      const queryParams = new URLSearchParams();
      if (currentUsuarioId) queryParams.append('usuarioId', currentUsuarioId);
      if (currentDependencia) queryParams.append('dependencia', currentDependencia);
      if (currentNecesidad) queryParams.append('necesidad', currentNecesidad);

      const res = await fetch(`/api/admin/dashboard-stats?${queryParams.toString()}`, { credentials: 'include' });
      
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.replace('/login');
          return;
        }
        setStats(null);
      } else {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error al cargar estadísticas:', err);
      // Si hay error de fetch, podría ser sesión expirada
      router.replace('/login');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleCopyChart = async (chartRef) => {
    if (chartRef.current) {
      try {
        chartRef.current.canvas.toBlob(async (blob) => {
          if (blob) {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]);
            alert('GRÁFICO COPIADO AL PORTAPAPELES COMO IMAGEN.');
          } else {
            throw new Error('No se pudo generar la imagen del gráfico.');
          }
        });
      } catch (err) {
        console.error('Error al copiar el gráfico:', err);
        alert('NO SE PUDO COPIAR EL GRÁFICO. ES POSIBLE QUE TU NAVEGADOR NO SEA COMPATIBLE.');
      }
    }
  };

  const handleChartClick = (chartName) => {
    setExpandedChart(expandedChart === chartName ? null : chartName);
  };

  const handleOverlayClick = () => {
    setExpandedChart(null);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userResponse = await fetch('/api/session', { credentials: 'include' });
        
        // Si la sesión expiró o no hay autenticación, redirigir al login
        if (!userResponse.ok) {
          if (userResponse.status === 401 || userResponse.status === 403) {
            router.replace('/login');
            return;
          }
        }
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUser(userData.user);

          if (userData.user && userData.user.rol && userData.user.rol.toLowerCase() === 'aprobador') {
            router.replace('/aprobador-dashboard');
            return;
          }

          if (userData.user) {
            const summaryResponse = await fetch('/api/dashboard', { credentials: 'include' });
            
            // Verificar si la sesión expiró durante la segunda petición
            if (!summaryResponse.ok) {
              if (summaryResponse.status === 401 || summaryResponse.status === 403) {
                router.replace('/login');
                return;
              }
              const errorData = await summaryResponse.json();
              setError(errorData.error || 'ERROR AL CARGAR EL RESUMEN DEL PANEL.');
            } else {
              const summaryData = await summaryResponse.json();
              setSummary(summaryData);
            }

            // Si es administrador, cargar también estadísticas
            if (userData.user.rol?.toLowerCase() === 'administrador') {
              fetchInitialData();
            }
          }
        } else {
          router.replace('/login');
          return;
        }
      } catch (err) {
        console.error('ERROR AL CARGAR LOS DATOS DEL PANEL:', err);
        // Si hay error de red, podría ser porque la sesión expiró
        // Redirigir al login en lugar de mostrar error
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const intervalId = setInterval(fetchData, 30000);
    return () => clearInterval(intervalId);
  }, [router]);

  // Efecto para cargar estadísticas cuando los filtros cambian (solo para administradores)
  useEffect(() => {
    if (user && user.rol?.toLowerCase() === 'administrador') {
      fetchDashboardStats(true, filterUsuarioId, filterDependencia, filterNecesidad);

      const intervalId = setInterval(() => {
        fetchDashboardStats(false, filterUsuarioId, filterDependencia, filterNecesidad);
      }, 10000);

      return () => {
        clearInterval(intervalId);
      };
    }
  }, [filterUsuarioId, filterDependencia, filterNecesidad, user]);

  // Color mapping for chart data
  const colorMap = {
    pendiente: { background: 'rgba(255, 159, 64, 0.6)', border: 'rgba(255, 159, 64, 1)' },
    aprobada: { background: 'rgba(40, 167, 69, 0.6)', border: 'rgba(40, 167, 69, 1)' },
    rechazada: { background: 'rgba(220, 53, 69, 0.6)', border: 'rgba(220, 53, 69, 1)' },
    cerrada: { background: 'rgba(108, 117, 125, 0.6)', border: 'rgba(108, 117, 125, 1)' },
    no_conformidad: { background: 'rgba(108, 117, 125, 0.6)', border: 'rgba(108, 117, 125, 1)' },
    default: { background: 'rgba(201, 203, 207, 0.6)', border: 'rgba(201, 203, 207, 1)' },
    urgencia: { background: 'rgba(255, 0, 0, 0.6)', border: 'rgba(255, 0, 0, 1)' },
    programada: { background: 'rgba(75, 192, 192, 0.6)', border: 'rgba(75, 192, 192, 1)' },
  };

  const statusLabels = Object.keys(stats?.solicitudesPorEstado || {});
  const statusChartData = {
    labels: statusLabels,
    datasets: [
      {
        label: 'SOLICITUDES POR ESTADO',
        data: Object.values(stats?.solicitudesPorEstado || {}),
        backgroundColor: statusLabels.map(label => colorMap[label]?.background || colorMap.default.background),
        borderColor: statusLabels.map(label => colorMap[label]?.border || colorMap.default.border),
        borderWidth: 1,
      },
    ],
  };

  const necessityLabels = Object.keys(stats?.solicitudesPorNecesidad || {});
  const necessityChartData = {
    labels: necessityLabels,
    datasets: [
      {
        label: 'SOLICITUDES POR NECESIDAD',
        data: Object.values(stats?.solicitudesPorNecesidad || {}),
        backgroundColor: necessityLabels.map(label => colorMap[label]?.background || colorMap.default.background),
        borderColor: necessityLabels.map(label => colorMap[label]?.border || colorMap.default.border),
        borderWidth: 1,
      },
    ],
  };

  const dependenciaLabels = Object.keys(stats?.solicitudesPorDependencia || {});
  const dependenciaChartData = {
    labels: dependenciaLabels,
    datasets: [
      {
        label: 'SOLICITUDES POR DEPENDENCIA',
        data: Object.values(stats?.solicitudesPorDependencia || {}),
        backgroundColor: dependenciaLabels.map((_, i) => `hsla(${(i * 360) / dependenciaLabels.length}, 70%, 60%, 0.6)`),
        borderColor: dependenciaLabels.map((_, i) => `hsla(${(i * 360) / dependenciaLabels.length}, 70%, 60%, 1)`),
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: { display: false },
    },
    scales: {
      x: { ticks: { stepSize: 1 } },
      y: { ticks: { stepSize: 1 } }
    }
  };

  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">CARGANDO...</span>
        </Spinner>
        <p className="mt-2">CARGANDO RESUMEN DEL PANEL...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-5">
        <Alert variant="danger">{error}</Alert>
      </Container>
    );
  }

  const isAdmin = user && user.rol?.toLowerCase() === 'administrador';

  return (
    <Container className="mt-5" style={{ maxWidth: '100%' }}>
      <Card className="shadow-sm">
        <Card.Header as="h2" className="text-center"><span translate="no">PANEL PRINCIPAL</span></Card.Header>
        <Card.Body>
          <Card.Title className="text-center fw-bold"><span translate="no">BIENVENID@, {user ? user.nombre.toUpperCase() : 'ADMINISTRADOR PRINCIPAL'}</span></Card.Title>
          <Card.Text className="text-center fw-bold">
            <span translate="no">AQUÍ TIENES UN RESUMEN RÁPIDO DE TUS SOLICITUDES DE COMPRA.</span>
          </Card.Text>

          <hr />

          {summary && <Row className="mb-4">
            <Col md={3} className="mb-3">
              <Link href="/mis-solicitudes" passHref>
                <Card className="text-center bg-info text-white dashboard-card">
                  <Card.Body>
                    <FaListAlt size={30} className="mb-2" />
                    <Card.Title>{summary.totalRequests}</Card.Title>
                      <Card.Text className="dashboard-card-text"><span translate="no">TOTAL SOLICITUDES</span></Card.Text>
                  </Card.Body>
                </Card>
              </Link>
            </Col>
            <Col md={3} className="mb-3">
              <Link href="/mis-solicitudes?estado=pendiente" passHref>
                <Card className="text-center bg-warning text-dark dashboard-card">
                  <Card.Body>
                    <FaHourglassHalf size={30} className="mb-2" />
                    <Card.Title>{summary.pendingRequests}</Card.Title>
                      <Card.Text className="dashboard-card-text"><span translate="no">SOLICITUDES PENDIENTES</span></Card.Text>
                  </Card.Body>
                </Card>
              </Link>
            </Col>
            <Col md={3} className="mb-3">
              <Link href="/mis-solicitudes?estado=aprobada" passHref>
                <Card className="text-center bg-success text-white dashboard-card">
                  <Card.Body>
                    <FaCheckCircle size={30} className="mb-2" />
                    <Card.Title>{summary.approvedRequests}</Card.Title>
                      <Card.Text className="dashboard-card-text"><span translate="no">SOLICITUDES APROBADAS</span></Card.Text>
                  </Card.Body>
                </Card>
              </Link>
            </Col>
            <Col md={3} className="mb-3">
              <Link href="/mis-solicitudes?estado=rechazada" passHref>
                <Card className="text-center bg-danger text-white dashboard-card">
                  <Card.Body>
                    <FaTimesCircle size={30} className="mb-2" />
                    <Card.Title>{summary.rejectedRequests}</Card.Title>
                      <Card.Text className="dashboard-card-text"><span translate="no">SOLICITUDES RECHAZADAS</span></Card.Text>
                  </Card.Body>
                </Card>
              </Link>
            </Col>
          </Row>}

        </Card.Body>
      </Card>

      {/* Sección de gráficas para administradores */}
      {isAdmin && stats && (
        <div className={styles.container} style={{ marginTop: '2rem' }}>
          <h1 className={styles.pageTitle}>ESTADÍSTICAS DE ADMINISTRACIÓN</h1>

          <div className={styles.filtersContainer}>
              <select
                className={styles.filterInput}
                value={filterUsuarioId}
                onChange={(e) => setFilterUsuarioId(e.target.value)}
                style={{ color: '#000', fontWeight: '700', fontSize: '1rem' }}
              >
                <option value="" style={{ color: '#000', fontWeight: '700' }}>TODOS LOS SOLICITANTES</option>
                {users.map(u => (
                  <option key={u.id} value={u.id} style={{ color: '#000', fontWeight: '700' }}>{u.nombre}</option>
                ))}
              </select>
              <select
                className={styles.filterInput}
                value={filterDependencia}
                onChange={(e) => setFilterDependencia(e.target.value)}
                style={{ color: '#000', fontWeight: '700', fontSize: '1rem' }}
              >
                <option value="" style={{ color: '#000', fontWeight: '700' }}>TODAS LAS DEPENDENCIAS</option>
                {dependencies.map(dep => (
                  <option key={dep} value={dep} style={{ color: '#000', fontWeight: '700' }}>{dep}</option>
                ))}
              </select>
              <select
                className={styles.filterInput}
                value={filterNecesidad}
                onChange={(e) => setFilterNecesidad(e.target.value)}
                style={{ color: '#000', fontWeight: '700', fontSize: '1rem' }}
              >
                <option value="" style={{ color: '#000', fontWeight: '700' }}>TODAS LAS PRIORIDADES</option>
                <option value="urgencia" style={{ color: '#000', fontWeight: '700' }}>URGENCIA</option>
                <option value="programada" style={{ color: '#000', fontWeight: '700' }}>PROGRAMADA</option>
              </select>
          </div>

          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <h3>TOTAL SOLICITUDES</h3>
              <p>{stats.totalSolicitudes}</p>
            </div>
            <div className={styles.statCard}>
              <h3>TOTAL DEPENDENCIAS</h3>
              <p>{Object.keys(stats.solicitudesPorDependencia).length}</p>
            </div>
            {Object.entries(stats.solicitudesPorEstado).map(([estado, count]) => (
              <div key={estado} className={styles.statCard}>
                <h3>{estado.toUpperCase()}</h3>
                <p>{count}</p>
              </div>
            ))}
          </div>

          <div className={styles.chartsContainer}>
            <div className={`${styles.chartCard} ${expandedChart === 'status' ? styles.expanded : ''}`} onClick={(e) => { if (e.target.tagName !== 'CANVAS') handleChartClick('status'); }}>
              {expandedChart === 'status' && (
                <button className={styles.closeButton} onClick={(e) => { e.stopPropagation(); setExpandedChart(null); }}>CERRAR</button>
              )}
              <h3>SOLICITUDES POR ESTADO</h3>
              <div className={styles.chartWrapper}>
                {Object.keys(stats.solicitudesPorEstado).length > 0 ? (
                  <Bar 
                    ref={statusChartRef} 
                    options={{
                      ...chartOptions, 
                      indexAxis: 'y',
                      scales: { x: { ticks: { stepSize: 1, precision: 0 } } }
                    }} 
                    data={statusChartData} />
                ) : (
                  <p>NO HAY DATOS PARA ESTE GRÁFICO CON LOS FILTROS ACTUALES.</p>
                )}
              </div>
              <div className={styles.chartFooter}>
                <button onClick={(e) => { e.stopPropagation(); handleCopyChart(statusChartRef); }} className={styles.copyButton}>COPIAR</button>
              </div>
            </div>
            <div className={`${styles.chartCard} ${expandedChart === 'necessity' ? styles.expanded : ''}`} onClick={(e) => { if (e.target.tagName !== 'CANVAS') handleChartClick('necessity'); }}>
              {expandedChart === 'necessity' && (
                <button className={styles.closeButton} onClick={(e) => { e.stopPropagation(); setExpandedChart(null); }}>CERRAR</button>
              )}
              <h3>SOLICITUDES POR TIPO DE NECESIDAD</h3>
              <div className={styles.chartWrapper}>
                {Object.keys(stats.solicitudesPorNecesidad).length > 0 ? (
                  <Pie 
                    ref={necessityChartRef} 
                    options={{
                      ...chartOptions,
                      scales: {}
                    }} 
                    data={necessityChartData} />
                ) : (
                  <p>NO HAY DATOS PARA ESTE GRÁFICO CON LOS FILTROS ACTUALES.</p>
                )}
              </div>
              <div className={styles.chartFooter}>
                <button onClick={(e) => { e.stopPropagation(); handleCopyChart(necessityChartRef); }} className={styles.copyButton}>COPIAR</button>
              </div>
            </div>
            <div className={`${styles.chartCard} ${expandedChart === 'dependencia' ? styles.expanded : ''}`} onClick={(e) => { if (e.target.tagName !== 'CANVAS') handleChartClick('dependencia'); }}>
              {expandedChart === 'dependencia' && (
                <button className={styles.closeButton} onClick={(e) => { e.stopPropagation(); setExpandedChart(null); }}>CERRAR</button>
              )}
              <h3>TOP SOLICITANTES EN MI DEPENDENCIA</h3>
              <div className={styles.chartWrapper}>
                {Object.keys(stats.solicitudesPorDependencia).length > 0 ? (
                  <Bar 
                    ref={dependenciaChartRef} 
                    options={{
                      ...chartOptions,
                      scales: { y: { ticks: { stepSize: 1, precision: 0 } } }
                    }} 
                    data={dependenciaChartData} />
                ) : (
                  <p>NO HAY DATOS PARA ESTE GRÁFICO CON LOS FILTROS ACTUALES.</p>
                )}
              </div>
              <div className={styles.chartFooter}>
                <button onClick={(e) => { e.stopPropagation(); handleCopyChart(dependenciaChartRef); }} className={styles.copyButton}>COPIAR</button>
              </div>
            </div>
          </div>
          {expandedChart && <div className={`${styles.overlay} ${styles.active}`} onClick={handleOverlayClick}></div>}
        </div>
      )}
    </Container>
  );
}