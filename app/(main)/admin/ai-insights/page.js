'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Container, Card, Spinner, Alert, Row, Col, ListGroup, Badge, Button } from 'react-bootstrap';
import { useSession } from '@/hooks/useSession';
import { useRouter } from 'next/navigation';
import { FaDownload, FaFileExcel } from 'react-icons/fa';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import styles from './AiInsights.module.css';

const formatCurrency = (value) => {
  if (typeof value !== 'number') return '$ 0';
  return value.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

const KraljicMatrix = ({ data }) => {
  const { categories, averageImpact, averageRisk } = useMemo(() => {
    if (!data || data.length === 0) {
      return { categories: { strategic: [], leverage: [], bottleneck: [], nonCritical: [] }, averageImpact: 0, averageRisk: 0 };
    }

    const totalImpact = data.reduce((sum, item) => sum + item.financial_impact, 0);
    const totalRisk = data.reduce((sum, item) => sum + item.supply_risk, 0);
    const avgImpact = totalImpact / data.length;
    const avgRisk = totalRisk / data.length;
    const categories = {
      strategic: [],
      leverage: [],
      bottleneck: [],
      nonCritical: [],
    };

    data.forEach(item => {
      if (item.financial_impact >= avgImpact && item.supply_risk >= avgRisk) {
        categories.strategic.push(item);
      } else if (item.financial_impact >= avgImpact && item.supply_risk < avgRisk) {
        categories.leverage.push(item);
      } else if (item.financial_impact < avgImpact && item.supply_risk >= avgRisk) {
        categories.bottleneck.push(item);
      } else {
        categories.nonCritical.push(item);
      }
    });
    return { categories, averageImpact: avgImpact, averageRisk: avgRisk };
  }, [data]);

  const QuadrantCard = ({ title, items, variant, description }) => (
    <Card className={`h-100 shadow-sm border-${variant}`}>
      <Card.Header as="h5" className={`bg-${variant} text-white`}>{title}</Card.Header>
      <Card.Body>
        <Card.Text className="text-muted fst-italic">{description}</Card.Text>
        <ListGroup variant="flush">
          {items.length > 0 ? items.map(item => (
            <ListGroup.Item key={item.descripcion}>{item.descripcion}</ListGroup.Item>
          )) : <ListGroup.Item>No hay ítems en esta categoría.</ListGroup.Item>}
        </ListGroup>
      </Card.Body>
    </Card>
  );

  if (!data || data.length === 0) {
    return <Alert variant="info">No hay suficientes datos de productos del último año para generar la Matriz de Kraljic.</Alert>;
  }

  return (
    <div className="mt-5">
      <h3 className="mb-3">Matriz de Kraljic (Análisis de Portafolio de Compras)</h3>
      <p>Clasificación de productos según su impacto financiero y el riesgo en su suministro.</p>
      <Row className="g-4">
        <Col md={6}>
          <QuadrantCard
            title="Apalancados (Leverage)"
            description="Alto impacto financiero, bajo riesgo. Competencia alta entre proveedores."
            items={categories.leverage}
            variant="success"
          />
        </Col>
        <Col md={6}>
          <QuadrantCard
            title="Estratégicos (Strategic)"
            description="Alto impacto financiero, alto riesgo. Críticos para el negocio."
            items={categories.strategic}
            variant="danger"
          />
        </Col>
        <Col md={6}>
          <QuadrantCard
            title="No Críticos (Non-Critical)"
            description="Bajo impacto financiero, bajo riesgo. Items rutinarios y de fácil adquisición."
            items={categories.nonCritical}
            variant="secondary"
          />
        </Col>
        <Col md={6}>
          <QuadrantCard
            title="Cuello de Botella (Bottleneck)"
            description="Bajo impacto financiero, alto riesgo. Pocos proveedores, posible interrupción."
            items={categories.bottleneck}
            variant="warning"
          />
        </Col>
      </Row>
    </div>
  );
};

export default function AiInsightsPage() {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [companyName, setCompanyName] = useState('MI EMPRESA');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { session, loading: sessionLoading } = useSession();
  const router = useRouter();
  const printRef = useRef();

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      // Agregar timestamp para evitar caché
      const timestamp = new Date().getTime();

      // Obtener configuración de la empresa
      const settingsResponse = await fetch(`/api/settings?_t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (settingsResponse.ok) {
        const settings = await settingsResponse.json();
        setCompanyName(settings.company_name || 'MI EMPRESA');
      }

      // Obtener insights
      const response = await fetch(`/api/admin/ai-insights?_t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al cargar los insights.');
      }
      const data = await response.json();
      setInsights(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionLoading) return;

    // Si la sesión no existe, redirigir al login
    if (!session || !session.user) {
      router.replace('/login');
      return;
    }

    if (session.user.rol?.toLowerCase() !== 'administrador') {
      setError('Acceso denegado. Solo los administradores pueden ver esta página.');
      setLoading(false);
      return;
    }

    fetchData();
  }, [session, sessionLoading, refreshTrigger, router]);

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleFixData = async () => {
    if (!confirm('¿Estás seguro de que quieres corregir los datos de facturas? Esto actualizará facturas con total = $0 y corregirá fechas malformadas.')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/admin/fix-insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'fix_insights_data' })
      });

      const data = await response.json();

      if (response.ok) {
        alert(`✅ Corrección completada:\n\n${data.results.join('\n')}`);
        // Refrescar los datos
        setRefreshTrigger(prev => prev + 1);
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      alert(`❌ Error al corregir datos: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading || sessionLoading) {
    return <Container className="mt-5 text-center"><Spinner animation="border" /><p>Cargando insights...</p></Container>;
  }

  if (error) {
    return <Container className="mt-5"><Alert variant="danger">{error}</Alert></Container>;
  }

  if (!insights) {
    return <Container className="mt-5"><Alert variant="info">No se pudieron cargar los insights.</Alert></Container>;
  }

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);
      let yPos = margin;

      const checkAddPage = (neededHeight) => {
        if (yPos + neededHeight > pageHeight - margin) {
          pdf.addPage();
          yPos = margin;
          return true;
        }
        return false;
      };

      // Encabezado
      pdf.setFillColor(220, 53, 69); // Color rojo de la empresa
      pdf.rect(0, 0, pageWidth, 25, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(22);
      pdf.setFont('helvetica', 'bold');
      pdf.text(companyName, pageWidth / 2, 12, { align: 'center' });
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Informe de Insights de Compras - ${new Date().toLocaleDateString('es-CO')}`, pageWidth / 2, 19, { align: 'center' });

      yPos = 35;
      pdf.setTextColor(0, 0, 0);

      // Título principal
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Insights de Facturas de Compra', pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;

      // Sección de totales
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Resumen de Gastos', margin, yPos);
      yPos += 8;

      const totales = [
        { label: 'Total Gastado (Últimos 7 días)', value: formatCurrency(insights.totalLast7Days || 0), color: [0, 123, 255] },
        { label: 'Total Gastado (Últimos 30 días)', value: formatCurrency(insights.totalLast30Days || 0), color: [40, 167, 69] },
        { label: 'Total Gastado (Último Año)', value: formatCurrency(insights.totalLastYear || 0), color: [23, 162, 184] }
      ];

      totales.forEach((item, idx) => {
        checkAddPage(15);
        pdf.setFillColor(248, 249, 250);
        pdf.roundedRect(margin, yPos, contentWidth, 12, 2, 2, 'F');
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(11);
        pdf.setTextColor(0, 0, 0);
        pdf.text(item.label, margin + 3, yPos + 8);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(item.color[0], item.color[1], item.color[2]);
        pdf.text(item.value, pageWidth - margin - 3, yPos + 8, { align: 'right' });
        yPos += 15;
      });

      pdf.setTextColor(0, 0, 0);
      yPos += 5;

      // Top 5 Proveedores
      checkAddPage(20);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Top 5 Proveedores por Gasto (Últimos 30 días)', margin, yPos);
      yPos += 8;

      if (insights.topProvidersLast30Days && insights.topProvidersLast30Days.length > 0) {
        insights.topProvidersLast30Days.forEach((provider, index) => {
          checkAddPage(12);
          pdf.setFillColor(255, 255, 255);
          pdf.roundedRect(margin, yPos, contentWidth, 10, 2, 2, 'FD');
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(10);
          pdf.text(`${index + 1}. ${provider.proveedor_nombre}`, margin + 3, yPos + 6.5);

          // Badge con el total
          const valorText = formatCurrency(provider.total_gastado);
          const textWidth = pdf.getTextWidth(valorText);
          const badgeWidth = textWidth + 8;
          const badgeX = pageWidth - margin - badgeWidth - 3;
          pdf.setFillColor(0, 123, 255);
          pdf.roundedRect(badgeX, yPos + 2, badgeWidth, 6, 1, 1, 'F');
          pdf.setTextColor(255, 255, 255);
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(9);
          pdf.text(valorText, badgeX + badgeWidth / 2, yPos + 6, { align: 'center' });
          pdf.setTextColor(0, 0, 0);
          yPos += 12;
        });
      } else {
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(10);
        pdf.text('No hay datos de proveedores para el período.', margin + 3, yPos + 5);
        yPos += 10;
      }

      yPos += 5;

      // Matriz de Kraljic
      checkAddPage(30);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Matriz de Kraljic (Análisis de Portafolio de Compras)', margin, yPos);
      yPos += 5;
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'italic');
      pdf.text('Clasificación de productos según su impacto financiero y el riesgo en su suministro.', margin, yPos);
      yPos += 10;

      // Calcular categorías
      const kraljicData = insights.kraljicData || [];
      const categories = { strategic: [], leverage: [], bottleneck: [], nonCritical: [] };

      if (kraljicData.length > 0) {
        const totalImpact = kraljicData.reduce((sum, item) => sum + item.financial_impact, 0);
        const totalRisk = kraljicData.reduce((sum, item) => sum + item.supply_risk, 0);
        const avgImpact = totalImpact / kraljicData.length;
        const avgRisk = totalRisk / kraljicData.length;

        kraljicData.forEach(item => {
          if (item.financial_impact >= avgImpact && item.supply_risk >= avgRisk) {
            categories.strategic.push(item);
          } else if (item.financial_impact >= avgImpact && item.supply_risk < avgRisk) {
            categories.leverage.push(item);
          } else if (item.financial_impact < avgImpact && item.supply_risk >= avgRisk) {
            categories.bottleneck.push(item);
          } else {
            categories.nonCritical.push(item);
          }
        });
      }

      // Dibujar cuadrantes de la matriz
      const quadrants = [
        { title: 'Apalancados (Leverage)', items: categories.leverage, color: [40, 167, 69], desc: 'Alto impacto financiero, bajo riesgo. Competencia alta entre proveedores.' },
        { title: 'Estratégicos (Strategic)', items: categories.strategic, color: [220, 53, 69], desc: 'Alto impacto financiero, alto riesgo. Críticos para el negocio.' },
        { title: 'No Críticos (Non-Critical)', items: categories.nonCritical, color: [108, 117, 125], desc: 'Bajo impacto financiero, bajo riesgo. Productos rutinarios.' },
        { title: 'Cuello de Botella (Bottleneck)', items: categories.bottleneck, color: [255, 193, 7], desc: 'Bajo impacto financiero, alto riesgo. Pocos proveedores alternativos.' }
      ];

      quadrants.forEach((quadrant, qIdx) => {
        checkAddPage(25);

        // Encabezado del cuadrante
        pdf.setFillColor(quadrant.color[0], quadrant.color[1], quadrant.color[2]);
        pdf.roundedRect(margin, yPos, contentWidth, 8, 2, 2, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.text(quadrant.title, margin + 3, yPos + 5.5);
        yPos += 10;

        // Descripción
        pdf.setTextColor(100, 100, 100);
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(9);
        const lines = pdf.splitTextToSize(quadrant.desc, contentWidth - 6);
        lines.forEach(line => {
          checkAddPage(5);
          pdf.text(line, margin + 3, yPos);
          yPos += 4;
        });
        yPos += 2;

        // Ítems
        if (quadrant.items.length > 0) {
          quadrant.items.forEach(item => {
            checkAddPage(8);
            pdf.setTextColor(0, 0, 0);
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(10);
            pdf.text(`• ${item.descripcion}`, margin + 5, yPos);
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(8);
            pdf.setTextColor(100, 100, 100);
            pdf.text(`Impacto: ${formatCurrency(item.financial_impact)} | Riesgo: ${item.supply_risk.toFixed(1)}`, margin + 7, yPos + 4);
            yPos += 10;
          });
        } else {
          checkAddPage(6);
          pdf.setTextColor(150, 150, 150);
          pdf.setFont('helvetica', 'italic');
          pdf.setFontSize(9);
          pdf.text('No hay ítems en esta categoría.', margin + 5, yPos);
          yPos += 8;
        }

        yPos += 3;
      });

      // Guardar PDF
      pdf.save(`Informe_Insights_${new Date().toLocaleDateString('es-CO').replace(/\//g, '-')}.pdf`);
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF. Por favor intenta nuevamente.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Container className="mt-5">
      <div className="d-flex justify-content-between align-items-center mb-3 no-print">
        <h2>Insights de Facturas de Compra</h2>
        <div className="d-flex gap-2">
          <Button variant="outline-secondary" onClick={handleRefresh} disabled={loading}>
            {loading ? 'Actualizando...' : 'Actualizar'}
          </Button>
          <Button variant="outline-warning" onClick={handleFixData} disabled={loading}>
            {loading ? 'Procesando...' : '🔧 Corregir Datos'}
          </Button>
          <Button variant="outline-primary" onClick={handleDownloadPDF} disabled={downloading}>
            <FaDownload className="me-2" />
            {downloading ? 'Generando...' : 'Descargar Informe'}
          </Button>
        </div>
      </div>

      <div ref={printRef}>
        {/* Encabezado para impresión */}
        <div className="print-header" style={{ display: 'none' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px', paddingTop: '20px', borderBottom: '3px solid #dc3545', paddingBottom: '10px' }}>
            <h1 style={{ color: '#dc3545', fontSize: '28px', fontWeight: 'bold', margin: '0' }}>{companyName}</h1>
            <p style={{ color: '#6c757d', fontSize: '14px', margin: '5px 0 0 0' }}>Informe de Insights de Compras - {new Date().toLocaleDateString('es-CO')}</p>
          </div>
        </div>
        <Card className="shadow-sm">
          <Card.Header as="h2" className="text-center">Insights de Facturas de Compra</Card.Header>
          <Card.Body>
          <Row className="mb-4">
            <Col md={4}><Card className="text-center"><Card.Body><Card.Title>Total Gastado (Últimos 7 días)</Card.Title><Card.Text className="h4 text-primary">{formatCurrency(insights.totalLast7Days || 0)}</Card.Text></Card.Body></Card></Col>
            <Col md={4}><Card className="text-center"><Card.Body><Card.Title>Total Gastado (Últimos 30 días)</Card.Title><Card.Text className="h4 text-success">{formatCurrency(insights.totalLast30Days || 0)}</Card.Text></Card.Body></Card></Col>
            <Col md={4}><Card className="text-center"><Card.Body><Card.Title>Total Gastado (Último Año)</Card.Title><Card.Text className="h4 text-info">{formatCurrency(insights.totalLastYear || 0)}</Card.Text></Card.Body></Card></Col>
          </Row>

          <h3 className="mb-3">Top 5 Proveedores por Gasto (Últimos 30 días)</h3>
          {insights.topProvidersLast30Days && insights.topProvidersLast30Days.length > 0 ? (
            <ListGroup className="mb-4">
              {insights.topProvidersLast30Days.map((provider, index) => (
                <ListGroup.Item key={index} className="d-flex justify-content-between align-items-center">
                  <span>{provider.proveedor_nombre}</span>
                  <Badge bg="primary" pill>{formatCurrency(provider.total_gastado)}</Badge>
                </ListGroup.Item>
              ))}
            </ListGroup>
          ) : (
            <Alert variant="info">No hay datos de proveedores para el período.</Alert>
          )}

          <hr />

          {/* Render Kraljic Matrix */}
          <KraljicMatrix data={insights.kraljicData} />

        </Card.Body>
      </Card>
      </div>
    </Container>
  );
}