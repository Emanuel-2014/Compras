"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Row, Col, Card, Spinner, Alert, Button } from 'react-bootstrap';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  TimeScale // Para el gráfico de línea por día
} from 'chart.js';
import 'chartjs-adapter-date-fns'; // Importar el adaptador de fecha

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  TimeScale
);

export default function AprobadorDashboardPage() {
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedChart, setExpandedChart] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/aprobador-dashboard');
      if (!res.ok) {
        const errorText = await res.text();
        let errorMessage = `Error del servidor (${res.status} ${res.statusText})`;
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (e) {
          console.error("Respuesta de error no JSON recibida:", errorText);
        }
        throw new Error(errorMessage);
      }
      const data = await res.json();
      setDashboardData(data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Error de conexión al obtener los datos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <Container className="text-center my-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Cargando...</span>
        </Spinner>
        <p className="mt-3">Cargando datos del dashboard...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="my-5">
        <Alert variant="danger">
          <Alert.Heading>Error al cargar el Dashboard</Alert.Heading>
          <p>{error}</p>
          <hr />
          <p className="mb-0">
            Asegúrate de que tienes los permisos correctos y que tu dependencia está asignada.
          </p>
          <Button onClick={fetchData} variant="outline-danger" className="mt-3">
            Intentar de nuevo
          </Button>
        </Alert>
      </Container>
    );
  }

  if (!dashboardData) {
    return (
      <Container className="my-5">
        <Alert variant="info">
          <Alert.Heading>No hay datos disponibles</Alert.Heading>
          <p>
            No se pudieron cargar los datos del dashboard. Esto podría deberse a que no hay solicitudes en tu dependencia
            o un problema de configuración.
          </p>
          <Button onClick={fetchData} variant="outline-info" className="mt-3">
            Recargar
          </Button>
        </Alert>
      </Container>
    );
  }

  // Preparar datos para los gráficos

  // Solicitudes por Estado
  const dataSolicitudesPorEstado = {
    labels: dashboardData.solicitudesPorEstado.map(item => item.estado),
    datasets: [{
      label: 'Número de Solicitudes',
      data: dashboardData.solicitudesPorEstado.map(item => item.count),
      backgroundColor: [
        'rgba(255, 99, 132, 0.6)', // Rechazada
        'rgba(54, 162, 235, 0.6)', // Pendiente
        'rgba(255, 206, 86, 0.6)', // En Proceso
        'rgba(75, 192, 192, 0.6)', // Aprobada
        'rgba(153, 102, 255, 0.6)',// Finalizada
      ],
      borderColor: [
        'rgba(255, 99, 132, 1)',
        'rgba(54, 162, 235, 1)',
        'rgba(255, 206, 86, 1)',
        'rgba(75, 192, 192, 1)',
        'rgba(153, 102, 255, 1)',
      ],
      borderWidth: 1,
    }],
  };
  const optionsSolicitudesPorEstado = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'SOLICITUDES POR ESTADO' },
    },
  };

  // Solicitudes por Necesidad
  const dataSolicitudesPorNecesidad = {
    labels: dashboardData.solicitudesPorNecesidad.map(item => item.necesidad || 'No Especificada'),
    datasets: [{
      label: 'Número de Solicitudes',
      data: dashboardData.solicitudesPorNecesidad.map(item => item.count),
      backgroundColor: [
        'rgba(255, 159, 64, 0.6)', // Urgencia
        'rgba(255, 99, 132, 0.6)', // Normal
        'rgba(54, 162, 235, 0.6)', // Baja
      ],
      borderColor: [
        'rgba(255, 159, 64, 1)',
        'rgba(255, 99, 132, 1)',
        'rgba(54, 162, 235, 1)',
      ],
      borderWidth: 1,
    }],
  };
  const optionsSolicitudesPorNecesidad = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'SOLICITUDES POR TIPO DE NECESIDAD' },
    },
  };

  // Solicitudes por Solicitante
  const dataSolicitudesPorSolicitante = {
    labels: dashboardData.solicitudesPorSolicitante.map(item => item.solicitante),
    datasets: [{
      label: 'Número de Solicitudes',
      data: dashboardData.solicitudesPorSolicitante.map(item => item.count),
      backgroundColor: 'rgba(75, 192, 192, 0.6)',
      borderColor: 'rgba(75, 192, 192, 1)',
      borderWidth: 1,
    }],
  };
  const optionsSolicitudesPorSolicitante = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y', // Hace que el gráfico de barras sea horizontal
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'TOP SOLICITANTES EN MI DEPENDENCIA' },
    },
  };

  // Solicitudes por Día
  const dataSolicitudesPorDia = {
    labels: dashboardData.solicitudesPorDia.map(item => item.fecha),
    datasets: [{
      label: 'Solicitudes Creadas',
      data: dashboardData.solicitudesPorDia.map(item => item.count),
      fill: false,
      borderColor: 'rgb(255, 99, 132)',
      tension: 0.1
    }],
  };
  const optionsSolicitudesPorDia = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'SOLICITUDES POR DÍA (ÚLTIMOS 30 DÍAS)',
      },
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'day',
          tooltipFormat: 'MMM d, yyyy',
        },
        title: {
          display: true,
          text: 'Fecha',
        },
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Número de Solicitudes',
        },
      },
    },
  };

  return (
    <Container fluid className="my-4">
      <Row className="mb-4">
        <Col>
          <h1 className="text-center">DASHBOARD DE APROBADOR</h1>
        </Col>
      </Row>

      <Row>
        <Col lg={6} className="mb-4">
          <Card
            className="shadow-sm"
            style={{
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              ...(expandedChart === 'estado' && {
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '90vw',
                maxWidth: '1200px',
                height: '80vh',
                zIndex: 1000,
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
              })
            }}
            onMouseEnter={(e) => { if (expandedChart !== 'estado') e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { if (expandedChart !== 'estado') e.currentTarget.style.transform = 'translateY(0)'; }}
            onClick={(e) => {
              // Solo expandir si el click no fue en el canvas de la gráfica
              if (e.target.tagName !== 'CANVAS') {
                setExpandedChart(expandedChart === 'estado' ? null : 'estado');
              }
            }}
          >
            <Card.Body style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              {expandedChart === 'estado' && (
                <Button
                  variant="danger"
                  size="sm"
                  style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 1001 }}
                  onClick={(e) => { e.stopPropagation(); setExpandedChart(null); }}
                >
                  CERRAR
                </Button>
              )}
              <div style={{ height: expandedChart === 'estado' ? '100%' : '200px' }}>
                <Bar data={dataSolicitudesPorEstado} options={optionsSolicitudesPorEstado} />
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={6} className="mb-4">
          <Card
            className="shadow-sm"
            style={{
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              ...(expandedChart === 'necesidad' && {
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '90vw',
                maxWidth: '1200px',
                height: '80vh',
                zIndex: 1000,
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
              })
            }}
            onMouseEnter={(e) => { if (expandedChart !== 'necesidad') e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { if (expandedChart !== 'necesidad') e.currentTarget.style.transform = 'translateY(0)'; }}
            onClick={(e) => {
              // Solo expandir si el click no fue en el canvas de la gráfica
              if (e.target.tagName !== 'CANVAS') {
                setExpandedChart(expandedChart === 'necesidad' ? null : 'necesidad');
              }
            }}
          >
            <Card.Body style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              {expandedChart === 'necesidad' && (
                <Button
                  variant="danger"
                  size="sm"
                  style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 1001 }}
                  onClick={(e) => { e.stopPropagation(); setExpandedChart(null); }}
                >
                  CERRAR
                </Button>
              )}
              <div style={{ height: expandedChart === 'necesidad' ? '100%' : '200px' }}>
                <Doughnut data={dataSolicitudesPorNecesidad} options={optionsSolicitudesPorNecesidad} />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      {expandedChart && <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: 999 }} onClick={() => setExpandedChart(null)}></div>}

      <Row>
        <Col lg={6} className="mb-4">
          <Card
            className="shadow-sm"
            style={{
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              ...(expandedChart === 'solicitante' && {
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '90vw',
                maxWidth: '1200px',
                height: '80vh',
                zIndex: 1000,
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
              })
            }}
            onMouseEnter={(e) => { if (expandedChart !== 'solicitante') e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { if (expandedChart !== 'solicitante') e.currentTarget.style.transform = 'translateY(0)'; }}
            onClick={(e) => {
              // Solo expandir si el click no fue en el canvas de la gráfica
              if (e.target.tagName !== 'CANVAS') {
                setExpandedChart(expandedChart === 'solicitante' ? null : 'solicitante');
              }
            }}
          >
            <Card.Body style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              {expandedChart === 'solicitante' && (
                <Button
                  variant="danger"
                  size="sm"
                  style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 1001 }}
                  onClick={(e) => { e.stopPropagation(); setExpandedChart(null); }}
                >
                  CERRAR
                </Button>
              )}
              <div style={{ height: expandedChart === 'solicitante' ? '100%' : '200px' }}>
                <Bar data={dataSolicitudesPorSolicitante} options={optionsSolicitudesPorSolicitante} />
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={6} className="mb-4">
          <Card
            className="shadow-sm"
            style={{
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              ...(expandedChart === 'dia' && {
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '90vw',
                maxWidth: '1200px',
                height: '80vh',
                zIndex: 1000,
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
              })
            }}
            onMouseEnter={(e) => { if (expandedChart !== 'dia') e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { if (expandedChart !== 'dia') e.currentTarget.style.transform = 'translateY(0)'; }}
            onClick={(e) => {
              // Solo expandir si el click no fue en el canvas de la gráfica
              if (e.target.tagName !== 'CANVAS') {
                setExpandedChart(expandedChart === 'dia' ? null : 'dia');
              }
            }}
          >
            <Card.Body style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              {expandedChart === 'dia' && (
                <Button
                  variant="danger"
                  size="sm"
                  style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 1001 }}
                  onClick={(e) => { e.stopPropagation(); setExpandedChart(null); }}
                >
                  CERRAR
                </Button>
              )}
              <div style={{ height: expandedChart === 'dia' ? '100%' : '200px' }}>
                <Line data={dataSolicitudesPorDia} options={optionsSolicitudesPorDia} />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

            {dashboardData.ultimasSolicitudes && dashboardData.ultimasSolicitudes.length > 0 && (
              <Row>
                <Col lg={12} className="mb-4">
                  <Card className="h-100 shadow-sm">
                    <Card.Header as="h5">Últimas Solicitudes en mis Dependencias</Card.Header>
                    <Card.Body>
                      <div className="table-responsive">
                        <table className="table table-hover table-sm">
                          <thead>
                            <tr>
                              <th>ID Solicitud</th>
                              <th>Fecha</th>
                              <th>Solicitante</th>
                              <th>Dependencia</th>
                              <th>Estado</th>
                              <th className="text-end">Total</th>
                              <th className="text-center">Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dashboardData.ultimasSolicitudes.map(solicitud => (
                              <tr key={solicitud.id}>
                                <td>{solicitud.solicitud_id}</td>
                                <td>{new Date(solicitud.fecha_solicitud).toLocaleDateString()}</td>
                                <td>{solicitud.solicitante}</td>
                                <td>{solicitud.dependencia}</td>
                                <td>
                                  <span className={`badge bg-${solicitud.estado === 'Aprobada' ? 'success' : solicitud.estado === 'Rechazada' ? 'danger' : 'warning'}`}>
                                    {solicitud.estado}
                                  </span>
                                </td>
                                <td className="text-end">
                                  {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(solicitud.total)}
                                </td>
                                <td className="text-center">
                                  <Button
                                    variant="outline-primary"
                                    size="sm"
                                    onClick={() => router.push(`/solicitud/${solicitud.solicitud_id}`)}
                                  >
                                    Ver
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            )}
          </Container>
        );
      }
