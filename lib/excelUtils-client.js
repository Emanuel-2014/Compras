// lib/excelUtils.js
// CLIENT-SIDE ONLY - Safe to import in browser components

/**
 * Creates a company header array for simple XLSX exports (CLIENT-SIDE)
 * @param {Object} settings - Company settings object
 * @returns {Array} Array of rows for header
 */
export function createCompanyHeaderForXLSX(settings) {
  return [
    [settings.company_name || 'Nombre de la Empresa'],
    [settings.company_address || 'Dirección'],
    [`Tel: ${settings.company_phone || 'Teléfono'}`],
    [`Email: ${settings.company_email || 'Email'}`],
    [],
    [`Reporte generado el: ${new Date().toLocaleString('es-CO')}`],
    []
  ];
}
