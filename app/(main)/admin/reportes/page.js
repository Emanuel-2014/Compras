// app/(main)/admin/reportes/page.js
"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css'; // Usaremos un CSS module para los estilos
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

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function AdminReportesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  // Referencias para los gráficos
  const statusChartRef = useRef(null);
  const necessityChartRef = useRef(null);
  const dependenciaChartRef = useRef(null);

  // Estados para los filtros
  const [users, setUsers] = useState([]);
  const [dependencies, setDependencies] = useState([]);
  const [filterUsuarioId, setFilterUsuarioId] = useState('');
  const [filterDependencia, setFilterDependencia] = useState('');
  const [filterNecesidad, setFilterNecesidad] = useState(''); // Nuevo filtro de prioridad

  // Carga los datos iniciales para los dropdowns de los filtros
  const fetchInitialData = async () => {
    try {
      const usersRes = await fetch('/api/admin/users');
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        // Filtro robusto: Excluye a los aprobadores sin importar mayúsculas/minúsculas.
        const requesters = usersData.filter(u => u.rol?.toLowerCase() !== 'aprobador');
        const allUsers = usersData; // Guardamos todos los usuarios para obtener las dependencias
        setUsers(requesters);
        const uniqueDependencies = [...new Set(allUsers.map(u => u.dependencia).filter(Boolean))];
        setDependencies(uniqueDependencies);
      } else {
        console.error('FALLO AL CARGAR USUARIOS PARA FILTROS');
      }
    } catch (err) {
      console.error('ERROR CARGANDO DATOS INICIALES PARA FILTROS:', err);
    }
  };

  // Obtiene las estadísticas del dashboard desde la API
  const fetchDashboardStats = async (showLoading = true, currentUsuarioId, currentDependencia, currentNecesidad) => {
    try {
      if (showLoading) setLoading(true);
      const queryParams = new URLSearchParams();
      if (currentUsuarioId) queryParams.append('usuarioId', currentUsuarioId);
      if (currentDependencia) queryParams.append('dependencia', currentDependencia);
      if (currentNecesidad) queryParams.append('necesidad', currentNecesidad);

      const res = await fetch(`/api/admin/dashboard-stats?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else if (res.status === 403) {
        alert('ACCESO DENEGADO. NO TIENES PERMISOS DE ADMINISTRADOR.');
        router.push('/');
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || 'ERROR AL CARGAR LAS ESTADÍSTICAS.');
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error al cargar el dashboard:', err);
        setError(err.message || 'ERROR DE CONEXIÓN AL CARGAR EL DASHBOARD.');
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Efecto para la carga inicial de datos de los filtros
  useEffect(() => {
    fetchInitialData();
  }, []);

  // Efecto para recargar las estadísticas cuando los filtros cambian (ESTA ES LA CLAVE)
  useEffect(() => {
    fetchDashboardStats(true, filterUsuarioId, filterDependencia, filterNecesidad);

    const intervalId = setInterval(() => {
      fetchDashboardStats(false, filterUsuarioId, filterDependencia, filterNecesidad);
    }, 10000); // Refresca cada 10 segundos

    return () => {
      clearInterval(intervalId);
    };
  }, [filterUsuarioId, filterDependencia, filterNecesidad]);

  // Función para copiar el gráfico al portapapeles
  const handleCopyChart = async (chartRef) => {
    if (chartRef.current) {
      try {
        chartRef.current.canvas.toBlob(async (blob) => {
          if (blob) {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
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

  // Colores para los gráficos
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

  // Datos para los gráficos
  const statusLabels = Object.keys(stats?.solicitudesPorEstado || {});
  const statusChartData = {
    labels: statusLabels,
    datasets: [{
      label: 'Solicitudes por Estado',
      data: Object.values(stats?.solicitudesPorEstado || {}),
      backgroundColor: statusLabels.map(label => colorMap[label]?.background || colorMap.default.background),
      borderColor: statusLabels.map(label => colorMap[label]?.border || colorMap.default.border),
      borderWidth: 1,
    }],
  };

  const necessityLabels = Object.keys(stats?.solicitudesPorNecesidad || {});
  const necessityChartData = {
    labels: necessityLabels,
    datasets: [{
      label: 'Solicitudes por Necesidad',
      data: Object.values(stats?.solicitudesPorNecesidad || {}),
      backgroundColor: necessityLabels.map(label => colorMap[label]?.background || colorMap.default.background),
      borderColor: necessityLabels.map(label => colorMap[label]?.border || colorMap.default.border),
      borderWidth: 1,
    }],
  };

  const dependenciaLabels = Object.keys(stats?.solicitudesPorDependencia || {});
  const dependenciaChartData = {
    labels: dependenciaLabels,
    datasets: [{
      label: 'Solicitudes por Dependencia',
      data: Object.values(stats?.solicitudesPorDependencia || {}),
      backgroundColor: dependenciaLabels.map((_, i) => `hsla(${(i * 360) / dependenciaLabels.length}, 70%, 60%, 0.6)`),
      borderColor: dependenciaLabels.map((_, i) => `hsla(${(i * 360) / dependenciaLabels.length}, 70%, 60%, 1)`),
      borderWidth: 1,
    }],
  };

  // Opciones comunes para los gráficos
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: { display: false },
    },
    scales: {
      x: { ticks: { stepSize: 1, precision: 0 } },
      y: { ticks: { stepSize: 1, precision: 0 } }
    }
  };

  if (loading && !stats) { // Muestra 'cargando' solo en la carga inicial
    return <div className={styles.container}>CARGANDO REPORTES...</div>;
  }

  if (error) {
    return <div className={styles.container} style={{ color: 'red' }}>ERROR: {error}</div>;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>GRÁFICAS Y REPORTES</h1>

      <div className={styles.filtersContainer}>
          <select
            className={styles.filterInput}
            value={filterUsuarioId}
            onChange={(e) => setFilterUsuarioId(e.target.value)}
          >
            <option value="">TODOS LOS SOLICITANTES</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.nombre}</option>
            ))}
          </select>
          <select
            className={styles.filterInput}
            value={filterDependencia}
            onChange={(e) => setFilterDependencia(e.target.value)}
          >
            <option value="">TODAS LAS DEPENDENCIAS</option>
            {dependencies.map(dep => (
              <option key={dep} value={dep}>{dep}</option>
            ))}
          </select>
          <select
            className={styles.filterInput}
            value={filterNecesidad}
            onChange={(e) => setFilterNecesidad(e.target.value)}
          >
            <option value="">TODAS LAS PRIORIDADES</option>
            <option value="urgencia">URGENCIA</option>
            <option value="programada">PROGRAMADA</option>
          </select>
      </div>      

      {stats && (
        <>
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
                <h3>{estado.charAt(0).toUpperCase() + estado.slice(1)}</h3>
                <p>{count}</p>
              </div>
            ))}
          </div>

          <div className={styles.chartsContainer}>
            <div className={styles.chartCard}>
              <h3>SOLICITUDES POR ESTADO</h3>
              <div className={styles.chartWrapper}>
                {Object.keys(stats.solicitudesPorEstado).length > 0 ? (
                  <Bar 
                    ref={statusChartRef} 
                    options={{ ...chartOptions, indexAxis: 'y' }} 
                    data={statusChartData} />
                ) : (
                  <p>NO HAY DATOS PARA ESTE GRÁFICO.</p>
                )}
              </div>
              <div className={styles.chartFooter}>
                <button onClick={() => handleCopyChart(statusChartRef)} className={styles.copyButton}>COPIAR</button>
              </div>
            </div>
            <div className={styles.chartCard}>
              <h3>SOLICITUDES POR NECESIDAD</h3>
              <div className={styles.chartWrapper}>
                {Object.keys(stats.solicitudesPorNecesidad).length > 0 ? (
                  <Pie 
                    ref={necessityChartRef} 
                    options={{ ...chartOptions, scales: {} }} 
                    data={necessityChartData} />
                ) : (
                  <p>NO HAY DATOS PARA ESTE GRÁFICO.</p>
                )}
              </div>
              <div className={styles.chartFooter}>
                <button onClick={() => handleCopyChart(necessityChartRef)} className={styles.copyButton}>COPIAR</button>
              </div>
            </div>
            <div className={styles.chartCard}>
              <h3>SOLICITUDES POR DEPENDENCIA</h3>
              <div className={styles.chartWrapper}>
                {Object.keys(stats.solicitudesPorDependencia).length > 0 ? (
                  <Bar 
                    ref={dependenciaChartRef} 
                    options={chartOptions} 
                    data={dependenciaChartData} />
                ) : (
                  <p>NO HAY DATOS PARA ESTE GRÁFICO.</p>
                )}
              </div>
              <div className={styles.chartFooter}>
                <button onClick={() => handleCopyChart(dependenciaChartRef)} className={styles.copyButton}>COPIAR</button>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
}