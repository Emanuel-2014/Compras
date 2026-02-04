// app/api/reports/generate-monthly-report-pdf/route.js
import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth';
import db from '../../../../lib/db';
import { analyzeMonthlyRequests } from '../../../../lib/reports';
import puppeteer from 'puppeteer';

export async function GET(req) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const departmentFilter = searchParams.get('department');
    const startDateFilter = searchParams.get('startDate');
    const endDateFilter = searchParams.get('endDate');

    let query = `
      SELECT
        si.descripcion,
        si.cantidad,
        si.especificaciones,
        si.observaciones,
        s.fecha_solicitud,
        s.notas_adicionales,
        u.nombre as solicitante,
        u.dependencia,
        s.coordinador_id
      FROM solicitud_items si
      JOIN solicitudes s ON si.id_solicitud = s.id
      JOIN usuarios u ON s.id_usuario = u.id
    `;
    const queryParams = [];
    const whereClauses = [];

    // Apply role-based filtering
    // Administradores y coordinadores ven solicitudes donde son coordinador_id
    if (user.rol?.toLowerCase() === 'administrador' || user.rol?.toLowerCase() === 'coordinador') {
      whereClauses.push(`s.coordinador_id = ?`);
      queryParams.push(user.id);
    }

    if (departmentFilter && departmentFilter !== 'all') {
      whereClauses.push(`u.dependencia = ?`);
      queryParams.push(departmentFilter);
    }

    if (startDateFilter) {
      whereClauses.push(`s.fecha_solicitud >= ?`);
      queryParams.push(startDateFilter);
    }

    if (endDateFilter) {
      whereClauses.push(`s.fecha_solicitud <= ?`);
      queryParams.push(endDateFilter);
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ` + whereClauses.join(' AND ');
    }

    query += ` ORDER BY u.dependencia, si.descripcion, s.fecha_solicitud`;

    const rows = db.prepare(query).all(queryParams);

    const { narrativeSummary, topItemsByDepartment } = analyzeMonthlyRequests(rows);

    const browser = await puppeteer.launch({
      headless: 'new', // Use the new Headless mode
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const chartImages = {};

    for (const dep in topItemsByDepartment) {
      const items = topItemsByDepartment[dep];
      if (items && items.length > 0) {
        const labels = items.map(item => item.name);
        const dataValues = items.map(item => item.total);

        const chartHtml = `
          <!DOCTYPE html>
          <html>
          <head>
              <title>Chart</title>
              <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
              <style>
                body { margin: 0; }
                canvas { display: block; }
              </style>
          </head>
          <body>
              <canvas id="myChart" width="800" height="400"></canvas>
              <script>
                  const ctx = document.getElementById('myChart').getContext('2d');
                  new Chart(ctx, {
                      type: 'bar',
                      data: {
                          labels: ${JSON.stringify(labels)},
                          datasets: [{
                              label: 'Cantidad Total Solicitada',
                              data: ${JSON.stringify(dataValues)},
                              backgroundColor: 'rgba(75, 192, 192, 0.6)',
                              borderColor: 'rgba(75, 192, 192, 1)',
                              borderWidth: 1
                          }]
                      },
                      options: {
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                              legend: {
                                  position: 'top',
                              },
                              title: {
                                  display: true,
                                  text: 'Artículos Más Solicitados en ${dep}',
                              }
                          },
                          scales: {
                              y: {
                                  beginAtZero: true,
                                  title: {
                                      display: true,
                                      text: 'Cantidad',
                                  },
                              },
                              x: {
                                  title: {
                                      display: true,
                                      text: 'Artículo',
                                  },
                              },
                          }
                      }
                  });
              </script>
          </body>
          </html>
        `;

        const pageForChart = await browser.newPage(); // Create a new page for each chart
        await pageForChart.setContent(chartHtml, { waitUntil: 'networkidle0', timeout: 60000 }); // Increased timeout
        const chartCanvas = await pageForChart.$('#myChart');
        if (chartCanvas) {
          const imageBuffer = await chartCanvas.screenshot({ encoding: 'base64' });
          chartImages[dep] = `data:image/png;base64,${imageBuffer}`;
        }
        await pageForChart.close(); // Close the page after generating the chart image
      }
    }

    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
          <title>Reporte de Patrones de Compra</title>
          <style>
              body { font-family: 'Arial', sans-serif; margin: 20px; font-size: 10px; }
              h1, h2, h3, h4, h5, h6 { color: #333; }
              .header { text-align: center; margin-bottom: 30px; }
              .header img { max-width: 150px; margin-bottom: 10px; }
              .report-title { color: #0056b3; }
              .section { margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px; }
              ul { padding-left: 20px; }
              li { margin-bottom: 5px; }
              strong { font-weight: bold; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
              .chart-container { width: 100%; margin-top: 15px; margin-bottom: 20px; text-align: center; }
              .chart-container img { max-width: 100%; height: auto; border: 1px solid #ccc; }
          </style>
      </head>
      <body>
          <div class="header">
              <img src="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/logo.png" alt="Logo de la Empresa">
              <h1 class="report-title">Reporte de Patrones de Compra</h1>
              <p>Fecha de Generación: ${new Date().toLocaleDateString('es-CO')}</p>
              <p>Filtros aplicados:
                  ${departmentFilter && departmentFilter !== 'all' ? `Dependencia: <strong>${departmentFilter}</strong>` : 'Todas las Dependencias'}
                  ${startDateFilter ? ` desde <strong>${new Date(startDateFilter).toLocaleDateString('es-CO')}</strong>` : ''}
                  ${endDateFilter ? ` hasta <strong>${new Date(endDateFilter).toLocaleDateString('es-CO')}</strong>` : ''}
              </p>
          </div>

          <div class="section">
              <h2>Resumen de Solicitudes Recurrentes</h2>
              <p>Esta sección analiza cuándo un mismo artículo es solicitado varias veces, ayudando a identificar posibles optimizaciones en la planificación de compras.</p>
              ${narrativeSummary.length > 0 ? narrativeSummary.map(summary => `<div class="card" style="border: 1px solid #ddd; padding: 10px; margin-bottom: 10px;">${summary}</div>`).join('') : '<p>No se encontraron patrones de solicitudes recurrentes para la selección actual.</p>'}
          </div>

          <div class="section">
              <h2>Artículos Más Solicitados por Dependencia (Top 5)</h2>
              <p>Ranking de los 5 artículos más pedidos en cantidad total por cada área.</p>
              ${Object.keys(topItemsByDepartment).length > 0 ? Object.entries(topItemsByDepartment).map(([dep, items]) => `
                <div class="card" style="border: 1px solid #ddd; padding: 10px; margin-bottom: 15px;">
                  <h4 style="margin-top: 0;">${dep}</h4>
                  ${chartImages[dep] ? `<div class="chart-container"><img src="${chartImages[dep]}" /></div>` : '<p>No se pudo generar el gráfico para este departamento.</p>'}
                  <table>
                    <thead>
                      <tr>
                        <th>Artículo</th>
                        <th>Cantidad Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${items.map(item => `
                        <tr>
                          <td>${item.name}</td>
                          <td>${item.total.toLocaleString('es-CO')}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              `).join('') : '<p>No hay datos de artículos para mostrar para la selección actual.</p>'}
          </div>
      </body>
      </html>
    `;

    const page = await browser.newPage(); // Use a new page for the main PDF content
    await page.setContent(htmlContent, { waitUntil: 'networkidle0', timeout: 60000 }); // Increased timeout
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });

    await browser.close();

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="reporte_patrones_compra.pdf"',
      },
    });

  } catch (error) {
    console.error('Error generating PDF report:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor al generar el PDF' },
      { status: 500 }
    );
  }
}
