import ExcelJS from 'exceljs';
// import Database from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';

const dbPath = path.join(process.cwd(), 'solicitudes.db');

// Exportar usuarios a Excel
export async function exportUsers() {
  const db = new Database(dbPath);
  
  try {
    const users = db.prepare(`
      SELECT 
        id,
        nombre,
        codigo,
        rol,
        dependencia,
        email,
        puede_crear_plantillas,
        is_super_admin,
        created_at,
        updated_at
      FROM usuarios
      ORDER BY id
    `).all();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Usuarios');

    // Definir columnas
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Nombre', key: 'nombre', width: 30 },
      { header: 'Código', key: 'codigo', width: 15 },
      { header: 'Rol', key: 'rol', width: 20 },
      { header: 'Dependencia', key: 'dependencia', width: 30 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Puede Crear Plantillas', key: 'puede_crear_plantillas', width: 10 },
      { header: 'Super Admin', key: 'is_super_admin', width: 10 },
      { header: 'Creado', key: 'created_at', width: 20 },
      { header: 'Actualizado', key: 'updated_at', width: 20 }
    ];

    // Estilo del encabezado
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDC143C' }
    };

    // Agregar datos
    users.forEach(user => {
      worksheet.addRow(user);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    
    db.close();
    return buffer;
  } catch (error) {
    db.close();
    throw error;
  }
}

// Exportar proveedores a Excel
export async function exportProviders() {
  const db = new Database(dbPath);
  
  try {
    const providers = db.prepare(`
      SELECT 
        id,
        rut,
        razon_social,
        nombre_fantasia,
        direccion,
        ciudad,
        telefono,
        email,
        contacto,
        rubro,
        activo,
        created_at,
        updated_at
      FROM proveedores
      ORDER BY id
    `).all();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Proveedores');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'RUT', key: 'rut', width: 15 },
      { header: 'Razón Social', key: 'razon_social', width: 35 },
      { header: 'Nombre Fantasía', key: 'nombre_fantasia', width: 30 },
      { header: 'Dirección', key: 'direccion', width: 40 },
      { header: 'Ciudad', key: 'ciudad', width: 20 },
      { header: 'Teléfono', key: 'telefono', width: 15 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Contacto', key: 'contacto', width: 25 },
      { header: 'Rubro', key: 'rubro', width: 20 },
      { header: 'Activo', key: 'activo', width: 10 },
      { header: 'Creado', key: 'created_at', width: 20 },
      { header: 'Actualizado', key: 'updated_at', width: 20 }
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDC143C' }
    };

    providers.forEach(provider => {
      worksheet.addRow(provider);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    
    db.close();
    return buffer;
  } catch (error) {
    db.close();
    throw error;
  }
}

// Exportar solicitudes a Excel
export async function exportRequests(filters = {}) {
  const db = new Database(dbPath);
  
  try {
    let query = `
      SELECT 
        s.id,
        s.numero_solicitud,
        s.titulo,
        s.fecha_solicitud,
        u.nombre as solicitante,
        d.nombre as dependencia,
        s.estado,
        s.prioridad,
        s.monto_estimado,
        s.observaciones,
        s.created_at,
        s.updated_at
      FROM solicitudes s
      LEFT JOIN usuarios u ON s.solicitante_id = u.id
      LEFT JOIN dependencias d ON s.dependencia_id = d.id
      WHERE 1=1
    `;

    const params = [];

    if (filters.estado) {
      query += ` AND s.estado = ?`;
      params.push(filters.estado);
    }

    if (filters.fechaInicio) {
      query += ` AND DATE(s.fecha_solicitud) >= DATE(?)`;
      params.push(filters.fechaInicio);
    }

    if (filters.fechaFin) {
      query += ` AND DATE(s.fecha_solicitud) <= DATE(?)`;
      params.push(filters.fechaFin);
    }

    if (filters.dependenciaId) {
      query += ` AND s.dependencia_id = ?`;
      params.push(filters.dependenciaId);
    }

    query += ` ORDER BY s.id DESC`;

    const requests = db.prepare(query).all(...params);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Solicitudes');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'N° Solicitud', key: 'numero_solicitud', width: 15 },
      { header: 'Título', key: 'titulo', width: 40 },
      { header: 'Fecha', key: 'fecha_solicitud', width: 12 },
      { header: 'Solicitante', key: 'solicitante', width: 30 },
      { header: 'Dependencia', key: 'dependencia', width: 30 },
      { header: 'Estado', key: 'estado', width: 15 },
      { header: 'Prioridad', key: 'prioridad', width: 12 },
      { header: 'Monto', key: 'monto_estimado', width: 15 },
      { header: 'Observaciones', key: 'observaciones', width: 50 },
      { header: 'Creado', key: 'created_at', width: 20 },
      { header: 'Actualizado', key: 'updated_at', width: 20 }
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDC143C' }
    };

    requests.forEach(request => {
      worksheet.addRow(request);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    
    db.close();
    return buffer;
  } catch (error) {
    db.close();
    throw error;
  }
}

// Importar usuarios desde Excel
export async function importUsers(fileBuffer) {
  const db = new Database(dbPath);
  
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer);
    
    const worksheet = workbook.getWorksheet(1);
    const data = [];
    
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header
      
      data.push({
        nombre: row.getCell(2).value,
        codigo: row.getCell(3).value,
        password: row.getCell(4).value,
        rol: row.getCell(5).value,
        dependencia: row.getCell(6).value,
        email: row.getCell(7).value,
        puede_crear_plantillas: row.getCell(8).value,
        is_super_admin: row.getCell(9).value
      });
    });

    const results = {
      success: 0,
      errors: [],
      skipped: 0
    };

    const insertStmt = db.prepare(`
      INSERT INTO usuarios (
        nombre, codigo, password_hash, rol, dependencia, 
        email, puede_crear_plantillas, is_super_admin
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const updateStmt = db.prepare(`
      UPDATE usuarios 
      SET nombre = ?, rol = ?, dependencia = ?, 
          email = ?, puede_crear_plantillas = ?, is_super_admin = ?
      WHERE codigo = ?
    `);

    const checkStmt = db.prepare('SELECT id FROM usuarios WHERE codigo = ?');

    for (const row of data) {
      try {
        // Validar campos requeridos
        if (!row.nombre || !row.codigo) {
          results.errors.push({
            row: row,
            error: 'Nombre y código son requeridos'
          });
          continue;
        }

        // Verificar si el usuario ya existe
        const existing = checkStmt.get(row.codigo);

        if (existing) {
          // Actualizar usuario existente
          updateStmt.run(
            row.nombre,
            row.rol || 'usuario',
            row.dependencia || null,
            row.email || null,
            row.puede_crear_plantillas ? 1 : 0,
            row.is_super_admin ? 1 : 0,
            row.codigo
          );
          results.success++;
        } else {
          // Insertar nuevo usuario
          const defaultPassword = row.password || row.codigo;
          const passwordHash = bcrypt.hashSync(defaultPassword, 10);

          insertStmt.run(
            row.nombre,
            row.codigo,
            passwordHash,
            row.rol || 'usuario',
            row.dependencia || null,
            row.email || null,
            row.puede_crear_plantillas ? 1 : 0,
            row.is_super_admin ? 1 : 0
          );
          results.success++;
        }
      } catch (error) {
        results.errors.push({
          row: row,
          error: error.message
        });
      }
    }

    db.close();
    return results;
  } catch (error) {
    db.close();
    throw error;
  }
}

// Importar proveedores desde Excel
export async function importProviders(fileBuffer) {
  const db = new Database(dbPath);
  
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer);
    
    const worksheet = workbook.getWorksheet(1);
    const data = [];
    
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header
      
      data.push({
        rut: row.getCell(2).value,
        razon_social: row.getCell(3).value,
        nombre_fantasia: row.getCell(4).value,
        direccion: row.getCell(5).value,
        ciudad: row.getCell(6).value,
        telefono: row.getCell(7).value,
        email: row.getCell(8).value,
        contacto: row.getCell(9).value,
        rubro: row.getCell(10).value,
        activo: row.getCell(11).value
      });
    });

    const results = {
      success: 0,
      errors: [],
      skipped: 0
    };

    const insertStmt = db.prepare(`
      INSERT INTO proveedores (
        rut, razon_social, nombre_fantasia, direccion, 
        ciudad, telefono, email, contacto, rubro, activo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const updateStmt = db.prepare(`
      UPDATE proveedores 
      SET razon_social = ?, nombre_fantasia = ?, direccion = ?, 
          ciudad = ?, telefono = ?, email = ?, contacto = ?, 
          rubro = ?, activo = ?
      WHERE rut = ?
    `);

    const checkStmt = db.prepare('SELECT id FROM proveedores WHERE rut = ?');

    for (const row of data) {
      try {
        // Validar campos requeridos
        if (!row.rut || !row.razon_social) {
          results.errors.push({
            row: row,
            error: 'RUT y razón social son requeridos'
          });
          continue;
        }

        // Verificar si el proveedor ya existe
        const existing = checkStmt.get(row.rut);

        if (existing) {
          // Actualizar proveedor existente
          updateStmt.run(
            row.razon_social,
            row.nombre_fantasia || null,
            row.direccion || null,
            row.ciudad || null,
            row.telefono || null,
            row.email || null,
            row.contacto || null,
            row.rubro || null,
            row.activo !== undefined ? row.activo : 1,
            row.rut
          );
          results.success++;
        } else {
          // Insertar nuevo proveedor
          insertStmt.run(
            row.rut,
            row.razon_social,
            row.nombre_fantasia || null,
            row.direccion || null,
            row.ciudad || null,
            row.telefono || null,
            row.email || null,
            row.contacto || null,
            row.rubro || null,
            row.activo !== undefined ? row.activo : 1
          );
          results.success++;
        }
      } catch (error) {
        results.errors.push({
          row: row,
          error: error.message
        });
      }
    }

    db.close();
    return results;
  } catch (error) {
    db.close();
    throw error;
  }
}

// Obtener plantilla de Excel para usuarios
export async function getUserTemplate() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Usuarios');

  worksheet.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'Nombre', key: 'nombre', width: 30 },
    { header: 'Código', key: 'codigo', width: 15 },
    { header: 'Password', key: 'password', width: 15 },
    { header: 'Rol', key: 'rol', width: 20 },
    { header: 'Dependencia', key: 'dependencia', width: 30 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Puede Crear Plantillas', key: 'puede_crear_plantillas', width: 10 },
    { header: 'Super Admin', key: 'is_super_admin', width: 10 }
  ];

  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFDC143C' }
  };

  // Agregar fila de ejemplo
  worksheet.addRow({
    id: '',
    nombre: 'JUAN PÉREZ',
    codigo: 'jperez',
    password: 'opcional',
    rol: 'usuario',
    dependencia: 'TI',
    email: 'jperez@empresa.cl',
    puede_crear_plantillas: 0,
    is_super_admin: 0
  });

  return await workbook.xlsx.writeBuffer();
}

