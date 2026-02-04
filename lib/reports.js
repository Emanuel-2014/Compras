// lib/reports.js

export function analyzeMonthlyRequests(rows) {
  // 1. Logic for Top Items by Department
  const topItemsByDepartment = rows.reduce((acc, item) => {
    const { dependencia, descripcion, cantidad } = item;
    if (!dependencia) return acc; // Skip if department is not defined

    if (!acc[dependencia]) {
      acc[dependencia] = {};
    }
    if (!acc[dependencia][descripcion]) {
      acc[dependencia][descripcion] = 0;
    }
    acc[dependencia][descripcion] += cantidad;
    return acc;
  }, {});

  // Sort and get top 5 for each department
  for (const dep in topItemsByDepartment) {
    topItemsByDepartment[dep] = Object.entries(topItemsByDepartment[dep])
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, total]) => ({ name, total }));
  }

  // 2. Logic for Narrative Summary
  const recurringItems = rows.reduce((acc, item) => {
    const { dependencia, descripcion, fecha_solicitud, cantidad, solicitante, especificaciones, observaciones, notas_adicionales } = item;
    if (!dependencia || !descripcion) return acc;
    
    const key = `${dependencia}-${descripcion}`;
    if (!acc[key]) {
      acc[key] = {
        dependencia,
        descripcion,
        requests: [],
      };
    }
    acc[key].requests.push({
      fecha_solicitud,
      cantidad,
      solicitante,
      especificaciones,
      observaciones,
      notas_adicionales
    });
    return acc;
  }, {});

  const narrativeSummary = Object.values(recurringItems)
    .filter(group => group.requests.length > 1)
    .map(group => {
      const { dependencia, descripcion, requests } = group;
      let summary = `El departamento de <strong>${dependencia}</strong> ha solicitado <strong>"${descripcion}"</strong> en ${requests.length} ocasiones:`;
      
      const requestDetails = requests.map(req => {
        let details = `<li>${req.cantidad} unidades el ${new Date(req.fecha_solicitud).toLocaleDateString('es-CO')} (solicitado por ${req.solicitante}).</li>`;
        let notes = [];
        if (req.especificaciones) notes.push(`Especificaciones: "${req.especificaciones}"`);
        if (req.observaciones) notes.push(`Observaciones: "${req.observaciones}"`);
        if (req.notas_adicionales) notes.push(`Notas generales: "${req.notas_adicionales}"`);
        
        if(notes.length > 0) {
          details += `<ul><li>${notes.join('. ')}</li></ul>`;
        }
        return details;
      }).join('');

      return `${summary}<ul>${requestDetails}</ul>`;
    });

  return {
    narrativeSummary,
    topItemsByDepartment,
  };
}

export async function getDepartments(db) {
  const departmentsQuery = "SELECT DISTINCT dependencia FROM usuarios WHERE dependencia IS NOT NULL AND dependencia != '' ORDER BY dependencia";
  const departmentsResult = db.prepare(departmentsQuery).all();
  return departmentsResult.map(d => d.dependencia);
}
