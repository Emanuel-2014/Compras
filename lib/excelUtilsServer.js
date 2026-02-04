// lib/excelUtilsServer.js
// SERVER-SIDE ONLY - These functions access the database and file system
import db from './db.js';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Gets company settings from database (SERVER-SIDE)
 * @returns {Object} Company settings
 */
export function getCompanySettings() {
  try {
    const stmt = db.prepare('SELECT key, value FROM app_settings WHERE key IN (?, ?, ?, ?)');
    const settings = stmt.all('company_name', 'company_address', 'company_phone', 'company_email');
    const config = {
      company_name: 'Nombre de la Empresa',
      company_address: 'Dirección',
      company_phone: 'Teléfono',
      company_email: 'Email'
    };
    settings.forEach(setting => {
      config[setting.key] = setting.value;
    });
    return config;
  } catch (error) {
    console.error('Error fetching company settings:', error);
    return {
      company_name: 'Nombre de la Empresa',
      company_address: 'Dirección',
      company_phone: 'Teléfono',
      company_email: 'Email'
    };
  }
}

export async function addCompanyHeader(worksheet) {
  const headerRows = 6; // Reserve 6 rows for the header area

  try {
    // 1. Fetch company settings from the database
    const stmt = db.prepare('SELECT key, value FROM app_settings');
    const settings = stmt.all();
    const config = {};
    settings.forEach(setting => {
      config[setting.key] = setting.value;
    });

    const companyName = config.company_name || 'Nombre de la Empresa no Configurado';
    const companyAddress = config.company_address || 'Dirección no Configurada';
    const companyPhone = config.company_phone || 'Teléfono no Configurado';
    const companyEmail = config.company_email || 'Email no Configurado';
    const logoUrlPath = config.company_logo_path || '/logo.png';

    // 2. Add Logo
    // Remove leading slash if present to avoid path.join issues
    const cleanLogoPath = logoUrlPath.startsWith('/') ? logoUrlPath.substring(1) : logoUrlPath;
    const logoPath = path.join(process.cwd(), 'public', cleanLogoPath);
    let imageId;
    try {
      console.log('Intentando leer logo desde:', logoPath);
      const logoBuffer = await fs.readFile(logoPath);
      console.log('Logo leído exitosamente, tamaño:', logoBuffer.length, 'bytes');
      const extension = path.extname(logoUrlPath).substring(1);
      console.log('Extensión del logo:', extension);
      imageId = worksheet.workbook.addImage({
        buffer: logoBuffer,
        extension: extension === 'jpg' ? 'jpeg' : extension,
      });
      console.log('Logo agregado al workbook con ID:', imageId);
    } catch (error) {
      console.warn(`Could not read logo file at ${logoPath}. Skipping logo. Error: ${error.message}`);
    }

    if (imageId !== undefined) {
      console.log('Insertando imagen en el worksheet...');
      // Place the image, spanning roughly from A1 to B5
      worksheet.addImage(imageId, {
        tl: { col: 0, row: 0 },
        br: { col: 2, row: headerRows - 1 },
        editAs: 'oneCell'
      });
      console.log('Imagen insertada exitosamente');
    } else {
      console.warn('No se pudo agregar el logo al Excel');
    }

    // 3. Add Company Information
    const titleCell = worksheet.getCell('C1');
    titleCell.value = companyName;
    titleCell.font = {
      name: 'Calibri',
      size: 16,
      bold: true,
    };
    titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
    worksheet.mergeCells('C1:G1');

    worksheet.getCell('C2').value = companyAddress;
    worksheet.mergeCells('C2:G2');

    worksheet.getCell('C3').value = `Tel: ${companyPhone}`;
    worksheet.mergeCells('C3:G3');

    worksheet.getCell('C4').value = `Email: ${companyEmail}`;
    worksheet.mergeCells('C4:G4');

    // Add generation date
    const dateCell = worksheet.getCell('C5');
    dateCell.value = `Reporte generado el: ${new Date().toLocaleString('es-CO')}`;
    dateCell.font = { name: 'Calibri', size: 9, italic: true };
    worksheet.mergeCells('C5:G5');

    // 4. Style and add a bottom border
    worksheet.getRow(headerRows).border = {
      bottom: { style: 'medium', color: { argb: 'FF000000' } }
    };

    return headerRows;
  } catch (error) {
    console.error('Error creating company header for Excel file:', error);
    // If header fails, we don't want to break the whole report
    // So we return 0 and the report will just start at the top.
    return 0;
  }
}