// Obtener plantilla de Excel para proveedores
export async function getProviderTemplate() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Proveedores');

  worksheet.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'RUT', key: 'rut', width: 15 },
    { header: 'Razón Social', key: 'razon_social', width: 35 },
    { header: 'Nombre Fantasía', key: 'nombre_fantasia', width: 30 },
    { header: 'Dirección', key: 'direccion', width: 40 },
    { header: 'Ciudad', key: 'ciudad', width: 20 },
    { header: 'Teléfono', key: 'telefono', width: 15 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Contacto', key: 'contacto', width: 25 },
    { header: 'Rubro', key: 'rubro', width: 20 },
    { header: 'Activo', key: 'activo', width: 10 }
  ];

  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFDC143C' }
  };

  // Agregar fila de ejemplo
  worksheet.addRow({
    id: '',
    rut: '12345678-9',
    razon_social: 'EMPRESA EJEMPLO S.A.',
    nombre_fantasia: 'Empresa Ejemplo',
    direccion: 'Calle Falsa 123',
    ciudad: 'Santiago',
    telefono: '+56912345678',
    email: 'contacto@ejemplo.cl',
    contacto: 'Juan Pérez',
    rubro: 'Tecnología',
    activo: 1
  });

  return await workbook.xlsx.writeBuffer();
}
