const fs = require('fs');
const path = require('path');

// Lista de archivos a corregir con sus rutas completas
const filesToFix = [
  'app/(main)/admin/solicitudes/page.js',
  'app/(main)/solicitudes/page.js',
  'app/(main)/plantillas/page.js',
  'app/(main)/solicitudes/[id]/page.js',
  'app/(main)/solicitud/[id]/page.js',
  'app/(main)/reports/facturas/page.js',
  'app/(main)/mis-solicitudes/page.js',
  'app/(main)/admin/ai-insights/page.js',
  'app/(main)/admin/usuarios/page.js',
  'app/(main)/admin/settings/Sidebar.js',
  'app/(auth)/login/page.js',
  'app/api/plantillas/route.js',
  'app/api/mis-solicitudes/route.js',
  'app/api/solicitudes/route.js',
  'app/api/solicitudes/[id]/route.js',
  'app/api/solicitudes/items/[id]/route.js',
  'app/api/solicitudes/[id]/set-pendiente/route.js',
  'app/api/solicitudes/[id]/set-en-proceso/route.js',
  'app/api/solicitudes/[id]/rechazar/route.js',
  'app/api/solicitudes/[id]/aprobar/route.js',
  'app/api/solicitudes/items/delete-image/route.js',
  'app/api/solicitudes/download-excel/route.js',
  'app/api/reports/facturas/route.js',
  'app/api/reports/generate-monthly-report-pdf/route.js',
  'app/api/dashboard-aprobador/route.js',
  'app/api/debug-approvals/route.js',
  'app/api/dashboard-summary/route.js',
  'app/api/dashboard/approved-summary/route.js',
  'app/api/comparador-precios/route.js',
  'app/api/ai-insights/route.js',
  'app/api/admin/users/route.js',
  'app/api/admin/reportes/route.js',
  'app/api/admin/solicitudes/route.js',
  'app/api/admin/usuarios/[id]/route.js',
  'app/api/admin/proveedores/route.js',
  'app/api/admin/ai-insights/route.js',
  'app/api/admin/dependencies/route.js',
  'app/api/admin/dependencies/[id]/route.js'
];

const replacements = [
  // Cambios para hacer case-insensitive las comparaciones de roles
  { from: /\.rol === 'administrador'/g, to: ".rol?.toLowerCase() === 'administrador'" },
  { from: /\.rol === 'aprobador'/g, to: ".rol?.toLowerCase() === 'aprobador'" },
  { from: /\.rol === 'coordinador'/g, to: ".rol?.toLowerCase() === 'coordinador'" },
  { from: /\.rol === 'solicitante'/g, to: ".rol?.toLowerCase() === 'solicitante'" },
  { from: /\.rol === 'bodega'/g, to: ".rol?.toLowerCase() === 'bodega'" },
  { from: /\.rol === 'creator'/g, to: ".rol?.toLowerCase() === 'creator'" },
  
  { from: /\.rol !== 'administrador'/g, to: ".rol?.toLowerCase() !== 'administrador'" },
  { from: /\.rol !== 'aprobador'/g, to: ".rol?.toLowerCase() !== 'aprobador'" },
  { from: /\.rol !== 'coordinador'/g, to: ".rol?.toLowerCase() !== 'coordinador'" },
  { from: /\.rol !== 'solicitante'/g, to: ".rol?.toLowerCase() !== 'solicitante'" },
  { from: /\.rol !== 'bodega'/g, to: ".rol?.toLowerCase() !== 'bodega'" },
  { from: /\.rol !== 'creator'/g, to: ".rol?.toLowerCase() !== 'creator'" },
  
  // Casos especiales de aprobador_rol
  { from: /aprobador_rol === 'aprobador'/g, to: "aprobador_rol?.toLowerCase() === 'aprobador'" },
  { from: /aprobador_rol === 'administrador'/g, to: "aprobador_rol?.toLowerCase() === 'administrador'" },
  { from: /aprobador_rol === 'APROBADOR'/g, to: "aprobador_rol?.toLowerCase() === 'aprobador'" },
  { from: /aprobador_rol === 'ADMINISTRADOR'/g, to: "aprobador_rol?.toLowerCase() === 'administrador'" },
];

let filesFixed = 0;
let totalReplacements = 0;

filesToFix.forEach(file => {
  const filePath = path.join(__dirname, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Archivo no encontrado: ${file}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  let fileReplacements = 0;
  
  replacements.forEach(({ from, to }) => {
    const matches = content.match(from);
    if (matches) {
      content = content.replace(from, to);
      fileReplacements += matches.length;
    }
  });
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    filesFixed++;
    totalReplacements += fileReplacements;
    console.log(`✅ Corregido: ${file} (${fileReplacements} reemplazos)`);
  }
});

console.log(`\n🎉 Proceso completado:`);
console.log(`   - Archivos corregidos: ${filesFixed}`);
console.log(`   - Total de reemplazos: ${totalReplacements}`);
